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
};
