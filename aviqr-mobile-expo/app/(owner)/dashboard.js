import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { reportApi, orderApi, vendorRequestApi } from '../../src/api/index.js';
import { MOCK_STATS, MOCK_ORDERS } from '../../src/api/mockData.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { StatusBadge } from '../../src/components/common/StatusBadge.js';
import { OwnerDrawer } from '../../src/components/common/OwnerDrawer.js';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../src/theme/index.js';
import { ShoppingBagIcon, BarChartIcon, UserIcon, BookOpenIcon, DashboardIcon, SettingsIcon } from '../../src/components/common/NavIcons.js';
import { confirmAction } from '../../src/utils/confirmAction.js';

const STATUS_NEXT = { NEW:'ACCEPTED', ACCEPTED:'PREPARING', PREPARING:'READY', READY:'COMPLETED' };
const STATUS_LABEL = { NEW:'Accept', ACCEPTED:'Start', PREPARING:'Ready', READY:'Done' };
const STATUS_COLOR = { NEW:'#2563EB', ACCEPTED:'#D97706', PREPARING:'#7C3AED', READY:'#1D9E75', COMPLETED:'#6B7280', CANCELLED:'#DC2626' };

function timeSince(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { outletId, shopId: routeShopId } = useLocalSearchParams();
  const basePath = outletId ? `/(hotel)/outlets/${outletId}` : routeShopId ? `/(supplier)/shops/${routeShopId}` : '/(owner)';
  const shopId = useActiveShopId();

  // An OWNER with no shop yet (fresh registration) has no in-app path to
  // create one otherwise — send them through the setup wizard first.
  useEffect(() => {
    if (!shopId && !outletId && !routeShopId && user?.role === 'OWNER') {
      router.replace('/(owner)/setup-shop');
    }
  }, [shopId, outletId, routeShopId, user?.role]);

  const [stats,     setStats]  = useState(null);
  const [orders,    setOrders] = useState([]);
  const [offline,   setOffline]= useState(false);
  const [loading,   setLoading]= useState(true);
  const [refreshing,setRef]    = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [invites, setInvites]  = useState([]);
  const [respondingId, setRespondingId] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [topItems, setTopItems] = useState([]);

  const load = useCallback(async () => {
    try {
      const [s, o, v, r, t] = await Promise.allSettled([
        reportApi.getDaily(shopId),
        orderApi.getLive(shopId),
        vendorRequestApi.mine(shopId),
        reportApi.getRevenue(shopId, 7),
        reportApi.getTopItems(shopId),
      ]);
      if (s.status === 'fulfilled') { setStats(s.value.data.data); setOffline(false); }
      else setOffline(true);
      if (o.status === 'fulfilled') setOrders(o.value.data.data || []);
      else if (!stats) setOrders(MOCK_ORDERS); // only show mock if no real data yet
      if (v.status === 'fulfilled') setInvites(v.value.data.data || []);
      if (r.status === 'fulfilled') setRevenue(r.value.data.data || []);
      if (t.status === 'fulfilled') setTopItems((t.value.data.data || []).slice(0, 5));
    } catch {
      setOffline(true);
      if (!stats) setStats(MOCK_STATS);
      if (!orders.length) setOrders(MOCK_ORDERS);
    } finally { setLoading(false); }
  }, [shopId]);

  const respondInvite = async (invite, decision) => {
    setRespondingId(invite.id);
    try {
      await vendorRequestApi.respond(invite.id, decision);
      setInvites(prev => prev.filter(i => i.id !== invite.id));
    } catch { Alert.alert('Could not respond', 'Please try again.'); }
    finally { setRespondingId(null); }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const advance = async (order) => {
    const next = STATUS_NEXT[order.status];
    if (!next) return;
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o));
    try { await orderApi.updateStatus(order.id, next); }
    catch (e) { Alert.alert('Error', 'Could not update order status. Please check connection.'); await load(); }
  };

  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const activeOrders = orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status));
  const newOrders = orders.filter(o => o.status === 'NEW');

  const QUICK = [
    { emoji:'📦', label:'Orders',   href:`${basePath}/orders`,   badge: newOrders.length },
    { emoji:'🧾', label:'Billing',  href:`${basePath}/billing` },
    { emoji:'👨‍🍳', label:'Kitchen', href:`${basePath}/kot` },
    { emoji:'🍽️', label:'Menu',     href:`${basePath}/menu` },
    { emoji:'📦', label:'Inventory', href:`${basePath}/inventory` },
    { emoji:'📱', label:'QR Codes', href:`${basePath}/qrcodes` },
    { emoji:'👥', label:'Staff',    href:`${basePath}/staff` },
    { emoji:'📊', label:'Reports',  href:`${basePath}/reports` },
    { emoji:'✨', label:'AI Hub',   href:`${basePath}/ai-hub` },
    { emoji:'⚙️', label:'Settings', href:`${basePath}/settings` },
  ];

  const KPI = [
    { Icon:BarChartIcon, label:"Today's Revenue", value: stats?.totalRevenue ? `₹${fmt(stats.totalRevenue)}` : '—', color:Colors.primary, sub: stats?.totalOrders ? `${stats.totalOrders} orders` : '' },
    { Icon:ShoppingBagIcon, label:'Active Orders',   value: activeOrders.length,                                         color:'#2563EB', sub: `${newOrders.length} new` },
    { Icon:BarChartIcon, label:'Avg Order',       value: stats?.avgOrderValue ? `₹${fmt(stats.avgOrderValue)}` : '—', color:'#7C3AED', sub: 'Today' },
    { Icon:UserIcon, label:'New Customers',   value: stats?.newCustomers ?? '—',                                   color:'#D97706', sub: 'Today' },
  ];

  return (
    <ScrollView style={ss.screen} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}>

      {/* Header */}
      <LinearGradient colors={[Colors.brandSurface, Colors.brandRaised]} style={ss.header}>
        <View style={ss.hRow}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <TouchableOpacity onPress={() => setDrawerOpen(true)} style={ss.menuBtn} accessibilityLabel="Open menu">
              <Text style={ss.menuIcon}>☰</Text>
            </TouchableOpacity>
            <View>
              <Text style={ss.greet}>YOUR RESTAURANT AT A GLANCE</Text>
              <Text style={ss.shopName}>{greeting()}, {user?.name?.split(' ')[0] || 'there'}.</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => confirmAction('Sign out?', 'You will need to log in again.', logout, 'Sign out')} style={ss.avatarBtn}>
            <Text style={ss.avatarText}>{user?.name?.slice(0, 2).toUpperCase() || 'ME'}</Text>
          </TouchableOpacity>
        </View>

      </LinearGradient>

      <View style={ss.body}>
        {/* Offline indicator */}
        {offline && <OfflineBadge message={stats ? "Using cached data — reconnecting…" : "Backend offline — showing demo data"} />}

        {/* New order alert */}
        {newOrders.length > 0 && (
          <TouchableOpacity style={ss.newOrderBanner} onPress={() => router.push(`${basePath}/orders`)}>
            <Text style={ss.newOrderText}>🔔 {newOrders.length} new order{newOrders.length > 1 ? 's' : ''} waiting — tap to accept</Text>
          </TouchableOpacity>
        )}

        {/* Mall/food-court link requests — a mall admin invited this shop to join their food court */}
        {invites.map(inv => (
          <View key={inv.id} style={ss.inviteCard}>
            <Text style={ss.inviteTitle}>🏬 {inv.mallName} wants to add you to their food court</Text>
            {inv.mallCity ? <Text style={ss.inviteSub}>{inv.mallCity}</Text> : null}
            <View style={ss.inviteActions}>
              <TouchableOpacity
                style={[ss.inviteBtn, ss.inviteAccept]}
                disabled={respondingId === inv.id}
                onPress={() => respondInvite(inv, 'ACCEPT')}>
                <Text style={ss.inviteAcceptText}>{respondingId === inv.id ? '…' : 'Accept'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ss.inviteBtn, ss.inviteReject]}
                disabled={respondingId === inv.id}
                onPress={() => respondInvite(inv, 'REJECT')}>
                <Text style={ss.inviteRejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={ss.serviceOverview}><View style={ss.liveDot} /><Text style={ss.serviceText}>Service overview · {activeOrders.length} active orders</Text></View>
        <View style={ss.kpiGrid}>
          {KPI.map(k => (
            <View key={k.label} style={ss.overviewCard}>
              <View style={[ss.overviewIcon,{backgroundColor:k.color+'14'}]}><k.Icon size={20} color={k.color} /></View>
              <Text style={ss.overviewLabel}>{k.label}</Text>
              <Text style={[ss.overviewValue,{color:k.color}]}>{k.value}</Text>
              <Text style={ss.overviewSub}>{k.sub || 'Today'}</Text>
            </View>
          ))}
        </View>

        {/* Revenue trend + top items */}
        {revenue.length > 0 && (
          <View style={ss.chartCard}>
            <Text style={ss.sectionTitle2}>Revenue trend (7 days)</Text>
            <View style={ss.chartWrap}>
              {revenue.map((r, i) => {
                const max = Math.max(1, ...revenue.map(x => Number(x.revenue || 0)));
                return (
                  <View key={i} style={ss.barCol}>
                    <View style={[ss.bar, { height: Math.max(4, (Number(r.revenue || 0) / max) * 90) }]} />
                    <Text style={ss.barLabel}>{String(r.date || '').slice(-5)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
        {topItems.length > 0 && (
          <View style={ss.chartCard}>
            <Text style={ss.sectionTitle2}>Top selling items</Text>
            {topItems.map((item, i) => (
              <View key={i} style={ss.topRow}>
                <Text style={ss.topRank}>#{i + 1}</Text>
                <Text style={ss.topName} numberOfLines={1}>{item.name}</Text>
                <Text style={ss.topRev}>₹{fmt(item.revenue)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick actions */}
        <Text style={ss.sectionTitle}>Quick actions</Text>
        <View style={ss.quickGrid}>
          {QUICK.map(q => (
            <TouchableOpacity key={q.href} style={ss.quickCard} onPress={() => router.push(q.href)}>
              <Text style={ss.quickEmoji}>{q.emoji}</Text>
              <Text style={ss.quickLabel}>{q.label}</Text>
              {q.badge > 0 && <View style={ss.badge}><Text style={ss.badgeText}>{q.badge}</Text></View>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Live orders */}
        <View style={ss.sectionHeader}>
          <Text style={ss.sectionTitle}>Live orders</Text>
          <TouchableOpacity onPress={() => router.push(`${basePath}/orders`)}>
            <Text style={ss.seeAll}>View all →</Text>
          </TouchableOpacity>
        </View>

        {orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status)).length === 0 ? (
          <View style={ss.emptyCard}>
            <Text style={ss.emptyEmoji}>🎉</Text>
            <Text style={ss.emptyText}>No active orders</Text>
            <Text style={ss.emptySub}>Orders appear here in real-time when customers scan your QR</Text>
          </View>
        ) : (
          orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status)).slice(0, 5).map(order => (
            <View key={order.id} style={[ss.orderCard, order.status === 'NEW' && { borderLeftWidth:3, borderLeftColor:'#2563EB' }]}>
              <View style={ss.orderTop}>
                <View>
                  <Text style={ss.orderNum}>#{order.orderNumber}</Text>
                  <Text style={ss.orderCustomer}>{order.customerName || 'Walk-in'}{order.tableNumber ? ` · Table ${order.tableNumber}` : ''}</Text>
                </View>
                <View style={[ss.statusPill, { backgroundColor: (STATUS_COLOR[order.status] || '#6B7280') + '22' }]}>
                  <Text style={[ss.statusText, { color: STATUS_COLOR[order.status] || '#6B7280' }]}>{order.status}</Text>
                </View>
              </View>

              <Text style={ss.orderItems}>
                {(order.items || []).slice(0, 3).map(i => `${i.itemName || i.name} ×${i.quantity}`).join('  ·  ')}
                {(order.items || []).length > 3 ? `  +${order.items.length - 3} more` : ''}
              </Text>

              <View style={ss.orderFoot}>
                <Text style={ss.orderTime}>🕐 {timeSince(order.createdAt)} ago</Text>
                <Text style={ss.orderAmt}>₹{parseFloat(order.totalAmount || 0).toFixed(0)}</Text>
                {STATUS_NEXT[order.status] && (
                  <TouchableOpacity style={ss.advBtn} onPress={() => advance(order)}>
                    <Text style={ss.advBtnText}>{STATUS_LABEL[order.status] || 'Next'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}

        <View style={{ height: 32 }} />
      </View>
      <OwnerDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} basePath={basePath} newOrderCount={newOrders.length} />
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  screen:     { flex:1, backgroundColor:Colors.background },
  header:     { padding:Spacing.lg, paddingTop:56, paddingBottom:28 },
  hRow:       { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 },
  greet:      { color:Colors.mint, fontSize:9, letterSpacing:1.2, fontWeight:'700' },
  shopName:   { color:Colors.white, fontSize:24, fontWeight:'600', letterSpacing:-0.6, marginTop:8 },
  avatarBtn:  { width:40, height:44, borderRadius:20, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center' },
  avatarText: { color:'white', fontSize:14, fontWeight:'700' },
  menuBtn:    { width:36, height:44, borderRadius:18, backgroundColor:'rgba(255,255,255,0.15)', alignItems:'center', justifyContent:'center' },
  menuIcon:   { color:'white', fontSize:18, fontWeight:'700' },
  serviceOverview:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:Colors.primaryLight,borderWidth:1,borderColor:Colors.border,padding:14,borderRadius:Radius.md,marginBottom:8},
  liveDot:{width:7,height:7,borderRadius:4,backgroundColor:Colors.primary},
  serviceText:{fontSize:12,color:Colors.primaryDark,flex:1},
  kpiGrid:{flexDirection:'row',flexWrap:'wrap',gap:12,marginBottom:8},
  overviewCard:{width:'48%',flexGrow:1,backgroundColor:Colors.white,borderRadius:Radius.lg,borderWidth:1,borderColor:Colors.border,padding:18,...Shadow.sm},
  overviewIcon:{width:38,height:38,borderRadius:10,alignItems:'center',justifyContent:'center',marginBottom:18},
  overviewLabel:{fontSize:12,color:Colors.gray600},
  overviewValue:{fontSize:26,fontWeight:'700',letterSpacing:-0.6,marginTop:6,fontVariant:['tabular-nums']},
  overviewSub:{fontSize:11,color:Colors.gray500,marginTop:6},
  kpiRow:     { flexDirection:'row', gap:12 },
  kpiCard:    { flex:1, backgroundColor:'rgba(255,255,255,0.15)', borderRadius:Radius.lg, padding:12 },
  kpiVal:     { color:'white', fontSize:22, fontWeight:'800' },
  kpiLabel:   { color:'rgba(255,255,255,0.75)', fontSize:11, marginTop:2 },
  kpiSub:     { fontSize:10, marginTop:2 },
  body:       { padding:Spacing.base, gap:8 },
  newOrderBanner: { backgroundColor:'#EFF6FF', borderRadius:10, padding:12, marginBottom:8, borderWidth:1, borderColor:'#BFDBFE' },
  newOrderText:   { color:'#1D4ED8', fontSize:13, fontWeight:'600', textAlign:'center' },
  inviteCard:     { backgroundColor:'#FEF3C7', borderRadius:Radius.lg, padding:12, marginBottom:8, borderWidth:1, borderColor:'#FDE68A' },
  inviteTitle:    { fontSize:13, fontWeight:'700', color:'#92400E' },
  inviteSub:      { fontSize:11, color:'#B45309', marginTop:2 },
  inviteActions:  { flexDirection:'row', gap:8, marginTop:10 },
  inviteBtn:      { flex:1, paddingVertical:8, borderRadius:8, alignItems:'center' },
  inviteAccept:   { backgroundColor:'#059669' },
  inviteReject:   { backgroundColor:'white', borderWidth:1, borderColor:'#DC2626' },
  inviteAcceptText: { color:'white', fontWeight:'700', fontSize:12.5 },
  inviteRejectText: { color:'#DC2626', fontWeight:'700', fontSize:12.5 },
  kpiRow2:    { flexDirection:'row', gap:10, marginVertical:8 },
  kpiCard2:   { flex:1, backgroundColor:'white', borderRadius:Radius.lg, padding:12, borderLeftWidth:3, ...Shadow.sm },
  kpiVal2:    { fontSize:18, fontWeight:'800' },
  kpiLabel2:  { fontSize:11, color:Colors.gray500, marginTop:2 },
  sectionHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:16, marginBottom:8 },
  sectionTitle:  { fontSize:16, fontWeight:'700', color:Colors.gray900, marginTop:8, marginBottom:6 },
  chartCard:     { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, marginTop: 8, ...Shadow.sm },
  sectionTitle2: { fontSize: FontSize.base, fontWeight: '600', color: Colors.gray900, marginBottom: 12 },
  chartWrap:     { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 4 },
  barCol:        { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bar:           { width: '70%', backgroundColor: Colors.primary, borderRadius: 3, minHeight: 4 },
  barLabel:      { fontSize: 9, color: Colors.gray400, textAlign: 'center' },
  topRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  topRank:       { width: 26, fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray400 },
  topName:       { flex: 1, fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900 },
  topRev:        { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primary },
  seeAll:     { fontSize:13, color:Colors.primary, fontWeight:'600' },
  quickGrid:  { flexDirection:'row', flexWrap:'wrap', gap:10 },
  quickCard:  { width:'30%', backgroundColor:'white', borderRadius:Radius.lg, padding:14, alignItems:'center', ...Shadow.sm, position:'relative' },
  quickEmoji: { fontSize:24, marginBottom:6 },
  quickLabel: { fontSize:11, fontWeight:'600', color:Colors.gray700, textAlign:'center' },
  badge:      { position:'absolute', top:8, right:8, backgroundColor:'#DC2626', borderRadius:10, minWidth:18, height:18, alignItems:'center', justifyContent:'center', paddingHorizontal:4 },
  badgeText:  { color:'white', fontSize:10, fontWeight:'800' },
  emptyCard:  { backgroundColor:'white', borderRadius:Radius.lg, padding:32, alignItems:'center', ...Shadow.sm },
  emptyEmoji: { fontSize:36, marginBottom:8 },
  emptyText:  { fontSize:15, fontWeight:'700', color:Colors.gray700 },
  emptySub:   { fontSize:12, color:Colors.gray400, marginTop:4, textAlign:'center' },
  orderCard:  { backgroundColor:'white', borderRadius:Radius.lg, padding:14, marginBottom:10, ...Shadow.sm },
  orderTop:   { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 },
  orderNum:   { fontSize:14, fontWeight:'700', color:Colors.gray900 },
  orderCustomer: { fontSize:12, color:Colors.gray500, marginTop:2 },
  statusPill: { borderRadius:999, paddingHorizontal:10, paddingVertical:3 },
  statusText: { fontSize:11, fontWeight:'700' },
  orderItems: { fontSize:12, color:Colors.gray500, marginBottom:10, lineHeight:18 },
  orderFoot:  { flexDirection:'row', alignItems:'center', gap:8 },
  orderTime:  { fontSize:11, color:Colors.gray400, flex:1 },
  orderAmt:   { fontSize:14, fontWeight:'700', color:Colors.gray900 },
  advBtn:     { backgroundColor:Colors.primary, borderRadius:8, paddingHorizontal:14, paddingVertical:6 },
  advBtnText: { color:'white', fontSize:12, fontWeight:'700' },
});
