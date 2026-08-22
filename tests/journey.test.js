jest.mock('../src/config/mailer', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');
const mailer = require('../src/config/mailer');

const runId = Date.now();
const userA = { name: 'Journey User A', email: `journey-a-${runId}@example.com`, password: 'password123' };
const userB = { name: 'Journey User B', email: `journey-b-${runId}@example.com`, password: 'password123' };

let tokenA;
let tokenB;
let diaryEntryId;
let recipeId;
let nutritionistRecipeId;

function lastCodeSentTo(mockFn, email) {
  const call = mockFn.mock.calls.filter(([to]) => to === email).pop();
  return call ? call[1] : null;
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [userA.email, userB.email] } } });
  await prisma.$disconnect();
});

describe('Full user journey', () => {
  test('signup sends a verification email', async () => {
    const res = await request(app).post('/api/auth/signup').send(userA);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(mailer.sendVerificationEmail).toHaveBeenCalledWith(userA.email, expect.any(String));
  });

  test('verify-email rejects a wrong code', async () => {
    const res = await request(app).post('/api/auth/verify-email').send({ email: userA.email, code: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('verify-email succeeds with the emailed code and returns a token', async () => {
    const code = lastCodeSentTo(mailer.sendVerificationEmail, userA.email);
    const res = await request(app).post('/api/auth/verify-email').send({ email: userA.email, code });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    tokenA = res.body.data.token;
  });

  test('login works after verification', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: userA.email, password: userA.password });
    expect(res.status).toBe(200);
    tokenA = res.body.data.token;
  });

  test('GET /api/users/me returns role/tier/status defaults', async () => {
    const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ role: 'USER', subscriptionTier: 'FREE', status: 'ACTIVE' });
  });

  test('PUT /api/users/me updates the name', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
  });

  test('GET /api/calorie-goal 404s when unset', async () => {
    const res = await request(app).get('/api/calorie-goal').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });

  test('PUT /api/calorie-goal creates a goal', async () => {
    const res = await request(app)
      .put('/api/calorie-goal')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ targetCalories: 2000 });
    expect(res.status).toBe(200);
    expect(res.body.data.targetCalories).toBe(2000);
  });

  test('POST /api/calorie-intake creates a diary entry', async () => {
    const res = await request(app)
      .post('/api/calorie-intake')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ consumedAt: '2026-08-01T08:00:00Z', mealType: 'BREAKFAST', foodName: 'Oatmeal', calories: 300 });
    expect(res.status).toBe(201);
    diaryEntryId = res.body.data.id;
  });

  test('GET /api/calorie-intake/summary reflects the goal and entries', async () => {
    const res = await request(app)
      .get('/api/calorie-intake/summary?date=2026-08-01')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ targetCalories: 2000, consumedCalories: 300, remainingCalories: 1700 });
  });

  test('PUT /api/calorie-intake/:id updates the entry', async () => {
    const res = await request(app)
      .put(`/api/calorie-intake/${diaryEntryId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ calories: 350 });
    expect(res.status).toBe(200);
    expect(res.body.data.calories).toBe(350);
  });

  test('DELETE /api/calorie-intake/:id removes the entry', async () => {
    const res = await request(app).delete(`/api/calorie-intake/${diaryEntryId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(204);
  });

  test('POST /api/recipes creates a recipe', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Test Recipe', ingredients: 'a, b', instructions: 'mix' });
    expect(res.status).toBe(201);
    recipeId = res.body.data.id;
  });

  test('PUT /api/recipes/:id updates the recipe', async () => {
    const res = await request(app)
      .put(`/api/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Updated Recipe' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Recipe');
  });

  test('GET /api/nutritionist-recipes lists curated recipes', async () => {
    const res = await request(app).get('/api/nutritionist-recipes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      nutritionistRecipeId = res.body.data[0].id;
    }
  });

  test('POST /api/recipes/from-nutritionist/:id copies a curated recipe', async () => {
    if (!nutritionistRecipeId) return;
    const res = await request(app)
      .post(`/api/recipes/from-nutritionist/${nutritionistRecipeId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(201);
    expect(res.body.data.sourceNutritionistRecipeId).toBe(nutritionistRecipeId);
  });

  test('DELETE /api/recipes/:id removes the recipe', async () => {
    const res = await request(app).delete(`/api/recipes/${recipeId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(204);
  });

  test('change-password requires the correct current password', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ currentPassword: 'wrong-password', newPassword: 'newpassword456' });
    expect(res.status).toBe(401);
  });

  test('change-password succeeds and old password stops working', async () => {
    const changeRes = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ currentPassword: userA.password, newPassword: 'newpassword456' });
    expect(changeRes.status).toBe(200);

    const oldLogin = await request(app).post('/api/auth/login').send({ email: userA.email, password: userA.password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: userA.email, password: 'newpassword456' });
    expect(newLogin.status).toBe(200);
  });

  test('forgot-password responds identically for existing and non-existing emails', async () => {
    const existing = await request(app).post('/api/auth/forgot-password').send({ email: userA.email });
    const missing = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
    expect(existing.status).toBe(200);
    expect(missing.status).toBe(200);
    expect(existing.body.message).toBe(missing.body.message);
    expect(mailer.sendPasswordResetEmail).toHaveBeenCalledWith(userA.email, expect.any(String));
  });

  test('reset-password rejects a wrong code then succeeds with the right one', async () => {
    const wrong = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: userA.email, code: '000000', newPassword: 'resetpass789' });
    expect(wrong.status).toBe(400);

    const code = lastCodeSentTo(mailer.sendPasswordResetEmail, userA.email);
    const right = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: userA.email, code, newPassword: 'resetpass789' });
    expect(right.status).toBe(200);

    const login = await request(app).post('/api/auth/login').send({ email: userA.email, password: 'resetpass789' });
    expect(login.status).toBe(200);
  });
});

describe('Authorization failures', () => {
  test('protected routes reject missing/invalid tokens', async () => {
    const noToken = await request(app).get('/api/recipes');
    expect(noToken.status).toBe(401);

    const badToken = await request(app).get('/api/recipes').set('Authorization', 'Bearer not-a-real-token');
    expect(badToken.status).toBe(401);
  });

  test('a user cannot access another user\'s resources', async () => {
    await request(app).post('/api/auth/signup').send(userB);
    const codeB = lastCodeSentTo(mailer.sendVerificationEmail, userB.email);
    const verifyB = await request(app).post('/api/auth/verify-email').send({ email: userB.email, code: codeB });
    tokenB = verifyB.body.data.token;

    const createRes = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Owned by A', ingredients: 'x', instructions: 'y' });
    const ownedByA = createRes.body.data.id;

    const res = await request(app).get(`/api/recipes/${ownedByA}`).set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });
});
