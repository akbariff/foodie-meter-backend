jest.mock('../src/config/mailer', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');
const mailer = require('../src/config/mailer');

const runId = Date.now();

const owner = {
  name: 'Recipe Owner',
  email: `moderation-owner-${runId}@example.com`,
  password: 'password123',
};

const nutritionist = {
  name: 'Moderating Nutritionist',
  email: `moderation-nutritionist-${runId}@example.com`,
  password: 'password123',
};

let ownerToken;
let nutritionistToken;
let recipeId;

function lastCodeSentTo(email) {
  const call = mailer.sendVerificationEmail.mock.calls
    .filter(([to]) => to === email)
    .pop();

  return call ? call[1] : null;
}

async function signupAndVerify(account) {
  const signup = await request(app)
    .post('/api/auth/signup')
    .send(account);

  expect(signup.status).toBe(201);

  const code = lastCodeSentTo(account.email);

  const verify = await request(app)
    .post('/api/auth/verify-email')
    .send({
      email: account.email,
      code,
    });

  expect(verify.status).toBe(200);

  return { token: verify.body.data.token, userId: verify.body.data.user.id };
}

beforeAll(async () => {
  const ownerAccount = await signupAndVerify(owner);
  ownerToken = ownerAccount.token;

  const nutritionistAccount = await signupAndVerify(nutritionist);
  nutritionistToken = nutritionistAccount.token;
  await prisma.user.update({ where: { id: nutritionistAccount.userId }, data: { role: 'NUTRITIONIST' } });

  const createRecipe = await request(app)
    .post('/api/recipes')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      title: `Moderation Test Recipe ${runId}`,
      ingredients: 'Sugar, flour, butter',
      instructions: 'Mix and bake.',
    });
  expect(createRecipe.status).toBe(201);
  recipeId = createRecipe.body.data.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [owner.email, nutritionist.email] } } });
  await prisma.$disconnect();
});

describe('Recipe moderation', () => {
  test('a regular user (the recipe\'s owner) cannot access the moderation queue', async () => {
    const res = await request(app)
      .get('/api/recipe-moderation/queue')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(403);
  });

  test('a nutritionist can see another user\'s recipe in the moderation queue, even though they do not own it', async () => {
    const res = await request(app)
      .get('/api/recipe-moderation/queue')
      .set('Authorization', `Bearer ${nutritionistToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(r => r.id === recipeId)).toBe(true);
  });

  test('flagging without a reason is rejected', async () => {
    const res = await request(app)
      .post(`/api/recipe-moderation/${recipeId}`)
      .set('Authorization', `Bearer ${nutritionistToken}`)
      .send({ action: 'FLAGGED' });

    expect(res.status).toBe(400);
  });

  test('flagging with a reason updates the recipe\'s moderationStatus', async () => {
    const res = await request(app)
      .post(`/api/recipe-moderation/${recipeId}`)
      .set('Authorization', `Bearer ${nutritionistToken}`)
      .send({ action: 'FLAGGED', reason: 'Ingredient list looks copied from another source.' });

    expect(res.status).toBe(201);
    expect(res.body.data.action).toBe('FLAGGED');

    const queue = await request(app)
      .get('/api/recipe-moderation/queue')
      .query({ status: 'FLAGGED' })
      .set('Authorization', `Bearer ${nutritionistToken}`);
    expect(queue.body.data.some(r => r.id === recipeId)).toBe(true);
  });

  test('the moderation history records the flag', async () => {
    const res = await request(app)
      .get(`/api/recipe-moderation/${recipeId}/history`)
      .set('Authorization', `Bearer ${nutritionistToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].action).toBe('FLAGGED');
  });

  test('clearing the flag restores ACTIVE status without requiring a reason', async () => {
    const res = await request(app)
      .post(`/api/recipe-moderation/${recipeId}`)
      .set('Authorization', `Bearer ${nutritionistToken}`)
      .send({ action: 'CLEARED' });

    expect(res.status).toBe(201);

    const queue = await request(app)
      .get('/api/recipe-moderation/queue')
      .query({ status: 'ACTIVE' })
      .set('Authorization', `Bearer ${nutritionistToken}`);
    expect(queue.body.data.some(r => r.id === recipeId)).toBe(true);
  });

  test('404 for an unknown recipe', async () => {
    const res = await request(app)
      .post('/api/recipe-moderation/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${nutritionistToken}`)
      .send({ action: 'APPROVED' });

    expect(res.status).toBe(404);
  });
});
