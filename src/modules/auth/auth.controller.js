const authService = require('./auth.service');

async function signup(req, res) {
  const user = await authService.signup(req.body);
  res.status(201).json({ user, message: 'Verification code sent to your email' });
}

async function resendVerification(req, res) {
  await authService.resendVerification(req.body.email);
  res.json({ message: 'Verification code resent' });
}

async function verifyEmail(req, res) {
  const result = await authService.verifyEmail(req.body);
  res.json(result);
}

async function login(req, res) {
  const result = await authService.login(req.body);
  res.json(result);
}

module.exports = { signup, resendVerification, verifyEmail, login };
