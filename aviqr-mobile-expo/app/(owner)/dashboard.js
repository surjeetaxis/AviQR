import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext.js';
import { reportApi, orderApi } from '../../src/api/index.js';
import { MOCK_STATS, MOCK_REVENUE, MOCK_ORDERS } from '../../src/api/mockData.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { StatusBadge } from '../../src/components/common/StatusBadge.js';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../src/theme/index.js';

const STATUS_NEXT = {NEW:'ACCEPTED',ACCEPTED:'PREPARING',PREPARING:'READY',READY:'COMPLETED'};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const shopId = user?.shopId || '00000000-0000-0000-0000-000000000101';
  const [stats,  setStats]  = useState(MOCK_STATS);
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [offline,setOffline]= useState(false);
  const [refreshing,setRef] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s,o] = await Promise.allSettled([reportApi.getDaily(shopId), orderApi.getLive(shopId)]);
      if(s.status==='fulfilled'){setStats(s.value.data.data);setOffline(false);}
      else setOffline(true);
      if(o.status==='fulfilled') setOrders(o.value.data.data||[]);
    } catch { setOffline(true); }
  },[shopId]);

  useEffect(()=>{load();const t=setInterval(load,30000);return()=>clearInterval(t);},[load]);

  const advance = async (order) => {
    const next=STATUS_NEXT[order.status]; if(!next)return;
    try { await orderApi.updateStatus(order.id,next); }
    catch {}
    setOrders(prev=>prev.map(o=>o.id===order.id?{...o,status:next}:o));
  };

  const fmt = n => Number(n||0).toLocaleString('en-IN');

  const QUICK = [
    {emoji:'📦',label:'Live Orders', href:'/(owner)/orders'},
    {emoji:'🍽️',label:'Menu',        href:'/(owner)/menu'},
    {emoji:'📱',label:'QR Codes',    href:'/(owner)/qrcodes'},
    {emoji:'👥',label:'Staff',       href:'/(owner)/staff'},
    {emoji:'📊',label:'Reports',     href:'/(owner)/reports'},
    {emoji:'⚙️',label:'Settings',    href:'/(owner)/settings'},
  ];

  return (
    <ScrollView style={ss.screen} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async()=>{setRef(true);await load();setRef(false);}} tintColor={Colors.white}/>}>

      <LinearGradient colors={['#0F6E56','#1D9E75']} style={ss.header}>
        <View style={ss.hRow}>
          <View>
            <Text style={ss.greet}>Good day 👋</Text>
            <Text style={ss.shopName}>{user?.name||'Spice Route'}</Text>
          </View>
          <TouchableOpacity style={ss.avatar} onPress={()=>router.push('/(owner)/profile')}>
            <Text style={ss.avatarTxt}>{user?.avatar||user?.name?.[0]||'O'}</Text>
          </TouchableOpacity>
        </View>
        <View style={ss.kpiRow}>
          {[{l:"Revenue",v:`₹${fmt(stats?.totalRevenue)}`},{l:"Orders",v:stats?.totalOrders??'—'},{l:"Avg Order",v:`₹${fmt(stats?.avgOrderValue)}`}].map(k=>(
            <View key={k.l} style={ss.kpi}>
              <Text style={ss.kpiV}>{k.v}</Text>
              <Text style={ss.kpiL}>{k.l}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={ss.body}>
        {offline&&<OfflineBadge onRetry={load}/>}

        <Text style={ss.sectionTitle}>Quick Actions</Text>
        <View style={ss.qaGrid}>
          {QUICK.map(q=>(
            <TouchableOpacity key={q.href} style={ss.qaItem} onPress={()=>router.push(q.href)} activeOpacity={0.8}>
              <Text style={ss.qaEmoji}>{q.emoji}</Text>
              <Text style={ss.qaLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={ss.sectionRow}>
          <Text style={ss.sectionTitle}>Live Orders</Text>
          <TouchableOpacity onPress={()=>router.push('/(owner)/orders')}><Text style={ss.viewAll}>View all →</Text></TouchableOpacity>
        </View>

        {orders.length===0
          ?<View style={ss.emptyCard}><Text style={{fontSize:32,marginBottom:8}}>🎉</Text><Text style={{color:Colors.gray400,fontSize:FontSize.base}}>No active orders</Text></View>
          :orders.slice(0,5).map(order=>(
            <View key={order.id} style={ss.orderCard}>
              <View style={ss.orderTop}>
                <View>
                  <Text style={ss.orderNum}>{order.orderNumber}</Text>
                  <Text style={ss.orderMeta}>{order.customerName} {order.tableNumber?`· Table ${order.tableNumber}`:''}</Text>
                </View>
                <StatusBadge status={order.status}/>
              </View>
              <View style={ss.orderBottom}>
                <Text style={ss.orderItems}>{(order.items||[]).length} items</Text>
                <Text style={ss.orderAmt}>₹{parseFloat(order.totalAmount||0).toFixed(0)}</Text>
                {STATUS_NEXT[order.status]&&(
                  <TouchableOpacity style={ss.advBtn} onPress={()=>advance(order)}>
                    <Text style={ss.advTxt}>{order.status==='NEW'?'Accept':order.status==='ACCEPTED'?'Start':order.status==='PREPARING'?'Ready':'Done'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        }
      </View>
    </ScrollView>
  );
}
const ss=StyleSheet.create({
  screen:{flex:1,backgroundColor:Colors.background},
  header:{paddingTop:52,paddingHorizontal:16,paddingBottom:28},
  hRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16},
  greet:{fontSize:FontSize.sm,color:'rgba(255,255,255,0.7)'},
  shopName:{fontSize:FontSize.xl,fontWeight:'800',color:Colors.white,marginTop:2},
  avatar:{width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,0.2)',alignItems:'center',justifyContent:'center'},
  avatarTxt:{color:Colors.white,fontWeight:'800',fontSize:FontSize.base},
  kpiRow:{flexDirection:'row',backgroundColor:'rgba(255,255,255,0.12)',borderRadius:Radius.lg,padding:12},
  kpi:{flex:1,alignItems:'center'},
  kpiV:{fontSize:FontSize.lg,fontWeight:'800',color:Colors.white},
  kpiL:{fontSize:FontSize.xs,color:'rgba(255,255,255,0.65)',marginTop:3},
  body:{padding:16},
  sectionRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:16,marginBottom:8},
  sectionTitle:{fontSize:FontSize.md,fontWeight:'800',color:Colors.gray900,marginTop:16,marginBottom:8},
  viewAll:{fontSize:FontSize.sm,color:Colors.primary,fontWeight:'600'},
  qaGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  qaItem:{width:'30%',alignItems:'center',gap:6,paddingVertical:14,backgroundColor:Colors.white,borderRadius:Radius.lg,borderWidth:1,borderColor:Colors.border,...Shadow.sm},
  qaEmoji:{fontSize:22},
  qaLabel:{fontSize:FontSize.xs,fontWeight:'600',color:Colors.gray700,textAlign:'center'},
  emptyCard:{backgroundColor:Colors.white,borderRadius:Radius.lg,padding:32,alignItems:'center',...Shadow.sm},
  orderCard:{backgroundColor:Colors.white,borderRadius:Radius.lg,padding:14,marginBottom:8,borderWidth:1,borderColor:Colors.border,...Shadow.sm},
  orderTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8},
  orderNum:{fontSize:FontSize.md,fontWeight:'800',color:Colors.gray900},
  orderMeta:{fontSize:FontSize.sm,color:Colors.gray500,marginTop:2},
  orderBottom:{flexDirection:'row',alignItems:'center',gap:8},
  orderItems:{flex:1,fontSize:FontSize.xs,color:Colors.gray400},
  orderAmt:{fontSize:FontSize.md,fontWeight:'800',color:Colors.primary},
  advBtn:{backgroundColor:Colors.primary,paddingVertical:5,paddingHorizontal:12,borderRadius:Radius.md},
  advTxt:{color:Colors.white,fontSize:FontSize.xs,fontWeight:'700'},
});