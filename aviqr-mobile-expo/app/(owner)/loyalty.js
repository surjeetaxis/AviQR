import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { loyaltyApi, shopApi } from '../../src/api/index.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

// Bronze → Platinum tiers derived client-side from lifetime points (the
// backend LoyaltyAccount entity tracks lifetimePoints but not a tier field).
function tierFor(points) {
  if (points >= 5000) return { label: 'Platinum', color: '#7C3AED' };
  if (points >= 2000) return { label: 'Gold', color: '#D97706' };
  if (points >= 500)  return { label: 'Silver', color: '#6B7280' };
  return { label: 'Bronze', color: '#92400E' };
}

export default function LoyaltyScreen() {
  const shopId = useActiveShopId();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [enabled, setEnabled]     = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [history, setHistory]     = useState([]);
  const [modal, setModal]         = useState(null); // 'earn' | 'redeem'
  const [amount, setAmount]       = useState('');
  const [saving, setSaving]       = useState(false);

  const load = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.allSettled([loyaltyApi.getCustomers(shopId), shopApi.getSettings(shopId)]);
      if (cRes.status === 'fulfilled') setCustomers(cRes.value.data.data || []);
      if (sRes.status === 'fulfilled') setEnabled(!!sRes.value.data.data?.loyaltyEnabled);
    } catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [shopId]);

  const toggleEnabled = async (next) => {
    setEnabled(next); setSavingSettings(true);
    try { await shopApi.saveSettings(shopId, { loyaltyEnabled: next }); }
    catch { Alert.alert('Failed to update setting'); setEnabled(!next); }
    finally { setSavingSettings(false); }
  };

  const openCustomer = async (c) => {
    setSelected(c); setHistory([]);
    try { const res = await loyaltyApi.getHistory(shopId, c.customerPhone); setHistory(res.data.data || []); } catch {}
  };

  const submitEarnRedeem = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setSaving(true);
    try {
      if (modal === 'earn') await loyaltyApi.earn(shopId, { customerPhone: selected.customerPhone, customerName: selected.customerName, orderAmount: amt });
      else await loyaltyApi.redeem(shopId, { customerPhone: selected.customerPhone, pointsToRedeem: Math.round(amt) });
      setModal(null); setAmount('');
      await load();
      setSelected(null);
    } catch (e) { Alert.alert('Failed', e.response?.data?.message || 'Please try again.'); }
    finally { setSaving(false); }
  };

  const sorted = [...customers].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

  return (
    <View style={ss.screen}>
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={ss.back}>‹ Back</Text></TouchableOpacity>
        <Text style={ss.title}>Loyalty</Text>
        <View style={{ width: 44 }} />
      </View>
      {enabled !== null && (
        <View style={ss.enableRow}>
          <Text style={ss.enableLabel}>Loyalty program {enabled ? 'active' : 'disabled'}</Text>
          <Switch value={enabled} onValueChange={toggleEnabled} disabled={savingSettings} trackColor={{ true: Colors.primary }} thumbColor={Colors.white} />
        </View>
      )}
      <FlatList
        data={sorted}
        keyExtractor={c => c.customerPhone}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        ListEmptyComponent={!loading && <EmptyState icon="🏆" title="No loyalty members yet" />}
        renderItem={({ item }) => {
          const tier = tierFor(item.lifetimePoints || 0);
          return (
            <TouchableOpacity style={ss.card} onPress={() => openCustomer(item)}>
              <View style={[ss.tierDot, { backgroundColor: tier.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={ss.name}>{item.customerName || item.customerPhone}</Text>
                <Text style={ss.sub}>{item.totalOrders || 0} orders · {item.totalVisits || 0} visits</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={ss.points}>⭐ {item.totalPoints || 0}</Text>
                <Text style={[ss.tierTxt, { color: tier.color }]}>{tier.label}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)} height={480}>
        {selected && (
          <View>
            <Text style={ss.sheetTitle}>{selected.customerName || selected.customerPhone}</Text>
            <Text style={ss.pointsBig}>⭐ {selected.totalPoints || 0} points</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12 }}>
              <Button title="+ Earn" onPress={() => setModal('earn')} style={{ flex: 1 }} />
              <Button title="− Redeem" onPress={() => setModal('redeem')} variant="outline" style={{ flex: 1 }} />
            </View>
            <Text style={ss.historyTitle}>Recent Activity</Text>
            <FlatList
              data={history}
              keyExtractor={(h, i) => String(i)}
              style={{ maxHeight: 220 }}
              ListEmptyComponent={<Text style={ss.sub}>No activity yet</Text>}
              renderItem={({ item: h }) => (
                <View style={ss.historyRow}>
                  <Text style={ss.historyType}>{h.type || (h.points > 0 ? 'Earned' : 'Redeemed')}</Text>
                  <Text style={[ss.historyPts, { color: (h.points || 0) >= 0 ? '#059669' : '#DC2626' }]}>{h.points > 0 ? '+' : ''}{h.points}</Text>
                </View>
              )}
            />
          </View>
        )}
      </BottomSheet>

      <BottomSheet visible={!!modal} onClose={() => setModal(null)}>
        <Text style={ss.sheetTitle}>{modal === 'earn' ? 'Add Points from Order' : 'Redeem Points'}</Text>
        <Input label={modal === 'earn' ? 'Order Amount (₹)' : 'Points to Redeem'} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <Button title={saving ? 'Saving…' : 'Confirm'} onPress={submitEarnRedeem} loading={saving} style={{ marginTop: 8 }} />
      </BottomSheet>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  enableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  enableLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 10, ...Shadow.sm },
  tierDot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  points: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  tierTxt: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 8 },
  pointsBig: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  historyTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray700, marginBottom: 8 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray50 },
  historyType: { fontSize: FontSize.sm, color: Colors.gray700 },
  historyPts: { fontSize: FontSize.sm, fontWeight: '700' },
});
