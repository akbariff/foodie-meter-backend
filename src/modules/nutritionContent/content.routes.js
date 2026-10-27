const { Router } = require('express');
const { body, param, query } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./content.controller');

const router = Router();

const idParam = param('id').isUUID().withMessage('Invalid content id');

/**
 * @openapi
 * /api/nutrition-contents:
 *   get:
 *     tags: [Nutrition Content]
 *     summary: List nutrition content articles, optionally filtered by category
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Matching content }
 */
router.get(
  '/',
  [query('categoryId').optional().isUUID()],
  validate,
  asyncHandler(controller.list)
);

/**
 * @openapi
 * /api/nutrition-contents/{id}:
 *   get:
 *     tags: [Nutrition Content]
 *     summary: Get a single nutrition content article
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: The article }
 *       404: { description: Not found }
 */
router.get('/:id', [idParam], validate, asyncHandler(controller.getById));

/**
 * @openapi
 * /api/nutrition-contents:
 *   post:
 *     tags: [Nutrition Content]
 *     summary: Create a nutrition content article (nutritionist/admin only; nutritionists must be assigned to the category)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, title, content]
 *             properties:
 *               categoryId: { type: string, format: uuid }
 *               title: { type: string }
 *               content: { type: string }
 *     responses:
 *       201: { description: The created article }
 *       403: { description: Not assigned to this category }
 *       404: { description: Category not found }
 */
router.post(
  '/',
  requireAuth,
  requireRole('NUTRITIONIST', 'ADMIN'),
  [
    body('categoryId').isUUID().withMessage('A valid categoryId is required'),
    body('title').trim().notEmpty().withMessage('title is required'),
    body('content').trim().notEmpty().withMessage('content is required'),
  ],
  validate,
  asyncHandler(controller.create)
);

/**
 * @openapi
 * /api/nutrition-contents/{id}:
 *   put:
 *     tags: [Nutrition Content]
 *     summary: Update a nutrition content article (author or admin only)
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
 *               categoryId: { type: string, format: uuid }
 *               title: { type: string }
 *               content: { type: string }
 *     responses:
 *       200: { description: The updated article }
 *       403: { description: Not assigned to the new category }
 *       404: { description: Not found, or not the author }
 */
router.put(
  '/:id',
  requireAuth,
  requireRole('NUTRITIONIST', 'ADMIN'),
  [
    idParam,
    body('categoryId').optional().isUUID(),
    body('title').optional().trim().notEmpty().withMessage('title cannot be empty'),
    body('content').optional().trim().notEmpty().withMessage('content cannot be empty'),
  ],
  validate,
  asyncHandler(controller.update)
);

/**
 * @openapi
 * /api/nutrition-contents/{id}:
 *   delete:
 *     tags: [Nutrition Content]
 *     summary: Delete a nutrition content article (author or admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Not found, or not the author }
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole('NUTRITIONIST', 'ADMIN'),
  [idParam],
  validate,
  asyncHandler(controller.remove)
);

module.exports = router;
