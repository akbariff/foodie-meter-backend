const { Router } = require('express');
const { body } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./users.controller');
const { DIETARY_PREFERENCES, INGREDIENT_TAGS } = require('../aiMeals/constants');

const router = Router();

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get the logged-in user's profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: The current user's profile, including health-profile fields }
 */
router.get('/me', requireAuth, asyncHandler(controller.getMe));

/**
 * @openapi
 * /api/users/me:
 *   put:
 *     tags: [Users]
 *     summary: Update the logged-in user's account and health profile
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               dietaryPreference: { type: string, enum: [ANY, VEGETARIAN, VEGAN] }
 *               excludedIngredients:
 *                 type: array
 *                 items: { type: string, enum: [MILK, EGGS, FISH, SHELLFISH, TREE_NUTS, PEANUTS, WHEAT, SOY, SESAME] }
 *               dateOfBirth: { type: string, format: date }
 *               heightCm: { type: number, minimum: 50, maximum: 300 }
 *               weightKg: { type: number, minimum: 20, maximum: 500 }
 *               activityLevel: { type: string, enum: [SEDENTARY, LIGHT, MODERATE, ACTIVE, VERY_ACTIVE] }
 *               weightGoal: { type: string, enum: [LOSE, MAINTAIN, GAIN] }
 *     responses:
 *       200: { description: Updated profile }
 */
router.put(
  '/me',
  requireAuth,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('dietaryPreference').optional().isIn(DIETARY_PREFERENCES),
    body('excludedIngredients')
      .optional()
      .isArray({ max: 9 })
      .custom(items => items.every(item => typeof item === 'string' && INGREDIENT_TAGS.includes(item))),
    body('dateOfBirth')
      .optional({ nullable: true })
      .isISO8601({ strict: true })
      .withMessage('dateOfBirth must be a valid ISO date'),
    body('heightCm')
      .optional({ nullable: true })
      .isFloat({ min: 50, max: 300 })
      .withMessage('heightCm must be between 50 and 300'),
    body('weightKg')
      .optional({ nullable: true })
      .isFloat({ min: 20, max: 500 })
      .withMessage('weightKg must be between 20 and 500'),
    body('activityLevel')
      .optional({ nullable: true })
      .isIn(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']),
    body('weightGoal')
      .optional({ nullable: true })
      .isIn(['LOSE', 'MAINTAIN', 'GAIN']),
  ],
  validate,
  asyncHandler(controller.updateMe)
);

module.exports = router;
