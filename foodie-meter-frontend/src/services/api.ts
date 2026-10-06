import { API_BASE_URL } from '../config';

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => { accessToken = token; };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || `Request failed (${response.status})`);
  return body as T;
}

// Change the paths below to match your Express Swagger routes.
export const api = {
  login: (email: string, password: string) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (payload: unknown) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  verifyEmail: (email: string, code: string) => request<any>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email, code }) }),
  forgotPassword: (email: string) => request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  getProfile: () => request<any>('/users/me'),
  updateProfile: (payload: unknown) => request<any>('/users/me', { method: 'PUT', body: JSON.stringify(payload) }),
  getRecipes: () => request<any>('/recipes'),
  createRecipe: (payload: unknown) => request<any>('/recipes', { method: 'POST', body: JSON.stringify(payload) }),
  getDiary: () => request<any>('/calorie-intake'),
  logMeal: (payload: unknown) => request<any>('/calorie-intake', { method: 'POST', body: JSON.stringify(payload) }),
};
