const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok } = require('../../utils/respond');

async function list(req, res) {
  const { status } = req.query;
  const reviews = await prisma.review.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  ok(res, reviews);
}

async function updateStatus(req, res) {
  const { status } = req.body;
  const review = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!review) {
    throw new AppError(404, 'Review not found');
  }
  const updated = await prisma.review.update({
    where: { id: req.params.id },
    data: { status, moderatedByUserId: req.user.id, moderatedAt: new Date() },
  });
  ok(res, updated);
}

module.exports = { list, updateStatus };
