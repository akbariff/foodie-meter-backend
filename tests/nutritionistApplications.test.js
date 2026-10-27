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
  name: 'Applications Admin',
  email: `applications-admin-${runId}@example.com`,
  password: 'password123',
};

// The applicant does NOT need an account at submission time. A matching
// account is created only for the "approval promotes an existing user"
// scenario below.
const applicantWithAccount = {
  name: 'Applicant With Account',
  email: `applicant-with-account-${runId}@example.com`,
  password: 'password123',
};

const applicantEmailOnly = `applicant-no-account-${runId}@example.com`;

let adminToken;
let applicantToken;
let applicantUserId;

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
  await prisma.user.update({ where: { id: adminAccount.userId }, data: { role: 'ADMIN' } });

  const applicantAccount = await signupAndVerify(applicantWithAccount);
  applicantToken = applicantAccount.token;
  applicantUserId = applicantAccount.userId;
});

afterAll(async () => {
  await prisma.nutritionistApplication.deleteMany({
    where: { email: { in: [applicantWithAccount.email, applicantEmailOnly] } },
  });
  await prisma.user.deleteMany({ where: { email: { in: [admin.email, applicantWithAccount.email] } } });
  await prisma.$disconnect();
});

describe('Nutritionist applications', () => {
  let noAccountApplicationId;
  let withAccountApplicationId;

  test('submitting requires no authentication', async () => {
    const res = await request(app)
      .post('/api/nutritionist-applications')
      .send({
        name: 'No Account Applicant',
        email: applicantEmailOnly,
        qualification: 'Registered Dietitian',
        specialty: 'Sports nutrition',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    noAccountApplicationId = res.body.data.id;
  });

  test('missing required fields are rejected', async () => {
    const res = await request(app)
      .post('/api/nutritionist-applications')
      .send({ name: 'Incomplete' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.email).toBeDefined();
  });

  test('non-admin cannot list applications', async () => {
    const res = await request(app)
      .get('/api/nutritionist-applications')
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(res.status).toBe(403);
  });

  test('admin can list and filter applications', async () => {
    const res = await request(app)
      .get('/api/nutritionist-applications')
      .query({ status: 'PENDING' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(a => a.id === noAccountApplicationId)).toBe(true);
  });

  test('approving when no matching account exists still succeeds, with userPromoted:false', async () => {
    const res = await request(app)
      .post(`/api/nutritionist-applications/${noAccountApplicationId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
    expect(res.body.data.userPromoted).toBe(false);
  });

  test('approving again (already APPROVED) is rejected with 409', async () => {
    const res = await request(app)
      .post(`/api/nutritionist-applications/${noAccountApplicationId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
  });

  test('submitting with an email that matches an existing user, then approving, promotes that user to NUTRITIONIST', async () => {
    const submit = await request(app)
      .post('/api/nutritionist-applications')
      .send({
        name: applicantWithAccount.name,
        email: applicantWithAccount.email,
        qualification: 'MSc Nutrition',
        specialty: 'Weight management',
      });
    expect(submit.status).toBe(201);
    withAccountApplicationId = submit.body.data.id;

    const approve = await request(app)
      .post(`/api/nutritionist-applications/${withAccountApplicationId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approve.status).toBe(200);
    expect(approve.body.data.userPromoted).toBe(true);

    const profile = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(profile.body.data.role).toBe('NUTRITIONIST');
  });

  test('reject requires notes', async () => {
    const submit = await request(app)
      .post('/api/nutritionist-applications')
      .send({
        name: 'Reject Me',
        email: `reject-me-${runId}@example.com`,
        qualification: 'Q',
        specialty: 'S',
      });
    const id = submit.body.data.id;

    const noNotes = await request(app)
      .post(`/api/nutritionist-applications/${id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(noNotes.status).toBe(400);

    const rejected = await request(app)
      .post(`/api/nutritionist-applications/${id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Not enough experience documented.' });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.status).toBe('REJECTED');

    await prisma.nutritionistApplication.delete({ where: { id } });
  });
});
