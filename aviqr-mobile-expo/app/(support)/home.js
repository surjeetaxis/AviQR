import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// Icon not needed — using emoji
// Toast replaced with Alert
import { supportApi } from '../../src/api/index.js';
import { useAuth } from '../../src/context/AuthContext.js';
// SearchBar replaced with TextInput
import { StatusBadge } from '../../src/components/common/StatusBadge.js';
// BottomSheet replaced with Modal
import { Button } from '../../src/components/common/Button.js';
import { Input } from '../../src/components/common/Input.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

const PRIORITY_COLOR = { LOW:'#6B7280', MEDIUM:'#2563EB', HIGH:'#D97706', URGENT:'#DC2626' };
const FILTERS = ['ALL','OPEN','PENDING','RESOLVED','CLOSED'];

export default function SupportHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats]     = useState({});
  const [filter, setFilter]   = useState('ALL');
  const [search, setSearch]   = useState('');
  const [selected, setSelected]= useState(null);
  const [resolution, setRes]  = useState('');
  const [refreshing, setRef]  = useState(false);
  const [updating, setUpdating]= useState(false);

  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.allSettled([
        supportApi.getTickets({ status: filter !== 'ALL' ? filter : undefined, size: 50 }),
        supportApi.getStats(),
      ]);
      if (t.status === 'fulfilled') setTickets(t.value.data.data?.content || []);
      if (s.status === 'fulfilled') setStats(s.value.data.data || {});
    } catch {}
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRef(true); await load(); setRef(false); };

  const updateStatus = async (ticket, newStatus) => {
    setUpdating(true);
    try {
      await supportApi.updateStatus(ticket.id, newStatus, newStatus === 'RESOLVED' ? resolution : undefined);
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: newStatus } : t));
      setSelected(null); setRes('');
      Toast.show({ type: 'success', text1: `Ticket ${newStatus.toLowerCase()}` });
    } catch { Toast.show({ type: 'error', text1: 'Failed to update' }); }
    finally { setUpdating(false); }
  };

  const filtered = tickets.filter(t => {
    if (search && !t.subject?.toLowerCase().includes(search.toLowerCase()) && !t.ticketNumber?.includes(search)) return false;
    return true;
  });

  const TicketCard = ({ ticket }) => (
    <TouchableOpacity style={[styles.card, ticket.priority === 'URGENT' && styles.urgentCard]} onPress={() => setSelected(ticket)} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <Text style={styles.ticketNum}>{ticket.ticketNumber}</Text>
        <StatusBadge status={ticket.status || 'OPEN'} />
      </View>
      <Text style={styles.subject} numberOfLines={2}>{ticket.subject}</Text>
      <View style={styles.cardMeta}>
        <Text style={styles.metaUser}>{ticket.userName} · {ticket.userRole}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: (PRIORITY_COLOR[ticket.priority] || Colors.gray400) + '18' }]}>
          <Text style={[styles.priorityText, { color: PRIORITY_COLOR[ticket.priority] || Colors.gray600 }]}>{ticket.priority}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient colors={['#0C4A6E','#0891B2']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerSub}>SUPPORT AGENT</Text>
            <Text style={styles.agentName}>{user?.name}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={{ padding: 8 }}>
            <Icon name="log-out" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          {[['OPEN','Open'],['PENDING','Pending'],['RESOLVED','Resolved']].map(([key,label]) => (
            <View key={key} style={styles.statItem}>
              <Text style={styles.statValue}>{stats[key.toLowerCase()] || 0}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.controls}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Ticket # or subject…" />
        <FlatList
          data={FILTERS}
          horizontal showsHorizontalScrollIndicator={false} keyExtractor={f => f}
          style={{ marginTop: 8 }}
          renderItem={({ item: f }) => (
            <TouchableOpacity style={[styles.chip, filter === f && styles.chipActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.chipText, filter === f && styles.chipActiveText]}>{f}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={t => t.id}
        renderItem={({ item }) => <TicketCard ticket={item} />}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.white} />}
        ListEmptyComponent={<EmptyState icon="🎫" title="No tickets" subtitle="All quiet on the support front!" />}
      />

      {/* Ticket action sheet */}
      <BottomSheet visible={!!selected} onClose={() => setSelected(null)} height={420}>
        {selected && (
          <View>
            <View style={styles.ticketDetail}>
              <Text style={styles.detailNum}>{selected.ticketNumber}</Text>
              <StatusBadge status={selected.status} />
            </View>
            <Text style={styles.detailSubject}>{selected.subject}</Text>
            <Text style={styles.detailDesc} numberOfLines={3}>{selected.description}</Text>
            <View style={styles.detailMeta}>
              <Text style={styles.detailUser}>👤 {selected.userName} ({selected.userRole})</Text>
              <View style={[styles.priorityBadge, { backgroundColor: (PRIORITY_COLOR[selected.priority] || Colors.gray400) + '18' }]}>
                <Text style={[styles.priorityText, { color: PRIORITY_COLOR[selected.priority] || Colors.gray600 }]}>{selected.priority}</Text>
              </View>
            </View>
            {selected.status !== 'RESOLVED' && selected.status !== 'CLOSED' && (
              <Input label="Resolution note" placeholder="Describe how you resolved this…" value={resolution} onChangeText={setRes} multiline style={{ marginTop: 12 }} />
            )}
            <View style={styles.actionRow}>
              {selected.status === 'OPEN' && (
                <Button title="Mark Pending" onPress={() => updateStatus(selected,'PENDING')} loading={updating} variant="outline" style={{ flex: 1 }} />
              )}
              {['OPEN','PENDING'].includes(selected.status) && (
                <Button title="✓ Resolve" onPress={() => updateStatus(selected,'RESOLVED')} loading={updating} style={{ flex: 1 }} />
              )}
              {['OPEN','PENDING','RESOLVED'].includes(selected.status) && (
                <Button title="Close" onPress={() => updateStatus(selected,'CLOSED')} loading={updating} variant="ghost" style={{ flex: 1 }} />
              )}
            </View>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header:       { paddingTop: 52, paddingHorizontal: Spacing.base, paddingBottom: 24 },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.base },
  headerSub:    { fontSize: FontSize.xs, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5 },
  agentName:    { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white, marginTop: 4 },
  statsRow:     { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.lg, padding: Spacing.md },
  statItem:     { flex: 1, alignItems: 'center' },
  statValue:    { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white },
  statLabel:    { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  controls:     { padding: Spacing.base, paddingBottom: 8 },
  chip:         { height: 30, paddingHorizontal: 12, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', marginRight: 6 },
  chipActive:   { backgroundColor: Colors.gray900, borderColor: Colors.gray900 },
  chipText:     { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipActiveText:{ color: Colors.white },
  card:         { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  urgentCard:   { borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketNum:    { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray500 },
  subject:      { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900, lineHeight: 20 },
  cardMeta:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaUser:     { fontSize: FontSize.xs, color: Colors.gray400 },
  priorityBadge:{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  priorityText: { fontSize: FontSize.xs, fontWeight: '700' },
  ticketDetail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  detailNum:    { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray500 },
  detailSubject:{ fontSize: FontSize.lg, fontWeight: '800', marginBottom: 6 },
  detailDesc:   { fontSize: FontSize.sm, color: Colors.gray600, lineHeight: 18, marginBottom: 8 },
  detailMeta:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailUser:   { fontSize: FontSize.sm, color: Colors.gray500 },
  actionRow:    { flexDirection: 'row', gap: 8, marginTop: 12 },
});