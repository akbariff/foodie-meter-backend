const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok, created } = require('../../utils/respond');

async function assertCategoryExists(categoryId) {
  const category = await prisma.nutritionCategory.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new AppError(404, 'Nutrition category not found');
  }
  return category;
}

async function assertAssignedIfNutritionist(req, categoryId) {
  if (req.user.role === 'ADMIN') return;

  const assignment = await prisma.nutritionistCategory.findUnique({
    where: { nutritionistId_categoryId: { nutritionistId: req.user.id, categoryId } },
  });
  if (!assignment) {
    throw new AppError(403, 'You are not assigned to this category', 'FORBIDDEN_CATEGORY');
  }
}

async function list(req, res) {
  const { categoryId } = req.query;
  const contents = await prisma.nutritionContent.findMany({
    where: { ...(categoryId ? { categoryId } : {}) },
    orderBy: { createdAt: 'desc' },
  });
  ok(res, contents);
}

async function getById(req, res) {
  const content = await prisma.nutritionContent.findUnique({ where: { id: req.params.id } });
  if (!content) {
    throw new AppError(404, 'Nutrition content not found');
  }
  ok(res, content);
}

async function create(req, res) {
  const { categoryId, title, content: body } = req.body;
  await assertCategoryExists(categoryId);
  await assertAssignedIfNutritionist(req, categoryId);

  const created_ = await prisma.nutritionContent.create({
    data: { categoryId, authorId: req.user.id, title, content: body },
  });

  created(res, created_);
}

async function assertEditable(req) {
  const existing = await prisma.nutritionContent.findUnique({ where: { id: req.params.id } });
  if (!existing || (existing.authorId !== req.user.id && req.user.role !== 'ADMIN')) {
    throw new AppError(404, 'Nutrition content not found');
  }
  return existing;
}

async function update(req, res) {
  const existing = await assertEditable(req);
  const { categoryId, title, content: body } = req.body;

  if (categoryId !== undefined && categoryId !== existing.categoryId) {
    await assertCategoryExists(categoryId);
    await assertAssignedIfNutritionist(req, categoryId);
  }

  const updated = await prisma.nutritionContent.update({
    where: { id: existing.id },
    data: {
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(title !== undefined ? { title } : {}),
      ...(body !== undefined ? { content: body } : {}),
    },
  });

  ok(res, updated);
}

async function remove(req, res) {
  const existing = await assertEditable(req);
  await prisma.nutritionContent.delete({ where: { id: existing.id } });
  res.status(204).send();
}

module.exports = { list, getById, create, update, remove };
