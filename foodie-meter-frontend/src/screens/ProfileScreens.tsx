import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, ScreenTitle, uiStyles } from '../components/UI';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';
import { api, AnalyticsOverview, DietaryPreference } from '../services/api';


const EXCLUSIONS = ['MILK','EGGS','FISH','SHELLFISH','TREE_NUTS','PEANUTS','WHEAT','SOY','SESAME'];
export function ProfileScreen(){
 const {user,updateProfile,logout,navigate}=useApp();
 const [name,setName]=useState(user?.name||'');
 const [diet,setDiet]=useState<DietaryPreference>(user?.dietaryPreference||'ANY');
 const [excluded,setExcluded]=useState<string[]>(user?.excludedIngredients||[]);
 const [currentPassword, setCurrentPassword] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');
 const [changingPassword, setChangingPassword] = useState(false);
 const toggle=(tag:string)=>setExcluded(v=>v.includes(tag)?v.filter(x=>x!==tag):[...v,tag]);
 const changePassword = async () => {
  if (!currentPassword) {
    Alert.alert('Current password required', 'Enter your current password.');
    return;
  }

  if (newPassword.length < 8) {
    Alert.alert('Password too short', 'Your new password must be at least 8 characters.');
    return;
  }

  if (newPassword !== confirmPassword) {
    Alert.alert('Passwords do not match','Confirm your new password correctly.');
    return;
  }

  if (currentPassword === newPassword) {
    Alert.alert('Choose a different password','Your new password must be different from your current password.');
    return;
  }

  try {
    setChangingPassword(true);
    await api.changePassword(currentPassword,newPassword);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    Alert.alert('Password changed','Your password has been changed successfully.');
  } catch (error) {
    Alert.alert('Password change failed',
      String((error as Error).message)
    );
  } finally {
    setChangingPassword(false);
  }
};
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
    <Card>
  <Text style={uiStyles.h2}>
    Change password
  </Text>

  <Field
    label="Current password"
    value={currentPassword}
    onChangeText={setCurrentPassword}
    secureTextEntry
    autoCapitalize="none"
  />

  <Field
    label="New password"
    value={newPassword}
    onChangeText={setNewPassword}
    secureTextEntry
    autoCapitalize="none"
  />

  <Field
    label="Confirm new password"
    value={confirmPassword}
    onChangeText={setConfirmPassword}
    secureTextEntry
    autoCapitalize="none"
  />

  <Text style={uiStyles.muted}>
    Password must be at least 8 characters.
  </Text>

  <Button
    title={
      changingPassword
        ? 'Changing password...'
        : 'Change password'
    }
    disabled={changingPassword}
    onPress={() =>
      void changePassword()
    }
  />
</Card>
   {(user?.role==='NUTRITIONIST'||user?.role==='ADMIN')&&<Button title="Nutritionist tools" onPress={()=>navigate('Nutritionist')}/>}
   {(user?.role==='NUTRITIONIST'||user?.role==='ADMIN')&&<Button title="Review AI meals" secondary onPress={()=>navigate('AiMealReview')}/>}
   <Button title="Set calorie goal" secondary onPress={()=>navigate('Goal')}/>
   <Button title="My recipes" secondary onPress={()=>navigate('MyRecipes')}/>
   <Button title="Recipe reviews" secondary onPress={()=>navigate('Reviews')}/>
   <Button title="Log out" danger onPress={logout}/>
 </ScrollView>;
}

export function PremiumScreen() {
  const {
    user,
    subscribePremium,
    navigate,
  } = useApp();

  const [
    subscribing,
    setSubscribing,
  ] = useState(false);


  const confirmSubscription = () => {
    Alert.alert(
      'Start mock Premium subscription?',
      'This is an FYP demonstration subscription. No payment details will be collected and no real money will be charged.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text:
            'Confirm mock subscription',

          onPress: async () => {
            try {
              setSubscribing(true);

              await subscribePremium();

              Alert.alert(
                'Premium activated',
                'Your mock Premium subscription is now active. No real payment was made.'
              );
            } catch (error) {
              Alert.alert(
                'Subscription failed',
                String(
                  (error as Error)
                    .message
                )
              );
            } finally {
              setSubscribing(false);
            }
          },
        },
      ]
    );
  };


  if (user?.premium) {
    return (
      <ScrollView
        style={uiStyles.screen}
        contentContainerStyle={
          uiStyles.scrollContent
        }
      >
        <ScreenTitle
          title="Premium"
          subtitle="Premium access is active"
        />

        <Card>
          <Text style={styles.active}>
            ✦ Premium account
          </Text>

          <Text style={uiStyles.body}>
            Premium features are enabled
            for this account.
          </Text>
        </Card>

        <Button
          title="AI meal recommendations"
          onPress={() =>
            navigate(
              'Recommendations'
            )
          }
        />

        <Button
          title="Progress & insights"
          secondary
          onPress={() =>
            navigate('Insights')
          }
        />

        <Button
          title="Achievements & community"
          secondary
          onPress={() =>
            navigate(
              'Gamification'
            )
          }
        />

        <Button
          title="Manage subscription"
          secondary
          onPress={() =>
            navigate(
              'ManageSubscription'
            )
          }
        />

        <Text style={uiStyles.muted}>
          FoodieMeter uses simulated
          subscription billing for this
          FYP prototype. No real financial
          transaction is performed.
        </Text>
      </ScrollView>
    );
  }


  return (
    <ScrollView
      style={uiStyles.screen}
      contentContainerStyle={
        uiStyles.scrollContent
      }
    >
      <ScreenTitle
        title="Premium"
        subtitle="Unlock the Premium FoodieMeter experience"
      />

      <Card>
        <Text style={styles.active}>
          ✦ FoodieMeter Premium
        </Text>

        <Text style={uiStyles.body}>
          This FYP uses a simulated
          subscription flow for
          demonstration purposes.
        </Text>

        <View style={uiStyles.divider} />

        <Text style={uiStyles.body}>
          ✓ Personalized AI meal
          recommendations
        </Text>

        <Text style={uiStyles.body}>
          ✓ Predictive progress insights
        </Text>

        <Text style={uiStyles.body}>
          ✓ Achievements and challenges
        </Text>

        <Text style={uiStyles.body}>
          ✓ Community leaderboard and
          social features
        </Text>
      </Card>

      <Card>
        <Text style={uiStyles.h2}>
          Mock subscription
        </Text>

        <Text style={uiStyles.body}>
          No card details are required.
        </Text>

        <Text style={uiStyles.body}>
          No real payment will be made.
        </Text>

        <Text style={uiStyles.muted}>
          Confirming activates Premium
          in the FoodieMeter database for
          demonstration and testing.
        </Text>
      </Card>

      <Button
        title={
          subscribing
            ? 'Activating Premium...'
            : 'Start mock Premium subscription'
        }
        disabled={subscribing}
        onPress={
          confirmSubscription
        }
      />
    </ScrollView>
  );
}

export function InsightsScreen() {
  const { user, navigate } = useApp();
  const isPremium = Boolean(user?.premium);
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [overview,setOverview,] =useState<AnalyticsOverview | null>(null);
  const [loading,setLoading,] = useState(true);
  const [error,setError,] = useState('');
  const load = async (selectedDays:| 7| 30| 90 = days) => {
    try {
      setLoading(true);
      setError('');
      const data =await api.getAnalyticsOverview(selectedDays);
      setOverview(data);
    } catch (err) {
      setError(
        String(
          (err as Error).message || err)
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {if (isPremium) void load(days);}, [days, isPremium]);

  // Analytics is Premium-only, so Free users get an upgrade prompt instead of an error.
  if (!isPremium) {
    return (
      <ScrollView style={uiStyles.screen}
        contentContainerStyle={uiStyles.scrollContent}>
        <ScreenTitle title="Progress & insights"
          subtitle="Your nutrition trends and progress projections"
          back
        />
        <Card>
          <Text style={styles.active}>✦ Premium feature</Text>
          <Text style={uiStyles.body}>
            Upgrade to Premium to see your average calorie intake, goal adherence,
            today&apos;s projection and weight trends.
          </Text>
          <Button title="View Premium" onPress={() => navigate('Premium')} />
        </Card>
      </ScrollView>
    );
  }
  const recentDays =overview?.caloriesTrend.filter(item =>item.consumedCalories > 0).slice(-7).reverse() ?? [];
  return (
    <ScrollView style={uiStyles.screen}
      contentContainerStyle={uiStyles.scrollContent}>
      <ScreenTitle title="Progress & insights"
        subtitle="Your nutrition trends and progress projections"
        back
      />
      <Card>
        <Text style={uiStyles.h2}>Analysis period</Text>
        <Button
          title={days === 7 ? '✓ Last 7 days' : 'Last 7 days'}
          secondary onPress={() =>setDays(7)}/>
        <Button
          title={days === 30 ? '✓ Last 30 days' : 'Last 30 days'}
          secondary onPress={() =>setDays(30)} />
        <Button
          title={days === 90? '✓ Last 90 days': 'Last 90 days'}
          secondary onPress={() =>setDays(90)}/>
      </Card>

      {loading && (
        <Card>
          <Text style={uiStyles.body}>
            Loading your progress...
          </Text>
        </Card>
      )}

      {!!error && (
        <Card>
          <Text style={uiStyles.h2}>
            Unable to load analytics
          </Text>
          <Text style={uiStyles.body}>
            {error}
          </Text>
          <Button title="Try again"
            onPress={() =>void load()}/>
        </Card>
      )}


      {!loading && !error && overview && (
          <>
            <Card>
              <Text style={uiStyles.h2}>
                Average calorie intake
              </Text>
              <Text style={styles.metric}>
                {overview.averageDailyCalories !== null ? `${Math.round(overview.averageDailyCalories)} kcal` : 'No data'}
              </Text>

              <Text style={uiStyles.muted}>
                Average across days where
                meals were logged during the
                selected period.
              </Text>
            </Card>

            <Card>
              <Text style={uiStyles.h2}>
                Goal adherence
              </Text>

              <Text style={styles.metric}>
                {overview.adherenceRate !== null ? `${Math.round(overview.adherenceRate)}%` : 'No data'}
              </Text>

              <Text style={uiStyles.muted}>
                Percentage of logged days
                where calorie intake stayed
                close to your calorie target.
              </Text>
            </Card>


            <Card>
              <Text style={uiStyles.h2}>
                Today&apos;s projection
              </Text>

              {overview.todayProjection ? (
                <>
                  <Text style={styles.metric}>
                    {
                      overview.todayProjection.projectedEndOfDayCalories
                    }{' '}
                    kcal
                  </Text>

                  <Text style={uiStyles.body}>
                    Logged so far:{' '}
                    {
                      overview.todayProjection.consumedSoFar
                    }{' '}
                    kcal
                  </Text>

                  <Text style={uiStyles.muted}>
                    Estimated end-of-day
                    calories based on your
                    current pace today.
                  </Text>
                </>
              ) : (
                <Text style={uiStyles.muted}>
                  Not enough data yet to
                  estimate today&apos;s
                  calorie intake.
                </Text>
              )}
            </Card>


            <Card>
              <Text style={uiStyles.h2}>
                Weight progress
              </Text>

              {overview.weightTrend ? (
                <>
                  <Text style={styles.metric}>
                    {overview.weightTrend.netChangeKg > 0 ? '+': ''}
                    {overview.weightTrend.netChangeKg}{' '}
                    kg
                  </Text>

                  <Text style={uiStyles.body}>
                    Average weekly change:{' '}
                    {overview.weightTrend.averagePerWeekKg > 0 ? '+': ''}
                    {overview.weightTrend.averagePerWeekKg}{' '}
                    kg/week
                  </Text>
                </>
              ) : (
                <Text style={uiStyles.muted}>
                  Log at least two weight
                  entries to see your weight
                  trend.
                </Text>
              )}
            </Card>


            <Card>
              <Text style={uiStyles.h2}>
                4-week weight projection
              </Text>

              {overview.weightProjection ? (
                <>
                  <Text style={styles.metric}>
                    {overview.weightProjection.projectedIn4WeeksKg}{' '}
                    kg
                  </Text>

                  <Text style={uiStyles.body}>
                    Current weight:{' '}
                    {overview.weightProjection.currentWeightKg}{' '}
                    kg
                  </Text>

                  <Text style={uiStyles.body}>
                    Current trend:{' '}
                    {overview.weightProjection.trendKgPerWeek > 0 ? '+' : ''}
                    {overview.weightProjection.trendKgPerWeek}{' '}
                    kg/week
                  </Text>

                  <Text style={uiStyles.muted}>
                    This is a simple trend
                    projection based on your
                    logged weights, not a
                    medical prediction.
                  </Text>
                </>
              ) : (
                <Text style={uiStyles.muted}>
                  More weight history is
                  required before a projection
                  can be calculated.
                </Text>
              )}
            </Card>


            <Card>
              <Text style={uiStyles.h2}>
                Activity streak
              </Text>

              {overview.streak ? (
                <>
                  <Text style={styles.metric}>
                    {overview.streak.currentStreak}{' '}
                    days
                  </Text>

                  <Text style={uiStyles.body}>
                    Longest streak:{' '}
                    {overview.streak.longestStreak}{' '}
                    days
                  </Text>
                </>
              ) : (
                <Text style={uiStyles.muted}>
                  No streak recorded yet.
                </Text>
              )}
            </Card>


            <Card>
              <Text style={uiStyles.h2}>
                Recent calorie history
              </Text>

              {recentDays.length === 0 ? (
                <Text style={uiStyles.muted}>
                  No calorie entries in this
                  period.
                </Text>
              ) : (
                recentDays.map(day => (
                  <View
                    key={day.date}
                    style={{
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={uiStyles.body}
                    >
                      {new Date(
                        `${day.date}T00:00:00`
                      ).toLocaleDateString()}
                    </Text>

                    <Text
                      style={uiStyles.muted}
                    >
                      {
                        day.consumedCalories
                      }{' '}
                      kcal
                      {day.targetCalories !==
                      null
                        ? ` / ${day.targetCalories} kcal target`
                        : ''}
                    </Text>
                  </View>
                ))
              )}
            </Card>


            <Text style={uiStyles.muted}>
              Projections are calculated from
              your recorded FoodieMeter data
              and should be treated as
              progress estimates rather than
              medical advice.
            </Text>
          </>
        )}
    </ScrollView>
  );
}
export function ManageSubscriptionScreen() {
  const {subscription, cancelSubscription, renewSubscription,} = useApp();
  const [busy, setBusy,] = useState(false);
  if (!subscription) {
    return (
      <ScrollView
        style={uiStyles.screen}
        contentContainerStyle={uiStyles.scrollContent}
      >
        <ScreenTitle
          title="Manage subscription"
          subtitle="FoodieMeter Premium"
          back
        />

        <Card>
          <Text style={uiStyles.h2}>
            No mock subscription record
          </Text>

          <Text style={uiStyles.body}>
            This account does not have a
            subscription created through
            the mock subscription flow.
          </Text>
        </Card>
      </ScrollView>
    );
  }


  const billingDate = subscription.nextBillingDate ? new Date(
          subscription
            .nextBillingDate
        ).toLocaleDateString(
          undefined,
          {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }
        )
      : 'Not available';

  const cancelling = subscription.cancelScheduled;
  const confirmCancel = () => Alert.alert(
      'Cancel Premium subscription?',
      `Your mock Premium access will remain active until ${billingDate}. No real payment is involved.`,
      [
        {
          text: 'Keep Premium',
          style: 'cancel',
        },
        {
          text: 'Schedule cancellation',
          style: 'destructive',

          onPress: async () => {
            try {
              setBusy(true);
              await cancelSubscription();
              Alert.alert( 'Cancellation scheduled', `Premium remains active until ${billingDate}.`);
            } catch (error) {
              Alert.alert('Cancellation failed',
                String(
                  (error as Error)
                    .message
                )
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );


  const confirmRenew = () => Alert.alert('Keep Premium active?',
    'This removes the scheduled cancellation from your mock subscription.',
      [
        {
          text: 'Not now',
          style: 'cancel',
        },
        {
          text: 'Keep Premium',

          onPress: async () => {
            try {
              setBusy(true);

              await renewSubscription();

              Alert.alert( 'Premium continued', 'The scheduled cancellation has been removed.');
            } catch (error) {
              Alert.alert(
                'Renewal failed',
                String(
                  (error as Error)
                    .message
                )
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );


  return (
    <ScrollView
      style={uiStyles.screen}
      contentContainerStyle={
        uiStyles.scrollContent
      }
    >
      <ScreenTitle
        title="Manage subscription"
        subtitle="View or change your mock FoodieMeter plan"
        back
      />

      <Card>
        <View
          style={styles.planHeader}>
          <View>
            <Text style={styles.planName}>
              Premium
            </Text>

            <Text
              style={uiStyles.muted}>
              Mock monthly plan
            </Text>
          </View>

          <View
            style={[styles.statusPill,cancelling &&styles.statusPillWarning,]}>
            <Text
              style={[styles.statusText,cancelling &&styles.statusTextWarning,]}>
              {cancelling
                ? 'Cancellation scheduled'
                : subscription.status ===
                    'ACTIVE'
                  ? 'Active'
                  : subscription.status}
            </Text>
          </View>
        </View>

        <Text
          style={ styles.subscriptionPrice}>
          S$
          {subscription.price.toFixed(2)}{' '}/ month
        </Text>

        <Text style={uiStyles.muted}>
          Demonstration price only. No
          real money is charged.
        </Text>

        <View
          style={uiStyles.divider}
        />

        <View
          style={uiStyles.spaceBetween}>
          <Text
            style={uiStyles.muted}>
            {cancelling ? 'Premium access until' : 'Next billing date'}
          </Text>

          <Text
            style={styles.detailValue}>
            {billingDate}
          </Text>
        </View>
      </Card>


      <Card>
        <Text style={uiStyles.h2}>
          Included with Premium
        </Text>

        <Text style={uiStyles.body}>
          ✓ Personalized AI meal
          recommendations
        </Text>

        <Text style={uiStyles.body}>
          ✓ Predictive progress insights
        </Text>

        <Text style={uiStyles.body}>
          ✓ Gamification and challenges
        </Text>

        <Text style={uiStyles.body}>
          ✓ Community and social
          features
        </Text>
      </Card>


      {cancelling ? (
        <>
          <Card
            style={ styles.noticeCard}>
            <Text style={ styles.noticeTitle}>
              Cancellation scheduled
            </Text>

            <Text style={uiStyles.body}>
              Premium access remains
              active until{' '}
              {billingDate}.
            </Text>
          </Card>

          <Button
            title={ busy? 'Updating...': 'Keep Premium active'}
            disabled={busy}
            onPress={confirmRenew}/>
        </>
      ) : (
        <Button
          title={
            busy
              ? 'Updating...'
              : 'Cancel subscription'
          }
          danger
          disabled={busy}
          onPress={
            confirmCancel
          }
        />
      )}


      <Text style={uiStyles.muted}>
        Demo mode: subscription status is
        stored in the FoodieMeter backend,
        but no payment gateway or real
        financial transaction is used.
      </Text>
    </ScrollView>
  );
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
