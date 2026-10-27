const { Router } = require('express');
const requireAuth = require('../../middleware/requireAuth');
const asyncHandler = require('../../middleware/asyncHandler');
const { ok, created } = require('../../utils/respond');
const service = require('./subscription.service');

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/subscription:
 *   get:
 *     tags: [Subscription]
 *     summary: Get the logged-in user's current (or most recent) subscription
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: The current subscription }
 *       404: { description: No subscription found }
 */
router.get('/', asyncHandler(async (req, res) => {
  const subscription = await service.getMine(req.user.id);
  ok(res, subscription);
}));

/**
 * @openapi
 * /api/subscription/subscribe:
 *   post:
 *     tags: [Subscription]
 *     summary: Start a new Premium subscription (simulated billing, no real payment processing)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: The new subscription }
 *       409: { description: A subscription is already active }
 */
router.post('/subscribe', asyncHandler(async (req, res) => {
  const subscription = await service.subscribe(req.user.id);
  created(res, subscription);
}));

/**
 * @openapi
 * /api/subscription/cancel:
 *   post:
 *     tags: [Subscription]
 *     summary: Schedule cancellation at the end of the current billing period (Premium access stays active until expiresAt)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: The updated subscription }
 *       404: { description: No active subscription found }
 *       409: { description: Cancellation is already scheduled }
 */
router.post('/cancel', asyncHandler(async (req, res) => {
  const subscription = await service.cancel(req.user.id);
  ok(res, subscription);
}));

/**
 * @openapi
 * /api/subscription/renew:
 *   post:
 *     tags: [Subscription]
 *     summary: Undo a scheduled cancellation and keep the subscription auto-renewing
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: The updated subscription }
 *       404: { description: No scheduled cancellation to undo }
 */
router.post('/renew', asyncHandler(async (req, res) => {
  const subscription = await service.renew(req.user.id);
  ok(res, subscription);
}));

/**
 * @openapi
 * /api/subscription/history:
 *   get:
 *     tags: [Subscription]
 *     summary: List all of the logged-in user's past and current subscriptions
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Subscription history, newest first }
 */
router.get('/history', asyncHandler(async (req, res) => {
  const subscriptions = await service.history(req.user.id);
  ok(res, subscriptions);
}));

module.exports = router;
