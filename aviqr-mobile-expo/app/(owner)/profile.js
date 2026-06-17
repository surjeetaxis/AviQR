import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
// Icon not needed — using emoji
// Toast replaced with Alert
import { useAuth, ROLE_CONFIG } from '../../src/context/AuthContext.js';
import { authApi } from '../../src/api/index.js';
// Header removed - expo-router handles navigation
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { Card } from '../../src/components/common/Card.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

export default function ProfileScreen({ navigation }) {
  const { user, updateProfile, logout } = useAuth();
  const [form, setForm]   = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [saving, setSaving]= useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      Toast.show({ type: 'success', text1: 'Profile updated!' });
    } catch { Toast.show({ type: 'error', text1: 'Failed to update profile' }); }
    finally { setSaving(false); }
  };

  const roleCfg = ROLE_CONFIG[user?.role] || {};

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Header title="My Profile" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.bigAvatar, { backgroundColor: (roleCfg.color || Colors.primary) + '20' }]}>
            <Text style={[styles.bigAvatarText, { color: roleCfg.color || Colors.primary }]}>{user?.avatar || user?.name?.[0] || '?'}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: (roleCfg.color || Colors.primary) + '18' }]}>
            <Text style={[styles.roleText, { color: roleCfg.color || Colors.primary }]}>{roleCfg.label || user?.role}</Text>
          </View>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Edit form */}
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Edit Details</Text>
          <Input label="Full Name" value={form.name} onChangeText={v => set('name', v)} />
          <Input label="Phone Number" value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" />
          <Button title="Save Changes" onPress={save} loading={saving} />
        </Card>

        {/* Account info */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          {[
            { icon: 'mail',      label: 'Email',     value: user?.email },
            { icon: 'phone',     label: 'Phone',     value: user?.phone || 'Not set' },
            { icon: 'shield',    label: 'Role',      value: roleCfg.label || user?.role },
            { icon: 'shopping-bag', label: 'Shop ID', value: user?.shopId ? user.shopId.slice(0, 8) + '…' : 'N/A' },
          ].map(row => (
            <View key={row.label} style={styles.infoRow}>
              <Icon name={row.icon} size={14} color={Colors.gray400} style={{ width: 20 }} />
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{row.value}</Text>
            </View>
          ))}
        </Card>

        <Button title="Sign Out" onPress={() => Alert.alert('Sign out?', '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: logout }])} variant="danger" style={{ marginTop: Spacing.base }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:         { padding: Spacing.base, paddingBottom: 40 },
  avatarSection:  { alignItems: 'center', paddingVertical: Spacing.xl },
  bigAvatar:      { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  bigAvatarText:  { fontSize: 36, fontWeight: '800' },
  userName:       { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.gray900 },
  roleBadge:      { paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full, marginTop: 8, marginBottom: 4 },
  roleText:       { fontSize: FontSize.sm, fontWeight: '700' },
  userEmail:      { fontSize: FontSize.sm, color: Colors.gray400 },
  formCard:       { padding: Spacing.base, marginBottom: Spacing.base },
  sectionTitle:   { fontSize: FontSize.base, fontWeight: '800', marginBottom: Spacing.base },
  infoCard:       { padding: Spacing.base },
  infoRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, gap: 10 },
  infoLabel:      { width: 60, fontSize: FontSize.sm, color: Colors.gray500 },
  infoValue:      { flex: 1, fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900, textAlign: 'right' },
});