import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { hotelApi, pmsApi } from '../../../src/api/index.js';
import { PageHeader } from '../../../src/components/common/PageHeader.js';
import { Card } from '../../../src/components/common/Card.js';
import { Button } from '../../../src/components/common/Button.js';
import { Input } from '../../../src/components/common/Input.js';
import { Colors, FontSize, Spacing, Radius } from '../../../src/theme/index.js';

const MEAL_PLANS = [
  { value: 'ROOM_ONLY', label: 'Room only' },
  { value: 'BREAKFAST', label: 'Breakfast included' },
  { value: 'HALF_BOARD', label: 'Half board' },
  { value: 'FULL_BOARD', label: 'Full board' },
];

export default function RoomTypesScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [ratePlansByType, setRatePlansByType] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddType, setShowAddType] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: '', maxOccupancy: '2', description: '' });
  const [savingType, setSavingType] = useState(false);
  const [rpForm, setRpForm] = useState({}); // roomTypeId -> { name, baseRate, mealPlan }
  const [rpFormOpenFor, setRpFormOpenFor] = useState(null);
  const [savingRp, setSavingRp] = useState(false);

  const loadRoomTypes = useCallback(async (hId) => {
    const res = await pmsApi.listRoomTypes(hId);
    const types = res.data.data || [];
    setRoomTypes(types);
    const plans = {};
    await Promise.all(types.map(async rt => {
      try { plans[rt.id] = (await pmsApi.listRatePlans(rt.id)).data.data || []; }
      catch { plans[rt.id] = []; }
    }));
    setRatePlansByType(plans);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hRes = await hotelApi.getMyHotels();
        const hotel = (hRes.data.data || [])[0];
        if (!hotel) return;
        setHotelId(hotel.id);
        await loadRoomTypes(hotel.id);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [loadRoomTypes]);

  const addRoomType = async () => {
    if (!typeForm.name.trim()) return Alert.alert('Room type name is required');
    setSavingType(true);
    try {
      await pmsApi.createRoomType({ hotelId, name: typeForm.name, maxOccupancy: Number(typeForm.maxOccupancy) || 2, description: typeForm.description });
      setTypeForm({ name: '', maxOccupancy: '2', description: '' });
      setShowAddType(false);
      await loadRoomTypes(hotelId);
    } catch { Alert.alert('Could not create room type'); }
    finally { setSavingType(false); }
  };

  const addRatePlan = async (roomTypeId) => {
    const rp = rpForm[roomTypeId] || {};
    if (!rp.name?.trim() || !rp.baseRate) return Alert.alert('Rate plan name and base rate are required');
    setSavingRp(true);
    try {
      await pmsApi.createRatePlan({ hotelId, roomTypeId, name: rp.name, baseRate: Number(rp.baseRate), mealPlan: rp.mealPlan || 'ROOM_ONLY' });
      setRpForm(p => ({ ...p, [roomTypeId]: { name: '', baseRate: '', mealPlan: 'ROOM_ONLY' } }));
      setRpFormOpenFor(null);
      await loadRoomTypes(hotelId);
    } catch { Alert.alert('Could not create rate plan'); }
    finally { setSavingRp(false); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Room Types & Rates" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Room Types & Rates" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Button title={showAddType ? 'Cancel' : '+ Add Room Type'} variant={showAddType ? 'ghost' : 'primary'} onPress={() => setShowAddType(s => !s)} style={{ marginBottom: 12 }} />

        {showAddType && (
          <Card style={{ marginBottom: 16 }}>
            <Input label="Name *" placeholder="e.g. Deluxe" value={typeForm.name} onChangeText={v => setTypeForm(f => ({ ...f, name: v }))} />
            <Input label="Max occupancy" keyboardType="number-pad" value={typeForm.maxOccupancy} onChangeText={v => setTypeForm(f => ({ ...f, maxOccupancy: v }))} />
            <Input label="Description" value={typeForm.description} onChangeText={v => setTypeForm(f => ({ ...f, description: v }))} />
            <Button title={savingType ? 'Saving…' : 'Save Room Type'} loading={savingType} onPress={addRoomType} />
          </Card>
        )}

        {roomTypes.map(rt => (
          <Card key={rt.id} style={{ marginBottom: 12 }}>
            <Text style={ss.typeName}>{rt.name} <Text style={ss.typeMeta}>· up to {rt.maxOccupancy} guests</Text></Text>

            {(ratePlansByType[rt.id] || []).map(rp => (
              <View key={rp.id} style={ss.rpRow}>
                <View style={{ flex: 1 }}>
                  <Text style={ss.rpName}>{rp.name}</Text>
                  <Text style={ss.rpMeta}>{(rp.mealPlan || 'ROOM_ONLY').replace('_', ' ')}</Text>
                </View>
                <Text style={ss.rpRate}>₹{Number(rp.baseRate).toLocaleString('en-IN')}/night</Text>
              </View>
            ))}
            {(ratePlansByType[rt.id] || []).length === 0 && <Text style={ss.emptyTxt}>No rate plans yet.</Text>}

            {rpFormOpenFor === rt.id ? (
              <View style={{ marginTop: 10 }}>
                <Input placeholder="Plan name (e.g. Standard Plan)" value={rpForm[rt.id]?.name || ''} onChangeText={v => setRpForm(p => ({ ...p, [rt.id]: { ...p[rt.id], name: v } }))} />
                <Input placeholder="Base rate per night" keyboardType="number-pad" value={rpForm[rt.id]?.baseRate || ''} onChangeText={v => setRpForm(p => ({ ...p, [rt.id]: { ...p[rt.id], baseRate: v } }))} />
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {MEAL_PLANS.map(mp => {
                    const active = (rpForm[rt.id]?.mealPlan || 'ROOM_ONLY') === mp.value;
                    return (
                      <TouchableOpacity key={mp.value} onPress={() => setRpForm(p => ({ ...p, [rt.id]: { ...p[rt.id], mealPlan: mp.value } }))}
                        style={[ss.chip, active && ss.chipActive]}>
                        <Text style={[ss.chipTxt, active && ss.chipTxtActive]}>{mp.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button title="Cancel" variant="ghost" size="sm" onPress={() => setRpFormOpenFor(null)} style={{ flex: 1 }} />
                  <Button title={savingRp ? 'Saving…' : 'Add Rate Plan'} size="sm" loading={savingRp} onPress={() => addRatePlan(rt.id)} style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setRpFormOpenFor(rt.id)} style={ss.addRpBtn}>
                <Text style={ss.addRpTxt}>+ Add rate plan</Text>
              </TouchableOpacity>
            )}
          </Card>
        ))}

        {roomTypes.length === 0 && !showAddType && (
          <Text style={ss.emptyTxt}>No room types yet — add one to get started.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  typeName: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 10 },
  typeMeta: { fontSize: FontSize.xs, fontWeight: '500', color: Colors.gray500 },
  rpRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  rpName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  rpMeta: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 1 },
  rpRate: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primary },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 8 },
  addRpBtn: { marginTop: 8, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed' },
  addRpTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  chipActive: { backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipTxtActive: { color: Colors.primary },
});
