const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { MEAL_TYPES, DIETARY_PREFERENCES, INGREDIENT_TAGS } = require('./constants');

const MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
let workerRunning = false;

function normalizeTags(value, allowed) {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) return null;
  const tags = [...new Set(value.map(item => item.trim().toUpperCase()))];
  return tags.every(tag => allowed.includes(tag)) ? tags : null;
}

function validText(value, max = 2000) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function validateGenerated(payload, expectedCount) {
  if (!payload || !Array.isArray(payload.meals) || payload.meals.length !== expectedCount) {
    throw new Error('Model returned the wrong number of meals');
  }
  return payload.meals.map(item => {
    const dietaryTags = normalizeTags(item.dietaryTags, DIETARY_PREFERENCES.slice(1));
    const ingredientTags = normalizeTags(item.ingredientTags, INGREDIENT_TAGS);
    if (!validText(item.title, 120) || !validText(item.ingredients) || !validText(item.instructions) ||
        !MEAL_TYPES.includes(item.mealType) || !dietaryTags || !ingredientTags) {
      throw new Error('Model returned an invalid meal');
    }
    return {
      title: item.title.trim(), ingredients: item.ingredients.trim(), instructions: item.instructions.trim(),
      mealType: item.mealType, dietaryTags, ingredientTags,
    };
  });
}

async function generateWithOllama(count) {
  const format = {
    type: 'object', required: ['meals'], additionalProperties: false,
    properties: { meals: {
      type: 'array', minItems: count, maxItems: count,
      items: { type: 'object', additionalProperties: false,
        required: ['title', 'ingredients', 'instructions', 'mealType', 'dietaryTags', 'ingredientTags'],
        properties: {
          title: { type: 'string' }, ingredients: { type: 'string' }, instructions: { type: 'string' },
          mealType: { type: 'string', enum: MEAL_TYPES },
          dietaryTags: { type: 'array', items: { type: 'string', enum: DIETARY_PREFERENCES.slice(1) } },
          ingredientTags: { type: 'array', items: { type: 'string', enum: INGREDIENT_TAGS } },
        },
      },
    } },
  };
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST', signal: AbortSignal.timeout(180000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, stream: false, format, options: { temperature: 0 }, messages: [
      { role: 'system', content: 'Suggest ordinary meal recipes for general wellness only. No medical claims. Do not provide calorie or nutrient estimates. Ingredient and dietary tags are suggestions for a nutritionist to verify.' },
      { role: 'user', content: `Generate exactly ${count} distinct meal recipes as JSON matching the provided schema. Ingredients and instructions should be clear and practical. Include all relevant ingredient tags from the allowed list.` },
    ] }),
  });
  if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
  const result = await response.json();
  let parsed;
  try { parsed = JSON.parse(result.message?.content || ''); } catch { throw new Error('Model returned invalid JSON'); }
  return validateGenerated(parsed, count);
}

async function runNextJob() {
  if (workerRunning) return;
  workerRunning = true;
  try {
    while (true) {
      const pending = await prisma.aiGenerationJob.findFirst({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } });
      if (!pending) break;
      await prisma.aiGenerationJob.update({ where: { id: pending.id }, data: { status: 'RUNNING', startedAt: new Date() } });
      try {
        const meals = await generateWithOllama(pending.count);
        await prisma.$transaction(async tx => {
          await tx.aiMeal.createMany({ data: meals.map(meal => ({ ...meal, jobId: pending.id })) });
          await tx.aiGenerationJob.update({ where: { id: pending.id }, data: { status: 'SUCCEEDED', finishedAt: new Date() } });
        });
      } catch (error) {
        await prisma.aiGenerationJob.update({ where: { id: pending.id }, data: {
          status: 'FAILED', error: String(error.message || error).slice(0, 500), finishedAt: new Date(),
        } });
      }
    }
  } finally { workerRunning = false; }
}

async function createJob(userId, count) {
  const job = await prisma.aiGenerationJob.create({ data: { createdById: userId, count, modelName: MODEL } });
  setImmediate(() => runNextJob().catch(error => console.error('[ai-meals] Worker failed:', error)));
  return job;
}

async function recoverJobs() {
  await prisma.aiGenerationJob.updateMany({ where: { status: { in: ['PENDING', 'RUNNING'] } }, data: {
    status: 'FAILED', error: 'Server restarted before generation finished; start a new job.', finishedAt: new Date(),
  } });
}

async function getMeal(id) {
  const meal = await prisma.aiMeal.findUnique({ where: { id } });
  if (!meal) throw new AppError(404, 'AI meal not found');
  return meal;
}

async function updateMeal(id, body) {
  const existing = await getMeal(id);
  const fields = ['title', 'ingredients', 'instructions', 'mealType', 'serving', 'calories', 'protein', 'carbs', 'fat', 'nutritionSource', 'reviewNotes'];
  const data = Object.fromEntries(fields.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
  if (body.dietaryTags !== undefined) data.dietaryTags = body.dietaryTags;
  if (body.ingredientTags !== undefined) data.ingredientTags = body.ingredientTags;
  if (Object.keys(data).length === 0) throw new AppError(400, 'No meal changes provided');
  if (existing.status !== 'PENDING') Object.assign(data, { status: 'PENDING', reviewedById: null, reviewedAt: null });
  return prisma.aiMeal.update({ where: { id }, data });
}

async function approveMeal(id, reviewerId) {
  const meal = await getMeal(id);
  if (meal.status !== 'PENDING') throw new AppError(409, 'Only pending meals can be approved');
  if (!validText(meal.serving, 120) || !validText(meal.nutritionSource, 500) ||
      [meal.calories, meal.protein, meal.carbs, meal.fat].some(value => !Number.isInteger(value) || value < 0) ||
      meal.calories < 50 || meal.calories > 2000) {
    throw new AppError(400, 'Verify serving, nutrition source, calories and macros before approval');
  }
  return prisma.aiMeal.update({ where: { id }, data: { status: 'APPROVED', reviewedById: reviewerId, reviewedAt: new Date() } });
}

async function rejectMeal(id, reviewerId, notes) {
  const meal = await getMeal(id);
  if (meal.status !== 'PENDING') throw new AppError(409, 'Only pending meals can be rejected');
  return prisma.aiMeal.update({ where: { id }, data: { status: 'REJECTED', reviewNotes: notes, reviewedById: reviewerId, reviewedAt: new Date() } });
}

async function recommendations(userId, mealType, date) {
  const [user, goal, meals] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.calorieGoal.findUnique({ where: { userId } }),
    prisma.aiMeal.findMany({ where: { status: 'APPROVED', mealType } }),
  ]);
  if (!goal) throw new AppError(409, 'Set a daily calorie goal first', 'NO_GOAL_SET');
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 86400000);
  const entries = await prisma.calorieIntake.findMany({ where: { userId, consumedAt: { gte: start, lt: end } } });
  const consumedCalories = entries.reduce((sum, entry) => sum + entry.calories, 0);
  const fraction = { BREAKFAST: .25, LUNCH: .35, DINNER: .30, SNACK: .10 }[mealType];
  const target = Math.round(goal.targetCalories * fraction);
  const excluded = new Set(user.excludedIngredients);
  const eligible = meals.filter(meal =>
    (user.dietaryPreference === 'ANY' || meal.dietaryTags.includes(user.dietaryPreference) ||
      (user.dietaryPreference === 'VEGETARIAN' && meal.dietaryTags.includes('VEGAN'))) &&
    !meal.ingredientTags.some(tag => excluded.has(tag))
  );
  eligible.sort((a, b) => Math.abs(a.calories - target) - Math.abs(b.calories - target) || a.title.localeCompare(b.title));
  const publicMeals = eligible.slice(0, 5).map(meal => ({
    id: meal.id, title: meal.title, ingredients: meal.ingredients,
    instructions: meal.instructions, mealType: meal.mealType,
    dietaryTags: meal.dietaryTags, ingredientTags: meal.ingredientTags,
    serving: meal.serving, calories: meal.calories, protein: meal.protein,
    carbs: meal.carbs, fat: meal.fat, nutritionSource: meal.nutritionSource,
    reviewedAt: meal.reviewedAt,
  }));
  return { date, mealType, targetCalories: goal.targetCalories, consumedCalories,
    remainingCalories: goal.targetCalories - consumedCalories, meals: publicMeals };
}

module.exports = { createJob, recoverJobs, getMeal, updateMeal, approveMeal, rejectMeal, recommendations, validateGenerated, generateWithOllama };
