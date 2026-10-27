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
  email: `review-owner-${runId}@example.com`,
  password: 'password123',
};

const reviewerA = {
  name: 'Reviewer A',
  email: `review-a-${runId}@example.com`,
  password: 'password123',
};

const reviewerB = {
  name: 'Reviewer B',
  email: `review-b-${runId}@example.com`,
  password: 'password123',
};

let ownerToken;
let reviewerAToken;
let reviewerBToken;
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

  return verify.body.data.token;
}

beforeAll(async () => {
  ownerToken = await signupAndVerify(owner);
  reviewerAToken = await signupAndVerify(reviewerA);
  reviewerBToken = await signupAndVerify(reviewerB);

  const createRecipe = await request(app)
    .post('/api/recipes')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      title: `Review Test Recipe ${runId}`,
      ingredients: 'Oats, milk, honey',
      instructions: 'Combine and refrigerate overnight.',
    });

  expect(createRecipe.status).toBe(201);
  recipeId = createRecipe.body.data.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [owner.email, reviewerA.email, reviewerB.email] } },
  });
  await prisma.$disconnect();
});

describe('RecipeReview API', () => {
  test('GET /api/recipe-reviews/:recipeId returns 404 for an unknown recipe', async () => {
    const res = await request(app)
      .get('/api/recipe-reviews/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${reviewerAToken}`);

    expect(res.status).toBe(404);
  });

  test('GET /api/recipe-reviews/:recipeId starts empty with a null average', async () => {
    const res = await request(app)
      .get(`/api/recipe-reviews/${recipeId}`)
      .set('Authorization', `Bearer ${reviewerAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.reviews).toEqual([]);
    expect(res.body.data.averageRating).toBeNull();
  });

  test('PUT /api/recipe-reviews/:recipeId/me rejects an out-of-range rating', async () => {
    const res = await request(app)
      .put(`/api/recipe-reviews/${recipeId}/me`)
      .set('Authorization', `Bearer ${reviewerAToken}`)
      .send({ rating: 6, comment: 'Too high' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.rating).toBeDefined();
  });

  test('a user can review a recipe they do not own', async () => {
    const res = await request(app)
      .put(`/api/recipe-reviews/${recipeId}/me`)
      .set('Authorization', `Bearer ${reviewerAToken}`)
      .send({ rating: 5, comment: 'Delicious and easy.' });

    expect(res.status).toBe(200);
    expect(res.body.data.rating).toBe(5);
    expect(res.body.data.comment).toBe('Delicious and easy.');
  });

  test('a second reviewer can leave their own, independent review', async () => {
    const res = await request(app)
      .put(`/api/recipe-reviews/${recipeId}/me`)
      .set('Authorization', `Bearer ${reviewerBToken}`)
      .send({ rating: 3, comment: 'It was okay.' });

    expect(res.status).toBe(200);
    expect(res.body.data.rating).toBe(3);

    const list = await request(app)
      .get(`/api/recipe-reviews/${recipeId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(list.status).toBe(200);
    expect(list.body.data.count).toBe(2);
    expect(list.body.data.averageRating).toBe(4);
  });

  test('re-reviewing updates rather than duplicates the first reviewer\'s review', async () => {
    const res = await request(app)
      .put(`/api/recipe-reviews/${recipeId}/me`)
      .set('Authorization', `Bearer ${reviewerAToken}`)
      .send({ rating: 4, comment: 'Updated my mind slightly.' });

    expect(res.status).toBe(200);

    const list = await request(app)
      .get(`/api/recipe-reviews/${recipeId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(list.body.data.count).toBe(2);
    expect(list.body.data.averageRating).toBe(3.5);
  });

  test('DELETE /api/recipe-reviews/:recipeId/me only removes the caller\'s own review', async () => {
    const del = await request(app)
      .delete(`/api/recipe-reviews/${recipeId}/me`)
      .set('Authorization', `Bearer ${reviewerAToken}`);

    expect(del.status).toBe(204);

    const list = await request(app)
      .get(`/api/recipe-reviews/${recipeId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(list.body.data.count).toBe(1);
    expect(list.body.data.reviews[0].rating).toBe(3);
  });

  test('deleting an already-removed review returns 404', async () => {
    const res = await request(app)
      .delete(`/api/recipe-reviews/${recipeId}/me`)
      .set('Authorization', `Bearer ${reviewerAToken}`);

    expect(res.status).toBe(404);
  });
});
