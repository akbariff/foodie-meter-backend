const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');

async function assertOwnedEntry(id, userId) {
  const entry = await prisma.calorieIntake.findUnique({ where: { id } });
  if (!entry || entry.userId !== userId) {
    throw new AppError(404, 'Calorie intake entry not found');
  }
  return entry;
}

async function create(req, res) {
  const { date, calories, notes } = req.body;
  const entry = await prisma.calorieIntake.create({
    data: { userId: req.user.id, date: new Date(date), calories, notes },
  });
  res.status(201).json(entry);
}

async function list(req, res) {
  const entries = await prisma.calorieIntake.findMany({
    where: { userId: req.user.id },
    orderBy: { date: 'desc' },
  });
  res.json(entries);
}

async function getById(req, res) {
  const entry = await assertOwnedEntry(req.params.id, req.user.id);
  res.json(entry);
}

async function update(req, res) {
  await assertOwnedEntry(req.params.id, req.user.id);
  const { date, calories, notes } = req.body;
  const entry = await prisma.calorieIntake.update({
    where: { id: req.params.id },
    data: {
      ...(date !== undefined ? { date: new Date(date) } : {}),
      ...(calories !== undefined ? { calories } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });
  res.json(entry);
}

module.exports = { create, list, getById, update };
