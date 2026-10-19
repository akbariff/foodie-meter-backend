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
    dietaryPreference: user.dietaryPreference,
    excludedIngredients: user.excludedIngredients,
    profile: user.profile || null,
    createdAt: user.createdAt,
  };
}

async function getMe(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { profile: true },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  ok(res, toPublicUser(user));
}

async function updateMe(req, res) {
  const {
    name,
    dietaryPreference,
    excludedIngredients,
    dateOfBirth,
    heightCm,
    weightKg,
    activityLevel,
    weightGoal,
  } = req.body;

  const hasProfileUpdate = [
    dateOfBirth,
    heightCm,
    weightKg,
    activityLevel,
    weightGoal,
  ].some(value => value !== undefined);

  await prisma.$transaction(async tx => {
    await tx.user.update({
      where: { id: req.user.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(dietaryPreference !== undefined ? { dietaryPreference } : {}),
        ...(excludedIngredients !== undefined
          ? { excludedIngredients: [...new Set(excludedIngredients)] }
          : {}),
      },
    });

    if (hasProfileUpdate) {
      const profileData = {
        ...(dateOfBirth !== undefined
          ? { dateOfBirth: dateOfBirth === null ? null : new Date(dateOfBirth) }
          : {}),
        ...(heightCm !== undefined ? { heightCm } : {}),
        ...(weightKg !== undefined ? { weightKg } : {}),
        ...(activityLevel !== undefined ? { activityLevel } : {}),
        ...(weightGoal !== undefined ? { weightGoal } : {}),
      };

      await tx.userProfile.upsert({
        where: { userId: req.user.id },
        update: profileData,
        create: {
          userId: req.user.id,
          ...profileData,
        },
      });
    }
  });

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { profile: true },
  });

  ok(res, toPublicUser(user));
}

module.exports = { getMe, updateMe };
