import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl, ScrollView } from 'react-native';
import { shopApi, planApi, offerApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { confirmAction } from '../../src/utils/confirmAction.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const FALLBACK_PLANS = {
  STARTER:    { label: 'Starter',    color: '#6B7280', bg: '#F3F4F6', price: 0 },
  GROWTH:     { label: 'Growth',     color: '#059669', bg: '#DCFCE7', price: 999 },
  BUSINESS:   { label: 'Business',   color: '#7C3AED', bg: '#EDE9FE', price: 2499 },
  ENTERPRISE: { label: 'Enterprise', color: '#D97706', bg: '#FEF3C7', price: 0 },
};
const SUB_STATUS_CFG = {
  ACTIVE:        { label: 'Active',        color: '#059669', bg: '#DCFCE7' },
  TRIALING:      { label: 'Trialing',      color: '#2563EB', bg: '#DBEAFE' },
  TRIAL_EXPIRED: { label: 'Trial expired', color: '#DC2626', bg: '#FEE2E2' },
  CANCELED:      { label: 'Canceled',      color: '#6B7280', bg: '#F3F4F6' },
};
const VERTICALS = ['SHOP', 'HOTEL', 'MALL', 'SUPPLIER'];
const TABS = [
  { key: 'shops',  label: 'Shop Assignments' },
  { key: 'plans',  label: 'Manage Plans' },
  { key: 'offers', label: 'Discount Offers' },
];

export default function AdminSubscriptionScreen() {
  const [tab, setTab] = useState('shops');
  const [plans, setPlans] = useState([]);
  const [offers, setOffers] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [offersLoading, setOffersLoading] = useState(true);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    try { const res = await planApi.listAdmin(); setPlans(res.data.data || []); } catch {}
    finally { setPlansLoading(false); }
  }, []);
  const loadOffers = useCallback(async () => {
    setOffersLoading(true);
    try { const res = await offerApi.listAdmin(); setOffers(res.data.data || []); } catch {}
    finally { setOffersLoading(false); }
  }, []);

  useEffect(() => { loadPlans(); loadOffers(); }, [loadPlans, loadOffers]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Subscriptions" />
      <View style={ss.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[ss.tabBtn, tab === t.key && ss.tabBtnActive]} onPress={() => setTab(t.key)}>
            <Text style={[ss.tabTxt, tab === t.key && ss.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'shops' && <ShopAssignmentsTab plans={plans} />}
      {tab === 'plans' && <PlansTab plans={plans} loading={plansLoading} reload={loadPlans} />}
      {tab === 'offers' && <OffersTab offers={offers} plans={plans} loading={offersLoading} reload={loadOffers} />}
    </View>
  );
}

// ── Shop Assignments (existing, unchanged behavior) ─────────────────────────
function ShopAssignmentsTab({ plans }) {
  const [shops, setShops]     = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRef]  = useState(false);
  const [changePlan, setChangePlan] = useState(null);
  const [saving, setSaving] = useState(false);

  const planInfo = (key) => {
    const k = (key || 'STARTER').toUpperCase();
    const live = plans.find(p => p.planKey === k);
    const fallback = FALLBACK_PLANS[k];
    return { label: live?.label || fallback?.label || k, price: live ? live.price : (fallback?.price || 0), color: fallback?.color || '#6B7280', bg: fallback?.bg || '#F3F4F6' };
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await shopApi.listAll({ size: 200 });
      const d = res.data.data;
      setShops(Array.isArray(d) ? d : d?.content || []);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const savePlan = async (planKey) => {
    if (!changePlan) return;
    setSaving(true);
    try {
      await shopApi.update(changePlan.id, { subscriptionPlan: planKey });
      setShops(prev => prev.map(s => s.id === changePlan.id ? { ...s, subscriptionPlan: planKey } : s));
      setChangePlan(null);
    } catch { Alert.alert('Failed to update plan'); }
    finally { setSaving(false); }
  };

  const setSubStatus = async (shop, status) => {
    try {
      await shopApi.updateSubscription(shop.id, status);
      setShops(prev => prev.map(s => s.id !== shop.id ? s : { ...s, subscriptionStatus: status, ...(status === 'CANCELED' ? { subscriptionPlan: 'STARTER', trialEndsAt: null } : {}) }));
    } catch { Alert.alert('Failed to update subscription'); }
  };

  const filtered = shops.filter(s => !search || [s.name, s.city, s.email, s.phone].some(f => f?.toLowerCase().includes(search.toLowerCase())));
  const planChoices = plans.filter(p => p.vertical === 'SHOP' && p.active).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const choices = planChoices.length > 0 ? planChoices.map(p => ({ key: p.planKey, ...planInfo(p.planKey) })) : Object.keys(FALLBACK_PLANS).map(key => ({ key, ...planInfo(key) }));

  const total = shops.length;
  const paid  = shops.filter(s => planInfo(s.subscriptionPlan).price > 0).length;
  const free  = total - paid;
  const mrr   = shops.reduce((acc, s) => acc + (planInfo(s.subscriptionPlan).price || 0), 0);

  return (
    <>
      {offline && <OfflineBadge onRetry={load} />}
      <FlatList
        data={filtered}
        keyExtractor={s => s.id}
        ListHeaderComponent={
          <>
            <View style={ss.kpiGrid}>
              {[['Total shops', total], ['Paid subscribers', paid], ['Free (Starter)', free], ['MRR (est.)', `₹${mrr.toLocaleString('en-IN')}`]].map(([label, value]) => (
                <View key={label} style={ss.kpiCard}>
                  <Text style={ss.kpiVal}>{value}</Text>
                  <Text style={ss.kpiLabel}>{label}</Text>
                </View>
              ))}
            </View>
            <View style={{ paddingHorizontal: Spacing.base }}>
              <Input placeholder="Search shops…" value={search} onChangeText={setSearch} />
            </View>
          </>
        }
        contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="⭐" title="No shops found" />}
        renderItem={({ item }) => {
          const pi = planInfo(item.subscriptionPlan);
          const subStatus = item.subscriptionStatus || 'ACTIVE';
          const sc = SUB_STATUS_CFG[subStatus] || SUB_STATUS_CFG.ACTIVE;
          const daysLeft = subStatus === 'TRIALING' && item.trialEndsAt
            ? Math.ceil((new Date(item.trialEndsAt) - new Date()) / 86400000) : null;
          return (
            <View style={ss.card}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setChangePlan(item)} activeOpacity={0.8}>
                <Text style={ss.name}>{item.name}</Text>
                <Text style={ss.sub}>{item.city || '—'} · {item.email || item.phone || '—'}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <View style={[ss.badge, { backgroundColor: pi.bg }]}><Text style={[ss.badgeTxt, { color: pi.color }]}>{pi.label}</Text></View>
                  <View style={[ss.badge, { backgroundColor: sc.bg }]}><Text style={[ss.badgeTxt, { color: sc.color }]}>{sc.label}{daysLeft != null ? ` · ${daysLeft}d left` : ''}</Text></View>
                </View>
                {item.cancelRequestedAt && <Text style={{ fontSize: 10.5, color: '#D97706', marginTop: 4 }}>Cancel requested</Text>}
              </TouchableOpacity>
              <View style={{ gap: 6 }}>
                {subStatus !== 'ACTIVE' && (
                  <TouchableOpacity onPress={() => setSubStatus(item, 'ACTIVE')}><Text style={[ss.linkTxt, { color: '#059669' }]}>Mark Active</Text></TouchableOpacity>
                )}
                {subStatus !== 'CANCELED' && (
                  <TouchableOpacity onPress={() => setSubStatus(item, 'CANCELED')}><Text style={[ss.linkTxt, { color: Colors.error }]}>Cancel</Text></TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      <BottomSheet visible={!!changePlan} onClose={() => setChangePlan(null)}>
        {changePlan && (
          <View>
            <Text style={ss.sheetTitle}>Change plan — {changePlan.name}</Text>
            <Text style={ss.currentPlan}>Current: {planInfo(changePlan.subscriptionPlan).label}</Text>
            {choices.map(c => (
              <TouchableOpacity key={c.key} style={[ss.planRow, c.key === (changePlan.subscriptionPlan || 'STARTER').toUpperCase() && ss.planRowActive]} onPress={() => savePlan(c.key)} disabled={saving}>
                <Text style={ss.planLabel}>{c.label}</Text>
                <Text style={ss.planPrice}>{c.price > 0 ? `₹${c.price}/mo` : 'Free'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </BottomSheet>
    </>
  );
}

const EMPTY_PLAN = { planKey: '', label: '', vertical: 'SHOP', price: '0', features: '', sortOrder: '0', active: true };

// ── Manage Plans (new) ───────────────────────────────────────────────────────
function PlansTab({ plans, loading, reload }) {
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = edit
  const [form, setForm] = useState(EMPTY_PLAN);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm(EMPTY_PLAN); setEditing({}); };
  const openEdit = (p) => {
    setForm({ planKey: p.planKey, label: p.label, vertical: p.vertical || 'SHOP', price: String(p.price ?? 0), features: p.features || '', sortOrder: String(p.sortOrder ?? 0), active: p.active !== false });
    setEditing(p);
  };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.planKey.trim() || !form.label.trim()) { Alert.alert('Plan key and label are required'); return; }
    setSaving(true);
    const payload = { planKey: form.planKey.trim().toUpperCase(), label: form.label.trim(), vertical: form.vertical, price: Number(form.price) || 0, features: form.features, sortOrder: Number(form.sortOrder) || 0 };
    try {
      if (editing?.id) await planApi.update(editing.id, payload);
      else await planApi.create(payload);
      setEditing(null);
      await reload();
    } catch { Alert.alert('Could not save plan', 'Check the plan key is unique and try again.'); }
    finally { setSaving(false); }
  };

  const toggle = async (p) => {
    try { await planApi.toggleActive(p.id, !p.active); await reload(); } catch { Alert.alert('Failed to toggle plan'); }
  };
  const remove = (p) => confirmAction('Delete plan?', `"${p.label}" will be removed permanently. Shops already on this plan keep their assignment, but it will no longer be selectable.`, async () => {
    try { await planApi.remove(p.id); await reload(); } catch { Alert.alert('Failed to delete plan'); }
  }, 'Delete');

  return (
    <>
      <FlatList
        data={plans}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        ListHeaderComponent={<Button title="+ New Plan" onPress={openNew} style={{ marginBottom: 4 }} />}
        ListEmptyComponent={!loading && <EmptyState icon="⭐" title="No plans yet" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={ss.card} onPress={() => openEdit(item)} activeOpacity={0.8}>
            <View style={{ flex: 1 }}>
              <Text style={ss.name}>{item.label} <Text style={ss.planKeyTxt}>({item.planKey})</Text></Text>
              <Text style={ss.sub}>{item.vertical} · {item.price > 0 ? `₹${item.price}/mo` : 'Free'} · order {item.sortOrder ?? 0}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <TouchableOpacity onPress={() => toggle(item)} style={[ss.badge, { backgroundColor: item.active ? '#DCFCE7' : '#F3F4F6' }]}>
                <Text style={[ss.badgeTxt, { color: item.active ? '#059669' : '#6B7280' }]}>{item.active ? 'Active' : 'Hidden'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(item)}><Text style={[ss.linkTxt, { color: Colors.error }]}>Delete</Text></TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      <BottomSheet visible={!!editing} onClose={() => setEditing(null)} height={560}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={ss.sheetTitle}>{editing?.id ? 'Edit plan' : 'New plan'}</Text>
          <Input label="Plan key" value={form.planKey} onChangeText={v => set('planKey', v.toUpperCase())} placeholder="GROWTH" editable={!editing?.id} style={editing?.id ? { opacity: 0.6 } : undefined} autoCapitalize="characters" />
          <Input label="Label" value={form.label} onChangeText={v => set('label', v)} placeholder="Growth" />
          <Text style={ss.fieldLabel}>Vertical</Text>
          <View style={ss.chipRow}>
            {VERTICALS.map(v => (
              <TouchableOpacity key={v} style={[ss.chip, form.vertical === v && ss.chipActive]} onPress={() => set('vertical', v)}>
                <Text style={[ss.chipTxt, form.vertical === v && ss.chipTxtActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Input label="Price (₹/month, 0 = free)" value={form.price} onChangeText={v => set('price', v)} keyboardType="numeric" />
          <Input label="Features (one per line)" value={form.features} onChangeText={v => set('features', v)} multiline style={{ height: 90 }} />
          <Input label="Sort order" value={form.sortOrder} onChangeText={v => set('sortOrder', v)} keyboardType="numeric" />
          <Button title={saving ? 'Saving…' : 'Save Plan'} onPress={save} loading={saving} style={{ marginTop: 8 }} />
        </ScrollView>
      </BottomSheet>
    </>
  );
}

const EMPTY_OFFER = { title: '', description: '', code: '', discountPercent: '10', applicablePlans: 'ALL', startsAt: '', endsAt: '' };

function offerStatus(o) {
  if (!o.active) return { label: 'Draft', color: '#6B7280', bg: '#F3F4F6' };
  const now = Date.now();
  if (o.startsAt && new Date(o.startsAt).getTime() > now) return { label: 'Scheduled', color: '#2563EB', bg: '#DBEAFE' };
  if (o.endsAt && new Date(o.endsAt).getTime() < now) return { label: 'Expired', color: '#DC2626', bg: '#FEE2E2' };
  return { label: 'Live', color: '#059669', bg: '#DCFCE7' };
}

// ── Discount Offers (new) ────────────────────────────────────────────────────
function OffersTab({ offers, plans, loading, reload }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_OFFER);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm(EMPTY_OFFER); setEditing({}); };
  const openEdit = (o) => {
    setForm({
      title: o.title || '', description: o.description || '', code: o.code || '',
      discountPercent: String(o.discountPercent ?? 10), applicablePlans: o.applicablePlans || 'ALL',
      startsAt: o.startsAt ? o.startsAt.slice(0, 16) : '', endsAt: o.endsAt ? o.endsAt.slice(0, 16) : '',
    });
    setEditing(o);
  };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) { Alert.alert('Title is required'); return; }
    const pct = Number(form.discountPercent);
    if (!(pct > 0 && pct <= 100)) { Alert.alert('Discount must be between 1 and 100%'); return; }
    setSaving(true);
    const payload = {
      title: form.title.trim(), description: form.description, code: form.code.trim().toUpperCase() || null,
      discountPercent: pct, applicablePlans: form.applicablePlans,
      startsAt: form.startsAt || null, endsAt: form.endsAt || null,
    };
    try {
      if (editing?.id) await offerApi.update(editing.id, payload);
      else await offerApi.create(payload);
      setEditing(null);
      await reload();
    } catch { Alert.alert('Could not save offer', 'Please try again.'); }
    finally { setSaving(false); }
  };

  const toggle = async (o) => {
    try { await offerApi.toggleActive(o.id, !o.active); await reload(); } catch { Alert.alert('Failed to toggle offer'); }
  };
  const remove = (o) => confirmAction('Delete offer?', `"${o.title}" will be removed permanently.`, async () => {
    try { await offerApi.remove(o.id); await reload(); } catch { Alert.alert('Failed to delete offer'); }
  }, 'Delete');

  return (
    <>
      <FlatList
        data={offers}
        keyExtractor={o => o.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        ListHeaderComponent={<Button title="+ New Offer" onPress={openNew} style={{ marginBottom: 4 }} />}
        ListEmptyComponent={!loading && <EmptyState icon="🏷️" title="No offers yet" />}
        renderItem={({ item }) => {
          const st = offerStatus(item);
          return (
            <TouchableOpacity style={ss.card} onPress={() => openEdit(item)} activeOpacity={0.8}>
              <View style={{ flex: 1 }}>
                <Text style={ss.name}>{item.title} {item.code ? <Text style={ss.planKeyTxt}>({item.code})</Text> : null}</Text>
                <Text style={ss.sub}>{item.discountPercent}% off · {item.applicablePlans === 'ALL' ? 'All plans' : item.applicablePlans}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={[ss.badge, { backgroundColor: st.bg }]}><Text style={[ss.badgeTxt, { color: st.color }]}>{st.label}</Text></View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity onPress={() => toggle(item)}><Text style={ss.linkTxt}>{item.active ? 'Unpublish' : 'Release'}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => remove(item)}><Text style={[ss.linkTxt, { color: Colors.error }]}>Delete</Text></TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <BottomSheet visible={!!editing} onClose={() => setEditing(null)} height={620}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={ss.sheetTitle}>{editing?.id ? 'Edit offer' : 'New offer'}</Text>
          <Input label="Title" value={form.title} onChangeText={v => set('title', v)} placeholder="Festive season discount" />
          <Input label="Description (optional)" value={form.description} onChangeText={v => set('description', v)} multiline style={{ height: 70 }} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Input label="Discount %" value={form.discountPercent} onChangeText={v => set('discountPercent', v)} keyboardType="numeric" style={{ flex: 1 }} />
            <Input label="Promo code (optional)" value={form.code} onChangeText={v => set('code', v.toUpperCase())} autoCapitalize="characters" style={{ flex: 1 }} />
          </View>
          <Text style={ss.fieldLabel}>Applies to</Text>
          <View style={ss.chipRow}>
            <TouchableOpacity style={[ss.chip, form.applicablePlans === 'ALL' && ss.chipActive]} onPress={() => set('applicablePlans', 'ALL')}>
              <Text style={[ss.chipTxt, form.applicablePlans === 'ALL' && ss.chipTxtActive]}>All plans</Text>
            </TouchableOpacity>
            {plans.map(p => (
              <TouchableOpacity key={p.id} style={[ss.chip, form.applicablePlans === p.planKey && ss.chipActive]} onPress={() => set('applicablePlans', p.planKey)}>
                <Text style={[ss.chipTxt, form.applicablePlans === p.planKey && ss.chipTxtActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Input label="Starts at (optional, YYYY-MM-DDTHH:mm)" value={form.startsAt} onChangeText={v => set('startsAt', v)} placeholder="2026-08-01T00:00" />
          <Input label="Ends at (optional, YYYY-MM-DDTHH:mm)" value={form.endsAt} onChangeText={v => set('endsAt', v)} placeholder="2026-08-31T23:59" />
          <Button title={saving ? 'Saving…' : 'Save Offer'} onPress={save} loading={saving} style={{ marginTop: 8 }} />
        </ScrollView>
      </BottomSheet>
    </>
  );
}

const ss = StyleSheet.create({
  tabBar: { flexDirection: 'row', paddingHorizontal: Spacing.base, gap: 8, paddingVertical: 10, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.full, alignItems: 'center', backgroundColor: Colors.gray100 },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabTxt: { fontSize: 12, fontWeight: '700', color: Colors.gray600 },
  tabTxtActive: { color: Colors.white },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: Spacing.base, paddingBottom: 4 },
  kpiCard: { width: '47%', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, ...Shadow.sm },
  kpiVal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  kpiLabel: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  planKeyTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray400 },
  sub: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  linkTxt: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 4 },
  currentPlan: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 16 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.gray50, borderRadius: Radius.md, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent' },
  planRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  planLabel: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  planPrice: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray600 },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700, marginBottom: 6, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.gray100, borderWidth: 1.5, borderColor: 'transparent' },
  chipActive: { backgroundColor: Colors.primary },
  chipTxt: { fontSize: 12, fontWeight: '700', color: Colors.gray700 },
  chipTxtActive: { color: Colors.white },
});
