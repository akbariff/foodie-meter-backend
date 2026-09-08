const { Router } = require('express');
const { body } = require('express-validator');
const requireAuth = require('../../middleware/requireAuth');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./nutritionistApplications.controller');

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/nutritionist-applications:
 *   post:
 *     tags: [Nutritionist Applications]
 *     summary: Apply to become a Nutritionist (USER role only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category]
 *             properties:
 *               category: { type: string, example: Diabetic-friendly nutrition }
 *               message: { type: string }
 *     responses:
 *       201: { description: Application submitted, status PENDING }
 *       409: { description: Already a pending application, or not eligible }
 */
router.post(
  '/',
  [
    body('category').trim().notEmpty().withMessage('category is required'),
    body('message').optional().isString(),
  ],
  validate,
  asyncHandler(controller.apply)
);

/**
 * @openapi
 * /api/nutritionist-applications/mine:
 *   get:
 *     tags: [Nutritionist Applications]
 *     summary: List the logged-in user's own applications
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Array of applications }
 */
router.get('/mine', asyncHandler(controller.listMine));

module.exports = router;
