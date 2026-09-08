const { Router } = require('express');
const { body, param, query } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./adminReviews.controller');

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

/**
 * @openapi
 * /api/admin/reviews:
 *   get:
 *     tags: [Admin - Reviews]
 *     summary: List all reviews regardless of status (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PUBLISHED, REJECTED] }
 *     responses:
 *       200: { description: Array of reviews with author info }
 */
router.get('/', [query('status').optional().isIn(['PUBLISHED', 'REJECTED'])], validate, asyncHandler(controller.list));

/**
 * @openapi
 * /api/admin/reviews/{id}/status:
 *   patch:
 *     tags: [Admin - Reviews]
 *     summary: Moderate a review (publish or reject)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [PUBLISHED, REJECTED] }
 *     responses:
 *       200: { description: Updated review }
 */
router.patch(
  '/:id/status',
  [param('id').isString(), body('status').isIn(['PUBLISHED', 'REJECTED']).withMessage('status must be PUBLISHED or REJECTED')],
  validate,
  asyncHandler(controller.updateStatus)
);

module.exports = router;
