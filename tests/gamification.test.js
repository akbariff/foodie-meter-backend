jest.mock('../src/config/mailer', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');
const mailer = require('../src/config/mailer');

const runId = Date.now();

const premiumUser = {
  name: 'Gamification Premium',
  email: `gamification-premium-${runId}@example.com`,
  password: 'password123',
};

const friendUser = {
  name: 'Gamification Friend',
  email: `gamification-friend-${runId}@example.com`,
  password: 'password123',
};

const freeUser = {
  name: 'Gamification Free',
  email: `gamification-free-${runId}@example.com`,
  password: 'password123',
};

let premiumToken;
let friendToken;
let freeToken;

let premiumUserId;
let friendUserId;
let challengeId;

function lastCodeSentTo(email) {
  const call = mailer.sendVerificationEmail.mock.calls
    .filter(([to]) => to === email)
    .pop();

  return call ? call[1] : null;
}

async function signupAndVerify(user) {
  const signup = await request(app)
    .post('/api/auth/signup')
    .send(user);

  expect(signup.status).toBe(201);

  const code = lastCodeSentTo(user.email);

  const verify = await request(app)
    .post('/api/auth/verify-email')
    .send({
      email: user.email,
      code,
    });

  expect(verify.status).toBe(200);

  return verify.body.data.token;
}

function dayAtNoon(offset) {
  const date = new Date();

  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);

  return date;
}

beforeAll(async () => {
  premiumToken = await signupAndVerify(premiumUser);
  friendToken = await signupAndVerify(friendUser);
  freeToken = await signupAndVerify(freeUser);

  const premium = await prisma.user.update({
    where: {
      email: premiumUser.email,
    },
    data: {
      subscriptionTier: 'PREMIUM',
    },
  });

  const friend = await prisma.user.update({
    where: {
      email: friendUser.email,
    },
    data: {
      subscriptionTier: 'PREMIUM',
    },
  });

  premiumUserId = premium.id;
  friendUserId = friend.id;

  const challenge = await prisma.challenge.create({
    data: {
      title: `Test Meal Challenge ${runId}`,
      description: 'Log 2 meals for the automated test.',
      type: 'MEAL_LOGGING',
      mode: 'INDIVIDUAL',
      targetValue: 2,
      pointsReward: 40,
      startDate: dayAtNoon(-10),
      endDate: dayAtNoon(10),
      isActive: true,
    },
  });

  challengeId = challenge.id;
});

afterAll(async () => {
  if (challengeId) {
    await prisma.challenge.deleteMany({
      where: {
        id: challengeId,
      },
    });
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          premiumUser.email,
          friendUser.email,
          freeUser.email,
        ],
      },
    },
  });

  await prisma.$disconnect();
});

describe('Premium gamification', () => {
  test('Free users cannot access Premium gamification', async () => {
    const res = await request(app)
      .get('/api/gamification/me')
      .set('Authorization', `Bearer ${freeToken}`);

    expect(res.status).toBe(403);
  });

  test('Premium user can view their gamification dashboard', async () => {
    const res = await request(app)
      .get('/api/gamification/me')
      .set('Authorization', `Bearer ${premiumToken}`);

    expect(res.status).toBe(200);

    expect(res.body.data).toMatchObject({
      id: premiumUserId,
      gamificationPoints: 0,
      leaderboardOptIn: false,
      shareProgressOptIn: false,
    });

    expect(res.body.data.userStreak).toBeNull();
    expect(res.body.data.userBadges).toEqual([]);
  });

  test('Premium user can join an active challenge', async () => {
    const res = await request(app)
      .post(`/api/gamification/challenges/${challengeId}/join`)
      .set('Authorization', `Bearer ${premiumToken}`);

    expect(res.status).toBe(201);

    expect(res.body.data).toMatchObject({
      userId: premiumUserId,
      challengeId,
      progress: 0,
    });
  });

  test('First logged meal creates streak, points, badge and challenge progress', async () => {
    const meal = await request(app)
      .post('/api/calorie-intake')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({
        consumedAt: dayAtNoon(-2).toISOString(),
        mealType: 'BREAKFAST',
        foodName: 'Gamification Test Breakfast 1',
        calories: 300,
      });

    expect(meal.status).toBe(201);

    const dashboard = await request(app)
      .get('/api/gamification/me')
      .set('Authorization', `Bearer ${premiumToken}`);

    expect(dashboard.status).toBe(200);

    expect(dashboard.body.data.gamificationPoints).toBe(10);

    expect(dashboard.body.data.userStreak).toMatchObject({
      currentStreak: 1,
      longestStreak: 1,
    });

    expect(dashboard.body.data.userBadges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FIRST_MEAL',
        }),
      ])
    );

    const membership =
      dashboard.body.data.userChallenges.find(
        item => item.challengeId === challengeId
      );

    expect(membership).toBeDefined();
    expect(membership.progress).toBe(1);
  });

  test('Second meal completes the individual challenge and awards reward points', async () => {
    const meal = await request(app)
      .post('/api/calorie-intake')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({
        consumedAt: dayAtNoon(-1).toISOString(),
        mealType: 'LUNCH',
        foodName: 'Gamification Test Lunch',
        calories: 450,
      });

    expect(meal.status).toBe(201);

    const dashboard = await request(app)
      .get('/api/gamification/me')
      .set('Authorization', `Bearer ${premiumToken}`);

    expect(dashboard.status).toBe(200);

    // 10 points day 1
    // +10 points day 2
    // +40 challenge reward
    expect(dashboard.body.data.gamificationPoints).toBe(60);

    expect(dashboard.body.data.userStreak).toMatchObject({
      currentStreak: 2,
      longestStreak: 2,
    });

    const membership =
      dashboard.body.data.userChallenges.find(
        item => item.challengeId === challengeId
      );

    expect(membership.progress).toBe(2);
    expect(membership.completedAt).not.toBeNull();
  });

  test('Third consecutive active day awards the 3-day streak badge', async () => {
    const meal = await request(app)
      .post('/api/calorie-intake')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({
        consumedAt: dayAtNoon(0).toISOString(),
        mealType: 'DINNER',
        foodName: 'Gamification Test Dinner',
        calories: 500,
      });

    expect(meal.status).toBe(201);

    const dashboard = await request(app)
      .get('/api/gamification/me')
      .set('Authorization', `Bearer ${premiumToken}`);

    expect(dashboard.status).toBe(200);

    expect(dashboard.body.data.gamificationPoints).toBe(70);

    expect(dashboard.body.data.userStreak).toMatchObject({
      currentStreak: 3,
      longestStreak: 3,
    });

    expect(dashboard.body.data.userBadges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'STREAK_3',
        }),
      ])
    );
  });

  test('Premium user can opt into leaderboard and progress sharing', async () => {
    const res = await request(app)
      .put('/api/gamification/settings')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({
        leaderboardOptIn: true,
        shareProgressOptIn: true,
      });

    expect(res.status).toBe(200);

    expect(res.body.data).toEqual({
      leaderboardOptIn: true,
      shareProgressOptIn: true,
    });
  });

  test('Leaderboard ranks opted-in Premium users by points', async () => {
    await prisma.user.update({
      where: {
        id: friendUserId,
      },
      data: {
        leaderboardOptIn: true,
        shareProgressOptIn: true,
        gamificationPoints: 100,
      },
    });

    const res = await request(app)
      .get('/api/gamification/leaderboard')
      .set('Authorization', `Bearer ${premiumToken}`);

    expect(res.status).toBe(200);

    const friendEntry = res.body.data.entries.find(
      item => item.id === friendUserId
    );

    const premiumEntry = res.body.data.entries.find(
      item => item.id === premiumUserId
    );

    expect(friendEntry).toBeDefined();
    expect(premiumEntry).toBeDefined();

    expect(friendEntry.rank).toBeLessThan(
      premiumEntry.rank
    );

    expect(res.body.data.currentUserRank).not.toBeNull();
  });

  test('Premium user can follow another Premium user', async () => {
    await prisma.userStreak.upsert({
      where: {
        userId: friendUserId,
      },
      update: {
        currentStreak: 4,
        longestStreak: 4,
        lastActiveDate: new Date(),
      },
      create: {
        userId: friendUserId,
        currentStreak: 4,
        longestStreak: 4,
        lastActiveDate: new Date(),
      },
    });

    const follow = await request(app)
      .post(`/api/gamification/follow/${friendUserId}`)
      .set('Authorization', `Bearer ${premiumToken}`);

    expect(follow.status).toBe(201);

    const following = await request(app)
      .get('/api/gamification/following')
      .set('Authorization', `Bearer ${premiumToken}`);

    expect(following.status).toBe(200);

    const friend = following.body.data.find(
      item => item.id === friendUserId
    );

    expect(friend).toBeDefined();

    expect(friend.progress).toMatchObject({
      gamificationPoints: 100,
      currentStreak: 4,
      longestStreak: 4,
    });
  });

  test('Progress is hidden when followed user disables sharing', async () => {
    const settings = await request(app)
      .put('/api/gamification/settings')
      .set('Authorization', `Bearer ${friendToken}`)
      .send({
        shareProgressOptIn: false,
      });

    expect(settings.status).toBe(200);

    const following = await request(app)
      .get('/api/gamification/following')
      .set('Authorization', `Bearer ${premiumToken}`);

    expect(following.status).toBe(200);

    const friend = following.body.data.find(
      item => item.id === friendUserId
    );

    expect(friend).toBeDefined();
    expect(friend.progress).toBeNull();
  });

  test('Premium user can unfollow another user', async () => {
    const res = await request(app)
      .delete(`/api/gamification/follow/${friendUserId}`)
      .set('Authorization', `Bearer ${premiumToken}`);

    expect(res.status).toBe(204);

    const following = await request(app)
      .get('/api/gamification/following')
      .set('Authorization', `Bearer ${premiumToken}`);

    expect(following.status).toBe(200);

    expect(
      following.body.data.some(
        item => item.id === friendUserId
      )
    ).toBe(false);
  });
});