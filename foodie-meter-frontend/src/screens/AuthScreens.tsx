import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Field, ScreenTitle, uiStyles } from '../components/UI';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';

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
  const [email, setEmail] = useState('premium@foodiemeter.local');
  const [password, setPassword] = useState('password');
  const submit = () => {
    if (!login(email, password)) Alert.alert('Missing details', 'Enter your email and password.');
  };

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={styles.authWrap} keyboardShouldPersistTaps="handled">
      <BrandBlock />
      <ScreenTitle title="Welcome back" subtitle="Access your FoodieMeter experience." />
      <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <View style={styles.pill}><Text style={styles.pillText}>✦ Use premium@... for Premium demo</Text></View>
      <Button title="Log in" onPress={submit} />
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

  const submit = () => {
    if (!name || !email || !password) return Alert.alert('Complete the form', 'Name, email and password are required.');
    navigate('VerifyEmail', { email });
  };

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={styles.authWrap} keyboardShouldPersistTaps="handled">
      <BrandBlock compact />
      <ScreenTitle title="Create your account" subtitle="Start with a Free FoodieMeter account." back />
      <Field label="Name" value={name} onChangeText={setName} />
      <Field label="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Field label="Dietary preference (optional)" placeholder="e.g. No preference, Vegetarian" />
      <Button title="Create account" onPress={submit} />
    </ScrollView>
  );
}

export function VerifyEmailScreen() {
  const { navigate, params } = useApp();
  const [code, setCode] = useState('123456');

  const submit = () => {
    if (code.length !== 6) return Alert.alert('Invalid code', 'Enter the 6-digit code.');
    Alert.alert('Email verified', 'Your account is ready.', [{ text: 'Continue', onPress: () => navigate('Login') }]);
  };

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={styles.authWrap}>
      <BrandBlock compact />
      <ScreenTitle title="Verify your email" subtitle={`We sent a 6-digit code to ${params?.email || 'your email'}.`} back />
      <Field label="Verification code" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} />
      <Button title="Verify email" onPress={submit} />
      <Text style={uiStyles.muted}>Demo code: 123456</Text>
    </ScrollView>
  );
}

export function ForgotPasswordScreen() {
  const { navigate } = useApp();
  const [email, setEmail] = useState('');

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={styles.authWrap}>
      <BrandBlock compact />
      <ScreenTitle title="Reset password" subtitle="Enter your registered email address." back />
      <Field label="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <Button
        title="Send reset code"
        onPress={() => {
          if (!email) return Alert.alert('Email required');
          Alert.alert('Reset code sent', 'Demo mode: use 123456.', [{ text: 'OK', onPress: () => navigate('Login') }]);
        }}
      />
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
