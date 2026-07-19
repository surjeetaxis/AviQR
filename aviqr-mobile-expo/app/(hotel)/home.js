import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert, Modal, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { hotelApi, hotelOpsApi } from '../../src/api/index.js';
import { useAuth } from '../../src/context/AuthContext.js';
import { StatusBadge } from '../../src/components/common/StatusBadge.js';
import { Card } from '../../src/components/common/Card.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

const SERVICE_TYPES = [
  { id:'ROOM_SERVICE',  emoji:'🍽', label:'Room Service' },
  { id:'LAUNDRY',       emoji:'👕', label:'Laundry' },
  { id:'SPA',           emoji:'💆', label:'Spa' },
  { id:'HOUSEKEEPING',  emoji:'🧹', label:'Housekeeping' },
  { id:'MAINTENANCE',   emoji:'🔧', label:'Maintenance' },
  { id:'AMENITIES',     emoji:'🛎', label:'Amenities' },
  { id:'CONCIERGE',     emoji:'🔔', label:'Concierge' },
  { id:'LATE_CHECKOUT', emoji:'⏰', label:'Late Checkout' },
  { id:'WAKE_UP_CALL',  emoji:'⏰', label:'Wake-up Call' },
  { id:'TRANSPORT',     emoji:'🚕', label:'Transport' },
];

const STATUS_NEXT = { NEW:'ACCEPTED', ACCEPTED:'PREPARING', PREPARING:'CONFIRMED', CONFIRMED:'DONE' };
const PRIORITY_COLOR = { HIGH:'#DC2626', NORMAL:'#6B7280', URGENT:'#DC2626' };
const NAV_ITEMS = [
  { icon: '🧑‍🤝‍🧑', label: 'Guests',       href: '/(hotel)/guests' },
  { icon: '👔', label: 'Hotel Staff',  href: '/(hotel)/hotel-staff' },
  { icon: '📱', label: 'QR Mgmt',      href: '/(hotel)/qr-management' },
  { icon: '📊', label: 'Reports',      href: '/(hotel)/reports' },
  { icon: '⭐', label: 'Subscription', href: '/(hotel)/subscription' },
];

// Normalise a QR-raised GuestServiceRequest into the same shape as legacy RoomRequest
const mapGuestReq = (g) => ({
  id: g.id,
  roomNumber: g.roomNumber,
  serviceType: g.type,
  description: g.details || '',
  status: g.status,
  priority: g.priority,
  createdAt: g.createdAt,
  _source: 'guest',
});

export default function HotelHomeScreen() {
  const { user, logout } = useAuth();
  const [hotels, setHotels]       = useState([]);
  const [selectedHotel, setHotel] = useState(null);
  const [rooms, setRooms]         = useState([]);
  const [requests, setRequests]   = useState([]);
  const [bookings, setBookings]   = useState([]);
  const [tab, setTab]             = useState('requests');
  const [refreshing, setRef]      = useState(false);
  const [billRoom, setBillRoom]   = useState(null);

  const load = useCallback(async () => {
    try {
      const hRes = await hotelApi.getMyHotels();
      const hotelList = hRes.data.data || [];
      setHotels(hotelList);
      if (hotelList.length > 0 && !selectedHotel) setHotel(hotelList[0]);
    } catch {}
  }, []);

  const loadHotelData = useCallback(async (hotel) => {
    if (!hotel) return;
    try {
      const [r, req, gsr, bk] = await Promise.allSettled([
        hotelApi.getRooms(hotel.id),
        hotelApi.getRequests(hotel.id, { status: 'new,preparing,confirmed' }),
        hotelOpsApi.listRequests(hotel.id),
        hotelOpsApi.listBookings(hotel.id),
      ]);
      if (r.status === 'fulfilled') setRooms(r.value.data.data || []);
      let merged = [];
      if (req.status === 'fulfilled') merged = merged.concat(req.value.data.data || []);
      if (gsr.status === 'fulfilled') merged = merged.concat((gsr.value.data.data || []).map(mapGuestReq));
      setRequests(merged);
      if (bk.status === 'fulfilled') setBookings(bk.value.data.data || []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (selectedHotel) loadHotelData(selectedHotel); }, [selectedHotel]);

  const onRefresh = async () => { setRef(true); await load(); if (selectedHotel) await loadHotelData(selectedHotel); setRef(false); };

  const advanceRequest = async (req) => {
    const next = STATUS_NEXT[req.status];
    if (!next) return;
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: next } : r));
    try {
      const call = req._source === 'guest' ? hotelOpsApi.updateRequest(req.id, next) : hotelApi.updateRequest(req.id, next);
      await call;
    } catch { Alert.alert('Failed to update request'); }
  };

  const advanceBooking = async (booking) => {
    const next = booking.status === 'REQUESTED' ? 'CONFIRMED' : booking.status === 'CONFIRMED' ? 'COMPLETED' : null;
    if (!next) return;
    setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: next } : b));
    try { await hotelOpsApi.updateBooking(booking.id, next); }
    catch { Alert.alert('Failed to update booking'); }
  };

  const liveRequests  = requests.filter(r => r.status !== 'DONE' && r.status !== 'CANCELLED');
  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED').length;
  const urgentCount   = liveRequests.filter(r => r.priority === 'HIGH' || r.priority === 'URGENT').length;

  const RequestCard = ({ req }) => (
    <Card style={[styles.reqCard, req.priority === 'HIGH' && styles.urgentCard]}>
      <View style={styles.reqTop}>
        <View>
          <Text style={styles.reqRoom}>Room {req.roomNumber}</Text>
          <Text style={styles.reqType}>{SERVICE_TYPES.find(s => s.id === req.serviceType)?.emoji || '📋'} {req.serviceType?.replace(/_/g,' ')}</Text>
        </View>
        <StatusBadge status={req.status} />
      </View>
      <Text style={styles.reqDesc} numberOfLines={2}>{req.description}</Text>
      {req.priority !== 'NORMAL' && (
        <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLOR[req.priority] + '18' }]}>
          <Text style={[styles.priorityText, { color: PRIORITY_COLOR[req.priority] }]}>⚠ {req.priority}</Text>
        </View>
      )}
      <View style={styles.reqBottom}>
        <Text style={styles.reqTime}>{req.createdAt ? new Date(req.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
        {STATUS_NEXT[req.status] && (
          <TouchableOpacity style={styles.advBtn} onPress={() => advanceRequest(req)}>
            <Text style={styles.advBtnText}>{req.status === 'NEW' ? '✓ Accept' : req.status === 'ACCEPTED' ? 'Start' : req.status === 'PREPARING' ? 'Confirm' : 'Done'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );

  const RoomCard = ({ room }) => (
    <Card style={styles.roomCard}>
      <View style={styles.roomTop}>
        <Text style={styles.roomNum}>Room {room.roomNumber}</Text>
        <StatusBadge status={room.status || 'VACANT'} />
      </View>
      <Text style={styles.roomType}>{room.roomType} · {room.floor}</Text>
      {room.guestName && (
        <View style={styles.guestInfo}>
          <Text style={styles.guestName}>👤 {room.guestName}</Text>
        </View>
      )}
      {room.checkInDate && <Text style={styles.roomDates}>In: {room.checkInDate} · Out: {room.checkOutDate}</Text>}
      {room.status === 'OCCUPIED' && (
        <TouchableOpacity style={styles.billBtn} onPress={() => setBillRoom(room)}>
          <Text style={styles.billBtnText}>💳 Bill</Text>
        </TouchableOpacity>
      )}
    </Card>
  );

  const BOOKING_BADGE = {
    REQUESTED: 'Confirm',
    CONFIRMED: 'Complete',
  };

  const BookingCard = ({ b }) => (
    <Card style={styles.reqCard}>
      <View style={styles.reqTop}>
        <View>
          <Text style={styles.reqRoom}>Room {b.roomNumber}</Text>
          <Text style={styles.reqType}>{b.outletName} · {b.serviceName}</Text>
        </View>
        <StatusBadge status={b.status} />
      </View>
      <Text style={styles.reqDesc}>
        {b.bookingDate} at {b.bookingTime} · {b.partySize} guest{b.partySize > 1 ? 's' : ''}
        {b.price > 0 ? ` · ₹${Number(b.price).toLocaleString('en-IN')}` : ''}
        {' · '}{b.paymentChoice === 'PAY_DIRECT' ? 'Pay direct' : 'Charge to room'}
      </Text>
      {BOOKING_BADGE[b.status] && (
        <View style={styles.reqBottom}>
          <View />
          <TouchableOpacity style={styles.advBtn} onPress={() => advanceBooking(b)}>
            <Text style={styles.advBtnText}>{BOOKING_BADGE[b.status]}</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient colors={['#4C1D95','#7C3AED']} style={styles.headerGrad}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerSub}>HOTEL DASHBOARD</Text>
            <Text style={styles.hotelName}>{selectedHotel?.name || 'Loading…'}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={{ padding: 8 }}>
            <Text style={{ fontSize: 18 }}>🚪</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{occupiedRooms}</Text>
            <Text style={styles.statLabel}>Occupied</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, urgentCount > 0 && { color: '#FCA5A5' }]}>{liveRequests.length}</Text>
            <Text style={styles.statLabel}>Active Requests</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{rooms.length}</Text>
            <Text style={styles.statLabel}>Total Rooms</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.navGrid}>
        {NAV_ITEMS.map(n => (
          <TouchableOpacity key={n.href} style={styles.navItem} onPress={() => router.push(n.href)} activeOpacity={0.8}>
            <Text style={styles.navEmoji}>{n.icon}</Text>
            <Text style={styles.navLabel}>{n.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[['requests', `Requests (${liveRequests.length})`], ['bookings', `Bookings (${bookings.length})`], ['rooms', `Rooms (${rooms.length})`]].map(([t, l]) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabActiveText]}>{l}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.tabBtn} onPress={() => router.push('/(hotel)/outlets')}>
          <Text style={styles.tabText}>Outlets →</Text>
        </TouchableOpacity>
      </View>

      {tab === 'requests' && (
        <FlatList
          data={liveRequests}
          keyExtractor={r => r.id}
          renderItem={({ item }) => <RequestCard req={item} />}
          contentContainerStyle={{ padding: Spacing.base, gap: 10, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.white} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyText}>No active requests</Text>
            </View>
          }
        />
      )}

      {tab === 'bookings' && (
        <FlatList
          data={bookings}
          keyExtractor={b => b.id}
          renderItem={({ item }) => <BookingCard b={item} />}
          contentContainerStyle={{ padding: Spacing.base, gap: 10, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.white} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyText}>No bookings yet</Text>
            </View>
          }
        />
      )}

      {tab === 'rooms' && (
        <FlatList
          data={rooms}
          keyExtractor={r => r.id}
          numColumns={2}
          renderItem={({ item }) => <View style={{ flex: 1, margin: 5 }}><RoomCard room={item} /></View>}
          contentContainerStyle={{ padding: Spacing.sm, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.white} />}
        />
      )}

      {billRoom && <RoomBillModal room={billRoom} onClose={() => setBillRoom(null)} />}
    </View>
  );
}

function RoomBillModal({ room, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);

  const loadBill = useCallback(() => {
    setLoading(true);
    hotelOpsApi.roomCharges(room.id)
      .then(r => setData(r.data.data))
      .catch(() => setData({ charges: [], pendingTotal: 0 }))
      .finally(() => setLoading(false));
  }, [room.id]);

  useEffect(() => { loadBill(); }, [loadBill]);

  const settle = async () => {
    setSettling(true);
    try { await hotelOpsApi.settleCharges(room.id); loadBill(); }
    catch { Alert.alert('Could not settle charges'); }
    finally { setSettling(false); }
  };

  const pending = data?.charges?.filter(c => c.status === 'PENDING') || [];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Room {room.roomNumber} · Bill</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}><Text>✕</Text></TouchableOpacity>
          </View>
          {loading ? (
            <Text style={styles.emptyText}>Loading bill…</Text>
          ) : (
            <ScrollView>
              <LinearGradient colors={['#1D9E75','#178A65']} style={styles.pendingCard}>
                <Text style={styles.pendingLabel}>PENDING</Text>
                <Text style={styles.pendingValue}>₹{Number(data?.pendingTotal || 0).toLocaleString('en-IN')}</Text>
              </LinearGradient>
              {pending.length === 0 ? (
                <Text style={[styles.emptyText, { marginVertical: 20 }]}>No pending charges</Text>
              ) : pending.map(c => (
                <View key={c.id} style={styles.chargeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chargeDesc}>{c.description}</Text>
                    <Text style={styles.chargeTime}>{new Date(c.createdAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</Text>
                  </View>
                  <Text style={styles.chargeAmt}>₹{Number(c.amount).toLocaleString('en-IN')}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.settleBtn, (settling || pending.length === 0) && { opacity: 0.5 }]}
                onPress={settle} disabled={settling || pending.length === 0}>
                <Text style={styles.settleBtnText}>{settling ? 'Settling…' : 'Settle & Checkout'}</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerGrad:   { paddingTop: 52, paddingHorizontal: Spacing.base, paddingBottom: 24 },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.base },
  headerSub:    { fontSize: FontSize.xs, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5 },
  hotelName:    { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white, marginTop: 4 },
  statsRow:     { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.lg, padding: Spacing.md },
  statItem:     { flex: 1, alignItems: 'center' },
  statValue:    { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.white },
  statLabel:    { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  statDivider:  { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  navGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: Spacing.base, paddingBottom: 4, backgroundColor: Colors.white },
  navItem:      { width: '18%', alignItems: 'center', gap: 6, paddingVertical: Spacing.sm, backgroundColor: Colors.background, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  navEmoji:     { fontSize: 20 },
  navLabel:     { fontSize: 10, fontWeight: '600', color: Colors.gray700, textAlign: 'center' },
  tabRow:       { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn:       { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabActive:    { borderBottomWidth: 2.5, borderBottomColor: Colors.purple || '#7C3AED' },
  tabText:      { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray500 },
  tabActiveText:{ color: Colors.gray900, fontWeight: '800' },
  reqCard:      { padding: Spacing.base, gap: 8 },
  urgentCard:   { borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  reqTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  reqRoom:      { fontSize: FontSize.base, fontWeight: '800' },
  reqType:      { fontSize: FontSize.sm, color: Colors.gray500, marginTop: 2 },
  reqDesc:      { fontSize: FontSize.sm, color: Colors.gray700, lineHeight: 18 },
  priorityBadge:{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  priorityText: { fontSize: FontSize.xs, fontWeight: '700' },
  reqBottom:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reqTime:      { fontSize: FontSize.xs, color: Colors.gray400 },
  advBtn:       { backgroundColor: '#7C3AED', paddingVertical: 5, paddingHorizontal: 12, borderRadius: Radius.md },
  advBtnText:   { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  roomCard:     { padding: Spacing.md },
  roomTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  roomNum:      { fontSize: FontSize.base, fontWeight: '800' },
  roomType:     { fontSize: FontSize.xs, color: Colors.gray400 },
  guestInfo:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  guestName:    { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  roomDates:    { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  billBtn:      { marginTop: 8, alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, paddingVertical: 5, paddingHorizontal: 10, borderRadius: Radius.md },
  billBtnText:  { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  emptyWrap:    { alignItems: 'center', paddingTop: 60 },
  emptyEmoji:   { fontSize: 48, marginBottom: 12 },
  emptyText:    { fontSize: FontSize.base, color: Colors.gray400, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: Colors.white, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.base, maxHeight: '85%' },
  modalHead:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.base },
  modalTitle:   { fontSize: FontSize.lg, fontWeight: '800' },
  modalClose:   { backgroundColor: Colors.gray100, borderRadius: Radius.md, padding: 8 },
  pendingCard:  { borderRadius: Radius.lg, padding: Spacing.base, marginBottom: Spacing.base },
  pendingLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.85)' },
  pendingValue: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.white },
  chargeRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight || Colors.border },
  chargeDesc:   { fontSize: FontSize.sm, fontWeight: '600' },
  chargeTime:   { fontSize: FontSize.xs, color: Colors.gray400 },
  chargeAmt:    { fontSize: FontSize.sm, fontWeight: '800' },
  settleBtn:    { marginTop: Spacing.base, backgroundColor: Colors.primary, borderRadius: Radius.md, height: 48, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.base },
  settleBtnText:{ color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
});