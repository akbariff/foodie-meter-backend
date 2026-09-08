const { Router } = require('express');
const { body, param, query } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./adminApplications.controller');

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

/**
 * @openapi
 * /api/admin/nutritionist-applications:
 *   get:
 *     tags: [Admin - Nutritionist Applications]
 *     summary: List Nutritionist applications (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED] }
 *     responses:
 *       200: { description: Array of applications with applicant info }
 */
router.get(
  '/',
  [query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED'])],
  validate,
  asyncHandler(controller.list)
);

/**
 * @openapi
 * /api/admin/nutritionist-applications/{id}:
 *   patch:
 *     tags: [Admin - Nutritionist Applications]
 *     summary: Approve or reject a Nutritionist application. Approval promotes the user to NUTRITIONIST and sets their assignedCategory.
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
 *               status: { type: string, enum: [APPROVED, REJECTED] }
 *     responses:
 *       200: { description: Decision recorded }
 *       409: { description: Application already decided }
 */
router.patch(
  '/:id',
  [param('id').isString(), body('status').isIn(['APPROVED', 'REJECTED']).withMessage('status must be APPROVED or REJECTED')],
  validate,
  asyncHandler(controller.decide)
);

module.exports = router;
