import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, ShoppingBag, Users, Clock, ArrowRight, Plus, QrCode, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard.jsx';
import OrderRow from '../components/OrderRow.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { reportApi, orderApi } from '../api/index.js';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const shopId = user?.shopId;

  const [stats,   setStats]   = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [orders,  setOrders]  = useState([]);
  const [topItems,setTop]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    if (!shopId) { setError('No shop linked to this account'); setLoading(false); return; }
    setError(null);
    try {
      const [s, r, o, t] = await Promise.allSettled([
        reportApi.getDaily(shopId),
        reportApi.getRevenue(shopId, 7),
        orderApi.getLiveOrders(shopId),
        reportApi.getTopItems(shopId),
      ]);
      if (s.status === 'fulfilled') setStats(s.value.data.data);
      else setError('Could not load stats — ' + (s.reason?.response?.data?.message || 'backend error'));

      if (r.status === 'fulfilled') {
        const d = r.value.data.data || [];
        setRevenue(d.map(x => ({ day: x.date?.slice(5) || x.day || '', revenue: Number(x.revenue||0), orders: Number(x.orders||0) })));
      }
      if (o.status === 'fulfilled') setOrders(o.value.data.data || []);
      if (t.status === 'fulfilled') setTop(t.value.data.data || []);
    } catch (e) {
      setError('Failed to load dashboard: ' + (e.message || 'unknown error'));
    } finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400, flexDirection:'column', gap:12 }}>
      <div style={{ width:32, height:32, border:'3px solid var(--green)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>
      <p style={{ color:'var(--gray-500)', fontSize:14 }}>Loading dashboard…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ padding:'32px 0' }}>
      <div className="demo-notice" style={{ background:'var(--red-bg)', borderColor:'#FCA5A5', color:'var(--red)' }}>
        ⚠ {error}
        <button onClick={load} style={{ marginLeft:12, fontWeight:700, background:'none', border:'none', cursor:'pointer', color:'var(--red)', textDecoration:'underline' }}>Retry</button>
      </div>
    </div>
  );

  const QUICK_ACTIONS = [
    { icon:'📋', title:'Add menu item',     desc:'Add or update dishes',   cta:'Open menu →',  href:'/menu',     cls:'icon-green' },
    { icon:'📱', title:'Generate QR codes', desc:'Print table QR codes',   cta:'Manage QRs →', href:'/qr-codes', cls:'icon-blue' },
    { icon:'👥', title:'Manage staff',      desc:'Add staff, set roles',   cta:'View team →',  href:'/staff',    cls:'icon-purple' },
  ];

  return (
    <div className="dashboard">
      {/* Live ticker */}
      <div className="live-ticker">
        <div className="live-ticker-pulse" />
        <p className="live-ticker-text">
          <strong>{orders.filter(o => !['COMPLETED','CANCELLED'].includes(o.status)).length} live orders</strong> right now. Auto-refreshing every 30s.
        </p>
        <button className="live-ticker-link" onClick={load}><RefreshCw size={11}/> Refresh</button>
        <button className="live-ticker-link" onClick={() => nav('/orders')}>View all <ArrowRight size={12}/></button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <StatCard icon="💰" label="Today's Revenue"    value={stats?.totalRevenue     ? `₹${fmt(stats.totalRevenue)}`   : '—'} color="#1D9E75" up sub={stats?.totalOrders ? `${stats.totalOrders} orders` : ''} />
        <StatCard icon="📦" label="Orders Today"       value={stats?.totalOrders      ?? '—'}                                  color="#2563EB" up sub={`${orders.filter(o=>o.status==='NEW').length} new`} />
        <StatCard icon="📊" label="Avg Order Value"    value={stats?.avgOrderValue    ? `₹${fmt(stats.avgOrderValue)}`  : '—'} color="#7C3AED" />
        <StatCard icon="👤" label="New Customers"      value={stats?.newCustomers     ?? '—'}                                  color="#D97706" />
      </div>

      {/* Charts row */}
      <div className="grid-2col">
        <div className="card chart-card">
          <div className="card-header">
            <div><div className="card-title">Revenue trend</div><div className="card-subtitle">Last 7 days</div></div>
            <button className="btn-link" onClick={() => nav('/reports')}>Full report <ArrowRight size={13}/></button>
          </div>
          <div className="chart-wrap">
            {revenue.length === 0
              ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'var(--gray-400)', fontSize:13 }}>No revenue data yet</div>
              : <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenue} margin={{top:4,right:4,bottom:0,left:-16}}>
                    <defs>
                      <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                    <XAxis dataKey="day" tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v/1000}k`}/>
                    <Tooltip formatter={v=>[`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} contentStyle={{borderRadius:8,fontSize:12}}/>
                    <Area type="monotone" dataKey="revenue" stroke="#1D9E75" strokeWidth={2.5} fill="url(#gr)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Top items</div><div className="card-subtitle">By revenue today</div></div>
          </div>
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
      </div>

      {/* Live orders */}
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Live orders</div><div className="card-subtitle">{orders.filter(o=>!['COMPLETED','CANCELLED'].includes(o.status)).length} active</div></div>
          <button className="btn-link" onClick={() => nav('/orders')}>View all <ArrowRight size={13}/></button>
        </div>
        <div className="order-list">
          {orders.length === 0
            ? <p style={{ textAlign:'center', color:'var(--gray-400)', padding:'24px', fontSize:14 }}>🎉 No active orders right now</p>
            : orders.slice(0,6).map(o => (
                <OrderRow key={o.id} order={o} onAdvance={async (ord, next) => {
                  try { await orderApi.updateStatus(ord.id, next); await load(); }
                  catch (e) { console.error('Advance failed:', e); }
                }}/>
              ))
          }
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid-3col">
        {QUICK_ACTIONS.map(a => (
          <button key={a.href} className="quick-action" onClick={() => nav(a.href)}>
            <div className={`quick-action-icon ${a.cls}`}><span style={{ fontSize:18 }}>{a.icon}</span></div>
            <div className="quick-action-body">
              <div className="quick-action-title">{a.title}</div>
              <div className="quick-action-desc">{a.desc}</div>
              <span className="quick-action-cta">{a.cta} <ArrowRight size={11}/></span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
