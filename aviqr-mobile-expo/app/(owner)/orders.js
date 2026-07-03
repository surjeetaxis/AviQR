import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, TextInput } from 'react-native';
import { useAuth } from '../../src/context/AuthContext.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { orderApi } from '../../src/api/index.js';
import { StatusBadge } from '../../src/components/common/StatusBadge.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, Radius, FontSize, Shadow } from '../../src/theme/index.js';

const NEXT={NEW:'ACCEPTED',ACCEPTED:'PREPARING',PREPARING:'READY',READY:'COMPLETED'};
const LABEL={NEW:'New',ACCEPTED:'Accepted',PREPARING:'Preparing',READY:'Ready',COMPLETED:'Done',CANCELLED:'Cancelled'};
const timeSince=ts=>{const s=Math.floor((Date.now()-new Date(ts))/1000);if(s<60)return s+'s ago';if(s<3600)return Math.floor(s/60)+'m ago';return Math.floor(s/3600)+'h ago';};

export default function Orders() {
  const { user }=useAuth();
  const shopId=useActiveShopId();
  const [orders,setOrders]=useState([]);
  const [filter,setFilter]=useState('ALL');
  const [search,setSearch]=useState('');
  const [offline,setOffline]=useState(false);
  const [refreshing,setRef]=useState(false);

  const load=useCallback(async()=>{
    if(!shopId) return;
    try{const r=await orderApi.getLive(shopId);setOrders(r.data.data||[]);setOffline(false);}
    catch{setOffline(true);}
  },[shopId]);

  useEffect(()=>{load();const t=setInterval(load,15000);return()=>clearInterval(t);},[load]);

  const advance=async(order)=>{
    const next=NEXT[order.status];if(!next)return;
    setOrders(prev=>prev.map(o=>o.id===order.id?{...o,status:next}:o));
    try{await orderApi.updateStatus(order.id,next);}catch{}
  };

  const STATUSES=['ALL','NEW','ACCEPTED','PREPARING','READY','COMPLETED'];
  const filtered=orders.filter(o=>{
    if(filter!=='ALL'&&o.status!==filter)return false;
    if(search&&!o.orderNumber?.toLowerCase().includes(search.toLowerCase())&&!o.customerName?.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  const OrderCard=({item:order})=>(
    <View style={ss.card}>
      <View style={ss.top}>
        <View>
          <Text style={ss.num}>{order.orderNumber}</Text>
          <Text style={ss.meta}>{order.customerName}{order.tableNumber?` · T${order.tableNumber}`:''} · {timeSince(order.createdAt)}</Text>
        </View>
        <StatusBadge status={order.status}/>
      </View>
      <View style={ss.itemsRow}>
        {(order.items||[]).slice(0,2).map((it,i)=>(
          <Text key={i} style={ss.itemTag}>{it.itemName||it.name} ×{it.quantity}</Text>
        ))}
        {(order.items||[]).length>2&&<Text style={ss.itemTag}>+{order.items.length-2}</Text>}
      </View>
      <View style={ss.footer}>
        <Text style={ss.time}>{timeSince(order.createdAt)}</Text>
        <Text style={ss.amt}>₹{parseFloat(order.totalAmount||0).toFixed(0)}</Text>
        {NEXT[order.status]&&(
          <TouchableOpacity style={ss.advBtn} onPress={()=>advance(order)}>
            <Text style={ss.advTxt}>{order.status==='NEW'?'✓ Accept':order.status==='ACCEPTED'?'Prepare':order.status==='PREPARING'?'Ready':'Done'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={ss.screen}>
      <View style={ss.headerBar}>
        <Text style={ss.title}>Orders</Text>
        <Text style={ss.count}>{orders.length} active</Text>
      </View>
      {offline&&<OfflineBadge onRetry={load}/>}
      <View style={ss.searchWrap}>
        <TextInput style={ss.search} placeholder="Order # or customer…" value={search} onChangeText={setSearch} placeholderTextColor={Colors.gray400}/>
      </View>
      <FlatList horizontal showsHorizontalScrollIndicator={false} data={STATUSES} keyExtractor={s=>s}
        style={ss.filterList}
        renderItem={({item:s})=>(
          <TouchableOpacity style={[ss.chip,filter===s&&ss.chipActive]} onPress={()=>setFilter(s)}>
            <Text style={[ss.chipTxt,filter===s&&ss.chipActiveTxt]}>{LABEL[s]||s} ({orders.filter(o=>s==='ALL'||o.status===s).length})</Text>
          </TouchableOpacity>
        )}
      />
      <FlatList data={filtered} keyExtractor={o=>o.id} renderItem={({item})=><OrderCard item={item}/>}
        contentContainerStyle={{padding:12,gap:8,paddingBottom:32}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async()=>{setRef(true);await load();setRef(false);}} tintColor={Colors.primary}/>}
        ListEmptyComponent={<EmptyState icon="📭" title="No orders" subtitle={filter!=='ALL'?`No ${LABEL[filter]} orders`:"Orders appear here when placed"}/>}
      />
    </View>
  );
}
const ss=StyleSheet.create({
  screen:{flex:1,backgroundColor:Colors.background},
  headerBar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingTop:52,paddingBottom:12,backgroundColor:Colors.white,borderBottomWidth:1,borderBottomColor:Colors.border},
  title:{fontSize:FontSize['2xl'],fontWeight:'800',color:Colors.gray900},
  count:{fontSize:FontSize.sm,color:Colors.gray400},
  searchWrap:{padding:12,paddingBottom:0},
  search:{height:40,backgroundColor:Colors.gray100,borderRadius:Radius.full,paddingHorizontal:14,fontSize:FontSize.base,color:Colors.gray900},
  filterList:{paddingHorizontal:12,paddingVertical:10},
  chip:{height:30,paddingHorizontal:12,borderRadius:Radius.full,backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border,justifyContent:'center',marginRight:6},
  chipActive:{backgroundColor:Colors.gray900,borderColor:Colors.gray900},
  chipTxt:{fontSize:FontSize.xs,fontWeight:'600',color:Colors.gray600},
  chipActiveTxt:{color:Colors.white},
  card:{backgroundColor:Colors.white,borderRadius:Radius.lg,padding:14,borderWidth:1,borderColor:Colors.border,...Shadow.sm},
  top:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8},
  num:{fontSize:FontSize.md,fontWeight:'800',color:Colors.gray900},
  meta:{fontSize:FontSize.xs,color:Colors.gray500,marginTop:2},
  itemsRow:{flexDirection:'row',flexWrap:'wrap',gap:5,marginBottom:8},
  itemTag:{fontSize:11,backgroundColor:Colors.gray100,borderRadius:4,paddingVertical:2,paddingHorizontal:7,color:Colors.gray700},
  footer:{flexDirection:'row',alignItems:'center',gap:8},
  time:{flex:1,fontSize:FontSize.xs,color:Colors.gray400},
  amt:{fontSize:FontSize.md,fontWeight:'800',color:Colors.gray900},
  advBtn:{backgroundColor:Colors.primary,paddingVertical:5,paddingHorizontal:12,borderRadius:Radius.md},
  advTxt:{color:Colors.white,fontSize:FontSize.xs,fontWeight:'700'},
});