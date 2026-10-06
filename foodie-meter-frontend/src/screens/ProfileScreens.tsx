import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, ScreenTitle, uiStyles } from '../components/UI';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';

export function ProfileScreen(){const {user,updateProfile,logout,navigate}=useApp(); const [name,setName]=useState(user?.name||''); const [email,setEmail]=useState(user?.email||''); const [diet,setDiet]=useState(user?.dietaryPreference||''); return <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.scrollContent}><ScreenTitle title="Profile" subtitle={user?.premium?'Premium account':'Free account'}/><Field label="Name" value={name} onChangeText={setName}/><Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none"/><Field label="Dietary preference" value={diet} onChangeText={setDiet}/><Button title="Save profile" onPress={()=>{updateProfile({name,email,dietaryPreference:diet});Alert.alert('Saved','Profile updated.')}}/><Button title="Change password" secondary onPress={()=>Alert.alert('Change password','Connect this button to your backend change-password endpoint.')}/><Button title="My recipes" secondary onPress={()=>navigate('MyRecipes')}/><Button title="Recipe reviews" secondary onPress={()=>navigate('Reviews')}/><Button title="Set calorie goal" secondary onPress={()=>navigate('Goal')}/><Button title="Log out" danger onPress={logout}/></ScrollView>}

export function PremiumScreen(){const {user,upgradePremium,navigate}=useApp(); if(user?.premium)return <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.scrollContent}><ScreenTitle title="Premium" subtitle="Your Premium membership is active"/><Card><Text style={styles.active}>✦ Active Premium subscription</Text><Text style={uiStyles.body}>AI meal recommendations, monthly reporting, advanced insights and Premium tools are unlocked.</Text></Card><Button title="AI meal recommendations" onPress={()=>navigate('Recommendations')}/><Button title="Progress & insights" secondary onPress={()=>navigate('Insights')}/><Button title="Manage subscription" secondary onPress={()=>navigate('ManageSubscription')}/></ScrollView>;
return <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.scrollContent}><ScreenTitle title="Upgrade to Premium" subtitle="Unlock FoodieMeter’s advanced features"/><Card><Text style={styles.price}>$6.99 / month</Text><Text style={uiStyles.body}>✓ Personalized AI meal recommendations{`\n`}✓ Monthly calorie reports{`\n`}✓ Predictive progress insights{`\n`}✓ Image-assisted meal logging{`\n`}✓ Gamification & social features</Text></Card><Button title="Upgrade to Premium" onPress={upgradePremium}/><Text style={uiStyles.muted}>Demo only. Replace this action with your payment/subscription backend.</Text></ScrollView>}

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
