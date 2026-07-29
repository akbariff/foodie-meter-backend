const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, isVerified: user.isVerified, createdAt: user.createdAt };
}

async function getMe(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  res.json(toPublicUser(user));
}

async function updateMe(req, res) {
  const { name } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { ...(name !== undefined ? { name } : {}) },
  });
  res.json(toPublicUser(user));
}

module.exports = { getMe, updateMe };
