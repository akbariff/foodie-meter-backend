const { Router } =
  require('express');

const { body } =
  require('express-validator');

const requireAuth =
  require('../../middleware/requireAuth');

const {
  requireRole,
} = require('../../middleware/authorize');

const validate =
  require('../../middleware/validate');

const asyncHandler =
  require('../../middleware/asyncHandler');

const controller =
  require('./siteInfo.controller');


const router = Router();


router.get(
  '/',
  asyncHandler(
    controller.getWebsiteInfo
  )
);


const textField = field =>
  body(field)
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      `${field} cannot be empty`
    )
    .isLength({
      max: 5000,
    })
    .withMessage(
      `${field} is too long`
    );


router.put(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  [
    textField('siteName'),

    textField(
      'heroHeadingPrimary'
    ),

    textField(
      'heroHeadingAccent'
    ),

    textField(
      'heroDescription'
    ),

    textField(
      'featuresHeading'
    ),

    textField(
      'featuresDescription'
    ),

    textField(
      'freePlanDescription'
    ),

    textField(
      'premiumPlanDescription'
    ),

    textField(
      'aboutHeading'
    ),

    textField(
      'aboutDescription'
    ),

    textField(
      'medicalDisclaimer'
    ),

    textField(
      'ctaHeading'
    ),

    textField(
      'ctaDescription'
    ),

    textField(
      'footerTagline'
    ),

    textField(
      'footerCopyright'
    ),
  ],
  validate,
  asyncHandler(
    controller.updateWebsiteInfo
  )
);


module.exports = router;