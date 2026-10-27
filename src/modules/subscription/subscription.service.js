const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { PREMIUM_MONTHLY_PRICE, SUBSCRIPTION_PERIOD_DAYS } = require('./constants');

function toView(subscription) {
  if (!subscription) return null;
  return {
    ...subscription,
    price: PREMIUM_MONTHLY_PRICE,
    nextBillingDate: subscription.expiresAt,
    cancelScheduled: Boolean(subscription.cancelledAt && subscription.status === 'ACTIVE'),
  };
}

// This project has no background job runner (see aiMeals.service.js's recoverJobs, which
// only runs at server startup), so expiry is checked lazily on every subscription-module
// request rather than exactly at expiresAt. A subscription that lapsed between requests
// will show as ACTIVE until the next call into this module flips it to EXPIRED.
async function expireIfDue(userId) {
  const latest = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { startedAt: 'desc' },
  });

  if (
    latest &&
    latest.status === 'ACTIVE' &&
    !latest.autoRenew &&
    latest.expiresAt &&
    latest.expiresAt < new Date()
  ) {
    await prisma.$transaction([
      prisma.subscription.update({ where: { id: latest.id }, data: { status: 'EXPIRED' } }),
      prisma.user.update({ where: { id: userId }, data: { subscriptionTier: 'FREE' } }),
    ]);
    return { ...latest, status: 'EXPIRED' };
  }

  return latest;
}

async function getMine(userId) {
  const latest = await expireIfDue(userId);
  if (!latest) {
    throw new AppError(404, 'No subscription found', 'NO_SUBSCRIPTION');
  }
  return toView(latest);
}

async function subscribe(userId) {
  const latest = await expireIfDue(userId);
  if (latest && latest.status === 'ACTIVE') {
    throw new AppError(409, 'A subscription is already active', 'ALREADY_SUBSCRIBED');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  const [subscription] = await prisma.$transaction([
    prisma.subscription.create({
      data: { userId, status: 'ACTIVE', startedAt: now, expiresAt, autoRenew: true },
    }),
    prisma.user.update({ where: { id: userId }, data: { subscriptionTier: 'PREMIUM' } }),
  ]);

  return toView(subscription);
}

async function cancel(userId) {
  const latest = await expireIfDue(userId);
  if (!latest || latest.status !== 'ACTIVE') {
    throw new AppError(404, 'No active subscription found', 'NO_SUBSCRIPTION');
  }
  if (latest.cancelledAt) {
    throw new AppError(409, 'Cancellation is already scheduled', 'ALREADY_CANCELLED');
  }

  const subscription = await prisma.subscription.update({
    where: { id: latest.id },
    data: { autoRenew: false, cancelledAt: new Date() },
  });

  return toView(subscription);
}

async function renew(userId) {
  const latest = await expireIfDue(userId);
  if (!latest || latest.status !== 'ACTIVE' || !latest.cancelledAt) {
    throw new AppError(404, 'No scheduled cancellation to undo', 'NO_SCHEDULED_CANCELLATION');
  }

  const subscription = await prisma.subscription.update({
    where: { id: latest.id },
    data: { autoRenew: true, cancelledAt: null },
  });

  return toView(subscription);
}

async function history(userId) {
  await expireIfDue(userId);
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
  });
  return subscriptions.map(toView);
}

module.exports = { getMine, subscribe, cancel, renew, history };
