import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Linking, RefreshControl } from 'react-native';
import { qrApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const TYPE_COLOR = { TABLE: { bg: '#DBEAFE', color: '#1D4ED8' }, CATEGORY: { bg: '#FEF3C7', color: '#B45309' } };
const typeColor = t => TYPE_COLOR[t] || { bg: '#EDE9FE', color: '#6D28D9' };

export default function AdminQrCodesScreen() {
  const [codes, setCodes]     = useState([]);
  const [page, setPage]       = useState(0);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRef]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [toggling, setToggling] = useState({});

  const load = useCallback(async (pg = 0) => {
    setLoading(true);
    try {
      const res = await qrApi.listAll({ page: pg, size: 30 });
      const d = res.data.data;
      setCodes(Array.isArray(d) ? d : d?.content || []);
      setPage(pg);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(0); }, [load]);

  const toggle = async (qr) => {
    setToggling(p => ({ ...p, [qr.id]: true }));
    try {
      await qrApi.toggleActive(qr.id, !qr.active);
      setCodes(prev => prev.map(c => c.id === qr.id ? { ...c, active: !c.active } : c));
      setSelected(prev => prev && prev.id === qr.id ? { ...prev, active: !prev.active } : prev);
    } catch {}
    finally { setToggling(p => ({ ...p, [qr.id]: false })); }
  };

  const totalScans = codes.reduce((s, c) => s + (c.scanCount || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`QR Codes · ${codes.length}`} />
      {offline && <OfflineBadge onRetry={() => load(page)} />}
      <Text style={ss.subheading}>{totalScans.toLocaleString('en-IN')} total scans</Text>
      <FlatList
        data={codes}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(0); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="📱" title="No QR codes found" />}
        renderItem={({ item }) => {
          const tc = typeColor(item.type);
          return (
            <TouchableOpacity style={ss.card} onPress={() => setSelected(item)} activeOpacity={0.8}>
              <View style={{ flex: 1 }}>
                <Text style={ss.code}>{item.qrCode}</Text>
                <Text style={ss.sub}>{item.label || 'Untitled'} · {(item.scanCount || 0).toLocaleString('en-IN')} scans</Text>
                <View style={ss.metaRow}>
                  <View style={[ss.badge, { backgroundColor: tc.bg }]}><Text style={[ss.badgeTxt, { color: tc.color }]}>{item.type || 'SHOP'}</Text></View>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggle(item)} disabled={toggling[item.id]} style={[ss.statusBadge, { backgroundColor: item.active ? '#DCFCE7' : '#F3F4F6' }]}>
                <Text style={[ss.statusTxt, { color: item.active ? '#059669' : '#6B7280' }]}>{toggling[item.id] ? '…' : item.active ? '● Active' : '○ Inactive'}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
      <View style={ss.pager}>
        <TouchableOpacity disabled={page === 0} onPress={() => load(page - 1)} style={[ss.pageBtn, page === 0 && { opacity: 0.4 }]}><Text style={ss.pageBtnTxt}>‹ Prev</Text></TouchableOpacity>
        <Text style={ss.pageLabel}>Page {page + 1}</Text>
        <TouchableOpacity onPress={() => load(page + 1)} style={ss.pageBtn}><Text style={ss.pageBtnTxt}>Next ›</Text></TouchableOpacity>
      </View>

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)} height={480}>
        {selected && (
          <View style={{ alignItems: 'center' }}>
            <Text style={ss.sheetTitle}>{selected.label || 'QR Code'}</Text>
            <Image source={{ uri: qrApi.imageUrl(selected.qrCode) }} style={ss.qrImage} />
            <Text style={ss.targetUrl} numberOfLines={2}>{selected.targetUrl}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' }}>
              <TouchableOpacity style={ss.actionBtn} onPress={() => Linking.openURL(qrApi.imageUrl(selected.qrCode))}>
                <Text style={ss.actionTxt}>⬇ Download</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ss.actionBtn} onPress={() => Linking.openURL(selected.targetUrl)}>
                <Text style={ss.actionTxt}>↗ Open as customer</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => toggle(selected)} style={[ss.toggleBtn, { backgroundColor: selected.active ? '#FEE2E2' : '#DCFCE7' }]}>
              <Text style={{ color: selected.active ? '#DC2626' : '#059669', fontWeight: '700' }}>{selected.active ? 'Deactivate' : 'Activate'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const ss = StyleSheet.create({
  subheading: { fontSize: FontSize.xs, color: Colors.gray400, paddingHorizontal: Spacing.base, marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  code: { fontSize: FontSize.sm, fontWeight: '800', color: '#7C3AED' },
  sub: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  statusTxt: { fontSize: 11, fontWeight: '700' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  pageBtnTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700 },
  pageLabel: { fontSize: FontSize.xs, color: Colors.gray500 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 14 },
  qrImage: { width: 200, height: 200, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  targetUrl: { fontSize: 11, color: Colors.gray400, marginTop: 12, textAlign: 'center' },
  actionBtn: { flex: 1, backgroundColor: Colors.gray100, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  actionTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700 },
  toggleBtn: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 24, borderRadius: Radius.md },
});
