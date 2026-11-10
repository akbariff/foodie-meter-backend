import { API_BASE_URL } from '../config';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
export type DietaryPreference = 'ANY' | 'VEGETARIAN' | 'VEGAN';
export type ApiUser = {
  id: string; name: string; email: string; role: 'USER' | 'NUTRITIONIST' | 'ADMIN';
  subscriptionTier: 'FREE' | 'PREMIUM'; dietaryPreference: DietaryPreference;
  excludedIngredients: string[];
};
export type AiMeal = {
  id: string; title: string; ingredients: string; instructions: string; mealType: MealType;
  dietaryTags: string[]; ingredientTags: string[]; serving: string | null;
  calories: number | null; protein: number | null; carbs: number | null; fat: number | null;
  nutritionSource: string | null; status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNotes: string | null; reviewedAt?: string | null;
};
export type GenerationJob = {
  id: string; count: number; createdAt: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  error: string | null; meals?: AiMeal[];
};

export type RecommendationMeal = Omit<AiMeal, 'status' | 'reviewNotes'> & { reviewedAt: string };
export type RecommendationData = { date: string; mealType: MealType; targetCalories: number; consumedCalories: number; remainingCalories: number; meals: RecommendationMeal[] };
export type BackendDiaryEntry = { id: string; consumedAt: string; mealType: MealType; foodName: string; calories: number };

export type GamificationBadge = {
  code: string;
  title: string;
  description: string;
  earned?: boolean;
  earnedAt: string | null;
};

export type UserStreak = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
};

export type GamificationChallenge = {
  id: string;
  title: string;
  description: string;
  type: 'MEAL_LOGGING' | 'CALORIE_GOAL' | 'BREAKFAST_LOGGING';
  mode: 'INDIVIDUAL' | 'GROUP';
  targetValue: number;
  pointsReward: number;
  startDate: string;
  endDate: string;
  joined: boolean;
  progress: number;
  completedAt: string | null;
  // GROUP challenges only: everyone's contributions added together.
  groupProgress?: number;
  memberCount?: number;
};

export type GamificationDashboard = {
  id: string;
  name: string;
  gamificationPoints: number;
  leaderboardOptIn: boolean;
  shareProgressOptIn: boolean;
  userStreak: UserStreak | null;
  userBadges: GamificationBadge[];
  userChallenges: Array<{
    userId: string;
    challengeId: string;
    progress: number;
    completedAt: string | null;
    joinedAt: string;
    challenge: GamificationChallenge;
  }>;
  _count: {
    following: number;
    followers: number;
  };
};

export type LeaderboardEntry = {
  rank: number;
  id: string;
  name: string;
  gamificationPoints: number;
};

export type LeaderboardData = {
  currentUserRank: number | null;
  entries: LeaderboardEntry[];
};

export type FollowingUser = {
  id: string;
  name: string;
  followedAt: string;
  progress: {
    gamificationPoints: number;
    currentStreak: number;
    longestStreak: number;
  } | null;
};

export type WebsiteInfo = {
  id: string;
  siteName: string;
  heroHeadingPrimary: string;
  heroHeadingAccent: string;
  heroDescription: string;
  featuresHeading: string;
  featuresDescription: string;
  freePlanDescription: string;
  premiumPlanDescription: string;
  aboutHeading: string;
  aboutDescription: string;
  medicalDisclaimer: string;
  ctaHeading: string;
  ctaDescription: string;
  footerTagline: string;
  footerCopyright: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
  role: 'USER' | 'NUTRITIONIST' | 'ADMIN';
  subscriptionTier: 'FREE' | 'PREMIUM';
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
};

export type NutritionistApplication = {
  id: string;
  name: string;
  email: string;
  qualification: string;
  specialty: string;
  experience?: string | null;
  supportingInfo?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
};

export type BackendRecipe = {
  id: string;
  title: string;
  ingredients: string;
  instructions: string;
  sourceNutritionistRecipeId?:
    | string
    | null;
  moderationStatus:
    | 'ACTIVE'
    | 'FLAGGED'
    | 'REMOVED';

  isShared: boolean;

  createdAt: string;
  updatedAt: string;
};

export type PublicRecipe = {
  id: string;
  title: string;
  ingredients: string;
  instructions: string;

  isShared: boolean;

  moderationStatus:
    | 'ACTIVE'
    | 'FLAGGED'
    | 'REMOVED';

  createdAt: string;
  ownerId: string;
  ownerName: string;
};

export type BackendRecipeReview = {
  id: string;
  userId: string;
  recipeId: string;
  rating: number;
  comment: string;
  author: string;
  mine: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecipeReviewData = {
  recipe: {
    id: string;
    title: string;
  };
  reviews: BackendRecipeReview[];
  averageRating: number | null;
  count: number;
};

export type AdminReview = {
  id: string;
  userId: string;
  recipeId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;

  user: {
    id: string;
    name: string;
    email: string;
  };

  recipe: {
    id: string;
    title: string;
    isShared: boolean;
    moderationStatus?: 'ACTIVE' | 'FLAGGED' | 'REMOVED';
  };
};

export type CuratedRecipe = {
  id: string;
  title: string;
  ingredients: string;
  instructions: string;
  createdAt: string;
};
export type CuratedRecipeInput = Pick<CuratedRecipe, 'title' | 'ingredients' | 'instructions'>;
export type NutritionCategory = { id: string; name: string; description: string | null };
export type NutritionContent = {
  id: string;
  categoryId: string;
  authorId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};
export type ModerationStatus = 'ACTIVE' | 'FLAGGED' | 'REMOVED';
export type ModerationAction = 'APPROVED' | 'CLEARED' | 'FLAGGED' | 'REMOVED';
export type ModerationRecipe = {
  id: string;
  title: string;
  ingredients: string;
  instructions: string;
  moderationStatus: ModerationStatus;
  createdAt: string;
  ownerId: string;
  ownerName: string;
};
export type ModerationEntry = {
  id: string;
  recipeId: string;
  reviewedById: string;
  action: ModerationAction;
  reason: string | null;
  createdAt: string;
};

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => { accessToken = token; };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || body?.message || `Request failed (${response.status})`);
  return body.data as T;
}

export const api = {
  login: (email: string, password: string) => request<{ token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (payload: { name: string; email: string; password: string }) => request('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  verifyEmail: (email: string, code: string) => request<{ token: string }>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email, code }) }),
  forgotPassword: (email: string) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email: string, code: string, newPassword: string) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code, newPassword }) }),
  changePassword: (currentPassword: string,newPassword: string) =>request<void>('/auth/change-password',{method: 'PUT',body: JSON.stringify({currentPassword,newPassword,}),}),
  getProfile: () => request<ApiUser>('/users/me'),
  updateProfile: (payload: Partial<Pick<ApiUser, 'name' | 'dietaryPreference' | 'excludedIngredients'>>) => request<ApiUser>('/users/me', { method: 'PUT', body: JSON.stringify(payload) }),
  getGoal: () => request<{ targetCalories: number }>('/calorie-goal'),
  saveGoal: (targetCalories: number) => request<{ targetCalories: number }>('/calorie-goal', { method: 'PUT', body: JSON.stringify({ targetCalories }) }),
  getRecommendations: (mealType: MealType, date: string) => request<RecommendationData>(`/recommendations?mealType=${mealType}&date=${date}`),
  getDiary: (date: string) => request<BackendDiaryEntry[]>(`/calorie-intake?date=${date}`),
  logMeal: (payload: { consumedAt: string; mealType: MealType; foodName: string; portion?: string; calories: number }) => request<BackendDiaryEntry>('/calorie-intake', { method: 'POST', body: JSON.stringify(payload) }),
  deleteDiaryEntry: (id: string) => request<void>(`/calorie-intake/${id}`, { method: 'DELETE' }),
  startGeneration: (count: number) => request<GenerationJob>('/ai-meals/jobs', { method: 'POST', body: JSON.stringify({ count }) }),
  getGenerationJobs: () => request<GenerationJob[]>('/ai-meals/jobs'),
  getGenerationJob: (id: string) => request<GenerationJob>(`/ai-meals/jobs/${id}`),
  getAiMeals: (status: AiMeal['status']) => request<AiMeal[]>(`/ai-meals?status=${status}`),
  updateAiMeal: (id: string, payload: Partial<AiMeal>) => request<AiMeal>(`/ai-meals/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  approveAiMeal: (id: string) => request<AiMeal>(`/ai-meals/${id}/approve`, { method: 'POST', body: JSON.stringify({ reviewConfirmed: true }) }),
  rejectAiMeal: (id: string, notes: string) => request<AiMeal>(`/ai-meals/${id}/reject`, { method: 'POST', body: JSON.stringify({ notes }) }),
  getGamificationDashboard: () => request<GamificationDashboard>('/gamification/me'),
  getBadges: () => request<GamificationBadge[]>('/gamification/badges'),
  getChallenges: () => request<GamificationChallenge[]>('/gamification/challenges'),
  joinChallenge: (id: string) => request(`/gamification/challenges/${id}/join`, { method: 'POST',}),
  getLeaderboard: () => request<LeaderboardData>('/gamification/leaderboard'),
  getFollowing: () => request<FollowingUser[]>('/gamification/following'),
  followUser: (userId: string) => request(`/gamification/follow/${userId}`, {method: 'POST',}),
  unfollowUser: (userId: string) => request<void>(`/gamification/follow/${userId}`, { method: 'DELETE',}),
  updateGamificationSettings: (payload: { leaderboardOptIn?: boolean;shareProgressOptIn?: boolean;}) =>
  request<{ leaderboardOptIn: boolean; shareProgressOptIn: boolean;}>('/gamification/settings', { method: 'PUT', body: JSON.stringify(payload),}),
  getWebsiteInfo: () =>request<WebsiteInfo>('/site-info'),
  updateWebsiteInfo: (payload: Partial<Omit<WebsiteInfo, | 'id'| 'createdAt'| 'updatedAt'>>) =>
  request<WebsiteInfo>('/site-info',{method: 'PUT',body: JSON.stringify(payload),}),
  getAdminUsers: (params?: {role?: AdminUser['role'];status?: AdminUser['status'];search?: string;}) => {const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const suffix = query.toString()
      ? `?${query.toString()}`
      : '';
    return request<AdminUser[]>(`/admin/users${suffix}`);
},

updateAdminUserStatus: (id: string,status: AdminUser['status']) =>
  request<AdminUser>(`/admin/users/${id}/status`, {method: 'PATCH',body: JSON.stringify({ status }),}),
updateAdminUserRole: (id: string,role: AdminUser['role']) =>request<AdminUser>(`/admin/users/${id}/role`, {method: 'PATCH',body: JSON.stringify({ role }),}),
getNutritionistApplications: (status?: NutritionistApplication['status']) =>
  request<NutritionistApplication[]>(`/nutritionist-applications${status ? `?status=${status}` : ''}`),
approveNutritionistApplication: (id: string) =>
  request(`/nutritionist-applications/${id}/approve`, {method: 'POST',}),
rejectNutritionistApplication: (id: string,notes: string) =>
  request(`/nutritionist-applications/${id}/reject`, {method: 'POST',body: JSON.stringify({ notes }),}),
sendAdminPasswordReset: (id: string) =>
  request<void>(`/admin/users/${id}/password-reset`,{method: 'POST',}),
deleteAdminUser: (id: string) =>
  request<void>(`/admin/users/${id}`,{method: 'DELETE',}),
getMyRecipes: () => request<BackendRecipe[]>('/recipes'),
getPublicRecipes: () => request<PublicRecipe[]>('/recipes/public'),
createRecipe: (payload: {
  title: string;
  ingredients: string;
  instructions: string;
  isShared: boolean;
}) =>
  request<BackendRecipe>('/recipes', {method: 'POST',body: JSON.stringify(payload),}),
updateRecipe: (
  id: string,
  payload: {
    title?: string;
    ingredients?: string;
    instructions?: string;
    isShared?: boolean;
  }) =>
  request<BackendRecipe>(`/recipes/${id}`,{method: 'PUT',body: JSON.stringify(payload),}),

deleteRecipe: (id: string) =>
  request<void>(`/recipes/${id}`, {method: 'DELETE',}),
  getRecipeReviews: (recipeId: string) =>
  request<RecipeReviewData>(`/recipe-reviews/${recipeId}`),

saveMyRecipeReview: (
  recipeId: string,
  rating: number,
  comment: string
) =>
  request<BackendRecipeReview>(
`/recipe-reviews/${recipeId}/me`,
    {
      method: 'PUT',
      body: JSON.stringify({
        rating,
        comment,
      }),
    }
  ),

deleteMyRecipeReview: (recipeId: string) =>
  request<void>(
    `/recipe-reviews/${recipeId}/me`,
    {
      method: 'DELETE',
    }
  ),

  getAdminReviews: (
  search?: string
) => {
  const suffix =
    search?.trim()
      ? `?search=${encodeURIComponent(
          search.trim()
        )}`
      : '';

  return request<AdminReview[]>(
    `/admin/reviews${suffix}`
  );
},

createAdminReview: (
  recipeId: string,
  rating: number,
  comment: string
) =>
  request<AdminReview>(
    '/admin/reviews',
    {
      method: 'POST',
      body: JSON.stringify({
        recipeId,
        rating,
        comment,
      }),
    }
  ),

updateAdminReview: (id: string,payload: {rating?: number;comment?: string;}) =>request<AdminReview>(`/admin/reviews/${id}`,{method: 'PATCH',body: JSON.stringify(payload),}),
deleteAdminReview: (id: string) => request<void>(`/admin/reviews/${id}`,{method: 'DELETE',}),

  // Nutritionist tools
  getCuratedRecipes: () => request<CuratedRecipe[]>('/nutritionist-recipes'),
  createCuratedRecipe: (payload: CuratedRecipeInput) => request<CuratedRecipe>('/nutritionist-recipes', { method: 'POST', body: JSON.stringify(payload) }),
  updateCuratedRecipe: (id: string, payload: Partial<CuratedRecipeInput>) => request<CuratedRecipe>(`/nutritionist-recipes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCuratedRecipe: (id: string) => request<void>(`/nutritionist-recipes/${id}`, { method: 'DELETE' }),
  getMyNutritionCategories: () => request<NutritionCategory[]>('/nutrition-categories/mine'),
  getNutritionContents: (categoryId: string) => request<NutritionContent[]>(`/nutrition-contents?categoryId=${categoryId}`),
  createNutritionContent: (payload: { categoryId: string; title: string; content: string }) => request<NutritionContent>('/nutrition-contents', { method: 'POST', body: JSON.stringify(payload) }),
  updateNutritionContent: (id: string, payload: { title?: string; content?: string }) => request<NutritionContent>(`/nutrition-contents/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteNutritionContent: (id: string) => request<void>(`/nutrition-contents/${id}`, { method: 'DELETE' }),
  getModerationQueue: (status?: ModerationStatus) => request<ModerationRecipe[]>(`/recipe-moderation/queue${status ? `?status=${status}` : ''}`),
  getModerationHistory: (recipeId: string) => request<ModerationEntry[]>(`/recipe-moderation/${recipeId}/history`),
  moderateRecipe: (recipeId: string, action: ModerationAction, reason?: string) => request<ModerationEntry>(`/recipe-moderation/${recipeId}`, { method: 'POST', body: JSON.stringify({ action, ...(reason ? { reason } : {}) }) }),
};
