const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok } = require('../../utils/respond');

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isVerified: user.isVerified,
    role: user.role,
    subscriptionTier: user.subscriptionTier,
    status: user.status,
    assignedCategory: user.assignedCategory,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function parsePagination(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  return { limit, skip: (page - 1) * limit, page };
}

async function list(req, res) {
  const { role, subscriptionTier, status } = req.query;
  const { limit, skip, page } = parsePagination(req.query);
  const where = {
    ...(role ? { role } : {}),
    ...(subscriptionTier ? { subscriptionTier } : {}),
    ...(status ? { status } : {}),
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip }),
    prisma.user.count({ where }),
  ]);
  ok(res, { users: users.map(toPublicUser), page, limit, total });
}

async function getById(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  ok(res, toPublicUser(user));
}

async function updateStatus(req, res) {
  const { status } = req.body;
  if (req.params.id === req.user.id && status === 'SUSPENDED') {
    throw new AppError(400, 'You cannot suspend your own account', 'CANNOT_SUSPEND_SELF');
  }
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) {
    throw new AppError(404, 'User not found');
  }
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { status } });
  ok(res, toPublicUser(user));
}

async function updateRole(req, res) {
  const { role, assignedCategory } = req.body;
  if (req.params.id === req.user.id) {
    throw new AppError(400, 'You cannot change your own role', 'CANNOT_CHANGE_OWN_ROLE');
  }
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) {
    throw new AppError(404, 'User not found');
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      role,
      assignedCategory: role === 'NUTRITIONIST' ? (assignedCategory ?? target.assignedCategory) : null,
    },
  });
  ok(res, toPublicUser(user));
}

module.exports = { list, getById, updateStatus, updateRole };
