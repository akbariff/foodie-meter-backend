const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok, created } = require('../../utils/respond');
const { BADGES } = require('./gamification.service');

function badgeView(badge) {
  const definition = BADGES[badge.code];

  return {
    code: badge.code,
    title: definition?.title || badge.code,
    description:
      definition?.description || 'Achievement earned.',
    earnedAt: badge.earnedAt,
  };
}

async function getMe(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      gamificationPoints: true,
      leaderboardOptIn: true,
      shareProgressOptIn: true,

      userStreak: true,

      userBadges: {
        orderBy: {
          earnedAt: 'desc',
        },
      },

      userChallenges: {
        include: {
          challenge: true,
        },
        orderBy: {
          joinedAt: 'desc',
        },
      },

      _count: {
        select: {
          following: true,
          followers: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  ok(res, {
    ...user,
    userBadges: user.userBadges.map(badgeView),
  });
}

async function listBadges(req, res) {
  const earned = await prisma.userBadge.findMany({
    where: {
      userId: req.user.id,
    },
    orderBy: {
      earnedAt: 'desc',
    },
  });

  const earnedMap = new Map(
    earned.map(badge => [badge.code, badge])
  );

  const badges = Object.values(BADGES).map(definition => {
    const userBadge = earnedMap.get(definition.code);

    return {
      ...definition,
      earned: Boolean(userBadge),
      earnedAt: userBadge?.earnedAt || null,
    };
  });

  // Preserve any older badge codes already in the database.
  for (const badge of earned) {
    if (!BADGES[badge.code]) {
      badges.push({
        code: badge.code,
        title: badge.code,
        description: 'Achievement earned.',
        earned: true,
        earnedAt: badge.earnedAt,
      });
    }
  }

  ok(res, badges);
}

async function listChallenges(req, res) {
  const now = new Date();

  const challenges = await prisma.challenge.findMany({
    where: {
      isActive: true,
      startDate: {
        lte: now,
      },
      endDate: {
        gte: now,
      },
    },
    include: {
      participants: {
        where: {
          userId: req.user.id,
        },
      },
    },
    orderBy: {
      endDate: 'asc',
    },
  });

  ok(
    res,
    challenges.map(challenge => {
      const membership = challenge.participants[0];

      return {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        type: challenge.type,
        mode: challenge.mode,
        targetValue: challenge.targetValue,
        pointsReward: challenge.pointsReward,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
        joined: Boolean(membership),
        progress: membership?.progress || 0,
        completedAt: membership?.completedAt || null,
      };
    })
  );
}

async function joinChallenge(req, res) {
  const now = new Date();

  const challenge = await prisma.challenge.findUnique({
    where: {
      id: req.params.id,
    },
  });

  if (!challenge) {
    throw new AppError(404, 'Challenge not found');
  }

  if (
    !challenge.isActive ||
    challenge.startDate > now ||
    challenge.endDate < now
  ) {
    throw new AppError(
      400,
      'This challenge is not currently active'
    );
  }

  const existing = await prisma.userChallenge.findUnique({
    where: {
      userId_challengeId: {
        userId: req.user.id,
        challengeId: challenge.id,
      },
    },
    include: {
      challenge: true,
    },
  });

  if (existing) {
    return ok(res, existing);
  }

  const membership = await prisma.userChallenge.create({
    data: {
      userId: req.user.id,
      challengeId: challenge.id,
    },
    include: {
      challenge: true,
    },
  });

  created(res, membership);
}

async function leaderboard(req, res) {
  const entries = await prisma.user.findMany({
    where: {
      leaderboardOptIn: true,
      subscriptionTier: 'PREMIUM',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      gamificationPoints: true,
    },
    orderBy: [
      {
        gamificationPoints: 'desc',
      },
      {
        createdAt: 'asc',
      },
    ],
    take: 50,
  });

  let previousPoints = null;
  let previousRank = 0;

  const rankedEntries = entries.map((entry, index) => {
    const rank =
      entry.gamificationPoints === previousPoints
        ? previousRank
        : index + 1;

    previousPoints = entry.gamificationPoints;
    previousRank = rank;

    return {
      rank,
      ...entry,
    };
  });

  const me = await prisma.user.findUnique({
    where: {
      id: req.user.id,
    },
    select: {
      leaderboardOptIn: true,
      gamificationPoints: true,
    },
  });

  let currentUserRank = null;

  if (me?.leaderboardOptIn) {
    const usersAhead = await prisma.user.count({
      where: {
        leaderboardOptIn: true,
        subscriptionTier: 'PREMIUM',
        status: 'ACTIVE',
        gamificationPoints: {
          gt: me.gamificationPoints,
        },
      },
    });

    currentUserRank = usersAhead + 1;
  }

  ok(res, {
    currentUserRank,
    entries: rankedEntries,
  });
}

async function listFollowing(req, res) {
  const follows = await prisma.userFollow.findMany({
    where: {
      followerId: req.user.id,
    },
    include: {
      following: {
        select: {
          id: true,
          name: true,
          shareProgressOptIn: true,
          gamificationPoints: true,
          userStreak: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  ok(
    res,
    follows.map(item => ({
      id: item.following.id,
      name: item.following.name,
      followedAt: item.createdAt,

      progress: item.following.shareProgressOptIn
        ? {
            gamificationPoints:
              item.following.gamificationPoints,
            currentStreak:
              item.following.userStreak?.currentStreak || 0,
            longestStreak:
              item.following.userStreak?.longestStreak || 0,
          }
        : null,
    }))
  );
}

async function followUser(req, res) {
  const targetId = req.params.userId;

  if (targetId === req.user.id) {
    throw new AppError(
      400,
      'You cannot follow yourself'
    );
  }

  const target = await prisma.user.findUnique({
    where: {
      id: targetId,
    },
    select: {
      id: true,
      name: true,
      status: true,
      subscriptionTier: true,
    },
  });

  if (!target || target.status !== 'ACTIVE') {
    throw new AppError(404, 'User not found');
  }

  if (target.subscriptionTier !== 'PREMIUM') {
    throw new AppError(
      400,
      'You can only follow Premium community members'
    );
  }

  const existing = await prisma.userFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId: req.user.id,
        followingId: targetId,
      },
    },
  });

  if (existing) {
    return ok(res, existing);
  }

  const follow = await prisma.userFollow.create({
    data: {
      followerId: req.user.id,
      followingId: targetId,
    },
  });

  created(res, follow);
}

async function unfollowUser(req, res) {
  await prisma.userFollow.deleteMany({
    where: {
      followerId: req.user.id,
      followingId: req.params.userId,
    },
  });

  res.status(204).send();
}

async function updateSettings(req, res) {
  const {
    leaderboardOptIn,
    shareProgressOptIn,
  } = req.body;

  if (
    leaderboardOptIn === undefined &&
    shareProgressOptIn === undefined
  ) {
    throw new AppError(
      400,
      'At least one gamification setting is required'
    );
  }

  const user = await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      ...(leaderboardOptIn !== undefined
        ? { leaderboardOptIn }
        : {}),

      ...(shareProgressOptIn !== undefined
        ? { shareProgressOptIn }
        : {}),
    },
    select: {
      leaderboardOptIn: true,
      shareProgressOptIn: true,
    },
  });

  ok(res, user);
}

module.exports = {
  getMe,
  listBadges,
  listChallenges,
  joinChallenge,
  leaderboard,
  listFollowing,
  followUser,
  unfollowUser,
  updateSettings,
};