const { Router } = require('express');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/authorize');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./adminAnalytics.controller');

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

/**
 * @openapi
 * /api/admin/analytics/summary:
 *   get:
 *     tags: [Admin - Analytics]
 *     summary: System-wide usage summary (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Aggregate counts across users, recipes, diary entries, reviews, and 30-day signups }
 */
router.get('/summary', asyncHandler(controller.summary));

module.exports = router;
