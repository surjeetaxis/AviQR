import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { authApi, brandApi } from '../../src/api/index.js';
import { useAuth } from '../../src/context/AuthContext.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { Colors, Radius } from '../../src/theme/index.js';

export default function SupplierSettingsScreen() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', brandName: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    brandApi.getMine().then(res => {
      const b = res.data.data;
      if (b?.name) setForm(f => ({ ...f, brandName: b.name }));
    }).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Mirrors web's SettingsTab: brandName isn't a User field — auth-service
  // would silently drop it — so it saves separately to shop-service's Brand
  // entity (the same one read by the Brand QR / /brand/:id page).
  const save = async () => {
    setSaving(true);
    try {
      const calls = [authApi.updateProfile({ name: form.name, phone: form.phone })];
      if (form.brandName.trim()) calls.push(brandApi.save({ name: form.brandName.trim() }));
      await Promise.all(calls);
      await updateUser({ name: form.name, phone: form.phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { Alert.alert('Could not save', 'Please try again.'); }
    finally { setSaving(false); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Settings" />
      <View style={ss.section}>
        <Text style={ss.secTitle}>Your profile</Text>
        <View style={ss.card}>
          <Input label="Full name" value={form.name} onChangeText={v => set('name', v)} />
          <Input label="Email (contact support to change)" value={form.email} editable={false} style={{ opacity: 0.6 }} />
          <Input label="Phone" value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" />
        </View>
      </View>

      <View style={ss.section}>
        <Text style={ss.secTitle}>Brand</Text>
        <View style={ss.card}>
          <Input label="Brand / company name" value={form.brandName} onChangeText={v => set('brandName', v)} placeholder="e.g. Spice Route Group" />
        </View>
      </View>

      <View style={ss.section}>
        <Button title={saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'} onPress={save} loading={saving} />
      </View>
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  section: { marginHorizontal: 12, marginTop: 16, marginBottom: 4 },
  secTitle: { fontSize: 11, fontWeight: '700', color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 14 },
});
