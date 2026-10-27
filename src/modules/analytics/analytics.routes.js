const { Router } = require('express');
const { query } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const { requireTier } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const { ok } = require('../../utils/respond');
const service = require('./analytics.service');

const router = Router();
router.use(requireAuth);
router.use(requireTier('PREMIUM'));

/**
 * @openapi
 * /api/analytics/overview:
 *   get:
 *     tags: [Analytics]
 *     summary: >
 *       Progress tracking and lightweight trend projections (Premium only).
 *       Every number here is plain arithmetic over logged calorie/weight/streak
 *       data — a same-day pace extrapolation and a straight-line weight trend,
 *       not a trained predictive model.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, minimum: 7, maximum: 90, default: 30 }
 *     responses:
 *       200: { description: Progress overview }
 *       403: { description: Requires a Premium subscription }
 */
router.get(
  '/overview',
  [query('days').optional().isInt({ min: 7, max: 90 }).withMessage('days must be between 7 and 90')],
  validate,
  asyncHandler(async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days, 10) : 30;
    const overview = await service.overview(req.user.id, days);
    ok(res, overview);
  })
);

module.exports = router;
