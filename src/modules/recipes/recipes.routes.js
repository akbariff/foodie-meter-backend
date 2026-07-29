const { Router } = require('express');
const { body, param } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./recipes.controller');

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/recipes:
 *   post:
 *     tags: [Recipes]
 *     summary: Create a new recipe (Create Recipe Page)
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
 *       201: { description: Recipe created }
 */
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('ingredients').trim().notEmpty().withMessage('Ingredients are required'),
    body('instructions').trim().notEmpty().withMessage('Instructions are required'),
  ],
  validate,
  asyncHandler(controller.create)
);

/**
 * @openapi
 * /api/recipes:
 *   get:
 *     tags: [Recipes]
 *     summary: List the logged-in user's recipes
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Array of recipes }
 */
router.get('/', asyncHandler(controller.list));

/**
 * @openapi
 * /api/recipes/{id}:
 *   get:
 *     tags: [Recipes]
 *     summary: View a single recipe (View Recipe Page)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The recipe }
 *       404: { description: Not found }
 */
router.get('/:id', [param('id').isString()], validate, asyncHandler(controller.getById));

/**
 * @openapi
 * /api/recipes/{id}:
 *   delete:
 *     tags: [Recipes]
 *     summary: Delete a recipe (backs the delete-confirmation pop-up)
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

/**
 * @openapi
 * /api/recipes/from-nutritionist/{id}:
 *   post:
 *     tags: [Recipes]
 *     summary: Copy a nutritionist recipe into the user's own recipe list ("Add to Recipe Page" button)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: NutritionistRecipe id
 *         schema: { type: string }
 *     responses:
 *       201: { description: Recipe added to the user's list }
 *       404: { description: Nutritionist recipe not found }
 */
router.post(
  '/from-nutritionist/:id',
  [param('id').isString()],
  validate,
  asyncHandler(controller.addFromNutritionistRecipe)
);

module.exports = router;
