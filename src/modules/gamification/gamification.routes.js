const { Router } = require('express');
const { body, param } = require('express-validator');

const requireAuth = require('../../middleware/requireAuth');
const { requireTier } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');

const controller = require('./gamification.controller');

const router = Router();

router.use(requireAuth);
router.use(requireTier('PREMIUM'));

router.get(
  '/me',
  asyncHandler(controller.getMe)
);

router.get(
  '/badges',
  asyncHandler(controller.listBadges)
);

router.get(
  '/challenges',
  asyncHandler(controller.listChallenges)
);

router.post(
  '/challenges/:id/join',
  [
    param('id')
      .isUUID()
      .withMessage('Invalid challenge id'),
  ],
  validate,
  asyncHandler(controller.joinChallenge)
);

router.get(
  '/leaderboard',
  asyncHandler(controller.leaderboard)
);

router.get(
  '/following',
  asyncHandler(controller.listFollowing)
);

router.post(
  '/follow/:userId',
  [
    param('userId')
      .isUUID()
      .withMessage('Invalid user id'),
  ],
  validate,
  asyncHandler(controller.followUser)
);

router.delete(
  '/follow/:userId',
  [
    param('userId')
      .isUUID()
      .withMessage('Invalid user id'),
  ],
  validate,
  asyncHandler(controller.unfollowUser)
);

router.put(
  '/settings',
  [
    body('leaderboardOptIn')
      .optional()
      .isBoolean()
      .withMessage('leaderboardOptIn must be boolean'),

    body('shareProgressOptIn')
      .optional()
      .isBoolean()
      .withMessage('shareProgressOptIn must be boolean'),
  ],
  validate,
  asyncHandler(controller.updateSettings)
);

module.exports = router;