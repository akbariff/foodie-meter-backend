const { Router } = require('express');
const { body, param, query } = require('express-validator');
const prisma = require('../../config/db');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole, requireTier } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const AppError = require('../../middleware/AppError');
const { ok } = require('../../utils/respond');
const service = require('./aiMeals.service');
const { MEAL_TYPES, DIETARY_PREFERENCES, INGREDIENT_TAGS } = require('./constants');

const router = Router();
router.use(requireAuth, requireRole('NUTRITIONIST', 'ADMIN'));
const idRule = param('id').isUUID();
const tagRule = (field, allowed) => body(field).optional().isArray({ max: 20 }).custom(items =>
  items.every(item => typeof item === 'string' && allowed.includes(item))
);

/**
 * @openapi
 * /api/ai-meals/jobs:
 *   post:
 *     tags: [AI Meals]
 *     summary: Start a local Ollama generation job (Nutritionist/Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               count: { type: integer, minimum: 1, maximum: 3 }
 *     responses:
 *       202: { description: Job accepted }
 */
router.post('/jobs', [body('count').isInt({ min: 1, max: 3 })], validate, asyncHandler(async (req, res) => {
  const job = await service.createJob(req.user.id, req.body.count);
  ok(res, job, 'Generation started', 202);
}));

/**
 * @openapi
 * /api/ai-meals/jobs/{id}:
 *   get:
 *     tags: [AI Meals]
 *     summary: Get generation job status
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Job status and generated meals }
 */
router.get('/jobs/:id', [idRule], validate, asyncHandler(async (req, res) => {
  const job = await prisma.aiGenerationJob.findUnique({ where: { id: req.params.id }, include: { meals: true } });
  if (!job) throw new AppError(404, 'Generation job not found');
  ok(res, job);
}));

/**
 * @openapi
 * /api/ai-meals:
 *   get:
 *     tags: [AI Meals]
 *     summary: List generated meals for nutritionist review
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED] }
 *     responses:
 *       200: { description: Generated meal list }
 */
router.get('/', [query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED'])], validate, asyncHandler(async (req, res) => {
  ok(res, await prisma.aiMeal.findMany({ where: req.query.status ? { status: req.query.status } : {}, orderBy: { createdAt: 'desc' } }));
}));

/**
 * @openapi
 * /api/ai-meals/{id}:
 *   patch:
 *     tags: [AI Meals]
 *     summary: Edit and verify a generated meal; editing an approved meal returns it to pending
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated meal }
 */
router.patch('/:id', [idRule,
  body('title').optional().trim().isLength({ min: 1, max: 120 }),
  body('ingredients').optional().trim().isLength({ min: 1, max: 2000 }),
  body('instructions').optional().trim().isLength({ min: 1, max: 2000 }),
  body('mealType').optional().isIn(MEAL_TYPES),
  body('serving').optional({ values: 'null' }).trim().isLength({ min: 1, max: 120 }),
  body('nutritionSource').optional({ values: 'null' }).trim().isLength({ min: 1, max: 500 }),
  body('reviewNotes').optional().isString().isLength({ max: 1000 }),
  ...['calories', 'protein', 'carbs', 'fat'].map(field => body(field).optional({ values: 'null' }).isInt({ min: 0, max: field === 'calories' ? 2000 : 500 })),
  tagRule('dietaryTags', DIETARY_PREFERENCES.slice(1)),
  tagRule('ingredientTags', INGREDIENT_TAGS),
], validate, asyncHandler(async (req, res) => ok(res, await service.updateMeal(req.params.id, req.body))));

/**
 * @openapi
 * /api/ai-meals/{id}/approve:
 *   post:
 *     tags: [AI Meals]
 *     summary: Approve a meal after checking its ingredients and nutrition data
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Approved meal }
 */
router.post('/:id/approve', [idRule, body('reviewConfirmed').custom(value => value === true)], validate,
  asyncHandler(async (req, res) => ok(res, await service.approveMeal(req.params.id, req.user.id))));

/**
 * @openapi
 * /api/ai-meals/{id}/reject:
 *   post:
 *     tags: [AI Meals]
 *     summary: Reject a pending generated meal
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Rejected meal }
 */
router.post('/:id/reject', [idRule, body('notes').trim().isLength({ min: 1, max: 1000 })], validate,
  asyncHandler(async (req, res) => ok(res, await service.rejectMeal(req.params.id, req.user.id, req.body.notes))));

module.exports = router;
