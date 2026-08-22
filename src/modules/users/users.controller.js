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
    createdAt: user.createdAt,
  };
}

async function getMe(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  ok(res, toPublicUser(user));
}

async function updateMe(req, res) {
  const { name } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { ...(name !== undefined ? { name } : {}) },
  });
  ok(res, toPublicUser(user));
}

module.exports = { getMe, updateMe };
