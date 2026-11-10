require('dotenv/config');
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/db');

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo accounts cannot be created in production');
  const accounts = [
    { email: 'premium@foodiemeter.local', name: 'Premium Demo', password: process.env.DEMO_PREMIUM_PASSWORD, subscriptionTier: 'PREMIUM', role: 'USER' },
    { email: 'nutritionist@foodiemeter.local', name: 'Nutritionist Demo', password: process.env.DEMO_NUTRITIONIST_PASSWORD, subscriptionTier: 'FREE', role: 'NUTRITIONIST' },
    { email: 'admin@foodiemeter.local', name: 'System Administrator', password: process.env.DEMO_ADMIN_PASSWORD, subscriptionTier: 'FREE', role: 'ADMIN',},
  ];
  if (accounts.some(account => !account.password || account.password.length < 12)) {
    throw new Error('Set DEMO_PREMIUM_PASSWORD, DEMO_NUTRITIONIST_PASSWORD and DEMO_ADMIN_PASSWORD (12+ characters) in .env');
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

  // Let the demo nutritionist write content in every seeded category.
  const nutritionist = await prisma.user.findUnique({ where: { email: 'nutritionist@foodiemeter.local' } });
  const categories = await prisma.nutritionCategory.findMany();
  for (const category of categories) {
    await prisma.nutritionistCategory.upsert({
      where: { nutritionistId_categoryId: { nutritionistId: nutritionist.id, categoryId: category.id } },
      update: {},
      create: { nutritionistId: nutritionist.id, categoryId: category.id },
    });
  }
  console.log(categories.length
    ? `Assigned ${nutritionist.email} to ${categories.length} nutrition categories`
    : 'No nutrition categories yet: run npm run prisma:seed first, then run this script again');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
