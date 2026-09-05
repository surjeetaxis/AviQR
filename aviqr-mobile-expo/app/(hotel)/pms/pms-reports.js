import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { hotelApi, pmsApi } from '../../../src/api/index.js';
import { PageHeader } from '../../../src/components/common/PageHeader.js';
import { Card } from '../../../src/components/common/Card.js';
import { Colors, FontSize, Spacing } from '../../../src/theme/index.js';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

export default function PmsReportsScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [report, setReport] = useState(null);
  const [range, setRange] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [chainReport, setChainReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (hId, chainId) => {
    const date = today();
    const [r, rg, rev, cr] = await Promise.allSettled([
      pmsApi.nightAudit(hId, date), pmsApi.nightAuditRange(hId, daysAgo(6), date), pmsApi.revenueReport(hId, daysAgo(29), date),
      chainId ? pmsApi.chainNightAudit(chainId, date) : Promise.resolve(null),
    ]);
    if (r.status === 'fulfilled') setReport(r.value.data.data);
    if (rg.status === 'fulfilled') setRange(rg.value.data.data || []);
    if (rev.status === 'fulfilled') setRevenue(rev.value.data.data);
    if (cr.status === 'fulfilled') setChainReport(cr.value?.data.data || null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hRes = await hotelApi.getMyHotels();
        const hotel = (hRes.data.data || [])[0];
        if (!hotel) return;
        setHotelId(hotel.id);
        await load(hotel.id, hotel.chainId);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [load]);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Night Audit & Reports" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Night Audit & Reports" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.sub}>Occupancy, ADR/RevPAR, and arrivals/departures for tonight.</Text>

        {report && (
          <View style={ss.kpiGrid}>
            <Kpi value={`${report.occupancyPercent}%`} label={`Occupancy (${report.roomsSold}/${report.totalRooms})`} />
            <Kpi value={`₹${Number(report.adr).toLocaleString('en-IN')}`} label="ADR" />
            <Kpi value={`₹${Number(report.revPar).toLocaleString('en-IN')}`} label="RevPAR" />
            <Kpi value={`₹${Number(report.roomRevenue).toLocaleString('en-IN')}`} label="Room revenue" />
            <Kpi value={report.arrivals} label="Arrivals" />
            <Kpi value={report.departures} label="Departures" />
            <Kpi value={report.noShows} label="No-shows" />
            <Kpi value={report.cancellations} label="Cancellations" />
          </View>
        )}

        {chainReport && (
          <>
            <Text style={ss.cardTitle}>Chain-wide (all properties combined)</Text>
            <View style={ss.kpiGrid}>
              <Kpi value={`${chainReport.occupancyPercent}%`} label={`Occupancy (${chainReport.roomsSold}/${chainReport.totalRooms})`} />
              <Kpi value={`₹${Number(chainReport.adr).toLocaleString('en-IN')}`} label="ADR" />
              <Kpi value={`₹${Number(chainReport.revPar).toLocaleString('en-IN')}`} label="RevPAR" />
              <Kpi value={`₹${Number(chainReport.roomRevenue).toLocaleString('en-IN')}`} label="Room revenue" />
            </View>
            <Card style={{ marginBottom: 16 }}>
              {chainReport.hotels.map(h => (
                <View key={h.hotelId} style={ss.row}>
                  <Text style={ss.rowLabel}>{h.hotelName}</Text>
                  <Text style={ss.rowMeta}>{h.report.occupancyPercent}% ({h.report.roomsSold}/{h.report.totalRooms}) · ₹{Number(h.report.roomRevenue).toLocaleString('en-IN')}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        <Text style={ss.cardTitle}>Last 7 nights</Text>
        <Card style={{ marginBottom: 16 }}>
          {range.map(r => (
            <View key={r.date} style={ss.row}>
              <Text style={ss.rowLabel}>{r.date}</Text>
              <Text style={ss.rowMeta}>{r.occupancyPercent}% · ₹{Number(r.roomRevenue).toLocaleString('en-IN')}</Text>
            </View>
          ))}
          {range.length === 0 && <Text style={ss.emptyTxt}>No data.</Text>}
        </Card>

        <Text style={ss.cardTitle}>Revenue — last 30 days</Text>
        <RevenueBlock title="By room type" rows={revenue?.byRoomType} />
        <RevenueBlock title="By source" rows={revenue?.bySource} />
        <RevenueBlock title="By payment method" rows={revenue?.byPaymentMethod} />
      </ScrollView>
    </View>
  );
}

function Kpi({ value, label }) {
  return (
    <View style={ss.kpi}>
      <Text style={ss.kpiValue}>{value}</Text>
      <Text style={ss.kpiLabel}>{label}</Text>
    </View>
  );
}

function RevenueBlock({ title, rows }) {
  return (
    <Card style={{ marginBottom: 12 }}>
      <Text style={ss.blockTitle}>{title}</Text>
      {(rows || []).map(r => (
        <View key={r.label} style={ss.row}>
          <Text style={ss.rowLabel}>{r.label}</Text>
          <Text style={ss.rowMeta}>₹{Number(r.amount).toLocaleString('en-IN')}</Text>
        </View>
      ))}
      {(!rows || rows.length === 0) && <Text style={ss.emptyTxt}>No data.</Text>}
    </Card>
  );
}

const ss = StyleSheet.create({
  sub: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 14 },
  cardTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 10 },
  blockTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray900, marginBottom: 8 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  kpi: { width: '31%', backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 10, alignItems: 'center' },
  kpiValue: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  kpiLabel: { fontSize: 10, color: Colors.gray500, marginTop: 2, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.border },
  rowLabel: { fontSize: FontSize.sm, color: Colors.gray900, fontWeight: '600' },
  rowMeta: { fontSize: FontSize.sm, color: Colors.gray700, fontWeight: '700' },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 8 },
});
