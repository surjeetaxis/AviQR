import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { hotelApi, pmsApi } from '../../../src/api/index.js';
import { PageHeader } from '../../../src/components/common/PageHeader.js';
import { Card } from '../../../src/components/common/Card.js';
import { Button } from '../../../src/components/common/Button.js';
import { Input } from '../../../src/components/common/Input.js';
import { Colors, FontSize, Spacing, Radius } from '../../../src/theme/index.js';

const EMPTY_FORM = { name: '', contactPerson: '', phone: '', email: '', commissionPercent: '10', tdsPercent: '0' };
const STATUS_FILTERS = ['', 'PENDING', 'PAID', 'VOID'];

export default function AgentsScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [agents, setAgents] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const agentName = (id) => agents.find(a => a.id === id)?.name || id;

  const loadAgents = useCallback(async (hId) => {
    const res = await pmsApi.listAgents(hId);
    setAgents(res.data.data || []);
  }, []);

  const loadCommissions = useCallback((hId, status) => {
    pmsApi.listCommissions(hId, status || undefined).then(res => setCommissions(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hRes = await hotelApi.getMyHotels();
        const hotel = (hRes.data.data || [])[0];
        if (!hotel) return;
        setHotelId(hotel.id);
        await loadAgents(hotel.id);
        loadCommissions(hotel.id, statusFilter);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [loadAgents, loadCommissions]);

  useEffect(() => { if (hotelId) loadCommissions(hotelId, statusFilter); }, [statusFilter, hotelId, loadCommissions]);

  const createAgent = async () => {
    if (!form.name.trim() || !form.commissionPercent) return Alert.alert('Agent name and commission % are required');
    setSaving(true);
    try {
      await pmsApi.createAgent({ hotelId, ...form, commissionPercent: Number(form.commissionPercent), tdsPercent: Number(form.tdsPercent) || 0 });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadAgents(hotelId);
    } catch { Alert.alert('Could not create agent'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (a) => {
    try { await pmsApi.updateAgent(a.id, { ...a, active: !a.active }); await loadAgents(hotelId); }
    catch { Alert.alert('Could not update agent'); }
  };

  const payCommission = (c) => {
    Alert.alert('Mark commission paid?', `₹${Number(c.netPayable ?? c.commissionAmount).toLocaleString('en-IN')} payable to ${agentName(c.agentId)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Paid', onPress: async () => {
        try { await pmsApi.payCommission(c.id, ''); loadCommissions(hotelId, statusFilter); }
        catch { Alert.alert('Could not mark commission paid'); }
      } },
    ]);
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Agents & Commission" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Agents & Commission" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.sub}>Travel-agent bookings and payable commission tracking.</Text>

        <Button title={showForm ? 'Cancel' : '+ Add Agent'} variant={showForm ? 'ghost' : 'primary'} onPress={() => setShowForm(s => !s)} style={{ marginBottom: 16 }} />

        {showForm && (
          <Card style={{ marginBottom: 16 }}>
            <Input label="Agent / agency name *" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
            <Input label="Contact person" value={form.contactPerson} onChangeText={v => setForm(f => ({ ...f, contactPerson: v }))} />
            <Input label="Phone" keyboardType="phone-pad" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} />
            <Input label="Email" keyboardType="email-address" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Input label="Commission %" keyboardType="decimal-pad" value={form.commissionPercent} onChangeText={v => setForm(f => ({ ...f, commissionPercent: v }))} style={{ flex: 1 }} />
              <Input label="TDS %" keyboardType="decimal-pad" value={form.tdsPercent} onChangeText={v => setForm(f => ({ ...f, tdsPercent: v }))} style={{ flex: 1 }} />
            </View>
            <Button title={saving ? 'Saving…' : 'Add Agent'} loading={saving} onPress={createAgent} />
          </Card>
        )}

        <Text style={ss.cardTitle}>Agents ({agents.length})</Text>
        {agents.map(a => (
          <Card key={a.id} style={{ marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={ss.agentName}>{a.name}</Text>
              <Text style={ss.agentMeta}>{a.contactPerson}{a.phone ? ` · ${a.phone}` : ''}</Text>
              <Text style={ss.agentMeta}>{a.commissionPercent}% commission · {a.tdsPercent || 0}% TDS</Text>
            </View>
            <TouchableOpacity onPress={() => toggleActive(a)} style={[ss.statusChip, { backgroundColor: a.active ? Colors.primaryLight : Colors.gray100 }]}>
              <Text style={[ss.statusTxt, { color: a.active ? Colors.primary : Colors.gray600 }]}>{a.active ? 'Active' : 'Paused'}</Text>
            </TouchableOpacity>
          </Card>
        ))}
        {agents.length === 0 && <Text style={ss.emptyTxt}>No agents yet.</Text>}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 10 }}>
          <Text style={ss.cardTitle}>Commission payable</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
          {STATUS_FILTERS.map(s => (
            <TouchableOpacity key={s || 'all'} onPress={() => setStatusFilter(s)} style={[ss.chip, statusFilter === s && ss.chipActive]}>
              <Text style={[ss.chipTxt, statusFilter === s && ss.chipTxtActive]}>{s || 'All'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {commissions.map(c => (
          <Card key={c.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={ss.agentName}>{agentName(c.agentId)}</Text>
              <Text style={[ss.statusTxt, { color: c.status === 'PAID' ? Colors.primary : c.status === 'VOID' ? Colors.error : Colors.warning || '#D97706' }]}>{c.status}</Text>
            </View>
            <Text style={ss.agentMeta}>Revenue ₹{Number(c.roomRevenue).toLocaleString('en-IN')} · {c.commissionPercent}% = ₹{Number(c.commissionAmount).toLocaleString('en-IN')}</Text>
            <Text style={ss.agentMeta}>TDS ₹{Number(c.tdsAmount || 0).toLocaleString('en-IN')} · Net payable ₹{Number(c.netPayable ?? c.commissionAmount).toLocaleString('en-IN')}</Text>
            {c.status === 'PENDING' && <Button title="Mark Paid" size="sm" onPress={() => payCommission(c)} style={{ marginTop: 8 }} />}
          </Card>
        ))}
        {commissions.length === 0 && <Text style={ss.emptyTxt}>No commission records yet.</Text>}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  sub: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 14 },
  cardTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  agentName: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray900 },
  agentMeta: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  statusChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.full },
  statusTxt: { fontSize: FontSize.xs, fontWeight: '700' },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  chipActive: { backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipTxtActive: { color: Colors.primary },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 12 },
});
