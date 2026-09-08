const { Router } = require('express');
const { body, param, query } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./nutritionistRecipes.controller');

const router = Router();

/**
 * @openapi
 * /api/nutritionist-recipes:
 *   get:
 *     tags: [Nutritionist Recipes]
 *     summary: List curated recipes from the nutritionist (Nutritionist Recipe Page)
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200: { description: Array of nutritionist recipes }
 */
router.get('/', [query('category').optional().isString()], validate, asyncHandler(controller.list));

/**
 * @openapi
 * /api/nutritionist-recipes/{id}:
 *   get:
 *     tags: [Nutritionist Recipes]
 *     summary: Get a single nutritionist recipe
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The nutritionist recipe }
 *       404: { description: Not found }
 */
router.get('/:id', [param('id').isString()], validate, asyncHandler(controller.getById));

/**
 * @openapi
 * /api/nutritionist-recipes:
 *   post:
 *     tags: [Nutritionist Recipes]
 *     summary: Publish a new curated recipe (Nutritionist, scoped to their assigned category; or Admin, any category)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, ingredients, instructions]
 *             properties:
 *               title: { type: string }
 *               ingredients: { type: string }
 *               instructions: { type: string }
 *               category: { type: string }
 *               tags: { type: string, example: "low-cal,high-iron,allergen-safe" }
 *     responses:
 *       201: { description: Recipe created }
 *       403: { description: No assigned category, or category mismatch }
 */
router.post(
  '/',
  requireAuth,
  requireRole('NUTRITIONIST', 'ADMIN'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('ingredients').trim().notEmpty().withMessage('Ingredients are required'),
    body('instructions').trim().notEmpty().withMessage('Instructions are required'),
    body('category').optional().isString(),
    body('tags').optional().isString(),
  ],
  validate,
  asyncHandler(controller.create)
);

/**
 * @openapi
 * /api/nutritionist-recipes/{id}:
 *   put:
 *     tags: [Nutritionist Recipes]
 *     summary: Update a curated recipe (Nutritionist may only edit their own; Admin may edit any)
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
 *               title: { type: string }
 *               ingredients: { type: string }
 *               instructions: { type: string }
 *               category: { type: string }
 *               tags: { type: string }
 *     responses:
 *       200: { description: Updated recipe }
 *       403: { description: Not the recipe's author }
 */
router.put(
  '/:id',
  requireAuth,
  requireRole('NUTRITIONIST', 'ADMIN'),
  [
    param('id').isString(),
    body('title').optional().trim().notEmpty(),
    body('ingredients').optional().trim().notEmpty(),
    body('instructions').optional().trim().notEmpty(),
    body('category').optional().isString(),
    body('tags').optional().isString(),
  ],
  validate,
  asyncHandler(controller.update)
);

/**
 * @openapi
 * /api/nutritionist-recipes/{id}:
 *   delete:
 *     tags: [Nutritionist Recipes]
 *     summary: Delete a curated recipe (Nutritionist may only delete their own; Admin may delete any)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       403: { description: Not the recipe's author }
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole('NUTRITIONIST', 'ADMIN'),
  [param('id').isString()],
  validate,
  asyncHandler(controller.remove)
);

module.exports = router;
