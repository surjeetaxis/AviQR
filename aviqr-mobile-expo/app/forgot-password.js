import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '../src/api/index.js';
import { Button } from '../src/components/common/Button.js';
import { Input } from '../src/components/common/Input.js';
import { Colors, FontSize, Spacing } from '../src/theme/index.js';

// 'request' -> enter email, 'reset' -> enter code + new password, 'done' -> success
export default function ForgotPasswordScreen() {
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPw, setNewPw] = useState('');
  const [loading, setLoading] = useState(false);

  const submitEmail = async () => {
    if (!email.trim()) return Alert.alert('Required', 'Enter your account email');
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setStep('reset');
    } catch (e) {
      Alert.alert('Could not send reset code', e.response?.data?.message || 'Please check the email and try again.');
    } finally { setLoading(false); }
  };

  const submitReset = async () => {
    if (otp.length < 6) return Alert.alert('Required', 'Enter the 6-digit code');
    if (newPw.length < 8) return Alert.alert('Required', 'Password must be at least 8 characters');
    setLoading(true);
    try {
      await authApi.resetPassword({ email: email.trim(), otp, newPassword: newPw });
      setStep('done');
    } catch (e) {
      Alert.alert('Could not reset password', e.response?.data?.message || 'Invalid or expired code. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={ss.screen} contentContainerStyle={ss.scroll} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={['#0F6E56', '#1D9E75']} style={ss.hero}>
        <Text style={ss.brand}>Avi<Text style={ss.accent}>QR</Text></Text>
        <Text style={ss.tagline}>Reset your password</Text>
      </LinearGradient>

      <View style={ss.body}>
        {step === 'request' && (
          <>
            <Text style={ss.title}>Forgot your password?</Text>
            <Text style={ss.sub}>Enter the email on your account and we'll send you a 6-digit code.</Text>
            <Input label="Email" placeholder="you@business.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Button title={loading ? 'Sending…' : 'Send reset code'} onPress={submitEmail} loading={loading} style={{ marginTop: 8 }} />
            <Button title="Back to Sign in" onPress={() => router.back()} variant="ghost" style={{ marginTop: 8 }} />
          </>
        )}

        {step === 'reset' && (
          <>
            <Text style={{ fontSize: 48, marginBottom: 12, textAlign: 'center' }}>📧</Text>
            <Text style={ss.title}>Check your email</Text>
            <Text style={ss.sub}>If an account exists for {email}, we've sent a 6-digit code to it. Enter it below with your new password.</Text>
            <Input label="6-digit code" placeholder="123456" value={otp} onChangeText={t => setOtp(t.replace(/\D/g, ''))} keyboardType="number-pad" />
            <Input label="New password" placeholder="Min 8 characters" value={newPw} onChangeText={setNewPw} secureEntry />
            <Button title={loading ? 'Resetting…' : 'Reset password'} onPress={submitReset} loading={loading} style={{ marginTop: 8 }} />
            <Button title="Resend code" onPress={submitEmail} variant="ghost" style={{ marginTop: 8 }} />
          </>
        )}

        {step === 'done' && (
          <View style={{ alignItems: 'center', paddingTop: 24 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
            <Text style={ss.title}>Password reset</Text>
            <Text style={ss.sub}>Your password has been changed. Sign in with your new password.</Text>
            <Button title="Back to Sign in" onPress={() => router.replace('/login')} style={{ marginTop: 24, width: '100%' }} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1 },
  hero: { paddingTop: 64, paddingBottom: 36, alignItems: 'center' },
  brand: { fontSize: FontSize['3xl'], fontWeight: '800', color: Colors.white },
  accent: { color: '#A7F3D0' },
  tagline: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  body: { padding: Spacing.lg },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900, textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: FontSize.sm, color: Colors.gray500, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
});
