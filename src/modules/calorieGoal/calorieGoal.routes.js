const { Router } = require('express');
const { body } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./calorieGoal.controller');

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/calorie-goal:
 *   get:
 *     tags: [Calorie Goal]
 *     summary: Get the logged-in user's current daily calorie goal
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: The current goal }
 *       404: { description: No goal set yet }
 */
router.get('/', asyncHandler(controller.getMine));

/**
 * @openapi
 * /api/calorie-goal:
 *   put:
 *     tags: [Calorie Goal]
 *     summary: Create or update the logged-in user's daily calorie goal
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetCalories]
 *             properties:
 *               targetCalories: { type: integer, example: 2000, minimum: 800, maximum: 10000 }
 *     responses:
 *       200: { description: The saved goal }
 */
router.put(
  '/',
  [
    body('targetCalories')
      .isInt({ min: 800, max: 10000 })
      .withMessage('targetCalories must be an integer between 800 and 10000'),
  ],
  validate,
  asyncHandler(controller.upsertMine)
);

module.exports = router;
