const { Router } = require('express');
const { body, param } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./recipeReviews.controller');

const router = Router();
router.use(requireAuth);

const recipeIdParam = param('recipeId').isUUID().withMessage('Invalid recipe id');

/**
 * @openapi
 * /api/recipe-reviews/{recipeId}:
 *   get:
 *     tags: [Recipe Reviews]
 *     summary: List all reviews for a recipe, plus the average rating
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Reviews for the recipe }
 *       404: { description: Recipe not found }
 */
router.get('/:recipeId', [recipeIdParam], validate, asyncHandler(controller.listForRecipe));

/**
 * @openapi
 * /api/recipe-reviews/{recipeId}/me:
 *   put:
 *     tags: [Recipe Reviews]
 *     summary: Create or update the logged-in user's review of a recipe
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
 *             required: [rating, comment]
 *             properties:
 *               rating: { type: integer, example: 5, minimum: 1, maximum: 5 }
 *               comment: { type: string, example: "Great recipe, easy to follow." }
 *     responses:
 *       200: { description: The saved review }
 *       404: { description: Recipe not found }
 */
router.put(
  '/:recipeId/me',
  [
    recipeIdParam,
    body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be an integer between 1 and 5'),
    body('comment').trim().notEmpty().isLength({ max: 1000 }).withMessage('comment is required and must be at most 1000 characters'),
  ],
  validate,
  asyncHandler(controller.upsertMine)
);

/**
 * @openapi
 * /api/recipe-reviews/{recipeId}/me:
 *   delete:
 *     tags: [Recipe Reviews]
 *     summary: Delete the logged-in user's review of a recipe
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Recipe not found, or no review exists to delete }
 */
router.delete('/:recipeId/me', [recipeIdParam], validate, asyncHandler(controller.removeMine));

module.exports = router;
