import { useState, useEffect } from 'react';
import { Download, RefreshCw, FileText } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import StatCard from '../components/StatCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useActiveShopId } from '../hooks/useActiveShopId.js';
import { reportApi } from '../api/index.js';
import './Reports.css';

const RANGES = [{l:'7D',v:7},{l:'14D',v:14},{l:'30D',v:30}];
const CAT_COLORS = ['#1D9E75','#2563EB','#7C3AED','#D97706','#DC2626'];

export default function Reports() {
  const { user } = useAuth();
  const shopId = useActiveShopId();
  const [stats,    setStats]    = useState(null);
  const [revenue,  setRevenue]  = useState([]);
  const [topItems, setTop]      = useState([]);
  const [peakHrs,  setPeak]     = useState([]);
  const [catData,  setCat]      = useState([]);
  const [range,    setRange]    = useState(7);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const today = new Date().toISOString().slice(0,10);
  const monthAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10);
  const [taxStart,   setTaxStart]   = useState(monthAgo);
  const [taxEnd,     setTaxEnd]     = useState(today);
  const [taxRows,    setTaxRows]    = useState([]);
  const [taxTotals,  setTaxTotals]  = useState(null);
  const [taxLoading, setTaxLoading] = useState(true);
  const [exporting,  setExporting]  = useState(false);

  useEffect(() => { load(); }, [range, shopId]);
  useEffect(() => { loadTax(); }, [taxStart, taxEnd, shopId]);

  const loadTax = async () => {
    if (!shopId) return;
    setTaxLoading(true);
    try {
      const res = await reportApi.getTaxReport(shopId, taxStart, taxEnd);
      setTaxRows(res.data.data?.rows || []);
      setTaxTotals(res.data.data?.totals || null);
    } catch { setTaxRows([]); setTaxTotals(null); }
    finally { setTaxLoading(false); }
  };

  const downloadTaxReport = async () => {
    setExporting(true);
    try { await reportApi.exportTaxReport(shopId, taxStart, taxEnd); }
    catch { alert('Could not download tax report'); }
    finally { setExporting(false); }
  };

  const load = async () => {
    if (!shopId) { setError('No shop linked to this account'); setLoading(false); return; }
    setError(null);
    try {
      const [s, r, t, p] = await Promise.allSettled([
        reportApi.getDaily(shopId),
        reportApi.getRevenue(shopId, range),
        reportApi.getTopItems(shopId),
        reportApi.getPeakHours(shopId),
      ]);
      if (s.status === 'fulfilled') setStats(s.value.data.data);
      else setError('Could not load stats');
      if (r.status === 'fulfilled') {
        const d = r.value.data.data || [];
        setRevenue(d.map(x => ({ date: x.date?.slice(5)||x.day||'', revenue: Number(x.revenue||0), orders: Number(x.orders||0) })));
      }
      if (t.status === 'fulfilled') {
        const d = t.value.data.data || [];
        setTop(d);
        // Build category split from top items if no category data
        const catMap = {};
        d.forEach(i => { const c = i.category||'Other'; catMap[c] = (catMap[c]||0) + Number(i.revenue||0); });
        setCat(Object.entries(catMap).map(([name,value]) => ({ name, value })));
      }
      if (p.status === 'fulfilled') {
        const d = p.value.data.data || [];
        setPeak(d.map(x => ({ hour: x.hour, orders: Number(x.order_count||x.orders||0) })));
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const fmt = n => Number(n||0).toLocaleString('en-IN');

  const exportCsv = () => {
    if (!revenue.length) return;
    const rows = [['Date','Revenue (₹)','Orders'],...revenue.map(r=>[r.date,r.revenue,r.orders])];
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `aviqr_revenue_${range}d_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="page-content" style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, gap:10, flexDirection:'column' }}>
      <div style={{ width:28, height:28, border:'3px solid var(--green)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>
      <p style={{ color:'var(--gray-500)', fontSize:13 }}>Loading reports…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="page-content">
      {error && <div className="demo-notice" style={{ background:'var(--red-bg)', borderColor:'#FCA5A5', color:'var(--red)' }}>⚠ {error} <button onClick={load} style={{ fontWeight:700, background:'none', border:'none', cursor:'pointer', color:'var(--red)', textDecoration:'underline' }}>Retry</button></div>}

      <div className="page-header">
        <div><h1 className="page-title">Reports</h1><p className="page-subtitle">Business performance</p></div>
        <div className="page-header-actions">
          <div className="seg-control">
            {RANGES.map(r => <button key={r.v} className={`seg-btn${range===r.v?' is-active':''}`} onClick={() => setRange(r.v)}>{r.l}</button>)}
          </div>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={13}/> Refresh</button>
          <button className="btn btn-secondary" onClick={exportCsv} disabled={!revenue.length} title="Export revenue CSV"><Download size={13}/> Export CSV</button>
        </div>
      </div>

      <div className="kpi-grid">
        <StatCard icon="💰" label="Total Revenue"   value={stats?.totalRevenue   ? `₹${fmt(stats.totalRevenue)}`   : '—'} color="#1D9E75"/>
        <StatCard icon="📦" label="Total Orders"    value={stats?.totalOrders    ?? '—'}                                   color="#2563EB"/>
        <StatCard icon="📊" label="Avg Order Value" value={stats?.avgOrderValue  ? `₹${fmt(stats.avgOrderValue)}`  : '—'} color="#7C3AED"/>
        <StatCard icon="👤" label="New Customers"   value={stats?.newCustomers   ?? '—'}                                   color="#D97706"/>
      </div>

      <div className="grid-2col">
        <div className="card chart-card">
          <div className="card-header"><div><div className="card-title">Revenue trend</div><div className="card-subtitle">Last {range} days</div></div></div>
          <div className="chart-wrap">
            {revenue.length === 0
              ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:220, color:'var(--gray-400)', fontSize:13 }}>No data for this period</div>
              : <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenue} margin={{top:4,right:4,bottom:0,left:-16}}>
                    <defs><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1D9E75" stopOpacity={0.15}/><stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                    <XAxis dataKey="date" tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v/1000}k`}/>
                    <Tooltip formatter={v=>[`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} contentStyle={{borderRadius:8,fontSize:12}}/>
                    <Area type="monotone" dataKey="revenue" stroke="#1D9E75" strokeWidth={2.5} fill="url(#gr)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
            }
          </div>
        </div>

        <div className="card chart-card">
          <div className="card-header"><div><div className="card-title">Peak hours</div><div className="card-subtitle">Orders by time</div></div></div>
          <div className="chart-wrap">
            {peakHrs.length === 0
              ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:220, color:'var(--gray-400)', fontSize:13 }}>No peak hour data</div>
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={peakHrs} margin={{top:4,right:4,bottom:0,left:-16}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                    <XAxis dataKey="hour" tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v=>[v,'Orders']} contentStyle={{borderRadius:8,fontSize:12}}/>
                    <Bar dataKey="orders" fill="#1D9E75" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
            }
          </div>
        </div>
      </div>

      <div className="grid-2col">
        <div className="card">
          <div className="card-header"><div className="card-title">Top selling items</div></div>
          {topItems.length === 0
            ? <p style={{ color:'var(--gray-400)', fontSize:13, padding:'12px 0' }}>No item data yet</p>
            : <ul className="top-items">
                {topItems.slice(0,5).map((item,i) => (
                  <li key={i} className="top-item">
                    <span className="top-item-rank">#{i+1}</span>
                    <div className="top-item-info">
                      <div className="top-item-name">{item.name}</div>
                      <div className="top-item-meta">{item.qty||item.qty_sold||0} sold · ₹{fmt(item.revenue)}</div>
                    </div>
                  </li>
                ))}
              </ul>
          }
        </div>

        <div className="card chart-card">
          <div className="card-header"><div className="card-title">Category split</div></div>
          <div className="chart-wrap" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
            {catData.length === 0
              ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'var(--gray-400)', fontSize:13 }}>No category data</div>
              : <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {catData.map((_,i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]}/>)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} formatter={v=><span style={{fontSize:11}}>{v}</span>}/>
                    <Tooltip formatter={(v,n)=>[`₹${fmt(v)}`, n]} contentStyle={{borderRadius:8,fontSize:12}}/>
                  </PieChart>
                </ResponsiveContainer>
            }
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div><div className="card-title">Tax report</div><div className="card-subtitle">CGST/SGST breakdown for filing — same split shown on your invoices</div></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" className="field-input" style={{ height: 36 }} value={taxStart} max={taxEnd} onChange={e => setTaxStart(e.target.value)} />
            <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>to</span>
            <input type="date" className="field-input" style={{ height: 36 }} value={taxEnd} min={taxStart} max={today} onChange={e => setTaxEnd(e.target.value)} />
            <button className="btn btn-secondary" onClick={downloadTaxReport} disabled={exporting || taxLoading || taxRows.length === 0}>
              <FileText size={13} /> {exporting ? 'Downloading…' : 'Download CSV'}
            </button>
          </div>
        </div>
        {taxLoading ? (
          <p style={{ color: 'var(--gray-400)', fontSize: 13, padding: '12px 0' }}>Loading…</p>
        ) : taxRows.length === 0 ? (
          <p style={{ color: 'var(--gray-400)', fontSize: 13, padding: '12px 0' }}>No orders in this date range</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Date</th><th>Orders</th><th>Subtotal</th><th>CGST</th><th>SGST</th><th>Total Tax</th><th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {taxRows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td>{r.orders}</td>
                    <td>₹{fmt(r.subtotal)}</td>
                    <td>₹{fmt(r.cgst)}</td>
                    <td>₹{fmt(r.sgst)}</td>
                    <td>₹{fmt(r.tax)}</td>
                    <td style={{ fontWeight: 700 }}>₹{fmt(r.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
              {taxTotals && (
                <tfoot>
                  <tr style={{ fontWeight: 800, borderTop: '2px solid var(--gray-200)' }}>
                    <td>Total</td>
                    <td>{taxTotals.orders}</td>
                    <td>₹{fmt(taxTotals.subtotal)}</td>
                    <td>₹{fmt(taxTotals.cgst)}</td>
                    <td>₹{fmt(taxTotals.sgst)}</td>
                    <td>₹{fmt(taxTotals.tax)}</td>
                    <td>₹{fmt(taxTotals.totalAmount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
