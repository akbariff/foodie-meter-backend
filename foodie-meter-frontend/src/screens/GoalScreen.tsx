import React, { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Button, Field, ScreenTitle, uiStyles } from '../components/UI';
import { useApp } from '../context/AppContext';

export function GoalScreen(){const {goal,saveGoal}=useApp(); const [form,setForm]=useState({...goal}); const num=(v:string)=>Number(v.replace(/[^0-9.]/g,''))||0;
return <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.scrollContent} keyboardShouldPersistTaps="handled"><ScreenTitle title="Set your goal" subtitle="Daily calorie target used for recommendations" back/><Field label="Daily calorie target" keyboardType="numeric" value={String(form.calories)} onChangeText={v=>setForm({...form,calories:num(v)})}/><Button title="Save target" onPress={async()=>{if(form.calories<800||form.calories>10000)return Alert.alert('Check target','Enter a target between 800 and 10000 calories.');try{await saveGoal(form);Alert.alert('Saved','Your calorie target has been updated.')}catch(error){Alert.alert('Save failed',String((error as Error).message))}}}/></ScrollView>}
