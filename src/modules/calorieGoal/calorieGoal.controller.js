const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok } = require('../../utils/respond');

async function getMine(req, res) {
  const goal = await prisma.calorieGoal.findUnique({ where: { userId: req.user.id } });
  if (!goal) {
    throw new AppError(404, 'No calorie goal set yet', 'NO_GOAL_SET');
  }
  ok(res, goal);
}

async function upsertMine(req, res) {
  const { targetCalories } = req.body;
  const goal = await prisma.calorieGoal.upsert({
    where: { userId: req.user.id },
    update: { targetCalories, effectiveDate: new Date() },
    create: { userId: req.user.id, targetCalories },
  });
  ok(res, goal);
}

module.exports = { getMine, upsertMine };
