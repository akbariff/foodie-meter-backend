jest.mock('../src/config/mailer', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');
const mailer = require('../src/config/mailer');

const runId = Date.now();

const nutritionist = {
  name: 'Curating Nutritionist',
  email: `curate-nutritionist-${runId}@example.com`,
  password: 'password123',
};

const member = {
  name: 'Curated Recipe Reader',
  email: `curate-member-${runId}@example.com`,
  password: 'password123',
};

let nutritionistToken;
let memberToken;
let recipeId;

async function signupAndVerify(account) {
  const signup = await request(app).post('/api/auth/signup').send(account);
  expect(signup.status).toBe(201);
  const code = mailer.sendVerificationEmail.mock.calls.filter(([to]) => to === account.email).pop()[1];
  const verify = await request(app).post('/api/auth/verify-email').send({ email: account.email, code });
  expect(verify.status).toBe(200);
  return { token: verify.body.data.token, userId: verify.body.data.user.id };
}

beforeAll(async () => {
  const n = await signupAndVerify(nutritionist);
  nutritionistToken = n.token;
  await prisma.user.update({ where: { id: n.userId }, data: { role: 'NUTRITIONIST' } });
  memberToken = (await signupAndVerify(member)).token;
});

afterAll(async () => {
  if (recipeId) await prisma.nutritionistRecipe.deleteMany({ where: { id: recipeId } });
  await prisma.user.deleteMany({ where: { email: { in: [nutritionist.email, member.email] } } });
  await prisma.$disconnect();
});

describe('Curated nutritionist recipes', () => {
  const recipe = {
    title: `Curated Lentil Soup ${runId}`,
    ingredients: '1 cup red lentils\n1 onion\n2 cups vegetable stock',
    instructions: '1. Soften the onion.\n2. Add lentils and stock.\n3. Simmer for 20 minutes.',
  };

  test('creating requires login', async () => {
    const res = await request(app).post('/api/nutritionist-recipes').send(recipe);
    expect(res.status).toBe(401);
  });

  test('a regular user cannot create a curated recipe', async () => {
    const res = await request(app)
      .post('/api/nutritionist-recipes')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(recipe);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  test('missing fields are rejected', async () => {
    const res = await request(app)
      .post('/api/nutritionist-recipes')
      .set('Authorization', `Bearer ${nutritionistToken}`)
      .send({ title: 'No steps' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.ingredients).toBeDefined();
    expect(res.body.error.fields.instructions).toBeDefined();
  });

  test('a nutritionist can create a curated recipe, and it is public', async () => {
    const res = await request(app)
      .post('/api/nutritionist-recipes')
      .set('Authorization', `Bearer ${nutritionistToken}`)
      .send(recipe);
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe(recipe.title);
    recipeId = res.body.data.id;

    const list = await request(app).get('/api/nutritionist-recipes');
    expect(list.body.data.some(r => r.id === recipeId)).toBe(true);
  });

  test('a nutritionist can update it, and a regular user cannot', async () => {
    const denied = await request(app)
      .put(`/api/nutritionist-recipes/${recipeId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Hijacked' });
    expect(denied.status).toBe(403);

    const res = await request(app)
      .put(`/api/nutritionist-recipes/${recipeId}`)
      .set('Authorization', `Bearer ${nutritionistToken}`)
      .send({ title: `${recipe.title} v2` });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe(`${recipe.title} v2`);
    expect(res.body.data.ingredients).toBe(recipe.ingredients);
  });

  test('deleting keeps users\' copies but removes the curated recipe', async () => {
    const copy = await request(app)
      .post(`/api/recipes/from-nutritionist/${recipeId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(copy.status).toBe(201);

    const del = await request(app)
      .delete(`/api/nutritionist-recipes/${recipeId}`)
      .set('Authorization', `Bearer ${nutritionistToken}`);
    expect(del.status).toBe(204);

    const gone = await request(app).get(`/api/nutritionist-recipes/${recipeId}`);
    expect(gone.status).toBe(404);

    const mine = await request(app)
      .get(`/api/recipes/${copy.body.data.id}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data.sourceNutritionistRecipeId).toBeNull();
    recipeId = null;
  });

  test('updating or deleting an unknown recipe returns 404', async () => {
    const id = '00000000-0000-4000-8000-000000000000';
    const put = await request(app)
      .put(`/api/nutritionist-recipes/${id}`)
      .set('Authorization', `Bearer ${nutritionistToken}`)
      .send({ title: 'x' });
    expect(put.status).toBe(404);
    const del = await request(app)
      .delete(`/api/nutritionist-recipes/${id}`)
      .set('Authorization', `Bearer ${nutritionistToken}`);
    expect(del.status).toBe(404);
  });
});
