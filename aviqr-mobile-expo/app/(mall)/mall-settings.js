import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { mallApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { Colors, Radius } from '../../src/theme/index.js';

export default function MallSettingsScreen() {
  const [mall, setMall]     = useState(null);
  const [form, setForm]     = useState({ name: '', city: '', phone: '', commissionPercent: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await mallApi.getMyMalls();
      const m = (res.data.data || [])[0];
      if (m) {
        setMall(m);
        setForm({ name: m.name || '', city: m.city || '', phone: m.phone || '', commissionPercent: m.commissionPercent != null ? String(m.commissionPercent) : '' });
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!mall) return;
    setSaving(true);
    try {
      await mallApi.update(mall.id, {
        name: form.name, city: form.city, phone: form.phone,
        commissionPercent: form.commissionPercent === '' ? null : Number(form.commissionPercent),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { Alert.alert('Could not save', 'Please try again.'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Mall Settings" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Mall Settings" />
      <View style={ss.section}>
        <Text style={ss.secTitle}>Mall profile</Text>
        <View style={ss.card}>
          <Input label="Mall name" value={form.name} onChangeText={v => set('name', v)} />
          <Input label="City" value={form.city} onChangeText={v => set('city', v)} />
          <Input label="Contact phone" value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" />
          <Input label="Commission %" value={form.commissionPercent} onChangeText={v => set('commissionPercent', v)} keyboardType="numeric" placeholder="e.g. 12" />
        </View>
      </View>

      <View style={ss.section}>
        <Button title={saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'} onPress={save} loading={saving} disabled={!mall} />
      </View>
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  section: { marginHorizontal: 12, marginTop: 16, marginBottom: 4 },
  secTitle: { fontSize: 11, fontWeight: '700', color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 14 },
});
