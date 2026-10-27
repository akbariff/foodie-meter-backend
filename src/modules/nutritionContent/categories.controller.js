const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok, created } = require('../../utils/respond');

async function assertCategoryExists(id) {
  const category = await prisma.nutritionCategory.findUnique({ where: { id } });
  if (!category) {
    throw new AppError(404, 'Nutrition category not found');
  }
  return category;
}

async function list(req, res) {
  const categories = await prisma.nutritionCategory.findMany({ orderBy: { name: 'asc' } });
  ok(res, categories);
}

async function getById(req, res) {
  const category = await assertCategoryExists(req.params.id);
  ok(res, category);
}

async function create(req, res) {
  const { name, description } = req.body;
  const category = await prisma.nutritionCategory.create({
    data: { name, ...(description !== undefined ? { description } : {}) },
  });
  created(res, category);
}

async function update(req, res) {
  await assertCategoryExists(req.params.id);
  const { name, description } = req.body;
  const category = await prisma.nutritionCategory.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  });
  ok(res, category);
}

async function remove(req, res) {
  await assertCategoryExists(req.params.id);

  const contentCount = await prisma.nutritionContent.count({ where: { categoryId: req.params.id } });
  if (contentCount > 0) {
    throw new AppError(
      409,
      'This category still has nutrition content attached; reassign or delete that content first',
      'CATEGORY_HAS_CONTENT'
    );
  }

  await prisma.nutritionCategory.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

async function assignNutritionist(req, res) {
  const { id: categoryId, nutritionistId } = req.params;
  await assertCategoryExists(categoryId);

  const nutritionist = await prisma.user.findUnique({ where: { id: nutritionistId } });
  if (!nutritionist || nutritionist.role !== 'NUTRITIONIST') {
    throw new AppError(400, 'Target user must be an existing user with role NUTRITIONIST');
  }

  const assignment = await prisma.nutritionistCategory.create({
    data: { categoryId, nutritionistId },
  });

  created(res, assignment);
}

async function unassignNutritionist(req, res) {
  const { id: categoryId, nutritionistId } = req.params;
  await assertCategoryExists(categoryId);

  const existing = await prisma.nutritionistCategory.findUnique({
    where: { nutritionistId_categoryId: { nutritionistId, categoryId } },
  });
  if (!existing) {
    throw new AppError(404, 'This nutritionist is not assigned to this category');
  }

  await prisma.nutritionistCategory.delete({
    where: { nutritionistId_categoryId: { nutritionistId, categoryId } },
  });
  res.status(204).send();
}

async function listNutritionists(req, res) {
  await assertCategoryExists(req.params.id);

  const assignments = await prisma.nutritionistCategory.findMany({
    where: { categoryId: req.params.id },
    include: { nutritionist: { select: { id: true, name: true } } },
    orderBy: { assignedAt: 'asc' },
  });

  ok(res, assignments.map(a => ({ ...a.nutritionist, assignedAt: a.assignedAt })));
}

module.exports = {
  list, getById, create, update, remove,
  assignNutritionist, unassignNutritionist, listNutritionists,
};
