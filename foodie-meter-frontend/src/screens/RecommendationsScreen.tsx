import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Card, ScreenTitle, uiStyles } from '../components/UI';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';

export function RecommendationsScreen(){const {recommendations,navigate,user}=useApp();return <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.scrollContent}><ScreenTitle title="For you today" subtitle={user?.premium?'AI-ranked meals from your profile and calorie goal':'Rule-based meals matched to your calorie goal'} back/><Text style={styles.remaining}>520 kcal</Text><Text style={uiStyles.muted}>Remaining today</Text>{recommendations.map(r=><Pressable key={r.id} onPress={()=>navigate('RecipeDetails',{recipe:r})}><Card><Text style={styles.name}>{r.title}</Text><Text style={styles.kcal}>{r.calories} kcal</Text><Text style={uiStyles.muted}>{r.tags.join(' • ')} • {r.source}</Text></Card></Pressable>)}<Text style={uiStyles.muted}>Recommendations are general dietary guidance and are not medical advice.</Text></ScrollView>}
const styles=StyleSheet.create({remaining:{fontSize:24,fontWeight:'800',color:colors.primaryDark,marginBottom:2},name:{fontSize:16,fontWeight:'800',color:colors.text,marginBottom:5},kcal:{color:colors.primaryDark,fontWeight:'800',marginBottom:4}});
