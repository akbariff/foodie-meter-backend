const authService = require('./auth.service');
const { ok, created } = require('../../utils/respond');

async function signup(req, res) {
  const user = await authService.signup(req.body);
  created(res, { user }, 'Verification code sent to your email');
}

async function resendVerification(req, res) {
  await authService.resendVerification(req.body.email);
  ok(res, null, 'Verification code resent');
}

async function verifyEmail(req, res) {
  const result = await authService.verifyEmail(req.body);
  ok(res, result);
}

async function login(req, res) {
  const result = await authService.login(req.body);
  ok(res, result);
}

async function changePassword(req, res) {
  await authService.changePassword(req.user.id, req.body);
  ok(res, null, 'Password changed successfully');
}

async function forgotPassword(req, res) {
  await authService.forgotPassword(req.body.email);
  ok(res, null, 'If an account exists for that email, a reset code has been sent');
}

async function resetPassword(req, res) {
  await authService.resetPassword(req.body);
  ok(res, null, 'Password reset successfully');
}

module.exports = {
  signup,
  resendVerification,
  verifyEmail,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
};
