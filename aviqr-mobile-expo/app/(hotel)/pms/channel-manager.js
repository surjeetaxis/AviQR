import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Share } from 'react-native';
import { hotelApi, pmsApi } from '../../../src/api/index.js';
import { PageHeader } from '../../../src/components/common/PageHeader.js';
import { Card } from '../../../src/components/common/Card.js';
import { Button } from '../../../src/components/common/Button.js';
import { Input } from '../../../src/components/common/Input.js';
import { Colors, FontSize, Spacing, Radius } from '../../../src/theme/index.js';

const CHANNELS = ['BOOKING_COM', 'MMT', 'AGODA', 'EXPEDIA', 'GENERIC'];
const EMPTY_FORM = { channel: 'BOOKING_COM', roomTypeId: '', externalPropertyId: '', externalRoomTypeId: '', externalRatePlanId: '', accessKey: '', channelId: '', cmBaseUrl: '' };

export default function ChannelManagerScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);

  const roomTypeName = (id) => roomTypes.find(rt => rt.id === id)?.name || id;

  const load = useCallback(async (hId) => {
    const [mRes, lRes] = await Promise.allSettled([pmsApi.listChannelMappings(hId), pmsApi.getChannelSyncLog(hId)]);
    if (mRes.status === 'fulfilled') setMappings(mRes.value.data.data || []);
    if (lRes.status === 'fulfilled') setLog(lRes.value.data.data || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hRes = await hotelApi.getMyHotels();
        const hotel = (hRes.data.data || [])[0];
        if (!hotel) return;
        setHotelId(hotel.id);
        const rtRes = await pmsApi.listRoomTypes(hotel.id);
        setRoomTypes(rtRes.data.data || []);
        await load(hotel.id);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [load]);

  const addMapping = async () => {
    if (!form.roomTypeId || !form.externalPropertyId.trim() || !form.externalRoomTypeId.trim()) {
      return Alert.alert('Room type, external property ID, and external room type ID are required');
    }
    setSaving(true);
    try {
      await pmsApi.createChannelMapping({ hotelId, ...form });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load(hotelId);
    } catch { Alert.alert('Could not create mapping'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (m) => {
    try { await pmsApi.updateChannelMapping(m.id, { ...m, active: !m.active }); await load(hotelId); }
    catch { Alert.alert('Could not update mapping'); }
  };

  const pushNow = async () => {
    setPushing(true);
    try { await pmsApi.pushChannelSync(hotelId); await load(hotelId); }
    catch { Alert.alert('Push failed'); }
    finally { setPushing(false); }
  };

  const shareSecret = (secret) => {
    Share.share({ message: `Channel manager webhook secret: ${secret}` }).catch(() => {});
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Channel Manager" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Channel Manager" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.sub}>Map room types to OTA channels and monitor sync.</Text>
        <Button title={pushing ? 'Pushing…' : 'Push availability & rates now'} loading={pushing} onPress={pushNow} style={{ marginBottom: 12 }} />
        <Button title={showForm ? 'Cancel' : '+ Add Mapping'} variant={showForm ? 'ghost' : 'outline'} onPress={() => setShowForm(s => !s)} style={{ marginBottom: 16 }} />

        {showForm && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={ss.fieldLabel}>Channel</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {CHANNELS.map(c => (
                <TouchableOpacity key={c} onPress={() => setForm(f => ({ ...f, channel: c }))} style={[ss.chip, form.channel === c && ss.chipActive]}>
                  <Text style={[ss.chipTxt, form.channel === c && ss.chipTxtActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={ss.fieldLabel}>Room type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {roomTypes.map(rt => (
                <TouchableOpacity key={rt.id} onPress={() => setForm(f => ({ ...f, roomTypeId: rt.id }))} style={[ss.chip, form.roomTypeId === rt.id && ss.chipActive]}>
                  <Text style={[ss.chipTxt, form.roomTypeId === rt.id && ss.chipTxtActive]}>{rt.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input label="External property ID" value={form.externalPropertyId} onChangeText={v => setForm(f => ({ ...f, externalPropertyId: v }))} />
            <Input label="External room type ID" value={form.externalRoomTypeId} onChangeText={v => setForm(f => ({ ...f, externalRoomTypeId: v }))} />
            <Input label="External rate plan ID (optional)" value={form.externalRatePlanId} onChangeText={v => setForm(f => ({ ...f, externalRatePlanId: v }))} />
            <Text style={ss.liveConnNote}>Live connection (optional — leave blank to just simulate pushes):</Text>
            <Input label="Access key" value={form.accessKey} onChangeText={v => setForm(f => ({ ...f, accessKey: v }))} />
            <Input label="Channel ID" value={form.channelId} onChangeText={v => setForm(f => ({ ...f, channelId: v }))} />
            <Input label="Channel manager base URL" value={form.cmBaseUrl} onChangeText={v => setForm(f => ({ ...f, cmBaseUrl: v }))} autoCapitalize="none" />
            <Button title={saving ? 'Saving…' : 'Add Mapping'} loading={saving} onPress={addMapping} />
          </Card>
        )}

        <Text style={ss.cardTitle}>Mappings ({mappings.length})</Text>
        {mappings.map(m => (
          <Card key={m.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={ss.mapTitle}>{m.channel} · {roomTypeName(m.roomTypeId)}</Text>
                <Text style={ss.mapMeta}>{m.externalPropertyId} / {m.externalRoomTypeId}</Text>
                <TouchableOpacity onPress={() => shareSecret(m.webhookSecret)}>
                  <Text style={ss.secretTxt}>🔑 {m.webhookSecret.slice(0, 10)}… (tap to share)</Text>
                </TouchableOpacity>
                <Text style={ss.mapMeta}>{m.cmBaseUrl ? 'Live connection' : 'Simulated'}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleActive(m)} style={[ss.statusChip, { backgroundColor: m.active ? Colors.primaryLight : Colors.gray100 }]}>
                <Text style={[ss.statusTxt, { color: m.active ? Colors.primary : Colors.gray600 }]}>{m.active ? 'Active' : 'Paused'}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
        {mappings.length === 0 && <Text style={ss.emptyTxt}>No channel mappings yet.</Text>}

        <Text style={ss.cardTitle}>Sync log</Text>
        {log.slice(0, 10).map(l => (
          <View key={l.id} style={ss.logRow}>
            <Text style={ss.logTxt}>{l.channel} · {l.direction} <Text style={{ color: l.status === 'SUCCESS' ? Colors.primary : Colors.error, fontWeight: '700' }}>{l.status}</Text></Text>
            <Text style={ss.mapMeta}>{new Date(l.createdAt).toLocaleString()}</Text>
          </View>
        ))}
        {log.length === 0 && <Text style={ss.emptyTxt}>No sync activity yet.</Text>}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  sub: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 14 },
  cardTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 10, marginTop: 6 },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray500, marginBottom: 6 },
  liveConnNote: { fontSize: 11, color: Colors.gray500, marginTop: 4, marginBottom: 8, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  chipActive: { backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipTxtActive: { color: Colors.primary },
  mapTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray900 },
  mapMeta: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  secretTxt: { fontSize: FontSize.xs, color: Colors.gray600, marginTop: 4, fontFamily: 'monospace' },
  statusChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.full },
  statusTxt: { fontSize: FontSize.xs, fontWeight: '700' },
  logRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  logTxt: { fontSize: FontSize.sm, color: Colors.gray900 },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 12 },
});
