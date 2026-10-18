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
  reviewNotes: string | null;
};
export type GenerationJob = { id: string; status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'; error: string | null; meals: AiMeal[] };
export type RecommendationMeal = Omit<AiMeal, 'status' | 'reviewNotes'> & { reviewedAt: string };
export type RecommendationData = { date: string; mealType: MealType; targetCalories: number; consumedCalories: number; remainingCalories: number; meals: RecommendationMeal[] };
export type BackendDiaryEntry = { id: string; consumedAt: string; mealType: MealType; foodName: string; calories: number };

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
  getGenerationJob: (id: string) => request<GenerationJob>(`/ai-meals/jobs/${id}`),
  getAiMeals: (status: AiMeal['status']) => request<AiMeal[]>(`/ai-meals?status=${status}`),
  updateAiMeal: (id: string, payload: Partial<AiMeal>) => request<AiMeal>(`/ai-meals/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  approveAiMeal: (id: string) => request<AiMeal>(`/ai-meals/${id}/approve`, { method: 'POST', body: JSON.stringify({ reviewConfirmed: true }) }),
  rejectAiMeal: (id: string, notes: string) => request<AiMeal>(`/ai-meals/${id}/reject`, { method: 'POST', body: JSON.stringify({ notes }) }),
};
