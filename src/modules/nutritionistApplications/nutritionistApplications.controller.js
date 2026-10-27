const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok, created } = require('../../utils/respond');

async function submit(req, res) {
  const { name, email, qualification, specialty, experience, supportingInfo } = req.body;

  const application = await prisma.nutritionistApplication.create({
    data: {
      name,
      email,
      qualification,
      specialty,
      ...(experience !== undefined ? { experience } : {}),
      ...(supportingInfo !== undefined ? { supportingInfo } : {}),
    },
  });

  created(res, application);
}

async function list(req, res) {
  const { status } = req.query;
  const applications = await prisma.nutritionistApplication.findMany({
    where: { ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
  });
  ok(res, applications);
}

async function getById(req, res) {
  const application = await prisma.nutritionistApplication.findUnique({ where: { id: req.params.id } });
  if (!application) {
    throw new AppError(404, 'Nutritionist application not found');
  }
  ok(res, application);
}

async function approve(req, res) {
  const application = await prisma.nutritionistApplication.findUnique({ where: { id: req.params.id } });
  if (!application) {
    throw new AppError(404, 'Nutritionist application not found');
  }
  if (application.status !== 'PENDING') {
    throw new AppError(409, 'Only pending applications can be approved');
  }

  const matchingUser = await prisma.user.findUnique({ where: { email: application.email } });

  const operations = [
    prisma.nutritionistApplication.update({
      where: { id: application.id },
      data: {
        status: 'APPROVED',
        reviewedById: req.user.id,
        reviewedAt: new Date(),
      },
    }),
  ];

  // If nobody has signed up with this email yet, the application still gets marked
  // APPROVED — there is no "promote on signup" hook in this project, so a second,
  // manual promotion (via PATCH /api/admin/users/:id/role) is needed once they do.
  if (matchingUser) {
    operations.push(
      prisma.user.update({ where: { id: matchingUser.id }, data: { role: 'NUTRITIONIST' } })
    );
  }

  const [updatedApplication] = await prisma.$transaction(operations);

  ok(res, { ...updatedApplication, userPromoted: Boolean(matchingUser) });
}

async function reject(req, res) {
  const { notes } = req.body;
  const application = await prisma.nutritionistApplication.findUnique({ where: { id: req.params.id } });
  if (!application) {
    throw new AppError(404, 'Nutritionist application not found');
  }
  if (application.status !== 'PENDING') {
    throw new AppError(409, 'Only pending applications can be rejected');
  }

  const updated = await prisma.nutritionistApplication.update({
    where: { id: application.id },
    data: {
      status: 'REJECTED',
      reviewNotes: notes,
      reviewedById: req.user.id,
      reviewedAt: new Date(),
    },
  });

  ok(res, updated);
}

module.exports = { submit, list, getById, approve, reject };
