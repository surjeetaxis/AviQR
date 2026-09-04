import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Switch } from 'react-native';
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

const today = () => new Date().toISOString().slice(0, 10);
const emptyDateForm = () => ({ date: today(), price: '', minStay: '', maxStay: '', closedToArrival: false, closedToDeparture: false });

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
  const [dateManagerFor, setDateManagerFor] = useState(null); // ratePlanId currently expanded
  const [dayRows, setDayRows] = useState({}); // ratePlanId -> rows
  const [dateForm, setDateForm] = useState({}); // ratePlanId -> form
  const [suggestion, setSuggestion] = useState({}); // ratePlanId -> suggestion
  const [suggesting, setSuggesting] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

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

  const loadDayPrices = async (ratePlanId) => {
    const to = new Date(); to.setDate(to.getDate() + 30);
    try {
      const res = await pmsApi.listDayPrices(ratePlanId, today(), to.toISOString().slice(0, 10));
      setDayRows(p => ({ ...p, [ratePlanId]: res.data.data || [] }));
    } catch { setDayRows(p => ({ ...p, [ratePlanId]: [] })); }
  };

  const toggleDateManager = (ratePlanId) => {
    if (dateManagerFor === ratePlanId) { setDateManagerFor(null); return; }
    setDateManagerFor(ratePlanId);
    if (!dateForm[ratePlanId]) setDateForm(p => ({ ...p, [ratePlanId]: emptyDateForm() }));
    loadDayPrices(ratePlanId);
  };

  const suggestPriceFor = async (ratePlanId, roomTypeId) => {
    const f = dateForm[ratePlanId] || emptyDateForm();
    setSuggesting(true);
    try {
      const res = await pmsApi.suggestPrice(hotelId, roomTypeId, ratePlanId, f.date);
      setSuggestion(p => ({ ...p, [ratePlanId]: res.data.data }));
    } catch (err) { Alert.alert(err?.response?.data?.message || 'Could not compute a pricing suggestion'); }
    finally { setSuggesting(false); }
  };

  const applySuggestion = (ratePlanId) => {
    const s = suggestion[ratePlanId];
    if (!s) return;
    setDateForm(p => ({ ...p, [ratePlanId]: { ...(p[ratePlanId] || emptyDateForm()), price: String(s.suggestedPrice) } }));
    setSuggestion(p => ({ ...p, [ratePlanId]: null }));
  };

  const submitDayPrice = async (ratePlanId) => {
    const f = dateForm[ratePlanId] || emptyDateForm();
    setSavingDate(true);
    try {
      await pmsApi.setDayPrice(ratePlanId, {
        date: f.date,
        price: f.price ? Number(f.price) : null,
        minStay: f.minStay ? Number(f.minStay) : null,
        maxStay: f.maxStay ? Number(f.maxStay) : null,
        closedToArrival: f.closedToArrival,
        closedToDeparture: f.closedToDeparture,
      });
      setDateForm(p => ({ ...p, [ratePlanId]: { ...emptyDateForm(), date: f.date } }));
      loadDayPrices(ratePlanId);
    } catch { Alert.alert('Could not save date rule'); }
    finally { setSavingDate(false); }
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
              <View key={rp.id}>
                <View style={ss.rpRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={ss.rpName}>{rp.name}</Text>
                    <Text style={ss.rpMeta}>{(rp.mealPlan || 'ROOM_ONLY').replace('_', ' ')}</Text>
                  </View>
                  <Text style={ss.rpRate}>₹{Number(rp.baseRate).toLocaleString('en-IN')}/night</Text>
                </View>
                <TouchableOpacity onPress={() => toggleDateManager(rp.id)} style={ss.dateManagerToggle}>
                  <Text style={ss.dateManagerToggleTxt}>{dateManagerFor === rp.id ? 'Hide dates' : 'Manage dates'} — {rp.name}</Text>
                </TouchableOpacity>
                {dateManagerFor === rp.id && (
                  <View style={ss.dateManagerBox}>
                    <Text style={ss.dateManagerTitle}>{rp.name} — date rules (next 30 days)</Text>
                    <Input label="Date (YYYY-MM-DD)" value={dateForm[rp.id]?.date || today()} onChangeText={v => setDateForm(p => ({ ...p, [rp.id]: { ...(p[rp.id] || emptyDateForm()), date: v } }))} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Input label="Price override" keyboardType="number-pad" value={dateForm[rp.id]?.price || ''} onChangeText={v => setDateForm(p => ({ ...p, [rp.id]: { ...(p[rp.id] || emptyDateForm()), price: v } }))} style={{ flex: 1 }} />
                      <Button title={suggesting ? '…' : 'Suggest'} size="sm" variant="outline" loading={suggesting} onPress={() => suggestPriceFor(rp.id, rt.id)} style={{ marginTop: 20 }} />
                    </View>
                    {suggestion[rp.id] && (
                      <View style={ss.suggestionBox}>
                        <Text style={ss.suggestionTxt}>
                          Base ₹{Number(suggestion[rp.id].baseRate).toLocaleString('en-IN')} · {suggestion[rp.id].occupancyPercent}% occupied · <Text style={{ fontWeight: '800' }}>Suggested ₹{Number(suggestion[rp.id].suggestedPrice).toLocaleString('en-IN')}</Text> — {suggestion[rp.id].reason}
                        </Text>
                        <Button title="Use this price" size="sm" onPress={() => applySuggestion(rp.id)} />
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Input label="Min stay" keyboardType="number-pad" value={dateForm[rp.id]?.minStay || ''} onChangeText={v => setDateForm(p => ({ ...p, [rp.id]: { ...(p[rp.id] || emptyDateForm()), minStay: v } }))} style={{ flex: 1 }} />
                      <Input label="Max stay" keyboardType="number-pad" value={dateForm[rp.id]?.maxStay || ''} onChangeText={v => setDateForm(p => ({ ...p, [rp.id]: { ...(p[rp.id] || emptyDateForm()), maxStay: v } }))} style={{ flex: 1 }} />
                    </View>
                    <View style={ss.switchRow}>
                      <Text style={ss.switchLabel}>Closed to arrival</Text>
                      <Switch value={!!dateForm[rp.id]?.closedToArrival} onValueChange={v => setDateForm(p => ({ ...p, [rp.id]: { ...(p[rp.id] || emptyDateForm()), closedToArrival: v } }))} trackColor={{ true: Colors.primary }} />
                    </View>
                    <View style={ss.switchRow}>
                      <Text style={ss.switchLabel}>Closed to departure</Text>
                      <Switch value={!!dateForm[rp.id]?.closedToDeparture} onValueChange={v => setDateForm(p => ({ ...p, [rp.id]: { ...(p[rp.id] || emptyDateForm()), closedToDeparture: v } }))} trackColor={{ true: Colors.primary }} />
                    </View>
                    <Button title={savingDate ? 'Saving…' : 'Save Date Rule'} loading={savingDate} onPress={() => submitDayPrice(rp.id)} style={{ marginBottom: 12 }} />

                    {(dayRows[rp.id] || []).map(r => (
                      <View key={r.id} style={ss.dayRow}>
                        <Text style={ss.dayRowDate}>{r.date}</Text>
                        <Text style={ss.dayRowMeta}>{r.price != null ? `₹${Number(r.price).toLocaleString('en-IN')}` : '—'}{r.minStay ? ` · min ${r.minStay}n` : ''}{r.maxStay ? ` · max ${r.maxStay}n` : ''}{r.closedToArrival ? ' · CTA' : ''}{r.closedToDeparture ? ' · CTD' : ''}</Text>
                      </View>
                    ))}
                    {(dayRows[rp.id] || []).length === 0 && <Text style={ss.emptyTxt}>No date rules set.</Text>}
                  </View>
                )}
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
  dateManagerToggle: { paddingVertical: 6 },
  dateManagerToggleTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray500 },
  dateManagerBox: { marginTop: 4, marginBottom: 8, padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  dateManagerTitle: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.gray900, marginBottom: 8 },
  suggestionBox: { backgroundColor: '#F0FDF4', borderRadius: Radius.md, padding: 10, marginBottom: 10, gap: 8 },
  suggestionTxt: { fontSize: FontSize.xs, color: Colors.gray700 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  switchLabel: { fontSize: FontSize.sm, color: Colors.gray700 },
  dayRow: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.border },
  dayRowDate: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray900 },
  dayRowMeta: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 1 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  chipActive: { backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipTxtActive: { color: Colors.primary },
});
