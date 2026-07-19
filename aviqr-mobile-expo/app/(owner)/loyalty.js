import { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Switch, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { loyaltyApi, shopApi, customerApi } from '../../src/api/index.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

// Bronze → Platinum tiers derived client-side from LIFETIME points. The
// backend's own LoyaltyAccount.lifetimePoints comment says this field exists
// specifically "for tier calculation" (never decremented, unlike totalPoints
// which drops on redemption) — using it here is correct, not a shortcut.
const TIERS = [
  { key: 'bronze',   label: 'Bronze',   color: '#92400E', min: 0 },
  { key: 'silver',   label: 'Silver',   color: '#6B7280', min: 500 },
  { key: 'gold',     label: 'Gold',     color: '#D97706', min: 2000 },
  { key: 'platinum', label: 'Platinum', color: '#7C3AED', min: 5000 },
];
function tierFor(points) {
  return [...TIERS].reverse().find(t => points >= t.min) || TIERS[0];
}
const SORTS = [
  { key: 'points', label: 'Points' },
  { key: 'visits', label: 'Visits' },
  { key: 'recent', label: 'Recent' },
];

export default function LoyaltyScreen() {
  const shopId = useActiveShopId();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [enabled, setEnabled]     = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [search, setSearch]       = useState('');
  const [sortBy, setSortBy]       = useState('points');
  const [selected, setSelected]   = useState(null);
  const [history, setHistory]     = useState([]);
  const [modal, setModal]         = useState(null); // 'earn' | 'redeem'
  const [amount, setAmount]       = useState('');
  const [saving, setSaving]       = useState(false);
  const [sheetView, setSheetView] = useState('overview'); // 'overview' | 'profile'
  const [profile, setProfile]     = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving]   = useState(false);
  const [newLabel, setNewLabel]   = useState('');
  const [exporting, setExporting] = useState(false);

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
    setSelected(c); setHistory([]); setSheetView('overview'); setProfile(null);
    try { const res = await loyaltyApi.getHistory(shopId, c.customerPhone); setHistory(res.data.data || []); } catch {}
  };

  const openProfile = async () => {
    setSheetView('profile'); setProfileLoading(true);
    try {
      const res = await customerApi.getProfile(shopId, selected.customerPhone);
      setProfile(res.data.data || { email: '', birthday: '', anniversary: '', notes: '', labels: [] });
    } catch {
      setProfile({ email: '', birthday: '', anniversary: '', notes: '', labels: [] });
    } finally { setProfileLoading(false); }
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      await customerApi.updateProfile(shopId, {
        phone: selected.customerPhone, name: selected.customerName,
        email: profile.email, birthday: profile.birthday || null, anniversary: profile.anniversary || null,
      });
      await customerApi.updateNotes(shopId, { phone: selected.customerPhone, notes: profile.notes });
      Alert.alert('Saved', 'Customer profile updated.');
    } catch { Alert.alert('Could not save', 'Please try again.'); }
    finally { setProfileSaving(false); }
  };

  const addLabel = async () => {
    const label = newLabel.trim();
    if (!label) return;
    try {
      await customerApi.addLabel(shopId, { phone: selected.customerPhone, label });
      setProfile(p => ({ ...p, labels: [...(p.labels || []), label] }));
      setNewLabel('');
    } catch { Alert.alert('Could not add label'); }
  };
  const removeLabel = async (label) => {
    try {
      await customerApi.removeLabel(shopId, selected.customerPhone, label);
      setProfile(p => ({ ...p, labels: (p.labels || []).filter(l => l !== label) }));
    } catch { Alert.alert('Could not remove label'); }
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

  const filtered = useMemo(() => customers.filter(c => !search ||
    [c.customerName, c.customerPhone].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  ), [customers, search]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortBy === 'points') list.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
    else if (sortBy === 'visits') list.sort((a, b) => (b.totalVisits || 0) - (a.totalVisits || 0));
    else list.sort((a, b) => new Date(b.lastVisitAt || 0) - new Date(a.lastVisitAt || 0));
    return list;
  }, [filtered, sortBy]);

  const tierCounts = useMemo(() => {
    const counts = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    customers.forEach(c => { counts[tierFor(c.lifetimePoints || 0).key]++; });
    return counts;
  }, [customers]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const header = 'Name,Phone,Points,Lifetime Points,Tier,Orders,Visits,Last Visit\n';
      const rows = sorted.map(c => {
        const t = tierFor(c.lifetimePoints || 0);
        return [c.customerName || '', c.customerPhone, c.totalPoints || 0, c.lifetimePoints || 0, t.label, c.totalOrders || 0, c.totalVisits || 0, c.lastVisitAt || '']
          .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      }).join('\n');
      const path = `${FileSystem.cacheDirectory}loyalty-members.csv`;
      await FileSystem.writeAsStringAsync(path, header + rows);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: 'text/csv' });
    } catch { Alert.alert('Export failed', 'Could not generate the CSV.'); }
    finally { setExporting(false); }
  };

  return (
    <View style={ss.screen}>
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={ss.back}>‹ Back</Text></TouchableOpacity>
        <Text style={ss.title}>Loyalty</Text>
        <TouchableOpacity onPress={exportCsv} disabled={exporting}>
          <Text style={ss.exportBtn}>{exporting ? '…' : '⬇ CSV'}</Text>
        </TouchableOpacity>
      </View>
      {enabled !== null && (
        <View style={ss.enableRow}>
          <Text style={ss.enableLabel}>Loyalty program {enabled ? 'active' : 'disabled'}</Text>
          <Switch value={enabled} onValueChange={toggleEnabled} disabled={savingSettings} trackColor={{ true: Colors.primary }} thumbColor={Colors.white} />
        </View>
      )}

      <View style={ss.tierGrid}>
        {TIERS.map(t => (
          <View key={t.key} style={ss.tierCard}>
            <View style={[ss.tierDotBig, { backgroundColor: t.color }]} />
            <Text style={ss.tierCount}>{tierCounts[t.key]}</Text>
            <Text style={ss.tierCardLabel}>{t.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: Spacing.base, gap: 8 }}>
        <Input placeholder="Search by name or phone…" value={search} onChangeText={setSearch} />
        <View style={ss.sortRow}>
          <Text style={ss.sortLabel}>Sort:</Text>
          {SORTS.map(s => (
            <TouchableOpacity key={s.key} style={[ss.sortChip, sortBy === s.key && ss.sortChipActive]} onPress={() => setSortBy(s.key)}>
              <Text style={[ss.sortChipTxt, sortBy === s.key && ss.sortChipTxtActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)} height={sheetView === 'profile' ? 560 : 480}>
        {selected && sheetView === 'overview' && (
          <View>
            <View style={ss.sheetHeadRow}>
              <Text style={ss.sheetTitle}>{selected.customerName || selected.customerPhone}</Text>
              <TouchableOpacity onPress={openProfile}><Text style={ss.profileLink}>✏️ Profile</Text></TouchableOpacity>
            </View>
            <Text style={ss.pointsBig}>⭐ {selected.totalPoints || 0} points</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12 }}>
              <Button title="+ Earn" onPress={() => setModal('earn')} style={{ flex: 1 }} />
              <Button title="− Redeem" onPress={() => setModal('redeem')} variant="outline" style={{ flex: 1 }} />
            </View>
            <Text style={ss.historyTitle}>Recent Activity</Text>
            <FlatList
              data={history}
              keyExtractor={(h, i) => String(i)}
              style={{ maxHeight: 180 }}
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

        {selected && sheetView === 'profile' && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={ss.sheetHeadRow}>
              <TouchableOpacity onPress={() => setSheetView('overview')}><Text style={ss.profileLink}>‹ Back</Text></TouchableOpacity>
              <Text style={ss.sheetTitle}>{selected.customerName || selected.customerPhone}</Text>
              <View style={{ width: 44 }} />
            </View>
            {profileLoading || !profile ? <Text style={ss.sub}>Loading…</Text> : (
              <>
                <Input label="Email" value={profile.email || ''} onChangeText={v => setProfile(p => ({ ...p, email: v }))} keyboardType="email-address" autoCapitalize="none" />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Input label="Birthday (YYYY-MM-DD)" value={profile.birthday || ''} onChangeText={v => setProfile(p => ({ ...p, birthday: v }))} placeholder="1990-05-12" style={{ flex: 1 }} />
                  <Input label="Anniversary" value={profile.anniversary || ''} onChangeText={v => setProfile(p => ({ ...p, anniversary: v }))} placeholder="2015-11-02" style={{ flex: 1 }} />
                </View>
                <Input label="Notes" value={profile.notes || ''} onChangeText={v => setProfile(p => ({ ...p, notes: v }))} multiline style={{ height: 80 }} />
                <Text style={ss.fieldLabel}>Labels</Text>
                <View style={ss.labelWrap}>
                  {(profile.labels || []).map(l => (
                    <TouchableOpacity key={l} style={ss.labelChip} onPress={() => removeLabel(l)}>
                      <Text style={ss.labelChipTxt}>{l} ✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <Input placeholder="Add a label (e.g. VIP)" value={newLabel} onChangeText={setNewLabel} style={{ flex: 1 }} />
                  <Button title="Add" onPress={addLabel} size="sm" />
                </View>
                <Button title={profileSaving ? 'Saving…' : 'Save Profile'} onPress={saveProfile} loading={profileSaving} />
              </>
            )}
          </ScrollView>
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
  exportBtn: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  enableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  enableLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700 },
  tierGrid: { flexDirection: 'row', padding: Spacing.base, paddingBottom: 4, gap: 8 },
  tierCard: { flex: 1, alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border },
  tierDotBig: { width: 14, height: 14, borderRadius: 7 },
  tierCount: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginTop: 4 },
  tierCardLabel: { fontSize: 10, color: Colors.gray500, marginTop: 2 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortLabel: { fontSize: FontSize.xs, color: Colors.gray500, marginRight: 2 },
  sortChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  sortChipActive: { backgroundColor: Colors.primary },
  sortChipTxt: { fontSize: 11, fontWeight: '700', color: Colors.gray700 },
  sortChipTxtActive: { color: Colors.white },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 10, ...Shadow.sm },
  tierDot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  points: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  tierTxt: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  sheetHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900 },
  profileLink: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  pointsBig: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  historyTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray700, marginBottom: 8 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray50 },
  historyType: { fontSize: FontSize.sm, color: Colors.gray700 },
  historyPts: { fontSize: FontSize.sm, fontWeight: '700' },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700, marginBottom: 6 },
  labelWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  labelChip: { backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  labelChipTxt: { fontSize: 11, fontWeight: '700', color: Colors.primaryDark },
});
