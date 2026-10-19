const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');

const runId = Date.now();
const email = `new-features-${runId}@example.com`;

let user;
let token;
let recipe;
let reviewId;

beforeAll(async () => {
  user = await prisma.user.create({
    data: {
      name: 'New Features User',
      email,
      passwordHash: 'test-hash',
      isVerified: true,
    },
  });

  token = jwt.sign(
    { sub: user.id },
    'test-secret',
    { expiresIn: '1h' }
  );

  recipe = await prisma.recipe.create({
    data: {
      userId: user.id,
      title: 'Reviewable Recipe',
      ingredients: 'ingredient A',
      instructions: 'mix',
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe('User profile', () => {
  test('PUT /api/users/me stores health-profile fields', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateOfBirth: '1999-05-20',
        heightCm: 175,
        weightKg: 70.5,
        activityLevel: 'MODERATE',
        weightGoal: 'MAINTAIN',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.profile).toMatchObject({
      heightCm: 175,
      weightKg: 70.5,
      activityLevel: 'MODERATE',
      weightGoal: 'MAINTAIN',
    });
  });

  test('GET /api/users/me returns the stored profile', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.profile).toMatchObject({
      activityLevel: 'MODERATE',
      weightGoal: 'MAINTAIN',
    });
  });
});

describe('Recipe reviews', () => {
  test('POST /api/recipes/:recipeId/reviews creates one review', async () => {
    const res = await request(app)
      .post(`/api/recipes/${recipe.id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5, comment: 'Great recipe' });

    expect(res.status).toBe(201);
    expect(res.body.data.rating).toBe(5);
    reviewId = res.body.data.id;
  });

  test('a user cannot create a second review for the same recipe', async () => {
    const res = await request(app)
      .post(`/api/recipes/${recipe.id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 4, comment: 'Second review' });

    expect(res.status).toBe(409);
  });

  test('PUT updates the review', async () => {
    const res = await request(app)
      .put(`/api/recipes/${recipe.id}/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 4, comment: 'Updated review' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      rating: 4,
      comment: 'Updated review',
    });
  });

  test('GET lists recipe reviews', async () => {
    const res = await request(app)
      .get(`/api/recipes/${recipe.id}/reviews`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('DELETE removes the review', async () => {
    const res = await request(app)
      .delete(`/api/recipes/${recipe.id}/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
  });
});

describe('Subscriptions', () => {
  test('POST /api/subscriptions/upgrade activates Premium', async () => {
    const res = await request(app)
      .post('/api/subscriptions/upgrade')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ACTIVE');

    const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
    expect(refreshed.subscriptionTier).toBe('PREMIUM');
  });

  test('GET /api/subscriptions/me returns Premium and latest subscription', async () => {
    const res = await request(app)
      .get('/api/subscriptions/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.subscriptionTier).toBe('PREMIUM');
    expect(res.body.data.subscription.status).toBe('ACTIVE');
  });

  test('POST /api/subscriptions/cancel returns user to Free', async () => {
    const res = await request(app)
      .post('/api/subscriptions/cancel')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');

    const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
    expect(refreshed.subscriptionTier).toBe('FREE');
  });

  test('POST /api/subscriptions/renew restores Premium', async () => {
    const res = await request(app)
      .post('/api/subscriptions/renew')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');

    const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
    expect(refreshed.subscriptionTier).toBe('PREMIUM');
  });
});
