import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useAuth } from '../../context/AuthContext.js';
import { OWNER_NAV_GROUPS } from '../../config/ownerNavGroups.js';
import { Colors, FontSize, Spacing, Radius } from '../../theme/index.js';
import { confirmAction } from '../../utils/confirmAction.js';
import { Logo } from './Logo.js';

// Mobile port of the web app's Sidebar.jsx — same grouped structure/order/labels
// (OWNER_NAV_GROUPS mirrors Sidebar.jsx's NAV_GROUPS), rendered as a full-screen
// slide-in drawer since a permanent side panel doesn't fit a phone width.
export function OwnerDrawer({ visible, onClose, basePath = '/(owner)', newOrderCount = 0 }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const go = (href) => { onClose(); router.push(`${basePath}${href}`); };
  const handleLogout = () => {
    onClose();
    confirmAction('Sign out?', 'You will need to log in again.', logout, 'Sign out');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ss.overlay}>
        <TouchableOpacity style={ss.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={ss.panel}>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <View style={ss.header}>
              <View style={ss.brandRow}>
                <Logo size={30} />
                <Text style={ss.wordmark}>Avi<Text style={{ color: Colors.primary }}>QR</Text></Text>
              </View>
              <TouchableOpacity onPress={onClose}><Text style={ss.close}>✕</Text></TouchableOpacity>
            </View>

            <View style={ss.shopCard}>
              <View style={ss.avatar}><Text style={ss.avatarTxt}>{user?.name?.slice(0, 2).toUpperCase() || 'ME'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={ss.shopName} numberOfLines={1}>{user?.shopName || user?.name || 'My Shop'}</Text>
                <Text style={ss.shopStatus}>{newOrderCount > 0 ? `${newOrderCount} live orders` : 'No active orders'}</Text>
              </View>
            </View>

            {OWNER_NAV_GROUPS.map(group => (
              <View key={group.label} style={{ marginTop: 8 }}>
                <Text style={ss.groupLabel}>{group.label}</Text>
                {group.items.map(item => {
                  const active = pathname?.endsWith(item.href);
                  return (
                    <TouchableOpacity key={item.href} style={[ss.link, active && ss.linkActive]} onPress={() => go(item.href)}>
                      <Text style={ss.linkEmoji}>{item.emoji}</Text>
                      <Text style={[ss.linkLabel, active && ss.linkLabelActive]}>{item.label}</Text>
                      {item.badge === 'orders' && newOrderCount > 0 && (
                        <View style={ss.badge}><Text style={ss.badgeTxt}>{newOrderCount > 9 ? '9+' : newOrderCount}</Text></View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={ss.logout} onPress={handleLogout}>
            <Text style={ss.logoutTxt}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const ss = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: { width: '82%', maxWidth: 320, backgroundColor: Colors.gray900, paddingTop: 56, paddingHorizontal: Spacing.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.white },
  close: { fontSize: 20, color: 'rgba(255,255,255,0.6)' },
  shopCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radius.md, padding: 12, marginBottom: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  shopName: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
  shopStatus: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.xs, marginTop: 2 },
  groupLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 4, paddingTop: 10, paddingBottom: 4 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 11, borderRadius: Radius.md },
  linkActive: { backgroundColor: 'rgba(29,158,117,0.25)' },
  linkEmoji: { fontSize: 16, width: 20, textAlign: 'center' },
  linkLabel: { fontSize: FontSize.base, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  linkLabelActive: { color: Colors.white },
  badge: { marginLeft: 'auto', backgroundColor: Colors.error, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeTxt: { color: Colors.white, fontSize: 10, fontWeight: '800' },
  logout: { paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  logoutTxt: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: FontSize.sm },
});
