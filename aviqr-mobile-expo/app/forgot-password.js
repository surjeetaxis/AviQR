import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '../src/api/index.js';
import { Button } from '../src/components/common/Button.js';
import { Input } from '../src/components/common/Input.js';
import { Colors, FontSize, Spacing } from '../src/theme/index.js';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) return Alert.alert('Required', 'Enter your account email');
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      Alert.alert('Could not send reset email', e.response?.data?.message || 'Please check the email and try again.');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={ss.screen} contentContainerStyle={ss.scroll} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={['#0F6E56', '#1D9E75']} style={ss.hero}>
        <Text style={ss.brand}>Avi<Text style={ss.accent}>QR</Text></Text>
        <Text style={ss.tagline}>Reset your password</Text>
      </LinearGradient>

      <View style={ss.body}>
        {sent ? (
          <View style={{ alignItems: 'center', paddingTop: 24 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📧</Text>
            <Text style={ss.title}>Check your email</Text>
            <Text style={ss.sub}>If an account exists for {email}, we've sent a link to reset your password.</Text>
            <Button title="Back to Sign in" onPress={() => router.replace('/login')} style={{ marginTop: 24, width: '100%' }} />
          </View>
        ) : (
          <>
            <Text style={ss.title}>Forgot your password?</Text>
            <Text style={ss.sub}>Enter the email on your account and we'll send you a link to reset it.</Text>
            <Input label="Email" placeholder="you@business.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Button title={loading ? 'Sending…' : 'Send reset link'} onPress={submit} loading={loading} style={{ marginTop: 8 }} />
            <Button title="Back to Sign in" onPress={() => router.back()} variant="ghost" style={{ marginTop: 8 }} />
          </>
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
