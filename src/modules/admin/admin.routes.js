const { Router } = require('express');
const { body, param, query } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./admin.controller');

const router = Router();
router.use(requireAuth);
router.use(requireRole('ADMIN'));

const ROLES = ['USER', 'NUTRITIONIST', 'ADMIN'];
const STATUSES = ['ACTIVE', 'SUSPENDED'];

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List and search users (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [USER, NUTRITIONIST, ADMIN] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, SUSPENDED] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Case-insensitive substring match on name or email
 *     responses:
 *       200: { description: Matching users }
 */
router.get(
  '/users',
  [
    query('role').optional().isIn(ROLES),
    query('status').optional().isIn(STATUSES),
    query('search').optional().isString().trim(),
  ],
  validate,
  asyncHandler(controller.listUsers)
);

/**
 * @openapi
 * /api/admin/users/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Suspend or reactivate a user (admin only, cannot target your own account)
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [ACTIVE, SUSPENDED] }
 *     responses:
 *       200: { description: Updated user }
 *       403: { description: Cannot modify your own account }
 *       404: { description: User not found }
 */
router.patch(
  '/users/:id/status',
  [
    param('id').isUUID().withMessage('Invalid user id'),
    body('status').isIn(STATUSES).withMessage(`status must be one of ${STATUSES.join(', ')}`),
  ],
  validate,
  asyncHandler(controller.updateStatus)
);

/**
 * @openapi
 * /api/admin/users/{id}/role:
 *   patch:
 *     tags: [Admin]
 *     summary: Change a user's role (admin only, cannot target your own account)
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
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [USER, NUTRITIONIST, ADMIN] }
 *     responses:
 *       200: { description: Updated user }
 *       403: { description: Cannot modify your own account }
 *       404: { description: User not found }
 */
router.patch(
  '/users/:id/role',
  [
    param('id').isUUID().withMessage('Invalid user id'),
    body('role').isIn(ROLES).withMessage(`role must be one of ${ROLES.join(', ')}`),
  ],
  validate,
  asyncHandler(controller.updateRole)
);

module.exports = router;
