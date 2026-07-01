import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, ShoppingBag, Users, Clock, ArrowRight, Plus, QrCode, RefreshCw, Bell, AlertTriangle, Package, ChevronRight, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';
import StatCard from '../components/StatCard.jsx';
import OrderRow from '../components/OrderRow.jsx';
import Onboarding from '../components/Onboarding.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useActiveShopId } from '../hooks/useActiveShopId.js';
import { reportApi, orderApi, inventoryApi } from '../api/index.js';
import './Dashboard.css';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { outletId } = useParams();
  const shopId = useActiveShopId();

  // Capture onboarding state once at mount — stays true through all wizard steps
  // even after linkShop updates user.shopId, so the wizard isn't unmounted early.
  // When managing a hotel outlet, shopId resolves asynchronously (outlet fetch) and
  // is guaranteed to exist once the route exists, so never gate on its transient
  // pre-fetch undefined value — gate on the (synchronous) outletId route param instead.
  const [showOnboarding, setShowOnboarding] = useState(!outletId && !shopId);

  const [stats,    setStats]    = useState(null);
  const [revenue,  setRevenue]  = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [topItems, setTop]      = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [lastRefresh, setLast]  = useState(new Date());

  const load = useCallback(async () => {
    if (!shopId) { setLoading(false); return; }
    setError(null);
    try {
      const [s, r, o, t, ls] = await Promise.allSettled([
        reportApi.getDaily(shopId),
        reportApi.getRevenue(shopId, 7),
        orderApi.getLiveOrders(shopId),
        reportApi.getTopItems(shopId),
        inventoryApi.getLowStock(shopId),
      ]);
      if (s.status === 'fulfilled') setStats(s.value.data.data);
      else setError('Stats unavailable — ' + (s.reason?.response?.data?.message || 'check backend'));
      if (r.status === 'fulfilled') {
        const d = r.value.data.data || [];
        setRevenue(d.map(x => ({ day: x.date?.slice(5) || x.day || '', revenue: Number(x.revenue || 0), orders: Number(x.orders || 0) })));
      }
      if (o.status === 'fulfilled') setOrders(o.value.data.data || []);
      if (t.status === 'fulfilled') setTop(t.value.data.data || []);
      if (ls.status === 'fulfilled') setLowStock(ls.value.data.data || []);
      setLast(new Date());
    } catch (e) {
      setError('Dashboard error: ' + (e.message || 'unknown'));
    } finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const activeOrders = orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status));

  if (showOnboarding) return <Onboarding onComplete={() => { setShowOnboarding(false); load(); }} />;

  if (loading) return (
    <div className="page-loading">
      <div className="spinner" />
      <p>Loading dashboard…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinner{width:32px;height:32px;border:3px solid var(--green);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}`}</style>
    </div>
  );

  const QUICK_ACTIONS = [
    { icon:'📋', title:'Menu',       desc:'Add or edit dishes',      href:'/menu',     color:'#1D9E75' },
    { icon:'📱', title:'QR Codes',   desc:'Generate & print QR',     href:'/qr-codes', color:'#2563EB' },
    { icon:'👥', title:'Staff',      desc:'Manage your team',        href:'/staff',    color:'#7C3AED' },
    { icon:'📊', title:'Reports',    desc:'Revenue & analytics',     href:'/reports',  color:'#D97706' },
    { icon:'⚙️', title:'Settings',   desc:'Shop profile & billing',  href:'/settings', color:'#6B7280' },
    { icon:'🤖', title:'AI Features',desc:'11 AI tools for growth',  href:'/ai',       color:'#DC2626' },
  ];

  return (
    <div className="dashboard">

      {/* Error banner */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom:16 }}>
          <AlertTriangle size={15} /> {error}
          <button onClick={load} className="alert-retry">Retry</button>
        </div>
      )}

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="alert alert-warn" style={{ marginBottom:16, cursor:'pointer' }} onClick={() => nav('/menu')}>
          <Package size={15} />
          <strong>{lowStock.length} items</strong> running low or out of stock —
          {lowStock.slice(0, 2).map(i => ` ${i.name}`).join(',')}
          {lowStock.length > 2 && ` +${lowStock.length - 2} more`}
          <ChevronRight size={14} style={{ marginLeft:'auto' }} />
        </div>
      )}

      {/* Live ticker */}
      <div className="live-ticker">
        <div className="live-ticker-pulse" />
        <p className="live-ticker-text">
          <strong>{greeting()}, {user?.name?.split(' ')[0] || 'there'} 👋</strong>
          &nbsp;·&nbsp;{activeOrders.length} active order{activeOrders.length !== 1 ? 's' : ''} right now
          &nbsp;·&nbsp;Last updated {lastRefresh.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
        </p>
        <button className="live-ticker-link" onClick={load}><RefreshCw size={11} /> Refresh</button>
        <button className="live-ticker-link" onClick={() => nav('/orders')}>View orders <ArrowRight size={12} /></button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <StatCard icon="💰" label="Today's Revenue"   value={stats?.totalRevenue  ? `₹${fmt(stats.totalRevenue)}`  : '—'} color="#1D9E75" up sub={stats?.totalOrders ? `${stats.totalOrders} orders today` : 'No orders yet'} />
        <StatCard icon="📦" label="Active Orders"     value={activeOrders.length ?? '—'}                                   color="#2563EB" sub={`${orders.filter(o => o.status === 'NEW').length} awaiting acceptance`} />
        <StatCard icon="📊" label="Avg Order Value"   value={stats?.avgOrderValue ? `₹${fmt(stats.avgOrderValue)}` : '—'} color="#7C3AED" sub="Today" />
        <StatCard icon="👤" label="New Customers"     value={stats?.newCustomers  ?? '—'}                                   color="#D97706" sub="Today" />
      </div>

      {/* Charts row */}
      <div className="grid-2col">
        <div className="card chart-card">
          <div className="card-header">
            <div><div className="card-title">Revenue — last 7 days</div><div className="card-subtitle">Auto-refreshes every 30s</div></div>
            <button className="btn-link" onClick={() => nav('/reports')}>Full report <ArrowRight size={13} /></button>
          </div>
          <div className="chart-wrap">
            {revenue.length === 0
              ? <div className="chart-empty">📈 Revenue chart appears after first orders</div>
              : <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenue} margin={{ top:4, right:4, bottom:0, left:-16 }}>
                    <defs>
                      <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? Math.round(v/1000)+'k' : v}`} />
                    <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} contentStyle={{ borderRadius:8, fontSize:12, border:'1px solid #e5e7eb' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#1D9E75" strokeWidth={2.5} fill="url(#gr)" dot={false} activeDot={{ r:4, fill:'#1D9E75' }} />
                  </AreaChart>
                </ResponsiveContainer>
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Top items today</div><div className="card-subtitle">By revenue</div></div>
            <button className="btn-link" onClick={() => nav('/menu')}>Manage menu <ArrowRight size={13} /></button>
          </div>
          {topItems.length === 0
            ? <div className="empty-state-sm">Top items appear after first orders</div>
            : <ul className="top-items">
                {topItems.slice(0, 6).map((item, i) => (
                  <li key={i} className="top-item">
                    <span className="top-item-rank" style={{ background: i < 3 ? '#1D9E75' : '#f3f4f6', color: i < 3 ? '#fff' : '#6b7280' }}>#{i + 1}</span>
                    <div className="top-item-info">
                      <div className="top-item-name">{item.name}</div>
                      <div className="top-item-meta">{item.qty || item.qty_sold || 0} sold · ₹{fmt(item.revenue)}</div>
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
          <div>
            <div className="card-title">Live orders</div>
            <div className="card-subtitle">{activeOrders.length} active · auto-refreshing</div>
          </div>
          <button className="btn-link" onClick={() => nav('/orders')}>View all <ArrowRight size={13} /></button>
        </div>
        <div className="order-list">
          {orders.length === 0
            ? (
              <div style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🎉</div>
                <p style={{ fontSize:14 }}>No active orders right now</p>
                <p style={{ fontSize:12, marginTop:4 }}>Orders appear here in real-time as customers scan your QR code</p>
              </div>
            )
            : orders.slice(0, 5).map(o => (
                <OrderRow key={o.id} order={o} onAdvance={async (ord, next) => {
                  try { await orderApi.updateStatus(ord.id, next); await load(); }
                  catch (e) { console.error('Status update failed:', e); }
                }} />
              ))
          }
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ marginTop:8 }}>
        <div className="card-title" style={{ marginBottom:12, fontSize:15 }}>Quick actions</div>
        <div className="grid-3col">
          {QUICK_ACTIONS.map(a => (
            <button key={a.href} className="quick-action" onClick={() => nav(a.href)}>
              <div className="quick-action-icon" style={{ background: a.color + '18' }}>
                <span style={{ fontSize:20 }}>{a.icon}</span>
              </div>
              <div className="quick-action-body">
                <div className="quick-action-title">{a.title}</div>
                <div className="quick-action-desc">{a.desc}</div>
                <span className="quick-action-cta" style={{ color: a.color }}>Open →</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .page-loading{display:flex;align-items:center;justify-content:center;height:400px;flex-direction:column;gap:12px;color:var(--gray-500);font-size:14px}
        .alert{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;font-size:13px;border:1px solid}
        .alert-error{background:var(--red-bg);border-color:#FCA5A5;color:var(--red)}
        .alert-warn{background:#FFFBEB;border-color:#FDE68A;color:#92400E}
        .alert-retry{background:none;border:none;cursor:pointer;font-weight:700;text-decoration:underline;color:inherit;margin-left:8px}
        .chart-empty,.empty-state-sm{display:flex;align-items:center;justify-content:center;height:200px;color:var(--gray-400);font-size:13px;text-align:center}
      `}</style>
    </div>
  );
}
