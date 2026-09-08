const { Router } = require('express');
const { body, param } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./siteContent.controller');

const router = Router();

/**
 * @openapi
 * /api/site-content:
 *   get:
 *     tags: [Site Content]
 *     summary: Get all public site content as a key/value map (no auth required — used by the marketing/landing pages)
 *     responses:
 *       200: { description: "{ key: value, ... }" }
 */
router.get('/', asyncHandler(controller.getAll));

/**
 * @openapi
 * /api/site-content/{key}:
 *   put:
 *     tags: [Site Content]
 *     summary: Create or update one site content key (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string, example: hero_heading }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value: { type: string }
 *     responses:
 *       200: { description: The saved content row }
 */
router.put(
  '/:key',
  requireAuth,
  requireRole('ADMIN'),
  [param('key').isString().notEmpty(), body('value').isString()],
  validate,
  asyncHandler(controller.upsert)
);

module.exports = router;
