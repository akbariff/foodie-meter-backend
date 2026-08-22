const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../../config/db');
const env = require('../../config/env');
const AppError = require('../../middleware/AppError');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../config/mailer');

const SALT_ROUNDS = 10;

function generateCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function issueToken(user) {
  return jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

async function createVerificationCode(userId, purpose) {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + env.verificationCodeTtlMinutes * 60 * 1000);

  await prisma.verificationCode.create({
    data: { userId, codeHash, expiresAt, purpose },
  });

  if (env.nodeEnv !== 'production') {
    console.log(`[auth] ${purpose} code for user ${userId}: ${code}`);
  }

  return code;
}

async function findAndConsumeValidCode(userId, purpose, code) {
  const candidates = await prisma.verificationCode.findMany({
    where: { userId, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await bcrypt.compare(code, candidate.codeHash)) {
      await prisma.verificationCode.update({ where: { id: candidate.id }, data: { consumedAt: new Date() } });
      return candidate;
    }
  }

  return null;
}

async function signup({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  const code = await createVerificationCode(user.id, 'EMAIL_VERIFY');
  await sendVerificationEmail(user.email, code);

  return toPublicUser(user);
}

async function resendVerification(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(404, 'No account found for this email');
  }
  if (user.isVerified) {
    throw new AppError(409, 'This account is already verified');
  }

  const code = await createVerificationCode(user.id, 'EMAIL_VERIFY');
  await sendVerificationEmail(user.email, code);
}

async function verifyEmail({ email, code }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(404, 'No account found for this email');
  }
  if (user.isVerified) {
    throw new AppError(409, 'This account is already verified');
  }

  const matched = await findAndConsumeValidCode(user.id, 'EMAIL_VERIFY', code);
  if (!matched) {
    throw new AppError(400, 'Invalid or expired verification code');
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });
  const token = issueToken(updated);
  return { token, user: toPublicUser(updated) };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError(401, 'Invalid email or password');
  }

  if (!user.isVerified) {
    throw new AppError(403, 'Please verify your email before logging in', 'EMAIL_NOT_VERIFIED');
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError(403, 'This account has been suspended', 'ACCOUNT_SUSPENDED');
  }

  const token = issueToken(user);
  return { token, user: toPublicUser(user) };
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!currentMatches) {
    throw new AppError(401, 'Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always behave the same whether the account exists or not, to avoid leaking which emails are registered.
  if (user) {
    const code = await createVerificationCode(user.id, 'PASSWORD_RESET');
    await sendPasswordResetEmail(user.email, code);
  }
}

async function resetPassword({ email, code, newPassword }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(400, 'Invalid or expired reset code');
  }

  const matched = await findAndConsumeValidCode(user.id, 'PASSWORD_RESET', code);
  if (!matched) {
    throw new AppError(400, 'Invalid or expired reset code');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
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
