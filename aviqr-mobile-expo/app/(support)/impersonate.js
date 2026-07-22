import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { authApi, supportApi } from '../../src/api/index.js';
import { useAuth } from '../../src/context/AuthContext.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

export default function ImpersonateScreen() {
  const { user: agent } = useAuth();
  const [users, setUsers]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [reason, setReason]   = useState('');
  const [done, setDone]       = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    authApi.getUsers({ size: 100 }).then(res => {
      const d = res.data.data;
      const list = Array.isArray(d) ? d : d?.content || [];
      setUsers(list.filter(u => (u.role || '').toLowerCase() !== 'customer'));
    }).catch(() => {});
  }, []);

  const start = async () => {
    if (!selected || !reason.trim()) return;
    setSubmitting(true);
    try {
      await supportApi.impersonate({ agentName: agent?.name || '', targetUserId: selected.id, targetUserName: selected.name, reason: reason.trim() });
      setDone(true);
      setTimeout(() => { setDone(false); setSelected(null); setReason(''); }, 3000);
    } catch (e) {
      Alert.alert('Could not start impersonation session', e.response?.data?.message || 'Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Impersonation" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <View style={ss.warning}>
          <Text style={ss.warningIcon}>🛡️</Text>
          <Text style={ss.warningTxt}><Text style={{ fontWeight: '800' }}>Restricted feature.</Text> Impersonation is logged permanently in the audit trail with your name, the target user, reason, and timestamp. Only use this to reproduce and debug reported issues.</Text>
        </View>

        <Text style={ss.sectionTitle}>Select user to impersonate</Text>
        {users.map(u => (
          <TouchableOpacity key={u.id} style={[ss.userRow, selected?.id === u.id && ss.userRowActive]} onPress={() => setSelected(u)}>
            <View style={ss.avatar}><Text style={ss.avatarTxt}>{(u.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={ss.name}>{u.name}</Text>
              <Text style={ss.sub}>{u.email} · {(u.role || '').toLowerCase()}</Text>
            </View>
            {selected?.id === u.id && <Text style={{ color: Colors.primary, fontSize: 18 }}>✓</Text>}
          </TouchableOpacity>
        ))}

        {selected && (
          <View style={ss.formPanel}>
            <Text style={ss.sectionTitle}>Start session</Text>
            <View style={ss.targetCard}>
              <View style={[ss.avatar, { width: 48, height: 48, borderRadius: 24 }]}><Text style={ss.avatarTxt}>{(selected.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2)}</Text></View>
              <View>
                <Text style={ss.name}>{selected.name}</Text>
                <Text style={ss.sub}>{selected.email}</Text>
              </View>
            </View>
            <Input label="Reason for impersonation *" placeholder="e.g. Customer reported orders not showing on dashboard." value={reason} onChangeText={setReason} multiline style={{ minHeight: 80 }} />
            {done ? (
              <View style={ss.success}><Text style={ss.successTxt}>✓ Session started. This is logged in the audit trail.</Text></View>
            ) : (
              <Button title={submitting ? 'Starting…' : '🕵️ Start impersonation session'} onPress={start} loading={submitting} disabled={!reason.trim()} />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  warning: { flexDirection: 'row', gap: 10, backgroundColor: '#FEF3C7', borderRadius: Radius.md, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#FCD34D' },
  warningIcon: { fontSize: 20 },
  warningTxt: { flex: 1, fontSize: FontSize.xs, color: '#92400E', lineHeight: 18 },
  sectionTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent', ...Shadow.sm },
  userRowActive: { borderColor: Colors.primary },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: Colors.primaryDark, fontWeight: '700', fontSize: FontSize.xs },
  name: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 1 },
  formPanel: { marginTop: 20 },
  targetCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, marginBottom: 14, ...Shadow.sm },
  success: { backgroundColor: '#DCFCE7', borderRadius: Radius.md, padding: 14, alignItems: 'center' },
  successTxt: { color: '#059669', fontWeight: '700', fontSize: FontSize.sm },
});
