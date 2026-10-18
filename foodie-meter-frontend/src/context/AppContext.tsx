import React, { createContext, useContext, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { DiaryEntry, Goal, Recipe, Review, ScreenName } from '../types';
import { recommendedMeals, starterReviews } from '../data/mock';
import { api, setAccessToken, DietaryPreference, BackendDiaryEntry, MealType } from '../services/api';

type User = { name: string; email: string; premium: boolean; dietaryPreference: DietaryPreference; excludedIngredients: string[]; role: 'USER' | 'NUTRITIONIST' | 'ADMIN' };

type Subscription = {
  plan: 'Premium';
  status: 'active' | 'cancelScheduled';
  price: number;
  billingCycle: 'Monthly';
  nextBillingDate: string;
};

type AppContextValue = {
  user: User | null;
  route: ScreenName;
  params: any;
  navigate: (screen: ScreenName, params?: any) => void;
  goBack: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  goal: Goal;
  hasCalorieGoal: boolean;
  setGoal: (goal: Goal) => void;
  saveGoal: (goal: Goal) => Promise<void>;
  diary: DiaryEntry[];
  addDiaryEntry: (entry: Omit<DiaryEntry, 'id' | 'createdAt'>) => Promise<void>;
  removeDiaryEntry: (id: string) => Promise<void>;
  consumed: number;
  water: number;
  setWater: (value: number) => void;
  recommendations: Recipe[];
  myRecipes: Recipe[];
  saveRecipe: (recipe: Omit<Recipe, 'id' | 'mine'> & { id?: string }) => void;
  deleteRecipe: (id: string) => void;
  reviews: Review[];
  saveReview: (recipeTitle: string, rating: number, comment: string, id?: string) => void;
  deleteReview: (id: string) => void;
  updateProfile: (patch: Partial<User>) => Promise<void>;
  upgradePremium: () => void;
  subscription: Subscription;
  cancelSubscription: () => void;
  renewSubscription: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);
const fromBackendDiary = (entry: BackendDiaryEntry): DiaryEntry => ({
  id: entry.id, name: entry.foodName, mealType: entry.mealType, calories: entry.calories, createdAt: entry.consumedAt,
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [route, setRoute] = useState<ScreenName>('Login');
  const [params, setParams] = useState<any>({});
  const [history, setHistory] = useState<{ screen: ScreenName; params?: any }[]>([]);
  const [goal, setGoal] = useState<Goal>({ goalType: 'Maintain', calories: 2000, protein: 120, carbs: 220, fat: 65, activity: 'Moderately active' });
  const [hasCalorieGoal, setHasCalorieGoal] = useState(false);
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [water, setWater] = useState(2);
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([
    { id: 'm1', title: 'My overnight oats', calories: 390, protein: 22, carbs: 58, fat: 9, ingredients: ['Oats', 'Milk', 'Greek yogurt', 'Berries'], instructions: ['Mix ingredients.', 'Chill overnight.'], tags: ['Breakfast'], mine: true }
  ]);
  const [reviews, setReviews] = useState<Review[]>(starterReviews);
  const [subscription, setSubscription] = useState<Subscription>(() => {
    const next = new Date();
    next.setDate(next.getDate() + 30);
    return { plan: 'Premium', status: 'active', price: 6.99, billingCycle: 'Monthly', nextBillingDate: next.toISOString() };
  });

  const navigate = (screen: ScreenName, nextParams: any = {}) => {
    setHistory(h => [...h, { screen: route, params }]);
    setRoute(screen); setParams(nextParams);
  };
  const goBack = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory(h => h.slice(0, -1)); setRoute(last.screen); setParams(last.params || {});
  };
  const login = async (email: string, password: string) => {
    const result = await api.login(email.trim(), password);
    setAccessToken(result.token);
    try {
      const profile = await api.getProfile();
      setUser({ name: profile.name, email: profile.email, premium: profile.subscriptionTier === 'PREMIUM',
        dietaryPreference: profile.dietaryPreference, excludedIngredients: profile.excludedIngredients, role: profile.role });
      try { const savedGoal = await api.getGoal(); setGoal(g => ({ ...g, calories: savedGoal.targetCalories })); setHasCalorieGoal(true); }
      catch { setHasCalorieGoal(false); }
      const entries = await api.getDiary(new Date().toISOString().slice(0, 10));
      setDiary(entries.map(fromBackendDiary));
      setHistory([]); setRoute('Home'); setParams({});
    } catch (error) { setAccessToken(null); setUser(null); setDiary([]); throw error; }
  };
  const logout = () => { setAccessToken(null); setUser(null); setDiary([]); setHasCalorieGoal(false); setHistory([]); setRoute('Login'); setParams({}); };
  const saveGoal = async (nextGoal: Goal) => { await api.saveGoal(nextGoal.calories); setGoal(nextGoal); setHasCalorieGoal(true); };
  const addDiaryEntry = async (entry: Omit<DiaryEntry, 'id' | 'createdAt'>) => {
    const type = entry.mealType.toUpperCase();
    const mealType: MealType = ['BREAKFAST','LUNCH','DINNER','SNACK'].includes(type) ? type as MealType : 'LUNCH';
    const saved = await api.logMeal({ consumedAt: new Date().toISOString(), mealType, foodName: entry.name, calories: entry.calories });
    setDiary(d => [{ ...fromBackendDiary(saved), protein: entry.protein, carbs: entry.carbs, fat: entry.fat }, ...d]);
  };
  const removeDiaryEntry = async (id: string) => { await api.deleteDiaryEntry(id); setDiary(d => d.filter(x => x.id !== id)); };
  const consumed = useMemo(() => diary.reduce((sum, item) => sum + Number(item.calories || 0), 0), [diary]);
  const saveRecipe = (recipe: Omit<Recipe, 'id' | 'mine'> & { id?: string }) => {
    if (recipe.id) setMyRecipes(r => r.map(x => x.id === recipe.id ? { ...recipe, id: recipe.id!, mine: true } : x));
    else setMyRecipes(r => [{ ...recipe, id: String(Date.now()), mine: true }, ...r]);
  };
  const deleteRecipe = (id: string) => setMyRecipes(r => r.filter(x => x.id !== id));
  const saveReview = (recipeTitle: string, rating: number, comment: string, id?: string) => {
    if (id) setReviews(v => v.map(x => x.id === id ? { ...x, recipeTitle, rating, comment } : x));
    else setReviews(v => [{ id: String(Date.now()), recipeTitle, author: user?.name || 'You', rating, comment, mine: true }, ...v]);
  };
  const deleteReview = (id: string) => setReviews(v => v.filter(x => x.id !== id));
  const updateProfile = async (patch: Partial<User>) => {
    const saved = await api.updateProfile({ name: patch.name, dietaryPreference: patch.dietaryPreference, excludedIngredients: patch.excludedIngredients });
    setUser(u => u ? { ...u, name: saved.name, dietaryPreference: saved.dietaryPreference, excludedIngredients: saved.excludedIngredients } : u);
  };
  const upgradePremium = () => {
    Alert.alert('Premium demo access', 'Ask the project admin to assign your test account the Premium tier. Billing is not connected yet.');
  };
  const cancelSubscription = () => setSubscription(s => ({ ...s, status:'cancelScheduled' }));
  const renewSubscription = () => setSubscription(s => ({ ...s, status:'active' }));

  return <AppContext.Provider value={{ user, route, params, navigate, goBack, login, logout, goal, hasCalorieGoal, setGoal, saveGoal, diary, addDiaryEntry, removeDiaryEntry, consumed, water, setWater, recommendations: recommendedMeals, myRecipes, saveRecipe, deleteRecipe, reviews, saveReview, deleteReview, updateProfile, upgradePremium, subscription, cancelSubscription, renewSubscription }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
