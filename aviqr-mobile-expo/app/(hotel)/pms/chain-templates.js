import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { hotelApi, pmsApi } from '../../../src/api/index.js';
import { PageHeader } from '../../../src/components/common/PageHeader.js';
import { Card } from '../../../src/components/common/Card.js';
import { Button } from '../../../src/components/common/Button.js';
import { Input } from '../../../src/components/common/Input.js';
import { Colors, FontSize, Spacing, Radius } from '../../../src/theme/index.js';

const MEAL_PLANS = ['ROOM_ONLY', 'BREAKFAST', 'HALF_BOARD', 'FULL_BOARD'];
const EMPTY_RT_FORM = { name: '', maxOccupancy: '2', description: '' };
const EMPTY_RP_FORM = { roomTypeTemplateId: '', name: '', baseRate: '', mealPlan: 'ROOM_ONLY' };

// Chain-level templates: define a room type / rate plan once at the chain level
// and push it to every member property, instead of each hotel self-managing its
// own from scratch. Reuses each hotel's existing RoomType/RatePlan tables — this
// screen is only visible/useful when the logged-in hotel belongs to a chain.
export default function ChainTemplatesScreen() {
  const [chainId, setChainId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomTypeTemplates, setRoomTypeTemplates] = useState([]);
  const [ratePlanTemplates, setRatePlanTemplates] = useState([]);
  const [showRtForm, setShowRtForm] = useState(false);
  const [rtForm, setRtForm] = useState(EMPTY_RT_FORM);
  const [savingRt, setSavingRt] = useState(false);
  const [showRpForm, setShowRpForm] = useState(false);
  const [rpForm, setRpForm] = useState(EMPTY_RP_FORM);
  const [savingRp, setSavingRp] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState(null);

  const roomTypeTemplateName = (id) => roomTypeTemplates.find(t => t.id === id)?.name || id;

  const load = useCallback(async (cId) => {
    const [rtRes, rpRes] = await Promise.allSettled([
      pmsApi.listChainRoomTypeTemplates(cId), pmsApi.listChainRatePlanTemplates(cId),
    ]);
    if (rtRes.status === 'fulfilled') setRoomTypeTemplates(rtRes.value.data.data || []);
    if (rpRes.status === 'fulfilled') setRatePlanTemplates(rpRes.value.data.data || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hRes = await hotelApi.getMyHotels();
        const hotel = (hRes.data.data || [])[0];
        if (!hotel?.chainId) return;
        setChainId(hotel.chainId);
        await load(hotel.chainId);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [load]);

  const addRoomTypeTemplate = async () => {
    if (!rtForm.name.trim()) return Alert.alert('Template name is required');
    setSavingRt(true);
    try {
      await pmsApi.createChainRoomTypeTemplate(chainId, { name: rtForm.name, description: rtForm.description, maxOccupancy: Number(rtForm.maxOccupancy) || 2 });
      setRtForm(EMPTY_RT_FORM);
      setShowRtForm(false);
      await load(chainId);
    } catch (err) { Alert.alert(err?.response?.data?.message || 'Could not create room-type template'); }
    finally { setSavingRt(false); }
  };

  const addRatePlanTemplate = async () => {
    if (!rpForm.roomTypeTemplateId || !rpForm.name.trim() || !rpForm.baseRate) {
      return Alert.alert('Room-type template, name, and base rate are required');
    }
    setSavingRp(true);
    try {
      await pmsApi.createChainRatePlanTemplate(chainId, {
        roomTypeTemplateId: rpForm.roomTypeTemplateId, name: rpForm.name,
        baseRate: Number(rpForm.baseRate), mealPlan: rpForm.mealPlan,
      });
      setRpForm(EMPTY_RP_FORM);
      setShowRpForm(false);
      await load(chainId);
    } catch (err) { Alert.alert(err?.response?.data?.message || 'Could not create rate-plan template'); }
    finally { setSavingRp(false); }
  };

  const pushToProperties = async () => {
    setPushing(true);
    setPushResult(null);
    try {
      const res = await pmsApi.pushChainTemplates(chainId);
      setPushResult(res.data.data);
    } catch (err) { Alert.alert(err?.response?.data?.message || 'Push failed — only the chain owner can push templates'); }
    finally { setPushing(false); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Chain Templates" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  if (!chainId) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Chain Templates" />
      <View style={{ padding: Spacing.base }}>
        <Text style={ss.emptyTxt}>This hotel isn't part of a chain, so there's nothing to manage here.</Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Chain Templates" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.sub}>Define a room type or rate plan once, then push it to every property in the chain.</Text>

        <Button title={pushing ? 'Pushing…' : 'Push to All Properties'} loading={pushing} onPress={pushToProperties} style={{ marginBottom: 12 }} />
        {pushResult && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={ss.cardTitle}>Push result</Text>
            <Text style={ss.resultRow}>{pushResult.hotelsProcessed} propert{pushResult.hotelsProcessed === 1 ? 'y' : 'ies'} processed</Text>
            <Text style={ss.resultRow}>Room types: {pushResult.roomTypesCreated} created, {pushResult.roomTypesUpdated} updated</Text>
            <Text style={ss.resultRow}>Rate plans: {pushResult.ratePlansCreated} created, {pushResult.ratePlansUpdated} updated</Text>
          </Card>
        )}

        <Text style={ss.cardTitle}>Room-type templates ({roomTypeTemplates.length})</Text>
        <Button title={showRtForm ? 'Cancel' : '+ Add Room-Type Template'} variant={showRtForm ? 'ghost' : 'outline'} size="sm" onPress={() => setShowRtForm(s => !s)} style={{ marginBottom: 12 }} />
        {showRtForm && (
          <Card style={{ marginBottom: 16 }}>
            <Input label="Name *" value={rtForm.name} onChangeText={v => setRtForm(f => ({ ...f, name: v }))} />
            <Input label="Max occupancy" keyboardType="number-pad" value={rtForm.maxOccupancy} onChangeText={v => setRtForm(f => ({ ...f, maxOccupancy: v }))} />
            <Input label="Description" value={rtForm.description} onChangeText={v => setRtForm(f => ({ ...f, description: v }))} />
            <Button title={savingRt ? 'Saving…' : 'Create Template'} loading={savingRt} onPress={addRoomTypeTemplate} />
          </Card>
        )}
        {roomTypeTemplates.map(t => (
          <Card key={t.id} style={{ marginBottom: 8 }}>
            <Text style={ss.itemTitle}>{t.name}</Text>
            <Text style={ss.itemMeta}>Max occupancy {t.maxOccupancy}{t.description ? ` · ${t.description}` : ''}</Text>
          </Card>
        ))}
        {roomTypeTemplates.length === 0 && <Text style={ss.emptyTxt}>No room-type templates yet.</Text>}

        <Text style={[ss.cardTitle, { marginTop: 16 }]}>Rate-plan templates ({ratePlanTemplates.length})</Text>
        <Button title={showRpForm ? 'Cancel' : '+ Add Rate-Plan Template'} variant={showRpForm ? 'ghost' : 'outline'} size="sm" onPress={() => setShowRpForm(s => !s)} style={{ marginBottom: 12 }} disabled={roomTypeTemplates.length === 0} />
        {showRpForm && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={ss.fieldLabel}>Room-type template</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {roomTypeTemplates.map(t => (
                <TouchableOpacity key={t.id} onPress={() => setRpForm(f => ({ ...f, roomTypeTemplateId: t.id }))} style={[ss.chip, rpForm.roomTypeTemplateId === t.id && ss.chipActive]}>
                  <Text style={[ss.chipTxt, rpForm.roomTypeTemplateId === t.id && ss.chipTxtActive]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input label="Name *" value={rpForm.name} onChangeText={v => setRpForm(f => ({ ...f, name: v }))} />
            <Input label="Base rate *" keyboardType="numeric" value={rpForm.baseRate} onChangeText={v => setRpForm(f => ({ ...f, baseRate: v }))} />
            <Text style={ss.fieldLabel}>Meal plan</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {MEAL_PLANS.map(mp => (
                <TouchableOpacity key={mp} onPress={() => setRpForm(f => ({ ...f, mealPlan: mp }))} style={[ss.chip, rpForm.mealPlan === mp && ss.chipActive]}>
                  <Text style={[ss.chipTxt, rpForm.mealPlan === mp && ss.chipTxtActive]}>{mp.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title={savingRp ? 'Saving…' : 'Create Template'} loading={savingRp} onPress={addRatePlanTemplate} />
          </Card>
        )}
        {ratePlanTemplates.map(t => (
          <Card key={t.id} style={{ marginBottom: 8 }}>
            <Text style={ss.itemTitle}>{t.name} · ₹{Number(t.baseRate).toLocaleString('en-IN')}</Text>
            <Text style={ss.itemMeta}>{roomTypeTemplateName(t.roomTypeTemplateId)} · {t.mealPlan?.replace('_', ' ')}</Text>
          </Card>
        ))}
        {ratePlanTemplates.length === 0 && <Text style={ss.emptyTxt}>No rate-plan templates yet.</Text>}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  sub: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 14 },
  cardTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 10 },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray500, marginBottom: 6 },
  resultRow: { fontSize: FontSize.sm, color: Colors.gray700, marginTop: 2 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  chipActive: { backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipTxtActive: { color: Colors.primary },
  itemTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray900 },
  itemMeta: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 12 },
});
