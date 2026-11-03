const prisma = require('../../config/db');

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function round2(value) {
  return Math.round(value * 100) / 100;
}

function percent(part, total) {
  if (!total) return 0;
  return round2((part / total) * 100);
}

function monthStart(date, offset = 0) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + offset,
      1
    )
  );
}

function monthLabel(date) {
  return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

async function getSystemAnalytics() {
  const now = new Date();

  const sevenDaysAgo = new Date(
    now.getTime() - 7 * DAY_MS
  );

  const thirtyDaysAgo = new Date(
    now.getTime() - 30 * DAY_MS
  );

  const [
    users,
    calorieEvents,
    recipeEvents,
    reviewEvents,
    weightEvents,
    aiEvents,
    challengeEvents,
    followEvents,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        role: true,
        subscriptionTier: true,
        status: true,
        isVerified: true,
        createdAt: true,
      },
    }),

    prisma.calorieIntake.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        userId: true,
        createdAt: true,
      },
    }),

    prisma.recipe.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        userId: true,
        createdAt: true,
      },
    }),

    prisma.recipeReview.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        userId: true,
        createdAt: true,
      },
    }),

    prisma.weightLog.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        userId: true,
        createdAt: true,
      },
    }),

    prisma.aiGenerationJob.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdById: true,
        createdAt: true,
      },
    }),

    prisma.userChallenge.findMany({
      where: {
        joinedAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        userId: true,
        joinedAt: true,
      },
    }),

    prisma.userFollow.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        followerId: true,
        createdAt: true,
      },
    }),
  ]);

  const accounts = {
    total: users.length,

    active: users.filter(
      user => user.status === 'ACTIVE'
    ).length,

    suspended: users.filter(
      user => user.status === 'SUSPENDED'
    ).length,

    verified: users.filter(
      user => user.isVerified
    ).length,

    byRole: {
      USER: users.filter(
        user => user.role === 'USER'
      ).length,

      NUTRITIONIST: users.filter(
        user => user.role === 'NUTRITIONIST'
      ).length,

      ADMIN: users.filter(
        user => user.role === 'ADMIN'
      ).length,
    },

    byTier: {
      FREE: users.filter(
        user => user.subscriptionTier === 'FREE'
      ).length,

      PREMIUM: users.filter(
        user => user.subscriptionTier === 'PREMIUM'
      ).length,
    },
  };

  // Subscription conversion only applies to normal end users.
  const consumerUsers = users.filter(
    user => user.role === 'USER'
  );

  const premiumUsers = consumerUsers.filter(
    user => user.subscriptionTier === 'PREMIUM'
  ).length;

  const freeUsers = consumerUsers.filter(
    user => user.subscriptionTier === 'FREE'
  ).length;

  const subscription = {
    eligibleUsers: consumerUsers.length,
    freeUsers,
    premiumUsers,
    conversionRate: percent(
      premiumUsers,
      consumerUsers.length
    ),
  };

  const active30 = new Set();
  const active7 = new Set();

  function addActivity(userId, occurredAt) {
    active30.add(userId);

    if (
      new Date(occurredAt).getTime() >=
      sevenDaysAgo.getTime()
    ) {
      active7.add(userId);
    }
  }

  calorieEvents.forEach(event =>
    addActivity(event.userId, event.createdAt)
  );

  recipeEvents.forEach(event =>
    addActivity(event.userId, event.createdAt)
  );

  reviewEvents.forEach(event =>
    addActivity(event.userId, event.createdAt)
  );

  weightEvents.forEach(event =>
    addActivity(event.userId, event.createdAt)
  );

  aiEvents.forEach(event =>
    addActivity(event.createdById, event.createdAt)
  );

  challengeEvents.forEach(event =>
    addActivity(event.userId, event.joinedAt)
  );

  followEvents.forEach(event =>
    addActivity(event.followerId, event.createdAt)
  );

  // Admin accounts do not count toward normal user engagement.
  const engagementPopulation = users.filter(
    user =>
      user.role !== 'ADMIN' &&
      user.status === 'ACTIVE'
  );

  const eligibleIds = new Set(
    engagementPopulation.map(user => user.id)
  );

  const activeUsers30d = [...active30].filter(
    id => eligibleIds.has(id)
  ).length;

  const activeUsers7d = [...active7].filter(
    id => eligibleIds.has(id)
  ).length;

  /*
   * We do not currently store login/session history.
   *
   * Therefore this is deliberately called a retention proxy:
   * users registered before the 30-day window who returned
   * and performed at least one recorded activity during it.
   */
  const retentionEligibleUsers =
    engagementPopulation.filter(
      user =>
        new Date(user.createdAt).getTime() <
        thirtyDaysAgo.getTime()
    );

  const returningUsers30d =
    retentionEligibleUsers.filter(
      user => active30.has(user.id)
    ).length;

  const engagement = {
    activeUsers7d,
    activeUsers30d,

    engagementRate30d: percent(
      activeUsers30d,
      engagementPopulation.length
    ),

    returningUsers30d,

    retentionEligibleUsers:
      retentionEligibleUsers.length,

    retentionProxyRate30d: percent(
      returningUsers30d,
      retentionEligibleUsers.length
    ),
  };

  // User growth for the current month + previous five months.
  const growthUsers = users.filter(
    user => user.role !== 'ADMIN'
  );

  const growth = [];

  for (let offset = -5; offset <= 0; offset += 1) {
    const start = monthStart(now, offset);
    const end = monthStart(now, offset + 1);

    const newUsers = growthUsers.filter(user => {
      const created = new Date(user.createdAt);

      return (
        created >= start &&
        created < end
      );
    }).length;

    const cumulativeUsers = growthUsers.filter(
      user =>
        new Date(user.createdAt) < end
    ).length;

    growth.push({
      month: monthLabel(start),
      newUsers,
      cumulativeUsers,
    });
  }

  const featureUsage30d = [
    {
      key: 'FOOD_DIARY',
      label: 'Food diary entries',
      count: calorieEvents.length,
    },
    {
      key: 'RECIPES',
      label: 'Recipes created',
      count: recipeEvents.length,
    },
    {
      key: 'REVIEWS',
      label: 'Recipe reviews',
      count: reviewEvents.length,
    },
    {
      key: 'AI_MEALS',
      label: 'AI meal requests',
      count: aiEvents.length,
    },
    {
      key: 'WEIGHT_LOG',
      label: 'Weight logs',
      count: weightEvents.length,
    },
    {
      key: 'CHALLENGES',
      label: 'Challenges joined',
      count: challengeEvents.length,
    },
    {
      key: 'SOCIAL_FOLLOWS',
      label: 'Social follows',
      count: followEvents.length,
    },
  ].sort(
    (a, b) => b.count - a.count
  );

  return {
    generatedAt: now.toISOString(),
    accounts,
    subscription,
    engagement,
    growth,
    featureUsage30d,
  };
}

module.exports = {
  getSystemAnalytics,
};