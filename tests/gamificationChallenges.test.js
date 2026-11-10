jest.mock('../src/config/mailer', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');
const mailer = require('../src/config/mailer');

const runId = Date.now();
const people = ['a', 'b', 'c'].map(key => ({
  key,
  name: `Challenge Tester ${key.toUpperCase()}`,
  email: `challenge-${key}-${runId}@example.com`,
  password: 'password123',
}));

const tokens = {};
const ids = {};
let calorieChallengeId;
let groupChallengeId;
let calorieEntryId;

function dayAtNoon(offset) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
}

async function signupAndVerify(account) {
  const signup = await request(app).post('/api/auth/signup').send(account);
  expect(signup.status).toBe(201);
  const code = mailer.sendVerificationEmail.mock.calls.filter(([to]) => to === account.email).pop()[1];
  const verify = await request(app).post('/api/auth/verify-email').send({ email: account.email, code });
  expect(verify.status).toBe(200);
  return { token: verify.body.data.token, userId: verify.body.data.user.id };
}

const auth = key => ({ Authorization: `Bearer ${tokens[key]}` });

async function logMeal(key, offset, calories, mealType = 'LUNCH') {
  const res = await request(app)
    .post('/api/calorie-intake')
    .set(auth(key))
    .send({ consumedAt: dayAtNoon(offset).toISOString(), mealType, foodName: `Test meal ${offset}`, calories });
  expect(res.status).toBe(201);
  return res.body.data;
}

const membership = (key, challengeId) =>
  prisma.userChallenge.findUnique({ where: { userId_challengeId: { userId: ids[key], challengeId } } });
const points = async key => (await prisma.user.findUnique({ where: { id: ids[key] } })).gamificationPoints;

async function join(key, challengeId) {
  return request(app).post(`/api/gamification/challenges/${challengeId}/join`).set(auth(key));
}

beforeAll(async () => {
  for (const person of people) {
    const account = await signupAndVerify(person);
    tokens[person.key] = account.token;
    ids[person.key] = account.userId;
    await prisma.user.update({ where: { id: account.userId }, data: { subscriptionTier: 'PREMIUM' } });
  }

  const window = { startDate: dayAtNoon(-10), endDate: dayAtNoon(10), isActive: true };
  calorieChallengeId = (await prisma.challenge.create({
    data: {
      title: `Test On-Target Days ${runId}`, description: 'Hit your calorie goal on 2 days.',
      type: 'CALORIE_GOAL', mode: 'INDIVIDUAL', targetValue: 2, pointsReward: 30, ...window,
    },
  })).id;
  groupChallengeId = (await prisma.challenge.create({
    data: {
      title: `Test Group Meals ${runId}`, description: 'Log 3 meals together.',
      type: 'MEAL_LOGGING', mode: 'GROUP', targetValue: 3, pointsReward: 50, ...window,
    },
  })).id;
});

afterAll(async () => {
  await prisma.challenge.deleteMany({ where: { id: { in: [calorieChallengeId, groupChallengeId].filter(Boolean) } } });
  await prisma.user.deleteMany({ where: { email: { in: people.map(p => p.email) } } });
  await prisma.$disconnect();
});

describe('CALORIE_GOAL challenges', () => {
  beforeAll(async () => {
    const goal = await request(app).put('/api/calorie-goal').set(auth('a')).send({ targetCalories: 2000 });
    expect(goal.status).toBe(200);
    expect((await join('a', calorieChallengeId)).status).toBe(201);
    // Pretend the user joined a few days ago so earlier days can count.
    await prisma.userChallenge.update({
      where: { userId_challengeId: { userId: ids.a, challengeId: calorieChallengeId } },
      data: { joinedAt: dayAtNoon(-5) },
    });
  });

  test('a day below the goal band does not count', async () => {
    await logMeal('a', -3, 1000);
    expect((await membership('a', calorieChallengeId)).progress).toBe(0);
  });

  test('a day counts once its total is within 15% of the goal', async () => {
    calorieEntryId = (await logMeal('a', -3, 900)).id; // day total 1900, inside 1700 to 2300
    expect((await membership('a', calorieChallengeId)).progress).toBe(1);
  });

  test('editing an entry so the day goes off target removes that day', async () => {
    const off = await request(app).put(`/api/calorie-intake/${calorieEntryId}`).set(auth('a')).send({ calories: 100 });
    expect(off.status).toBe(200);
    expect((await membership('a', calorieChallengeId)).progress).toBe(0);

    const back = await request(app).put(`/api/calorie-intake/${calorieEntryId}`).set(auth('a')).send({ calories: 900 });
    expect(back.status).toBe(200);
    expect((await membership('a', calorieChallengeId)).progress).toBe(1);
  });

  test('a second on-target day completes the challenge and awards its points', async () => {
    const before = await points('a');
    await logMeal('a', -2, 2100);
    const after = await membership('a', calorieChallengeId);
    expect(after.progress).toBe(2);
    expect(after.completedAt).not.toBeNull();
    expect(await points('a')).toBe(before + 10 + 30); // new active day + challenge reward
  });
});

describe('GROUP challenges', () => {
  test('members join the same group challenge', async () => {
    expect((await join('a', groupChallengeId)).status).toBe(201);
    expect((await join('b', groupChallengeId)).status).toBe(201);
  });

  test('progress is shared: the group total is every member added together', async () => {
    await logMeal('a', 0, 500);
    await logMeal('a', 0, 400, 'DINNER');

    const res = await request(app).get('/api/gamification/challenges').set(auth('a'));
    const challenge = res.body.data.find(c => c.id === groupChallengeId);
    expect(challenge.mode).toBe('GROUP');
    expect(challenge.progress).toBe(2); // A's own contribution
    expect(challenge.groupProgress).toBe(2);
    expect(challenge.memberCount).toBe(2);
    expect(challenge.completedAt).toBeNull();
  });

  test('when the group reaches the target, every member completes it and earns the reward', async () => {
    const aBefore = await points('a');
    const bBefore = await points('b');

    await logMeal('b', 0, 600); // group total 2 + 1 = 3

    const a = await membership('a', groupChallengeId);
    const b = await membership('b', groupChallengeId);
    expect(a.completedAt).not.toBeNull();
    expect(b.completedAt).not.toBeNull();
    expect(a.progress).toBe(2);
    expect(b.progress).toBe(1);
    expect(await points('a')).toBe(aBefore + 50);
    expect(await points('b')).toBe(bBefore + 10 + 50); // B's first active day + reward

    const res = await request(app).get('/api/gamification/challenges').set(auth('b'));
    const challenge = res.body.data.find(c => c.id === groupChallengeId);
    expect(challenge.groupProgress).toBe(3);
  });

  test('the reward is not paid twice when members keep logging', async () => {
    const aBefore = await points('a');
    await logMeal('a', 0, 300, 'SNACK');
    expect(await points('a')).toBe(aBefore); // same day, challenge already complete
    expect((await membership('a', groupChallengeId)).progress).toBe(2);
  });

  test('nobody can join a group challenge that is already complete', async () => {
    const res = await join('c', groupChallengeId);
    expect(res.status).toBe(409);
  });
});
