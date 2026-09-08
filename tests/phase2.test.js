jest.mock('../src/config/mailer', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');
const env = require('../src/config/env');
const mailer = require('../src/config/mailer');

const runId = Date.now();
const userA = { name: 'Phase2 User A', email: `phase2-a-${runId}@example.com`, password: 'password123' };
const userB = { name: 'Phase2 User B', email: `phase2-b-${runId}@example.com`, password: 'password123' };

const seededUserIds = [];
let tokenA;
let tokenB;
let adminToken;
let otherNutritionistToken;
let otherNutritionistId;

function signToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

async function createFixtureUser({ role, assignedCategory, status = 'ACTIVE' }) {
  const email = `phase2-fixture-${role.toLowerCase()}-${Math.random().toString(36).slice(2)}-${runId}@example.com`;
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: { name: `Fixture ${role}`, email, passwordHash, isVerified: true, role, assignedCategory, status },
  });
  seededUserIds.push(user.id);
  return user;
}

function lastCodeSentTo(mockFn, email) {
  const call = mockFn.mock.calls.filter(([to]) => to === email).pop();
  return call ? call[1] : null;
}

beforeAll(async () => {
  const admin = await createFixtureUser({ role: 'ADMIN' });
  adminToken = signToken(admin.id);

  const otherNutritionist = await createFixtureUser({ role: 'NUTRITIONIST', assignedCategory: 'Sports Nutrition' });
  otherNutritionistId = otherNutritionist.id;
  otherNutritionistToken = signToken(otherNutritionist.id);

  await request(app).post('/api/auth/signup').send(userA);
  const codeA = lastCodeSentTo(mailer.sendVerificationEmail, userA.email);
  const verifyA = await request(app).post('/api/auth/verify-email').send({ email: userA.email, code: codeA });
  tokenA = verifyA.body.data.token;

  await request(app).post('/api/auth/signup').send(userB);
  const codeB = lastCodeSentTo(mailer.sendVerificationEmail, userB.email);
  const verifyB = await request(app).post('/api/auth/verify-email').send({ email: userB.email, code: codeB });
  tokenB = verifyB.body.data.token;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [userA.email, userB.email] } } });
  await prisma.user.deleteMany({ where: { id: { in: seededUserIds } } });
  await prisma.$disconnect();
});

describe('Reviews', () => {
  let reviewId;

  test('any authenticated user can create a review, published immediately', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ rating: 5, comment: 'Great app for tracking meals' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PUBLISHED');
    reviewId = res.body.data.id;
  });

  test('public listing shows published reviews without auth', async () => {
    const res = await request(app).get('/api/reviews');
    expect(res.status).toBe(200);
    expect(res.body.data.reviews.some((r) => r.id === reviewId)).toBe(true);
  });

  test('owner can update their own review; another user gets 404', async () => {
    const ownUpdate = await request(app)
      .put(`/api/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ comment: 'Updated comment' });
    expect(ownUpdate.status).toBe(200);
    expect(ownUpdate.body.data.comment).toBe('Updated comment');

    const otherUpdate = await request(app)
      .put(`/api/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ comment: 'Hijacked' });
    expect(otherUpdate.status).toBe(404);
  });

  test('admin can moderate (reject) any review, which then disappears from public listing', async () => {
    const modRes = await request(app)
      .patch(`/api/admin/reviews/${reviewId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED' });
    expect(modRes.status).toBe(200);
    expect(modRes.body.data.status).toBe('REJECTED');

    const publicList = await request(app).get('/api/reviews');
    expect(publicList.body.data.reviews.some((r) => r.id === reviewId)).toBe(false);
  });

  test('non-owner non-admin cannot delete; owner can', async () => {
    const forbidden = await request(app).delete(`/api/reviews/${reviewId}`).set('Authorization', `Bearer ${tokenB}`);
    expect(forbidden.status).toBe(404);

    const ok = await request(app).delete(`/api/reviews/${reviewId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(ok.status).toBe(204);
  });

  test('non-admin is forbidden from the admin review-moderation endpoint', async () => {
    const res = await request(app)
      .get('/api/admin/reviews')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(403);
  });
});

describe('Nutritionist application -> approval pipeline', () => {
  let applicationId;

  test('a USER can apply; a duplicate pending application is rejected', async () => {
    const res = await request(app)
      .post('/api/nutritionist-applications')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ category: 'Weight Management', message: 'I am a certified dietitian' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    applicationId = res.body.data.id;

    const dup = await request(app)
      .post('/api/nutritionist-applications')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ category: 'Weight Management' });
    expect(dup.status).toBe(409);
  });

  test('an existing Nutritionist cannot apply again', async () => {
    const res = await request(app)
      .post('/api/nutritionist-applications')
      .set('Authorization', `Bearer ${otherNutritionistToken}`)
      .send({ category: 'Sports Nutrition' });
    expect(res.status).toBe(409);
  });

  test('non-admin cannot list or decide applications', async () => {
    const list = await request(app)
      .get('/api/admin/nutritionist-applications')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(list.status).toBe(403);
  });

  test('admin approves the application; the applicant is promoted with the assigned category', async () => {
    const decide = await request(app)
      .patch(`/api/admin/nutritionist-applications/${applicationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });
    expect(decide.status).toBe(200);

    // tokenA was minted before the promotion — requireAuth re-checks the DB live on every
    // request, so the SAME token should now reflect the new role without re-logging in.
    const me = await request(app).get('/api/users/me').set('Authorization', `Bearer ${tokenA}`);
    expect(me.body.data.role).toBe('NUTRITIONIST');

    const redecide = await request(app)
      .patch(`/api/admin/nutritionist-applications/${applicationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED' });
    expect(redecide.status).toBe(409);
  });
});

describe('Nutritionist-authored curated recipes', () => {
  let ownRecipeId;

  test('a fresh Nutritionist (userA, category Weight Management) can publish within their category', async () => {
    const res = await request(app)
      .post('/api/nutritionist-recipes')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Low-cal soup', ingredients: 'veg, broth', instructions: 'simmer', category: 'Weight Management' });
    expect(res.status).toBe(201);
    ownRecipeId = res.body.data.id;
  });

  test('publishing outside the assigned category is rejected', async () => {
    const res = await request(app)
      .post('/api/nutritionist-recipes')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Protein shake', ingredients: 'whey', instructions: 'blend', category: 'Sports Nutrition' });
    expect(res.status).toBe(403);
  });

  test('a different Nutritionist cannot edit or delete someone else\'s curated recipe', async () => {
    const editAttempt = await request(app)
      .put(`/api/nutritionist-recipes/${ownRecipeId}`)
      .set('Authorization', `Bearer ${otherNutritionistToken}`)
      .send({ title: 'Hijacked title' });
    expect(editAttempt.status).toBe(403);

    const deleteAttempt = await request(app)
      .delete(`/api/nutritionist-recipes/${ownRecipeId}`)
      .set('Authorization', `Bearer ${otherNutritionistToken}`);
    expect(deleteAttempt.status).toBe(403);
  });

  test('a plain USER (userB) cannot publish curated recipes', async () => {
    const res = await request(app)
      .post('/api/nutritionist-recipes')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ title: 'Should fail', ingredients: 'x', instructions: 'y' });
    expect(res.status).toBe(403);
  });

  test('category filter on the public listing works', async () => {
    const res = await request(app).get('/api/nutritionist-recipes?category=Weight%20Management');
    expect(res.status).toBe(200);
    expect(res.body.data.every((r) => r.category === 'Weight Management')).toBe(true);
    expect(res.body.data.some((r) => r.id === ownRecipeId)).toBe(true);
  });

  test('admin can edit and delete any curated recipe regardless of author', async () => {
    const editRes = await request(app)
      .put(`/api/nutritionist-recipes/${ownRecipeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Admin-edited title' });
    expect(editRes.status).toBe(200);

    const deleteRes = await request(app)
      .delete(`/api/nutritionist-recipes/${ownRecipeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(204);
  });
});

describe('Recipe moderation (flagging)', () => {
  let userBRecipeId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ title: 'Suspicious recipe', ingredients: 'a', instructions: 'b' });
    userBRecipeId = res.body.data.id;
  });

  test('a plain USER cannot flag recipes or view the moderation queue', async () => {
    const flagAttempt = await request(app)
      .patch(`/api/recipes/${userBRecipeId}/flag`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ flagReason: 'self-flagging attempt' });
    expect(flagAttempt.status).toBe(403);

    const queueAttempt = await request(app).get('/api/recipes/flagged').set('Authorization', `Bearer ${tokenB}`);
    expect(queueAttempt.status).toBe(403);
  });

  test('a Nutritionist can flag another user\'s recipe (cross-user moderation) and it appears in the queue', async () => {
    const flagRes = await request(app)
      .patch(`/api/recipes/${userBRecipeId}/flag`)
      .set('Authorization', `Bearer ${otherNutritionistToken}`)
      .send({ flagReason: 'Unverified nutrition claim' });
    expect(flagRes.status).toBe(200);
    expect(flagRes.body.data.flagged).toBe(true);

    const queue = await request(app).get('/api/recipes/flagged').set('Authorization', `Bearer ${adminToken}`);
    expect(queue.status).toBe(200);
    expect(queue.body.data.some((r) => r.id === userBRecipeId)).toBe(true);
  });

  test('unflagging clears the flag', async () => {
    const res = await request(app)
      .patch(`/api/recipes/${userBRecipeId}/unflag`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.flagged).toBe(false);
  });
});

describe('Admin user management', () => {
  test('non-admin is forbidden from all /api/admin/users routes', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  test('admin can list and filter users', async () => {
    const res = await request(app)
      .get('/api/admin/users?role=USER')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.users.every((u) => u.role === 'USER')).toBe(true);
  });

  test('admin cannot suspend their own account', async () => {
    const meRes = await request(app).get('/api/users/me').set('Authorization', `Bearer ${adminToken}`);
    const res = await request(app)
      .patch(`/api/admin/users/${meRes.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' });
    expect(res.status).toBe(400);
  });

  test('admin cannot change their own role', async () => {
    const meRes = await request(app).get('/api/users/me').set('Authorization', `Bearer ${adminToken}`);
    const res = await request(app)
      .patch(`/api/admin/users/${meRes.body.data.id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'USER' });
    expect(res.status).toBe(400);
  });

  test('suspending another account blocks that account immediately (live status check), then reinstating restores it', async () => {
    const suspend = await request(app)
      .patch(`/api/admin/users/${otherNutritionistId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' });
    expect(suspend.status).toBe(200);

    const blocked = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${otherNutritionistToken}`);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('ACCOUNT_SUSPENDED');

    const reinstate = await request(app)
      .patch(`/api/admin/users/${otherNutritionistId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });
    expect(reinstate.status).toBe(200);

    const restored = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${otherNutritionistToken}`);
    expect(restored.status).toBe(200);
  });
});

describe('Site content', () => {
  test('non-admin cannot set site content; admin can, and it is then public', async () => {
    const forbidden = await request(app)
      .put('/api/site-content/hero_heading')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ value: 'Hacked heading' });
    expect(forbidden.status).toBe(403);

    const setRes = await request(app)
      .put('/api/site-content/hero_heading')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: 'Eat well. Live well.' });
    expect(setRes.status).toBe(200);

    const publicRes = await request(app).get('/api/site-content');
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.data.hero_heading).toBe('Eat well. Live well.');
  });
});

describe('Admin analytics', () => {
  test('non-admin is forbidden; admin gets an aggregate summary', async () => {
    const forbidden = await request(app).get('/api/admin/analytics/summary').set('Authorization', `Bearer ${tokenB}`);
    expect(forbidden.status).toBe(403);

    const res = await request(app).get('/api/admin/analytics/summary').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('usersByRole');
    expect(res.body.data).toHaveProperty('usersByTier');
    expect(res.body.data).toHaveProperty('signupsLast30Days');
  });
});
