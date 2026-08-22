const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok, created } = require('../../utils/respond');

function dayRange(dateStr) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  return { start, end };
}

async function assertOwnedEntry(id, userId) {
  const entry = await prisma.calorieIntake.findUnique({ where: { id } });
  if (!entry || entry.userId !== userId) {
    throw new AppError(404, 'Calorie intake entry not found');
  }
  return entry;
}

async function create(req, res) {
  const { consumedAt, mealType, foodName, portion, calories, notes } = req.body;
  const entry = await prisma.calorieIntake.create({
    data: { userId: req.user.id, consumedAt: new Date(consumedAt), mealType, foodName, portion, calories, notes },
  });
  created(res, entry);
}

async function list(req, res) {
  const { date } = req.query;
  const where = { userId: req.user.id };
  if (date) {
    const { start, end } = dayRange(date);
    where.consumedAt = { gte: start, lte: end };
  }

  const entries = await prisma.calorieIntake.findMany({ where, orderBy: { consumedAt: 'desc' } });
  ok(res, entries);
}

async function summary(req, res) {
  const { date } = req.query;
  const { start, end } = dayRange(date);

  const [goal, entries] = await Promise.all([
    prisma.calorieGoal.findUnique({ where: { userId: req.user.id } }),
    prisma.calorieIntake.findMany({
      where: { userId: req.user.id, consumedAt: { gte: start, lte: end } },
      orderBy: { consumedAt: 'asc' },
    }),
  ]);

  const consumedCalories = entries.reduce((sum, entry) => sum + entry.calories, 0);
  const targetCalories = goal ? goal.targetCalories : null;

  ok(res, {
    date,
    targetCalories,
    consumedCalories,
    remainingCalories: targetCalories !== null ? targetCalories - consumedCalories : null,
    entries,
  });
}

async function getById(req, res) {
  const entry = await assertOwnedEntry(req.params.id, req.user.id);
  ok(res, entry);
}

async function update(req, res) {
  await assertOwnedEntry(req.params.id, req.user.id);
  const { consumedAt, mealType, foodName, portion, calories, notes } = req.body;
  const entry = await prisma.calorieIntake.update({
    where: { id: req.params.id },
    data: {
      ...(consumedAt !== undefined ? { consumedAt: new Date(consumedAt) } : {}),
      ...(mealType !== undefined ? { mealType } : {}),
      ...(foodName !== undefined ? { foodName } : {}),
      ...(portion !== undefined ? { portion } : {}),
      ...(calories !== undefined ? { calories } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });
  ok(res, entry);
}

async function remove(req, res) {
  await assertOwnedEntry(req.params.id, req.user.id);
  await prisma.calorieIntake.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { create, list, summary, getById, update, remove };
