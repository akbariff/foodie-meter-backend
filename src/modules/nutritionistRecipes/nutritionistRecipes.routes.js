const { Router } = require('express');
const { body, param } = require('express-validator');
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
 *     responses:
 *       200: { description: Array of nutritionist recipes }
 */
router.get('/', asyncHandler(controller.list));

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

const canCurate = [requireAuth, requireRole('NUTRITIONIST', 'ADMIN')];

/**
 * @openapi
 * /api/nutritionist-recipes:
 *   post:
 *     tags: [Nutritionist Recipes]
 *     summary: Create a curated recipe (nutritionist or admin)
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
 *     responses:
 *       201: { description: The created recipe }
 *       400: { description: Validation error }
 *       403: { description: Not a nutritionist or admin }
 */
router.post(
  '/',
  ...canCurate,
  [
    body('title').trim().notEmpty().isLength({ max: 200 }).withMessage('title is required (at most 200 characters)'),
    body('ingredients').trim().notEmpty().isLength({ max: 5000 }).withMessage('ingredients are required'),
    body('instructions').trim().notEmpty().isLength({ max: 10000 }).withMessage('instructions are required'),
  ],
  validate,
  asyncHandler(controller.create)
);

/**
 * @openapi
 * /api/nutritionist-recipes/{id}:
 *   put:
 *     tags: [Nutritionist Recipes]
 *     summary: Update a curated recipe (nutritionist or admin)
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
 *     responses:
 *       200: { description: The updated recipe }
 *       404: { description: Not found }
 */
router.put(
  '/:id',
  ...canCurate,
  [
    param('id').isString(),
    body('title').optional().trim().notEmpty().isLength({ max: 200 }).withMessage('title cannot be empty'),
    body('ingredients').optional().trim().notEmpty().isLength({ max: 5000 }).withMessage('ingredients cannot be empty'),
    body('instructions').optional().trim().notEmpty().isLength({ max: 10000 }).withMessage('instructions cannot be empty'),
  ],
  validate,
  asyncHandler(controller.update)
);

/**
 * @openapi
 * /api/nutritionist-recipes/{id}:
 *   delete:
 *     tags: [Nutritionist Recipes]
 *     summary: Delete a curated recipe (nutritionist or admin); users' copies are kept
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
router.delete('/:id', ...canCurate, [param('id').isString()], validate, asyncHandler(controller.remove));

module.exports = router;
