import { useState, useEffect } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import StatCard from '../components/StatCard.jsx';
import Pagination from '../components/shared/Pagination.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { reportApi } from '../api/index.js';
import './Reports.css';

const RANGES = [{l:'7D',v:7},{l:'14D',v:14},{l:'30D',v:30}];
const CAT_COLORS = ['#1D9E75','#2563EB','#7C3AED','#D97706','#DC2626'];

export default function Reports() {
  const { user } = useAuth();
  const shopId = user?.shopId;
  const [stats,    setStats]    = useState(null);
  const [revenue,  setRevenue]  = useState([]);
  const [topItems, setTop]      = useState([]);
  const [peakHrs,  setPeak]     = useState([]);
  const [catData,  setCat]      = useState([]);
  const [range,    setRange]    = useState(7);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Paginated daily snapshot history (Reports pagination requirement)
  const [history,    setHistory]    = useState(null); // Page<ReportSnapshot> | null
  const [historyPage, setHistoryPage] = useState(0);
  const [historySize, setHistorySize] = useState(10);

  useEffect(() => { load(); }, [range, shopId]);

  useEffect(() => {
    if (!shopId) return;
    reportApi.getHistory(shopId, { page: historyPage, size: historySize, sort: 'report_date', dir: 'desc' })
      .then(res => setHistory(res.data.data))
      .catch(() => setHistory(null));
  }, [shopId, historyPage, historySize]);

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

      <div className="card">
        <div className="card-header"><div><div className="card-title">Daily report history</div><div className="card-subtitle">Every day's snapshot, paginated</div></div></div>
        {!history ? (
          <p style={{ color:'var(--gray-400)', fontSize:13, padding:'12px 0' }}>No history available</p>
        ) : (
          <>
            <table className="admin-table">
              <thead><tr><th>Date</th><th>Revenue</th><th>Orders</th><th>Avg order value</th><th>New customers</th><th>Top item</th><th>Peak hour</th></tr></thead>
              <tbody>
                {history.content.map((row,i) => (
                  <tr key={i}>
                    <td>{row.report_date}</td>
                    <td style={{fontWeight:700}}>₹{fmt(row.total_revenue)}</td>
                    <td>{row.total_orders}</td>
                    <td>₹{fmt(row.avg_order_value)}</td>
                    <td>{row.new_customers}</td>
                    <td>{row.top_item}</td>
                    <td>{row.peak_hour}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={history} onPageChange={setHistoryPage} onSizeChange={s=>{setHistorySize(s);setHistoryPage(0);}}/>
          </>
        )}
      </div>
    </div>
  );
}
