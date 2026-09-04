import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { hotelApi, maintenanceApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Card } from '../../src/components/common/Card.js';
import { Button } from '../../src/components/common/Button.js';
import { Input } from '../../src/components/common/Input.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

const STATUS_META = { OPEN: 'Open', IN_PROGRESS: 'In progress', DONE: 'Resolved' };

export default function MaintenanceScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ roomId: '', title: '', priority: 'NORMAL', notes: '' });
  const [saving, setSaving] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [assignee, setAssignee] = useState('');
  const [busy, setBusy] = useState({});

  const loadTasks = useCallback((hId) => {
    maintenanceApi.list(hId).then(res => setTasks(res.data.data || [])).catch(() => {});
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

  const raiseTask = async () => {
    if (!form.title.trim()) return Alert.alert('Title is required');
    setSaving(true);
    try {
      await maintenanceApi.raise(hotelId, form.roomId || null, form.title, form.notes, form.priority);
      setForm({ roomId: '', title: '', priority: 'NORMAL', notes: '' });
      setShowForm(false);
      loadTasks(hotelId);
    } catch { Alert.alert('Could not create work order'); }
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
    try { await maintenanceApi.assign(assigningId, assignee); setAssigningId(null); setAssignee(''); loadTasks(hotelId); }
    catch { Alert.alert('Could not assign'); }
    finally { setBusy(p => ({ ...p, [assigningId]: false })); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Maintenance" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Maintenance" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.sub}>Staff-assignable work orders.</Text>

        <Button title={showForm ? 'Cancel' : '+ Raise Work Order'} variant={showForm ? 'ghost' : 'primary'} onPress={() => setShowForm(s => !s)} style={{ marginBottom: 16 }} />

        {showForm && (
          <Card style={{ marginBottom: 16 }}>
            <Input label="Title *" placeholder="e.g. Lobby AC not cooling" value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} />
            <Text style={ss.fieldLabel}>Room (optional)</Text>
            <ChipRow options={[['', 'None'], ...rooms.map(r => [r.id, `Room ${r.number}`])]} value={form.roomId} onChange={v => setForm(f => ({ ...f, roomId: v }))} />
            <Text style={ss.fieldLabel}>Priority</Text>
            <ChipRow options={[['NORMAL', 'Normal'], ['HIGH', 'High'], ['URGENT', 'Urgent']]} value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} />
            <Input placeholder="Notes (optional)" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} />
            <Button title={saving ? 'Creating…' : 'Create Work Order'} loading={saving} onPress={raiseTask} />
          </Card>
        )}

        <Text style={ss.cardTitle}>Work orders ({tasks.length})</Text>
        {tasks.map(task => (
          <Card key={task.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={ss.taskTitle}>{task.title}</Text>
              <Text style={ss.statusTxt}>{STATUS_META[task.status] || task.status}</Text>
            </View>
            <Text style={ss.taskMeta}>{task.roomNumber ? `Room ${task.roomNumber} · ` : ''}{task.priority} · {task.assignedTo ? `Assigned to ${task.assignedTo}` : 'Unassigned'}</Text>
            <Text style={ss.taskMeta}>{new Date(task.createdAt).toLocaleString()}</Text>

            {assigningId === task.id ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'flex-end' }}>
                <Input placeholder="Assign to…" value={assignee} onChangeText={setAssignee} style={{ flex: 1, marginBottom: 0 }} />
                <Button title="Save" size="sm" loading={busy[task.id]} onPress={submitAssign} />
              </View>
            ) : (
              <View style={ss.actionsRow}>
                {task.status === 'OPEN' && (
                  <>
                    <TouchableOpacity onPress={() => { setAssigningId(task.id); setAssignee(''); }} style={ss.actionBtn}><Text style={ss.actionTxt}>Assign</Text></TouchableOpacity>
                    <TouchableOpacity disabled={busy[task.id]} onPress={() => act(maintenanceApi.start, task.id)} style={[ss.actionBtn, ss.primaryBtn]}><Text style={ss.primaryTxt}>Start</Text></TouchableOpacity>
                  </>
                )}
                {task.status === 'IN_PROGRESS' && (
                  <TouchableOpacity disabled={busy[task.id]} onPress={() => act(maintenanceApi.complete, task.id)} style={[ss.actionBtn, ss.primaryBtn]}><Text style={ss.primaryTxt}>Mark Done</Text></TouchableOpacity>
                )}
              </View>
            )}
          </Card>
        ))}
        {tasks.length === 0 && <Text style={ss.emptyTxt}>No work orders.</Text>}
      </ScrollView>
    </View>
  );
}

function ChipRow({ options, value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
      {options.map(([v, label]) => (
        <TouchableOpacity key={v || 'none'} onPress={() => onChange(v)} style={[ss.chip, value === v && ss.chipActive]}>
          <Text style={[ss.chipTxt, value === v && ss.chipTxtActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const ss = StyleSheet.create({
  sub: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 14 },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray500, marginBottom: 6 },
  cardTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 10 },
  taskTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray900, flex: 1, marginRight: 8 },
  taskMeta: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
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
