require('dotenv/config');
const { PrismaClient } = require('../src/generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const nutritionistRecipes = [
  {
    title: 'Grilled Chicken & Quinoa Bowl',
    ingredients: '150g chicken breast, 1 cup cooked quinoa, mixed greens, cherry tomatoes, olive oil, lemon juice',
    instructions:
      '1. Season and grill chicken breast until cooked through.\n2. Slice and place over cooked quinoa and greens.\n3. Top with cherry tomatoes.\n4. Drizzle with olive oil and lemon juice.',
  },
  {
    title: 'Overnight Oats with Berries',
    ingredients: '1/2 cup rolled oats, 1/2 cup milk, 1/4 cup Greek yogurt, mixed berries, 1 tsp honey',
    instructions:
      '1. Combine oats, milk, and yogurt in a jar.\n2. Refrigerate overnight.\n3. Top with berries and honey before serving.',
  },
  {
    title: 'Baked Salmon with Steamed Vegetables',
    ingredients: '150g salmon fillet, broccoli, carrots, olive oil, salt, pepper, garlic powder',
    instructions:
      '1. Season salmon and bake at 200°C for 12-15 minutes.\n2. Steam broccoli and carrots until tender.\n3. Serve together.',
  },
];

async function main() {
  for (const recipe of nutritionistRecipes) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await prisma.nutritionistRecipe.findFirst({ where: { title: recipe.title } });
    if (!existing) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.nutritionistRecipe.create({ data: recipe });
    }
  }
  console.log(`Seeded ${nutritionistRecipes.length} nutritionist recipes`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
