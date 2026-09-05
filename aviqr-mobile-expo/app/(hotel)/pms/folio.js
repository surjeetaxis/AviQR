import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { hotelApi, pmsApi } from '../../../src/api/index.js';
import { PageHeader } from '../../../src/components/common/PageHeader.js';
import { Card } from '../../../src/components/common/Card.js';
import { Button } from '../../../src/components/common/Button.js';
import { Input } from '../../../src/components/common/Input.js';
import { Colors, FontSize, Spacing, Radius } from '../../../src/theme/index.js';

const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'WALLET', 'VOUCHER', 'LOYALTY_POINTS'];
const CHARGE_TYPES = ['ADDON', 'TAX', 'OTHER'];

export default function FolioScreen() {
  const params = useLocalSearchParams();
  const [hotelId, setHotelId] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [selectedId, setSelectedId] = useState(params.reservationId || '');
  const [folio, setFolio] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [preAuth, setPreAuth] = useState(null);
  const [discounts, setDiscounts] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);

  const [charge, setCharge] = useState({ type: 'ADDON', description: '', amount: '' });
  const [payment, setPayment] = useState({ method: 'CASH', amount: '', reference: '' });
  const [savingCharge, setSavingCharge] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  const loadFolio = useCallback((id) => {
    if (!id) { setFolio(null); return; }
    pmsApi.getFolio(id).then(res => setFolio(res.data.data)).catch(() => setFolio(null));
    pmsApi.getInvoice(id).then(res => setInvoice(res.data.data)).catch(() => setInvoice(null));
    pmsApi.getPreAuth(id).then(res => setPreAuth(res.data.data)).catch(() => setPreAuth(null));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hRes = await hotelApi.getMyHotels();
        const hotel = (hRes.data.data || [])[0];
        if (!hotel) return;
        setHotelId(hotel.id);
        const [resvRes, discRes, addonRes] = await Promise.allSettled([
          pmsApi.listReservations(hotel.id), pmsApi.listDiscounts(hotel.id), pmsApi.listAddOns(hotel.id),
        ]);
        if (resvRes.status === 'fulfilled') setReservations(resvRes.value.data.data || []);
        if (discRes.status === 'fulfilled') setDiscounts((discRes.value.data.data || []).filter(d => d.active));
        if (addonRes.status === 'fulfilled') setAddOns(addonRes.value.data.data || []);
        if (selectedId) loadFolio(selectedId);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => { loadFolio(selectedId); }, [selectedId, loadFolio]);

  const captureHold = async () => {
    setCapturing(true);
    try { await pmsApi.capturePreAuth(selectedId); loadFolio(selectedId); }
    catch (err) { Alert.alert(err?.response?.data?.message || 'Could not capture the held card.'); }
    finally { setCapturing(false); }
  };

  const applyDiscount = async (discountId) => {
    try { await pmsApi.applyDiscount(selectedId, discountId); loadFolio(selectedId); }
    catch { Alert.alert('Could not apply discount'); }
  };
  const applyAddOn = async (addOnId) => {
    try { await pmsApi.applyAddOn(selectedId, addOnId, 1); loadFolio(selectedId); }
    catch { Alert.alert('Could not apply add-on'); }
  };

  const addCharge = async () => {
    if (!charge.description.trim() || !charge.amount) return Alert.alert('Description and amount are required');
    setSavingCharge(true);
    try {
      await pmsApi.addFolioCharge(selectedId, { ...charge, amount: Number(charge.amount) });
      setCharge({ type: 'ADDON', description: '', amount: '' });
      loadFolio(selectedId);
    } catch { Alert.alert('Could not add charge'); }
    finally { setSavingCharge(false); }
  };

  const addPayment = async () => {
    if (!payment.amount) return Alert.alert('Amount is required');
    setSavingPayment(true);
    try {
      await pmsApi.addFolioPayment(selectedId, { ...payment, amount: Number(payment.amount) });
      setPayment({ method: 'CASH', amount: '', reference: '' });
      loadFolio(selectedId);
    } catch (err) { Alert.alert(err?.response?.data?.message || 'Could not record payment'); }
    finally { setSavingPayment(false); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Folio" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  const selectedRes = reservations.find(r => r.id === selectedId);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Folio" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.fieldLabel}>Reservation</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {reservations.map(r => (
            <TouchableOpacity key={r.id} onPress={() => setSelectedId(r.id)} style={[ss.chip, selectedId === r.id && ss.chipActive]}>
              <Text style={[ss.chipTxt, selectedId === r.id && ss.chipTxtActive]} numberOfLines={1}>{r.guestName} · {r.checkInDate}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!selectedRes && <Text style={ss.emptyTxt}>Select a reservation to view its folio.</Text>}

        {folio && (
          <>
            {invoice && (
              <Card style={ss.bannerCard}>
                <Text style={ss.bannerTitle}>Invoice {invoice.invoiceNumber}</Text>
                <Text style={ss.bannerSub}>Charges ₹{Number(invoice.totalCharges).toLocaleString('en-IN')} · Paid ₹{Number(invoice.totalPayments).toLocaleString('en-IN')} · Balance ₹{Number(invoice.balance).toLocaleString('en-IN')}</Text>
              </Card>
            )}
            {preAuth?.status === 'AUTHORIZED' && (
              <Card style={[ss.bannerCard, { backgroundColor: '#FFFBEB' }]}>
                <Text style={ss.bannerTitle}>💳 Card held — ₹{Number(preAuth.amount).toLocaleString('en-IN')} authorized</Text>
                <Button title={capturing ? 'Capturing…' : 'Capture to Folio'} size="sm" loading={capturing} onPress={captureHold} style={{ marginTop: 8 }} />
              </Card>
            )}
            {preAuth?.status === 'CAPTURED' && (
              <Card style={ss.bannerCard}>
                <Text style={ss.bannerTitle}>💳 Card charged — ₹{Number(preAuth.amount).toLocaleString('en-IN')} captured</Text>
              </Card>
            )}

            <View style={ss.kpiRow}>
              <View style={ss.kpi}><Text style={ss.kpiValue}>₹{Number(folio.totalCharges).toLocaleString('en-IN')}</Text><Text style={ss.kpiLabel}>Charges</Text></View>
              <View style={ss.kpi}><Text style={ss.kpiValue}>₹{Number(folio.totalPayments).toLocaleString('en-IN')}</Text><Text style={ss.kpiLabel}>Payments</Text></View>
              <View style={ss.kpi}><Text style={[ss.kpiValue, { color: Colors.primary }]}>₹{Number(folio.balance).toLocaleString('en-IN')}</Text><Text style={ss.kpiLabel}>Balance</Text></View>
            </View>

            <Card style={{ marginBottom: 12 }}>
              <Text style={ss.cardTitle}>Charges</Text>
              {folio.charges.map(c => (
                <View key={c.id} style={ss.row}>
                  <Text style={ss.rowLabel}>{c.description} <Text style={ss.rowMeta}>· {c.type}</Text></Text>
                  <Text style={ss.rowAmt}>₹{Number(c.amount).toLocaleString('en-IN')}</Text>
                </View>
              ))}
              {folio.charges.length === 0 && <Text style={ss.emptyTxt}>No charges yet.</Text>}
            </Card>

            {(discounts.length > 0 || addOns.length > 0) && (
              <Card style={{ marginBottom: 12 }}>
                {discounts.length > 0 && <>
                  <Text style={ss.fieldLabel}>Apply a discount</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {discounts.map(d => (
                      <TouchableOpacity key={d.id} onPress={() => applyDiscount(d.id)} style={ss.chip}>
                        <Text style={ss.chipTxt}>{d.name} ({d.valueType === 'FIXED' ? `₹${d.value}` : `${d.value}%`})</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>}
                {addOns.length > 0 && <>
                  <Text style={ss.fieldLabel}>Add from catalog</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {addOns.map(a => (
                      <TouchableOpacity key={a.id} onPress={() => applyAddOn(a.id)} style={ss.chip}>
                        <Text style={ss.chipTxt}>{a.name} (₹{a.price})</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>}
              </Card>
            )}

            <Card style={{ marginBottom: 12 }}>
              <Text style={ss.cardTitle}>Add charge</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {CHARGE_TYPES.map(t => (
                  <TouchableOpacity key={t} onPress={() => setCharge(c => ({ ...c, type: t }))} style={[ss.chip, charge.type === t && ss.chipActive]}>
                    <Text style={[ss.chipTxt, charge.type === t && ss.chipTxtActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input placeholder="Description" value={charge.description} onChangeText={v => setCharge(c => ({ ...c, description: v }))} />
              <Input placeholder="Amount" keyboardType="number-pad" value={charge.amount} onChangeText={v => setCharge(c => ({ ...c, amount: v }))} />
              <Button title={savingCharge ? 'Adding…' : 'Add Charge'} loading={savingCharge} onPress={addCharge} />
            </Card>

            <Card style={{ marginBottom: 12 }}>
              <Text style={ss.cardTitle}>Payments</Text>
              {folio.payments.map(p => (
                <View key={p.id} style={ss.row}>
                  <Text style={ss.rowLabel}>{p.method} <Text style={ss.rowMeta}>{p.reference ? `· ${p.reference}` : ''}</Text></Text>
                  <Text style={ss.rowAmt}>₹{Number(p.amount).toLocaleString('en-IN')}</Text>
                </View>
              ))}
              {folio.payments.length === 0 && <Text style={ss.emptyTxt}>No payments yet.</Text>}
            </Card>

            <Card>
              <Text style={ss.cardTitle}>Record payment</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {PAYMENT_METHODS.map(m => (
                  <TouchableOpacity key={m} onPress={() => setPayment(p => ({ ...p, method: m }))} style={[ss.chip, payment.method === m && ss.chipActive]}>
                    <Text style={[ss.chipTxt, payment.method === m && ss.chipTxtActive]}>{m.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input placeholder="Amount" keyboardType="number-pad" value={payment.amount} onChangeText={v => setPayment(p => ({ ...p, amount: v }))} />
              {payment.method !== 'LOYALTY_POINTS' && (
                <Input placeholder={payment.method === 'VOUCHER' ? 'Voucher code' : 'Reference'} value={payment.reference} onChangeText={v => setPayment(p => ({ ...p, reference: v }))} />
              )}
              <Button title={savingPayment ? 'Recording…' : 'Record Payment'} loading={savingPayment} onPress={addPayment} />
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray500, marginBottom: 6 },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray900, marginBottom: 10 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.full, backgroundColor: Colors.gray100, maxWidth: 220 },
  chipActive: { backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipTxtActive: { color: Colors.primary },
  bannerCard: { marginBottom: 12, backgroundColor: Colors.white },
  bannerTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray900 },
  bannerSub: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 4 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpi: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 10, alignItems: 'center' },
  kpiValue: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  kpiLabel: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  rowLabel: { fontSize: FontSize.sm, color: Colors.gray900, flex: 1, marginRight: 8 },
  rowMeta: { color: Colors.gray400, fontSize: FontSize.xs },
  rowAmt: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray900 },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 12 },
});
