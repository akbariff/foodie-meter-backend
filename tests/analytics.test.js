jest.mock('../src/config/mailer', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');
const mailer = require('../src/config/mailer');

const runId = Date.now();

const freeUser = {
  name: 'Analytics Free',
  email: `analytics-free-${runId}@example.com`,
  password: 'password123',
};

const emptyPremiumUser = {
  name: 'Analytics Empty Premium',
  email: `analytics-empty-${runId}@example.com`,
  password: 'password123',
};

const populatedUser = {
  name: 'Analytics Populated',
  email: `analytics-populated-${runId}@example.com`,
  password: 'password123',
};

let freeToken;
let emptyToken;
let populatedToken;

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

function dayAtNoon(offset) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
}

async function logCalories(token, offset, calories) {
  const res = await request(app)
    .post('/api/calorie-intake')
    .set('Authorization', `Bearer ${token}`)
    .send({
      consumedAt: dayAtNoon(offset).toISOString(),
      mealType: 'LUNCH',
      foodName: `Fixture meal ${offset}`,
      calories,
    });
  expect(res.status).toBe(201);
}

async function logWeight(token, offset, weightKg) {
  const res = await request(app)
    .post('/api/weight-log')
    .set('Authorization', `Bearer ${token}`)
    .send({ weightKg, loggedAt: dayAtNoon(offset).toISOString() });
  expect(res.status).toBe(201);
}

beforeAll(async () => {
  const free = await signupAndVerify(freeUser);
  freeToken = free.token;

  const empty = await signupAndVerify(emptyPremiumUser);
  emptyToken = empty.token;
  await prisma.user.update({ where: { id: empty.userId }, data: { subscriptionTier: 'PREMIUM' } });

  const populated = await signupAndVerify(populatedUser);
  populatedToken = populated.token;
  await prisma.user.update({ where: { id: populated.userId }, data: { subscriptionTier: 'PREMIUM' } });

  // Fixture chosen so every derived number can be hand-verified:
  // goal = 2000 kcal, tolerance band = [1700, 2300].
  await request(app)
    .put('/api/calorie-goal')
    .set('Authorization', `Bearer ${populatedToken}`)
    .send({ targetCalories: 2000 });

  await logCalories(populatedToken, -5, 2000); // on track
  await logCalories(populatedToken, -3, 1000); // not on track
  await logCalories(populatedToken, -1, 2100); // on track
  await logCalories(populatedToken, 0, 600);   // today, partial day

  await logWeight(populatedToken, -7, 60);
  await logWeight(populatedToken, 0, 63);
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [freeUser.email, emptyPremiumUser.email, populatedUser.email] } },
  });
  await prisma.$disconnect();
});

describe('Analytics overview', () => {
  test('FREE tier is denied', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${freeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_TIER');
  });

  test('empty state returns zeroed trend data without erroring', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${emptyToken}`);

    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(data.days).toBe(30);
    expect(data.caloriesTrend.length).toBe(30);
    expect(data.caloriesTrend.every(d => d.consumedCalories === 0 && d.targetCalories === null)).toBe(true);
    expect(data.averageDailyCalories).toBeNull();
    expect(data.adherenceRate).toBeNull();
    expect(data.weightTrend).toBeNull();
    expect(data.weightProjection).toBeNull();
    expect(data.streak).toBeNull();
    // No goal set at all, so todayProjection is deterministically null
    // regardless of what time of day this test happens to run.
    expect(data.todayProjection).toBeNull();
  });

  test('populated fixture produces exactly the hand-computed numbers', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .query({ days: 10 })
      .set('Authorization', `Bearer ${populatedToken}`);

    expect(res.status).toBe(200);
    const { data } = res.body;

    expect(data.days).toBe(10);
    expect(data.caloriesTrend.length).toBe(10);

    // (2000 + 1000 + 2100 + 600) / 4 days-with-entries
    expect(data.averageDailyCalories).toBe(1425);
    // On track: day -5 (2000) and day -1 (2100) are within [1700, 2300];
    // day -3 (1000) and day 0 (600) are not. 2 of 4 = 50%.
    expect(data.adherenceRate).toBe(50);

    // 60kg -> 63kg over exactly 7 days.
    expect(data.weightTrend).not.toBeNull();
    expect(data.weightTrend.netChangeKg).toBe(3);
    expect(data.weightTrend.averagePerWeekKg).toBe(3);

    expect(data.weightProjection).not.toBeNull();
    expect(data.weightProjection.currentWeightKg).toBe(63);
    expect(data.weightProjection.trendKgPerWeek).toBe(3);
    expect(data.weightProjection.projectedIn4WeeksKg).toBe(75); // 63 + 3*4

    // todayProjection depends on what fraction of the UTC day has elapsed
    // when this test happens to run, so only assert its internal formula
    // holds when present rather than a fixed value.
    if (data.todayProjection !== null) {
      expect(data.todayProjection.consumedSoFar).toBe(600);
      expect(data.todayProjection.projectedEndOfDayCalories)
        .toBe(Math.round(600 / data.todayProjection.fractionOfDayElapsed));
    }
  });

  test('rejects an out-of-range days parameter', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .query({ days: 200 })
      .set('Authorization', `Bearer ${populatedToken}`);

    expect(res.status).toBe(400);
  });
});
