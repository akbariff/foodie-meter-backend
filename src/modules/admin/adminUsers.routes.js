const { Router } = require('express');
const { body, param, query } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./adminUsers.controller');

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     tags: [Admin - Users]
 *     summary: List/filter all user accounts (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [USER, NUTRITIONIST, ADMIN] }
 *       - in: query
 *         name: subscriptionTier
 *         schema: { type: string, enum: [FREE, PREMIUM] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, SUSPENDED] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated user list }
 */
router.get(
  '/',
  [
    query('role').optional().isIn(['USER', 'NUTRITIONIST', 'ADMIN']),
    query('subscriptionTier').optional().isIn(['FREE', 'PREMIUM']),
    query('status').optional().isIn(['ACTIVE', 'SUSPENDED']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  asyncHandler(controller.list)
);

/**
 * @openapi
 * /api/admin/users/{id}:
 *   get:
 *     tags: [Admin - Users]
 *     summary: Get a single user account (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The user account }
 *       404: { description: Not found }
 */
router.get('/:id', [param('id').isString()], validate, asyncHandler(controller.getById));

/**
 * @openapi
 * /api/admin/users/{id}/status:
 *   patch:
 *     tags: [Admin - Users]
 *     summary: Suspend or reinstate a user account (Admin only; cannot suspend self)
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
 *               status: { type: string, enum: [ACTIVE, SUSPENDED] }
 *     responses:
 *       200: { description: Updated user }
 *       400: { description: Attempted to suspend own account }
 */
router.patch(
  '/:id/status',
  [param('id').isString(), body('status').isIn(['ACTIVE', 'SUSPENDED']).withMessage('status must be ACTIVE or SUSPENDED')],
  validate,
  asyncHandler(controller.updateStatus)
);

/**
 * @openapi
 * /api/admin/users/{id}/role:
 *   patch:
 *     tags: [Admin - Users]
 *     summary: Change a user's role (Admin only; cannot change own role). Used to remove a Nutritionist back to USER.
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
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [USER, NUTRITIONIST, ADMIN] }
 *               assignedCategory: { type: string, description: "Required when promoting to NUTRITIONIST" }
 *     responses:
 *       200: { description: Updated user }
 */
router.patch(
  '/:id/role',
  [
    param('id').isString(),
    body('role').isIn(['USER', 'NUTRITIONIST', 'ADMIN']).withMessage('invalid role'),
    body('assignedCategory').optional().isString(),
  ],
  validate,
  asyncHandler(controller.updateRole)
);

module.exports = router;
