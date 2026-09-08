const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok, created } = require('../../utils/respond');

function parsePagination(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  return { limit, skip: (page - 1) * limit, page };
}

async function assertOwnedReview(id, userId) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review || review.userId !== userId) {
    throw new AppError(404, 'Review not found');
  }
  return review;
}

async function create(req, res) {
  const { rating, comment } = req.body;
  const review = await prisma.review.create({
    data: { userId: req.user.id, rating, comment },
  });
  created(res, review);
}

async function listPublished(req, res) {
  const { limit, skip, page } = parsePagination(req.query);
  const where = { status: 'PUBLISHED' };
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);
  ok(res, { reviews, page, limit, total });
}

async function listMine(req, res) {
  const reviews = await prisma.review.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  });
  ok(res, reviews);
}

async function update(req, res) {
  await assertOwnedReview(req.params.id, req.user.id);
  const { rating, comment } = req.body;
  const review = await prisma.review.update({
    where: { id: req.params.id },
    data: {
      ...(rating !== undefined ? { rating } : {}),
      ...(comment !== undefined ? { comment } : {}),
    },
  });
  ok(res, review);
}

async function remove(req, res) {
  const review = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!review) {
    throw new AppError(404, 'Review not found');
  }
  const isOwner = review.userId === req.user.id;
  const isAdmin = req.user.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    throw new AppError(404, 'Review not found');
  }
  await prisma.review.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { create, listPublished, listMine, update, remove };
