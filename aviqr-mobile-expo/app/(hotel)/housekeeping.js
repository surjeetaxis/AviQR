import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { hotelApi, housekeepingApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Card } from '../../src/components/common/Card.js';
import { Button } from '../../src/components/common/Button.js';
import { Input } from '../../src/components/common/Input.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

const STATUS_META = { PENDING: 'Pending', IN_PROGRESS: 'In progress', DONE: 'Cleaned', INSPECTED: 'Inspected' };
const ROOM_STATUS_META = [
  { key: 'vacant', icon: '✅', label: 'Vacant' },
  { key: 'occupied', icon: '🛏️', label: 'Occupied' },
  { key: 'cleaning', icon: '🔄', label: 'Cleaning' },
  { key: 'maintenance', icon: '🔧', label: 'Maintenance' },
];

export default function HousekeepingScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ roomId: '', priority: 'NORMAL', notes: '' });
  const [saving, setSaving] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [assignee, setAssignee] = useState('');
  const [busy, setBusy] = useState({});

  const loadTasks = useCallback((hId) => {
    housekeepingApi.list(hId).then(res => setTasks(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hRes = await hotelApi.getMyHotels();
        const hotel = (hRes.data.data || [])[0];
        if (!hotel) return;
        setHotelId(hotel.id);
        const rRes = await hotelApi.getRooms(hotel.id);
        setRooms(rRes.data.data || []);
        loadTasks(hotel.id);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [loadTasks]);

  const counts = rooms.reduce((acc, r) => { const k = (r.status || '').toLowerCase(); acc[k] = (acc[k] || 0) + 1; return acc; }, {});

  const raiseTask = async () => {
    if (!form.roomId) return Alert.alert('Pick a room');
    setSaving(true);
    try {
      await housekeepingApi.markDirty(form.roomId, form.priority, form.notes);
      setForm({ roomId: '', priority: 'NORMAL', notes: '' });
      setShowForm(false);
      loadTasks(hotelId);
    } catch { Alert.alert('Could not create task'); }
    finally { setSaving(false); }
  };

  const act = async (fn, id) => {
    setBusy(p => ({ ...p, [id]: true }));
    try { await fn(id); loadTasks(hotelId); }
    catch { Alert.alert('Action failed'); }
    finally { setBusy(p => ({ ...p, [id]: false })); }
  };

  const submitAssign = async () => {
    if (!assignee.trim()) return;
    setBusy(p => ({ ...p, [assigningId]: true }));
    try { await housekeepingApi.assign(assigningId, assignee); setAssigningId(null); setAssignee(''); loadTasks(hotelId); }
    catch { Alert.alert('Could not assign'); }
    finally { setBusy(p => ({ ...p, [assigningId]: false })); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Housekeeping" showBack={false} />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Housekeeping" showBack={false} />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <View style={ss.kpiGrid}>
          {ROOM_STATUS_META.map(m => (
            <View key={m.key} style={ss.kpi}>
              <Text style={{ fontSize: 22 }}>{m.icon}</Text>
              <Text style={ss.kpiValue}>{counts[m.key] || 0}</Text>
              <Text style={ss.kpiLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        <Button title={showForm ? 'Cancel' : '+ Flag Room Dirty'} variant={showForm ? 'ghost' : 'primary'} onPress={() => setShowForm(s => !s)} style={{ marginBottom: 16 }} />

        {showForm && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={ss.fieldLabel}>Room</Text>
            <ChipRow options={rooms.map(r => [r.id, `Room ${r.number}`])} value={form.roomId} onChange={v => setForm(f => ({ ...f, roomId: v }))} />
            <Text style={ss.fieldLabel}>Priority</Text>
            <ChipRow options={[['NORMAL', 'Normal'], ['HIGH', 'High'], ['URGENT', 'Urgent']]} value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} />
            <Input placeholder="Notes (optional)" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} />
            <Button title={saving ? 'Creating…' : 'Create Task'} loading={saving} onPress={raiseTask} />
          </Card>
        )}

        <Text style={ss.cardTitle}>Room-turnover tasks ({tasks.length})</Text>
        {tasks.map(task => (
          <Card key={task.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={ss.taskTitle}>Room {task.roomNumber} · {task.priority}</Text>
              <Text style={ss.statusTxt}>{STATUS_META[task.status] || task.status}</Text>
            </View>
            <Text style={ss.taskMeta}>{task.assignedTo ? `Assigned to ${task.assignedTo}` : 'Unassigned'} · {new Date(task.createdAt).toLocaleString()}</Text>

            {assigningId === task.id ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'flex-end' }}>
                <Input placeholder="Assign to…" value={assignee} onChangeText={setAssignee} style={{ flex: 1, marginBottom: 0 }} />
                <Button title="Save" size="sm" loading={busy[task.id]} onPress={submitAssign} />
              </View>
            ) : (
              <View style={ss.actionsRow}>
                {task.status === 'PENDING' && (
                  <>
                    <TouchableOpacity onPress={() => { setAssigningId(task.id); setAssignee(''); }} style={ss.actionBtn}><Text style={ss.actionTxt}>Assign</Text></TouchableOpacity>
                    <TouchableOpacity disabled={busy[task.id]} onPress={() => act(housekeepingApi.start, task.id)} style={[ss.actionBtn, ss.primaryBtn]}><Text style={ss.primaryTxt}>Start</Text></TouchableOpacity>
                  </>
                )}
                {task.status === 'IN_PROGRESS' && (
                  <TouchableOpacity disabled={busy[task.id]} onPress={() => act(housekeepingApi.complete, task.id)} style={[ss.actionBtn, ss.primaryBtn]}><Text style={ss.primaryTxt}>Mark Clean</Text></TouchableOpacity>
                )}
                {task.status === 'DONE' && (
                  <TouchableOpacity onPress={() => { setAssigningId(task.id); setAssignee(''); }} style={ss.actionBtn}><Text style={ss.actionTxt}>Inspect</Text></TouchableOpacity>
                )}
              </View>
            )}
          </Card>
        ))}
        {tasks.length === 0 && <Text style={ss.emptyTxt}>No housekeeping tasks.</Text>}
      </ScrollView>
    </View>
  );
}

function ChipRow({ options, value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
      {options.map(([v, label]) => (
        <TouchableOpacity key={v} onPress={() => onChange(v)} style={[ss.chip, value === v && ss.chipActive]}>
          <Text style={[ss.chipTxt, value === v && ss.chipTxtActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const ss = StyleSheet.create({
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  kpi: { width: '23%', backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 8, alignItems: 'center' },
  kpiValue: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginTop: 2 },
  kpiLabel: { fontSize: 10, color: Colors.gray500, marginTop: 2, textAlign: 'center' },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray500, marginBottom: 6 },
  cardTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 10 },
  taskTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray900 },
  taskMeta: { fontSize: FontSize.xs, color: Colors.gray500 },
  statusTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { backgroundColor: Colors.gray100, paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.md },
  actionTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700 },
  primaryBtn: { backgroundColor: Colors.primary },
  primaryTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.white },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  chipActive: { backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipTxtActive: { color: Colors.primary },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 12 },
});
