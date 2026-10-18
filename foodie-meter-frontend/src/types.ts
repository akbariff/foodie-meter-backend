export type ScreenName =
  | 'Login' | 'Register' | 'VerifyEmail' | 'ForgotPassword'
  | 'Home' | 'Goal' | 'Recommendations' | 'RecipeDetails'
  | 'LogMeal' | 'Diary' | 'MyRecipes' | 'RecipeEditor'
  | 'Profile' | 'Reviews' | 'Premium' | 'Insights' | 'ManageSubscription' | 'AiMealReview';

export type Goal = {
  goalType: 'Lose' | 'Maintain' | 'Gain';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  activity: string;
};

export type DiaryEntry = {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  mealType: string;
  createdAt: string;
};

export type Recipe = {
  id: string;
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  source?: string;
  mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  serving?: string;
  mine?: boolean;
};

export type Review = {
  id: string;
  recipeTitle: string;
  author: string;
  rating: number;
  comment: string;
  mine?: boolean;
};
