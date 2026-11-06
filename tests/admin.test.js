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
let reviewRecipeId;
let targetReviewId;

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

  const recipe =await request(app).post('/api/recipes').set('Authorization',`Bearer ${targetToken}`).send(
    {
      title:`Admin Review Recipe ${runId}`,
      ingredients:'Chicken, rice, vegetables',
      instructions:'Cook and serve.',
      isShared: true,
    });

expect(recipe.status).toBe(201);

reviewRecipeId = recipe.body.data.id;


const review = await request(app)
    .put( `/api/recipe-reviews/${reviewRecipeId}/me`)
    .set('Authorization',`Bearer ${targetToken}`)
    .send({rating: 4,comment:'Original review for admin testing.',});
    expect(review.status).toBe(200);
    targetReviewId =review.body.data.id;
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
  test('admin can trigger a password reset for another user', async () => {
  const res = await request(app)
      .post(`/api/admin/users/${targetId}/password-reset`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    expect(
      mailer.sendPasswordResetEmail
    ).toHaveBeenCalledWith(
      target.email,
      expect.any(String)
    );
  });

  test('website information is publicly readable',
  async () => {
    const res =await request(app).get('/api/site-info');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.objectContaining({
        id: 'main',
        siteName: expect.any(String),
        heroHeadingPrimary: expect.any(String),
        heroHeadingAccent: expect.any(String),
        heroDescription: expect.any(String),
        aboutHeading: expect.any(String),
        aboutDescription: expect.any(String),
        ctaHeading: expect.any(String),
        footerTagline: expect.any(String),
      })
    );
  }
);

test('non-admin cannot update website information',
  async () => {
    const res = await request(app)
        .put('/api/site-info')
        .set('Authorization',`Bearer ${targetToken}`)
        .send({siteName: 'Not Allowed',});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  }
);

test('admin can update website information',
  async () => {
    const res = await request(app)
        .put('/api/site-info')
        .set('Authorization',`Bearer ${adminToken}`)
        .send({siteName: 'FoodieMeter',
          heroHeadingPrimary:'Eat good.',
          heroHeadingAccent:'Feel good.',
          aboutHeading:'Better awareness, one meal at a time.',
          footerTagline:'Eat good, feel good.',
        });

    expect(res.status).toBe(200);
    expect(res.body.data.siteName).toBe('FoodieMeter');
    expect(res.body.data.heroHeadingPrimary).toBe('Eat good.');
    expect(res.body.data.footerTagline).toBe('Eat good, feel good.');
  }
);

test('updated website information remains publicly readable',
  async () => {
    const res = await request(app)
    .get('/api/site-info');
    expect(res.status).toBe(200);
    expect(res.body.data.heroHeadingPrimary).toBe('Eat good.');
    expect(res.body.data.aboutHeading).toBe('Better awareness, one meal at a time.');
  }
);

  test('non-admin cannot view system analytics', async () => {
  const res = await request(app)
    .get('/api/admin/analytics')
    .set(
      'Authorization',
      `Bearer ${targetToken}`
    );

  expect(res.status).toBe(403);
  expect(res.body.error.code).toBe(
    'FORBIDDEN_ROLE'
  );
});

test('admin can view system-wide analytics', async () => {
  const res = await request(app)
    .get('/api/admin/analytics')
    .set(
      'Authorization',
      `Bearer ${adminToken}`
    );

  expect(res.status).toBe(200);

  expect(res.body.data).toEqual(
    expect.objectContaining({
      generatedAt: expect.any(String),

      accounts: expect.objectContaining({
        total: expect.any(Number),
        active: expect.any(Number),
        suspended: expect.any(Number),

        byRole: expect.objectContaining({
          USER: expect.any(Number),
          NUTRITIONIST: expect.any(Number),
          ADMIN: expect.any(Number),
        }),

        byTier: expect.objectContaining({
          FREE: expect.any(Number),
          PREMIUM: expect.any(Number),
        }),
      }),

      subscription: expect.objectContaining({
        premiumUsers: expect.any(Number),
        conversionRate: expect.any(Number),
      }),

      engagement: expect.objectContaining({
        activeUsers7d: expect.any(Number),
        activeUsers30d: expect.any(Number),
        engagementRate30d: expect.any(Number),
        retentionProxyRate30d:
          expect.any(Number),
      }),

      growth: expect.any(Array),

      featureUsage30d:
        expect.any(Array),
    })
  );

  expect(
    res.body.data.growth
  ).toHaveLength(6);

  expect(
    res.body.data.accounts.byRole.ADMIN
  ).toBeGreaterThanOrEqual(1);
});
  
test('non-admin cannot access admin review management',
  async () => {const res =await request(app)
    .get('/api/admin/reviews')
    .set('Authorization',`Bearer ${targetToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  }
);

test('admin can list reviews',
  async () => {const res = await request(app)
        .get('/api/admin/reviews')
        .set(
          'Authorization',
          `Bearer ${adminToken}`
        );

    expect(res.status).toBe(200);

    const review =
      res.body.data.find( item =>item.id === targetReviewId);

    expect(review).toBeDefined();

    expect(review.recipe.title).toContain(
      'Admin Review Recipe'
    );

    expect(
      review.user.email
    ).toBe(target.email);
  }
);

test(
  'admin can update another users review',
  async () => {
    const res =
      await request(app)
      .patch(`/api/admin/reviews/${targetReviewId}`)
      .set('Authorization',`Bearer ${adminToken}`)
      .send({rating: 5,comment:'Review content updated by administrator.',});

    expect(res.status).toBe(200);
    expect(res.body.data.rating).toBe(5);
    expect(res.body.data.comment).toBe('Review content updated by administrator.');
  }
);

test(
  'admin can add review content to a shared recipe',
  async () => {
    const res =await request(app)
        .post('/api/admin/reviews')
        .set('Authorization',`Bearer ${adminToken}`)
        .send({recipeId:reviewRecipeId,rating: 4,comment:'Administrator review content.', });

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(adminId);
    expect(res.body.data.recipe.id).toBe(reviewRecipeId);
  }
);

test(
  'admin can delete review content',
  async () => {
    const res =
      await request(app).delete(`/api/admin/reviews/${targetReviewId}`
        )
        .set('Authorization',`Bearer ${adminToken}`);

    expect(res.status).toBe(204);

    const deleted = await prisma.recipeReview.findUnique({
      where: {id: targetReviewId,},});
      expect(deleted).toBeNull();
  }
);

  test('admin can remove another non-admin account', async () => {
  const res = await request(app)
      .delete(`/api/admin/users/${targetId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);

    const deleted = await prisma.user.findUnique({
      where: { id: targetId },
    });

    expect(deleted).toBeNull();
  });
});
