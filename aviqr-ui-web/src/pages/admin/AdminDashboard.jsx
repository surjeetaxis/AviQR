import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { LangPicker, useLang } from '../../components/shared/LangPicker.jsx';
import { t } from '../../i18n/translations.js';
import SubscriptionPage from '../../components/shared/SubscriptionPage.jsx';
import {
  Users, Store, ShoppingBag, CreditCard, QrCode, BarChart2,
  Shield, LogOut, Settings, Search, Bell, Hotel,
  Building2, Package, TrendingUp, Eye, Trash2, CheckCircle2,
  XCircle, Edit2, Menu as MenuIcon, Plus,
  Download, RefreshCw, ToggleLeft, ToggleRight,
  Lock, Unlock, Star
} from 'lucide-react';
import { authApi, reportApi } from '../../api/index.js';
import '../admin/Admin.css';
import './AdminExtra.css';

const ROLES_ALL = ['owner','manager','cashier','kitchen','admin','support','supplier','hotel','mall','customer'];

const NAV = [
  {key:'overview',   label:'Overview',     icon:BarChart2},
  {key:'users',      label:'Users',        icon:Users},
  {key:'shops',      label:'Shops',        icon:Store},
  {key:'hotels',     label:'Hotels',       icon:Hotel},
  {key:'malls',      label:'Malls',        icon:Building2},
  {key:'suppliers',  label:'Suppliers',    icon:Package},
  {key:'orders',     label:'Orders',       icon:ShoppingBag},
  {key:'payments',   label:'Payments',     icon:CreditCard},
  {key:'qrcodes',    label:'QR Codes',     icon:QrCode},
  {key:'reports',    label:'Reports',      icon:TrendingUp},
  {key:'subscription',label:'Subscription',icon:Star},
  {key:'settings',   label:'Settings',     icon:Settings},
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
          {tab === 'reports'      && <AdminReports/>}
          {tab === 'subscription' && <SubscriptionPage userRole="owner" currentPlan="growth"/>}
          {tab === 'settings'     && <AdminSettings/>}
          {!['overview','users','reports','subscription','settings'].includes(tab) && (
            <AdminStub label={NAV.find(n => n.key === tab)?.label} icon={NAV.find(n => n.key === tab)?.icon}/>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────
function AdminOverview({ ps, us, onNav, onRefresh }) {
  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const KPIs = [
    { label: 'Active shops',     value: ps ? fmt(ps.activeShops || 0)    : '—', icon: Store,       color: 'green',  key: 'shops' },
    { label: "Today's orders",   value: ps ? fmt(ps.todayOrders || 0)    : '—', icon: ShoppingBag, color: 'purple', key: 'orders' },
    { label: "Today's revenue",  value: ps ? `₹${fmt(ps.todayRevenue||0)}`: '—', icon: CreditCard,  color: 'amber',  key: 'payments' },
    { label: 'Total orders',     value: ps ? fmt(ps.totalOrders || 0)    : '—', icon: TrendingUp,  color: 'blue',   key: 'reports' },
    { label: 'Total revenue',    value: ps ? `₹${fmt(ps.totalRevenue||0)}`:'—', icon: BarChart2,   color: 'green',  key: 'reports' },
    { label: 'Avg order value',  value: ps ? `₹${fmt(ps.avgOrderValue||0)}`:'—',icon: Shield,      color: 'blue',   key: 'reports' },
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
  const [users, setUsers]     = useState([]);
  const [search, setSearch]   = useState('');
  const [roleF, setRoleF]     = useState('all');
  const [statF, setStatF]     = useState('all');
  const [loading, setLoad]    = useState(true);
  const [error, setErr]       = useState('');
  const [editUser, setEdit]   = useState(null);

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
                      <div className="admin-avatar sm"
                        style={{ background: u.role==='ADMIN'?'var(--purple)':u.role==='SUPPORT'?'#D97706':'var(--green)' }}>
                        {u.name?.split(' ').map(w=>w[0]).join('').slice(0,2) || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13.5 }}>{u.name}</div>
                        <div style={{ fontSize:11.5, color:'var(--gray-400)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge-sm role-${ROLE_CLR[u.role?.toLowerCase()] || 'gray'}`}>
                      {u.role?.toLowerCase()}
                    </span>
                  </td>
                  <td style={{ fontSize:11, color:'var(--gray-400)', fontFamily:'monospace' }}>
                    {u.shopId ? u.shopId.slice(0,8)+'…' : '—'}
                  </td>
                  <td>
                    <button className={`toggle-status-btn ${u.status==='ACTIVE'?'tog-active':'tog-suspended'}`}
                      onClick={() => toggleStatus(u)}>
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
                  <select className="form-input" value={editUser.status}
                    onChange={e => setEdit(u => ({ ...u, status: e.target.value }))}>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="DEACTIVATED">Deactivated</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Role</label>
                  <select className="form-input" value={editUser.role}
                    onChange={e => setEdit(u => ({ ...u, role: e.target.value }))}>
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

// ── Admin Reports ─────────────────────────────────────────────────────────────
function AdminReports() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    reportApi.getPlatform()
      .then(r => setStats(r.data?.data))
      .catch(() => {})
      .finally(() => setLoad(false));
  }, []);

  const fmt  = n => Number(n || 0).toLocaleString('en-IN');
  const fmtC = n => `₹${(Number(n || 0) / 10000000).toFixed(2)}Cr`;

  const CARDS = stats ? [
    { label: 'Total shops (active)',  value: fmt(stats.activeShops || 0) },
    { label: 'Total orders (all time)',value: fmt(stats.totalOrders || 0) },
    { label: 'Total revenue',         value: fmtC(stats.totalRevenue || 0) },
    { label: "Today's orders",        value: fmt(stats.todayOrders || 0) },
    { label: "Today's revenue",       value: `₹${fmt(stats.todayRevenue || 0)}` },
    { label: 'Avg order value',       value: `₹${fmt(stats.avgOrderValue || 0)}` },
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

function AdminStub({ label, icon: Icon }) {
  return (
    <div className="admin-stub">
      <div className="admin-stub-icon">{Icon && <Icon size={28}/>}</div>
      <h2>{label}</h2>
      <p>Connect your backend to see live data here.</p>
    </div>
  );
}
