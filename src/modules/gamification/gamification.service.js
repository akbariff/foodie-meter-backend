const { randomUUID } = require('crypto');
const prisma = require('../../config/db');
const { ADHERENCE_TOLERANCE_PERCENT } = require('../analytics/constants');

const BADGES = Object.freeze({
  FIRST_MEAL: {
    code: 'FIRST_MEAL',
    title: 'First Meal',
    description: 'Log your first meal.',
  },
  STREAK_3: {
    code: 'STREAK_3',
    title: '3 Day Streak',
    description: 'Log meals on 3 consecutive days.',
  },
  STREAK_7: {
    code: 'STREAK_7',
    title: '7 Day Streak',
    description: 'Log meals on 7 consecutive days.',
  },
  STREAK_30: {
    code: 'STREAK_30',
    title: '30 Day Streak',
    description: 'Log meals on 30 consecutive days.',
  },
});

function startOfUtcDay(value) {
  const date = new Date(value);
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
}

function differenceInDays(later, earlier) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  return Math.round(
    (startOfUtcDay(later) - startOfUtcDay(earlier)) / DAY_MS
  );
}

async function awardBadge(userId, code) {
  if (!BADGES[code]) return null;

  return prisma.userBadge.upsert({
    where: {
      userId_code: {
        userId,
        code,
      },
    },
    update: {},
    create: {
      id: randomUUID(),
      userId,
      code,
    },
  });
}

async function updateStreak(userId, activityDate) {
  const activityDay = startOfUtcDay(activityDate);

  let streak = await prisma.userStreak.findUnique({
    where: { userId },
  });

  let newActiveDay = false;

  if (!streak) {
    streak = await prisma.userStreak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: activityDay,
      },
    });

    newActiveDay = true;
  } else if (!streak.lastActiveDate) {
    streak = await prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: 1,
        longestStreak: Math.max(streak.longestStreak, 1),
        lastActiveDate: activityDay,
      },
    });

    newActiveDay = true;
  } else {
    const gap = differenceInDays(activityDay, streak.lastActiveDate);

    // Same day or an older/backdated entry.
    if (gap <= 0) {
      return streak;
    }

    const currentStreak = gap === 1
      ? streak.currentStreak + 1
      : 1;

    streak = await prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak,
        longestStreak: Math.max(
          streak.longestStreak,
          currentStreak
        ),
        lastActiveDate: activityDay,
      },
    });

    newActiveDay = true;
  }

  if (newActiveDay) {
    // 10 points per active day rather than per meal,
    // so users cannot farm points by repeatedly logging meals.
    await prisma.user.update({
      where: { id: userId },
      data: {
        gamificationPoints: {
          increment: 10,
        },
      },
    });
  }

  await awardBadge(userId, 'FIRST_MEAL');

  if (streak.currentStreak >= 3) {
    await awardBadge(userId, 'STREAK_3');
  }

  if (streak.currentStreak >= 7) {
    await awardBadge(userId, 'STREAK_7');
  }

  if (streak.currentStreak >= 30) {
    await awardBadge(userId, 'STREAK_30');
  }

  return streak;
}

// A CALORIE_GOAL day counts when that day's total is within this band of the
// user's goal (same tolerance as the analytics adherence rate).
function onTargetBand(targetCalories) {
  const tolerance = ADHERENCE_TOLERANCE_PERCENT / 100;
  return [targetCalories * (1 - tolerance), targetCalories * (1 + tolerance)];
}

// Number of UTC days between `from` and `to` whose logged total is on target.
// Recomputed from the diary each time, so a day is never counted twice.
async function countOnTargetDays(userId, from, to) {
  const goal = await prisma.calorieGoal.findUnique({ where: { userId } });
  if (!goal) return 0;

  const entries = await prisma.calorieIntake.findMany({
    where: { userId, consumedAt: { gte: from, lte: to } },
    select: { consumedAt: true, calories: true },
  });

  const totals = new Map();
  for (const item of entries) {
    const day = startOfUtcDay(item.consumedAt).toISOString();
    totals.set(day, (totals.get(day) || 0) + item.calories);
  }

  const [low, high] = onTargetBand(goal.targetCalories);
  return [...totals.values()].filter(total => total >= low && total <= high).length;
}

// This member's own count towards the challenge after logging `entry`.
async function contributionAfter(userId, membership, entry) {
  const { challenge } = membership;

  switch (challenge.type) {
    case 'MEAL_LOGGING':
      return membership.progress + 1;

    case 'BREAKFAST_LOGGING':
      return entry.mealType === 'BREAKFAST'
        ? membership.progress + 1
        : membership.progress;

    case 'CALORIE_GOAL': {
      const joinedDay = startOfUtcDay(membership.joinedAt);
      const from = joinedDay > challenge.startDate ? joinedDay : challenge.startDate;
      return countOnTargetDays(userId, from, challenge.endDate);
    }

    default:
      return membership.progress;
  }
}

async function applyIndividualProgress(userId, challenge, progress) {
  const completed = progress >= challenge.targetValue;

  const operations = [
    prisma.userChallenge.update({
      where: { userId_challengeId: { userId, challengeId: challenge.id } },
      data: { progress, ...(completed ? { completedAt: new Date() } : {}) },
    }),
  ];

  if (completed && challenge.pointsReward > 0) {
    operations.push(
      prisma.user.update({
        where: { id: userId },
        data: { gamificationPoints: { increment: challenge.pointsReward } },
      })
    );
  }

  await prisma.$transaction(operations);
}

// GROUP challenges: each member's progress is their contribution, and the
// group's progress is the sum of every member's contribution. When the sum
// reaches the target, every member completes it and earns the reward.
async function applyGroupProgress(userId, challenge, progress) {
  await prisma.$transaction(async tx => {
    await tx.userChallenge.update({
      where: { userId_challengeId: { userId, challengeId: challenge.id } },
      data: { progress },
    });

    const total = await groupProgress(challenge.id, tx);
    if (total < challenge.targetValue) return;

    const unfinished = await tx.userChallenge.findMany({
      where: { challengeId: challenge.id, completedAt: null },
      select: { userId: true },
    });
    if (unfinished.length === 0) return;

    await tx.userChallenge.updateMany({
      where: { challengeId: challenge.id, completedAt: null },
      data: { completedAt: new Date() },
    });

    if (challenge.pointsReward > 0) {
      await tx.user.updateMany({
        where: { id: { in: unfinished.map(member => member.userId) } },
        data: { gamificationPoints: { increment: challenge.pointsReward } },
      });
    }
  });
}

async function groupProgress(challengeId, client = prisma) {
  const result = await client.userChallenge.aggregate({
    where: { challengeId },
    _sum: { progress: true },
  });
  return result._sum.progress || 0;
}

async function updateChallenges(userId, entry) {
  const activityDate = new Date(entry.consumedAt);

  const memberships = await prisma.userChallenge.findMany({
    where: {
      userId,
      completedAt: null,
      challenge: {
        isActive: true,
        startDate: { lte: activityDate },
        endDate: { gte: activityDate },
      },
    },
    include: {
      challenge: true,
    },
  });

  for (const membership of memberships) {
    const { challenge } = membership;
    const progress = Math.min(
      await contributionAfter(userId, membership, entry),
      challenge.targetValue
    );

    if (progress === membership.progress) continue;

    if (challenge.mode === 'GROUP') {
      await applyGroupProgress(userId, challenge, progress);
    } else {
      await applyIndividualProgress(userId, challenge, progress);
    }
  }
}

// After a diary entry is edited or deleted, re-count CALORIE_GOAL challenges
// (meal-count challenges are not reduced, so earned progress is kept).
async function refreshCalorieGoalChallenges(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } });
  if (!user || user.subscriptionTier !== 'PREMIUM') return;

  const now = new Date();
  const memberships = await prisma.userChallenge.findMany({
    where: {
      userId,
      completedAt: null,
      challenge: { type: 'CALORIE_GOAL', isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    },
    include: { challenge: true },
  });

  for (const membership of memberships) {
    const { challenge } = membership;
    const progress = Math.min(await contributionAfter(userId, membership, {}), challenge.targetValue);
    if (progress === membership.progress) continue;
    if (challenge.mode === 'GROUP') await applyGroupProgress(userId, challenge, progress);
    else await applyIndividualProgress(userId, challenge, progress);
  }
}

async function recordMealLogged(userId, entry) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
    },
  });

  // FR-23 is a Premium feature.
  if (!user || user.subscriptionTier !== 'PREMIUM') {
    return;
  }

  await updateStreak(userId, entry.consumedAt);
  await updateChallenges(userId, entry);
}

module.exports = {
  BADGES,
  awardBadge,
  updateStreak,
  updateChallenges,
  recordMealLogged,
  groupProgress,
  countOnTargetDays,
  refreshCalorieGoalChallenges,
};