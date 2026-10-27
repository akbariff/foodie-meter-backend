const prisma = require('../../config/db');
const {
  ADHERENCE_TOLERANCE_PERCENT,
  EARLY_DAY_SKIP_FRACTION,
  MIN_WEIGHT_TREND_SPAN_DAYS,
  WEIGHT_PROJECTION_WEEKS,
} = require('./constants');

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(value) {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

async function overview(userId, days) {
  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const rangeStart = new Date(todayStart.getTime() - (days - 1) * DAY_MS);

  const [goal, entries, weightLogs, streak] = await Promise.all([
    prisma.calorieGoal.findUnique({ where: { userId } }),
    prisma.calorieIntake.findMany({
      where: { userId, consumedAt: { gte: rangeStart } },
      orderBy: { consumedAt: 'asc' },
    }),
    prisma.weightLog.findMany({
      where: { userId, loggedAt: { gte: rangeStart } },
      orderBy: { loggedAt: 'asc' },
    }),
    prisma.userStreak.findUnique({ where: { userId } }),
  ]);

  const targetCalories = goal ? goal.targetCalories : null;

  const caloriesByDay = new Map();
  for (const entry of entries) {
    const key = dateKey(startOfUtcDay(entry.consumedAt));
    caloriesByDay.set(key, (caloriesByDay.get(key) || 0) + entry.calories);
  }

  const caloriesTrend = [];
  for (let i = 0; i < days; i += 1) {
    const key = dateKey(new Date(rangeStart.getTime() + i * DAY_MS));
    caloriesTrend.push({
      date: key,
      consumedCalories: caloriesByDay.get(key) || 0,
      targetCalories,
    });
  }

  const daysWithEntries = caloriesTrend.filter(day => caloriesByDay.has(day.date));
  const averageDailyCalories = daysWithEntries.length
    ? round2(daysWithEntries.reduce((sum, day) => sum + day.consumedCalories, 0) / daysWithEntries.length)
    : null;

  let adherenceRate = null;
  if (targetCalories !== null && daysWithEntries.length) {
    const lower = targetCalories * (1 - ADHERENCE_TOLERANCE_PERCENT / 100);
    const upper = targetCalories * (1 + ADHERENCE_TOLERANCE_PERCENT / 100);
    const onTrackCount = daysWithEntries.filter(
      day => day.consumedCalories >= lower && day.consumedCalories <= upper
    ).length;
    adherenceRate = round2((onTrackCount / daysWithEntries.length) * 100);
  }

  let weightTrend = null;
  if (weightLogs.length >= 2) {
    const first = weightLogs[0];
    const last = weightLogs[weightLogs.length - 1];
    const weeks = (last.loggedAt - first.loggedAt) / (7 * DAY_MS);
    weightTrend = {
      entries: weightLogs,
      netChangeKg: round2(last.weightKg - first.weightKg),
      averagePerWeekKg: weeks > 0 ? round2((last.weightKg - first.weightKg) / weeks) : 0,
    };
  }

  let weightProjection = null;
  if (weightLogs.length >= 2) {
    const first = weightLogs[0];
    const last = weightLogs[weightLogs.length - 1];
    const spanDays = (last.loggedAt - first.loggedAt) / DAY_MS;
    if (spanDays >= MIN_WEIGHT_TREND_SPAN_DAYS) {
      const trendKgPerWeek = ((last.weightKg - first.weightKg) / spanDays) * 7;
      weightProjection = {
        currentWeightKg: last.weightKg,
        trendKgPerWeek: round2(trendKgPerWeek),
        projectedIn4WeeksKg: round2(last.weightKg + trendKgPerWeek * WEIGHT_PROJECTION_WEEKS),
      };
    }
  }

  let todayProjection = null;
  if (targetCalories !== null) {
    const fractionOfDayElapsed = (now - todayStart) / DAY_MS;
    if (fractionOfDayElapsed >= EARLY_DAY_SKIP_FRACTION) {
      const consumedSoFar = caloriesByDay.get(dateKey(todayStart)) || 0;
      todayProjection = {
        consumedSoFar,
        fractionOfDayElapsed: round2(fractionOfDayElapsed),
        projectedEndOfDayCalories: Math.round(consumedSoFar / fractionOfDayElapsed),
      };
    }
  }

  return {
    days,
    caloriesTrend,
    averageDailyCalories,
    adherenceRate,
    weightTrend,
    weightProjection,
    todayProjection,
    streak: streak
      ? { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak, lastActiveDate: streak.lastActiveDate }
      : null,
  };
}

module.exports = { overview };
