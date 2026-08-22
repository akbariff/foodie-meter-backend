const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const requireAuth = require('../../middleware/requireAuth');
const controller = require('./auth.controller');

const router = Router();

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Create a new account and send an email verification code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Jane Doe }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password, minLength: 8 }
 *     responses:
 *       201: { description: Account created, verification email sent }
 *       409: { description: Email already registered }
 */
router.post(
  '/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  asyncHandler(controller.signup)
);

/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Confirm the emailed verification code and receive a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email: { type: string, format: email }
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200: { description: Email verified, returns token and user }
 *       400: { description: Invalid or expired code }
 */
router.post(
  '/verify-email',
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
  ],
  validate,
  asyncHandler(controller.verifyEmail)
);

/**
 * @openapi
 * /api/auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Resend the email verification code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Verification code resent }
 */
router.post(
  '/resend-verification',
  [body('email').isEmail().withMessage('A valid email is required').normalizeEmail()],
  validate,
  asyncHandler(controller.resendVerification)
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200: { description: Returns token and user }
 *       401: { description: Invalid credentials }
 *       403: { description: Email not verified }
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  asyncHandler(controller.login)
);

/**
 * @openapi
 * /api/auth/change-password:
 *   put:
 *     tags: [Auth]
 *     summary: Change the logged-in user's password
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, format: password }
 *               newPassword: { type: string, format: password, minLength: 8 }
 *     responses:
 *       200: { description: Password changed }
 *       401: { description: Current password incorrect }
 */
router.put(
  '/change-password',
  requireAuth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  validate,
  asyncHandler(controller.changePassword)
);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset code by email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Generic success message, regardless of whether the email exists }
 */
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('A valid email is required').normalizeEmail()],
  validate,
  asyncHandler(controller.forgotPassword)
);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using the emailed reset code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code, newPassword]
 *             properties:
 *               email: { type: string, format: email }
 *               code: { type: string, example: "123456" }
 *               newPassword: { type: string, format: password, minLength: 8 }
 *     responses:
 *       200: { description: Password reset }
 *       400: { description: Invalid or expired code }
 */
router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  validate,
  asyncHandler(controller.resetPassword)
);

module.exports = router;
