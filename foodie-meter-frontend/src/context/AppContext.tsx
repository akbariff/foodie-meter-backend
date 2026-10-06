import React, { createContext, useContext, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { DiaryEntry, Goal, Recipe, Review, ScreenName } from '../types';
import { recommendedMeals, starterReviews } from '../data/mock';

type User = { name: string; email: string; premium: boolean; dietaryPreference: string };

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
  login: (email: string, password: string) => boolean;
  logout: () => void;
  goal: Goal;
  setGoal: (goal: Goal) => void;
  diary: DiaryEntry[];
  addDiaryEntry: (entry: Omit<DiaryEntry, 'id' | 'createdAt'>) => void;
  removeDiaryEntry: (id: string) => void;
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
  updateProfile: (patch: Partial<User>) => void;
  upgradePremium: () => void;
  subscription: Subscription;
  cancelSubscription: () => void;
  renewSubscription: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [route, setRoute] = useState<ScreenName>('Login');
  const [params, setParams] = useState<any>({});
  const [history, setHistory] = useState<{ screen: ScreenName; params?: any }[]>([]);
  const [goal, setGoal] = useState<Goal>({ goalType: 'Maintain', calories: 2000, protein: 120, carbs: 220, fat: 65, activity: 'Moderately active' });
  const [diary, setDiary] = useState<DiaryEntry[]>([
    { id: 'd1', name: 'Greek yogurt & berries', calories: 280, protein: 18, carbs: 35, fat: 6, mealType: 'Breakfast', createdAt: new Date().toISOString() },
    { id: 'd2', name: 'Chicken rice bowl', calories: 520, protein: 34, carbs: 62, fat: 14, mealType: 'Lunch', createdAt: new Date().toISOString() },
    { id: 'd3', name: 'Banana', calories: 120, protein: 1, carbs: 31, fat: 0, mealType: 'Snack', createdAt: new Date().toISOString() },
  ]);
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
  const login = (email: string, password: string) => {
    if (!email.trim() || !password.trim()) return false;
    const premium = email.toLowerCase().includes('premium');
    setUser({ name: premium ? 'Alex' : 'FoodieMeter User', email, premium, dietaryPreference: 'No preference' });
    setHistory([]); setRoute('Home'); setParams({}); return true;
  };
  const logout = () => { setUser(null); setHistory([]); setRoute('Login'); setParams({}); };
  const addDiaryEntry = (entry: Omit<DiaryEntry, 'id' | 'createdAt'>) => setDiary(d => [{ ...entry, id: String(Date.now()), createdAt: new Date().toISOString() }, ...d]);
  const removeDiaryEntry = (id: string) => setDiary(d => d.filter(x => x.id !== id));
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
  const updateProfile = (patch: Partial<User>) => setUser(u => u ? { ...u, ...patch } : u);
  const upgradePremium = () => {
    setUser(u => u ? { ...u, premium: true } : u);
    const next = new Date(); next.setDate(next.getDate() + 30);
    setSubscription({ plan:'Premium', status:'active', price:6.99, billingCycle:'Monthly', nextBillingDate:next.toISOString() });
    Alert.alert('Premium activated', 'Demo mode: your account is now Premium.');
  };
  const cancelSubscription = () => setSubscription(s => ({ ...s, status:'cancelScheduled' }));
  const renewSubscription = () => setSubscription(s => ({ ...s, status:'active' }));

  return <AppContext.Provider value={{ user, route, params, navigate, goBack, login, logout, goal, setGoal, diary, addDiaryEntry, removeDiaryEntry, consumed, water, setWater, recommendations: recommendedMeals, myRecipes, saveRecipe, deleteRecipe, reviews, saveReview, deleteReview, updateProfile, upgradePremium, subscription, cancelSubscription, renewSubscription }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
