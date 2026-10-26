const { randomUUID } = require('crypto');
const prisma = require('../../config/db');

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
    let increment = 0;

    switch (membership.challenge.type) {
      case 'MEAL_LOGGING':
        increment = 1;
        break;

      case 'BREAKFAST_LOGGING':
        if (entry.mealType === 'BREAKFAST') {
          increment = 1;
        }
        break;

      // CALORIE_GOAL will be handled separately when
      // daily goal progress is implemented.
      case 'CALORIE_GOAL':
      default:
        increment = 0;
        break;
    }

    if (increment === 0) continue;

    const newProgress = Math.min(
      membership.progress + increment,
      membership.challenge.targetValue
    );

    const justCompleted =
      membership.progress < membership.challenge.targetValue &&
      newProgress >= membership.challenge.targetValue;

    const operations = [
      prisma.userChallenge.update({
        where: {
          userId_challengeId: {
            userId,
            challengeId: membership.challengeId,
          },
        },
        data: {
          progress: newProgress,
          ...(justCompleted
            ? { completedAt: new Date() }
            : {}),
        },
      }),
    ];

    if (
      justCompleted &&
      membership.challenge.pointsReward > 0
    ) {
      operations.push(
        prisma.user.update({
          where: { id: userId },
          data: {
            gamificationPoints: {
              increment: membership.challenge.pointsReward,
            },
          },
        })
      );
    }

    await prisma.$transaction(operations);
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
};