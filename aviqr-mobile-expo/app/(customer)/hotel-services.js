import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { guestServiceApi } from '../../src/api/index.js';
import { Button } from '../../src/components/common/Button.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

const OUTLET_EMOJI = {
  RESTAURANT:'🍽️', BAR:'🍷', POOL:'🏊', SPA:'💆', SHOP:'🛍️', GYM:'🏋️',
  BANQUET:'🏛️', KIDS_CLUB:'🧸', LAUNDRY:'👕', CONCIERGE:'🔔',
  BUSINESS_CENTER:'🏢', ACTIVITY:'📍', OTHER:'▫️',
};

const REQUEST_TYPES = [
  { key:'HOUSEKEEPING', label:'Housekeeping', emoji:'🧹', hint:'Clean room, make bed' },
  { key:'AMENITIES',    label:'Amenities',    emoji:'🛎', hint:'Towels, toiletries, pillows' },
  { key:'MAINTENANCE',  label:'Maintenance',  emoji:'🔧', hint:'AC, plumbing, electrical' },
  { key:'CONCIERGE',    label:'Concierge',    emoji:'🔔', hint:'Recommendations, taxi, bookings' },
  { key:'LAUNDRY',      label:'Laundry',      emoji:'👕', hint:'Laundry pickup' },
  { key:'LATE_CHECKOUT',label:'Late Checkout',emoji:'⏰', hint:'Request a later checkout' },
];

export default function GuestServicesScreen() {
  const { hotelId, room, area } = useLocalSearchParams();

  const [hub, setHub]       = useState(null);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState(null);
  const [tab, setTab]       = useState('hub');
  const [toast, setToast]   = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await guestServiceApi.hub(hotelId, room, area);
      setHub(res.data.data);
    } catch { setError('Could not load hotel services. Please contact the front desk.'); }
    finally { setLoad(false); }
  }, [hotelId, room, area]);

  useEffect(() => { load(); }, [load]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={{ color: Colors.gray500, fontSize: 14, marginTop: 12 }}>Loading services…</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 40 }}>🏨</Text>
      <Text style={{ color: Colors.error, fontSize: 14, marginTop: 12, textAlign: 'center', paddingHorizontal: 30 }}>{error}</Text>
    </View>
  );

  return (
    <View style={styles.page}>
      <LinearGradient colors={['#1D9E75','#178A65']} style={styles.header}>
        <Text style={styles.headerSub}>WELCOME TO</Text>
        <Text style={styles.hotelName}>{hub.hotelName}</Text>
        {hub.room?.roomNumber && (
          <View style={styles.roomChip}>
            <Text style={styles.roomChipText}>
              🛏 Room {hub.room.roomNumber}{hub.room.guestName ? ` · ${hub.room.guestName}` : ''}
              {hub.canChargeToRoom ? '  ✓ Checked in' : ''}
            </Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.tabs}>
        {[['hub','Services'],['request','Requests'],['folio','My Bill']].map(([k,l]) => (
          <TouchableOpacity key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabActive]}>
            <Text style={[styles.tabText, tab === k && styles.tabActiveText]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'hub'     && <HubView hub={hub} room={room} onBooked={() => flash('Booking requested — front desk will confirm shortly')} />}
      {tab === 'request' && <RequestView hotelId={hotelId} room={room} guestName={hub.room?.guestName}
                              onDone={() => { flash('Request sent to hotel staff'); setTab('hub'); }} />}
      {tab === 'folio'   && <FolioView hotelId={hotelId} room={room} />}

      {toast && (
        <View style={styles.toast}><Text style={styles.toastText}>✓ {toast}</Text></View>
      )}
    </View>
  );
}

function HubView({ hub, room, onBooked }) {
  const [booking, setBooking] = useState(null);

  return (
    <ScrollView contentContainerStyle={styles.body}>
      {hub.scannedArea && (
        <View style={styles.areaBanner}><Text style={styles.areaBannerText}>📍 You scanned the {hub.scannedArea} QR code</Text></View>
      )}
      <View style={styles.grid}>
        {hub.outlets.map(o => (
          <TouchableOpacity key={o.id} style={styles.outletCard} onPress={() => o.bookable && setBooking(o)}>
            <View style={styles.outletIcon}><Text style={{ fontSize: 20 }}>{OUTLET_EMOJI[o.type] || '▫️'}</Text></View>
            <Text style={styles.outletName}>{o.name}</Text>
            <Text style={styles.outletSub}>{o.location || o.type}</Text>
            {o.bookable
              ? <Text style={styles.bookTag}>Book a slot</Text>
              : o.shopId ? <Text style={styles.orderTag}>Order now →</Text> : null}
          </TouchableOpacity>
        ))}
      </View>
      {hub.outlets.length === 0 && <Text style={styles.emptyText}>No services are available right now.</Text>}
      {booking && (
        <BookingModal outlet={booking} hotelId={hub.hotelId} room={room} canCharge={hub.canChargeToRoom}
          onClose={() => setBooking(null)} onDone={() => { setBooking(null); onBooked(); }} />
      )}
    </ScrollView>
  );
}

function BookingModal({ outlet, hotelId, room, canCharge, onClose, onDone }) {
  const [f, setF] = useState({
    serviceName:'', price:'', bookingDate:new Date().toISOString().slice(0,10),
    bookingTime:'', partySize:'1', guestName:'', notes:'',
    paymentChoice: canCharge ? 'CHARGE_TO_ROOM' : 'PAY_DIRECT',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!f.serviceName || !f.bookingTime) return;
    setSaving(true);
    try {
      await guestServiceApi.book(hotelId, { ...f, outletId: outlet.id, roomNumber: room, price: f.price || 0 });
      onDone();
    } catch (e) { Alert.alert(e.response?.data?.message || 'Booking failed'); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalCard}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{outlet.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}><Text>✕</Text></TouchableOpacity>
          </View>

          <FieldLabel>What would you like to book?</FieldLabel>
          <TextInput style={styles.input} placeholder="e.g. Swedish Massage 60min / Table for 4"
            placeholderTextColor={Colors.gray400} value={f.serviceName} onChangeText={v => setF({ ...f, serviceName: v })} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <FieldLabel>Date</FieldLabel>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.gray400}
                value={f.bookingDate} onChangeText={v => setF({ ...f, bookingDate: v })} />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>Time</FieldLabel>
              <TextInput style={styles.input} placeholder="HH:MM" placeholderTextColor={Colors.gray400}
                value={f.bookingTime} onChangeText={v => setF({ ...f, bookingTime: v })} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <FieldLabel>Guests</FieldLabel>
              <TextInput style={styles.input} keyboardType="number-pad" value={f.partySize}
                onChangeText={v => setF({ ...f, partySize: v })} />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>Price (₹, if known)</FieldLabel>
              <TextInput style={styles.input} keyboardType="number-pad" placeholder="0" placeholderTextColor={Colors.gray400}
                value={f.price} onChangeText={v => setF({ ...f, price: v })} />
            </View>
          </View>

          <FieldLabel>Your name</FieldLabel>
          <TextInput style={styles.input} value={f.guestName} onChangeText={v => setF({ ...f, guestName: v })} />

          <Text style={styles.payHeading}>PAYMENT</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <PayOption active={f.paymentChoice === 'CHARGE_TO_ROOM'} disabled={!canCharge}
              onPress={() => canCharge && setF({ ...f, paymentChoice: 'CHARGE_TO_ROOM' })}
              emoji="🛏" title="Charge to room" sub={canCharge ? 'Settle at checkout' : 'Not checked in'} />
            <PayOption active={f.paymentChoice === 'PAY_DIRECT'}
              onPress={() => setF({ ...f, paymentChoice: 'PAY_DIRECT' })}
              emoji="💳" title="Pay direct" sub="Card / UPI now" />
          </View>

          <Button title={saving ? 'Sending…' : 'Request booking'} onPress={submit} loading={saving} style={{ marginBottom: 20 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function RequestView({ hotelId, room, guestName, onDone }) {
  const [type, setType] = useState('HOUSEKEEPING');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await guestServiceApi.request(hotelId, { roomNumber: room, guestName, type, details });
      onDone();
    } catch { Alert.alert('Could not send request'); }
    finally { setSaving(false); }
  };

  if (!room) return <View style={styles.body}><Text style={styles.emptyText}>Requests need a room. Please scan the QR in your room.</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.sectionLabel}>What do you need for Room {room}?</Text>
      <View style={styles.reqGrid}>
        {REQUEST_TYPES.map(r => (
          <TouchableOpacity key={r.key} onPress={() => setType(r.key)}
            style={[styles.reqCard, type === r.key && styles.reqCardActive]}>
            <Text style={{ fontSize: 20 }}>{r.emoji}</Text>
            <Text style={styles.reqCardLabel}>{r.label}</Text>
            <Text style={styles.reqCardHint}>{r.hint}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FieldLabel>Any details? (optional)</FieldLabel>
      <TextInput style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} multiline
        placeholder="e.g. 2 extra towels and a toothbrush" placeholderTextColor={Colors.gray400}
        value={details} onChangeText={setDetails} />
      <Button title={saving ? 'Sending…' : 'Send request'} onPress={submit} loading={saving} />
    </ScrollView>
  );
}

function FolioView({ hotelId, room }) {
  const [folio, setFolio] = useState(null);
  const [loading, setLoad] = useState(true);

  useEffect(() => {
    if (!room) { setLoad(false); return; }
    guestServiceApi.folio(hotelId, room)
      .then(r => setFolio(r.data.data))
      .catch(() => {})
      .finally(() => setLoad(false));
  }, [hotelId, room]);

  if (!room) return <View style={styles.body}><Text style={styles.emptyText}>Scan your room QR to view your bill.</Text></View>;
  if (loading) return <View style={styles.body}><Text style={styles.emptyText}>Loading bill…</Text></View>;
  if (!folio || folio.charges.length === 0) return (
    <View style={styles.body}>
      <Text style={{ fontSize: 36, textAlign: 'center' }}>🧾</Text>
      <Text style={styles.emptyText}>No charges yet</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <LinearGradient colors={['#1D9E75','#178A65']} style={styles.folioTotal}>
        <View>
          <Text style={styles.folioLabel}>PENDING (to settle at checkout)</Text>
          <Text style={styles.folioValue}>₹{Number(folio.pendingTotal).toLocaleString('en-IN')}</Text>
        </View>
        <Text style={{ fontSize: 28 }}>🧾</Text>
      </LinearGradient>
      {folio.charges.map(c => (
        <View key={c.id} style={styles.chargeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.chargeDesc}>{c.description}</Text>
            <Text style={styles.chargeTime}>
              {new Date(c.createdAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
              {' · '}{c.paymentChoice === 'PAY_DIRECT' ? 'Paid' : c.status === 'SETTLED' ? 'Settled' : 'Pending'}
            </Text>
          </View>
          <Text style={[styles.chargeAmt, c.status === 'SETTLED' && { color: Colors.gray400 }]}>
            ₹{Number(c.amount).toLocaleString('en-IN')}
          </Text>
        </View>
      ))}
      <Text style={styles.folioFootnote}>Charges to your room are settled at checkout.{'\n'}Questions? Contact the front desk.</Text>
    </ScrollView>
  );
}

function FieldLabel({ children }) { return <Text style={styles.fieldLabel}>{children}</Text>; }

function PayOption({ active, disabled, onPress, emoji, title, sub }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}
      style={[styles.payOption, active && styles.payOptionActive, disabled && styles.payOptionDisabled]}>
      <Text style={{ fontSize: 16 }}>{emoji}</Text>
      <Text style={[styles.payOptionTitle, active && { color: Colors.primary }]}>{title}</Text>
      <Text style={styles.payOptionSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  page:      { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:    { paddingTop: 52, paddingHorizontal: Spacing.lg, paddingBottom: 20 },
  headerSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5, fontWeight: '700' },
  hotelName: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.white, marginTop: 2 },
  roomChip:  { alignSelf: 'flex-start', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  roomChipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.white },
  tabs:      { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab:       { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.primary },
  tabText:   { fontSize: FontSize.base, fontWeight: '600', color: Colors.gray400 },
  tabActiveText: { color: Colors.primary },
  body:      { padding: Spacing.base, paddingBottom: 40 },
  areaBanner:{ backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: '#C7E9DA', borderRadius: Radius.md, padding: 12, marginBottom: 14 },
  areaBannerText: { fontSize: FontSize.sm, color: Colors.primaryDark },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  outletCard:{ width: '47%', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.xl, padding: 14 },
  outletIcon:{ width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  outletName:{ fontWeight: '700', fontSize: FontSize.base, color: Colors.gray900 },
  outletSub: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  orderTag:  { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700', marginTop: 8 },
  bookTag:   { fontSize: FontSize.xs, color: Colors.purple, fontWeight: '700', marginTop: 8 },
  emptyText: { textAlign: 'center', color: Colors.gray400, fontSize: FontSize.sm, marginTop: 16 },
  sectionLabel: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 12 },
  reqGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  reqCard:   { width: '47%', backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.gray200, borderRadius: Radius.lg, padding: 14, alignItems: 'center' },
  reqCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  reqCardLabel: { fontWeight: '600', fontSize: FontSize.sm, marginTop: 6 },
  reqCardHint:  { fontSize: 10, color: Colors.gray400, marginTop: 2, textAlign: 'center' },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray500, marginBottom: 5, marginTop: 8 },
  input:     { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 11, fontSize: FontSize.base, color: Colors.gray900, marginBottom: 12 },
  payHeading:{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray500, marginBottom: 6 },
  payOption: { flex: 1, padding: 12, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.gray200, backgroundColor: Colors.white },
  payOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  payOptionDisabled: { opacity: 0.5, backgroundColor: Colors.gray50 },
  payOptionTitle: { fontWeight: '700', fontSize: FontSize.sm, marginTop: 4, color: Colors.gray700 },
  payOptionSub: { fontSize: 10, color: Colors.gray400 },
  toast:     { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: Colors.gray900, paddingHorizontal: 18, paddingVertical: 12, borderRadius: Radius.md, maxWidth: '90%' },
  toastText: { color: Colors.white, fontSize: FontSize.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.base, maxHeight: '90%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:{ fontWeight: '800', fontSize: FontSize.lg },
  modalClose:{ backgroundColor: Colors.gray100, borderRadius: Radius.md, padding: 6 },
  folioTotal:{ borderRadius: Radius.lg, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  folioLabel:{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.85)' },
  folioValue:{ fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.white },
  chargeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  chargeDesc:{ fontWeight: '600', fontSize: FontSize.sm },
  chargeTime:{ fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  chargeAmt: { fontWeight: '700', fontSize: FontSize.base, color: Colors.gray900 },
  folioFootnote: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', marginTop: 16, lineHeight: 18 },
});