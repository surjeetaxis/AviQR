import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { LangPicker, useLang } from '../../components/shared/LangPicker.jsx';
import { t } from '../../i18n/translations.js';
import {
  Users, Store, ShoppingBag, CreditCard, QrCode, BarChart2,
  Shield, LogOut, Settings, Search, Bell, Hotel,
  Building2, Package, TrendingUp, Eye, Trash2, CheckCircle2,
  XCircle, Edit2, Menu as MenuIcon, Plus,
  Download, RefreshCw, ToggleLeft, ToggleRight,
  Lock, Unlock, Star, Send, AlertTriangle, ChevronLeft, ChevronRight,
  BadgeCheck, Clock, Zap, Crown, ScanLine, ExternalLink
} from 'lucide-react';
import { authApi, reportApi, shopApi, hotelApi, mallApi, orderApi, paymentApi, qrApi } from '../../api/index.js';
import '../admin/Admin.css';
import './AdminExtra.css';

const ROLES_ALL = ['owner','manager','cashier','kitchen','admin','support','supplier','hotel','mall','customer'];

const PLANS = {
  STARTER:    { label:'Starter',    color:'#6B7280', bg:'#F3F4F6', price:0       },
  GROWTH:     { label:'Growth',     color:'#059669', bg:'#DCFCE7', price:999     },
  BUSINESS:   { label:'Business',   color:'#7C3AED', bg:'#EDE9FE', price:2499   },
  ENTERPRISE: { label:'Enterprise', color:'#D97706', bg:'#FEF3C7', price:0       },
};

function planInfo(p) { return PLANS[p?.toUpperCase()] || PLANS.STARTER; }

const NAV = [
  {key:'overview',      label:'Overview',      icon:BarChart2},
  {key:'users',         label:'Users',         icon:Users},
  {key:'shops',         label:'Shops',         icon:Store},
  {key:'hotels',        label:'Hotels',        icon:Hotel},
  {key:'malls',         label:'Malls',         icon:Building2},
  {key:'suppliers',     label:'Suppliers',     icon:Package},
  {key:'orders',        label:'Orders',        icon:ShoppingBag},
  {key:'payments',      label:'Payments',      icon:CreditCard},
  {key:'qrcodes',       label:'QR Codes',      icon:QrCode},
  {key:'subscription',  label:'Subscriptions', icon:Star},
  {key:'reports',       label:'Reports',       icon:TrendingUp},
  {key:'settings',      label:'Settings',      icon:Settings},
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [platformStats, setPlatformStats] = useState(null);
  const [userStats, setUserStats] = useState(null);

  const loadPlatform = useCallback(async () => {
    try {
      const [ps, us] = await Promise.allSettled([
        reportApi.getPlatform(),
        authApi.getUserStats(),
      ]);
      if (ps.status === 'fulfilled') setPlatformStats(ps.value.data?.data);
      if (us.status === 'fulfilled') setUserStats(us.value.data?.data);
    } catch {}
  }, []);

  useEffect(() => { loadPlatform(); }, [loadPlatform]);

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <QrCode size={18} style={{ color: '#5DCAA5' }}/>
            <span className="admin-brand-name">Avi<em>QR</em></span>
            <span className="admin-role-tag">ADMIN</span>
          </div>
        </div>
        <div className="admin-user-card">
          <div className="admin-avatar">{user?.name?.[0] || 'A'}</div>
          <div>
            <div className="admin-user-name">{user?.name || 'Admin'}</div>
            <div className="admin-user-role">Super Administrator</div>
          </div>
        </div>
        <nav className="admin-nav">
          {NAV.map(n => (
            <button key={n.key} className={`admin-nav-item ${tab === n.key ? 'active' : ''}`}
              onClick={() => { setTab(n.key); setSidebarOpen(false); }}>
              <n.icon size={16}/> <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button className="admin-logout" onClick={() => { logout(); navigate('/'); }}>
            <LogOut size={14}/> {t('logout', lang)}
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-mobile-menu" onClick={() => setSidebarOpen(o => !o)}><MenuIcon size={20}/></button>
          <div className="admin-topbar-search" style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--gray-400)' }}/>
            <input style={{ paddingLeft: 32 }} placeholder={t('search', lang)}/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
            <LangPicker/>
            <button className="admin-icon-btn"><Bell size={18}/></button>
            <div className="admin-avatar sm">{user?.name?.[0] || 'A'}</div>
          </div>
        </header>

        <main className="admin-content">
          {tab === 'overview'     && <AdminOverview ps={platformStats} us={userStats} onNav={setTab} onRefresh={loadPlatform}/>}
          {tab === 'users'        && <LiveUsersPage/>}
          {tab === 'shops'        && <AdminShopsPage/>}
          {tab === 'hotels'       && <AdminHotelsPage/>}
          {tab === 'malls'        && <AdminMallsPage/>}
          {tab === 'suppliers'    && <AdminSuppliersPage/>}
          {tab === 'orders'       && <AdminOrdersPage/>}
          {tab === 'payments'     && <AdminPaymentsPage/>}
          {tab === 'qrcodes'      && <AdminQRCodesPage/>}
          {tab === 'subscription' && <AdminSubscriptionManagement/>}
          {tab === 'reports'      && <AdminReports/>}
          {tab === 'settings'     && <AdminSettings/>}
        </main>
      </div>
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────
function AdminOverview({ ps, us, onNav, onRefresh }) {
  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const KPIs = [
    { label: 'Active shops',     value: ps ? fmt(ps.activeShops || 0)     : '—', icon: Store,       color: 'green',  key: 'shops' },
    { label: "Today's orders",   value: ps ? fmt(ps.todayOrders || 0)     : '—', icon: ShoppingBag, color: 'purple', key: 'orders' },
    { label: "Today's revenue",  value: ps ? `₹${fmt(ps.todayRevenue||0)}`: '—', icon: CreditCard,  color: 'amber',  key: 'payments' },
    { label: 'Total orders',     value: ps ? fmt(ps.totalOrders || 0)     : '—', icon: TrendingUp,  color: 'blue',   key: 'reports' },
    { label: 'Total revenue',    value: ps ? `₹${fmt(ps.totalRevenue||0)}`: '—', icon: BarChart2,   color: 'green',  key: 'reports' },
    { label: 'Avg order value',  value: ps ? `₹${fmt(ps.avgOrderValue||0)}`: '—',icon: Shield,      color: 'blue',   key: 'reports' },
  ];

  return (
    <div className="admin-overview">
      <div className="page-header">
        <div><h1 className="page-title">Platform Overview</h1><p className="page-subtitle">Live data</p></div>
        <button className="btn-refresh" onClick={onRefresh}><RefreshCw size={13}/> Refresh</button>
      </div>

      {!ps && (
        <div className="demo-notice" style={{ marginBottom: 16 }}>
          ℹ Backend not reachable — connect your API to see live platform stats.
        </div>
      )}

      <div className="admin-kpi-grid">
        {KPIs.map(k => (
          <button key={k.label} className="admin-kpi-card" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => onNav(k.key)}>
            <div className={`admin-kpi-icon icon-${k.color}`}><k.icon size={18}/></div>
            <div className="admin-kpi-value">{k.value}</div>
            <div className="admin-kpi-label">{k.label}</div>
          </button>
        ))}
      </div>

      {us && (
        <div className="admin-chart-card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Users by role</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {Object.entries(us).map(([role, count]) => (
              <div key={role} style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '8px 14px', minWidth: 90 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)' }}>{Number(count || 0).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'capitalize' }}>{role}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Live Users Page ───────────────────────────────────────────────────────────
function LiveUsersPage() {
  const [users, setUsers]   = useState([]);
  const [search, setSearch] = useState('');
  const [roleF, setRoleF]   = useState('all');
  const [statF, setStatF]   = useState('all');
  const [loading, setLoad]  = useState(true);
  const [error, setErr]     = useState('');
  const [editUser, setEdit] = useState(null);

  const load = useCallback(async () => {
    setLoad(true); setErr('');
    try {
      const res = await authApi.getUsers({ size: 100 });
      const d = res.data?.data;
      setUsers(Array.isArray(d) ? d : d?.content || []);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load users. Check backend connection.');
    } finally { setLoad(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (u) => {
    const next = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await authApi.updateStatus(u.id, next);
      setUsers(prev => prev.map(x => x.id !== u.id ? x : { ...x, status: next }));
    } catch { load(); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Permanently delete this user?')) return;
    try {
      await authApi.deleteUser(id);
      setUsers(prev => prev.filter(x => x.id !== id));
    } catch (e) { alert(e.response?.data?.message || 'Delete failed'); }
  };

  const saveEdit = async (updated) => {
    try {
      await authApi.updateStatus(updated.id, updated.status);
      setUsers(prev => prev.map(x => x.id !== updated.id ? x : { ...x, ...updated }));
    } catch {}
    setEdit(null);
  };

  const ROLE_CLR = { owner:'green',manager:'blue',cashier:'blue',kitchen:'green',admin:'purple',support:'amber',supplier:'blue',hotel:'purple',mall:'blue',customer:'gray' };

  const filtered = users.filter(u => {
    if (statF !== 'all' && u.status?.toLowerCase() !== statF) return false;
    if (roleF !== 'all' && u.role?.toLowerCase() !== roleF) return false;
    if (search && ![u.name,u.email,u.phone].some(f => f?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Users</h1><p className="page-subtitle">{filtered.length} shown</p></div>
        <button className="btn-refresh" onClick={load}><RefreshCw size={13}/> Refresh</button>
      </div>
      {error && (
        <div className="demo-notice" style={{ background:'var(--red-bg)', borderColor:'#FCA5A5', color:'var(--red)', marginBottom:12 }}>
          ⚠ {error} <button onClick={load} style={{ fontWeight:700, background:'none', border:'none', cursor:'pointer', color:'var(--red)', textDecoration:'underline' }}>Retry</button>
        </div>
      )}
      <div className="admin-filter-bar">
        <div style={{ position:'relative', flex:1, maxWidth:280 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)' }}/>
          <input className="admin-filter-input" style={{ paddingLeft:32 }} placeholder="Search name, email, phone…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="admin-filter-select" value={roleF} onChange={e => setRoleF(e.target.value)}>
          <option value="all">All roles</option>
          {ROLES_ALL.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
        </select>
        <select className="admin-filter-select" value={statF} onChange={e => setStatF(e.target.value)}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
      {loading ? (
        <div style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading users…</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr><th>User</th><th>Role</th><th>Shop</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>No users found</td></tr>
              )}
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div className="admin-avatar sm" style={{ background: u.role==='ADMIN'?'var(--purple)':u.role==='SUPPORT'?'#D97706':'var(--green)' }}>
                        {u.name?.split(' ').map(w=>w[0]).join('').slice(0,2) || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13.5 }}>{u.name}</div>
                        <div style={{ fontSize:11.5, color:'var(--gray-400)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`role-badge-sm role-${ROLE_CLR[u.role?.toLowerCase()] || 'gray'}`}>{u.role?.toLowerCase()}</span></td>
                  <td style={{ fontSize:11, color:'var(--gray-400)', fontFamily:'monospace' }}>{u.shopId ? u.shopId.slice(0,8)+'…' : '—'}</td>
                  <td>
                    <button className={`toggle-status-btn ${u.status==='ACTIVE'?'tog-active':'tog-suspended'}`} onClick={() => toggleStatus(u)}>
                      {u.status==='ACTIVE' ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>} {u.status}
                    </button>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="admin-row-btn" title="Edit" onClick={() => setEdit(u)}><Edit2 size={12}/></button>
                      <button className="admin-row-btn" title="View"><Eye size={12}/></button>
                      <button className="admin-row-btn admin-row-btn-danger" title="Delete" onClick={() => deleteUser(u.id)}><Trash2 size={12}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editUser && (
        <div className="modal-backdrop" onClick={() => setEdit(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit — {editUser.name}</h2>
              <button className="modal-close" onClick={() => setEdit(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row-2">
                <div className="form-field">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={editUser.status} onChange={e => setEdit(u => ({ ...u, status: e.target.value }))}>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="DEACTIVATED">Deactivated</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Role</label>
                  <select className="form-input" value={editUser.role} onChange={e => setEdit(u => ({ ...u, role: e.target.value }))}>
                    {ROLES_ALL.map(r => <option key={r} value={r.toUpperCase()}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => saveEdit(editUser)}>Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Shops Page ──────────────────────────────────────────────────────────
function AdminShopsPage() {
  const [shops, setShops]   = useState([]);
  const [search, setSearch] = useState('');
  const [planF, setPlanF]   = useState('all');
  const [statF, setStatF]   = useState('all');
  const [loading, setLoad]  = useState(true);
  const [error, setErr]     = useState('');
  const [viewShop, setView] = useState(null);
  const [page, setPage]     = useState(0);
  const PAGE_SIZE = 20;

  const load = useCallback(async (pg = 0) => {
    setLoad(true); setErr('');
    try {
      const res = await shopApi.list({ page: pg, size: PAGE_SIZE, search: search || undefined });
      const d = res.data?.data;
      setShops(Array.isArray(d) ? d : d?.content || []);
      setPage(pg);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load shops.');
    } finally { setLoad(false); }
  }, [search]);

  useEffect(() => { load(0); }, [load]);

  const toggleStatus = async (s) => {
    const next = s.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await shopApi.updateStatus(s.id, next);
      setShops(prev => prev.map(x => x.id !== s.id ? x : { ...x, status: next }));
    } catch { load(page); }
  };

  const STATUS_CLR = { ACTIVE:'#059669', SUSPENDED:'#DC2626', PENDING:'#D97706', CLOSED:'#6B7280' };

  const filtered = shops.filter(s => {
    if (statF !== 'all' && s.status !== statF) return false;
    if (planF !== 'all' && (s.subscriptionPlan||'STARTER').toUpperCase() !== planF) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Shops</h1><p className="page-subtitle">{filtered.length} shops</p></div>
        <button className="btn-refresh" onClick={() => load(0)}><RefreshCw size={13}/> Refresh</button>
      </div>
      {error && <div className="demo-notice" style={{ background:'#FEE2E2', borderColor:'#FCA5A5', color:'#DC2626', marginBottom:12 }}>⚠ {error}</div>}

      <div className="admin-filter-bar">
        <div style={{ position:'relative', flex:1, maxWidth:260 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)' }}/>
          <input className="admin-filter-input" style={{ paddingLeft:32 }} placeholder="Search shops…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="admin-filter-select" value={planF} onChange={e => setPlanF(e.target.value)}>
          <option value="all">All plans</option>
          {Object.entries(PLANS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="admin-filter-select" value={statF} onChange={e => setStatF(e.target.value)}>
          <option value="all">All status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      {loading ? (
        <div style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading shops…</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Shop</th><th>City</th><th>Plan</th><th>Tables</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>No shops found</td></tr>
              )}
              {filtered.map(s => {
                const pi = planInfo(s.subscriptionPlan);
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight:700, fontSize:13.5 }}>{s.name}</div>
                      <div style={{ fontSize:11, color:'var(--gray-400)' }}>{s.phone || s.email || '—'}</div>
                    </td>
                    <td style={{ fontSize:13, color:'var(--gray-600)' }}>{s.city || '—'}</td>
                    <td>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:20,
                        background:pi.bg, color:pi.color }}>{pi.label}</span>
                    </td>
                    <td style={{ fontSize:13, textAlign:'center' }}>{s.tableCount || '—'}</td>
                    <td>
                      <button className={`toggle-status-btn ${s.status==='ACTIVE'?'tog-active':'tog-suspended'}`}
                        onClick={() => toggleStatus(s)}>
                        {s.status==='ACTIVE' ? <ToggleRight size={17}/> : <ToggleLeft size={17}/>}
                        <span style={{ color: STATUS_CLR[s.status] || '#6B7280' }}>{s.status}</span>
                      </button>
                    </td>
                    <td style={{ fontSize:12, color:'var(--gray-400)' }}>
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:5 }}>
                        <button className="admin-row-btn" title="View details" onClick={() => setView(s)}><Eye size={12}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Shop detail modal */}
      {viewShop && (
        <div className="modal-backdrop" onClick={() => setView(null)}>
          <div className="modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{viewShop.name}</h2>
              <button className="modal-close" onClick={() => setView(null)}>✕</button>
            </div>
            <div className="modal-body">
              {[
                ['Shop ID', viewShop.id],
                ['Owner ID', viewShop.ownerId],
                ['Phone', viewShop.phone],
                ['Email', viewShop.email],
                ['City', viewShop.city],
                ['Address', viewShop.address],
                ['Plan', planInfo(viewShop.subscriptionPlan).label],
                ['Tables', viewShop.tableCount],
                ['Min Order', viewShop.minOrderAmount ? `₹${viewShop.minOrderAmount}` : '—'],
                ['Status', viewShop.status],
                ['Created', viewShop.createdAt ? new Date(viewShop.createdAt).toLocaleString('en-IN') : '—'],
              ].map(([label, val]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--gray-100)', fontSize:13 }}>
                  <span style={{ color:'var(--gray-500)', fontWeight:600 }}>{label}</span>
                  <span style={{ color:'var(--gray-800)', fontFamily:'monospace', fontSize:12 }}>{val || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Hotels Page ─────────────────────────────────────────────────────────
function AdminHotelsPage() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoad]  = useState(true);
  const [error, setErr]     = useState('');

  const load = useCallback(async () => {
    setLoad(true); setErr('');
    try {
      const res = await hotelApi.listAll({ size: 100 });
      const d = res.data?.data;
      setHotels(Array.isArray(d) ? d : d?.content || []);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load hotels.');
    } finally { setLoad(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Hotels</h1><p className="page-subtitle">{hotels.length} hotels</p></div>
        <button className="btn-refresh" onClick={load}><RefreshCw size={13}/> Refresh</button>
      </div>
      {error && <div className="demo-notice" style={{ background:'#FEE2E2', borderColor:'#FCA5A5', color:'#DC2626', marginBottom:12 }}>⚠ {error}</div>}
      {loading ? (
        <div style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading hotels…</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Hotel</th><th>Location</th><th>Phone</th><th>Services</th><th>Check-in / out</th><th>Owner ID</th></tr>
            </thead>
            <tbody>
              {hotels.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>No hotels registered</td></tr>
              )}
              {hotels.map(h => (
                <tr key={h.id}>
                  <td><div style={{ fontWeight:700, fontSize:13.5 }}>{h.name}</div></td>
                  <td style={{ fontSize:13, color:'var(--gray-600)' }}>{h.address || '—'}</td>
                  <td style={{ fontSize:13 }}>{h.phone || '—'}</td>
                  <td style={{ fontSize:12 }}>
                    {(h.enabledServices || []).map(s => (
                      <span key={s} style={{ marginRight:4, fontSize:10, padding:'2px 6px', background:'#EDE9FE', color:'#7C3AED', borderRadius:10, fontWeight:600 }}>{s}</span>
                    ))}
                  </td>
                  <td style={{ fontSize:12, color:'var(--gray-500)' }}>{h.checkInTime || '—'} / {h.checkOutTime || '—'}</td>
                  <td style={{ fontSize:11, fontFamily:'monospace', color:'var(--gray-400)' }}>{h.ownerId?.slice(0,8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Admin Malls Page ──────────────────────────────────────────────────────────
function AdminMallsPage() {
  const [malls, setMalls]   = useState([]);
  const [loading, setLoad]  = useState(true);
  const [error, setErr]     = useState('');

  const load = useCallback(async () => {
    setLoad(true); setErr('');
    try {
      const res = await mallApi.listAll();
      const d = res.data?.data;
      setMalls(Array.isArray(d) ? d : []);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load malls.');
    } finally { setLoad(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Malls</h1><p className="page-subtitle">{malls.length} malls</p></div>
        <button className="btn-refresh" onClick={load}><RefreshCw size={13}/> Refresh</button>
      </div>
      {error && <div className="demo-notice" style={{ background:'#FEE2E2', borderColor:'#FCA5A5', color:'#DC2626', marginBottom:12 }}>⚠ {error}</div>}
      {loading ? (
        <div style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading malls…</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Mall</th><th>City</th><th>Phone</th><th>Commission</th><th>Admin ID</th><th>Created</th></tr>
            </thead>
            <tbody>
              {malls.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>No malls registered</td></tr>
              )}
              {malls.map(m => (
                <tr key={m.id}>
                  <td><div style={{ fontWeight:700, fontSize:13.5 }}>{m.name}</div></td>
                  <td style={{ fontSize:13, color:'var(--gray-600)' }}>{m.city || '—'}</td>
                  <td style={{ fontSize:13 }}>{m.phone || '—'}</td>
                  <td style={{ fontSize:13 }}>{m.commissionPercent != null ? `${m.commissionPercent}%` : '—'}</td>
                  <td style={{ fontSize:11, fontFamily:'monospace', color:'var(--gray-400)' }}>{m.adminId?.slice(0,8)}…</td>
                  <td style={{ fontSize:12, color:'var(--gray-400)' }}>{m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Admin Suppliers Page ──────────────────────────────────────────────────────
function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoad]        = useState(true);
  const [error, setErr]           = useState('');

  const load = useCallback(async () => {
    setLoad(true); setErr('');
    try {
      const res = await authApi.getUsers({ size: 200 });
      const d = res.data?.data;
      const all = Array.isArray(d) ? d : d?.content || [];
      setSuppliers(all.filter(u => u.role?.toUpperCase() === 'SUPPLIER'));
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load suppliers.');
    } finally { setLoad(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (u) => {
    const next = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await authApi.updateStatus(u.id, next);
      setSuppliers(prev => prev.map(x => x.id !== u.id ? x : { ...x, status: next }));
    } catch { load(); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Suppliers</h1><p className="page-subtitle">{suppliers.length} suppliers</p></div>
        <button className="btn-refresh" onClick={load}><RefreshCw size={13}/> Refresh</button>
      </div>
      {error && <div className="demo-notice" style={{ background:'#FEE2E2', borderColor:'#FCA5A5', color:'#DC2626', marginBottom:12 }}>⚠ {error}</div>}
      {loading ? (
        <div style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading suppliers…</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Supplier</th><th>Phone</th><th>Shop ID</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {suppliers.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>No suppliers registered</td></tr>
              )}
              {suppliers.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight:700, fontSize:13.5 }}>{u.name}</div>
                    <div style={{ fontSize:11.5, color:'var(--gray-400)' }}>{u.email}</div>
                  </td>
                  <td style={{ fontSize:13 }}>{u.phone || '—'}</td>
                  <td style={{ fontSize:11, fontFamily:'monospace', color:'var(--gray-400)' }}>{u.shopId?.slice(0,8) || '—'}</td>
                  <td>
                    <button className={`toggle-status-btn ${u.status==='ACTIVE'?'tog-active':'tog-suspended'}`} onClick={() => toggleStatus(u)}>
                      {u.status==='ACTIVE' ? <ToggleRight size={17}/> : <ToggleLeft size={17}/>} {u.status}
                    </button>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="admin-row-btn" title="View"><Eye size={12}/></button>
                      <button className="admin-row-btn admin-row-btn-danger" title="Delete"
                        onClick={() => authApi.deleteUser(u.id).then(() => setSuppliers(p => p.filter(x => x.id !== u.id))).catch(() => {})}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Admin Orders Page ─────────────────────────────────────────────────────────
function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statF, setStatF]   = useState('all');
  const [loading, setLoad]  = useState(true);
  const [error, setErr]     = useState('');
  const [page, setPage]     = useState(0);
  const PAGE_SIZE = 30;

  const load = useCallback(async (pg = 0) => {
    setLoad(true); setErr('');
    try {
      const res = await orderApi.listAll({ page: pg, size: PAGE_SIZE });
      const d = res.data?.data;
      setOrders(Array.isArray(d) ? d : d?.content || []);
      setPage(pg);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load orders.');
    } finally { setLoad(false); }
  }, []);

  useEffect(() => { load(0); }, [load]);

  const STATUS_CLR = { PENDING:'#D97706',ACCEPTED:'#2563EB',PREPARING:'#7C3AED',READY:'#059669',DELIVERED:'#059669',CANCELLED:'#DC2626',COMPLETED:'#059669' };
  const STATUS_BG  = { PENDING:'#FEF3C7',ACCEPTED:'#DBEAFE',PREPARING:'#EDE9FE',READY:'#DCFCE7',DELIVERED:'#DCFCE7',CANCELLED:'#FEE2E2',COMPLETED:'#DCFCE7' };

  const filtered = orders.filter(o => {
    if (statF !== 'all' && o.status !== statF) return false;
    if (search) {
      const q = search.toLowerCase();
      return [o.orderNumber, o.shopId, o.customerName, o.customerPhone].some(f => f?.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Orders</h1><p className="page-subtitle">Platform-wide · {filtered.length} shown</p></div>
        <button className="btn-refresh" onClick={() => load(0)}><RefreshCw size={13}/> Refresh</button>
      </div>
      {error && <div className="demo-notice" style={{ background:'#FEE2E2', borderColor:'#FCA5A5', color:'#DC2626', marginBottom:12 }}>⚠ {error}</div>}

      <div className="admin-filter-bar">
        <div style={{ position:'relative', flex:1, maxWidth:280 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)' }}/>
          <input className="admin-filter-input" style={{ paddingLeft:32 }} placeholder="Order #, shop, customer…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="admin-filter-select" value={statF} onChange={e => setStatF(e.target.value)}>
          <option value="all">All status</option>
          {['PENDING','ACCEPTED','PREPARING','READY','DELIVERED','COMPLETED','CANCELLED'].map(s =>
            <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ display:'flex', gap:6 }}>
          <button className="admin-row-btn" onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}><ChevronLeft size={14}/></button>
          <span style={{ fontSize:12, color:'var(--gray-500)', alignSelf:'center' }}>Page {page+1}</span>
          <button className="admin-row-btn" onClick={() => load(page+1)}><ChevronRight size={14}/></button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading orders…</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Order</th><th>Shop</th><th>Customer</th><th>Type</th><th>Total</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>No orders found</td></tr>
              )}
              {filtered.map(o => (
                <tr key={o.id}>
                  <td style={{ fontFamily:'monospace', fontSize:12, fontWeight:700 }}>#{o.orderNumber}</td>
                  <td style={{ fontSize:11, color:'var(--gray-500)', fontFamily:'monospace' }}>{o.shopId?.slice(0,8)}…</td>
                  <td>
                    <div style={{ fontSize:13, fontWeight:600 }}>{o.customerName || '—'}</div>
                    <div style={{ fontSize:11, color:'var(--gray-400)' }}>{o.customerPhone || ''}</div>
                  </td>
                  <td style={{ fontSize:12, color:'var(--gray-500)' }}>{o.type || '—'}</td>
                  <td style={{ fontWeight:700, fontSize:13 }}>₹{Number(o.totalAmount||0).toLocaleString('en-IN')}</td>
                  <td>
                    <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:20,
                      background: STATUS_BG[o.status] || '#F3F4F6',
                      color: STATUS_CLR[o.status] || '#6B7280' }}>{o.status}</span>
                  </td>
                  <td style={{ fontSize:12, color:'var(--gray-400)' }}>
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Admin Payments Page ───────────────────────────────────────────────────────
function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [statF, setStatF]       = useState('all');
  const [loading, setLoad]      = useState(true);
  const [error, setErr]         = useState('');
  const [page, setPage]         = useState(0);
  const PAGE_SIZE = 30;

  const load = useCallback(async (pg = 0) => {
    setLoad(true); setErr('');
    try {
      const res = await paymentApi.listAll({ page: pg, size: PAGE_SIZE });
      const d = res.data?.data;
      setPayments(Array.isArray(d) ? d : d?.content || []);
      setPage(pg);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load payments.');
    } finally { setLoad(false); }
  }, []);

  useEffect(() => { load(0); }, [load]);

  const STATUS_CLR = { PENDING:'#D97706', CAPTURED:'#059669', PAID:'#059669', FAILED:'#DC2626', REFUNDED:'#6B7280', CASH:'#7C3AED' };
  const STATUS_BG  = { PENDING:'#FEF3C7', CAPTURED:'#DCFCE7', PAID:'#DCFCE7', FAILED:'#FEE2E2', REFUNDED:'#F3F4F6', CASH:'#EDE9FE' };

  const filtered = statF === 'all' ? payments : payments.filter(p => p.status === statF);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Payments</h1><p className="page-subtitle">Platform-wide · {filtered.length} shown</p></div>
        <button className="btn-refresh" onClick={() => load(0)}><RefreshCw size={13}/> Refresh</button>
      </div>
      {error && <div className="demo-notice" style={{ background:'#FEE2E2', borderColor:'#FCA5A5', color:'#DC2626', marginBottom:12 }}>⚠ {error}</div>}

      <div className="admin-filter-bar">
        <select className="admin-filter-select" value={statF} onChange={e => setStatF(e.target.value)}>
          <option value="all">All status</option>
          {['PENDING','CAPTURED','PAID','FAILED','REFUNDED','CASH'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
          <button className="admin-row-btn" onClick={() => load(Math.max(0, page-1))} disabled={page === 0}><ChevronLeft size={14}/></button>
          <span style={{ fontSize:12, color:'var(--gray-500)', alignSelf:'center' }}>Page {page+1}</span>
          <button className="admin-row-btn" onClick={() => load(page+1)}><ChevronRight size={14}/></button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading payments…</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Payment ID</th><th>Shop</th><th>Amount</th><th>Gateway</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>No payments found</td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ fontFamily:'monospace', fontSize:11, color:'var(--gray-600)' }}>{p.paymentId || p.id?.slice(0,12)}</td>
                  <td style={{ fontSize:11, fontFamily:'monospace', color:'var(--gray-400)' }}>{p.shopId?.slice(0,8)}…</td>
                  <td style={{ fontWeight:700, fontSize:14 }}>₹{Number(p.amount||0).toLocaleString('en-IN')}</td>
                  <td style={{ fontSize:12, color:'var(--gray-500)' }}>{p.gateway || 'RAZORPAY'}</td>
                  <td>
                    <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:20,
                      background: STATUS_BG[p.status] || '#F3F4F6',
                      color: STATUS_CLR[p.status] || '#6B7280' }}>{p.status}</span>
                  </td>
                  <td style={{ fontSize:12, color:'var(--gray-400)' }}>
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Admin Subscription Management ─────────────────────────────────────────────
// Admin manages OTHER shops' subscriptions — admin has no personal subscription
function AdminSubscriptionManagement() {
  const [shops, setShops]         = useState([]);
  const [loading, setLoad]        = useState(true);
  const [error, setErr]           = useState('');
  const [planFilter, setPlanFilter]= useState('all');
  const [search, setSearch]       = useState('');
  const [changePlan, setChangePlan]= useState(null); // { shop, newPlan }
  const [toast, setToast]         = useState('');

  const load = useCallback(async () => {
    setLoad(true); setErr('');
    try {
      const res = await shopApi.list({ size: 200 });
      const d = res.data?.data;
      setShops(Array.isArray(d) ? d : d?.content || []);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load shops.');
    } finally { setLoad(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const savePlan = async () => {
    if (!changePlan) return;
    try {
      await shopApi.update(changePlan.shop.id, { subscriptionPlan: changePlan.newPlan });
      setShops(prev => prev.map(s => s.id !== changePlan.shop.id ? s : { ...s, subscriptionPlan: changePlan.newPlan }));
      showToast(`Plan updated to ${planInfo(changePlan.newPlan).label} for ${changePlan.shop.name}`);
    } catch { showToast('Failed to update plan'); }
    setChangePlan(null);
  };

  const sendReminder = (shop) => {
    showToast(`Payment reminder sent to ${shop.name} (${shop.email || shop.phone || 'owner'})`);
  };

  const filtered = shops.filter(s => {
    const plan = (s.subscriptionPlan || 'STARTER').toUpperCase();
    if (planFilter !== 'all' && plan !== planFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return [s.name, s.city, s.email, s.phone].some(f => f?.toLowerCase().includes(q));
    }
    return true;
  });

  // KPIs
  const total    = shops.length;
  const paid     = shops.filter(s => ['GROWTH','BUSINESS','ENTERPRISE'].includes((s.subscriptionPlan||'').toUpperCase())).length;
  const free     = shops.filter(s => !s.subscriptionPlan || s.subscriptionPlan.toUpperCase() === 'STARTER').length;
  const suspended= shops.filter(s => s.status === 'SUSPENDED').length;
  const mrr      = shops.reduce((acc, s) => acc + (planInfo(s.subscriptionPlan).price || 0), 0);

  return (
    <div>
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:'#1F2937', color:'white', padding:'12px 20px', borderRadius:10, zIndex:9999, fontSize:13, fontWeight:600 }}>
          ✓ {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Subscription Management</h1>
          <p className="page-subtitle">Manage plans, billing & reminders for all shops</p>
        </div>
        <button className="btn-refresh" onClick={load}><RefreshCw size={13}/> Refresh</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total shops',      value: total,            icon: Store,    color:'#2563EB', bg:'#DBEAFE' },
          { label:'Paid subscribers', value: paid,             icon: BadgeCheck,color:'#059669', bg:'#DCFCE7' },
          { label:'Free (Starter)',   value: free,             icon: Users,    color:'#D97706', bg:'#FEF3C7' },
          { label:'MRR (est.)',       value:`₹${mrr.toLocaleString('en-IN')}`, icon: TrendingUp, color:'#7C3AED', bg:'#EDE9FE' },
        ].map(k => (
          <div key={k.label} className="admin-kpi-card" style={{ textAlign:'left' }}>
            <div style={{ width:36, height:36, borderRadius:9, background:k.bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
              <k.icon size={17} color={k.color}/>
            </div>
            <div style={{ fontSize:22, fontWeight:700, color:'var(--gray-900)' }}>{k.value}</div>
            <div style={{ fontSize:12, color:'var(--gray-500)', marginTop:2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="admin-filter-bar">
        <div style={{ position:'relative', flex:1, maxWidth:260 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)' }}/>
          <input className="admin-filter-input" style={{ paddingLeft:32 }} placeholder="Search shops…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="admin-filter-select" value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
          <option value="all">All plans</option>
          {Object.entries(PLANS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {error && <div className="demo-notice" style={{ background:'#FEE2E2', borderColor:'#FCA5A5', color:'#DC2626', marginBottom:12 }}>⚠ {error}</div>}

      {loading ? (
        <div style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading shops…</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Shop</th><th>City</th><th>Plan</th><th>Status</th><th>Tables</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>No shops found</td></tr>
              )}
              {filtered.map(s => {
                const pi = planInfo(s.subscriptionPlan);
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight:700, fontSize:13.5 }}>{s.name}</div>
                      <div style={{ fontSize:11, color:'var(--gray-400)' }}>{s.email || s.phone || '—'}</div>
                    </td>
                    <td style={{ fontSize:13, color:'var(--gray-600)' }}>{s.city || '—'}</td>
                    <td>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
                        background:pi.bg, color:pi.color }}>
                        {pi.label}
                        {pi.price > 0 && <span style={{ fontWeight:400, marginLeft:4 }}>₹{pi.price}/mo</span>}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize:11, fontWeight:700, color: s.status==='ACTIVE'?'#059669':'#DC2626' }}>
                        {s.status === 'ACTIVE' ? '● Active' : '● Suspended'}
                      </span>
                    </td>
                    <td style={{ fontSize:13, textAlign:'center' }}>{s.tableCount || '—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        <button className="admin-row-btn" title="Change plan"
                          onClick={() => setChangePlan({ shop: s, newPlan: (s.subscriptionPlan||'STARTER').toUpperCase() })}
                          style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', fontSize:11, fontWeight:600, color:'#2563EB' }}>
                          <Zap size={11}/> Plan
                        </button>
                        <button className="admin-row-btn" title="Send payment reminder"
                          onClick={() => sendReminder(s)}
                          style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', fontSize:11, fontWeight:600, color:'#D97706' }}>
                          <Send size={11}/> Remind
                        </button>
                        <button className="admin-row-btn" title="View invoices"
                          style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', fontSize:11, fontWeight:600, color:'#7C3AED' }}>
                          <Download size={11}/> Invoice
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Change Plan Modal */}
      {changePlan && (
        <div className="modal-backdrop" onClick={() => setChangePlan(null)}>
          <div className="modal" style={{ maxWidth:440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Change plan — {changePlan.shop.name}</h2>
              <button className="modal-close" onClick={() => setChangePlan(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {Object.entries(PLANS).map(([key, pl]) => (
                  <button key={key}
                    onClick={() => setChangePlan(p => ({ ...p, newPlan: key }))}
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'12px 16px', borderRadius:10, border:`2px solid ${changePlan.newPlan === key ? pl.color : 'var(--gray-200)'}`,
                      background: changePlan.newPlan === key ? pl.bg : 'white',
                      cursor:'pointer', textAlign:'left' }}>
                    <div>
                      <div style={{ fontWeight:700, color:pl.color }}>{pl.label}</div>
                      <div style={{ fontSize:12, color:'var(--gray-500)' }}>
                        {pl.price === 0 ? (key === 'ENTERPRISE' ? 'Custom pricing' : 'Free') : `₹${pl.price}/month`}
                      </div>
                    </div>
                    {changePlan.newPlan === key && <CheckCircle2 size={18} color={pl.color}/>}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setChangePlan(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={savePlan}>Save plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Reports ─────────────────────────────────────────────────────────────
function AdminReports() {
  const [stats, setStats]  = useState(null);
  const [loading, setLoad] = useState(true);

  useEffect(() => {
    reportApi.getPlatform()
      .then(r => setStats(r.data?.data))
      .catch(() => {})
      .finally(() => setLoad(false));
  }, []);

  const fmt  = n => Number(n || 0).toLocaleString('en-IN');
  const fmtC = n => `₹${(Number(n || 0) / 10000000).toFixed(2)}Cr`;

  const CARDS = stats ? [
    { label: 'Total shops (active)',   value: fmt(stats.activeShops || 0) },
    { label: 'Total orders (all time)',value: fmt(stats.totalOrders || 0) },
    { label: 'Total revenue',          value: fmtC(stats.totalRevenue || 0) },
    { label: "Today's orders",         value: fmt(stats.todayOrders || 0) },
    { label: "Today's revenue",        value: `₹${fmt(stats.todayRevenue || 0)}` },
    { label: 'Avg order value',        value: `₹${fmt(stats.avgOrderValue || 0)}` },
  ] : [];

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Platform Reports</h1></div>
      {loading ? (
        <div style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading…</div>
      ) : stats ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
          {CARDS.map(c => (
            <div key={c.label} className="admin-chart-card" style={{ textAlign:'center' }}>
              <div style={{ fontSize:26, fontWeight:700, color:'var(--gray-900)' }}>{c.value}</div>
              <div style={{ fontSize:13, color:'var(--gray-500)', marginTop:4 }}>{c.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="demo-notice">Connect backend to see live platform analytics.</div>
      )}
    </div>
  );
}

// ── Admin Settings ────────────────────────────────────────────────────────────
function AdminSettings() {
  const { lang } = useLang();
  const sections = [
    { title: 'Platform settings', fields: ['Platform name', 'Support email', 'Default currency', 'Time zone'] },
    { title: 'Payment gateway',   fields: ['Razorpay Key ID', 'Razorpay Secret'] },
    { title: 'Notifications',     fields: ['Twilio SID', 'WhatsApp API key', 'SMTP host', 'SMTP user'] },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div className="page-header"><h1 className="page-title">{t('settings', lang)}</h1></div>
      {sections.map(s => (
        <div key={s.title} className="admin-chart-card">
          <h3 style={{ marginBottom:16 }}>{s.title}</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {s.fields.map(f => (
              <div key={f} className="form-field">
                <label className="form-label">{f}</label>
                <input className="form-input" placeholder={`Enter ${f.toLowerCase()}`}/>
              </div>
            ))}
          </div>
          <div style={{ marginTop:14, display:'flex', justifyContent:'flex-end' }}>
            <button className="btn btn-primary">Save</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Admin QR Codes Page ───────────────────────────────────────────────────────
function AdminQRCodesPage() {
  const [codes, setCodes]     = useState([]);
  const [typeF, setTypeF]     = useState('all');
  const [activeF, setActiveF] = useState('all');
  const [loading, setLoad]    = useState(true);
  const [error, setErr]       = useState('');
  const [page, setPage]       = useState(0);
  const [toggling, setToggling] = useState({});
  const [toast, setToast]     = useState('');
  const PAGE_SIZE = 30;

  const load = useCallback(async (pg = 0) => {
    setLoad(true); setErr('');
    try {
      const res = await qrApi.listAll({ page: pg, size: PAGE_SIZE });
      const d = res.data?.data;
      setCodes(Array.isArray(d) ? d : d?.content || []);
      setPage(pg);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load QR codes.');
    } finally { setLoad(false); }
  }, []);

  useEffect(() => { load(0); }, [load]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleToggle = async (qr) => {
    setToggling(p => ({ ...p, [qr.id]: true }));
    try {
      await qrApi.toggleActive(qr.id, !qr.active);
      setCodes(prev => prev.map(c => c.id === qr.id ? { ...c, active: !c.active } : c));
      showToast(`QR "${qr.label}" ${!qr.active ? 'activated' : 'deactivated'}`);
    } catch {
      showToast('Failed to update QR status');
    } finally {
      setToggling(p => ({ ...p, [qr.id]: false }));
    }
  };

  const filtered = codes.filter(c =>
    (typeF === 'all' || c.type === typeF) &&
    (activeF === 'all' || (activeF === 'active' ? c.active : !c.active))
  );

  const totalScans = codes.reduce((s, c) => s + (c.scanCount || 0), 0);
  const activeCount = codes.filter(c => c.active).length;

  return (
    <div>
      {toast && (
        <div style={{ position:'fixed', top:16, right:20, background:'#1E293B', color:'#fff',
          padding:'10px 18px', borderRadius:8, zIndex:9999, fontSize:13, fontWeight:500 }}>{toast}</div>
      )}
      <div className="page-header">
        <div>
          <h1 className="page-title">QR Codes</h1>
          <p className="page-subtitle">Platform-wide · {codes.length} total · {totalScans.toLocaleString('en-IN')} scans</p>
        </div>
        <button className="btn-refresh" onClick={() => load(0)}><RefreshCw size={13}/> Refresh</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:18 }}>
        {[
          { label:'Total QR Codes', value: codes.length, icon: QrCode, color:'#7C3AED' },
          { label:'Active',         value: activeCount,  icon: CheckCircle2, color:'#059669' },
          { label:'Inactive',       value: codes.length - activeCount, icon: XCircle, color:'#6B7280' },
          { label:'Total Scans',    value: totalScans,   icon: ScanLine, color:'#D97706' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, color:'var(--gray-500)' }}>{s.label}</span>
              <s.icon size={16} style={{ color: s.color }}/>
            </div>
            <div style={{ fontSize:22, fontWeight:700, marginTop:4, color:'var(--gray-900)' }}>
              {typeof s.value === 'number' ? s.value.toLocaleString('en-IN') : s.value}
            </div>
          </div>
        ))}
      </div>

      {error && <div className="demo-notice" style={{ background:'#FEE2E2', borderColor:'#FCA5A5', color:'#DC2626', marginBottom:12 }}>⚠ {error}</div>}

      <div className="admin-filter-bar">
        <select className="admin-filter-select" value={typeF} onChange={e => setTypeF(e.target.value)}>
          <option value="all">All types</option>
          {['SHOP','TABLE','CATEGORY','HOTEL','MALL'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="admin-filter-select" value={activeF} onChange={e => setActiveF(e.target.value)}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span style={{ fontSize:12, color:'var(--gray-400)', marginLeft:4 }}>{filtered.length} shown</span>
        <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
          <button className="admin-row-btn" onClick={() => load(Math.max(0, page-1))} disabled={page === 0}><ChevronLeft size={14}/></button>
          <span style={{ fontSize:12, color:'var(--gray-500)', alignSelf:'center' }}>Page {page+1}</span>
          <button className="admin-row-btn" onClick={() => load(page+1)} disabled={codes.length < PAGE_SIZE}><ChevronRight size={14}/></button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading QR codes…</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Code</th><th>Shop</th><th>Label</th><th>Type</th><th>Group</th><th>Scans</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>No QR codes found</td></tr>
              )}
              {filtered.map(qr => (
                <tr key={qr.id}>
                  <td style={{ fontFamily:'monospace', fontSize:11, fontWeight:700, color:'#7C3AED' }}>{qr.qrCode}</td>
                  <td style={{ fontSize:11, fontFamily:'monospace', color:'var(--gray-400)' }}>{qr.shopId?.slice(0,10)}…</td>
                  <td style={{ fontSize:13, color:'var(--gray-800)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{qr.label || '—'}</td>
                  <td>
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:20,
                      background: qr.type==='TABLE'?'#DBEAFE': qr.type==='CATEGORY'?'#FEF3C7':'#EDE9FE',
                      color:      qr.type==='TABLE'?'#1D4ED8': qr.type==='CATEGORY'?'#B45309':'#6D28D9'
                    }}>{qr.type || 'SHOP'}</span>
                  </td>
                  <td style={{ fontSize:12, color:'var(--gray-500)' }}>{qr.groupParam || '—'}</td>
                  <td style={{ fontWeight:600, fontSize:13 }}>{(qr.scanCount || 0).toLocaleString('en-IN')}</td>
                  <td>
                    <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:20,
                      background: qr.active ? '#DCFCE7' : '#F3F4F6',
                      color:      qr.active ? '#059669' : '#6B7280' }}>
                      {qr.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize:12, color:'var(--gray-400)' }}>
                    {qr.createdAt ? new Date(qr.createdAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button
                        className="admin-row-btn"
                        title={qr.active ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggle(qr)}
                        disabled={toggling[qr.id]}
                        style={{ color: qr.active ? '#DC2626' : '#059669' }}>
                        {toggling[qr.id] ? <RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }}/> : (qr.active ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>)}
                      </button>
                      <a
                        href={qrApi.imageUrl(qr.qrCode)}
                        target="_blank" rel="noreferrer"
                        className="admin-row-btn"
                        title="Download QR image">
                        <Download size={13}/>
                      </a>
                      <a
                        href={`/api/v1/qr-codes/r/${qr.qrCode}`}
                        target="_blank" rel="noreferrer"
                        className="admin-row-btn"
                        title="Test QR redirect">
                        <ExternalLink size={13}/>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminStub({ label, icon: Icon }) {
  return (
    <div className="admin-stub">
      <div className="admin-stub-icon">{Icon && <Icon size={28}/>}</div>
      <h2>{label}</h2>
      <p>Connect your backend to see live data here.</p>
    </div>
  );
}