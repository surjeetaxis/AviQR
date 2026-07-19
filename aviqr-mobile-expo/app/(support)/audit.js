import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { auditApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const LEVELS = ['all', 'info', 'warn', 'error'];
const LEVEL_COLOR = { info: '#2563EB', warn: '#D97706', error: '#DC2626' };

function auditLevel(log) {
  const a = (log.action || '').toUpperCase();
  if (a.includes('DELETE')) return 'error';
  if (a.includes('STATUS') || a.includes('ROLE') || a.includes('SUSPEND')) return 'warn';
  return 'info';
}

export default function SupportAuditScreen() {
  const [logs, setLogs]       = useState([]);
  const [level, setLevel]     = useState('all');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRef]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditApi.list({ size: 50 });
      const d = res.data.data;
      setLogs(Array.isArray(d) ? d : d?.content || []);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = level === 'all' ? logs : logs.filter(l => auditLevel(l) === level);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Audit Logs" />
      {offline && <OfflineBadge onRetry={load} />}
      <View style={ss.chipRow}>
        {LEVELS.map(l => (
          <TouchableOpacity key={l} style={[ss.chip, level === l && ss.chipActive]} onPress={() => setLevel(l)}>
            <Text style={[ss.chipTxt, level === l && ss.chipActiveTxt]}>{l.charAt(0).toUpperCase() + l.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={l => l.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="📋" title="No logs for this level" />}
        renderItem={({ item }) => (
          <View style={ss.card}>
            <View style={[ss.dot, { backgroundColor: LEVEL_COLOR[auditLevel(item)] }]} />
            <View style={{ flex: 1 }}>
              <Text style={ss.action}>{item.description || item.action}</Text>
              <View style={ss.metaRow}>
                <Text style={ss.actor}>{item.actorId?.slice(0, 12)}…</Text>
                <Text style={ss.time}>{item.timestamp ? new Date(item.timestamp).toLocaleString('en-IN') : '—'}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.base, paddingVertical: 10 },
  chip: { height: 30, paddingHorizontal: 14, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center' },
  chipActive: { backgroundColor: Colors.gray900, borderColor: Colors.gray900 },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipActiveTxt: { color: Colors.white },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 10, ...Shadow.sm },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  action: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  actor: { fontSize: 11, color: Colors.gray400, fontFamily: 'monospace' },
  time: { fontSize: 11, color: Colors.gray400 },
});
