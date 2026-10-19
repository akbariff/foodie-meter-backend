const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok, created } = require('../../utils/respond');

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

async function getLatest(userId) {
  return prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

async function getMine(req, res) {
  const subscription = await getLatest(req.user.id);
  ok(res, {
    subscriptionTier: req.user.subscriptionTier,
    subscription,
  });
}

async function upgrade(req, res) {
  const active = await prisma.subscription.findFirst({
    where: { userId: req.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  if (active && (!active.expiresAt || active.expiresAt > new Date())) {
    throw new AppError(409, 'Premium subscription is already active');
  }

  const now = new Date();
  const expiresAt = addDays(now, 30);

  const [, subscription] = await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user.id },
      data: { subscriptionTier: 'PREMIUM' },
    }),
    prisma.subscription.create({
      data: {
        userId: req.user.id,
        status: 'ACTIVE',
        startedAt: now,
        expiresAt,
        autoRenew: true,
      },
    }),
  ]);

  created(res, subscription, 'Premium subscription activated');
}

async function cancel(req, res) {
  const active = await prisma.subscription.findFirst({
    where: { userId: req.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  if (!active) {
    throw new AppError(404, 'No active subscription found');
  }

  const now = new Date();
  const [, subscription] = await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user.id },
      data: { subscriptionTier: 'FREE' },
    }),
    prisma.subscription.update({
      where: { id: active.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        autoRenew: false,
      },
    }),
  ]);

  ok(res, subscription, 'Premium subscription cancelled');
}

async function renew(req, res) {
  const latest = await getLatest(req.user.id);
  const now = new Date();

  if (!latest) {
    const expiresAt = addDays(now, 30);
    const [, subscription] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user.id },
        data: { subscriptionTier: 'PREMIUM' },
      }),
      prisma.subscription.create({
        data: {
          userId: req.user.id,
          status: 'ACTIVE',
          startedAt: now,
          expiresAt,
          autoRenew: true,
        },
      }),
    ]);

    return created(res, subscription, 'Premium subscription activated');
  }

  const extensionBase = latest.expiresAt && latest.expiresAt > now ? latest.expiresAt : now;
  const expiresAt = addDays(extensionBase, 30);

  const [, subscription] = await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user.id },
      data: { subscriptionTier: 'PREMIUM' },
    }),
    prisma.subscription.update({
      where: { id: latest.id },
      data: {
        status: 'ACTIVE',
        cancelledAt: null,
        autoRenew: true,
        expiresAt,
      },
    }),
  ]);

  ok(res, subscription, 'Premium subscription renewed');
}

module.exports = { getMine, upgrade, cancel, renew };
