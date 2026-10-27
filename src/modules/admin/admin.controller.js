const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok } = require('../../utils/respond');

const USER_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  isVerified: true,
  role: true,
  subscriptionTier: true,
  status: true,
  createdAt: true,
};

async function listUsers(req, res) {
  const { role, status, search } = req.query;

  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: USER_LIST_SELECT,
  });

  ok(res, users);
}

async function assertNotSelf(req) {
  if (req.params.id === req.user.id) {
    throw new AppError(403, 'You cannot modify your own account through this endpoint', 'CANNOT_MODIFY_SELF');
  }
}

async function updateStatus(req, res) {
  await assertNotSelf(req);
  const { id } = req.params;
  const { status } = req.body;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'User not found');
  }

  const user = await prisma.user.update({
    where: { id },
    data: { status },
    select: USER_LIST_SELECT,
  });

  ok(res, user);
}

async function updateRole(req, res) {
  await assertNotSelf(req);
  const { id } = req.params;
  const { role } = req.body;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'User not found');
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: USER_LIST_SELECT,
  });

  ok(res, user);
}

module.exports = { listUsers, updateStatus, updateRole };
