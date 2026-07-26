import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { billApi, paymentApi } from '../../../../src/api/index.js';
import { useAuth } from '../../../../src/context/AuthContext.js';
import { PageHeader } from '../../../../src/components/common/PageHeader.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../../../src/theme/index.js';

// Razorpay's hosted Standard Checkout, driven from inside a WebView — avoids needing the
// native react-native-razorpay SDK (which requires a dev-client/EAS build and isn't
// compatible with Expo Go). The page posts the checkout result back via
// window.ReactNativeWebView.postMessage, which onWebViewMessage below picks up.
function buildCheckoutHtml({ key, amountPaise, currency, razorpayOrderId, name, contact }) {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:0;background:#fff;">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function post(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
    try {
      var rzp = new Razorpay({
        key: ${JSON.stringify(key)},
        amount: ${amountPaise},
        currency: ${JSON.stringify(currency)},
        order_id: ${JSON.stringify(razorpayOrderId)},
        name: "AviQR",
        description: "Table Bill Payment",
        prefill: { name: ${JSON.stringify(name || '')}, contact: ${JSON.stringify(contact || '')} },
        theme: { color: "#1D9E75" },
        handler: function (response) {
          post({ type: 'success', razorpayPaymentId: response.razorpay_payment_id, razorpayOrderId: response.razorpay_order_id, razorpaySignature: response.razorpay_signature });
        },
        modal: { ondismiss: function () { post({ type: 'dismiss' }); } }
      });
      rzp.on('payment.failed', function (response) { post({ type: 'failed', error: response.error && response.error.description }); });
      rzp.open();
    } catch (e) { post({ type: 'error', error: String(e) }); }
  </script>
  </body></html>`;
}

export default function TableBillScreen() {
  const { tableNumber, shopId } = useLocalSearchParams();
  const { user } = useAuth();

  const [bill, setBill]         = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [paidBill, setPaidBill] = useState(null); // final settled bill — shown as a receipt
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [requesting, setRequesting] = useState(false);
  const [paying, setPaying]         = useState(false);
  const [checkoutHtml, setCheckoutHtml] = useState(null); // non-null while the pay modal is open
  const lastBillId = useRef(null);

  const load = useCallback(() => {
    return billApi.getCurrent(shopId, tableNumber)
      .then(res => {
        setBill(res.data.data);
        lastBillId.current = res.data.data.id;
        setNotFound(false);
        setError('');
      })
      .catch(async (e) => {
        if (e.response?.status !== 404) { setError('Could not load the bill.'); return; }
        setNotFound(true);
        setBill(null);
        // A bill that just disappeared from "current" was paid/settled — fetch its final
        // state once so the customer sees a receipt instead of a blank "no bill" screen.
        if (lastBillId.current && !paidBill) {
          try {
            const r = await billApi.getById(lastBillId.current);
            if (r.data.data.status === 'PAID') setPaidBill(r.data.data);
          } catch { /* ignore — falls back to "no bill yet" */ }
        }
      })
      .finally(() => setLoading(false));
  }, [shopId, tableNumber, paidBill]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  const requestBill = async () => {
    setRequesting(true);
    try {
      const res = await billApi.generate(shopId, tableNumber);
      setBill(res.data.data);
      lastBillId.current = res.data.data.id;
      setNotFound(false);
    } catch (e) {
      Alert.alert('Could not request bill', e.response?.data?.message || 'Please ask staff for help.');
    } finally { setRequesting(false); }
  };

  const startPayment = async () => {
    if (!bill) return;
    setPaying(true);
    try {
      const res = await paymentApi.createOrder({
        orderId: bill.id,
        targetType: 'BILL',
        amount: bill.totalAmount,
        currency: 'INR',
        shopId: bill.shopId,
        customerId: user?.id,
      });
      const { razorpayOrderId, amount, currency, key } = res.data.data;
      setCheckoutHtml(buildCheckoutHtml({
        key, amountPaise: amount, currency, razorpayOrderId,
        name: user?.name, contact: user?.phone,
      }));
    } catch (e) {
      Alert.alert('Could not start payment', e.response?.data?.message || 'Please try again.');
    } finally { setPaying(false); }
  };

  const onWebViewMessage = async (event) => {
    let msg;
    try { msg = JSON.parse(event.nativeEvent.data); } catch { return; }
    if (msg.type === 'success') {
      setCheckoutHtml(null);
      try {
        const res = await paymentApi.verify({
          razorpayOrderId: msg.razorpayOrderId,
          razorpayPaymentId: msg.razorpayPaymentId,
          razorpaySignature: msg.razorpaySignature,
          orderId: bill.id,
        });
        if (res.data.data?.verified) { Alert.alert('Payment successful', 'Your bill has been paid.'); load(); }
        else Alert.alert('Payment could not be verified', 'Please contact staff if you were charged.');
      } catch {
        Alert.alert('Payment could not be verified', 'Please contact staff if you were charged.');
      }
    } else if (msg.type === 'dismiss') {
      setCheckoutHtml(null);
    } else if (msg.type === 'failed' || msg.type === 'error') {
      setCheckoutHtml(null);
      Alert.alert('Payment failed', msg.error || 'Please try again.');
    }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Table ${tableNumber} Bill`} />
      <Text style={ss.center}>Loading bill…</Text>
    </View>
  );

  if (paidBill) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Table ${tableNumber} Bill`} />
      <ScrollView contentContainerStyle={{ padding: Spacing.base }}>
        <View style={[ss.card, { alignItems: 'center', paddingVertical: 28 }]}>
          <Text style={{ fontSize: 40 }}>✅</Text>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginTop: 8 }}>Bill Settled</Text>
          <Text style={{ fontSize: FontSize.sm, color: Colors.gray500, marginTop: 4 }}>
            ₹{parseFloat(paidBill.totalAmount).toFixed(0)} · {paidBill.paymentMethod === 'ONLINE' ? 'Paid online' : 'Paid at counter'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Table ${tableNumber} Bill`} />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        {error && <Text style={{ color: Colors.error, marginBottom: 12 }}>{error}</Text>}

        {!bill && notFound && (
          <View style={[ss.card, { alignItems: 'center', paddingVertical: 24 }]}>
            <Text style={{ fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 14, textAlign: 'center' }}>
              No bill has been generated for this table yet.
            </Text>
            <TouchableOpacity style={ss.payBtn} onPress={requestBill} disabled={requesting}>
              <Text style={ss.payBtnTxt}>{requesting ? 'Requesting…' : 'Request Bill'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {bill && (
          <>
            <Text style={ss.sectionTitle}>Items</Text>
            <View style={ss.card}>
              {bill.orders.flatMap(o => o.items || []).map((it, i) => (
                <View key={i} style={ss.itemRow}>
                  <View>
                    <Text style={ss.itemName}>{it.itemName}</Text>
                    <Text style={ss.itemMeta}>Qty {it.quantity} · ₹{it.unitPrice}</Text>
                  </View>
                  <Text style={ss.itemPrice}>₹{it.totalPrice}</Text>
                </View>
              ))}
            </View>

            <Text style={ss.sectionTitle}>Bill Summary</Text>
            <View style={ss.card}>
              <View style={ss.billRow}><Text style={ss.billLabel}>Subtotal</Text><Text style={ss.billVal}>₹{bill.subtotal}</Text></View>
              {parseFloat(bill.discount) > 0 && <View style={ss.billRow}><Text style={ss.billLabel}>Discount</Text><Text style={ss.billVal}>− ₹{bill.discount}</Text></View>}
              {parseFloat(bill.serviceCharge) > 0 && <View style={ss.billRow}><Text style={ss.billLabel}>Service Charge</Text><Text style={ss.billVal}>₹{bill.serviceCharge}</Text></View>}
              <View style={ss.billRow}><Text style={ss.billLabel}>Tax</Text><Text style={ss.billVal}>₹{bill.tax}</Text></View>
              <View style={[ss.billRow, ss.billTotal]}><Text style={ss.totalLabel}>Total</Text><Text style={ss.totalVal}>₹{bill.totalAmount}</Text></View>
            </View>

            <TouchableOpacity style={ss.payBtn} onPress={startPayment} disabled={paying}>
              <Text style={ss.payBtnTxt}>{paying ? 'Starting…' : `Pay ₹${parseFloat(bill.totalAmount).toFixed(0)} Now`}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal visible={!!checkoutHtml} animationType="slide" onRequestClose={() => setCheckoutHtml(null)}>
        <View style={{ flex: 1, paddingTop: 40 }}>
          <TouchableOpacity onPress={() => setCheckoutHtml(null)} style={ss.modalClose}>
            <Text style={{ fontSize: 16, color: Colors.gray700 }}>✕ Close</Text>
          </TouchableOpacity>
          {checkoutHtml && (
            <WebView
              originWhitelist={['*']}
              source={{ html: checkoutHtml }}
              onMessage={onWebViewMessage}
              startInLoadingState
              renderLoading={() => <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const ss = StyleSheet.create({
  center: { textAlign: 'center', color: Colors.gray400, paddingVertical: 40 },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700, marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, marginBottom: 8, ...Shadow.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray50 },
  itemName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900 },
  itemMeta: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  itemPrice: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  billLabel: { fontSize: FontSize.sm, color: Colors.gray600 },
  billVal: { fontSize: FontSize.sm, color: Colors.gray900 },
  billTotal: { borderTopWidth: 1, borderTopColor: Colors.gray100, marginTop: 6, paddingTop: 8 },
  totalLabel: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  totalVal: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  payBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  payBtnTxt: { color: Colors.white, fontSize: FontSize.base, fontWeight: '800' },
  modalClose: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingBottom: 10 },
});
