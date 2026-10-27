const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok, created } = require('../../utils/respond');

async function assertOwnedEntry(id, userId) {
  const entry = await prisma.weightLog.findUnique({ where: { id } });
  if (!entry || entry.userId !== userId) {
    throw new AppError(404, 'Weight log entry not found');
  }
  return entry;
}

async function create(req, res) {
  const { weightKg, loggedAt } = req.body;
  const entry = await prisma.weightLog.create({
    data: {
      userId: req.user.id,
      weightKg,
      ...(loggedAt !== undefined ? { loggedAt: new Date(loggedAt) } : {}),
    },
  });
  created(res, entry);
}

async function list(req, res) {
  const { from, to } = req.query;
  const where = { userId: req.user.id };
  if (from || to) {
    where.loggedAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const entries = await prisma.weightLog.findMany({ where, orderBy: { loggedAt: 'asc' } });
  ok(res, entries);
}

async function update(req, res) {
  await assertOwnedEntry(req.params.id, req.user.id);
  const { weightKg, loggedAt } = req.body;
  const entry = await prisma.weightLog.update({
    where: { id: req.params.id },
    data: {
      ...(weightKg !== undefined ? { weightKg } : {}),
      ...(loggedAt !== undefined ? { loggedAt: new Date(loggedAt) } : {}),
    },
  });
  ok(res, entry);
}

async function remove(req, res) {
  await assertOwnedEntry(req.params.id, req.user.id);
  await prisma.weightLog.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { create, list, update, remove };
