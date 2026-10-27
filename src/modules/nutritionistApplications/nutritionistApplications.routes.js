const { Router } = require('express');
const { body, param, query } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./nutritionistApplications.controller');

const router = Router();

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
const idParam = param('id').isUUID().withMessage('Invalid application id');

/**
 * @openapi
 * /api/nutritionist-applications:
 *   post:
 *     tags: [Nutritionist Applications]
 *     summary: Submit an application to become a nutritionist (no account required)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, qualification, specialty]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               qualification: { type: string }
 *               specialty: { type: string }
 *               experience: { type: string }
 *               supportingInfo: { type: string }
 *     responses:
 *       201: { description: The submitted application }
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('name is required'),
    body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
    body('qualification').trim().notEmpty().withMessage('qualification is required'),
    body('specialty').trim().notEmpty().withMessage('specialty is required'),
    body('experience').optional().isString(),
    body('supportingInfo').optional().isString(),
  ],
  validate,
  asyncHandler(controller.submit)
);

/**
 * @openapi
 * /api/nutritionist-applications:
 *   get:
 *     tags: [Nutritionist Applications]
 *     summary: List nutritionist applications (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED] }
 *     responses:
 *       200: { description: Matching applications }
 */
router.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  [query('status').optional().isIn(STATUSES)],
  validate,
  asyncHandler(controller.list)
);

/**
 * @openapi
 * /api/nutritionist-applications/{id}:
 *   get:
 *     tags: [Nutritionist Applications]
 *     summary: Get a single nutritionist application (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: The application }
 *       404: { description: Not found }
 */
router.get(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  [idParam],
  validate,
  asyncHandler(controller.getById)
);

/**
 * @openapi
 * /api/nutritionist-applications/{id}/approve:
 *   post:
 *     tags: [Nutritionist Applications]
 *     summary: Approve a pending application (admin only); promotes a matching existing user to NUTRITIONIST
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: The approved application, with userPromoted indicating whether a matching account was found }
 *       404: { description: Not found }
 *       409: { description: Only pending applications can be approved }
 */
router.post(
  '/:id/approve',
  requireAuth,
  requireRole('ADMIN'),
  [idParam],
  validate,
  asyncHandler(controller.approve)
);

/**
 * @openapi
 * /api/nutritionist-applications/{id}/reject:
 *   post:
 *     tags: [Nutritionist Applications]
 *     summary: Reject a pending application (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [notes]
 *             properties:
 *               notes: { type: string }
 *     responses:
 *       200: { description: The rejected application }
 *       404: { description: Not found }
 *       409: { description: Only pending applications can be rejected }
 */
router.post(
  '/:id/reject',
  requireAuth,
  requireRole('ADMIN'),
  [
    idParam,
    body('notes').trim().notEmpty().isLength({ max: 1000 }).withMessage('notes is required and must be at most 1000 characters'),
  ],
  validate,
  asyncHandler(controller.reject)
);

module.exports = router;
