const { Router } = require('express');
const requireAuth = require('../../middleware/requireAuth');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./subscriptions.controller');

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/subscriptions/me:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get the logged-in user's latest subscription
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current tier and latest subscription record }
 */
router.get('/me', asyncHandler(controller.getMine));

/**
 * @openapi
 * /api/subscriptions/upgrade:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Activate a 30-day Premium subscription (FYP demo flow; no payment provider)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Premium activated }
 *       409: { description: Premium is already active }
 */
router.post('/upgrade', asyncHandler(controller.upgrade));

/**
 * @openapi
 * /api/subscriptions/cancel:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Cancel Premium immediately and return the user to Free
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Premium cancelled }
 *       404: { description: No active subscription }
 */
router.post('/cancel', asyncHandler(controller.cancel));

/**
 * @openapi
 * /api/subscriptions/renew:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Reactivate or extend Premium by 30 days (FYP demo flow; no payment provider)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Premium renewed }
 *       201: { description: Premium activated when no previous subscription exists }
 */
router.post('/renew', asyncHandler(controller.renew));

module.exports = router;
