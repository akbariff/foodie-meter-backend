const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok } = require('../../utils/respond');

async function getMine(req, res) {
  const profile = await prisma.userProfile.findUnique({ where: { userId: req.user.id } });
  if (!profile) {
    throw new AppError(404, 'No profile details set yet', 'PROFILE_NOT_SET');
  }
  ok(res, profile);
}

async function upsertMine(req, res) {
  const { dateOfBirth, heightCm, weightKg, activityLevel, weightGoal } = req.body;
  const fields = {
    ...(dateOfBirth !== undefined ? { dateOfBirth: new Date(dateOfBirth) } : {}),
    ...(heightCm !== undefined ? { heightCm } : {}),
    ...(weightKg !== undefined ? { weightKg } : {}),
    ...(activityLevel !== undefined ? { activityLevel } : {}),
    ...(weightGoal !== undefined ? { weightGoal } : {}),
  };

  const profile = await prisma.userProfile.upsert({
    where: { userId: req.user.id },
    update: fields,
    create: { userId: req.user.id, ...fields },
  });
  ok(res, profile);
}

module.exports = { getMine, upsertMine };
