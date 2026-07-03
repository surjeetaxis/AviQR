import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
// Icon not needed — using emoji
import { shopApi, reportApi } from '../../src/api/index.js';
import { useAuth } from '../../src/context/AuthContext.js';
import { Card } from '../../src/components/common/Card.js';
import { StatusBadge } from '../../src/components/common/StatusBadge.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

export default function SupplierHomeScreen() {
  const { user, logout } = useAuth();
  const [shops, setShops]   = useState([]);
  const [refreshing, setRef]= useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await shopApi.getMyShops();
      setShops(res.data.data || []);
    } catch {}
  };

  const totalRevenue = shops.reduce((s, sh) => s + (sh.revenue || 0), 0);
  const totalOrders  = shops.reduce((s, sh) => s + (sh.orders || 0), 0);

  const ShopCard = ({ shop }) => (
    <TouchableOpacity style={styles.shopCard} onPress={() => router.push(`/(supplier)/shops/${shop.id}/dashboard`)} activeOpacity={0.85}>
      <View style={styles.shopAvatar}>
        <Text style={styles.shopAvatarText}>{shop.name?.[0]}</Text>
      </View>
      <View style={styles.shopInfo}>
        <Text style={styles.shopName}>{shop.name}</Text>
        <Text style={styles.shopCity}>{shop.city}</Text>
        <View style={styles.shopMetaRow}>
          <Text style={styles.shopOrders}>📦 {shop.tableCount || 0} tables</Text>
          <StatusBadge status={shop.status || 'ACTIVE'} />
        </View>
      </View>
      <Text style={{fontSize:16,color:Colors.gray300}}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient colors={['#064E3B','#059669']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerSub}>BRAND / SUPPLIER</Text>
            <Text style={styles.headerName}>{user?.name}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={{ padding: 8 }}>
            <Text style={{fontSize:18,color:'rgba(255,255,255,0.6)'}}>⎋</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          {[
            { label:'Outlets', value: shops.length },
            { label:'Active',  value: shops.filter(s => s.status === 'ACTIVE').length },
            { label:'Plan',    value: 'Growth' },
          ].map(s => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <FlatList
        data={shops}
        keyExtractor={s => s.id}
        renderItem={({ item }) => <ShopCard shop={item} />}
        contentContainerStyle={{ padding: Spacing.base, gap: 10, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.white} />}
        ListHeaderComponent={
          <View style={styles.kpis}>
            <Card style={[styles.kpi, { borderLeftColor: Colors.primary }]}>
              <Text style={styles.kpiValue}>₹{totalRevenue.toLocaleString('en-IN')}</Text>
              <Text style={styles.kpiLabel}>Total Revenue</Text>
            </Card>
            <Card style={[styles.kpi, { borderLeftColor: '#2563EB' }]}>
              <Text style={[styles.kpiValue, { color: '#2563EB' }]}>{totalOrders}</Text>
              <Text style={styles.kpiLabel}>Total Orders</Text>
            </Card>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏪</Text>
            <Text style={styles.emptyText}>No outlets added yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header:     { paddingTop: 52, paddingHorizontal: Spacing.base, paddingBottom: 24 },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.base },
  headerSub:  { fontSize: FontSize.xs, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5 },
  headerName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white, marginTop: 4 },
  statsRow:   { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.lg, padding: Spacing.md },
  statItem:   { flex: 1, alignItems: 'center' },
  statValue:  { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white },
  statLabel:  { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  kpis:       { flexDirection: 'row', gap: 10, marginBottom: Spacing.base },
  kpi:        { flex: 1, padding: Spacing.base, borderLeftWidth: 3 },
  kpiValue:   { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.primary },
  kpiLabel:   { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 3 },
  shopCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  shopAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  shopAvatarText:{ fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  shopInfo:   { flex: 1 },
  shopName:   { fontSize: FontSize.base, fontWeight: '700' },
  shopCity:   { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 1 },
  shopMetaRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  shopOrders: { fontSize: FontSize.xs, color: Colors.gray500 },
  empty:      { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText:  { fontSize: FontSize.base, color: Colors.gray400 },
});