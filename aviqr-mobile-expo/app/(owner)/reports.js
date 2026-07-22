import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../src/context/AuthContext.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { reportApi } from '../../src/api/index.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Card } from '../../src/components/common/Card.js';
import { Colors, FontSize, Radius, Shadow } from '../../src/theme/index.js';

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthAgoISO = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const W = Dimensions.get('window').width;

export default function Reports() {
  const { user } = useAuth();
  const shopId = useActiveShopId();
  const [stats, setStats]     = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [topItems, setTop]    = useState([]);
  const [offline, setOffline] = useState(false);
  const [range, setRange]     = useState(7);
  const [taxStart] = useState(monthAgoISO());
  const [taxEnd]   = useState(todayISO());
  const [taxTotals, setTaxTotals] = useState(null);
  const [taxLoading, setTaxLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingTax, setExportingTax] = useState(false);

  useEffect(() => { if(shopId) load(); }, [shopId, range]);
  useEffect(() => { if (shopId) loadTax(); }, [shopId]);

  const load = async () => {
    try {
      const [s,r,t] = await Promise.allSettled([
        reportApi.getDaily(shopId), reportApi.getRevenue(shopId,range), reportApi.getTopItems(shopId)
      ]);
      if(s.status==='fulfilled'){setStats(s.value.data.data);setOffline(false);}else setOffline(true);
      if(r.status==='fulfilled') setRevenue(r.value.data.data||[]);
      if(t.status==='fulfilled') setTop(t.value.data.data||[]);
    } catch { setOffline(true); }
  };

  const loadTax = async () => {
    setTaxLoading(true);
    try {
      const res = await reportApi.getTaxReport(shopId, taxStart, taxEnd);
      setTaxTotals(res.data.data?.totals || null);
    } catch { setTaxTotals(null); }
    finally { setTaxLoading(false); }
  };

  const exportTaxReport = async () => {
    setExportingTax(true);
    try {
      const res = await reportApi.exportTaxReport(shopId, taxStart, taxEnd);
      const path = `${FileSystem.cacheDirectory}tax-report-${taxStart}_${taxEnd}.csv`;
      await FileSystem.writeAsStringAsync(path, res.data);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: 'text/csv' });
    } catch { Alert.alert('Could not download tax report'); }
    finally { setExportingTax(false); }
  };

  const exportRevenueCsv = async () => {
    setExportingCsv(true);
    try {
      const rows = [['Date', 'Revenue (₹)', 'Orders'], ...revenue.map(r => [r.date || r.day || '', r.revenue || 0, r.orders || 0])];
      const csv = rows.map(r => r.join(',')).join('\n');
      const path = `${FileSystem.cacheDirectory}aviqr_revenue_${range}d_${todayISO()}.csv`;
      await FileSystem.writeAsStringAsync(path, csv);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: 'text/csv' });
    } catch { Alert.alert('Export failed'); }
    finally { setExportingCsv(false); }
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
    <ScrollView style={ss.screen} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
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
        <View style={ss.chartHeadRow}>
          <Text style={ss.chartTitle}>Revenue trend ({range} days)</Text>
          <TouchableOpacity onPress={exportRevenueCsv} disabled={exportingCsv || !revenue.length}>
            <Text style={ss.exportLink}>{exportingCsv ? '…' : '⬇ CSV'}</Text>
          </TouchableOpacity>
        </View>
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

      <Card style={[ss.chartCard, { marginTop: 12 }]}>
        <View style={ss.chartHeadRow}>
          <Text style={ss.chartTitle}>Tax report (GST)</Text>
          <TouchableOpacity onPress={exportTaxReport} disabled={exportingTax || taxLoading}>
            <Text style={ss.exportLink}>{exportingTax ? '…' : '⬇ CSV'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={ss.taxRange}>{taxStart} → {taxEnd} (last 30 days)</Text>
        {taxLoading ? <Text style={ss.kpiLabel}>Loading…</Text> : taxTotals ? (
          <View style={ss.taxGrid}>
            <View style={ss.taxCell}><Text style={ss.taxVal}>₹{fmt(taxTotals.subtotal)}</Text><Text style={ss.taxLabel}>Subtotal</Text></View>
            <View style={ss.taxCell}><Text style={ss.taxVal}>₹{fmt(taxTotals.cgst)}</Text><Text style={ss.taxLabel}>CGST</Text></View>
            <View style={ss.taxCell}><Text style={ss.taxVal}>₹{fmt(taxTotals.sgst)}</Text><Text style={ss.taxLabel}>SGST</Text></View>
            <View style={ss.taxCell}><Text style={[ss.taxVal, { color: Colors.primary }]}>₹{fmt(taxTotals.totalAmount)}</Text><Text style={ss.taxLabel}>Total</Text></View>
          </View>
        ) : <Text style={ss.kpiLabel}>No tax data for this period</Text>}
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
  chartHeadRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  chartTitle:{fontSize:FontSize.md,fontWeight:'800',color:Colors.gray900},
  exportLink:{fontSize:FontSize.sm,fontWeight:'700',color:Colors.primary},
  taxRange:{fontSize:FontSize.xs,color:Colors.gray400,marginTop:-8,marginBottom:12},
  taxGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  taxCell:{flexGrow:1,minWidth:'45%',alignItems:'center',backgroundColor:Colors.gray50,borderRadius:Radius.md,paddingVertical:12},
  taxVal:{fontSize:FontSize.lg,fontWeight:'800',color:Colors.gray900},
  taxLabel:{fontSize:FontSize.xs,color:Colors.gray500,marginTop:2},
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