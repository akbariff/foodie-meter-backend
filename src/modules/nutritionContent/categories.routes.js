const { Router } = require('express');
const { body, param } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./categories.controller');

const router = Router();

const idParam = param('id').isUUID().withMessage('Invalid category id');
const nutritionistIdParam = param('nutritionistId').isUUID().withMessage('Invalid nutritionist id');

/**
 * @openapi
 * /api/nutrition-categories:
 *   get:
 *     tags: [Nutrition Categories]
 *     summary: List all nutrition categories
 *     responses:
 *       200: { description: All categories }
 */
router.get('/', asyncHandler(controller.list));

/**
 * @openapi
 * /api/nutrition-categories/{id}:
 *   get:
 *     tags: [Nutrition Categories]
 *     summary: Get a single nutrition category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: The category }
 *       404: { description: Not found }
 */
router.get('/:id', [idParam], validate, asyncHandler(controller.getById));

/**
 * @openapi
 * /api/nutrition-categories/{id}/nutritionists:
 *   get:
 *     tags: [Nutrition Categories]
 *     summary: List nutritionists assigned to a category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Assigned nutritionists }
 *       404: { description: Category not found }
 */
router.get('/:id/nutritionists', [idParam], validate, asyncHandler(controller.listNutritionists));

/**
 * @openapi
 * /api/nutrition-categories:
 *   post:
 *     tags: [Nutrition Categories]
 *     summary: Create a nutrition category (admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       201: { description: The created category }
 *       409: { description: A category with this name already exists }
 */
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  [
    body('name').trim().notEmpty().withMessage('name is required'),
    body('description').optional().isString(),
  ],
  validate,
  asyncHandler(controller.create)
);

/**
 * @openapi
 * /api/nutrition-categories/{id}:
 *   put:
 *     tags: [Nutrition Categories]
 *     summary: Update a nutrition category (admin only)
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
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       200: { description: The updated category }
 *       404: { description: Not found }
 */
router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  [
    idParam,
    body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
    body('description').optional().isString(),
  ],
  validate,
  asyncHandler(controller.update)
);

/**
 * @openapi
 * /api/nutrition-categories/{id}:
 *   delete:
 *     tags: [Nutrition Categories]
 *     summary: Delete a nutrition category (admin only); blocked while content is still attached
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Not found }
 *       409: { description: Category still has content attached }
 */
router.delete('/:id', requireAuth, requireRole('ADMIN'), [idParam], validate, asyncHandler(controller.remove));

/**
 * @openapi
 * /api/nutrition-categories/{id}/nutritionists/{nutritionistId}:
 *   post:
 *     tags: [Nutrition Categories]
 *     summary: Assign a nutritionist to a category (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: nutritionistId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201: { description: The assignment }
 *       400: { description: Target user is not a nutritionist }
 *       409: { description: Already assigned }
 */
router.post(
  '/:id/nutritionists/:nutritionistId',
  requireAuth,
  requireRole('ADMIN'),
  [idParam, nutritionistIdParam],
  validate,
  asyncHandler(controller.assignNutritionist)
);

/**
 * @openapi
 * /api/nutrition-categories/{id}/nutritionists/{nutritionistId}:
 *   delete:
 *     tags: [Nutrition Categories]
 *     summary: Unassign a nutritionist from a category (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: nutritionistId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Unassigned }
 *       404: { description: Not assigned }
 */
router.delete(
  '/:id/nutritionists/:nutritionistId',
  requireAuth,
  requireRole('ADMIN'),
  [idParam, nutritionistIdParam],
  validate,
  asyncHandler(controller.unassignNutritionist)
);

module.exports = router;
