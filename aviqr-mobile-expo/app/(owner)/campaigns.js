import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { campaignApi, customerApi } from '../../src/api/index.js';
import { Card } from '../../src/components/common/Card.js';
import { Button } from '../../src/components/common/Button.js';
import { Input } from '../../src/components/common/Input.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Radius, Shadow } from '../../src/theme/index.js';

const AUDIENCES = [
  { key: 'ALL',               label: 'All customers' },
  { key: 'LABEL',              label: 'By label' },
  { key: 'BIRTHDAY_TODAY',     label: 'Birthday (recurring)' },
  { key: 'ANNIVERSARY_TODAY',  label: 'Anniversary (recurring)' },
];

const STATUS_COLOR = {
  DRAFT: Colors.gray500, SCHEDULED: Colors.info, ACTIVE: Colors.primary,
  SENT: Colors.purple, PAUSED: Colors.warning,
};

const emptyForm = { name: '', messageTemplate: '', audienceType: 'ALL', audienceLabel: '' };

export default function CampaignsScreen() {
  const shopId = useActiveShopId();
  const [campaigns, setCampaigns] = useState([]);
  const [labels, setLabels]       = useState([]);
  const [offline, setOffline]     = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [showLog, setShowLog]     = useState(false);
  const [selCampaign, setSel]     = useState(null);
  const [logs, setLogs]           = useState([]);

  const load = useCallback(async () => {
    if (!shopId) return;
    try {
      const [campRes, custRes] = await Promise.allSettled([campaignApi.list(shopId), customerApi.list(shopId)]);
      if (campRes.status === 'fulfilled') { setCampaigns(campRes.value.data.data || []); setOffline(false); }
      else setOffline(true);
      if (custRes.status === 'fulfilled') {
        const all = new Set();
        (custRes.value.data.data || []).forEach(c => (c.labels || []).forEach(l => all.add(l)));
        setLabels([...all]);
      }
    } catch { setOffline(true); }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(emptyForm); setShowNew(true); };

  const createCampaign = async () => {
    if (!form.name || !form.messageTemplate) return Alert.alert('Required', 'Name and message are required');
    setSaving(true);
    try {
      await campaignApi.create(shopId, {
        name: form.name,
        messageTemplate: form.messageTemplate,
        audienceType: form.audienceType,
        audienceLabel: form.audienceType === 'LABEL' ? form.audienceLabel : null,
      });
      setShowNew(false);
      load();
    } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Failed to create campaign'); }
    finally { setSaving(false); }
  };

  const sendNow = (c) => Alert.alert('Send now', `Send "${c.name}" now?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Send', onPress: async () => {
      try { await campaignApi.sendNow(shopId, c.id); load(); }
      catch (e) { Alert.alert('Error', e.response?.data?.message || 'Failed to send'); }
    } },
  ]);

  const togglePause = async (c) => {
    try {
      if (c.status === 'PAUSED') await campaignApi.resume(shopId, c.id);
      else await campaignApi.pause(shopId, c.id);
      load();
    } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Failed to update campaign'); }
  };

  const remove = (c) => Alert.alert('Delete', `Delete campaign "${c.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await campaignApi.remove(shopId, c.id); load(); }
      catch (e) { Alert.alert('Error', e.response?.data?.message || 'Failed to delete'); }
    } },
  ]);

  const openLog = async (c) => {
    setSel(c); setShowLog(true); setLogs([]);
    try { const res = await campaignApi.logs(shopId, c.id); setLogs(res.data.data || []); } catch {}
  };

  return (
    <View style={ss.screen}>
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={ss.back}>‹ Back</Text></TouchableOpacity>
        <Text style={ss.title}>SMS Campaigns</Text>
        <TouchableOpacity style={ss.addBtn} onPress={openNew}><Text style={ss.addBtnTxt}>+ New</Text></TouchableOpacity>
      </View>
      {offline && <OfflineBadge onRetry={load} />}
      <FlatList
        data={campaigns}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="💬" title="No campaigns yet" subtitle="Create a birthday-wish or segment broadcast campaign" />}
        renderItem={({ item }) => {
          const meta = AUDIENCES.find(a => a.key === item.audienceType) || AUDIENCES[0];
          const color = STATUS_COLOR[item.status] || Colors.gray500;
          return (
            <Card style={ss.card} padding={14}>
              <View style={{ flex: 1 }}>
                <View style={ss.cardTop}>
                  <Text style={ss.name}>{item.name}</Text>
                  <Text style={[ss.status, { color, backgroundColor: color + '22' }]}>{item.status}</Text>
                </View>
                <Text style={ss.meta}>{meta.label}{item.audienceType === 'LABEL' && item.audienceLabel ? `: ${item.audienceLabel}` : ''}</Text>
                <Text style={ss.meta}>{item.sentCount || 0} sent{item.failedCount ? `, ${item.failedCount} failed` : ''}</Text>
                <View style={ss.actions}>
                  {(item.status === 'DRAFT' || item.status === 'SCHEDULED') && (
                    <TouchableOpacity style={ss.actionBtn} onPress={() => sendNow(item)}><Text style={ss.actionTxt}>Send now</Text></TouchableOpacity>
                  )}
                  {(item.status === 'ACTIVE' || item.status === 'PAUSED') && (
                    <TouchableOpacity style={ss.actionBtn} onPress={() => togglePause(item)}><Text style={ss.actionTxt}>{item.status === 'PAUSED' ? 'Resume' : 'Pause'}</Text></TouchableOpacity>
                  )}
                  <TouchableOpacity style={ss.actionBtn} onPress={() => openLog(item)}><Text style={ss.actionTxt}>Log</Text></TouchableOpacity>
                  <TouchableOpacity style={ss.actionBtn} onPress={() => remove(item)}><Text style={[ss.actionTxt, { color: Colors.error }]}>Delete</Text></TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        }}
      />

      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNew(false)}>
        <ScrollView style={ss.modal} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={ss.modalHeader}>
            <Text style={ss.modalTitle}>New Campaign</Text>
            <TouchableOpacity onPress={() => setShowNew(false)}><Text style={{ fontSize: 20, color: Colors.gray500 }}>✕</Text></TouchableOpacity>
          </View>
          <Input label="Campaign name" placeholder="Diwali offer blast" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
          <Input label="Message" placeholder="Hi {name}, enjoy 20% off this weekend!" value={form.messageTemplate} onChangeText={v => setForm(f => ({ ...f, messageTemplate: v }))} multiline />
          <Text style={ss.hint}>Use {'{name}'} to personalize with the customer's name.</Text>

          <Text style={ss.label}>Audience</Text>
          <View style={ss.chipRow}>
            {AUDIENCES.map(a => (
              <TouchableOpacity key={a.key} style={[ss.chip, form.audienceType === a.key && ss.chipActive]} onPress={() => setForm(f => ({ ...f, audienceType: a.key }))}>
                <Text style={[ss.chipTxt, form.audienceType === a.key && ss.chipActiveTxt]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {form.audienceType === 'LABEL' && (
            <View style={{ marginTop: 12 }}>
              <Text style={ss.label}>Label</Text>
              {labels.length === 0 ? (
                <Text style={ss.hint}>No customer labels yet — add labels from the Customers screen first.</Text>
              ) : (
                <View style={ss.chipRow}>
                  {labels.map(l => (
                    <TouchableOpacity key={l} style={[ss.chip, form.audienceLabel === l && ss.chipActive]} onPress={() => setForm(f => ({ ...f, audienceLabel: l }))}>
                      <Text style={[ss.chipTxt, form.audienceLabel === l && ss.chipActiveTxt]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {(form.audienceType === 'BIRTHDAY_TODAY' || form.audienceType === 'ANNIVERSARY_TODAY') && (
            <Text style={ss.recurringHint}>
              This campaign runs automatically every day for customers whose {form.audienceType === 'BIRTHDAY_TODAY' ? 'birthday' : 'anniversary'} is today.
            </Text>
          )}

          <Button title={saving ? 'Creating…' : 'Create campaign'} onPress={createCampaign} loading={saving} style={{ marginTop: 20 }} />
          <Button title="Cancel" onPress={() => setShowNew(false)} variant="ghost" style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>

      <Modal visible={showLog} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLog(false)}>
        <View style={ss.modal}>
          <View style={[ss.modalHeader, { padding: 24, paddingBottom: 0 }]}>
            <Text style={ss.modalTitle}>{selCampaign?.name}</Text>
            <TouchableOpacity onPress={() => setShowLog(false)}><Text style={{ fontSize: 20, color: Colors.gray500 }}>✕</Text></TouchableOpacity>
          </View>
          <FlatList
            data={logs}
            keyExtractor={(l, i) => String(i)}
            contentContainerStyle={{ padding: 24 }}
            ListEmptyComponent={<EmptyState icon="📭" title="No sends yet" />}
            renderItem={({ item }) => (
              <View style={ss.logRow}>
                <View style={{ flex: 1 }}>
                  <Text style={ss.logName}>{item.customerName || 'Customer'}</Text>
                  <Text style={ss.meta}>{item.customerPhone} · {item.sentAt ? new Date(item.sentAt).toLocaleString('en-IN') : ''}</Text>
                </View>
                <Text style={[ss.status, { color: item.status === 'SENT' ? Colors.primary : Colors.error, backgroundColor: item.status === 'SENT' ? Colors.primaryLight : Colors.errorLight }]}>{item.status}</Text>
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  addBtn: { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.md },
  addBtnTxt: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  card: { marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900, flexShrink: 1 },
  status: { fontSize: FontSize.xs, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, overflow: 'hidden' },
  meta: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 14, marginTop: 10 },
  actionBtn: {},
  actionTxt: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  hint: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: -6, marginBottom: 12 },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.gray900, borderColor: Colors.gray900 },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipActiveTxt: { color: Colors.white },
  recurringHint: { fontSize: FontSize.xs, color: Colors.primaryDark, backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: 10, marginTop: 12 },
  logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  logName: { fontSize: FontSize.base, fontWeight: '600', color: Colors.gray900 },
});
