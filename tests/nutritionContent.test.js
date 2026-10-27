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
  name: 'Content Admin',
  email: `content-admin-${runId}@example.com`,
  password: 'password123',
};

const assignedNutritionist = {
  name: 'Assigned Nutritionist',
  email: `content-assigned-${runId}@example.com`,
  password: 'password123',
};

const unassignedNutritionist = {
  name: 'Unassigned Nutritionist',
  email: `content-unassigned-${runId}@example.com`,
  password: 'password123',
};

let adminToken;
let adminId;
let assignedToken;
let assignedId;
let unassignedToken;
let categoryId;
let contentId;

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
  await prisma.user.update({ where: { id: adminAccount.userId }, data: { role: 'ADMIN' } });

  const assignedAccount = await signupAndVerify(assignedNutritionist);
  assignedToken = assignedAccount.token;
  assignedId = assignedAccount.userId;
  await prisma.user.update({ where: { id: assignedId }, data: { role: 'NUTRITIONIST' } });

  const unassignedAccount = await signupAndVerify(unassignedNutritionist);
  unassignedToken = unassignedAccount.token;
  await prisma.user.update({ where: { id: unassignedAccount.userId }, data: { role: 'NUTRITIONIST' } });
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [admin.email, assignedNutritionist.email, unassignedNutritionist.email] } },
  });
  await prisma.$disconnect();
});

describe('Nutrition categories', () => {
  test('public GET list works with no auth', async () => {
    const res = await request(app).get('/api/nutrition-categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('non-admin cannot create a category', async () => {
    const res = await request(app)
      .post('/api/nutrition-categories')
      .set('Authorization', `Bearer ${assignedToken}`)
      .send({ name: `Should Fail ${runId}` });
    expect(res.status).toBe(403);
  });

  test('admin can create a category', async () => {
    const res = await request(app)
      .post('/api/nutrition-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Sports Nutrition ${runId}`, description: 'Fueling performance' });

    expect(res.status).toBe(201);
    categoryId = res.body.data.id;
  });

  test('assigning a user who is not a NUTRITIONIST is rejected', async () => {
    const res = await request(app)
      .post(`/api/nutrition-categories/${categoryId}/nutritionists/${adminId}`) // valid uuid, but role=ADMIN not NUTRITIONIST
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  test('admin can assign the nutritionist to the category', async () => {
    const res = await request(app)
      .post(`/api/nutrition-categories/${categoryId}/nutritionists/${assignedId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(201);

    const list = await request(app).get(`/api/nutrition-categories/${categoryId}/nutritionists`);
    expect(list.status).toBe(200);
    expect(list.body.data.map(n => n.id)).toContain(assignedId);
  });

  test('assigning the same nutritionist twice is a conflict', async () => {
    const res = await request(app)
      .post(`/api/nutrition-categories/${categoryId}/nutritionists/${assignedId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
  });
});

describe('Nutrition content authorship', () => {
  test('an unassigned nutritionist cannot post to the category', async () => {
    const res = await request(app)
      .post('/api/nutrition-contents')
      .set('Authorization', `Bearer ${unassignedToken}`)
      .send({ categoryId, title: 'Should fail', content: 'No access' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_CATEGORY');
  });

  test('the assigned nutritionist can post to the category', async () => {
    const res = await request(app)
      .post('/api/nutrition-contents')
      .set('Authorization', `Bearer ${assignedToken}`)
      .send({ categoryId, title: 'Pre-workout fueling', content: 'Eat carbs 2 hours before training.' });

    expect(res.status).toBe(201);
    contentId = res.body.data.id;
  });

  test('an admin can post to any category regardless of assignment', async () => {
    const res = await request(app)
      .post('/api/nutrition-contents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ categoryId, title: 'Admin note', content: 'Posted by an admin without assignment.' });

    expect(res.status).toBe(201);
  });

  test('public GET list and filter by category works', async () => {
    const res = await request(app).get('/api/nutrition-contents').query({ categoryId });
    expect(res.status).toBe(200);
    expect(res.body.data.some(c => c.id === contentId)).toBe(true);
  });

  test('a different nutritionist cannot edit someone else\'s article', async () => {
    const res = await request(app)
      .put(`/api/nutrition-contents/${contentId}`)
      .set('Authorization', `Bearer ${unassignedToken}`)
      .send({ title: 'Hijacked' });

    expect(res.status).toBe(404);
  });

  test('the author can edit their own article', async () => {
    const res = await request(app)
      .put(`/api/nutrition-contents/${contentId}`)
      .set('Authorization', `Bearer ${assignedToken}`)
      .send({ title: 'Pre-workout fueling (updated)' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Pre-workout fueling (updated)');
  });

  test('the author can delete their own article', async () => {
    const res = await request(app)
      .delete(`/api/nutrition-contents/${contentId}`)
      .set('Authorization', `Bearer ${assignedToken}`);

    expect(res.status).toBe(204);
  });
});

describe('Category deletion guard', () => {
  test('deleting a category with content still attached is blocked', async () => {
    const res = await request(app)
      .delete(`/api/nutrition-categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    // The assigned nutritionist's article was deleted above, but the admin-posted
    // one in the same category is still there.
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CATEGORY_HAS_CONTENT');
  });

  test('deleting all content then the category succeeds', async () => {
    const remaining = await request(app).get('/api/nutrition-contents').query({ categoryId });
    await Promise.all(
      remaining.body.data.map(c =>
        request(app).delete(`/api/nutrition-contents/${c.id}`).set('Authorization', `Bearer ${adminToken}`)
      )
    );

    const res = await request(app)
      .delete(`/api/nutrition-categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });
});
