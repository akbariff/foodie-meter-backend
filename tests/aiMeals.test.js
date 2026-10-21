jest.mock('../src/config/db', () => ({
  user: { findUnique: jest.fn() }, calorieGoal: { findUnique: jest.fn() },
  calorieIntake: { findMany: jest.fn() }, aiMeal: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  aiGenerationJob: { updateMany: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
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
  mealType: 'LUNCH', dietaryTags: ['VEGAN'], ingredientTags: [], serving: '1 bowl (350 g)',
  calories: 480, protein: 18, carbs: 72, fat: 12,
};
const generatedCandidate = { ...candidate,
  ingredients: ['1 cup cooked rice', '1 carrot, diced', '1 cup spinach', '1 tbsp olive oil'],
  instructions: ['Heat the rice.', 'Cook the carrot and spinach in oil.', 'Combine and serve.'],
};

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

test('rejects malformed model output and Ollama failures', async () => {
  expect(service.validateGenerated({ meals: [generatedCandidate] }, 1)[0]).toMatchObject({ serving: '1 bowl (350 g)', calories: 480, protein: 18, dietaryTags: [], ingredientTags: [] });
  expect(() => service.validateGenerated({ meals: [{ ...generatedCandidate, ingredients: ['1 cup rice'] }] }, 1)).toThrow();
  expect(() => service.validateGenerated({ meals: [{ ...generatedCandidate, calories: null }] }, 1)).toThrow();
  expect(() => service.validateGenerated({ meals: [{ ...generatedCandidate, serving: '' }] }, 1)).toThrow();
  expect(() => service.validateGenerated({ meals: [generatedCandidate] }, 2)).toThrow();
  expect(() => service.validateGenerated({ meals: [{ ...generatedCandidate, instructions: ['Mix'] }] }, 1)).toThrow();
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
  await expect(service.generateWithOllama(1)).rejects.toThrow('Ollama returned HTTP 503');
});

test('requests complete draft nutrition data from Ollama', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { content: JSON.stringify({ meals: [generatedCandidate] }) } }) });
  await expect(service.generateWithOllama(1)).resolves.toMatchObject([{ serving: candidate.serving, calories: candidate.calories }]);
  const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(requestBody.format.properties.meals.items.required).toEqual(expect.arrayContaining(['serving', 'calories', 'protein', 'carbs', 'fat']));
  expect(requestBody.format.properties.meals.items.properties.ingredients.minItems).toBe(4);
  expect(requestBody.messages[0].content).toMatch(/unverified drafts/);
});

test('recovers interrupted generation jobs', async () => {
  prisma.aiGenerationJob.updateMany.mockResolvedValue({ count: 1 });
  await service.recoverJobs();
  expect(prisma.aiGenerationJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { status: { in: ['PENDING', 'RUNNING'] } }, data: expect.objectContaining({ status: 'FAILED' }),
  }));
});

test('requires verified nutrition and returns edited approved meals to pending', async () => {
  prisma.aiMeal.findUnique.mockResolvedValue({ id: 'meal-1', status: 'PENDING', ...candidate, nutritionSource: null });
  await expect(service.approveMeal('meal-1', 'reviewer')).rejects.toMatchObject({ statusCode: 400 });
  prisma.aiMeal.findUnique.mockResolvedValue({ id: 'meal-1', status: 'PENDING', ...candidate, nutritionSource: 'Verified recipe calculation' });
  prisma.aiMeal.update.mockResolvedValue({ id: 'meal-1', status: 'APPROVED' });
  await expect(service.approveMeal('meal-1', 'reviewer')).resolves.toMatchObject({ status: 'APPROVED' });
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
  expect((await request(app).post('/api/ai-meals/jobs').set('Authorization', 'Bearer test').send({ count: 2 })).status).toBe(403);
  expect((await request(app).get('/api/ai-meals/jobs').set('Authorization', 'Bearer test')).status).toBe(403);
  prisma.aiMeal.findMany.mockResolvedValue([]);
  const result = await request(app).get('/api/ai-meals?status=PENDING').set('Authorization', 'Bearer test').set('x-test-role', 'NUTRITIONIST');
  expect(result.status).toBe(200);
});

test('Premium users can create and inspect only their own jobs but cannot review meals', async () => {
  const id = 'c87f98ad-c7b5-4e52-87a1-ef826542e547';
  jest.spyOn(service, 'createJob').mockResolvedValue({ id, status: 'PENDING' });
  prisma.aiGenerationJob.findMany.mockResolvedValue([{ id, createdById: 'user-1', meals: [] }]);
  prisma.aiGenerationJob.findUnique.mockResolvedValue({ id, createdById: 'user-1', meals: [] });
  const premium = req => req.set('Authorization', 'Bearer test').set('x-test-tier', 'PREMIUM');
  expect((await premium(request(app).post('/api/ai-meals/jobs').send({ count: 2 }))).status).toBe(202);
  expect((await premium(request(app).get('/api/ai-meals/jobs'))).body.data).toHaveLength(1);
  expect(prisma.aiGenerationJob.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { createdById: 'user-1' } }));
  expect((await premium(request(app).get(`/api/ai-meals/jobs/${id}`))).status).toBe(200);
  prisma.aiGenerationJob.findUnique.mockResolvedValue({ id, createdById: 'someone-else', meals: [] });
  expect((await premium(request(app).get(`/api/ai-meals/jobs/${id}`))).status).toBe(403);
  expect((await premium(request(app).patch(`/api/ai-meals/${id}`).send({ title: 'Edited' }))).status).toBe(403);
  expect((await premium(request(app).post(`/api/ai-meals/${id}/approve`).send({ reviewConfirmed: true }))).status).toBe(403);
  expect((await request(app).get(`/api/ai-meals/jobs/${id}`).set('Authorization', 'Bearer test').set('x-test-role', 'NUTRITIONIST')).status).toBe(200);
});
