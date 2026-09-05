import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { hotelApi, pmsApi } from '../../../src/api/index.js';
import { PageHeader } from '../../../src/components/common/PageHeader.js';
import { Card } from '../../../src/components/common/Card.js';
import { Button } from '../../../src/components/common/Button.js';
import { Input } from '../../../src/components/common/Input.js';
import { StatusBadge } from '../../../src/components/common/StatusBadge.js';
import { Colors, FontSize, Spacing, Radius } from '../../../src/theme/index.js';

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_FORM = { name: '', organizerName: '', organizerPhone: '', checkInDate: today(), checkOutDate: today() };
const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'WALLET'];

export default function GroupBookingsScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [folio, setFolio] = useState(null);
  const [acting, setActing] = useState(false);
  const [payment, setPayment] = useState({ method: 'CASH', amount: '', reference: '' });
  const [savingPayment, setSavingPayment] = useState(false);

  const load = useCallback(async (hId) => {
    const res = await pmsApi.listGroups(hId);
    setGroups(res.data.data || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hRes = await hotelApi.getMyHotels();
        const hotel = (hRes.data.data || [])[0];
        if (!hotel) return;
        setHotelId(hotel.id);
        await load(hotel.id);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [load]);

  const createGroup = async () => {
    if (!form.name.trim()) return Alert.alert('Group name is required');
    setSaving(true);
    try {
      await pmsApi.createGroup({ hotelId, ...form });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load(hotelId);
    } catch { Alert.alert('Could not create group'); }
    finally { setSaving(false); }
  };

  const loadDetail = (id) => {
    setSelectedId(id);
    pmsApi.getGroup(id).then(res => setDetail(res.data.data)).catch(() => setDetail(null));
    pmsApi.getGroupFolio(id).then(res => setFolio(res.data.data)).catch(() => setFolio(null));
  };
  const refreshDetail = () => { if (selectedId) loadDetail(selectedId); };

  const bulkAction = async (apiCall, label) => {
    setActing(true);
    try {
      const res = await apiCall(selectedId);
      const { succeeded, failed } = res.data.data;
      if (failed.length) Alert.alert(`${succeeded.length} succeeded, ${failed.length} failed`, failed.map(f => f.error).join('\n'));
      refreshDetail();
    } catch { Alert.alert(`Could not ${label}`); }
    finally { setActing(false); }
  };

  const addPayment = async () => {
    if (!payment.amount) return Alert.alert('Amount is required');
    setSavingPayment(true);
    try {
      await pmsApi.addGroupPayment(selectedId, { ...payment, amount: Number(payment.amount) });
      setPayment({ method: 'CASH', amount: '', reference: '' });
      loadDetail(selectedId);
    } catch { Alert.alert('Could not record payment'); }
    finally { setSavingPayment(false); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Group Bookings" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Group Bookings" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.sub}>Book many rooms under one group, with shared billing and bulk check-in/out.</Text>

        <Button title={showForm ? 'Cancel' : '+ New Group'} variant={showForm ? 'ghost' : 'primary'} onPress={() => setShowForm(s => !s)} style={{ marginBottom: 16 }} />

        {showForm && (
          <Card style={{ marginBottom: 16 }}>
            <Input label="Group name *" placeholder="e.g. Sharma-Verma Wedding" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
            <Input label="Organizer name" value={form.organizerName} onChangeText={v => setForm(f => ({ ...f, organizerName: v }))} />
            <Input label="Organizer phone" keyboardType="phone-pad" value={form.organizerPhone} onChangeText={v => setForm(f => ({ ...f, organizerPhone: v }))} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Input label="Check-in" value={form.checkInDate} onChangeText={v => setForm(f => ({ ...f, checkInDate: v }))} style={{ flex: 1 }} />
              <Input label="Check-out" value={form.checkOutDate} onChangeText={v => setForm(f => ({ ...f, checkOutDate: v }))} style={{ flex: 1 }} />
            </View>
            <Button title={saving ? 'Creating…' : 'Create Group'} loading={saving} onPress={createGroup} />
          </Card>
        )}

        <Text style={ss.cardTitle}>Groups ({groups.length})</Text>
        {groups.map(g => (
          <TouchableOpacity key={g.id} onPress={() => loadDetail(g.id)}>
            <Card style={[ss.groupCard, selectedId === g.id && ss.groupCardActive]}>
              <Text style={ss.groupName}>{g.name}</Text>
              <Text style={ss.groupMeta}>{g.organizerName}{g.organizerPhone ? ` · ${g.organizerPhone}` : ''}</Text>
              <Text style={ss.groupMeta}>{g.checkInDate} → {g.checkOutDate}</Text>
            </Card>
          </TouchableOpacity>
        ))}
        {groups.length === 0 && <Text style={ss.emptyTxt}>No groups yet — create one above, then attach room bookings to it from Reservations.</Text>}

        {detail && (
          <Card style={{ marginTop: 16 }}>
            <Text style={ss.cardTitle}>{detail.group.name} — {detail.members.length} room(s)</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <Button title="Check in all" size="sm" variant="outline" loading={acting} onPress={() => bulkAction(pmsApi.groupCheckIn, 'check in')} style={{ flex: 1 }} />
              <Button title="Check out all" size="sm" variant="outline" loading={acting} onPress={() => bulkAction(pmsApi.groupCheckOut, 'check out')} style={{ flex: 1 }} />
            </View>

            {detail.members.map(m => (
              <View key={m.id} style={ss.memberRow}>
                <View style={{ flex: 1 }}>
                  <Text style={ss.memberName}>{m.guestName}</Text>
                  <Text style={ss.groupMeta}>{m.checkInDate} → {m.checkOutDate}</Text>
                </View>
                <StatusBadge status={m.status} />
              </View>
            ))}
            {detail.members.length === 0 && <Text style={ss.emptyTxt}>No rooms attached yet — book one from Reservations and pick this group.</Text>}

            {folio && (
              <>
                <View style={ss.kpiRow}>
                  <View style={ss.kpi}><Text style={ss.kpiValue}>₹{Number(folio.totalCharges).toLocaleString('en-IN')}</Text><Text style={ss.kpiLabel}>Charges</Text></View>
                  <View style={ss.kpi}><Text style={ss.kpiValue}>₹{Number(folio.totalPayments).toLocaleString('en-IN')}</Text><Text style={ss.kpiLabel}>Payments</Text></View>
                  <View style={ss.kpi}><Text style={[ss.kpiValue, { color: Colors.primary }]}>₹{Number(folio.balance).toLocaleString('en-IN')}</Text><Text style={ss.kpiLabel}>Balance</Text></View>
                </View>
                <Text style={ss.fieldLabel}>Record group payment</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {PAYMENT_METHODS.map(m => (
                    <TouchableOpacity key={m} onPress={() => setPayment(p => ({ ...p, method: m }))} style={[ss.chip, payment.method === m && ss.chipActive]}>
                      <Text style={[ss.chipTxt, payment.method === m && ss.chipTxtActive]}>{m.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Input placeholder="Amount" keyboardType="number-pad" value={payment.amount} onChangeText={v => setPayment(p => ({ ...p, amount: v }))} />
                <Input placeholder="Reference" value={payment.reference} onChangeText={v => setPayment(p => ({ ...p, reference: v }))} />
                <Button title={savingPayment ? 'Recording…' : 'Record Payment'} loading={savingPayment} onPress={addPayment} />
              </>
            )}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  sub: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 14 },
  cardTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 10 },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray500, marginBottom: 6, marginTop: 6 },
  groupCard: { marginBottom: 8 },
  groupCardActive: { borderWidth: 1.5, borderColor: Colors.primary },
  groupName: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray900 },
  groupMeta: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  memberName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  kpiRow: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  kpi: { flex: 1, backgroundColor: Colors.background, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 10, alignItems: 'center' },
  kpiValue: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  kpiLabel: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  chipActive: { backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipTxtActive: { color: Colors.primary },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 12 },
});
