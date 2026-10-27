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
  name: 'Profile Tester',
  email: `profile-tester-${runId}@example.com`,
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

describe('UserProfile API', () => {
  test('GET /api/profile returns 404 before any profile is set', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROFILE_NOT_SET');
  });

  test('PUT /api/profile rejects an out-of-range heightCm', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ heightCm: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.heightCm).toBeDefined();
  });

  test('PUT /api/profile rejects an invalid activityLevel', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ activityLevel: 'SUPER_ACTIVE' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.activityLevel).toBeDefined();
  });

  test('PUT /api/profile creates the profile on first call, then partially updates it', async () => {
    const create = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ heightCm: 170, weightKg: 65, activityLevel: 'MODERATE', weightGoal: 'MAINTAIN' });

    expect(create.status).toBe(200);
    expect(create.body.data.heightCm).toBe(170);
    expect(create.body.data.weightKg).toBe(65);
    expect(create.body.data.activityLevel).toBe('MODERATE');
    expect(create.body.data.weightGoal).toBe('MAINTAIN');

    const update = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ weightKg: 63 });

    expect(update.status).toBe(200);
    expect(update.body.data.weightKg).toBe(63);
    // Fields not sent in the partial update must survive unchanged.
    expect(update.body.data.heightCm).toBe(170);
    expect(update.body.data.activityLevel).toBe('MODERATE');
  });

  test('GET /api/profile returns the saved profile', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.weightKg).toBe(63);
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(401);
  });
});
