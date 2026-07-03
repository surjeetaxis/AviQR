import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useAuth } from '../../src/context/AuthContext.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { reportApi } from '../../src/api/index.js';
import { MOCK_STATS, MOCK_REVENUE, MOCK_TOP_ITEMS } from '../../src/api/mockData.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Card } from '../../src/components/common/Card.js';
import { Colors, FontSize, Radius, Shadow } from '../../src/theme/index.js';

const W = Dimensions.get('window').width;

export default function Reports() {
  const { user } = useAuth();
  const shopId = useActiveShopId() || '00000000-0000-0000-0000-000000000101';
  const [stats, setStats]     = useState(MOCK_STATS);
  const [revenue, setRevenue] = useState(MOCK_REVENUE);
  const [topItems, setTop]    = useState(MOCK_TOP_ITEMS);
  const [offline, setOffline] = useState(false);
  const [range, setRange]     = useState(7);

  useEffect(() => { load(); }, [range]);

  const load = async () => {
    try {
      const [s,r,t] = await Promise.allSettled([
        reportApi.getDaily(shopId), reportApi.getRevenue(shopId,range), reportApi.getTopItems(shopId)
      ]);
      if(s.status==='fulfilled'){setStats(s.value.data.data);setOffline(false);}else setOffline(true);
      if(r.status==='fulfilled') setRevenue(r.value.data.data||MOCK_REVENUE);
      if(t.status==='fulfilled') setTop(t.value.data.data||MOCK_TOP_ITEMS);
    } catch { setOffline(true); }
  };

  const fmt = n => Number(n||0).toLocaleString('en-IN');
  const maxRev = Math.max(...revenue.map(r=>r.revenue||r.orders||0), 1);

  const KPIS = [
    {emoji:'💰',label:"Today's Revenue",value:`₹${fmt(stats?.totalRevenue)}`,color:Colors.primary},
    {emoji:'📦',label:'Orders',          value:stats?.totalOrders??'—',        color:Colors.info},
    {emoji:'📊',label:'Avg Order',        value:`₹${fmt(stats?.avgOrderValue)}`, color:'#7C3AED'},
    {emoji:'👥',label:'New Customers',    value:stats?.newCustomers??'—',       color:Colors.warning},
  ];

  return (
    <ScrollView style={ss.screen} showsVerticalScrollIndicator={false}>
      <View style={ss.header}><Text style={ss.title}>Reports</Text></View>
      {offline&&<OfflineBadge onRetry={load}/>}

      <View style={ss.kpiGrid}>
        {KPIS.map(k=>(
          <View key={k.label} style={[ss.kpiCard,{borderLeftColor:k.color,borderLeftWidth:3}]}>
            <Text style={ss.kpiEmoji}>{k.emoji}</Text>
            <Text style={[ss.kpiVal,{color:k.color}]}>{k.value}</Text>
            <Text style={ss.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      <View style={ss.rangeRow}>
        {[7,14,30].map(d=>(
          <TouchableOpacity key={d} style={[ss.rangeBtn,range===d&&ss.rangeActive]} onPress={()=>setRange(d)}>
            <Text style={[ss.rangeTxt,range===d&&ss.rangeActiveTxt]}>{d}D</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card style={ss.chartCard}>
        <Text style={ss.chartTitle}>Revenue trend ({range} days)</Text>
        <View style={ss.chartWrap}>
          {revenue.slice(-range).map((r,i)=>(
            <View key={i} style={ss.barCol}>
              <View style={[ss.bar,{height:Math.max(4,((r.revenue||0)/maxRev)*120)}]}/>
              <Text style={ss.barLabel}>{(r.date||r.day||'').slice(-5)}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={[ss.chartCard,{marginTop:12}]}>
        <Text style={ss.chartTitle}>Top selling items</Text>
        {topItems.slice(0,5).map((item,i)=>(
          <View key={i} style={ss.topRow}>
            <Text style={ss.topRank}>#{i+1}</Text>
            <Text style={ss.topName} numberOfLines={1}>{item.name}</Text>
            <Text style={ss.topQty}>{item.qty||item.qty_sold||0} sold</Text>
            <Text style={ss.topRev}>₹{fmt(item.revenue)}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
const ss=StyleSheet.create({
  screen:{flex:1,backgroundColor:Colors.background},
  header:{paddingHorizontal:16,paddingTop:52,paddingBottom:12,backgroundColor:Colors.white,borderBottomWidth:1,borderBottomColor:Colors.border},
  title:{fontSize:FontSize['2xl'],fontWeight:'800',color:Colors.gray900},
  kpiGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,padding:12},
  kpiCard:{width:'47%',backgroundColor:Colors.white,borderRadius:Radius.lg,padding:14,...Shadow.sm},
  kpiEmoji:{fontSize:22,marginBottom:6},
  kpiVal:{fontSize:FontSize['3xl'],fontWeight:'800'},
  kpiLabel:{fontSize:FontSize.xs,color:Colors.gray400,marginTop:4},
  rangeRow:{flexDirection:'row',gap:8,paddingHorizontal:12,marginBottom:4},
  rangeBtn:{flex:1,height:34,borderRadius:Radius.md,backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border,alignItems:'center',justifyContent:'center'},
  rangeActive:{backgroundColor:Colors.gray900,borderColor:Colors.gray900},
  rangeTxt:{fontSize:FontSize.sm,fontWeight:'700',color:Colors.gray500},
  rangeActiveTxt:{color:Colors.white},
  chartCard:{margin:12,padding:14},
  chartTitle:{fontSize:FontSize.md,fontWeight:'800',color:Colors.gray900,marginBottom:12},
  chartWrap:{flexDirection:'row',alignItems:'flex-end',height:140,gap:4},
  barCol:{flex:1,alignItems:'center',justifyContent:'flex-end',gap:4},
  bar:{width:'70%',backgroundColor:Colors.primary,borderRadius:3,minHeight:4},
  barLabel:{fontSize:9,color:Colors.gray400,textAlign:'center'},
  topRow:{flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:Colors.gray100},
  topRank:{width:28,fontSize:FontSize.base,fontWeight:'800',color:Colors.gray400},
  topName:{flex:1,fontSize:FontSize.sm,fontWeight:'600',color:Colors.gray900},
  topQty:{fontSize:FontSize.xs,color:Colors.gray400,marginRight:8},
  topRev:{fontSize:FontSize.sm,fontWeight:'800',color:Colors.primary},
});