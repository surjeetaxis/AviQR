import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { reviewApi } from '../../src/api/index.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

// Public, guest-facing — no AviQR login. A guest reaches this from the
// post-checkout WhatsApp link pms-service's ReservationLifecycleScheduler
// sends (https://aviqr.com/review/:hotelId?reservationId=&guestName=);
// identity is proven by knowing the reservationId, same trust level as the
// existing public contactless check-in flow. One review per reservationId —
// the backend rejects a second submission for the same stay.
export default function HotelStayReviewScreen() {
  const { hotelId, reservationId, guestName: guestNameParam } = useLocalSearchParams();
  const [guestName, setGuestName] = useState(guestNameParam || '');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!guestName.trim()) return setError('Please enter your name.');
    if (rating < 1) return setError('Please pick a star rating.');
    setLoading(true); setError(null);
    try {
      await reviewApi.submitHotelStay({
        hotelId, reservationId, customerName: guestName, rating, comment,
      });
      setDone(true);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Could not submit your review. Please try again.';
      if (msg.toLowerCase().includes('already been reviewed')) setAlreadyReviewed(true);
      else setError(msg);
    } finally { setLoading(false); }
  };

  if (done) {
    return (
      <View style={ss.page}>
        <View style={ss.center}>
          <Text style={{ fontSize: 56 }}>🙏</Text>
          <Text style={ss.doneTitle}>Thanks for your feedback!</Text>
          <Text style={ss.doneSub}>Your review helps us — and other guests — a lot.</Text>
        </View>
      </View>
    );
  }

  if (alreadyReviewed) {
    return (
      <View style={ss.page}>
        <View style={ss.center}>
          <Text style={{ fontSize: 56 }}>✅</Text>
          <Text style={ss.doneTitle}>You've already reviewed this stay</Text>
          <Text style={ss.doneSub}>Thanks — we've already got your feedback on file.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={ss.page}>
      <ScrollView>
        <LinearGradient colors={['#1D9E75', '#178A65']} style={ss.header}>
          <Text style={{ fontSize: 24 }}>⭐</Text>
          <Text style={ss.headerTitle}>How was your stay?</Text>
          <Text style={ss.headerSub}>We'd love to hear about your experience.</Text>
        </LinearGradient>

        <View style={ss.body}>
          {error && <View style={ss.errorBox}><Text style={ss.errorTxt}>⚠ {error}</Text></View>}

          <Text style={ss.label}>Your name</Text>
          <TextInput style={ss.input} value={guestName} onChangeText={setGuestName} placeholder="Full name" />

          <Text style={ss.label}>Rating</Text>
          <View style={ss.starRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={8}>
                <Text style={[ss.star, n <= rating && ss.starFilled]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={ss.label}>Comments (optional)</Text>
          <TextInput
            style={[ss.input, ss.textarea]}
            value={comment}
            onChangeText={setComment}
            placeholder="Tell us what you liked, or what we could do better…"
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity style={ss.primaryBtn} onPress={submit} disabled={loading}>
            <Text style={ss.primaryBtnTxt}>{loading ? 'Submitting…' : 'Submit review'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  doneTitle: { fontSize: FontSize.xl, fontWeight: '800', marginTop: 16, marginBottom: 6, textAlign: 'center' },
  doneSub: { fontSize: FontSize.sm, color: Colors.gray500, textAlign: 'center' },
  header: { padding: 24, paddingTop: 52 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white, marginTop: 8 },
  headerSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  body: { padding: Spacing.base, paddingBottom: 40 },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray500, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, height: 46, fontSize: FontSize.base, backgroundColor: Colors.white },
  textarea: { height: 100, paddingTop: 12, textAlignVertical: 'top' },
  starRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  star: { fontSize: 36, color: Colors.gray300 },
  starFilled: { color: '#F5A623' },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  primaryBtnTxt: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
  errorBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: Radius.md, padding: 12, marginBottom: 14 },
  errorTxt: { color: '#B91C1C', fontSize: FontSize.sm },
});
