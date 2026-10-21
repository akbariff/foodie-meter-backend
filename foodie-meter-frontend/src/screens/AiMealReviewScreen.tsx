import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, ScreenTitle, uiStyles } from '../components/UI';
import { useApp } from '../context/AppContext';
import { AiMeal, api, GenerationJob, MealType } from '../services/api';
import { colors } from '../theme';

const DIETS = ['VEGETARIAN', 'VEGAN'];
const INGREDIENTS = ['MILK','EGGS','FISH','SHELLFISH','TREE_NUTS','PEANUTS','WHEAT','SOY','SESAME'];
const TYPES: MealType[] = ['BREAKFAST','LUNCH','DINNER','SNACK'];
type Form = { title: string; ingredients: string; instructions: string; mealType: MealType;
  dietaryTags: string[]; ingredientTags: string[]; serving: string; calories: string;
  protein: string; carbs: string; fat: string; nutritionSource: string; reviewNotes: string };
function formFrom(meal: AiMeal): Form { return {
  title: meal.title, ingredients: meal.ingredients, instructions: meal.instructions, mealType: meal.mealType,
  dietaryTags: meal.dietaryTags, ingredientTags: meal.ingredientTags, serving: meal.serving || '',
  calories: String(meal.calories ?? ''), protein: String(meal.protein ?? ''), carbs: String(meal.carbs ?? ''),
  fat: String(meal.fat ?? ''), nutritionSource: meal.nutritionSource || '', reviewNotes: meal.reviewNotes || '',
}; }

export function AiMealReviewScreen() {
  const { user } = useApp();
  const [status, setStatus] = useState<AiMeal['status']>('PENDING');
  const [meals, setMeals] = useState<AiMeal[]>([]);
  const [selected, setSelected] = useState<AiMeal | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const allowed = user?.role === 'NUTRITIONIST' || user?.role === 'ADMIN';
  const load = async (nextStatus = status) => { try { setMeals(await api.getAiMeals(nextStatus)); setError(''); } catch (err) { setError(String((err as Error).message)); } };
  useEffect(() => { if (allowed) void load(status); }, [allowed, status]);
  useEffect(() => {
    if (!job || !['PENDING','RUNNING'].includes(job.status)) return;
    const timer = setInterval(() => { api.getGenerationJob(job.id).then(setJob).catch(err => setError(String(err.message))); }, 2500);
    return () => clearInterval(timer);
  }, [job?.id, job?.status]);
  useEffect(() => { if (job?.status === 'SUCCEEDED') void load('PENDING'); }, [job?.status]);
  const generate = async () => { setBusy(true); try { setJob(await api.startGeneration(2)); setError(''); } catch (err) { setError(String((err as Error).message)); } finally { setBusy(false); } };
  const patch = (value: Partial<Form>) => setForm(f => f ? { ...f, ...value } : f);
  const toggle = (key: 'dietaryTags' | 'ingredientTags', tag: string) => patch({ [key]: form?.[key].includes(tag) ? form[key].filter(x => x !== tag) : [...(form?.[key] || []), tag] });
  const save = async () => {
    if (!selected || !form) return;
    const numbers = ['calories','protein','carbs','fat'] as const;
    if (numbers.some(key => form[key] && !/^\d+$/.test(form[key]))) return Alert.alert('Check nutrition', 'Nutrition values must be whole numbers.');
    setBusy(true);
    try {
      const updated = await api.updateAiMeal(selected.id, {
        title: form.title, ingredients: form.ingredients, instructions: form.instructions, mealType: form.mealType,
        dietaryTags: form.dietaryTags, ingredientTags: form.ingredientTags, serving: form.serving || null,
        calories: form.calories ? Number(form.calories) : null, protein: form.protein ? Number(form.protein) : null,
        carbs: form.carbs ? Number(form.carbs) : null, fat: form.fat ? Number(form.fat) : null,
        nutritionSource: form.nutritionSource || null, reviewNotes: form.reviewNotes,
      });
      setSelected(updated); setForm(formFrom(updated)); await load(); Alert.alert('Saved', 'Meal saved. Approve only after checking every value.');
    } catch (err) { Alert.alert('Save failed', String((err as Error).message)); } finally { setBusy(false); }
  };
  const approve = async () => {
    if (!selected) return;
    Alert.alert('Confirm review', 'Have you checked the ingredients, exclusion tags, serving and nutrition source?', [
      { text: 'Cancel' }, { text: 'Approve', onPress: async () => {
        try { await api.approveAiMeal(selected.id); setSelected(null); setForm(null); await load(); }
        catch (err) { Alert.alert('Approval failed', String((err as Error).message)); }
      } },
    ]);
  };
  const reject = async () => {
    if (!selected || !form) return;
    if (!form.reviewNotes.trim()) return Alert.alert('Reason required', 'Add review notes before rejecting.');
    try { await api.rejectAiMeal(selected.id, form.reviewNotes); setSelected(null); setForm(null); await load(); }
    catch (err) { Alert.alert('Reject failed', String((err as Error).message)); }
  };
  if (!allowed) return <ScrollView style={uiStyles.screen}><ScreenTitle title="AI meal review" back/><Text>Nutritionist access required.</Text></ScrollView>;
  return <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.scrollContent} keyboardShouldPersistTaps="handled">
    <ScreenTitle title="AI meal review" subtitle="Check every candidate before Premium users can see it" back/>
    <Button title={busy ? 'Working...' : 'Generate 2 meal candidates'} disabled={busy || !!job && ['PENDING','RUNNING'].includes(job.status)} onPress={generate}/>
    {job && <Card><Text style={uiStyles.body}>Job: {job.status}</Text>{!!job.error && <Text style={uiStyles.muted}>{job.error}</Text>}</Card>}
    {!!error && <Text style={styles.error}>{error}</Text>}
    <View style={styles.tabs}>{(['PENDING','APPROVED','REJECTED'] as AiMeal['status'][]).map(value =>
      <Pressable key={value} style={[styles.tab,status===value&&styles.selectedTab]} onPress={()=>{setStatus(value);setSelected(null);setForm(null)}}><Text>{value}</Text></Pressable>)}</View>
    <Button title="Refresh list" secondary onPress={()=>void load()}/>
    {meals.map(meal => <Pressable key={meal.id} onPress={()=>{setSelected(meal);setForm(formFrom(meal))}}><Card>
      <Text style={styles.mealTitle}>{meal.title}</Text><Text style={uiStyles.muted}>{meal.mealType} · {meal.status}</Text>
    </Card></Pressable>)}
    {selected && form && <Card>
      <Text style={uiStyles.h2}>Review: {selected.title}</Text>
      <Text style={uiStyles.muted}>Serving size and nutrition fields start as AI estimates. Check and correct them using a reliable source. Set dietary and ingredient tags yourself from the recipe before approval.</Text>
      <Field label="Title" value={form.title} onChangeText={title=>patch({title})}/>
      <Field label="Ingredients" multiline value={form.ingredients} onChangeText={ingredients=>patch({ingredients})}/>
      <Field label="Instructions" multiline value={form.instructions} onChangeText={instructions=>patch({instructions})}/>
      <Text style={uiStyles.h2}>Meal type</Text>{TYPES.map(value=><Button key={value} title={`${form.mealType===value?'✓ ':''}${value}`} secondary onPress={()=>patch({mealType:value})}/>)}
      <Text style={uiStyles.h2}>Verified dietary tags</Text>{DIETS.map(tag=><Button key={tag} title={`${form.dietaryTags.includes(tag)?'✓ ':''}${tag}`} secondary onPress={()=>toggle('dietaryTags',tag)}/>)}
      <Text style={uiStyles.h2}>Ingredient exclusion tags</Text>{INGREDIENTS.map(tag=><Button key={tag} title={`${form.ingredientTags.includes(tag)?'✓ ':''}${tag}`} secondary onPress={()=>toggle('ingredientTags',tag)}/>)}
      <Field label="Serving size" value={form.serving} onChangeText={serving=>patch({serving})}/>
      {(['calories','protein','carbs','fat'] as const).map(key=><Field key={key} label={`${key} ${key==='calories'?'kcal':'g'}`} keyboardType="numeric" value={form[key]} onChangeText={value=>patch({[key]:value})}/>)}
      <Field label="Verified nutrition source / calculation" value={form.nutritionSource} onChangeText={nutritionSource=>patch({nutritionSource})}/>
      <Field label="Review notes / rejection reason" multiline value={form.reviewNotes} onChangeText={reviewNotes=>patch({reviewNotes})}/>
      <Button title="Save changes" disabled={busy} onPress={()=>void save()}/>
      {selected.status==='PENDING' && <><Button title="Approve verified meal" onPress={()=>void approve()}/><Button title="Reject" danger onPress={()=>void reject()}/></>}
      <Text style={uiStyles.muted}>Generated drafts have no diet or exclusion tags until you review them. Saving an approved meal returns it to pending review.</Text>
    </Card>}
  </ScrollView>;
}
const styles=StyleSheet.create({ tabs:{flexDirection:'row',gap:6,marginVertical:12},tab:{padding:8,backgroundColor:colors.primarySoft,borderRadius:8},selectedTab:{backgroundColor:colors.primary},mealTitle:{fontWeight:'700',color:colors.text},error:{color:colors.danger,marginVertical:8} });
