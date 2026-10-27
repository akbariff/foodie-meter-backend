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
  name: 'Weight Log Tester',
  email: `weight-log-tester-${runId}@example.com`,
  password: 'password123',
};

let token;

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
  token = await signupAndVerify(user);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: user.email } });
  await prisma.$disconnect();
});

describe('Weight log API', () => {
  let entryId;

  test('requires authentication', async () => {
    const res = await request(app).get('/api/weight-log');
    expect(res.status).toBe(401);
  });

  test('rejects an out-of-range weight', async () => {
    const res = await request(app)
      .post('/api/weight-log')
      .set('Authorization', `Bearer ${token}`)
      .send({ weightKg: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.weightKg).toBeDefined();
  });

  test('creates an entry defaulting loggedAt to now', async () => {
    const res = await request(app)
      .post('/api/weight-log')
      .set('Authorization', `Bearer ${token}`)
      .send({ weightKg: 70.5 });

    expect(res.status).toBe(201);
    expect(res.body.data.weightKg).toBe(70.5);
    expect(res.body.data.loggedAt).toBeDefined();
    entryId = res.body.data.id;
  });

  test('creates an entry with an explicit loggedAt', async () => {
    const res = await request(app)
      .post('/api/weight-log')
      .set('Authorization', `Bearer ${token}`)
      .send({ weightKg: 69.8, loggedAt: '2026-01-01T12:00:00.000Z' });

    expect(res.status).toBe(201);
    expect(new Date(res.body.data.loggedAt).toISOString()).toBe('2026-01-01T12:00:00.000Z');
  });

  test('lists entries oldest first', async () => {
    const res = await request(app)
      .get('/api/weight-log')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(new Date(res.body.data[0].loggedAt).getTime())
      .toBeLessThanOrEqual(new Date(res.body.data[1].loggedAt).getTime());
  });

  test('updates an entry', async () => {
    const res = await request(app)
      .put(`/api/weight-log/${entryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ weightKg: 71.2 });

    expect(res.status).toBe(200);
    expect(res.body.data.weightKg).toBe(71.2);
  });

  test('another user cannot update or delete someone else\'s entry', async () => {
    const other = {
      name: 'Other Weight Tester',
      email: `weight-log-other-${runId}@example.com`,
      password: 'password123',
    };
    const otherToken = await signupAndVerify(other);

    const update = await request(app)
      .put(`/api/weight-log/${entryId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ weightKg: 1 });
    expect(update.status).toBe(404);

    const del = await request(app)
      .delete(`/api/weight-log/${entryId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(del.status).toBe(404);

    await prisma.user.deleteMany({ where: { email: other.email } });
  });

  test('deletes an entry', async () => {
    const res = await request(app)
      .delete(`/api/weight-log/${entryId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const list = await request(app)
      .get('/api/weight-log')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.data.length).toBe(1);
  });
});
