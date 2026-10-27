const { Router } = require('express');
const { body, param, query } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./weightLog.controller');

const router = Router();
router.use(requireAuth);

const idParam = param('id').isUUID().withMessage('Invalid weight log id');

/**
 * @openapi
 * /api/weight-log:
 *   post:
 *     tags: [Weight Log]
 *     summary: Log a body weight entry
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [weightKg]
 *             properties:
 *               weightKg: { type: number, example: 65.5, minimum: 20, maximum: 400 }
 *               loggedAt: { type: string, format: date-time, description: Defaults to now if omitted }
 *     responses:
 *       201: { description: The created entry }
 */
router.post(
  '/',
  [
    body('weightKg').isFloat({ min: 20, max: 400 }).withMessage('weightKg must be between 20 and 400'),
    body('loggedAt').optional().isISO8601().withMessage('loggedAt must be a valid ISO8601 date-time'),
  ],
  validate,
  asyncHandler(controller.create)
);

/**
 * @openapi
 * /api/weight-log:
 *   get:
 *     tags: [Weight Log]
 *     summary: List the logged-in user's weight log entries, oldest first
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: Matching entries }
 */
router.get(
  '/',
  [
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ],
  validate,
  asyncHandler(controller.list)
);

/**
 * @openapi
 * /api/weight-log/{id}:
 *   put:
 *     tags: [Weight Log]
 *     summary: Update a weight log entry
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weightKg: { type: number, minimum: 20, maximum: 400 }
 *               loggedAt: { type: string, format: date-time }
 *     responses:
 *       200: { description: The updated entry }
 *       404: { description: Not found }
 */
router.put(
  '/:id',
  [
    idParam,
    body('weightKg').optional().isFloat({ min: 20, max: 400 }).withMessage('weightKg must be between 20 and 400'),
    body('loggedAt').optional().isISO8601().withMessage('loggedAt must be a valid ISO8601 date-time'),
  ],
  validate,
  asyncHandler(controller.update)
);

/**
 * @openapi
 * /api/weight-log/{id}:
 *   delete:
 *     tags: [Weight Log]
 *     summary: Delete a weight log entry
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete('/:id', [idParam], validate, asyncHandler(controller.remove));

module.exports = router;
