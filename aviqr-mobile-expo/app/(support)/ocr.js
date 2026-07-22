import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { ocrApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const STATUS_CFG = {
  COMPLETED:  { color: '#059669', bg: '#DCFCE7', label: 'Completed' },
  FAILED:     { color: '#DC2626', bg: '#FEE2E2', label: 'Failed' },
  PROCESSING: { color: '#2563EB', bg: '#DBEAFE', label: 'Processing' },
  PENDING:    { color: '#2563EB', bg: '#DBEAFE', label: 'Pending' },
};

export default function SupportOcrScreen() {
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRef]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ocrApi.listAllJobs({ size: 50 });
      const d = res.data.data;
      setJobs(Array.isArray(d) ? d : d?.content || []);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const failedCount = jobs.filter(j => j.status === 'FAILED').length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`OCR Jobs · ${jobs.length}`} />
      {offline && <OfflineBadge onRetry={load} />}
      {failedCount > 0 && (
        <View style={ss.alert}><Text style={ss.alertTxt}>⚠ {failedCount} OCR job{failedCount > 1 ? 's' : ''} failed. Shop owners may need assistance uploading their menu.</Text></View>
      )}
      <FlatList
        data={jobs}
        keyExtractor={j => j.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="📷" title="No OCR jobs yet" />}
        renderItem={({ item }) => {
          const cfg = STATUS_CFG[item.status] || STATUS_CFG.PENDING;
          return (
            <View style={ss.card}>
              <View style={{ flex: 1 }}>
                <Text style={ss.shop}>{item.shopId?.slice(0, 10)}…</Text>
                <Text style={ss.file}>{item.fileType}</Text>
                <Text style={ss.detail}>
                  {item.status === 'COMPLETED' ? `${item.extractedItems?.length || 0} items extracted`
                    : item.status === 'PROCESSING' ? 'Processing…'
                    : item.status === 'FAILED' ? (item.errorMessage || 'Extraction failed')
                    : 'Pending'}
                </Text>
                <Text style={ss.time}>{item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : '—'}</Text>
              </View>
              <View style={[ss.badge, { backgroundColor: cfg.bg }]}><Text style={[ss.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text></View>
            </View>
          );
        }}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  alert: { backgroundColor: '#FEF3C7', margin: Spacing.base, marginBottom: 0, padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: '#FCD34D' },
  alertTxt: { fontSize: FontSize.xs, color: '#92400E', fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  shop: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray700, fontFamily: 'monospace' },
  file: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  detail: { fontSize: FontSize.xs, color: Colors.gray600, marginTop: 4 },
  time: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
});
