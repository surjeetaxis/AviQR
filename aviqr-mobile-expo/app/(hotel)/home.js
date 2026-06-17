import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
// Icon not needed — using emoji
import { LinearGradient } from 'expo-linear-gradient';
// Toast replaced with Alert
import { hotelApi } from '../../src/api/index.js';
import { useAuth } from '../../src/context/AuthContext.js';
import { StatCard } from '../../src/components/common/StatCard.js';
import { StatusBadge } from '../../src/components/common/StatusBadge.js';
import { Card } from '../../src/components/common/Card.js';
// BottomSheet replaced with Modal
import { Button } from '../../src/components/common/Button.js';
import { Input } from '../../src/components/common/Input.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

const SERVICE_TYPES = [
  { id:'ROOM_SERVICE', emoji:'🍽', label:'Room Service' },
  { id:'LAUNDRY',      emoji:'👕', label:'Laundry' },
  { id:'SPA',          emoji:'💆', label:'Spa' },
  { id:'HOUSEKEEPING', emoji:'🧹', label:'Housekeeping' },
  { id:'MAINTENANCE',  emoji:'🔧', label:'Maintenance' },
];

const STATUS_NEXT = { NEW:'ACCEPTED', ACCEPTED:'PREPARING', PREPARING:'CONFIRMED', CONFIRMED:'DONE' };
const PRIORITY_COLOR = { HIGH:'#DC2626', NORMAL:'#6B7280', URGENT:'#DC2626' };

export default function HotelHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [hotels, setHotels]       = useState([]);
  const [selectedHotel, setHotel] = useState(null);
  const [rooms, setRooms]         = useState([]);
  const [requests, setRequests]   = useState([]);
  const [tab, setTab]             = useState('requests');
  const [refreshing, setRef]      = useState(false);
  const [reqSheet, setReqSheet]   = useState(null);

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
      const [r, req] = await Promise.allSettled([
        hotelApi.getRooms(hotel.id),
        hotelApi.getHotelRequests(hotel.id, { liveOnly: false }),
      ]);
      if (r.status === 'fulfilled') setRooms(r.value.data.data || []);
      if (req.status === 'fulfilled') setRequests(req.value.data.data || []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (selectedHotel) loadHotelData(selectedHotel); }, [selectedHotel]);

  const onRefresh = async () => { setRef(true); await load(); if (selectedHotel) await loadHotelData(selectedHotel); setRef(false); };

  const advanceRequest = async (req) => {
    const next = STATUS_NEXT[req.status];
    if (!next) return;
    try {
      await hotelApi.updateRequestStatus(req.id, next);
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: next } : r));
      Toast.show({ type: 'success', text1: `Moved to ${next}` });
    } catch { Toast.show({ type: 'error', text1: 'Failed to update' }); }
  };

  const liveRequests  = requests.filter(r => r.status !== 'DONE' && r.status !== 'CANCELLED');
  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED').length;
  const urgentCount   = liveRequests.filter(r => r.priority === 'HIGH' || r.priority === 'URGENT').length;

  const RequestCard = ({ req }) => (
    <Card style={[styles.reqCard, req.priority === 'HIGH' && styles.urgentCard]}>
      <View style={styles.reqTop}>
        <View>
          <Text style={styles.reqRoom}>Room {req.roomNumber}</Text>
          <Text style={styles.reqType}>{SERVICE_TYPES.find(s => s.id === req.serviceType)?.emoji || '📋'} {req.serviceType?.replace('_',' ')}</Text>
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
          <Icon name="user" size={12} color={Colors.primary} />
          <Text style={styles.guestName}>{room.guestName}</Text>
        </View>
      )}
      {room.checkInDate && <Text style={styles.roomDates}>In: {room.checkInDate} · Out: {room.checkOutDate}</Text>}
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
            <Icon name="log-out" size={18} color="rgba(255,255,255,0.6)" />
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

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[['requests', `Requests (${liveRequests.length})`], ['rooms', `Rooms (${rooms.length})`]].map(([t, l]) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabActiveText]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'requests' ? (
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
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={r => r.id}
          numColumns={2}
          renderItem={({ item }) => <View style={{ flex: 1, margin: 5 }}><RoomCard room={item} /></View>}
          contentContainerStyle={{ padding: Spacing.sm, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.white} />}
        />
      )}
    </View>
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
  emptyWrap:    { alignItems: 'center', paddingTop: 60 },
  emptyEmoji:   { fontSize: 48, marginBottom: 12 },
  emptyText:    { fontSize: FontSize.base, color: Colors.gray400 },
});