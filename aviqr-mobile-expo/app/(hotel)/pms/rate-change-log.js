import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { hotelApi, pmsApi } from '../../../src/api/index.js';
import { PageHeader } from '../../../src/components/common/PageHeader.js';
import { Card } from '../../../src/components/common/Card.js';
import { Button } from '../../../src/components/common/Button.js';
import { Colors, FontSize, Spacing, Radius } from '../../../src/theme/index.js';

const FIELD_LABELS = {
  price: 'Price', minStay: 'Min stay', maxStay: 'Max stay',
  closedToArrival: 'Closed to arrival', closedToDeparture: 'Closed to departure',
  stopSell: 'Stop sell', allotment: 'Allotment',
};

export default function RateChangeLogScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [roomTypeFilter, setRoomTypeFilter] = useState(null); // null = All
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPage = useCallback(async (hId, roomTypeId, pageNum) => {
    const params = { page: pageNum, size: 30, ...(roomTypeId ? { roomTypeId } : {}) };
    const res = await pmsApi.rateChangeLogs(hId, params);
    const data = res.data.data || {};
    const content = data.content || [];
    setHasMore(pageNum + 1 < (data.totalPages || 0));
    setLogs(prev => pageNum === 0 ? content : [...prev, ...content]);
    setPage(pageNum);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hRes = await hotelApi.getMyHotels();
        const hotel = (hRes.data.data || [])[0];
        if (!hotel) return;
        setHotelId(hotel.id);
        const rtRes = await pmsApi.listRoomTypes(hotel.id);
        setRoomTypes(rtRes.data.data || []);
        await loadPage(hotel.id, null, 0);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [loadPage]);

  const selectFilter = async (roomTypeId) => {
    setRoomTypeFilter(roomTypeId);
    setLoading(true);
    try { await loadPage(hotelId, roomTypeId, 0); } catch {}
    finally { setLoading(false); }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try { await loadPage(hotelId, roomTypeFilter, page + 1); } catch {}
    finally { setLoadingMore(false); }
  };

  const roomTypeName = (id) => roomTypes.find(rt => rt.id === id)?.name || '';

  const describe = (log) => {
    const label = FIELD_LABELS[log.field] || log.field;
    if (log.oldValue == null || log.oldValue === '') return `${label} set to ${log.newValue}`;
    return `${label}: ${log.oldValue} → ${log.newValue}`;
  };

  if (loading && page === 0) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Rate & Inventory Log" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Rate & Inventory Log" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.sub}>Every price, restriction, and allotment change, most recent first.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity onPress={() => selectFilter(null)} style={[ss.chip, roomTypeFilter === null && ss.chipActive]}>
              <Text style={[ss.chipTxt, roomTypeFilter === null && ss.chipTxtActive]}>All room types</Text>
            </TouchableOpacity>
            {roomTypes.map(rt => (
              <TouchableOpacity key={rt.id} onPress={() => selectFilter(rt.id)} style={[ss.chip, roomTypeFilter === rt.id && ss.chipActive]}>
                <Text style={[ss.chipTxt, roomTypeFilter === rt.id && ss.chipTxtActive]}>{rt.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Card>
          {logs.map(log => (
            <View key={log.id} style={ss.row}>
              <View style={{ flex: 1 }}>
                <Text style={ss.rowLabel}>{describe(log)}</Text>
                <Text style={ss.rowMeta}>{log.date}{roomTypeName(log.roomTypeId) ? ` · ${roomTypeName(log.roomTypeId)}` : ''}</Text>
              </View>
              <Text style={ss.rowTime}>{log.changedAt ? new Date(log.changedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</Text>
            </View>
          ))}
          {logs.length === 0 && <Text style={ss.emptyTxt}>No changes logged yet.</Text>}
        </Card>

        {hasMore && <Button title={loadingMore ? 'Loading…' : 'Load more'} variant="outline" loading={loadingMore} onPress={loadMore} style={{ marginTop: 12 }} />}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  sub: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 12 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  chipActive: { backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipTxtActive: { color: Colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border, gap: 8 },
  rowLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  rowMeta: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  rowTime: { fontSize: 10, color: Colors.gray400 },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 12 },
});
