import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { hotelApi, pmsApi } from '../../../src/api/index.js';
import { PageHeader } from '../../../src/components/common/PageHeader.js';
import { Card } from '../../../src/components/common/Card.js';
import { Button } from '../../../src/components/common/Button.js';
import { Input } from '../../../src/components/common/Input.js';
import { StatusBadge } from '../../../src/components/common/StatusBadge.js';
import { Colors, FontSize, Spacing } from '../../../src/theme/index.js';

export default function PmsGuestsScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [query, setQuery] = useState('');
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback((hId, q) => {
    pmsApi.listGuests(hId, q || undefined).then(res => setGuests(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hRes = await hotelApi.getMyHotels();
        const hotel = (hRes.data.data || [])[0];
        if (!hotel) return;
        setHotelId(hotel.id);
        load(hotel.id, '');
      } catch {}
      finally { setLoading(false); }
    })();
  }, [load]);

  useEffect(() => { if (hotelId) load(hotelId, query); }, [query, hotelId, load]);

  const select = (guest) => {
    setSelected(guest.id);
    setForm({ ...guest });
    pmsApi.guestStayHistory(guest.id).then(res => setHistory(res.data.data || [])).catch(() => setHistory([]));
  };

  const saveProfile = async () => {
    setSaving(true);
    try { await pmsApi.updateGuest(selected, form); load(hotelId, query); }
    catch { Alert.alert('Could not save guest profile'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Guests" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Guests" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.sub}>Every booking with a phone number is auto-linked to a guest profile.</Text>
        <Input placeholder="Search by name or phone…" value={query} onChangeText={setQuery} />

        {guests.map(g => (
          <TouchableOpacity key={g.id} onPress={() => select(g)}>
            <Card style={[ss.guestCard, selected === g.id && ss.guestCardActive]}>
              <View style={{ flex: 1 }}>
                <Text style={ss.guestName}>{g.name}</Text>
                <Text style={ss.guestMeta}>{g.phone}{g.email ? ` · ${g.email}` : ''}</Text>
                <Text style={ss.guestMeta}>{g.idProofType ? `${g.idProofType} ${g.idProofNumber || ''}` : 'No ID on file'}</Text>
              </View>
              <View style={ss.loyaltyPill}>
                <Text style={ss.loyaltyTxt}>{g.loyaltyPoints || 0} pts</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
        {guests.length === 0 && <Text style={ss.emptyTxt}>No guests found.</Text>}

        {form && (
          <Card style={{ marginTop: 16 }}>
            <Text style={ss.cardTitle}>{form.name} — profile</Text>
            <Text style={ss.loyaltyBalance}>Loyalty balance: <Text style={{ fontWeight: '800' }}>{form.loyaltyPoints || 0} points</Text></Text>
            <Input label="Name" value={form.name || ''} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
            <Input label="Phone" value={form.phone || ''} onChangeText={v => setForm(f => ({ ...f, phone: v }))} />
            <Input label="Email" value={form.email || ''} onChangeText={v => setForm(f => ({ ...f, email: v }))} />
            <Input label="ID proof type" placeholder="e.g. Passport" value={form.idProofType || ''} onChangeText={v => setForm(f => ({ ...f, idProofType: v }))} />
            <Input label="ID proof number" value={form.idProofNumber || ''} onChangeText={v => setForm(f => ({ ...f, idProofNumber: v }))} />
            <Input label="Address" value={form.address || ''} onChangeText={v => setForm(f => ({ ...f, address: v }))} />
            <Button title={saving ? 'Saving…' : 'Save Profile'} loading={saving} onPress={saveProfile} style={{ marginBottom: 16 }} />

            <Text style={ss.cardTitle}>Stay history ({history.length})</Text>
            {history.map(r => (
              <View key={r.id} style={ss.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={ss.rowLabel}>{r.checkInDate} → {r.checkOutDate}</Text>
                  <Text style={ss.guestMeta}>{r.source}</Text>
                </View>
                <StatusBadge status={r.status} />
              </View>
            ))}
            {history.length === 0 && <Text style={ss.emptyTxt}>No past stays.</Text>}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  sub: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 12 },
  cardTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 8 },
  guestCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  guestCardActive: { borderWidth: 1.5, borderColor: Colors.primary },
  guestName: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray900 },
  guestMeta: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  loyaltyPill: { backgroundColor: Colors.primaryLight, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  loyaltyTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  loyaltyBalance: { fontSize: FontSize.sm, color: Colors.gray700, marginBottom: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  rowLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900 },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 12 },
});
