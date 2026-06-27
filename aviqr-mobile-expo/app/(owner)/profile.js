import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth, ROLE_CONFIG } from '../../src/context/AuthContext.js';
import { authApi } from '../../src/api/index.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { Card } from '../../src/components/common/Card.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useAuth();
  const [form, setForm]    = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) return Alert.alert('Required', 'Name cannot be empty');
    setSaving(true);
    try {
      await updateProfile(form);
      Alert.alert('Saved', 'Profile updated successfully!');
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to update profile. Try again.');
    } finally { setSaving(false); }
  };

  const confirmLogout = () => Alert.alert(
    'Sign out?',
    'You will need to sign in again.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]
  );

  const confirmDelete = () => Alert.alert(
    'Delete account?',
    'This permanently deletes all your data and cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete my account',
        style: 'destructive',
        onPress: async () => {
          try {
            await authApi.deleteAccount?.();
            logout();
          } catch {
            Alert.alert('Error', 'Account deletion failed. Contact support@aviqr.in');
          }
        },
      },
    ]
  );

  const roleCfg = ROLE_CONFIG?.[user?.role] || {};

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header bar — expo-router handles back navigation */}
      <View style={ss.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={ss.backBtn}>
          <Text style={ss.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={ss.headerTitle}>My Profile</Text>
        <View style={{ width: 60 }}/>
      </View>

      <ScrollView contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={ss.avatarSection}>
          <View style={[ss.bigAvatar, { backgroundColor: (roleCfg.color || Colors.primary) + '20' }]}>
            <Text style={[ss.bigAvatarText, { color: roleCfg.color || Colors.primary }]}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={ss.userName}>{user?.name}</Text>
          <View style={[ss.roleBadge, { backgroundColor: (roleCfg.color || Colors.primary) + '18' }]}>
            <Text style={[ss.roleText, { color: roleCfg.color || Colors.primary }]}>
              {roleCfg.label || user?.role}
            </Text>
          </View>
          <Text style={ss.userEmail}>{user?.email}</Text>
        </View>

        {/* Edit form */}
        <Card style={ss.formCard}>
          <Text style={ss.sectionTitle}>Edit Details</Text>
          <Input label="Full Name" value={form.name} onChangeText={v => set('name', v)}/>
          <Input label="Phone Number" value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad"/>
          <Button title={saving ? 'Saving…' : 'Save Changes'} onPress={save} loading={saving}/>
        </Card>

        {/* Account info */}
        <Card style={ss.infoCard}>
          <Text style={ss.sectionTitle}>Account Info</Text>
          {[
            { label: 'Email',   value: user?.email },
            { label: 'Phone',   value: user?.phone || 'Not set' },
            { label: 'Role',    value: roleCfg.label || user?.role },
            { label: 'Shop ID', value: user?.shopId ? user.shopId.slice(0, 8) + '…' : 'N/A' },
          ].map(row => (
            <View key={row.label} style={ss.infoRow}>
              <Text style={ss.infoLabel}>{row.label}</Text>
              <Text style={ss.infoValue} numberOfLines={1}>{row.value}</Text>
            </View>
          ))}
        </Card>

        {/* Actions */}
        <Button title="Sign Out" onPress={confirmLogout} variant="danger" style={{ marginTop: Spacing.base }}/>

        <TouchableOpacity onPress={confirmDelete} style={ss.deleteLink}>
          <Text style={ss.deleteTxt}>Delete my account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  headerBar:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:'#E5E7EB' },
  backBtn:       { paddingVertical:4, paddingHorizontal:8 },
  backTxt:       { fontSize:14, color:Colors.primary, fontWeight:'600' },
  headerTitle:   { fontSize:17, fontWeight:'700', color:Colors.gray900 },
  scroll:        { padding:Spacing.base, paddingBottom:40 },
  avatarSection: { alignItems:'center', paddingVertical:Spacing.xl },
  bigAvatar:     { width:80, height:80, borderRadius:40, alignItems:'center', justifyContent:'center', marginBottom:12 },
  bigAvatarText: { fontSize:32, fontWeight:'800' },
  userName:      { fontSize:20, fontWeight:'800', color:Colors.gray900 },
  roleBadge:     { paddingHorizontal:12, paddingVertical:4, borderRadius:20, marginTop:8, marginBottom:4 },
  roleText:      { fontSize:FontSize.sm, fontWeight:'700' },
  userEmail:     { fontSize:FontSize.sm, color:Colors.gray400 },
  formCard:      { padding:Spacing.base, marginBottom:Spacing.base },
  sectionTitle:  { fontSize:FontSize.base, fontWeight:'800', marginBottom:Spacing.base },
  infoCard:      { padding:Spacing.base },
  infoRow:       { flexDirection:'row', alignItems:'center', paddingVertical:10, borderBottomWidth:1, borderBottomColor:'#F3F4F6' },
  infoLabel:     { width:70, fontSize:FontSize.sm, color:Colors.gray500 },
  infoValue:     { flex:1, fontSize:FontSize.sm, fontWeight:'600', color:Colors.gray900, textAlign:'right' },
  deleteLink:    { alignItems:'center', paddingVertical:16, marginTop:8 },
  deleteTxt:     { fontSize:13, color:'#DC2626', textDecorationLine:'underline' },
});
