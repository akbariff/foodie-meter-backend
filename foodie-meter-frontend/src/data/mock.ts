import { Recipe, Review } from '../types';

export const recommendedMeals: Recipe[] = [
  {
    id: 'r1', title: 'Teriyaki salmon bowl', calories: 510, protein: 32, carbs: 55, fat: 18,
    ingredients: ['Salmon fillet', 'Brown rice', 'Broccoli', 'Teriyaki sauce', 'Sesame seeds'],
    instructions: ['Cook the rice.', 'Pan-sear the salmon.', 'Steam broccoli.', 'Assemble and add teriyaki sauce.'],
    tags: ['High protein', 'Balanced'], source: 'Nutritionist reviewed'
  },
  {
    id: 'r2', title: 'Chicken soba salad', calories: 480, protein: 34, carbs: 52, fat: 14,
    ingredients: ['Chicken breast', 'Soba noodles', 'Cucumber', 'Carrot', 'Sesame dressing'],
    instructions: ['Cook noodles.', 'Grill chicken.', 'Slice vegetables.', 'Toss everything with dressing.'],
    tags: ['High protein'], source: 'Curated library'
  },
  {
    id: 'r3', title: 'Tofu brown-rice bowl', calories: 455, protein: 24, carbs: 61, fat: 13,
    ingredients: ['Firm tofu', 'Brown rice', 'Edamame', 'Spinach', 'Soy-lime dressing'],
    instructions: ['Cook rice.', 'Crisp tofu.', 'Warm edamame.', 'Assemble the bowl.'],
    tags: ['Plant-based', 'High fibre'], source: 'Curated library'
  }
];

export const starterReviews: Review[] = [
  { id: 'v1', recipeTitle: 'Teriyaki salmon bowl', author: 'Alex', rating: 5, comment: 'Easy to follow and the portion was filling without being too heavy.' },
  { id: 'v2', recipeTitle: 'Chicken soba salad', author: 'Jamie', rating: 4, comment: 'Fresh and simple. I would make this recipe again.' },
];
