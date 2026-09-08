const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok, created } = require('../../utils/respond');

async function apply(req, res) {
  const { category, message } = req.body;

  if (req.user.role !== 'USER') {
    throw new AppError(409, 'Only free/premium users can apply to become a Nutritionist', 'INVALID_ROLE_FOR_APPLICATION');
  }

  const pending = await prisma.nutritionistApplication.findFirst({
    where: { userId: req.user.id, status: 'PENDING' },
  });
  if (pending) {
    throw new AppError(409, 'You already have a pending application', 'APPLICATION_ALREADY_PENDING');
  }

  const application = await prisma.nutritionistApplication.create({
    data: { userId: req.user.id, category, message },
  });
  created(res, application);
}

async function listMine(req, res) {
  const applications = await prisma.nutritionistApplication.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  });
  ok(res, applications);
}

module.exports = { apply, listMine };
