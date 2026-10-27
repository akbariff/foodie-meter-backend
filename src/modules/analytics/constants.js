// Deliberately simple, adjustable thresholds for the statistics-based
// "predictive" analytics below — none of this is a trained model, it's all
// transparent arithmetic over rows already in Postgres.

// A day counts as "on track" if consumedCalories is within this percentage
// of targetCalories (above or below).
const ADHERENCE_TOLERANCE_PERCENT = 15;

// Skip the same-day pace projection until at least this fraction of the UTC
// day has elapsed, to avoid wildly unstable extrapolation right after midnight.
const EARLY_DAY_SKIP_FRACTION = 0.05;

// Minimum number of days between the first and last weight log before we'll
// offer a weight projection (a 1-day "trend" is just noise).
const MIN_WEIGHT_TREND_SPAN_DAYS = 7;

// How far ahead the weight projection extrapolates, in weeks.
const WEIGHT_PROJECTION_WEEKS = 4;

module.exports = {
  ADHERENCE_TOLERANCE_PERCENT,
  EARLY_DAY_SKIP_FRACTION,
  MIN_WEIGHT_TREND_SPAN_DAYS,
  WEIGHT_PROJECTION_WEEKS,
};
