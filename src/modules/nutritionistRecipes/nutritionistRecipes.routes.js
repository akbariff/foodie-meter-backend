const { Router } = require('express');
const { param } = require('express-validator');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const controller = require('./nutritionistRecipes.controller');

const router = Router();

/**
 * @openapi
 * /api/nutritionist-recipes:
 *   get:
 *     tags: [Nutritionist Recipes]
 *     summary: List curated recipes from the nutritionist (Nutritionist Recipe Page)
 *     responses:
 *       200: { description: Array of nutritionist recipes }
 */
router.get('/', asyncHandler(controller.list));

/**
 * @openapi
 * /api/nutritionist-recipes/{id}:
 *   get:
 *     tags: [Nutritionist Recipes]
 *     summary: Get a single nutritionist recipe
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The nutritionist recipe }
 *       404: { description: Not found }
 */
router.get('/:id', [param('id').isString()], validate, asyncHandler(controller.getById));

module.exports = router;
