import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// Icon not needed — using emoji
import { reportApi, authApi } from '../../src/api/index.js';
import { useAuth } from '../../src/context/AuthContext.js';
import { StatCard } from '../../src/components/common/StatCard.js';
// Header removed - expo-router handles navigation
import { Card } from '../../src/components/common/Card.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

export default function AdminHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [stats, setStats]   = useState(null);
  const [userStats, setUS]  = useState(null);
  const [refreshing, setRef]= useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [s, u] = await Promise.allSettled([
        reportApi.getPlatformStats(),
        authApi.getUserStats(),
      ]);
      if (s.status === 'fulfilled') setStats(s.value.data.data);
      if (u.status === 'fulfilled') setUS(u.value.data.data);
    } catch {}
  };

  const onRefresh = async () => { setRef(true); await load(); setRef(false); };

  const NAV_ITEMS = [
    { icon: '👥', label: 'Users',      screen: 'AdminUsers',    color: Colors.primary },
    { icon: '🏪', label: 'Shops',      screen: 'AdminShops',    color: '#2563EB' },
    { icon: '🏨', label: 'Hotels',     screen: 'AdminHotels',   color: '#7C3AED' },
    { icon: '🏬', label: 'Malls',      screen: 'AdminMalls',    color: '#D97706' },
    { icon: '💳', label: 'Payments',   screen: 'AdminPayments', color: '#059669' },
    { icon: '🎫', label: 'Tickets',    screen: 'AdminTickets',  color: '#DC2626' },
    { icon: '📊', label: 'Reports',    screen: 'AdminReports',  color: Colors.gray600 },
    { icon: '⚙️', label: 'Settings',   screen: 'AdminSettings', color: Colors.gray500 },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient colors={['#111827','#1F2937']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerRole}>SUPER ADMIN</Text>
            <Text style={styles.headerName}>{user?.name}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Icon name="log-out" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}>

        {/* Platform KPIs */}
        <Text style={styles.sectionTitle}>Platform Overview</Text>
        <View style={styles.kpiGrid}>
          <StatCard emoji="🏪" value={stats?.totalShops?.toLocaleString() || '—'} label="Total Shops" color={Colors.primary} />
          <StatCard emoji="👥" value={stats?.totalOrders?.toLocaleString() || '—'} label="Total Orders" color="#2563EB" />
        </View>
        <View style={styles.kpiGrid}>
          <StatCard emoji="💰" value={stats?.totalRevenue ? `₹${(stats.totalRevenue/100000).toFixed(1)}L` : '—'} label="Platform GMV" color="#7C3AED" />
          <StatCard emoji="🏨" value={stats?.totalHotels || '—'} label="Hotels" color="#D97706" />
        </View>

        {/* User breakdown */}
        {userStats && (
          <Card style={styles.userCard}>
            <Text style={styles.userCardTitle}>Users by role</Text>
            {['owner','manager','customer','hotel','mall','support','admin'].map(role => (
              userStats[role] > 0 && (
                <View key={role} style={styles.userRow}>
                  <Text style={styles.userRole}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
                  <View style={styles.userBar}>
                    <View style={[styles.userBarFill, { width: `${Math.min(100, (userStats[role] / (userStats.total || 1)) * 100)}%`, backgroundColor: Colors.primary }]} />
                  </View>
                  <Text style={styles.userCount}>{userStats[role]}</Text>
                </View>
              )
            ))}
          </Card>
        )}

        {/* Quick nav */}
        <Text style={styles.sectionTitle}>Manage</Text>
        <View style={styles.navGrid}>
          {NAV_ITEMS.map(n => (
            <TouchableOpacity key={n.screen} style={styles.navItem} onPress={() => navigation.navigate(n.screen)} activeOpacity={0.8}>
              <View style={[styles.navIcon, { backgroundColor: n.color + '18' }]}>
                <Text style={styles.navEmoji}>{n.icon}</Text>
              </View>
              <Text style={styles.navLabel}>{n.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:       { paddingTop: 52, paddingHorizontal: Spacing.base, paddingBottom: 24 },
  headerRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerRole:   { fontSize: FontSize.xs, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5 },
  headerName:   { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.white, marginTop: 4 },
  logoutBtn:    { padding: 10 },
  scroll:       { padding: Spacing.base, paddingBottom: 40 },
  sectionTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: Spacing.sm, marginTop: Spacing.md },
  kpiGrid:      { flexDirection: 'row', gap: 10, marginBottom: 10 },
  userCard:     { padding: Spacing.base, marginTop: Spacing.sm },
  userCardTitle:{ fontSize: FontSize.base, fontWeight: '800', marginBottom: 12 },
  userRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  userRole:     { width: 80, fontSize: FontSize.sm, color: Colors.gray700, textTransform: 'capitalize' },
  userBar:      { flex: 1, height: 6, backgroundColor: Colors.gray100, borderRadius: 3, marginHorizontal: 10, overflow: 'hidden' },
  userBarFill:  { height: '100%', borderRadius: 3 },
  userCount:    { width: 32, fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray700, textAlign: 'right' },
  navGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  navItem:      { width: '22%', alignItems: 'center', gap: 6, paddingVertical: Spacing.base, backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  navIcon:      { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  navEmoji:     { fontSize: 22 },
  navLabel:     { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray700, textAlign: 'center' },
});