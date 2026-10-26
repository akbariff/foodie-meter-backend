require('dotenv/config');

const { PrismaClient } = require('../src/generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const nutritionistRecipes = [
  {
    title: 'Grilled Chicken & Quinoa Bowl',
    ingredients:
      '150g chicken breast, 1 cup cooked quinoa, mixed greens, cherry tomatoes, olive oil, lemon juice',
    instructions:
      '1. Season and grill chicken breast until cooked through.\n' +
      '2. Slice and place over cooked quinoa and greens.\n' +
      '3. Top with cherry tomatoes.\n' +
      '4. Drizzle with olive oil and lemon juice.',
  },
  {
    title: 'Overnight Oats with Berries',
    ingredients:
      '1/2 cup rolled oats, 1/2 cup milk, 1/4 cup Greek yogurt, mixed berries, 1 tsp honey',
    instructions:
      '1. Combine oats, milk, and yogurt in a jar.\n' +
      '2. Refrigerate overnight.\n' +
      '3. Top with berries and honey before serving.',
  },
  {
    title: 'Baked Salmon with Steamed Vegetables',
    ingredients:
      '150g salmon fillet, broccoli, carrots, olive oil, salt, pepper, garlic powder',
    instructions:
      '1. Season salmon and bake at 200°C for 12-15 minutes.\n' +
      '2. Steam broccoli and carrots until tender.\n' +
      '3. Serve together.',
  },
];

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

async function seedNutritionistRecipes() {
  for (const recipe of nutritionistRecipes) {
    const existing = await prisma.nutritionistRecipe.findFirst({
      where: {
        title: recipe.title,
      },
    });

    if (!existing) {
      await prisma.nutritionistRecipe.create({
        data: recipe,
      });
    }
  }

  console.log(
    `Seeded ${nutritionistRecipes.length} nutritionist recipes`
  );
}

async function seedChallenges() {
  const now = new Date();

  // Keep seeded challenges active for demonstrations.
  const startDate = addDays(now, -7);
  const endDate = addDays(now, 60);

  const challenges = [
    {
      title: '7 Meal Challenge',
      description:
        'Log 7 meals to complete this challenge.',
      type: 'MEAL_LOGGING',
      mode: 'INDIVIDUAL',
      targetValue: 7,
      pointsReward: 100,
      startDate,
      endDate,
      isActive: true,
    },
    {
      title: 'Breakfast Champion',
      description:
        'Log breakfast on 5 occasions.',
      type: 'BREAKFAST_LOGGING',
      mode: 'INDIVIDUAL',
      targetValue: 5,
      pointsReward: 75,
      startDate,
      endDate,
      isActive: true,
    },
    {
      title: 'Community Meal Drive',
      description:
        'Work together with the community to log 25 meals.',
      type: 'MEAL_LOGGING',
      mode: 'GROUP',
      targetValue: 25,
      pointsReward: 150,
      startDate,
      endDate,
      isActive: true,
    },
    {
      title: 'Breakfast Together',
      description:
        'Work together to log 15 breakfasts.',
      type: 'BREAKFAST_LOGGING',
      mode: 'GROUP',
      targetValue: 15,
      pointsReward: 125,
      startDate,
      endDate,
      isActive: true,
    },
  ];

  for (const challenge of challenges) {
    const existing = await prisma.challenge.findFirst({
      where: {
        title: challenge.title,
      },
    });

    if (existing) {
      await prisma.challenge.update({
        where: {
          id: existing.id,
        },
        data: challenge,
      });
    } else {
      await prisma.challenge.create({
        data: challenge,
      });
    }
  }

  console.log(`Seeded ${challenges.length} gamification challenges`);
}

async function main() {
  await seedNutritionistRecipes();
  await seedChallenges();

  console.log('Database seed completed');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });