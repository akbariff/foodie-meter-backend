const { Router } = require('express');
const { body, param } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./recipeReviews.controller');

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/recipes/{recipeId}/reviews:
 *   get:
 *     tags: [Recipe Reviews]
 *     summary: List reviews for a recipe
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Reviews for the recipe }
 *       404: { description: Recipe not found }
 */
router.get(
  '/:recipeId/reviews',
  [param('recipeId').isString()],
  validate,
  asyncHandler(controller.list)
);

/**
 * @openapi
 * /api/recipes/{recipeId}/reviews:
 *   post:
 *     tags: [Recipe Reviews]
 *     summary: Create the logged-in user's review for a recipe
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating, comment]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string }
 *     responses:
 *       201: { description: Review created }
 *       409: { description: User has already reviewed the recipe }
 */
router.post(
  '/:recipeId/reviews',
  [
    param('recipeId').isString(),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be an integer between 1 and 5'),
    body('comment').trim().notEmpty().withMessage('comment is required').isLength({ max: 2000 }),
  ],
  validate,
  asyncHandler(controller.create)
);

/**
 * @openapi
 * /api/recipes/{recipeId}/reviews/{reviewId}:
 *   put:
 *     tags: [Recipe Reviews]
 *     summary: Update the logged-in user's review
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  '/:recipeId/reviews/:reviewId',
  [
    param('recipeId').isString(),
    param('reviewId').isString(),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('comment').optional().trim().notEmpty().isLength({ max: 2000 }),
  ],
  validate,
  asyncHandler(controller.update)
);

/**
 * @openapi
 * /api/recipes/{recipeId}/reviews/{reviewId}:
 *   delete:
 *     tags: [Recipe Reviews]
 *     summary: Delete the logged-in user's review
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  '/:recipeId/reviews/:reviewId',
  [param('recipeId').isString(), param('reviewId').isString()],
  validate,
  asyncHandler(controller.remove)
);

module.exports = router;
