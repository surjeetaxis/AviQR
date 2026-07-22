import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { hotelApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { Colors, FontSize, Radius } from '../../src/theme/index.js';

const SERVICES = [
  { id: 'ROOM_SERVICE', label: 'Room Service' },
  { id: 'LAUNDRY',      label: 'Laundry' },
  { id: 'SPA',          label: 'Spa' },
  { id: 'HOUSEKEEPING', label: 'Housekeeping' },
  { id: 'MAINTENANCE',  label: 'Maintenance' },
  { id: 'TRANSPORT',    label: 'Transport' },
];

export default function HotelSettingsScreen() {
  const [hotel, setHotel]   = useState(null);
  const [form, setForm]     = useState({ name: '', phone: '', email: '', address: '', checkInTime: '', checkOutTime: '', enabledServices: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hotelApi.getMyHotels();
      const h = (res.data.data || [])[0];
      if (h) {
        setHotel(h);
        setForm({
          name: h.name || '', phone: h.phone || '', email: h.email || '',
          address: h.address || '', checkInTime: h.checkInTime || '', checkOutTime: h.checkOutTime || '',
          enabledServices: h.enabledServices || [],
        });
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleService = (id) => setForm(f => ({
    ...f,
    enabledServices: f.enabledServices.includes(id) ? f.enabledServices.filter(s => s !== id) : [...f.enabledServices, id],
  }));

  const save = async () => {
    if (!hotel) return;
    setSaving(true);
    try {
      await hotelApi.update(hotel.id, {
        name: form.name, phone: form.phone, email: form.email, address: form.address,
        checkInTime: form.checkInTime, checkOutTime: form.checkOutTime, enabledServices: form.enabledServices,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { Alert.alert('Could not save', 'Please try again.'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Hotel Settings" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Hotel Settings" />
      <View style={ss.section}>
        <Text style={ss.secTitle}>Property details</Text>
        <View style={ss.card}>
          <Input label="Hotel name" value={form.name} onChangeText={v => set('name', v)} />
          <Input label="Phone" value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" />
          <Input label="Email" value={form.email} onChangeText={v => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
          <Input label="Address" value={form.address} onChangeText={v => set('address', v)} multiline />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Input label="Check-in time" value={form.checkInTime} onChangeText={v => set('checkInTime', v)} placeholder="14:00" style={{ flex: 1 }} />
            <Input label="Check-out time" value={form.checkOutTime} onChangeText={v => set('checkOutTime', v)} placeholder="12:00" style={{ flex: 1 }} />
          </View>
        </View>
      </View>

      <View style={ss.section}>
        <Text style={ss.secTitle}>Enabled services</Text>
        <View style={ss.card}>
          {SERVICES.map((s, i) => (
            <View key={s.id} style={[ss.row, i < SERVICES.length - 1 && ss.rowBorder]}>
              <Text style={ss.rowLabel}>{s.label}</Text>
              <Switch value={form.enabledServices.includes(s.id)} onValueChange={() => toggleService(s.id)} trackColor={{ true: Colors.primary }} />
            </View>
          ))}
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  rowLabel: { fontSize: FontSize.base, color: Colors.gray800 },
});
