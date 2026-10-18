const { Router } = require('express');
const { query } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const { requireTier } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const { ok } = require('../../utils/respond');
const { MEAL_TYPES } = require('./constants');
const service = require('./aiMeals.service');

const router = Router();
router.use(requireAuth, requireTier('PREMIUM'));

/**
 * @openapi
 * /api/recommendations:
 *   get:
 *     tags: [Recommendations]
 *     summary: Premium meal suggestions from the nutritionist-approved AI catalog
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: mealType
 *         required: true
 *         schema: { type: string, enum: [BREAKFAST, LUNCH, DINNER, SNACK] }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Approved meal matches and daily calorie summary }
 *       403: { description: Premium access required }
 */
router.get('/', [query('mealType').isIn(MEAL_TYPES), query('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/).custom(value => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()))], validate,
  asyncHandler(async (req, res) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    ok(res, await service.recommendations(req.user.id, req.query.mealType, date));
  }));

module.exports = router;
