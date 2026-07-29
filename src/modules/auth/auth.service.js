const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../../config/db');
const env = require('../../config/env');
const AppError = require('../../middleware/AppError');
const { sendVerificationEmail } = require('../../config/mailer');

const SALT_ROUNDS = 10;

function generateCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function issueToken(user) {
  return jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

async function createVerificationCode(userId) {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + env.verificationCodeTtlMinutes * 60 * 1000);

  await prisma.verificationCode.create({
    data: { userId, codeHash, expiresAt },
  });

  if (env.nodeEnv !== 'production') {
    console.log(`[auth] Verification code for user ${userId}: ${code}`);
  }

  return code;
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

  const code = await createVerificationCode(user.id);
  await sendVerificationEmail(user.email, code);

  return { id: user.id, name: user.name, email: user.email };
}

async function resendVerification(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(404, 'No account found for this email');
  }
  if (user.isVerified) {
    throw new AppError(409, 'This account is already verified');
  }

  const code = await createVerificationCode(user.id);
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

  const candidates = await prisma.verificationCode.findMany({
    where: { userId: user.id, purpose: 'EMAIL_VERIFY', consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  let matched = null;
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await bcrypt.compare(code, candidate.codeHash)) {
      matched = candidate;
      break;
    }
  }

  if (!matched) {
    throw new AppError(400, 'Invalid or expired verification code');
  }

  await prisma.$transaction([
    prisma.verificationCode.update({ where: { id: matched.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { isVerified: true } }),
  ]);

  const token = issueToken(user);
  return { token, user: { id: user.id, name: user.name, email: user.email } };
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
    throw new AppError(403, 'Please verify your email before logging in');
  }

  const token = issueToken(user);
  return { token, user: { id: user.id, name: user.name, email: user.email } };
}

module.exports = { signup, resendVerification, verifyEmail, login };
