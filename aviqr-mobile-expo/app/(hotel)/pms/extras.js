import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Switch } from 'react-native';
import { hotelApi, pmsApi } from '../../../src/api/index.js';
import { PageHeader } from '../../../src/components/common/PageHeader.js';
import { Card } from '../../../src/components/common/Card.js';
import { Button } from '../../../src/components/common/Button.js';
import { Input } from '../../../src/components/common/Input.js';
import { Colors, FontSize, Spacing, Radius } from '../../../src/theme/index.js';

export default function ExtrasScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [surcharges, setSurcharges] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingLoyalty, setSavingLoyalty] = useState(false);

  const [sForm, setSForm] = useState({ name: '', valueType: 'FIXED', value: '' });
  const [dForm, setDForm] = useState({ name: '', valueType: 'PERCENT', value: '' });
  const [aForm, setAForm] = useState({ name: '', description: '', price: '' });
  const [vForm, setVForm] = useState({ code: '', initialValue: '' });

  const load = useCallback(async (hId) => {
    const [s, d, a, v, l] = await Promise.allSettled([
      pmsApi.listSurcharges(hId), pmsApi.listDiscounts(hId), pmsApi.listAddOns(hId), pmsApi.listVouchers(hId), pmsApi.getLoyaltyConfig(hId),
    ]);
    if (s.status === 'fulfilled') setSurcharges(s.value.data.data || []);
    if (d.status === 'fulfilled') setDiscounts(d.value.data.data || []);
    if (a.status === 'fulfilled') setAddOns(a.value.data.data || []);
    if (v.status === 'fulfilled') setVouchers(v.value.data.data || []);
    if (l.status === 'fulfilled') setLoyalty(l.value.data.data);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hRes = await hotelApi.getMyHotels();
        const hotel = (hRes.data.data || [])[0];
        if (!hotel) return;
        setHotelId(hotel.id);
        await load(hotel.id);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [load]);

  const saveLoyalty = async () => {
    setSavingLoyalty(true);
    try { const res = await pmsApi.updateLoyaltyConfig(hotelId, loyalty); setLoyalty(res.data.data); }
    catch { Alert.alert('Could not save loyalty program settings'); }
    finally { setSavingLoyalty(false); }
  };

  const addSurcharge = async () => {
    if (!sForm.name.trim() || !sForm.value) return Alert.alert('Name and value are required');
    try { await pmsApi.createSurcharge({ hotelId, ...sForm, value: Number(sForm.value) }); setSForm({ name: '', valueType: 'FIXED', value: '' }); load(hotelId); }
    catch { Alert.alert('Could not create surcharge'); }
  };
  const toggleSurcharge = (s) => pmsApi.updateSurcharge(s.id, { ...s, active: !s.active }).then(() => load(hotelId)).catch(() => {});

  const addDiscount = async () => {
    if (!dForm.name.trim() || !dForm.value) return Alert.alert('Name and value are required');
    try { await pmsApi.createDiscount({ hotelId, ...dForm, value: Number(dForm.value) }); setDForm({ name: '', valueType: 'PERCENT', value: '' }); load(hotelId); }
    catch { Alert.alert('Could not create discount'); }
  };
  const toggleDiscount = (d) => pmsApi.updateDiscount(d.id, { ...d, active: !d.active }).then(() => load(hotelId)).catch(() => {});

  const addAddOn = async () => {
    if (!aForm.name.trim() || !aForm.price) return Alert.alert('Name and price are required');
    try { await pmsApi.createAddOn({ hotelId, ...aForm, price: Number(aForm.price) }); setAForm({ name: '', description: '', price: '' }); load(hotelId); }
    catch { Alert.alert('Could not create add-on'); }
  };
  const toggleAddOn = (a) => pmsApi.updateAddOn(a.id, { ...a, active: !a.active }).then(() => load(hotelId)).catch(() => {});

  const issueVoucher = async () => {
    if (!vForm.code.trim() || !vForm.initialValue) return Alert.alert('Code and value are required');
    try { await pmsApi.issueVoucher({ hotelId, code: vForm.code.toUpperCase(), initialValue: Number(vForm.initialValue) }); setVForm({ code: '', initialValue: '' }); load(hotelId); }
    catch (err) { Alert.alert(err?.response?.data?.message || 'Could not issue voucher'); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Surcharges & Add-ons" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Surcharges & Add-ons" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>

        <Card style={{ marginBottom: 16 }}>
          <Text style={ss.cardTitle}>Surcharges</Text>
          <Text style={ss.hint}>City tax, resort fee — auto-applied to every stay.</Text>
          {surcharges.map(s => <ToggleRow key={s.id} name={s.name} meta={s.valueType === 'FIXED' ? `₹${s.value}/night` : `${s.value}%`} active={s.active} onToggle={() => toggleSurcharge(s)} />)}
          {surcharges.length === 0 && <Text style={ss.emptyTxt}>No surcharges yet.</Text>}
          <Input placeholder="Name (e.g. City Tax)" value={sForm.name} onChangeText={v => setSForm(f => ({ ...f, name: v }))} style={{ marginTop: 10 }} />
          <ChipRow options={[['FIXED', 'Fixed/night'], ['PERCENT', 'Percent']]} value={sForm.valueType} onChange={v => setSForm(f => ({ ...f, valueType: v }))} />
          <Input placeholder="Value" keyboardType="number-pad" value={sForm.value} onChangeText={v => setSForm(f => ({ ...f, value: v }))} />
          <Button title="Add Surcharge" size="sm" onPress={addSurcharge} />
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Text style={ss.cardTitle}>Discount packages</Text>
          {discounts.map(d => <ToggleRow key={d.id} name={d.name} meta={d.valueType === 'FIXED' ? `₹${d.value}` : `${d.value}%`} active={d.active} onToggle={() => toggleDiscount(d)} />)}
          {discounts.length === 0 && <Text style={ss.emptyTxt}>No discount packages yet.</Text>}
          <Input placeholder="Name (e.g. Early Bird 10%)" value={dForm.name} onChangeText={v => setDForm(f => ({ ...f, name: v }))} style={{ marginTop: 10 }} />
          <ChipRow options={[['PERCENT', 'Percent'], ['FIXED', 'Fixed']]} value={dForm.valueType} onChange={v => setDForm(f => ({ ...f, valueType: v }))} />
          <Input placeholder="Value" keyboardType="number-pad" value={dForm.value} onChangeText={v => setDForm(f => ({ ...f, value: v }))} />
          <Button title="Add Discount" size="sm" onPress={addDiscount} />
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Text style={ss.cardTitle}>Add-on catalog</Text>
          {addOns.map(a => <ToggleRow key={a.id} name={a.name} meta={`₹${Number(a.price).toLocaleString('en-IN')}`} active={a.active} onToggle={() => toggleAddOn(a)} />)}
          {addOns.length === 0 && <Text style={ss.emptyTxt}>No add-ons yet.</Text>}
          <Input placeholder="Name (e.g. Airport Pickup)" value={aForm.name} onChangeText={v => setAForm(f => ({ ...f, name: v }))} style={{ marginTop: 10 }} />
          <Input placeholder="Description" value={aForm.description} onChangeText={v => setAForm(f => ({ ...f, description: v }))} />
          <Input placeholder="Price" keyboardType="number-pad" value={aForm.price} onChangeText={v => setAForm(f => ({ ...f, price: v }))} />
          <Button title="Add Item" size="sm" onPress={addAddOn} />
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Text style={ss.cardTitle}>Vouchers</Text>
          <Text style={ss.hint}>Prepaid gift cards — redeemable as a folio payment method.</Text>
          {vouchers.map(v => (
            <View key={v.id} style={ss.row}>
              <Text style={ss.rowLabel}>{v.code}</Text>
              <Text style={ss.rowMeta}>₹{Number(v.balance).toLocaleString('en-IN')} / ₹{Number(v.initialValue).toLocaleString('en-IN')}</Text>
            </View>
          ))}
          {vouchers.length === 0 && <Text style={ss.emptyTxt}>No vouchers issued yet.</Text>}
          <Input placeholder="Code (e.g. WELCOME500)" value={vForm.code} onChangeText={v => setVForm(f => ({ ...f, code: v }))} style={{ marginTop: 10 }} />
          <Input placeholder="Value" keyboardType="number-pad" value={vForm.initialValue} onChangeText={v => setVForm(f => ({ ...f, initialValue: v }))} />
          <Button title="Issue Voucher" size="sm" onPress={issueVoucher} />
        </Card>

        {loyalty && (
          <Card>
            <Text style={ss.cardTitle}>Loyalty program</Text>
            <Text style={ss.hint}>Guests earn points on checkout, redeemable as a folio payment method.</Text>
            <Input label="Earn rate (% of room revenue)" keyboardType="decimal-pad" value={String(loyalty.earnRatePercent)} onChangeText={v => setLoyalty(l => ({ ...l, earnRatePercent: v }))} />
            <Input label="1 point = ₹" keyboardType="decimal-pad" value={String(loyalty.redemptionValue)} onChangeText={v => setLoyalty(l => ({ ...l, redemptionValue: v }))} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={ss.rowLabel}>Active</Text>
              <Switch value={!!loyalty.active} onValueChange={v => setLoyalty(l => ({ ...l, active: v }))} trackColor={{ true: Colors.primary }} />
            </View>
            <Button title={savingLoyalty ? 'Saving…' : 'Save'} loading={savingLoyalty} onPress={saveLoyalty} />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function ToggleRow({ name, meta, active, onToggle }) {
  return (
    <View style={ss.row}>
      <View style={{ flex: 1 }}>
        <Text style={ss.rowLabel}>{name}</Text>
        <Text style={ss.rowMeta}>{meta}</Text>
      </View>
      <TouchableOpacity onPress={onToggle} style={[ss.statusChip, { backgroundColor: active ? Colors.primaryLight : Colors.gray100 }]}>
        <Text style={[ss.statusTxt, { color: active ? Colors.primary : Colors.gray600 }]}>{active ? 'Active' : 'Paused'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ChipRow({ options, value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
      {options.map(([v, label]) => (
        <TouchableOpacity key={v} onPress={() => onChange(v)} style={[ss.chip, value === v && ss.chipActive]}>
          <Text style={[ss.chipTxt, value === v && ss.chipTxtActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const ss = StyleSheet.create({
  cardTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 4 },
  hint: { fontSize: FontSize.xs, color: Colors.gray400, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  rowLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  rowMeta: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  statusChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.full },
  statusTxt: { fontSize: FontSize.xs, fontWeight: '700' },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  chipActive: { backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipTxtActive: { color: Colors.primary },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 8 },
});
