import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { hotelApi, hotelOpsApi, hotelOutletApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Card } from '../../src/components/common/Card.js';
import { StatusBadge } from '../../src/components/common/StatusBadge.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

const TABS = [
  { key: 'housekeeping', label: 'Housekeeping', emoji: '🧹' },
  { key: 'laundry',      label: 'Laundry',       emoji: '👕' },
  { key: 'maintenance',  label: 'Maintenance',   emoji: '🔧' },
  { key: 'spa',          label: 'Spa',           emoji: '💆' },
];
const STATUS_NEXT = { NEW: 'ACCEPTED', ACCEPTED: 'PREPARING', PREPARING: 'CONFIRMED', CONFIRMED: 'DONE' };
const PRIORITY_COLOR = { HIGH: '#DC2626', NORMAL: '#6B7280', URGENT: '#DC2626' };
const ROOM_STATUS_META = [
  { key: 'VACANT',      emoji: '✅', label: 'Vacant',      color: '#059669' },
  { key: 'OCCUPIED',    emoji: '🛏️', label: 'Occupied',    color: '#2563EB' },
  { key: 'CLEANING',    emoji: '🔄', label: 'Cleaning',    color: '#D97706' },
  { key: 'MAINTENANCE', emoji: '🔧', label: 'Maintenance', color: '#DC2626' },
];

const mapGuestReq = (g) => ({
  id: g.id, roomNumber: g.roomNumber, serviceType: g.type, description: g.details || '',
  status: g.status, priority: g.priority, createdAt: g.createdAt, _source: 'guest',
});

// Room-status board + Laundry/Maintenance/Spa detail views web folds into a
// single flat requests feed on mobile's home.js. Housekeeping's "advance"
// button is a documented no-op on web (onAdvance={()=>{}}) — mobile makes it
// real here since the same hotelApi/hotelOpsApi.updateRequest calls already
// work for every other service type.
export default function HotelServiceDeskScreen() {
  const [hotel, setHotel]         = useState(null);
  const [tab, setTab]             = useState('housekeeping');
  const [rooms, setRooms]         = useState([]);
  const [requests, setRequests]   = useState([]);
  const [outlets, setOutlets]     = useState([]);
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRef]      = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const hRes = await hotelApi.getMyHotels();
      const h = (hRes.data.data || [])[0];
      setHotel(h);
      if (!h) return;
      const [r, req, gsr, outletsRes, bk] = await Promise.allSettled([
        hotelApi.getRooms(h.id),
        hotelApi.getRequests(h.id, { status: 'new,preparing,confirmed' }),
        hotelOpsApi.listRequests(h.id),
        hotelOutletApi.list(h.id),
        hotelOpsApi.listBookings(h.id),
      ]);
      if (r.status === 'fulfilled') setRooms(r.value.data.data || []);
      let merged = [];
      if (req.status === 'fulfilled') merged = merged.concat(req.value.data.data || []);
      if (gsr.status === 'fulfilled') merged = merged.concat((gsr.value.data.data || []).map(mapGuestReq));
      setRequests(merged);
      if (outletsRes.status === 'fulfilled') setOutlets(outletsRes.value.data.data || []);
      if (bk.status === 'fulfilled') setBookings(bk.value.data.data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRef(true); await load(); setRef(false); };

  const advanceRequest = async (req) => {
    const next = STATUS_NEXT[req.status];
    if (!next) return;
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: next } : r));
    try {
      const call = req._source === 'guest' ? hotelOpsApi.updateRequest(req.id, next) : hotelApi.updateRequest(req.id, next);
      await call;
    } catch { Alert.alert('Failed to update request'); }
  };
  const advanceBooking = async (b) => {
    const next = b.status === 'REQUESTED' ? 'CONFIRMED' : b.status === 'CONFIRMED' ? 'COMPLETED' : null;
    if (!next) return;
    setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: next } : x));
    try { await hotelOpsApi.updateBooking(b.id, next); } catch { Alert.alert('Failed to update booking'); }
  };

  const roomCounts = rooms.reduce((acc, r) => { const s = (r.status || 'VACANT').toUpperCase(); acc[s] = (acc[s] || 0) + 1; return acc; }, {});
  const housekeepingReqs = requests.filter(r => r.serviceType === 'HOUSEKEEPING' && r.status !== 'DONE' && r.status !== 'CANCELLED');
  const laundryReqs      = requests.filter(r => r.serviceType === 'LAUNDRY' && r.status !== 'DONE' && r.status !== 'CANCELLED');
  const maintenanceReqs  = requests.filter(r => r.serviceType === 'MAINTENANCE' && r.status !== 'DONE' && r.status !== 'CANCELLED');
  const spaOutletIds     = new Set(outlets.filter(o => o.outletType === 'SPA').map(o => o.id));
  const spaBookings      = bookings.filter(b => spaOutletIds.has(b.outletId));

  const RequestCard = ({ req }) => (
    <Card style={[ss.reqCard, req.priority === 'HIGH' && ss.urgentCard]}>
      <View style={ss.reqTop}>
        <Text style={ss.reqRoom}>Room {req.roomNumber}</Text>
        <StatusBadge status={req.status} />
      </View>
      <Text style={ss.reqDesc} numberOfLines={2}>{req.description}</Text>
      {req.priority && req.priority !== 'NORMAL' && (
        <View style={[ss.priorityBadge, { backgroundColor: PRIORITY_COLOR[req.priority] + '18' }]}>
          <Text style={[ss.priorityText, { color: PRIORITY_COLOR[req.priority] }]}>⚠ {req.priority}</Text>
        </View>
      )}
      <View style={ss.reqBottom}>
        <Text style={ss.reqTime}>{req.createdAt ? new Date(req.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
        {STATUS_NEXT[req.status] && (
          <TouchableOpacity style={ss.advBtn} onPress={() => advanceRequest(req)}>
            <Text style={ss.advBtnText}>{req.status === 'NEW' ? '✓ Accept' : req.status === 'ACCEPTED' ? 'Start' : req.status === 'PREPARING' ? 'Confirm' : 'Done'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );

  const BookingCard = ({ b }) => (
    <Card style={ss.reqCard}>
      <View style={ss.reqTop}>
        <Text style={ss.reqRoom}>Room {b.roomNumber} · {b.outletName}</Text>
        <StatusBadge status={b.status} />
      </View>
      <Text style={ss.reqDesc}>
        {b.serviceName} · {b.bookingDate} at {b.bookingTime} · {b.partySize} guest{b.partySize > 1 ? 's' : ''}
        {b.price > 0 ? ` · ₹${Number(b.price).toLocaleString('en-IN')}` : ''}
      </Text>
      {(b.status === 'REQUESTED' || b.status === 'CONFIRMED') && (
        <View style={ss.reqBottom}>
          <View />
          <TouchableOpacity style={ss.advBtn} onPress={() => advanceBooking(b)}>
            <Text style={ss.advBtnText}>{b.status === 'REQUESTED' ? 'Confirm' : 'Complete'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );

  const listFor = { housekeeping: housekeepingReqs, laundry: laundryReqs, maintenance: maintenanceReqs, spa: spaBookings }[tab];
  const isBookingTab = tab === 'spa';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Service Desk" />
      <View style={ss.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[ss.tabBtn, tab === t.key && ss.tabBtnActive]} onPress={() => setTab(t.key)}>
            <Text style={ss.tabEmoji}>{t.emoji}</Text>
            <Text style={[ss.tabTxt, tab === t.key && ss.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'housekeeping' && (
        <View style={ss.kpiGrid}>
          {ROOM_STATUS_META.map(m => (
            <View key={m.key} style={ss.kpiCard}>
              <Text style={ss.kpiEmoji}>{m.emoji}</Text>
              <Text style={[ss.kpiVal, { color: m.color }]}>{roomCounts[m.key] || 0}</Text>
              <Text style={ss.kpiLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={listFor}
        keyExtractor={item => item.id}
        renderItem={({ item }) => isBookingTab ? <BookingCard b={item} /> : <RequestCard req={item} />}
        contentContainerStyle={{ padding: Spacing.base, gap: 10, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon={TABS.find(t => t.key === tab)?.emoji || '📋'} title={`No ${tab} ${isBookingTab ? 'bookings' : 'requests'}`} />}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  tabBar:       { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn:       { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2 },
  tabBtnActive: { borderBottomWidth: 2.5, borderBottomColor: Colors.purple || '#7C3AED' },
  tabEmoji:     { fontSize: 16 },
  tabTxt:       { fontSize: 10.5, fontWeight: '600', color: Colors.gray500 },
  tabTxtActive: { color: Colors.gray900, fontWeight: '800' },
  kpiGrid:      { flexDirection: 'row', padding: Spacing.base, paddingBottom: 4, gap: 8 },
  kpiCard:      { flex: 1, alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border },
  kpiEmoji:     { fontSize: 18 },
  kpiVal:       { fontSize: FontSize.xl, fontWeight: '800', marginTop: 2 },
  kpiLabel:     { fontSize: 10, color: Colors.gray500, marginTop: 2 },
  reqCard:      { padding: Spacing.base, gap: 8 },
  urgentCard:   { borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  reqTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  reqRoom:      { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  reqDesc:      { fontSize: FontSize.sm, color: Colors.gray700, lineHeight: 18 },
  priorityBadge:{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  priorityText: { fontSize: FontSize.xs, fontWeight: '700' },
  reqBottom:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reqTime:      { fontSize: FontSize.xs, color: Colors.gray400 },
  advBtn:       { backgroundColor: '#7C3AED', paddingVertical: 5, paddingHorizontal: 12, borderRadius: Radius.md },
  advBtnText:   { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
});
