const { Router } = require('express');
const { body, param, query } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./recipeModeration.controller');

const router = Router();
router.use(requireAuth);
router.use(requireRole('NUTRITIONIST', 'ADMIN'));

const ACTIONS = ['APPROVED', 'FLAGGED', 'REMOVED', 'CLEARED'];
const STATUSES = ['ACTIVE', 'FLAGGED', 'REMOVED'];
const recipeIdParam = param('recipeId').isUUID().withMessage('Invalid recipe id');

/**
 * @openapi
 * /api/recipe-moderation/queue:
 *   get:
 *     tags: [Recipe Moderation]
 *     summary: List recipes across all users for moderation (nutritionist/admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, FLAGGED, REMOVED] }
 *     responses:
 *       200: { description: Matching recipes }
 */
router.get(
  '/queue',
  [query('status').optional().isIn(STATUSES)],
  validate,
  asyncHandler(controller.queue)
);

/**
 * @openapi
 * /api/recipe-moderation/{recipeId}/history:
 *   get:
 *     tags: [Recipe Moderation]
 *     summary: Get the moderation history for a recipe (nutritionist/admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Moderation log entries, newest first }
 *       404: { description: Recipe not found }
 */
router.get(
  '/:recipeId/history',
  [recipeIdParam],
  validate,
  asyncHandler(controller.history)
);

/**
 * @openapi
 * /api/recipe-moderation/{recipeId}:
 *   post:
 *     tags: [Recipe Moderation]
 *     summary: Apply a moderation action to a recipe (nutritionist/admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [APPROVED, FLAGGED, REMOVED, CLEARED] }
 *               reason: { type: string, description: Required when action is FLAGGED or REMOVED }
 *     responses:
 *       201: { description: The created moderation log entry }
 *       400: { description: reason is required for this action }
 *       404: { description: Recipe not found }
 */
router.post(
  '/:recipeId',
  [
    recipeIdParam,
    body('action').isIn(ACTIONS).withMessage(`action must be one of ${ACTIONS.join(', ')}`),
    body('reason')
      .if(body('action').isIn(['FLAGGED', 'REMOVED']))
      .trim()
      .notEmpty()
      .withMessage('reason is required when flagging or removing a recipe'),
    body('reason').optional().isLength({ max: 1000 }),
  ],
  validate,
  asyncHandler(controller.moderate)
);

module.exports = router;
