const { Router } = require('express');
const { body, param, query } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./calorieIntake.controller');

const router = Router();
router.use(requireAuth);

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

/**
 * @openapi
 * /api/calorie-intake:
 *   post:
 *     tags: [Calorie Intake]
 *     summary: Log a diary entry (Save button on intake form)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [consumedAt, mealType, foodName, calories]
 *             properties:
 *               consumedAt: { type: string, format: date-time }
 *               mealType: { type: string, enum: [BREAKFAST, LUNCH, DINNER, SNACK] }
 *               foodName: { type: string, example: Grilled chicken salad }
 *               portion: { type: string, example: 1 bowl }
 *               calories: { type: integer, example: 450 }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Entry created }
 */
router.post(
  '/',
  [
    body('consumedAt').isISO8601().withMessage('consumedAt must be a valid ISO date-time'),
    body('mealType').isIn(MEAL_TYPES).withMessage(`mealType must be one of ${MEAL_TYPES.join(', ')}`),
    body('foodName').trim().notEmpty().withMessage('foodName is required'),
    body('portion').optional().isString(),
    body('calories').isInt({ min: 0 }).withMessage('calories must be a non-negative integer'),
    body('notes').optional().isString(),
  ],
  validate,
  asyncHandler(controller.create)
);

/**
 * @openapi
 * /api/calorie-intake:
 *   get:
 *     tags: [Calorie Intake]
 *     summary: List the logged-in user's diary entries, optionally filtered by date
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: false
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Array of entries }
 */
router.get('/', [query('date').optional().isISO8601()], validate, asyncHandler(controller.list));

/**
 * @openapi
 * /api/calorie-intake/summary:
 *   get:
 *     tags: [Calorie Intake]
 *     summary: Daily summary (goal vs consumed vs remaining) for a given date
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Daily summary with entries }
 */
router.get(
  '/summary',
  [query('date').isISO8601().withMessage('date query param is required (YYYY-MM-DD)')],
  validate,
  asyncHandler(controller.summary)
);

/**
 * @openapi
 * /api/calorie-intake/{id}:
 *   get:
 *     tags: [Calorie Intake]
 *     summary: Get a single diary entry
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The entry }
 *       404: { description: Not found }
 */
router.get('/:id', [param('id').isString()], validate, asyncHandler(controller.getById));

/**
 * @openapi
 * /api/calorie-intake/{id}:
 *   put:
 *     tags: [Calorie Intake]
 *     summary: Update a diary entry
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               consumedAt: { type: string, format: date-time }
 *               mealType: { type: string, enum: [BREAKFAST, LUNCH, DINNER, SNACK] }
 *               foodName: { type: string }
 *               portion: { type: string }
 *               calories: { type: integer }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Updated entry }
 */
router.put(
  '/:id',
  [
    param('id').isString(),
    body('consumedAt').optional().isISO8601(),
    body('mealType').optional().isIn(MEAL_TYPES).withMessage(`mealType must be one of ${MEAL_TYPES.join(', ')}`),
    body('foodName').optional().trim().notEmpty(),
    body('portion').optional().isString(),
    body('calories').optional().isInt({ min: 0 }),
    body('notes').optional().isString(),
  ],
  validate,
  asyncHandler(controller.update)
);

/**
 * @openapi
 * /api/calorie-intake/{id}:
 *   delete:
 *     tags: [Calorie Intake]
 *     summary: Delete a diary entry
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete('/:id', [param('id').isString()], validate, asyncHandler(controller.remove));

module.exports = router;
