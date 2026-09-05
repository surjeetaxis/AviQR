import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { hotelApi, reviewApi } from '../../../src/api/index.js';
import { PageHeader } from '../../../src/components/common/PageHeader.js';
import { Card } from '../../../src/components/common/Card.js';
import { Colors, FontSize, Spacing } from '../../../src/theme/index.js';

const stars = (n) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);

export default function ReviewsScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (hId) => {
    const [sRes, rRes] = await Promise.allSettled([
      reviewApi.getHotelSummary(hId), reviewApi.getHotelReviews(hId, { size: 50 }),
    ]);
    if (sRes.status === 'fulfilled') setSummary(sRes.value.data.data);
    if (rRes.status === 'fulfilled') setReviews(rRes.value.data.data?.content || []);
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

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Guest Reviews" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Guest Reviews" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.sub}>Post-stay feedback guests submit from the review-invite link sent after checkout.</Text>

        {summary && (
          <Card style={{ marginBottom: 16, alignItems: 'center', paddingVertical: 20 }}>
            <Text style={ss.avgValue}>{Number(summary.averageRating || 0).toFixed(1)}</Text>
            <Text style={ss.avgStars}>{stars(Math.round(summary.averageRating || 0))}</Text>
            <Text style={ss.avgCount}>{summary.ratingCount} review{summary.ratingCount === 1 ? '' : 's'}</Text>
          </Card>
        )}

        <Text style={ss.cardTitle}>All reviews</Text>
        {reviews.map(r => (
          <Card key={r.id} style={{ marginBottom: 10 }}>
            <View style={ss.row}>
              <Text style={ss.rowLabel}>{r.customerName || 'Guest'}</Text>
              <Text style={ss.stars}>{stars(r.rating)}</Text>
            </View>
            {r.comment ? <Text style={ss.comment}>{r.comment}</Text> : null}
            <Text style={ss.date}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : ''}</Text>
          </Card>
        ))}
        {reviews.length === 0 && <Text style={ss.emptyTxt}>No reviews yet.</Text>}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  sub: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 14 },
  cardTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 10 },
  avgValue: { fontSize: 40, fontWeight: '800', color: Colors.gray900 },
  avgStars: { fontSize: FontSize.lg, color: '#F5A623', marginTop: 4 },
  avgCount: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  stars: { fontSize: FontSize.sm, color: '#F5A623' },
  comment: { fontSize: FontSize.sm, color: Colors.gray700, marginTop: 8 },
  date: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 8 },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 20 },
});
