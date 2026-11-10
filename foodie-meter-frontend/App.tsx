import React from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import { AppProvider, useApp } from './src/context/AppContext';
import { BottomNav } from './src/components/UI';
import { LoginScreen, RegisterScreen, VerifyEmailScreen, ForgotPasswordScreen } from './src/screens/AuthScreens';
import { HomeScreen } from './src/screens/HomeScreen';
import { GoalScreen } from './src/screens/GoalScreen';
import { RecommendationsScreen } from './src/screens/RecommendationsScreen';
import { RecipeDetailsScreen, MyRecipesScreen, RecipeEditorScreen } from './src/screens/RecipeScreens';
import { LogMealScreen, DiaryScreen } from './src/screens/DiaryScreens';
import { ProfileScreen, PremiumScreen, InsightsScreen, ManageSubscriptionScreen } from './src/screens/ProfileScreens';
import { ReviewsScreen } from './src/screens/ReviewsScreen';
import { AiMealReviewScreen } from './src/screens/AiMealReviewScreen';
import { colors } from './src/theme';
import { GamificationScreen } from './src/screens/GamificationScreen';
import { AdminDashboardScreen } from './src/screens/AdminScreen';
import { NutritionistScreen } from './src/screens/NutritionistScreen';

function Router(){
 const { route, user }=useApp();
 const screens:any={
    Login:LoginScreen,
    Register:RegisterScreen,
    VerifyEmail:VerifyEmailScreen,
    ForgotPassword:ForgotPasswordScreen,
    Home:HomeScreen,Goal:GoalScreen,
    Recommendations:RecommendationsScreen,
    RecipeDetails:RecipeDetailsScreen,
    LogMeal:LogMealScreen,
    Diary:DiaryScreen,
    MyRecipes:MyRecipesScreen,
    RecipeEditor:RecipeEditorScreen,
    Profile:ProfileScreen,
    Reviews:ReviewsScreen,
    Premium:PremiumScreen,
    Insights:InsightsScreen,
    ManageSubscription:ManageSubscriptionScreen,
    AiMealReview:AiMealReviewScreen,
    Gamification: GamificationScreen, 
    AdminDashboard: AdminDashboardScreen,
    Nutritionist: NutritionistScreen,
};
 const Screen=screens[route] || LoginScreen;
 const authRoutes=['Login','Register','VerifyEmail','ForgotPassword'];
 const showNav=!!user && !authRoutes.includes(route) && !['RecipeDetails','RecipeEditor','Goal','Recommendations','Reviews','Insights','MyRecipes','ManageSubscription','AiMealReview','Gamification','AdminDashboard','Nutritionist'].includes(route);
 return <View style={styles.root}><Screen/>{showNav&&<BottomNav/>}</View>;
}

export default function App(){return <AppProvider><Router/></AppProvider>}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:colors.background,paddingTop:Platform.OS==='android'?(StatusBar.currentHeight||24):44}});
