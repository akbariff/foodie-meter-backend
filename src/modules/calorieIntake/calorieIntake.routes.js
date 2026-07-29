const { Router } = require('express');
const { body, param } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./calorieIntake.controller');

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/calorie-intake:
 *   post:
 *     tags: [Calorie Intake]
 *     summary: Log a daily calorie intake entry (Save button on intake form)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, calories]
 *             properties:
 *               date: { type: string, format: date }
 *               calories: { type: integer, example: 2000 }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Entry created }
 */
router.post(
  '/',
  [
    body('date').isISO8601().withMessage('date must be a valid ISO date'),
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
 *     summary: List the logged-in user's calorie intake entries (feeds Home Page "Recorded details")
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Array of entries }
 */
router.get('/', asyncHandler(controller.list));

/**
 * @openapi
 * /api/calorie-intake/{id}:
 *   get:
 *     tags: [Calorie Intake]
 *     summary: Get a single calorie intake entry
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
 *     summary: Update a calorie intake entry
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
 *               date: { type: string, format: date }
 *               calories: { type: integer }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Updated entry }
 */
router.put(
  '/:id',
  [
    param('id').isString(),
    body('date').optional().isISO8601(),
    body('calories').optional().isInt({ min: 0 }),
    body('notes').optional().isString(),
  ],
  validate,
  asyncHandler(controller.update)
);

module.exports = router;
