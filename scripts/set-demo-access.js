require('dotenv/config');
const prisma = require('../src/config/db');

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo access cannot be assigned in production');
  const [email, access] = process.argv.slice(2);
  if (!email || !['premium', 'nutritionist'].includes(access)) {
    throw new Error('Usage: npm run demo:access -- user@example.com premium|nutritionist');
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isVerified) throw new Error('Create and verify this account before assigning demo access');
  const updated = await prisma.user.update({ where: { id: user.id }, data: access === 'premium'
    ? { subscriptionTier: 'PREMIUM' } : { role: 'NUTRITIONIST' } });
  console.log(`Updated ${updated.email}: role=${updated.role}, tier=${updated.subscriptionTier}`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
