const { Router } = require('express');
const { body } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./userProfile.controller');

const router = Router();
router.use(requireAuth);

const ACTIVITY_LEVELS = ['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE'];
const WEIGHT_GOALS = ['LOSE', 'MAINTAIN', 'GAIN'];

/**
 * @openapi
 * /api/profile:
 *   get:
 *     tags: [User Profile]
 *     summary: Get the logged-in user's health profile details
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: The current profile }
 *       404: { description: No profile details set yet }
 */
router.get('/', asyncHandler(controller.getMine));

/**
 * @openapi
 * /api/profile:
 *   put:
 *     tags: [User Profile]
 *     summary: Create or update the logged-in user's health profile details
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dateOfBirth: { type: string, format: date, example: "1998-05-20" }
 *               heightCm: { type: number, example: 170, minimum: 50, maximum: 300 }
 *               weightKg: { type: number, example: 65, minimum: 20, maximum: 400 }
 *               activityLevel: { type: string, enum: [SEDENTARY, LIGHT, MODERATE, ACTIVE, VERY_ACTIVE] }
 *               weightGoal: { type: string, enum: [LOSE, MAINTAIN, GAIN] }
 *     responses:
 *       200: { description: The saved profile }
 */
router.put(
  '/',
  [
    body('dateOfBirth').optional().isISO8601().withMessage('dateOfBirth must be a valid ISO8601 date'),
    body('heightCm').optional().isFloat({ min: 50, max: 300 }).withMessage('heightCm must be between 50 and 300'),
    body('weightKg').optional().isFloat({ min: 20, max: 400 }).withMessage('weightKg must be between 20 and 400'),
    body('activityLevel').optional().isIn(ACTIVITY_LEVELS).withMessage(`activityLevel must be one of ${ACTIVITY_LEVELS.join(', ')}`),
    body('weightGoal').optional().isIn(WEIGHT_GOALS).withMessage(`weightGoal must be one of ${WEIGHT_GOALS.join(', ')}`),
  ],
  validate,
  asyncHandler(controller.upsertMine)
);

module.exports = router;
