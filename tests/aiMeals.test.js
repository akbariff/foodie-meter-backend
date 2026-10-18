jest.mock('../src/config/db', () => ({
  user: { findUnique: jest.fn() }, calorieGoal: { findUnique: jest.fn() },
  calorieIntake: { findMany: jest.fn() }, aiMeal: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  aiGenerationJob: { updateMany: jest.fn() },
}));
jest.mock('../src/middleware/requireAuth', () => (req, res, next) => {
  if (!req.headers.authorization) return res.status(401).json({ success: false });
  req.user = { id: 'user-1', role: req.headers['x-test-role'] || 'USER', subscriptionTier: req.headers['x-test-tier'] || 'FREE' };
  next();
});

const express = require('express');
const request = require('supertest');
const prisma = require('../src/config/db');
const service = require('../src/modules/aiMeals/aiMeals.service');
const { errorHandler } = require('../src/middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/ai-meals', require('../src/modules/aiMeals/aiMeals.routes'));
app.use('/api/recommendations', require('../src/modules/aiMeals/recommendations.routes'));
app.use(errorHandler);

const candidate = {
  title: 'Vegetable rice bowl', ingredients: 'Rice, carrots', instructions: 'Cook and serve',
  mealType: 'LUNCH', dietaryTags: ['VEGAN'], ingredientTags: [],
};

beforeEach(() => jest.clearAllMocks());

test('rejects malformed model output and Ollama failures', async () => {
  expect(() => service.validateGenerated({ meals: [{ ...candidate, calories: 500 }] }, 2)).toThrow();
  expect(() => service.validateGenerated({ meals: [{ ...candidate, ingredientTags: ['UNKNOWN'] }] }, 1)).toThrow();
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
  await expect(service.generateWithOllama(1)).rejects.toThrow('Ollama returned HTTP 503');
});

test('recovers interrupted generation jobs', async () => {
  prisma.aiGenerationJob.updateMany.mockResolvedValue({ count: 1 });
  await service.recoverJobs();
  expect(prisma.aiGenerationJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { status: { in: ['PENDING', 'RUNNING'] } }, data: expect.objectContaining({ status: 'FAILED' }),
  }));
});

test('requires verified nutrition and returns edited approved meals to pending', async () => {
  prisma.aiMeal.findUnique.mockResolvedValue({ id: 'meal-1', status: 'PENDING', ...candidate, serving: null });
  await expect(service.approveMeal('meal-1', 'reviewer')).rejects.toMatchObject({ statusCode: 400 });
  prisma.aiMeal.findUnique.mockResolvedValue({ id: 'meal-1', status: 'APPROVED', ...candidate });
  prisma.aiMeal.update.mockResolvedValue({ id: 'meal-1', status: 'PENDING' });
  await service.updateMeal('meal-1', { title: 'New title' });
  expect(prisma.aiMeal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', reviewedById: null }) }));
});

test('matches only approved meals that fit profile exclusions', async () => {
  prisma.user.findUnique.mockResolvedValue({ dietaryPreference: 'VEGAN', excludedIngredients: ['PEANUTS'] });
  prisma.calorieGoal.findUnique.mockResolvedValue({ targetCalories: 2000 });
  prisma.calorieIntake.findMany.mockResolvedValue([{ calories: 300 }]);
  prisma.aiMeal.findMany.mockResolvedValue([
    { id: 'a', title: 'Safe', calories: 680, dietaryTags: ['VEGAN'], ingredientTags: [] },
    { id: 'b', title: 'Peanut meal', calories: 700, dietaryTags: ['VEGAN'], ingredientTags: ['PEANUTS'] },
    { id: 'c', title: 'Other diet', calories: 700, dietaryTags: [], ingredientTags: [] },
  ]);
  const result = await service.recommendations('user-1', 'LUNCH', '2026-10-18');
  expect(result.meals.map(meal => meal.id)).toEqual(['a']);
  expect(result.remainingCalories).toBe(1700);
  expect(prisma.aiMeal.findMany).toHaveBeenCalledWith({ where: { status: 'APPROVED', mealType: 'LUNCH' } });
});

test('enforces auth, Premium access, and nutritionist review access', async () => {
  expect((await request(app).get('/api/recommendations?mealType=LUNCH')).status).toBe(401);
  expect((await request(app).get('/api/recommendations?mealType=LUNCH').set('Authorization', 'Bearer test')).status).toBe(403);
  expect((await request(app).get('/api/ai-meals').set('Authorization', 'Bearer test')).status).toBe(403);
  prisma.aiMeal.findMany.mockResolvedValue([]);
  const result = await request(app).get('/api/ai-meals?status=PENDING').set('Authorization', 'Bearer test').set('x-test-role', 'NUTRITIONIST');
  expect(result.status).toBe(200);
});
