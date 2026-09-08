const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok } = require('../../utils/respond');

async function list(req, res) {
  const { status } = req.query;
  const applications = await prisma.nutritionistApplication.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  ok(res, applications);
}

async function decide(req, res) {
  const { status } = req.body; // APPROVED | REJECTED
  const application = await prisma.nutritionistApplication.findUnique({ where: { id: req.params.id } });
  if (!application) {
    throw new AppError(404, 'Application not found');
  }
  if (application.status !== 'PENDING') {
    throw new AppError(409, 'This application has already been decided', 'APPLICATION_ALREADY_DECIDED');
  }

  const [, updatedApplication] = await prisma.$transaction([
    ...(status === 'APPROVED'
      ? [prisma.user.update({
          where: { id: application.userId },
          data: { role: 'NUTRITIONIST', assignedCategory: application.category },
        })]
      : [prisma.user.findUnique({ where: { id: application.userId } })]),
    prisma.nutritionistApplication.update({
      where: { id: req.params.id },
      data: { status, reviewedByUserId: req.user.id, reviewedAt: new Date() },
    }),
  ]);

  ok(res, updatedApplication);
}

module.exports = { list, decide };
