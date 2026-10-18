import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ScreenTitle, uiStyles } from '../components/UI';
import { useApp } from '../context/AppContext';
import { api, MealType, RecommendationData } from '../services/api';
import { colors } from '../theme';
import { Recipe } from '../types';

const TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

export function RecommendationsScreen() {
  const { navigate, user } = useApp();
  const [mealType, setMealType] = useState<MealType>('LUNCH');
  const [data, setData] = useState<RecommendationData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    api.getRecommendations(mealType, new Date().toISOString().slice(0, 10))
      .then(result => { if (active) setData(result); })
      .catch(err => { if (active) { setData(null); setError(String(err.message)); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mealType]);
  return <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.scrollContent}>
    <ScreenTitle title="For you today" subtitle="Nutritionist-approved AI meal ideas" back/>
    {!user?.premium && <Text style={uiStyles.muted}>A Premium test account is required.</Text>}
    {data && <><Text style={styles.remaining}>{data.remainingCalories} kcal</Text><Text style={uiStyles.muted}>Remaining today from your backend diary</Text></>}
    <View style={styles.filters}>{TYPES.map(type => <Pressable key={type} onPress={() => setMealType(type)} style={[styles.filter, mealType === type && styles.selected]}><Text style={styles.filterText}>{type}</Text></Pressable>)}</View>
    {loading && <Text style={uiStyles.muted}>Loading approved meals...</Text>}
    {!!error && <Card><Text style={uiStyles.body}>{error}</Text><Button title="Set calorie goal" secondary onPress={() => navigate('Goal')}/></Card>}
    {data && data.meals.length === 0 && <Text style={uiStyles.muted}>No approved meals match this meal type and your profile yet.</Text>}
    {data?.meals.map(meal => {
      const recipe: Recipe = { id: meal.id, title: meal.title, calories: meal.calories || 0,
        protein: meal.protein || 0, carbs: meal.carbs || 0, fat: meal.fat || 0,
        ingredients: meal.ingredients.split(/\n|,/).map(s => s.trim()).filter(Boolean),
        instructions: meal.instructions.split(/\n/).map(s => s.trim()).filter(Boolean),
        tags: meal.dietaryTags, source: 'AI meal · nutritionist reviewed', mealType: meal.mealType, serving: meal.serving || undefined };
      return <Pressable key={meal.id} onPress={() => navigate('RecipeDetails', { recipe })}><Card>
        <Text style={styles.name}>{meal.title}</Text><Text style={styles.kcal}>{meal.calories} kcal per {meal.serving}</Text>
        <Text style={uiStyles.muted}>{meal.dietaryTags.join(' • ') || 'General wellness'} · Nutritionist reviewed</Text>
      </Card></Pressable>;
    })}
    <Text style={uiStyles.muted}>General wellness guidance only. Check every ingredient and preparation method for your needs.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  remaining: { fontSize: 24, fontWeight: '800', color: colors.primaryDark, marginBottom: 2 },
  name: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 5 },
  kcal: { color: colors.primaryDark, fontWeight: '800', marginBottom: 4 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 14, gap: 6 },
  filter: { padding: 8, borderRadius: 8, backgroundColor: colors.primarySoft },
  selected: { backgroundColor: colors.primary },
  filterText: { fontSize: 11, color: colors.text },
});
