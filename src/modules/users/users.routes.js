const { Router } = require('express');
const { body } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./users.controller');

const router = Router();

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get the logged-in user's profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: The current user's profile }
 */
router.get('/me', requireAuth, asyncHandler(controller.getMe));

/**
 * @openapi
 * /api/users/me:
 *   put:
 *     tags: [Users]
 *     summary: Update the logged-in user's profile (Save button on Profile Page)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *     responses:
 *       200: { description: Updated profile }
 */
router.put(
  '/me',
  requireAuth,
  [body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')],
  validate,
  asyncHandler(controller.updateMe)
);

module.exports = router;
