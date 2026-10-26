require('dotenv/config');
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/db');

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo accounts cannot be created in production');
  const accounts = [
    { email: 'premium@foodiemeter.local', name: 'Premium Demo', password: process.env.DEMO_PREMIUM_PASSWORD, subscriptionTier: 'PREMIUM', role: 'USER' },
    { email: 'nutritionist@foodiemeter.local', name: 'Nutritionist Demo', password: process.env.DEMO_NUTRITIONIST_PASSWORD, subscriptionTier: 'FREE', role: 'NUTRITIONIST' },
  ];
  if (accounts.some(account => !account.password || account.password.length < 12)) {
    throw new Error('Set DEMO_PREMIUM_PASSWORD and DEMO_NUTRITIONIST_PASSWORD (12+ characters) in .env');
  }
  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 10);

await prisma.user.upsert({
  where: {
    email: account.email,
  },
  update: {
    name: account.name,
    passwordHash,
    isVerified: true,
    role: account.role,
    subscriptionTier: account.subscriptionTier,
    status: 'ACTIVE',
  },
  create: {
    email: account.email,
    name: account.name,
    passwordHash,
    isVerified: true,
    role: account.role,
    subscriptionTier: account.subscriptionTier,
    status: 'ACTIVE',
  },
});

console.log(`Created/updated ${account.email}`);
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
