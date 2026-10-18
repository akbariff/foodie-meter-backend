import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, ScreenTitle, uiStyles } from '../components/UI';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';

export function HomeScreen() {
  const { user, goal, hasCalorieGoal, consumed, navigate, water, setWater } = useApp();
  const remaining = Math.max(goal.calories - consumed, 0);
  const progress = Math.min(consumed / goal.calories, 1);

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.scrollContent}>
      <Image
        source={require('../assets/foodiemeter-logo.png')}
        style={styles.brandLogo}
        resizeMode="contain"
      />

      <ScreenTitle
        title={`Good afternoon, ${user?.name?.split(' ')[0] || 'Foodie'}`}
        subtitle={user?.premium ? 'Premium dashboard' : 'Free dashboard'}
      />

      <Text style={styles.section}>Daily calorie target</Text>
      {hasCalorieGoal ? <><Text style={styles.big}>{consumed.toLocaleString()} / {goal.calories.toLocaleString()} kcal</Text>
      <View style={styles.track}><View style={[styles.fill, { width: `${progress * 100}%` }]} /></View>
      <Text style={uiStyles.muted}>{remaining} kcal remaining today</Text></> :
      <Pressable onPress={() => navigate('Goal')}><Text style={uiStyles.body}>Set a calorie goal to see your daily progress and meal recommendations.</Text></Pressable>}

      <View style={styles.quickRow}>
        {[
          ['＋', 'Log meal', 'LogMeal'],
          ['✦', user?.premium ? 'AI meals' : 'Meals', 'Recommendations'],
          ['▥', 'Insights', 'Insights']
        ].map(([g, l, s]) => (
          <Pressable key={l} style={styles.quick} onPress={() => navigate(s as any)}>
            <Text style={styles.quickGlyph}>{g}</Text>
            <Text style={styles.quickText}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <Text style={styles.section}>Personalized nudge</Text>
        <Text style={uiStyles.body}>You’re on track this week. A higher-protein dinner would balance today nicely.</Text>
      </Card>

      <View style={styles.space}>
        <View>
          <Text style={styles.section}>Current streak</Text>
          <Text style={styles.streak}>12 days</Text>
          <Text style={uiStyles.muted}>2 badges unlocked this week</Text>
        </View>
        <Text style={{ fontSize: 30 }}>🔥</Text>
      </View>

      <Card>
        <Text style={styles.section}>Meal recommendations</Text>
        <Pressable onPress={() => navigate('Recommendations')}>
          <Text style={styles.meal}>View reviewed meal ideas</Text>
          <Text style={uiStyles.muted}>Matched to your calorie goal and dietary preference</Text>
        </Pressable>
      </Card>

      <Card>
        <View style={styles.space}>
          <View>
            <Text style={styles.section}>Water intake</Text>
            <Text style={uiStyles.body}>{water} / 10 glasses</Text>
          </View>
          <View style={styles.waterBtns}>
            <Pressable onPress={() => setWater(Math.max(0, water - 1))}><Text style={styles.smallBtn}>−</Text></Pressable>
            <Pressable onPress={() => setWater(Math.min(10, water + 1))}><Text style={styles.smallBtn}>＋</Text></Pressable>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  brandLogo: {
    width: 128,
    height: 84,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 2,
  },
  section: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 5 },
  big: { fontSize: 24, fontWeight: '800', color: colors.primaryDark },
  track: { height: 8, backgroundColor: colors.line, borderRadius: 99, marginTop: 10, marginBottom: 7, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 22 },
  quick: { width: '31%', alignItems: 'center' },
  quickGlyph: { fontSize: 26, color: colors.primaryDark },
  quickText: { fontSize: 11, color: colors.text, marginTop: 5 },
  space: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  streak: { fontSize: 24, fontWeight: '800', color: colors.primaryDark },
  meal: { fontSize: 17, fontWeight: '800', color: colors.primaryDark, marginBottom: 5 },
  waterBtns: { flexDirection: 'row', gap: 8 },
  smallBtn: { width: 36, height: 36, textAlign: 'center', textAlignVertical: 'center', fontSize: 20, color: colors.primaryDark, backgroundColor: colors.primarySoft, borderRadius: 18 }
});
