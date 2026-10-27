jest.mock('../src/config/mailer', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');
const mailer = require('../src/config/mailer');

const runId = Date.now();

const admin = {
  name: 'Admin Tester',
  email: `admin-tester-${runId}@example.com`,
  password: 'password123',
};

const target = {
  name: 'Admin Target',
  email: `admin-target-${runId}@example.com`,
  password: 'password123',
};

let adminToken;
let adminId;
let targetToken;
let targetId;

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
  const adminAccount = await signupAndVerify(admin);
  adminToken = adminAccount.token;
  adminId = adminAccount.userId;

  // Bootstrap: there is no API to create the *first* admin, so this test
  // elevates the fixture directly via Prisma, same as gamification.test.js
  // bootstraps its PREMIUM fixture.
  await prisma.user.update({ where: { id: adminId }, data: { role: 'ADMIN' } });

  const targetAccount = await signupAndVerify(target);
  targetToken = targetAccount.token;
  targetId = targetAccount.userId;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [admin.email, target.email] } } });
  await prisma.$disconnect();
});

describe('Admin user management', () => {
  test('non-admin is denied', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${targetToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  test('admin can list and search users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .query({ search: target.email })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(u => u.id === targetId)).toBe(true);
    expect(res.body.data[0].passwordHash).toBeUndefined();
  });

  test('admin cannot suspend their own account', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${adminId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CANNOT_MODIFY_SELF');
  });

  test('admin cannot change their own role', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${adminId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'USER' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CANNOT_MODIFY_SELF');
  });

  test('admin can suspend another user, and the suspended user is then blocked', async () => {
    const suspend = await request(app)
      .patch(`/api/admin/users/${targetId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' });

    expect(suspend.status).toBe(200);
    expect(suspend.body.data.status).toBe('SUSPENDED');

    const blocked = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${targetToken}`);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  test('admin can reactivate and promote a user\'s role', async () => {
    const reactivate = await request(app)
      .patch(`/api/admin/users/${targetId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });
    expect(reactivate.status).toBe(200);
    expect(reactivate.body.data.status).toBe('ACTIVE');

    const promote = await request(app)
      .patch(`/api/admin/users/${targetId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'NUTRITIONIST' });
    expect(promote.status).toBe(200);
    expect(promote.body.data.role).toBe('NUTRITIONIST');
  });

  test('404 for an unknown user id', async () => {
    const res = await request(app)
      .patch('/api/admin/users/00000000-0000-0000-0000-000000000000/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'USER' });

    expect(res.status).toBe(404);
  });
});
