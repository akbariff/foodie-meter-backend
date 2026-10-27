jest.mock('../src/config/mailer', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');
const mailer = require('../src/config/mailer');

const runId = Date.now();

const user = {
  name: 'Subscription Tester',
  email: `subscription-tester-${runId}@example.com`,
  password: 'password123',
};

const expiryUser = {
  name: 'Expiry Tester',
  email: `subscription-expiry-${runId}@example.com`,
  password: 'password123',
};

let token;
let expiryToken;
let expiryUserId;

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
  const main = await signupAndVerify(user);
  token = main.token;

  const expiry = await signupAndVerify(expiryUser);
  expiryToken = expiry.token;
  expiryUserId = expiry.userId;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [user.email, expiryUser.email] } } });
  await prisma.$disconnect();
});

describe('Subscription API', () => {
  test('GET /api/subscription returns 404 before subscribing', async () => {
    const res = await request(app)
      .get('/api/subscription')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NO_SUBSCRIPTION');
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/subscription');
    expect(res.status).toBe(401);
  });

  test('POST /api/subscription/subscribe activates Premium', async () => {
    const res = await request(app)
      .post('/api/subscription/subscribe')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.cancelScheduled).toBe(false);
    expect(res.body.data.price).toBeCloseTo(9.99);
    expect(res.body.data.nextBillingDate).toBeDefined();

    const profile = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(profile.body.data.subscriptionTier).toBe('PREMIUM');
  });

  test('subscribing again while already active is rejected', async () => {
    const res = await request(app)
      .post('/api/subscription/subscribe')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_SUBSCRIBED');
  });

  test('POST /api/subscription/renew with nothing scheduled is rejected', async () => {
    const res = await request(app)
      .post('/api/subscription/renew')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NO_SCHEDULED_CANCELLATION');
  });

  test('POST /api/subscription/cancel schedules cancellation but keeps Premium access', async () => {
    const res = await request(app)
      .post('/api/subscription/cancel')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.cancelScheduled).toBe(true);

    const profile = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(profile.body.data.subscriptionTier).toBe('PREMIUM');
  });

  test('cancelling again while already scheduled is rejected', async () => {
    const res = await request(app)
      .post('/api/subscription/cancel')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_CANCELLED');
  });

  test('POST /api/subscription/renew undoes the scheduled cancellation', async () => {
    const res = await request(app)
      .post('/api/subscription/renew')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.cancelScheduled).toBe(false);
  });

  test('GET /api/subscription/history lists the subscription', async () => {
    const res = await request(app)
      .get('/api/subscription/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].status).toBe('ACTIVE');
  });

  test('a subscription past its expiry with no auto-renew lazily expires and downgrades the tier', async () => {
    const subscribeRes = await request(app)
      .post('/api/subscription/subscribe')
      .set('Authorization', `Bearer ${expiryToken}`);
    expect(subscribeRes.status).toBe(201);

    await request(app)
      .post('/api/subscription/cancel')
      .set('Authorization', `Bearer ${expiryToken}`);

    // Simulate time passing: back-date expiresAt on the row directly, since this
    // project has no background job runner to wait on (see subscription.service.js).
    await prisma.subscription.updateMany({
      where: { userId: expiryUserId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app)
      .get('/api/subscription')
      .set('Authorization', `Bearer ${expiryToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('EXPIRED');

    const profile = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${expiryToken}`);
    expect(profile.body.data.subscriptionTier).toBe('FREE');
  });
});
