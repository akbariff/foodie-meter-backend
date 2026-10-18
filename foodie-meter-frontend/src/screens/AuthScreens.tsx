import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Field, ScreenTitle, uiStyles } from '../components/UI';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';
import { api } from '../services/api';

function BrandBlock({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.brandWrap, compact && styles.brandWrapCompact]}>
      <Image
        source={require('../assets/foodiemeter-logo.png')}
        style={compact ? styles.brandLogoCompact : styles.brandLogo}
        resizeMode="contain"
      />
    </View>
  );
}

export function LoginScreen() {
  const { login, navigate } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!email.trim() || !password) return Alert.alert('Missing details', 'Enter your email and password.');
    setBusy(true);
    try { await login(email, password); } catch (error) { Alert.alert('Login failed', String((error as Error).message)); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={styles.authWrap} keyboardShouldPersistTaps="handled">
      <BrandBlock />
      <ScreenTitle title="Welcome back" subtitle="Access your FoodieMeter experience." />
      <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Button title={busy ? 'Logging in...' : 'Log in'} disabled={busy} onPress={submit} />
      <Pressable onPress={() => navigate('ForgotPassword')}><Text style={styles.link}>Forgot password?</Text></Pressable>
      <View style={{ height: 18 }} />
      <Button title="Create an account" secondary onPress={() => navigate('Register')} />
    </ScrollView>
  );
}

export function RegisterScreen() {
  const { navigate } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    if (!name || !email || !password) return Alert.alert('Complete the form', 'Name, email and password are required.');
    try { await api.register({ name, email, password }); navigate('VerifyEmail', { email }); }
    catch (error) { Alert.alert('Registration failed', String((error as Error).message)); }
  };

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={styles.authWrap} keyboardShouldPersistTaps="handled">
      <BrandBlock compact />
      <ScreenTitle title="Create your account" subtitle="Start with a Free FoodieMeter account." back />
      <Field label="Name" value={name} onChangeText={setName} />
      <Field label="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Button title="Create account" onPress={submit} />
    </ScrollView>
  );
}

export function VerifyEmailScreen() {
  const { navigate, params } = useApp();
  const [code, setCode] = useState('');

  const submit = async () => {
    if (code.length !== 6) return Alert.alert('Invalid code', 'Enter the 6-digit code.');
    try { await api.verifyEmail(params?.email, code); Alert.alert('Email verified', 'Log in to continue.', [{ text: 'Continue', onPress: () => navigate('Login') }]); }
    catch (error) { Alert.alert('Verification failed', String((error as Error).message)); }
  };

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={styles.authWrap}>
      <BrandBlock compact />
      <ScreenTitle title="Verify your email" subtitle={`We sent a 6-digit code to ${params?.email || 'your email'}.`} back />
      <Field label="Verification code" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} />
      <Button title="Verify email" onPress={submit} />
    </ScrollView>
  );
}

export function ForgotPasswordScreen() {
  const { navigate } = useApp();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={styles.authWrap}>
      <BrandBlock compact />
      <ScreenTitle title="Reset password" subtitle="Enter your registered email address." back />
      <Field label="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      {!sent ? <Button
        title="Send reset code"
        onPress={async () => {
          if (!email) return Alert.alert('Email required');
          try { await api.forgotPassword(email); setSent(true); Alert.alert('Reset code requested', 'Check your email or the backend console in development.'); }
          catch (error) { Alert.alert('Request failed', String((error as Error).message)); }
        }}
      /> : <>
        <Field label="Reset code" keyboardType="number-pad" value={code} onChangeText={setCode}/>
        <Field label="New password" secureTextEntry value={newPassword} onChangeText={setNewPassword}/>
        <Button title="Reset password" onPress={async()=>{
          try { await api.resetPassword(email,code,newPassword); Alert.alert('Password changed','Log in with your new password.',[{text:'Continue',onPress:()=>navigate('Login')}]); }
          catch(error){ Alert.alert('Reset failed',String((error as Error).message)); }
        }}/>
      </>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  authWrap: { paddingTop: 34, paddingBottom: 50 },
  brandWrap: { alignItems: 'center', marginBottom: 18 },
  brandWrapCompact: { marginBottom: 8 },
  brandLogo: { width: 230, height: 150 },
  brandLogoCompact: { width: 140, height: 92 },
  link: { color: colors.primaryDark, fontWeight: '600', marginTop: 8 },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F4F0D8',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8
  },
  pillText: { fontSize: 11, color: '#7E774A' },
});
