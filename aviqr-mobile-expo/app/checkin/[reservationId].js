import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';
import { pmsApi } from '../../src/api/index.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

const ID_PROOF_TYPES = ['AADHAAR', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID'];

// Public, guest-facing — no AviQR login. The guest authenticates with the
// phone number on file for the booking (matches ContactlessCheckinController
// on the backend, same as the web version at /pms/contactless-checkin/:id).
export default function ContactlessCheckinScreen() {
  const { reservationId } = useLocalSearchParams();
  const [phone, setPhone] = useState('');
  const [reservation, setReservation] = useState(null);
  const [form, setForm] = useState({ idProofType: 'AADHAAR', idProofNumber: '', address: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const sigRef = useRef(null);

  const lookup = async () => {
    if (!phone.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await pmsApi.publicReservationSummary(reservationId, phone);
      setReservation(res.data.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not find this booking. Check the phone number and try again.');
    } finally { setLoading(false); }
  };

  const submit = async () => {
    if (sigRef.current?.isEmpty()) { setError('Please sign the registration card before continuing.'); return; }
    setLoading(true); setError(null);
    try {
      const signatureData = sigRef.current?.toDataURL();
      await pmsApi.publicContactlessCheckIn(reservationId, { phone, ...form, signatureData });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not complete pre-check-in. Please try again or see the front desk.');
    } finally { setLoading(false); }
  };

  if (done) {
    return (
      <View style={ss.page}>
        <View style={ss.center}>
          <Text style={{ fontSize: 56 }}>✅</Text>
          <Text style={ss.doneTitle}>You're all set!</Text>
          <Text style={ss.doneSub}>Your signed registration card is on file. Just collect your room key at the front desk on arrival.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={ss.page}>
      <ScrollView>
        <LinearGradient colors={['#1D9E75', '#178A65']} style={ss.header}>
          <Text style={{ fontSize: 24 }}>🛡️</Text>
          <Text style={ss.headerTitle}>Contactless Check-in</Text>
          <Text style={ss.headerSub}>Verify your booking to check in before you arrive.</Text>
        </LinearGradient>

        <View style={ss.body}>
          {error && <View style={ss.errorBox}><Text style={ss.errorTxt}>⚠ {error}</Text></View>}

          {!reservation ? (
            <View style={{ gap: 12 }}>
              <Text style={ss.label}>Phone number used for this booking</Text>
              <TextInput style={ss.input} placeholder="e.g. 9876543210" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
              <TouchableOpacity style={ss.primaryBtn} onPress={lookup} disabled={loading}>
                <Text style={ss.primaryBtnTxt}>{loading ? 'Searching…' : 'Find my booking'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={ss.card}>
                <Text style={ss.guestName}>{reservation.guestName}</Text>
                <Text style={ss.guestDates}>{reservation.checkInDate} → {reservation.checkOutDate}</Text>
              </View>
              {reservation.preCheckedIn ? (
                <View style={ss.card}>
                  <Text style={{ fontSize: 20 }}>✅</Text>
                  <Text style={{ marginTop: 8 }}>You've already completed pre-check-in for this stay.</Text>
                </View>
              ) : (
                <View style={{ gap: 12, marginTop: 14 }}>
                  <Text style={ss.label}>ID proof type</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {ID_PROOF_TYPES.map(t => (
                      <TouchableOpacity key={t} onPress={() => setForm(f => ({ ...f, idProofType: t }))} style={[ss.chip, form.idProofType === t && ss.chipActive]}>
                        <Text style={[ss.chipTxt, form.idProofType === t && ss.chipTxtActive]}>{t.replace('_', ' ')}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={ss.label}>ID proof number</Text>
                  <TextInput style={ss.input} value={form.idProofNumber} onChangeText={v => setForm(f => ({ ...f, idProofNumber: v }))} />
                  <Text style={ss.label}>Address</Text>
                  <TextInput style={ss.input} value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} />
                  <Text style={ss.label}>Sign below — this is your registration card</Text>
                  <SignaturePad ref={sigRef} />
                  <TouchableOpacity style={ss.primaryBtn} onPress={submit} disabled={loading}>
                    <Text style={ss.primaryBtnTxt}>{loading ? 'Submitting…' : 'Complete pre-check-in'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Cross-platform base64 encoder (no Buffer/btoa dependency — Hermes on native
// doesn't provide either globally) so the signature can be sent as a real
// data:image/svg+xml;base64 URI the same way web's canvas produces a
// data:image/png one — the staff-side registration card viewer (an <img>
// tag) renders either format identically.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function utf8ToBase64(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i], b2 = bytes[i + 1], b3 = bytes[i + 2];
    out += B64[b1 >> 2];
    out += B64[((b1 & 3) << 4) | (b2 === undefined ? 0 : b2 >> 4)];
    out += b2 === undefined ? '=' : B64[((b2 & 15) << 2) | (b3 === undefined ? 0 : b3 >> 6)];
    out += b3 === undefined ? '=' : B64[b3 & 63];
  }
  return out;
}

// Freehand SVG signature capture — direct mouse/touch handlers (not
// PanResponder, which doesn't reliably populate locationX/locationY for
// mouse-originated events under react-native-web) collect stroke points into
// SVG path strings, then toDataURL() serializes them into a standalone SVG
// document and base64s it.
//
// The single <Path> below is updated by reaching into its DOM node directly
// rather than via the declarative `d` prop: this react-native-svg + web build
// never applies an updated (or even initial) `d` prop to the underlying DOM
// attribute, though stroke/strokeWidth/fill from the same component do apply.
// `setNativeProps` — the usual RN escape hatch for this — is also a no-op
// here (Path's class-component instance has no working implementation on
// web). What does work: the Path instance exposes `elementRef.current`,
// which is the real DOM <path> node, so we call `setAttribute('d', ...)` on
// it directly — confirmed this applies and paints instantly.
const SignaturePad = forwardRef(function SignaturePad(_props, ref) {
  const [size, setSize] = useState({ w: 300, h: 140 });
  const points = useRef([]);
  const strokes = useRef([]); // committed stroke path strings
  const drawing = useRef(false);
  const pathRef = useRef(null);

  const applyD = () => {
    const d = [...strokes.current, points.current.join(' ')].filter(Boolean).join(' ');
    const node = pathRef.current?.elementRef?.current;
    if (node?.setAttribute) node.setAttribute('d', d);
    else pathRef.current?.setNativeProps?.({ d });
  };

  useImperativeHandle(ref, () => ({
    isEmpty: () => strokes.current.length === 0,
    clear: () => { strokes.current = []; points.current = []; applyD(); },
    toDataURL: () => {
      const body = `<path d="${strokes.current.join(' ')}" stroke="#111827" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}" viewBox="0 0 ${size.w} ${size.h}"><rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`;
      return `data:image/svg+xml;base64,${utf8ToBase64(svg)}`;
    },
  }), [size]);

  const xyFromMouse = (e) => ({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
  const xyFromTouch = (e) => {
    const t = e.nativeEvent.touches[0];
    return { x: t.locationX, y: t.locationY };
  };

  const start = (xy) => {
    drawing.current = true;
    points.current = [`M${xy.x.toFixed(1)} ${xy.y.toFixed(1)}`];
    applyD();
  };
  const move = (xy) => {
    if (!drawing.current) return;
    points.current.push(`L${xy.x.toFixed(1)} ${xy.y.toFixed(1)}`);
    applyD();
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (points.current.length > 1) strokes.current.push(points.current.join(' '));
    points.current = [];
    applyD();
  };

  return (
    <View>
      <View
        onLayout={e => setSize({ w: Math.round(e.nativeEvent.layout.width), h: 140 })}
        style={ss.sigBox}
        onMouseDown={e => start(xyFromMouse(e))}
        onMouseMove={e => move(xyFromMouse(e))}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={e => start(xyFromTouch(e))}
        onTouchMove={e => move(xyFromTouch(e))}
        onTouchEnd={end}
      >
        <Svg width="100%" height="100%">
          <Rect x="0" y="0" width="100%" height="100%" fill="#ffffff" />
          <Path ref={pathRef} d="" stroke="#111827" strokeWidth={2} fill="none" strokeLinecap="round" />
        </Svg>
      </View>
      <TouchableOpacity onPress={() => { strokes.current = []; points.current = []; applyD(); }}>
        <Text style={ss.clearTxt}>↺ Clear signature</Text>
      </TouchableOpacity>
    </View>
  );
});

const ss = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  doneTitle: { fontSize: FontSize.xl, fontWeight: '800', marginTop: 16, marginBottom: 6 },
  doneSub: { fontSize: FontSize.sm, color: Colors.gray500, textAlign: 'center' },
  header: { padding: 24, paddingTop: 52 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white, marginTop: 8 },
  headerSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  body: { padding: Spacing.base, paddingBottom: 40 },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray500 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, height: 46, fontSize: FontSize.base, backgroundColor: Colors.white },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, height: 50, alignItems: 'center', justifyContent: 'center' },
  primaryBtnTxt: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 12 },
  guestName: { fontSize: FontSize.lg, fontWeight: '800' },
  guestDates: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: 4 },
  errorBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: Radius.md, padding: 12, marginBottom: 14 },
  errorTxt: { color: '#B91C1C', fontSize: FontSize.sm },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  chipActive: { backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipTxtActive: { color: Colors.primary },
  sigBox: { width: '100%', height: 140, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.white, overflow: 'hidden' },
  clearTxt: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 6 },
});
