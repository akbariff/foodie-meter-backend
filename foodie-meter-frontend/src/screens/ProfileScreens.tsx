import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, ScreenTitle, uiStyles } from '../components/UI';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';
import { DietaryPreference } from '../services/api';

const EXCLUSIONS = ['MILK','EGGS','FISH','SHELLFISH','TREE_NUTS','PEANUTS','WHEAT','SOY','SESAME'];
export function ProfileScreen(){
 const {user,updateProfile,logout,navigate}=useApp();
 const [name,setName]=useState(user?.name||'');
 const [diet,setDiet]=useState<DietaryPreference>(user?.dietaryPreference||'ANY');
 const [excluded,setExcluded]=useState<string[]>(user?.excludedIngredients||[]);
 const toggle=(tag:string)=>setExcluded(v=>v.includes(tag)?v.filter(x=>x!==tag):[...v,tag]);
 return <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.scrollContent}>
   <ScreenTitle title="Profile" subtitle={user?.role==='NUTRITIONIST'?'Nutritionist':user?.premium?'Premium account':'Free account'}/>
   <Field label="Name" value={name} onChangeText={setName}/>
   <Field label="Email" value={user?.email||''} editable={false}/>
   <Text style={uiStyles.h2}>Dietary preference</Text>
   {(['ANY','VEGETARIAN','VEGAN'] as DietaryPreference[]).map(value=><Button key={value} title={`${diet===value?'✓ ':''}${value}`} secondary onPress={()=>setDiet(value)}/>)}
   <Text style={uiStyles.h2}>Ingredients to exclude</Text>
   {EXCLUSIONS.map(tag=><Button key={tag} title={`${excluded.includes(tag)?'✓ ':''}${tag.replace('_',' ')}`} secondary onPress={()=>toggle(tag)}/>)}
   <Text style={uiStyles.muted}>Always check ingredients and preparation for food allergies; these filters cannot guarantee safety.</Text>
   <Button title="Save profile" onPress={async()=>{try{await updateProfile({name,dietaryPreference:diet,excludedIngredients:excluded});Alert.alert('Saved','Profile updated.')}catch(error){Alert.alert('Save failed',String((error as Error).message))}}}/>
   {(user?.role==='NUTRITIONIST'||user?.role==='ADMIN')&&<Button title="Review AI meals" onPress={()=>navigate('AiMealReview')}/>}
   <Button title="Set calorie goal" secondary onPress={()=>navigate('Goal')}/>
   <Button title="My recipes" secondary onPress={()=>navigate('MyRecipes')}/>
   <Button title="Recipe reviews" secondary onPress={()=>navigate('Reviews')}/>
   <Button title="Log out" danger onPress={logout}/>
 </ScrollView>;
}

export function PremiumScreen(){const {user,upgradePremium,navigate}=useApp(); if(user?.premium)return <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.scrollContent}><ScreenTitle title="Premium" subtitle="Premium test access is active"/><Card><Text style={styles.active}>✦ Premium test account</Text><Text style={uiStyles.body}>Nutritionist-reviewed AI meal recommendations are available.</Text></Card><Button title="AI meal recommendations" onPress={()=>navigate('Recommendations')}/> <Button title="Progress & insights" secondary onPress={()=>navigate('Insights')}></Button> <Button title="Achievements & community" secondary onPress={() => navigate('Gamification')}/></ScrollView>;
return <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.scrollContent}><ScreenTitle title="Premium" subtitle="AI meal recommendations for Premium test accounts"/><Card><Text style={uiStyles.body}>This FYP version has no payment flow. An admin can assign Premium access to a verified test account.</Text></Card><Button title="How to get demo access" onPress={upgradePremium}/></ScrollView>}

export function InsightsScreen(){const {consumed,goal,diary}=useApp(); const protein=diary.reduce((s,x)=>s+(x.protein||0),0); return <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.scrollContent}><ScreenTitle title="Progress & insights" subtitle="A lightweight demo of your Premium analytics" back/><Card><Text style={styles.metric}>{Math.round((consumed/goal.calories)*100)}%</Text><Text style={uiStyles.muted}>of today’s calorie target consumed</Text></Card><Card><Text style={styles.metric}>{protein} g</Text><Text style={uiStyles.muted}>protein logged today • target {goal.protein} g</Text></Card><Card><Text style={styles.active}>Personalized nudge</Text><Text style={uiStyles.body}>{protein<goal.protein?'You are below your protein target. Consider a high-protein dinner.':'Protein intake is on track today.'}</Text></Card></ScrollView>}

export function ManageSubscriptionScreen(){
 const {subscription,cancelSubscription,renewSubscription}=useApp();
 const billingDate=new Date(subscription.nextBillingDate).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
 const cancelling=subscription.status==='cancelScheduled';
 const confirmCancel=()=>Alert.alert(
   'Cancel Premium subscription?',
   `You will keep Premium access until ${billingDate}. After that, your account will return to the Free plan.`,
   [
     {text:'Keep Premium',style:'cancel'},
     {text:'Cancel subscription',style:'destructive',onPress:()=>{cancelSubscription();Alert.alert('Cancellation scheduled',`Your Premium access will remain active until ${billingDate}.`);}},
   ]
 );
 const confirmRenew=()=>Alert.alert(
   'Keep Premium active?',
   'This will remove the scheduled cancellation and keep your Premium subscription active.',
   [{text:'Not now',style:'cancel'},{text:'Keep Premium',onPress:()=>{renewSubscription();Alert.alert('Premium continued','Your subscription will remain active.');}}]
 );
 return <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.scrollContent}>
   <ScreenTitle title="Manage subscription" subtitle="View or change your FoodieMeter plan" back/>
   <Card>
     <View style={styles.planHeader}>
       <View>
         <Text style={styles.planName}>Premium</Text>
         <Text style={uiStyles.muted}>Monthly plan</Text>
       </View>
       <View style={[styles.statusPill,cancelling&&styles.statusPillWarning]}>
         <Text style={[styles.statusText,cancelling&&styles.statusTextWarning]}>{cancelling?'Cancellation scheduled':'Active'}</Text>
       </View>
     </View>
     <Text style={styles.subscriptionPrice}>${subscription.price.toFixed(2)} / month</Text>
     <View style={uiStyles.divider}/>
     <View style={uiStyles.spaceBetween}><Text style={uiStyles.muted}>{cancelling?'Premium access until':'Next billing date'}</Text><Text style={styles.detailValue}>{billingDate}</Text></View>
   </Card>

   <Card>
     <Text style={uiStyles.h2}>Included with Premium</Text>
     <Text style={uiStyles.body}>✓ Personalized AI meal recommendations</Text>
     <Text style={uiStyles.body}>✓ Monthly calorie reports</Text>
     <Text style={uiStyles.body}>✓ Predictive progress insights</Text>
     <Text style={uiStyles.body}>✓ Image-assisted meal logging</Text>
     <Text style={uiStyles.body}>✓ Gamification & social features</Text>
   </Card>

   {cancelling ? <>
     <Card style={styles.noticeCard}>
       <Text style={styles.noticeTitle}>Your cancellation is scheduled</Text>
       <Text style={uiStyles.body}>You can continue using Premium until {billingDate}. You can keep Premium active at any time before then.</Text>
     </Card>
     <Button title="Keep Premium active" onPress={confirmRenew}/>
   </> : <>
     <Button title="Cancel subscription" danger onPress={confirmCancel}/>
   </>}
   <Text style={uiStyles.muted}>Demo mode: subscription changes are stored locally in the app. When your backend subscription endpoints are ready, these actions can call the real API.</Text>
 </ScrollView>
}

const styles=StyleSheet.create({
 active:{fontSize:15,fontWeight:'800',color:colors.primaryDark,marginBottom:8},
 price:{fontSize:28,fontWeight:'900',color:colors.primaryDark,marginBottom:12},
 metric:{fontSize:30,fontWeight:'900',color:colors.primaryDark},
 planHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
 planName:{fontSize:22,fontWeight:'900',color:colors.text},
 subscriptionPrice:{fontSize:24,fontWeight:'900',color:colors.primaryDark},
 statusPill:{paddingHorizontal:10,paddingVertical:6,borderRadius:999,backgroundColor:colors.primarySoft},
 statusPillWarning:{backgroundColor:'#FFF3D9'},
 statusText:{fontSize:11,fontWeight:'800',color:colors.primaryDark},
 statusTextWarning:{color:'#996515'},
 detailValue:{fontSize:13,fontWeight:'700',color:colors.text},
 noticeCard:{backgroundColor:'#FFF9EC'},
 noticeTitle:{fontSize:15,fontWeight:'800',color:'#8A6411',marginBottom:6}
});
