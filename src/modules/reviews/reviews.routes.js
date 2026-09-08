const { Router } = require('express');
const { body, param, query } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./reviews.controller');

const router = Router();

/**
 * @openapi
 * /api/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: Public preview of published reviews (paginated, no auth required)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated list of published reviews }
 */
router.get(
  '/',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  validate,
  asyncHandler(controller.listPublished)
);

/**
 * @openapi
 * /api/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Create a review (any authenticated role)
 *     security: [{ bearerAuth: [] }]
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
 *       201: { description: Review created, published immediately }
 */
router.post(
  '/',
  requireAuth,
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be an integer 1-5'),
    body('comment').trim().notEmpty().withMessage('comment is required'),
  ],
  validate,
  asyncHandler(controller.create)
);

/**
 * @openapi
 * /api/reviews/mine:
 *   get:
 *     tags: [Reviews]
 *     summary: List the logged-in user's own reviews (any status)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Array of the user's reviews }
 */
router.get('/mine', requireAuth, asyncHandler(controller.listMine));

/**
 * @openapi
 * /api/reviews/{id}:
 *   put:
 *     tags: [Reviews]
 *     summary: Update a review the user owns
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
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string }
 *     responses:
 *       200: { description: Updated review }
 *       404: { description: Not found }
 */
router.put(
  '/:id',
  requireAuth,
  [
    param('id').isString(),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('comment').optional().trim().notEmpty(),
  ],
  validate,
  asyncHandler(controller.update)
);

/**
 * @openapi
 * /api/reviews/{id}:
 *   delete:
 *     tags: [Reviews]
 *     summary: Delete a review (owner or Admin)
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
router.delete('/:id', requireAuth, [param('id').isString()], validate, asyncHandler(controller.remove));

module.exports = router;
