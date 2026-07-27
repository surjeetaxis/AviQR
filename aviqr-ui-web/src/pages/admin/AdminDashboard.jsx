import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { LangPicker, useLang } from '../../components/shared/LangPicker.jsx';
import ProfileMenu from '../../components/shared/ProfileMenu.jsx';
import { t } from '../../i18n/translations.js';
import {
  Users, Store, ShoppingBag, CreditCard, QrCode, BarChart2,
  Shield, LogOut, Settings, Search, Bell, Hotel,
  Building2, Package, TrendingUp, Eye, Trash2, CheckCircle2,
  XCircle, Edit2, Menu as MenuIcon, Plus,
  Download, RefreshCw, ToggleLeft, ToggleRight,
  Lock, Unlock, Star, Send, AlertTriangle, ChevronLeft, ChevronRight,
  BadgeCheck, Clock, Zap, Crown, ScanLine, ExternalLink,
  Percent, Gift, Layers, BedDouble, UserCog, ClipboardList, UtensilsCrossed, Sparkles
} from 'lucide-react';
import { authApi, reportApi, shopApi, hotelApi, mallApi, orderApi, paymentApi, qrApi, planApi, offerApi } from '../../api/index.js';
import QrPosterStudio from '../../components/shared/QrPosterStudio.jsx';
import PermissionMatrixView from '../../components/shared/PermissionMatrixView.jsx';
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

// Shared shop-status label/color — was previously two different renderings of the
// same `status` field (Shops page echoed the raw enum; Subscriptions collapsed
// every non-ACTIVE value, including INACTIVE, to "Suspended").
const SHOP_STATUS = {
  ACTIVE:    { label:'Active',    color:'#059669' },
  INACTIVE:  { label:'Inactive',  color:'#6B7280' },
  SUSPENDED: { label:'Suspended', color:'#DC2626' },
  PENDING:   { label:'Pending',   color:'#D97706' },
  CLOSED:    { label:'Closed',    color:'#6B7280' },
};
function shopStatusInfo(status) { return SHOP_STATUS[status] || { label: status || '—', color:'#6B7280' }; }

const VERTICAL_COLORS = {
  SHOP:     { label:'Restaurant/Shop', color:'#059669', bg:'#DCFCE7' },
  HOTEL:    { label:'Hotel',           color:'#2563EB', bg:'#DBEAFE' },
  MALL:     { label:'Mall',            color:'#7C3AED', bg:'#EDE9FE' },
  SUPPLIER: { label:'Supplier',        color:'#D97706', bg:'#FEF3C7' },
};

const NAV = [
  {key:'overview',      labelKey:'overview',      icon:BarChart2},
  {key:'users',         labelKey:'navUsers',         icon:Users},
  {key:'shops',         labelKey:'navShops',         icon:Store},
  {key:'hotels',        labelKey:'navHotels',        icon:Hotel},
  {key:'malls',         labelKey:'navMalls',         icon:Building2},
  {key:'suppliers',     labelKey:'navSuppliers',     icon:Package},
  {key:'orders',        labelKey:'orders',        icon:ShoppingBag},
  {key:'payments',      labelKey:'navPayments',      icon:CreditCard},
  {key:'qrcodes',       labelKey:'qrCodes',      icon:QrCode},
  {key:'subscription',  labelKey:'navSubscriptions', icon:Star},
  {key:'permissions',   labelKey:'navPermissions', icon:UserCog},
  {key:'reports',       labelKey:'reports',       icon:TrendingUp},
  {key:'settings',      labelKey:'settings',      icon:Settings},
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
              <n.icon size={16}/> <span>{t(n.labelKey, lang)}</span>
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
            <ProfileMenu
              name={user?.name}
              email={user?.email}
              avatar={user?.name?.[0] || 'A'}
              onLogout={() => { logout(); navigate('/'); }}
              items={[
                { label:t('profileAndSettings', lang), icon:Settings, onClick:() => setTab('settings') },
                { label:'Preview customer app', icon:Eye, onClick:() => navigate('/customer') },
              ]}
            />
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
          {tab === 'permissions'  && <PermissionMatrixView/>}
          {tab === 'reports'      && <AdminReports/>}
          {tab === 'settings'     && <AdminSettings/>}
        </main>
      </div>
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────
function AdminOverview({ ps, us, onNav, onRefresh }) {
  const { lang } = useLang();
  const fmt = n => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

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
        <div><h1 className="page-title">{t('platformOverview', lang)}</h1><p className="page-subtitle">{t('liveData', lang)}</p></div>
        <button className="btn-refresh" onClick={onRefresh}><RefreshCw size={13}/> {t('refresh', lang)}</button>
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
  const { lang } = useLang();
  const [users, setUsers]   = useState([]);
  const [search, setSearch] = useState('');
  const [roleF, setRoleF]   = useState('all');
  const [statF, setStatF]   = useState('all');
  const [loading, setLoad]  = useState(true);
  const [error, setErr]     = useState('');
  const [editUser, setEdit] = useState(null);
  const [viewStats, setViewStats] = useState(null);
  const [viewLoad, setViewLoad]   = useState(false);
  const shopNames = useShopNameMap();

  const openView = async (u) => {
    setEdit(u); setViewStats(null);
    if (!u.shopId) return;
    setViewLoad(true);
    try {
      const [rev, daily, staff] = await Promise.allSettled([
        reportApi.getRevenue(u.shopId, 7),
        reportApi.getDaily(u.shopId),
        shopApi.getStaff(u.shopId),
      ]);
      const revDays = rev.status === 'fulfilled' ? (rev.value.data?.data || []) : [];
      const rev7d = revDays.reduce((sum, d) => sum + Number(d.revenue || d.total || 0), 0);
      const dailyData = daily.status === 'fulfilled' ? (daily.value.data?.data || {}) : {};
      const staffList = staff.status === 'fulfilled' ? (staff.value.data?.data || []) : [];
      setViewStats({
        todayOrders: dailyData.totalOrders ?? 0,
        todayRevenue: dailyData.totalRevenue ?? 0,
        rev7d,
        staffCount: Array.isArray(staffList) ? staffList.length : 0,
      });
    } catch {
      setViewStats({ todayOrders: 0, todayRevenue: 0, rev7d: 0, staffCount: 0 });
    } finally { setViewLoad(false); }
  };

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
        <div><h1 className="page-title">{t('navUsers', lang)}</h1><p className="page-subtitle">{filtered.length} shown</p></div>
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
                  <td style={{ fontSize:12, color:'var(--gray-700)' }}>{u.shopId ? (shopNames[u.shopId] || `${u.shopId.slice(0,8)}…`) : '—'}</td>
                  <td>
                    <button className={`toggle-status-btn ${u.status==='ACTIVE'?'tog-active':'tog-suspended'}`} onClick={() => toggleStatus(u)}>
                      {u.status==='ACTIVE' ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>} {u.status}
                    </button>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="admin-row-btn" title="Edit" onClick={() => setEdit(u)}><Edit2 size={12}/></button>
                      <button className="admin-row-btn" title="View" onClick={() => openView(u)}><Eye size={12}/></button>
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
              <h2 className="modal-title">{editUser.name}</h2>
              <button className="modal-close" onClick={() => setEdit(null)}>✕</button>
            </div>
            <div className="modal-body">
              {editUser.shopId && (
                <>
                  <div className="modal-section-title">Linked shop activity</div>
                  <ModalStatGrid loading={viewLoad} items={viewStats ? [
                    { label: "Today's orders",  value: viewStats.todayOrders, icon: ShoppingBag, color:'#7C3AED', bg:'#EDE9FE' },
                    { label: "Today's revenue", value: `₹${Number(viewStats.todayRevenue||0).toLocaleString('en-IN')}`, icon: CreditCard, color:'#D97706', bg:'#FEF3C7' },
                    { label: '7-day revenue',   value: `₹${Number(viewStats.rev7d||0).toLocaleString('en-IN')}`, icon: TrendingUp, color:'#059669', bg:'#DCFCE7' },
                    { label: 'Staff',           value: viewStats.staffCount, icon: UserCog, color:'#2563EB', bg:'#DBEAFE' },
                  ] : []} />
                </>
              )}
              <div className="modal-section-title">Profile</div>
              <ModalFieldList fields={[
                ['User ID', editUser.id],
                ['Email', editUser.email],
                ['Phone', editUser.phone],
                ['Shop ID', editUser.shopId],
                ['Created', editUser.createdAt ? new Date(editUser.createdAt).toLocaleString('en-IN') : '—'],
              ]} />
              <div className="modal-section-title">Edit</div>
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

// ── Shared: compact stat tiles + field list for entity detail modals ──────────
function ModalStatGrid({ loading, items }) {
  if (loading) return <div style={{ padding:'8px 0', fontSize:12.5, color:'var(--gray-400)' }}>Loading activity…</div>;
  return (
    <div className="modal-stat-grid">
      {items.map(it => (
        <div key={it.label} className="modal-stat-card">
          <div className="modal-stat-icon" style={{ background:it.bg || '#F3F4F6', color:it.color || '#6B7280' }}>
            <it.icon size={14}/>
          </div>
          <div className="modal-stat-value">{it.value}</div>
          <div className="modal-stat-label">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

function ModalFieldList({ fields }) {
  return (
    <>
      {fields.map(([label, val]) => (
        <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--gray-100)', fontSize:13 }}>
          <span style={{ color:'var(--gray-500)', fontWeight:600 }}>{label}</span>
          <span style={{ color:'var(--gray-800)', fontFamily:'monospace', fontSize:12 }}>{val || '—'}</span>
        </div>
      ))}
    </>
  );
}

// ── Admin Shops Page ──────────────────────────────────────────────────────────
function AdminShopsPage() {
  const { lang } = useLang();
  const [shops, setShops]   = useState([]);
  const [search, setSearch] = useState('');
  const [planF, setPlanF]   = useState('all');
  const [statF, setStatF]   = useState('all');
  const [loading, setLoad]  = useState(true);
  const [error, setErr]     = useState('');
  const [viewShop, setView] = useState(null);
  const [viewStats, setViewStats] = useState(null);
  const [viewLoad, setViewLoad]   = useState(false);
  const [page, setPage]     = useState(0);
  const PAGE_SIZE = 20;

  const openView = async (s) => {
    setView(s); setViewStats(null); setViewLoad(true);
    try {
      const [rev, daily, staff, codes] = await Promise.allSettled([
        reportApi.getRevenue(s.id, 7),
        reportApi.getDaily(s.id),
        shopApi.getStaff(s.id),
        qrApi.getByShop(s.id),
      ]);
      const revDays = rev.status === 'fulfilled' ? (rev.value.data?.data || []) : [];
      const rev7d = revDays.reduce((sum, d) => sum + Number(d.revenue || d.total || 0), 0);
      const dailyData = daily.status === 'fulfilled' ? (daily.value.data?.data || {}) : {};
      const staffList = staff.status === 'fulfilled' ? (staff.value.data?.data || []) : [];
      const codesList = codes.status === 'fulfilled' ? (codes.value.data?.data || []) : [];
      setViewStats({
        todayOrders: dailyData.orders ?? dailyData.totalOrders ?? '—',
        todayRevenue: dailyData.revenue ?? dailyData.totalRevenue ?? 0,
        rev7d,
        staffCount: Array.isArray(staffList) ? staffList.length : 0,
        qrCount: Array.isArray(codesList) ? codesList.length : 0,
      });
    } catch {
      setViewStats({ todayOrders: '—', todayRevenue: 0, rev7d: 0, staffCount: 0, qrCount: 0 });
    } finally { setViewLoad(false); }
  };

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
        <div><h1 className="page-title">{t('navShops', lang)}</h1><p className="page-subtitle">{filtered.length} shops</p></div>
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
                        <span style={{ color: shopStatusInfo(s.status).color }}>{shopStatusInfo(s.status).label}</span>
                      </button>
                    </td>
                    <td style={{ fontSize:12, color:'var(--gray-400)' }}>
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:5 }}>
                        <button className="admin-row-btn" title="View details" onClick={() => openView(s)}><Eye size={12}/></button>
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
              <div className="modal-section-title">Activity</div>
              <ModalStatGrid loading={viewLoad} items={viewStats ? [
                { label: "Today's orders",  value: viewStats.todayOrders, icon: ShoppingBag, color:'#7C3AED', bg:'#EDE9FE' },
                { label: "Today's revenue", value: `₹${Number(viewStats.todayRevenue||0).toLocaleString('en-IN')}`, icon: CreditCard, color:'#D97706', bg:'#FEF3C7' },
                { label: '7-day revenue',   value: `₹${Number(viewStats.rev7d||0).toLocaleString('en-IN')}`, icon: TrendingUp, color:'#059669', bg:'#DCFCE7' },
                { label: 'Staff',           value: viewStats.staffCount, icon: UserCog, color:'#2563EB', bg:'#DBEAFE' },
                { label: 'QR codes',        value: viewStats.qrCount, icon: QrCode, color:'#7C3AED', bg:'#EDE9FE' },
              ] : []} />
              <div className="modal-section-title">Registration</div>
              <ModalFieldList fields={[
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
              ]} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Hotels Page ─────────────────────────────────────────────────────────
function AdminHotelsPage() {
  const { lang } = useLang();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoad]  = useState(true);
  const [error, setErr]     = useState('');
  const [viewHotel, setView] = useState(null);
  const [viewStats, setViewStats] = useState(null);
  const [viewLoad, setViewLoad]   = useState(false);

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

  const openView = async (h) => {
    setView(h); setViewStats(null); setViewLoad(true);
    try {
      const [roomsRes, reqRes] = await Promise.allSettled([
        hotelApi.getRooms(h.id),
        hotelApi.getRequests(h.id),
      ]);
      const rooms = roomsRes.status === 'fulfilled' ? (roomsRes.value.data?.data || []) : [];
      const requests = reqRes.status === 'fulfilled' ? (reqRes.value.data?.data || []) : [];
      const occupied = rooms.filter(r => (r.status || '').toUpperCase() === 'OCCUPIED').length;
      const pending = requests.filter(r => (r.status || '').toUpperCase() === 'NEW' || (r.status || '').toUpperCase() === 'PENDING').length;
      setViewStats({ roomCount: rooms.length, occupied, requestCount: requests.length, pending });
    } catch {
      setViewStats({ roomCount: 0, occupied: 0, requestCount: 0, pending: 0 });
    } finally { setViewLoad(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">{t('navHotels', lang)}</h1><p className="page-subtitle">{hotels.length} hotels</p></div>
        <button className="btn-refresh" onClick={load}><RefreshCw size={13}/> Refresh</button>
      </div>
      {error && <div className="demo-notice" style={{ background:'#FEE2E2', borderColor:'#FCA5A5', color:'#DC2626', marginBottom:12 }}>⚠ {error}</div>}
      {loading ? (
        <div style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading hotels…</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Hotel</th><th>Location</th><th>Phone</th><th>Services</th><th>Check-in / out</th><th>Owner ID</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {hotels.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>No hotels registered</td></tr>
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
                  <td>
                    <button className="admin-row-btn" title="View details" onClick={() => openView(h)}><Eye size={12}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewHotel && (
        <div className="modal-backdrop" onClick={() => setView(null)}>
          <div className="modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{viewHotel.name}</h2>
              <button className="modal-close" onClick={() => setView(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-section-title">Activity</div>
              <ModalStatGrid loading={viewLoad} items={viewStats ? [
                { label: 'Total rooms',       value: viewStats.roomCount, icon: BedDouble, color:'#2563EB', bg:'#DBEAFE' },
                { label: 'Occupied',          value: viewStats.occupied,  icon: BedDouble, color:'#7C3AED', bg:'#EDE9FE' },
                { label: 'Guest requests',    value: viewStats.requestCount, icon: ClipboardList, color:'#D97706', bg:'#FEF3C7' },
                { label: 'Pending requests',  value: viewStats.pending,   icon: AlertTriangle, color:'#DC2626', bg:'#FEE2E2' },
              ] : []} />
              <div className="modal-section-title">Registration</div>
              <ModalFieldList fields={[
                ['Hotel ID', viewHotel.id],
                ['Owner ID', viewHotel.ownerId],
                ['Phone', viewHotel.phone],
                ['Email', viewHotel.email],
                ['City', viewHotel.city],
                ['Address', viewHotel.address],
                ['Total rooms (registered)', viewHotel.totalRooms],
                ['Check-in / out', `${viewHotel.checkInTime || '—'} / ${viewHotel.checkOutTime || '—'}`],
                ['Plan', planInfo(viewHotel.subscriptionPlan).label],
                ['Enabled services', (viewHotel.enabledServices || []).join(', ') || '—'],
                ['Status', viewHotel.active === false ? 'Inactive' : 'Active'],
                ['Created', viewHotel.createdAt ? new Date(viewHotel.createdAt).toLocaleString('en-IN') : '—'],
              ]} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Malls Page ──────────────────────────────────────────────────────────
function AdminMallsPage() {
  const { lang } = useLang();
  const [malls, setMalls]   = useState([]);
  const [loading, setLoad]  = useState(true);
  const [error, setErr]     = useState('');
  const [viewMall, setView] = useState(null);
  const [viewVendors, setViewVendors] = useState(null);
  const [viewLoad, setViewLoad]       = useState(false);

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

  const openView = async (m) => {
    setView(m); setViewVendors(null); setViewLoad(true);
    try {
      const res = await mallApi.getVendors(m.id);
      setViewVendors(res.data?.data || []);
    } catch {
      setViewVendors([]);
    } finally { setViewLoad(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">{t('navMalls', lang)}</h1><p className="page-subtitle">{malls.length} malls</p></div>
        <button className="btn-refresh" onClick={load}><RefreshCw size={13}/> Refresh</button>
      </div>
      {error && <div className="demo-notice" style={{ background:'#FEE2E2', borderColor:'#FCA5A5', color:'#DC2626', marginBottom:12 }}>⚠ {error}</div>}
      {loading ? (
        <div style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading malls…</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Mall</th><th>City</th><th>Phone</th><th>Commission</th><th>Admin ID</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {malls.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>No malls registered</td></tr>
              )}
              {malls.map(m => (
                <tr key={m.id}>
                  <td><div style={{ fontWeight:700, fontSize:13.5 }}>{m.name}</div></td>
                  <td style={{ fontSize:13, color:'var(--gray-600)' }}>{m.city || '—'}</td>
                  <td style={{ fontSize:13 }}>{m.phone || '—'}</td>
                  <td style={{ fontSize:13 }}>{m.commissionPercent != null ? `${m.commissionPercent}%` : '—'}</td>
                  <td style={{ fontSize:11, fontFamily:'monospace', color:'var(--gray-400)' }}>{m.adminId?.slice(0,8)}…</td>
                  <td style={{ fontSize:12, color:'var(--gray-400)' }}>{m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                  <td>
                    <button className="admin-row-btn" title="View details" onClick={() => openView(m)}><Eye size={12}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMall && (
        <div className="modal-backdrop" onClick={() => setView(null)}>
          <div className="modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{viewMall.name}</h2>
              <button className="modal-close" onClick={() => setView(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-section-title">Activity</div>
              <ModalStatGrid loading={viewLoad} items={viewVendors ? [
                { label: 'Total vendors',  value: viewVendors.length, icon: Store, color:'#2563EB', bg:'#DBEAFE' },
                { label: 'Active',         value: viewVendors.filter(v => (v.status||'').toUpperCase()==='ACTIVE').length, icon: CheckCircle2, color:'#059669', bg:'#DCFCE7' },
                { label: 'Pending',        value: viewVendors.filter(v => (v.status||'').toUpperCase()==='PENDING').length, icon: Clock, color:'#D97706', bg:'#FEF3C7' },
              ] : []} />
              {viewVendors && viewVendors.length > 0 && (
                <>
                  <div className="modal-section-title">Vendors</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:160, overflowY:'auto' }}>
                    {viewVendors.map(v => (
                      <div key={v.id} className="modal-list-row">
                        <span style={{ fontWeight:600 }}>{v.name || v.shopName || v.id?.slice(0,8)}</span>
                        <span style={{ color: (v.status||'').toUpperCase()==='ACTIVE' ? 'var(--green-dark)' : 'var(--gray-500)', fontWeight:600, fontSize:11 }}>{v.status}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="modal-section-title">Registration</div>
              <ModalFieldList fields={[
                ['Mall ID', viewMall.id],
                ['Admin ID', viewMall.adminId],
                ['Phone', viewMall.phone],
                ['City', viewMall.city],
                ['Address', viewMall.address],
                ['Commission', viewMall.commissionPercent != null ? `${viewMall.commissionPercent}%` : '—'],
                ['Created', viewMall.createdAt ? new Date(viewMall.createdAt).toLocaleString('en-IN') : '—'],
              ]} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Suppliers Page ──────────────────────────────────────────────────────
function AdminSuppliersPage() {
  const { lang } = useLang();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoad]        = useState(true);
  const [error, setErr]           = useState('');
  const [viewUser, setView]       = useState(null);
  const [viewStats, setViewStats] = useState(null);
  const [viewLoad, setViewLoad]   = useState(false);
  const shopNames = useShopNameMap();

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

  const openView = async (u) => {
    setView(u); setViewStats(null);
    if (!u.shopId) return;
    setViewLoad(true);
    try {
      const [rev, daily, staff] = await Promise.allSettled([
        reportApi.getRevenue(u.shopId, 7),
        reportApi.getDaily(u.shopId),
        shopApi.getStaff(u.shopId),
      ]);
      const revDays = rev.status === 'fulfilled' ? (rev.value.data?.data || []) : [];
      const rev7d = revDays.reduce((sum, d) => sum + Number(d.revenue || d.total || 0), 0);
      const dailyData = daily.status === 'fulfilled' ? (daily.value.data?.data || {}) : {};
      const staffList = staff.status === 'fulfilled' ? (staff.value.data?.data || []) : [];
      setViewStats({
        todayOrders: dailyData.totalOrders ?? 0,
        todayRevenue: dailyData.totalRevenue ?? 0,
        rev7d,
        staffCount: Array.isArray(staffList) ? staffList.length : 0,
      });
    } catch {
      setViewStats({ todayOrders: 0, todayRevenue: 0, rev7d: 0, staffCount: 0 });
    } finally { setViewLoad(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">{t('navSuppliers', lang)}</h1><p className="page-subtitle">{suppliers.length} suppliers</p></div>
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
                  <td style={{ fontSize:12, color:'var(--gray-700)' }}>{u.shopId ? (shopNames[u.shopId] || `${u.shopId.slice(0,8)}…`) : '—'}</td>
                  <td>
                    <button className={`toggle-status-btn ${u.status==='ACTIVE'?'tog-active':'tog-suspended'}`} onClick={() => toggleStatus(u)}>
                      {u.status==='ACTIVE' ? <ToggleRight size={17}/> : <ToggleLeft size={17}/>} {u.status}
                    </button>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="admin-row-btn" title="View" onClick={() => openView(u)}><Eye size={12}/></button>
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

      {viewUser && (
        <div className="modal-backdrop" onClick={() => setView(null)}>
          <div className="modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{viewUser.name}</h2>
              <button className="modal-close" onClick={() => setView(null)}>✕</button>
            </div>
            <div className="modal-body">
              {viewUser.shopId ? (
                <>
                  <div className="modal-section-title">Linked shop activity</div>
                  <ModalStatGrid loading={viewLoad} items={viewStats ? [
                    { label: "Today's orders",  value: viewStats.todayOrders, icon: ShoppingBag, color:'#7C3AED', bg:'#EDE9FE' },
                    { label: "Today's revenue", value: `₹${Number(viewStats.todayRevenue||0).toLocaleString('en-IN')}`, icon: CreditCard, color:'#D97706', bg:'#FEF3C7' },
                    { label: '7-day revenue',   value: `₹${Number(viewStats.rev7d||0).toLocaleString('en-IN')}`, icon: TrendingUp, color:'#059669', bg:'#DCFCE7' },
                    { label: 'Staff',           value: viewStats.staffCount, icon: UserCog, color:'#2563EB', bg:'#DBEAFE' },
                  ] : []} />
                </>
              ) : (
                <div style={{ fontSize:12.5, color:'var(--gray-400)' }}>No shop linked to this supplier account yet.</div>
              )}
              <div className="modal-section-title">Profile</div>
              <ModalFieldList fields={[
                ['User ID', viewUser.id],
                ['Name', viewUser.name],
                ['Email', viewUser.email],
                ['Phone', viewUser.phone],
                ['Shop ID', viewUser.shopId],
                ['Status', viewUser.status],
                ['Created', viewUser.createdAt ? new Date(viewUser.createdAt).toLocaleString('en-IN') : '—'],
              ]} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Orders Page ─────────────────────────────────────────────────────────
// Resolves shopId → shop name once per mount, so Orders/Payments tables can
// show "Spice Route" instead of a meaningless truncated UUID.
function useShopNameMap() {
  const [names, setNames] = useState({});
  useEffect(() => {
    shopApi.list({ page: 0, size: 500 }).then(res => {
      const d = res.data?.data;
      const list = Array.isArray(d) ? d : d?.content || [];
      setNames(Object.fromEntries(list.map(s => [s.id, s.name])));
    }).catch(() => {});
  }, []);
  return names;
}

function AdminOrdersPage() {
  const { lang } = useLang();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statF, setStatF]   = useState('all');
  const [loading, setLoad]  = useState(true);
  const [error, setErr]     = useState('');
  const [page, setPage]     = useState(0);
  const [viewOrder, setView] = useState(null);
  const [viewLoad, setViewLoad] = useState(false);
  const shopNames = useShopNameMap();
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

  const openView = async (o) => {
    setView(o); setViewLoad(true);
    try {
      const res = await orderApi.getById(o.id);
      setView(res.data?.data || o);
    } catch { /* keep the row's own data as a fallback */ }
    finally { setViewLoad(false); }
  };

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
        <div><h1 className="page-title">{t('orders', lang)}</h1><p className="page-subtitle">Platform-wide · {filtered.length} shown</p></div>
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
              <tr><th>Order</th><th>Shop</th><th>Customer</th><th>Type</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>No orders found</td></tr>
              )}
              {filtered.map(o => (
                <tr key={o.id}>
                  <td style={{ fontFamily:'monospace', fontSize:12, fontWeight:700 }}>#{o.orderNumber}</td>
                  <td style={{ fontSize:12.5 }}>
                    <div style={{ fontWeight:600, color:'var(--gray-800)' }}>{shopNames[o.shopId] || '—'}</div>
                    <div style={{ fontSize:10.5, color:'var(--gray-400)', fontFamily:'monospace' }}>{o.shopId?.slice(0,8)}…</div>
                  </td>
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
                  <td>
                    <button className="admin-row-btn" title="View details" onClick={() => openView(o)}><Eye size={12}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order detail modal */}
      {viewOrder && (
        <div className="modal-backdrop" onClick={() => setView(null)}>
          <div className="modal" style={{ maxWidth:560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">#{viewOrder.orderNumber}</h2>
              <button className="modal-close" onClick={() => setView(null)}>✕</button>
            </div>
            <div className="modal-body">
              {viewLoad && <div style={{ textAlign:'center', padding:'12px 0', color:'var(--gray-400)', fontSize:12.5 }}>Loading full order…</div>}
              <div className="modal-section-title">Order</div>
              <ModalFieldList fields={[
                ['Shop', shopNames[viewOrder.shopId] || viewOrder.shopId],
                ['Customer', viewOrder.customerName],
                ['Phone', viewOrder.customerPhone],
                ['Table', viewOrder.tableNumber || '—'],
                ['Type', viewOrder.type],
                ['Status', viewOrder.status],
                ['Payment', `${viewOrder.paymentMethod || '—'} · ${viewOrder.paymentStatus || '—'}`],
                ['Subtotal', `₹${Number(viewOrder.subtotal||0).toLocaleString('en-IN')}`],
                ['Tax', `₹${Number(viewOrder.tax||0).toLocaleString('en-IN')}`],
                ['Total', `₹${Number(viewOrder.totalAmount||0).toLocaleString('en-IN')}`],
                ['Placed', viewOrder.createdAt ? new Date(viewOrder.createdAt).toLocaleString('en-IN') : '—'],
              ]} />
              <div className="modal-section-title">Items</div>
              {Array.isArray(viewOrder.items) && viewOrder.items.length > 0 ? (
                <div className="admin-table-card" style={{ marginBottom:0 }}>
                  <table className="admin-table">
                    <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
                    <tbody>
                      {viewOrder.items.map((it, i) => (
                        <tr key={i}>
                          <td style={{ fontSize:12.5 }}>{it.itemName || it.name}</td>
                          <td style={{ fontSize:12.5 }}>{it.quantity}</td>
                          <td style={{ fontSize:12.5, fontWeight:600 }}>₹{Number(it.totalPrice||0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ fontSize:12.5, color:'var(--gray-400)' }}>No items on this order.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Payments Page ───────────────────────────────────────────────────────
function AdminPaymentsPage() {
  const { lang } = useLang();
  const [payments, setPayments] = useState([]);
  const [statF, setStatF]       = useState('all');
  const [loading, setLoad]      = useState(true);
  const [error, setErr]         = useState('');
  const [page, setPage]         = useState(0);
  const shopNames = useShopNameMap();
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
        <div><h1 className="page-title">{t('navPayments', lang)}</h1><p className="page-subtitle">Platform-wide · {filtered.length} shown</p></div>
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
                  <td style={{ fontSize:12.5 }}>
                    <div style={{ fontWeight:600, color:'var(--gray-800)' }}>{shopNames[p.shopId] || '—'}</div>
                    <div style={{ fontSize:10.5, color:'var(--gray-400)', fontFamily:'monospace' }}>{p.shopId?.slice(0,8)}…</div>
                  </td>
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
  const { lang } = useLang();
  const [subTab, setSubTab]       = useState('assignments'); // assignments | plans | offers

  const [shops, setShops]         = useState([]);
  const [loading, setLoad]        = useState(true);
  const [error, setErr]           = useState('');
  const [planFilter, setPlanFilter]= useState('all');
  const [search, setSearch]       = useState('');
  const [changePlan, setChangePlan]= useState(null); // { shop, newPlan }
  const [toast, setToast]         = useState('');

  const [plans, setPlans]         = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

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

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const res = await planApi.listAdmin();
      setPlans(res.data?.data || []);
    } catch { /* keep whatever we had — page still works off local fallback colors */ }
    finally { setPlansLoading(false); }
  }, []);

  useEffect(() => { load(); loadPlans(); }, [load, loadPlans]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Live plan data (label/price) merged with a color, shadowing the module-level
  // hardcoded planInfo() so this page reflects admin edits made in "Manage Plans".
  const planInfo = (key) => {
    const k = (key || 'STARTER').toUpperCase();
    const live = plans.find(pl => pl.planKey === k);
    const fallback = PLANS[k];
    const color = fallback?.color || ((live?.price || 0) > 0 ? '#7C3AED' : '#6B7280');
    const bg    = fallback?.bg    || ((live?.price || 0) > 0 ? '#EDE9FE' : '#F3F4F6');
    return { label: live?.label || fallback?.label || k, price: live ? live.price : (fallback?.price || 0), color, bg };
  };

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

  const SUB_STATUS_CFG = {
    ACTIVE:        { label: 'Active',        color: '#059669', bg: '#DCFCE7' },
    TRIALING:      { label: 'Trialing',      color: '#2563EB', bg: '#DBEAFE' },
    TRIAL_EXPIRED: { label: 'Trial expired', color: '#DC2626', bg: '#FEE2E2' },
    CANCELED:      { label: 'Canceled',      color: '#6B7280', bg: '#F3F4F6' },
  };

  const trialDaysLeft = (shop) => {
    if (shop.subscriptionStatus !== 'TRIALING' || !shop.trialEndsAt) return null;
    const days = Math.ceil((new Date(shop.trialEndsAt) - new Date()) / 86400000);
    return days;
  };

  const setSubscriptionStatus = async (shop, status) => {
    try {
      await shopApi.updateSubscription(shop.id, status);
      setShops(prev => prev.map(s => s.id !== shop.id ? s : { ...s, subscriptionStatus: status, ...(status === 'CANCELED' ? { subscriptionPlan: 'STARTER', trialEndsAt: null } : {}) }));
      showToast(`${shop.name}'s subscription marked ${SUB_STATUS_CFG[status]?.label || status}`);
    } catch (e) { showToast(e.response?.data?.message || 'Failed to update subscription'); }
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

  // Plans a shop can actually be assigned — live, active, SHOP-vertical plans
  // (falls back to the hardcoded set if the Plan table hasn't loaded/is empty).
  const shopPlanOptions = plans.filter(p => p.vertical === 'SHOP' && p.active).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
  const planChoices = shopPlanOptions.length > 0
    ? shopPlanOptions.map(p => ({ key: p.planKey, ...planInfo(p.planKey) }))
    : Object.keys(PLANS).map(key => ({ key, ...planInfo(key) }));

  // KPIs
  const total    = shops.length;
  const paid     = shops.filter(s => planInfo(s.subscriptionPlan).price > 0).length;
  const free     = total - paid;
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
          <h1 className="page-title">{t('subscriptionManagement', lang)}</h1>
          <p className="page-subtitle">Manage plans, discount offers, billing & reminders</p>
        </div>
        <button className="btn-refresh" onClick={() => { load(); loadPlans(); }}><RefreshCw size={13}/> Refresh</button>
      </div>

      {/* Sub-tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:18, borderBottom:'1px solid var(--gray-200)' }}>
        {[
          { key:'assignments', label:'Shop Assignments', icon: Store },
          { key:'plans',       label:'Manage Plans',     icon: Layers },
          { key:'offers',      label:'Discount Offers',  icon: Gift },
        ].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', fontSize:13, fontWeight:600,
              border:'none', background:'none', cursor:'pointer', marginBottom:-1,
              color: subTab === t.key ? '#0F6E56' : 'var(--gray-500)',
              borderBottom: subTab === t.key ? '2px solid #0F6E56' : '2px solid transparent' }}>
            <t.icon size={14}/> {t.label}
          </button>
        ))}
      </div>

      {subTab === 'assignments' && (
        <>
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
              {planChoices.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>

          {error && <div className="demo-notice" style={{ background:'#FEE2E2', borderColor:'#FCA5A5', color:'#DC2626', marginBottom:12 }}>⚠ {error}</div>}

          {loading ? (
            <div style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading shops…</div>
          ) : (
            <div className="admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr><th>Shop</th><th>City</th><th>Plan</th><th>Subscription</th><th>Status</th><th>Tables</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>No shops found</td></tr>
                  )}
                  {filtered.map(s => {
                    const pi = planInfo(s.subscriptionPlan);
                    const subStatus = s.subscriptionStatus || 'ACTIVE';
                    const sc = SUB_STATUS_CFG[subStatus] || SUB_STATUS_CFG.ACTIVE;
                    const daysLeft = trialDaysLeft(s);
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
                          <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:sc.bg, color:sc.color }}>
                            {sc.label}
                          </span>
                          {daysLeft != null && (
                            <div style={{ fontSize:10.5, color:'var(--gray-400)', marginTop:3 }}>
                              <Clock size={9} style={{ verticalAlign:'middle', marginRight:2 }}/>
                              {daysLeft > 0 ? `${daysLeft}d left` : 'ends today'}
                            </div>
                          )}
                          {s.cancelRequestedAt && (
                            <div style={{ fontSize:10.5, color:'#D97706', marginTop:3 }}>Cancel requested</div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize:11, fontWeight:700, color: shopStatusInfo(s.status).color }}>
                            ● {shopStatusInfo(s.status).label}
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
                            {subStatus !== 'ACTIVE' && (
                              <button className="admin-row-btn" title="Mark subscription Active (confirm manual payment)"
                                onClick={() => setSubscriptionStatus(s, 'ACTIVE')}
                                style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', fontSize:11, fontWeight:600, color:'#059669' }}>
                                <CheckCircle2 size={11}/> Mark Active
                              </button>
                            )}
                            {subStatus !== 'CANCELED' && (
                              <button className="admin-row-btn" title="Cancel subscription (reverts to Starter)"
                                onClick={() => setSubscriptionStatus(s, 'CANCELED')}
                                style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', fontSize:11, fontWeight:600, color:'#DC2626' }}>
                                <XCircle size={11}/> Cancel
                              </button>
                            )}
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
                    {planChoices.map(pl => (
                      <button key={pl.key}
                        onClick={() => setChangePlan(p => ({ ...p, newPlan: pl.key }))}
                        style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                          padding:'12px 16px', borderRadius:10, border:`2px solid ${changePlan.newPlan === pl.key ? pl.color : 'var(--gray-200)'}`,
                          background: changePlan.newPlan === pl.key ? pl.bg : 'white',
                          cursor:'pointer', textAlign:'left' }}>
                        <div>
                          <div style={{ fontWeight:700, color:pl.color }}>{pl.label}</div>
                          <div style={{ fontSize:12, color:'var(--gray-500)' }}>
                            {pl.price === 0 ? (pl.key === 'ENTERPRISE' ? 'Custom pricing' : 'Free') : `₹${pl.price}/month`}
                          </div>
                        </div>
                        {changePlan.newPlan === pl.key && <CheckCircle2 size={18} color={pl.color}/>}
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
        </>
      )}

      {subTab === 'plans'  && <AdminPlansManager plans={plans} loading={plansLoading} onChanged={loadPlans}/>}
      {subTab === 'offers' && <AdminOffersManager plans={plans}/>}
    </div>
  );
}

// ── Admin: Manage Plans ──────────────────────────────────────────────────────
const EMPTY_PLAN_FORM = { id:null, planKey:'', label:'', vertical:'SHOP', price:0, features:'', sortOrder:0 };

function AdminPlansManager({ plans, loading, onChanged }) {
  const [verticalFilter, setVerticalFilter] = useState('all');
  const [form, setForm]     = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');
  const [toast, setToast]   = useState('');

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const openNew  = () => { setErr(''); setForm({ ...EMPTY_PLAN_FORM }); };
  const openEdit = (p) => { setErr(''); setForm({ id:p.id, planKey:p.planKey, label:p.label, vertical:p.vertical, price:p.price, features:p.features||'', sortOrder:p.sortOrder||0 }); };

  const save = async () => {
    if (!form.planKey.trim() || !form.label.trim()) { setErr('Plan key and label are required'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        planKey: form.planKey.trim(), label: form.label.trim(), vertical: form.vertical,
        price: Number(form.price) || 0, features: form.features, sortOrder: Number(form.sortOrder) || 0,
      };
      if (form.id) await planApi.update(form.id, payload);
      else await planApi.create(payload);
      showToast(form.id ? 'Plan updated' : 'Plan created');
      setForm(null);
      onChanged();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to save plan');
    } finally { setSaving(false); }
  };

  const toggleActive = async (p) => {
    try {
      await planApi.toggleActive(p.id, !p.active);
      onChanged();
      showToast(`${p.label} ${p.active ? 'hidden from' : 'now shown on'} customer pages`);
    } catch { showToast('Failed to update plan'); }
  };

  const filtered = verticalFilter === 'all' ? plans : plans.filter(p => p.vertical === verticalFilter);

  return (
    <div>
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:'#1F2937', color:'#fff', padding:'12px 20px', borderRadius:10, zIndex:9999, fontSize:13, fontWeight:600 }}>
          ✓ {toast}
        </div>
      )}

      <div className="admin-filter-bar">
        <select className="admin-filter-select" value={verticalFilter} onChange={e => setVerticalFilter(e.target.value)}>
          <option value="all">All verticals</option>
          {Object.keys(VERTICAL_COLORS).map(v => <option key={v} value={v}>{VERTICAL_COLORS[v].label}</option>)}
        </select>
        <button onClick={openNew}
          style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6,
            background:'linear-gradient(135deg,#0F6E56,#1D9E75)', color:'#fff', border:'none',
            borderRadius:8, padding:'9px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          <Plus size={14}/> Add Plan
        </button>
      </div>

      {loading ? (
        <div style={{ padding:'40px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading plans…</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Plan</th><th>Vertical</th><th>Price</th><th>Features</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>No plans found</td></tr>
              )}
              {filtered.map(p => {
                const v = VERTICAL_COLORS[p.vertical] || VERTICAL_COLORS.SHOP;
                const featureList = (p.features || '').split('\n').map(f => f.trim()).filter(Boolean);
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight:700, fontSize:13.5 }}>{p.label}</div>
                      <div style={{ fontSize:11, color:'var(--gray-400)', fontFamily:'monospace' }}>{p.planKey}</div>
                    </td>
                    <td><span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:v.bg, color:v.color }}>{v.label}</span></td>
                    <td style={{ fontWeight:700, fontSize:13 }}>{p.price > 0 ? `₹${p.price.toLocaleString('en-IN')}/mo` : 'Free'}</td>
                    <td style={{ fontSize:12, color:'var(--gray-500)', maxWidth:240 }}>
                      {featureList.slice(0, 2).join(', ')}{featureList.length > 2 ? ` +${featureList.length - 2} more` : ''}
                    </td>
                    <td>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:20,
                        background: p.active ? '#DCFCE7' : '#F3F4F6', color: p.active ? '#059669' : '#6B7280' }}>
                        {p.active ? 'Live' : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="admin-row-btn" title="Edit" onClick={() => openEdit(p)} style={{ color:'#2563EB' }}><Edit2 size={13}/></button>
                        <button className="admin-row-btn" title={p.active ? 'Hide from customers' : 'Show to customers'}
                          onClick={() => toggleActive(p)} style={{ color: p.active ? '#DC2626' : '#059669' }}>
                          {p.active ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
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

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <div className="modal" style={{ maxWidth:480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{form.id ? 'Edit plan' : 'Add plan'}</h2>
              <button className="modal-close" onClick={() => setForm(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, marginBottom:4 }}>
                  Plan key {form.id && <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(locked — printed/assigned shops keep referencing it)</span>}
                </label>
                <input value={form.planKey} disabled={!!form.id}
                  onChange={e => setForm(f => ({ ...f, planKey: e.target.value.toUpperCase() }))}
                  placeholder="e.g. GROWTH"
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', boxSizing:'border-box',
                    background: form.id ? 'var(--gray-100)' : 'white' }}/>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, marginBottom:4 }}>Label</label>
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Growth"
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', boxSizing:'border-box' }}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, marginBottom:4 }}>Vertical</label>
                  <select value={form.vertical} onChange={e => setForm(f => ({ ...f, vertical: e.target.value }))}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)' }}>
                    {Object.keys(VERTICAL_COLORS).map(v => <option key={v} value={v}>{VERTICAL_COLORS[v].label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, marginBottom:4 }}>Price (₹/month, 0 = free)</label>
                  <input type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', boxSizing:'border-box' }}/>
                </div>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, marginBottom:4 }}>
                  Features <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(one per line)</span>
                </label>
                <textarea rows={5} value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', boxSizing:'border-box', fontFamily:'inherit', fontSize:13 }}/>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, marginBottom:4 }}>Sort order <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(lower shows first)</span></label>
                <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                  style={{ width:120, padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', boxSizing:'border-box' }}/>
              </div>
              {err && <p style={{ color:'#DC2626', fontSize:13, margin:0 }}>{err}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save plan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin: Discount Offers ───────────────────────────────────────────────────
const EMPTY_OFFER_FORM = { id:null, title:'', description:'', code:'', discountPercent:10, applicablePlans:'ALL', startsAt:'', endsAt:'' };

function offerStatus(o) {
  if (!o.active) return { label:'Draft', color:'#6B7280', bg:'#F3F4F6' };
  const now = new Date();
  if (o.startsAt && new Date(o.startsAt) > now) return { label:'Scheduled', color:'#D97706', bg:'#FEF3C7' };
  if (o.endsAt && new Date(o.endsAt) < now)     return { label:'Expired',   color:'#DC2626', bg:'#FEE2E2' };
  return { label:'Live', color:'#059669', bg:'#DCFCE7' };
}

function AdminOffersManager({ plans }) {
  const [offers, setOffers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState(null);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');
  const [toast, setToast]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await offerApi.listAdmin(); setOffers(res.data?.data || []); }
    catch { /* leave previous list visible */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const openNew  = () => { setErr(''); setForm({ ...EMPTY_OFFER_FORM }); };
  const openEdit = (o) => { setErr(''); setForm({
    id:o.id, title:o.title, description:o.description||'', code:o.code||'',
    discountPercent:o.discountPercent, applicablePlans:o.applicablePlans||'ALL',
    startsAt: o.startsAt ? o.startsAt.slice(0,16) : '', endsAt: o.endsAt ? o.endsAt.slice(0,16) : '',
  }); };

  const save = async () => {
    if (!form.title.trim()) { setErr('Title is required'); return; }
    const pct = Number(form.discountPercent);
    if (!pct || pct <= 0 || pct > 100) { setErr('Discount must be between 1 and 100%'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        title: form.title.trim(), description: form.description, code: form.code,
        discountPercent: pct, applicablePlans: form.applicablePlans,
        startsAt: form.startsAt || null, endsAt: form.endsAt || null,
      };
      if (form.id) await offerApi.update(form.id, payload);
      else await offerApi.create(payload);
      showToast(form.id ? 'Offer updated' : 'Offer saved as draft');
      setForm(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to save offer');
    } finally { setSaving(false); }
  };

  const release = async (o) => {
    try {
      await offerApi.toggleActive(o.id, !o.active);
      load();
      showToast(!o.active ? `"${o.title}" released to customers` : `"${o.title}" withdrawn`);
    } catch { showToast('Failed to update offer'); }
  };

  const remove = async (o) => {
    if (!confirm(`Delete offer "${o.title}"? This cannot be undone.`)) return;
    try { await offerApi.remove(o.id); load(); showToast('Offer deleted'); }
    catch { showToast('Failed to delete offer'); }
  };

  return (
    <div>
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:'#1F2937', color:'#fff', padding:'12px 20px', borderRadius:10, zIndex:9999, fontSize:13, fontWeight:600 }}>
          ✓ {toast}
        </div>
      )}

      <div className="admin-filter-bar">
        <span style={{ fontSize:12, color:'var(--gray-500)' }}>{offers.length} offer{offers.length !== 1 ? 's' : ''}</span>
        <button onClick={openNew}
          style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6,
            background:'linear-gradient(135deg,#0F6E56,#1D9E75)', color:'#fff', border:'none',
            borderRadius:8, padding:'9px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          <Plus size={14}/> Create Offer
        </button>
      </div>

      {loading ? (
        <div style={{ padding:'40px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading offers…</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Offer</th><th>Discount</th><th>Applies to</th><th>Window</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {offers.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>No offers yet — create one to promote a plan</td></tr>
              )}
              {offers.map(o => {
                const st = offerStatus(o);
                return (
                  <tr key={o.id}>
                    <td>
                      <div style={{ fontWeight:700, fontSize:13.5 }}>{o.title}</div>
                      {o.code && <div style={{ fontSize:11, color:'var(--gray-400)', fontFamily:'monospace' }}>Code: {o.code}</div>}
                    </td>
                    <td style={{ fontWeight:700, color:'#DC2626' }}>{o.discountPercent}% off</td>
                    <td style={{ fontSize:12, color:'var(--gray-500)' }}>{o.applicablePlans === 'ALL' ? 'All plans' : o.applicablePlans}</td>
                    <td style={{ fontSize:11, color:'var(--gray-400)' }}>
                      {o.startsAt ? new Date(o.startsAt).toLocaleDateString('en-IN') : 'Now'} → {o.endsAt ? new Date(o.endsAt).toLocaleDateString('en-IN') : 'No end'}
                    </td>
                    <td><span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:20, background:st.bg, color:st.color }}>{st.label}</span></td>
                    <td>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        <button className="admin-row-btn" title="Edit" onClick={() => openEdit(o)} style={{ color:'#2563EB' }}><Edit2 size={12}/></button>
                        <button className="admin-row-btn" title={o.active ? 'Withdraw' : 'Release to customers'}
                          onClick={() => release(o)}
                          style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', fontSize:11, fontWeight:600, color: o.active ? '#DC2626' : '#059669' }}>
                          {o.active ? <><ToggleRight size={12}/> Withdraw</> : <><ToggleLeft size={12}/> Release</>}
                        </button>
                        <button className="admin-row-btn admin-row-btn-danger" title="Delete" onClick={() => remove(o)}><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <div className="modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{form.id ? 'Edit offer' : 'Create discount offer'}</h2>
              <button className="modal-close" onClick={() => setForm(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, marginBottom:4 }}>Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Diwali Sale — 20% off Growth & Business"
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, marginBottom:4 }}>Description <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(optional)</span></label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', boxSizing:'border-box', fontFamily:'inherit', fontSize:13 }}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, marginBottom:4 }}>Discount %</label>
                  <input type="number" min={1} max={100} value={form.discountPercent}
                    onChange={e => setForm(f => ({ ...f, discountPercent: e.target.value }))}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, marginBottom:4 }}>Promo code <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(optional)</span></label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. DIWALI20"
                    style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', boxSizing:'border-box' }}/>
                </div>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, marginBottom:4 }}>Applies to</label>
                <select value={form.applicablePlans} onChange={e => setForm(f => ({ ...f, applicablePlans: e.target.value }))}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)' }}>
                  <option value="ALL">All plans</option>
                  {plans.map(p => <option key={p.planKey} value={p.planKey}>{p.label} ({VERTICAL_COLORS[p.vertical]?.label || p.vertical})</option>)}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, marginBottom:4 }}>Starts <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(optional)</span></label>
                  <input type="datetime-local" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, marginBottom:4 }}>Ends <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(optional)</span></label>
                  <input type="datetime-local" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', boxSizing:'border-box' }}/>
                </div>
              </div>
              {err && <p style={{ color:'#DC2626', fontSize:13, margin:0 }}>{err}</p>}
              <p style={{ margin:0, fontSize:11, color:'var(--gray-400)' }}>
                <Percent size={11} style={{ verticalAlign:'-1px', marginRight:4 }}/>
                Offers save as a draft — use <strong>Release</strong> in the table to make them live for customers.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save offer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Reports ─────────────────────────────────────────────────────────────
export function AdminReports() {
  const { lang } = useLang();
  const [stats, setStats]  = useState(null);
  const [loading, setLoad] = useState(true);

  useEffect(() => {
    reportApi.getPlatform()
      .then(r => setStats(r.data?.data))
      .catch(() => {})
      .finally(() => setLoad(false));
  }, []);

  const fmt  = n => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  // Crore-only formatting rounded every sub-crore amount down to "₹0.00Cr" — fall
  // back to lakhs, then plain rupees, for amounts below 1 crore.
  const fmtC = n => {
    const v = Number(n || 0);
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
    if (v >= 100000)   return `₹${(v / 100000).toFixed(2)}L`;
    return `₹${fmt(v)}`;
  };

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
      <div className="page-header"><h1 className="page-title">{t('platformReports', lang)}</h1></div>
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
  // No platform-wide settings entity/endpoint exists in the backend yet (unlike
  // per-shop settings) — inputs are controlled so they at least behave like a real
  // form, but Save is honestly disabled rather than silently doing nothing or
  // faking persistence with no backend to write to.
  const [values, setValues] = useState({});
  const setField = (f, v) => setValues(prev => ({ ...prev, [f]: v }));

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
                <input className="form-input" placeholder={`Enter ${f.toLowerCase()}`}
                  value={values[f] || ''} onChange={e => setField(f, e.target.value)}/>
              </div>
            ))}
          </div>
          <div style={{ marginTop:14, display:'flex', justifyContent:'flex-end', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:11.5, color:'var(--gray-400)' }}>Platform-wide settings storage isn't built yet</span>
            <button className="btn btn-primary" disabled title="No backend endpoint exists yet for platform-wide settings">Save</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Admin QR Codes Page ───────────────────────────────────────────────────────
export function AdminQRCodesPage() {
  const { lang } = useLang();
  const [codes, setCodes]     = useState([]);
  const [typeF, setTypeF]     = useState('all');
  const [activeF, setActiveF] = useState('all');
  const [loading, setLoad]    = useState(true);
  const [error, setErr]       = useState('');
  const [page, setPage]       = useState(0);
  const [toggling, setToggling] = useState({});
  const [toast, setToast]     = useState('');
  const [editQr, setEditQr]   = useState(null);
  const [shopPickerOpen, setShopPickerOpen] = useState(false);
  const [posterShop, setPosterShop]         = useState(null); // { id, name } once picked
  const [posterMarketing, setPosterMarketing] = useState(false); // Poster Studio in "landing page" mode (no shop)
  const [previewQr, setPreviewQr] = useState(null);
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
          <h1 className="page-title">{t('qrCodes', lang)}</h1>
          <p className="page-subtitle">Platform-wide · {codes.length} total · {totalScans.toLocaleString('en-IN')} scans</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button className="btn-refresh" onClick={() => setShopPickerOpen(true)}>
            <Sparkles size={13}/> Poster Studio
          </button>
          <button className="btn-refresh" onClick={() => load(0)}><RefreshCw size={13}/> Refresh</button>
        </div>
      </div>

      <AdminShopPicker
        open={shopPickerOpen}
        onClose={() => setShopPickerOpen(false)}
        onPick={(shop) => { setPosterShop(shop); setShopPickerOpen(false); }}
        onPickMarketing={() => { setPosterMarketing(true); setShopPickerOpen(false); }}
      />
      <QrPosterStudio
        open={!!posterShop || posterMarketing}
        onClose={() => { setPosterShop(null); setPosterMarketing(false); setEditQr(null); }}
        shopId={posterShop?.id}
        shopName={posterShop?.name || 'AviQR'}
        marketing={posterMarketing}
        editTarget={posterMarketing ? editQr : null}
        onSaved={() => load(page)}
      />

      {previewQr && (
        <div className="qps-overlay" onClick={() => setPreviewQr(null)}>
          <div className="qps-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="qps-header">
              <div>
                <h2>{previewQr.label || 'QR Code'}</h2>
                <p className="qps-header-sub">{previewQr.type || 'SHOP'} · {(previewQr.scanCount || 0).toLocaleString('en-IN')} scans</p>
              </div>
              <button className="qps-close" onClick={() => setPreviewQr(null)}>×</button>
            </div>
            <div className="qps-body" style={{ padding: '24px', textAlign: 'center' }}>
              <img src={qrApi.imageUrl(previewQr.qrCode)} alt="QR Code"
                style={{ width: 200, height: 200, borderRadius: 12, border: '1px solid var(--gray-200, #e5e7eb)' }}/>
              <p style={{ marginTop: 14, fontSize: 11, fontFamily: 'monospace', color: 'var(--gray-400, #9ca3af)', wordBreak: 'break-all' }}>
                {previewQr.targetUrl}
              </p>
            </div>
            <div className="qps-footer qps-footer-actions">
              <a className="btn btn-secondary" href={qrApi.imageUrl(previewQr.qrCode)} target="_blank" rel="noreferrer">
                <Download size={14}/> Download
              </a>
              <a className="btn btn-primary" href={previewQr.targetUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={14}/> Preview as Customer
              </a>
            </div>
          </div>
        </div>
      )}

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
                        title="Preview"
                        onClick={() => setPreviewQr(qr)}>
                        <Eye size={13}/>
                      </button>
                      {qr.type === 'CAMPAIGN' && (
                        <button
                          className="admin-row-btn"
                          title="Edit marketing QR"
                          onClick={() => { setEditQr(qr); setPosterMarketing(true); }}
                          style={{ color: '#7C3AED' }}>
                          <Edit2 size={13}/>
                        </button>
                      )}
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

// Shop-picker used by Admin's "Poster Studio" entry — the studio needs one
// specific shop's data (address/offers/products), so admin picks it first,
// mirroring the search/filter list pattern from AdminSubscriptionManagement
// rather than a plain <select> (shops can number in the hundreds).
function AdminShopPicker({ open, onClose, onPick, onPickMarketing }) {
  const [shops, setShops]   = useState([]);
  const [loading, setLoad]  = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoad(true);
    shopApi.list({ size: 200 })
      .then(res => {
        const d = res.data?.data;
        setShops(Array.isArray(d) ? d : d?.content || []);
      })
      .catch(() => {})
      .finally(() => setLoad(false));
  }, [open]);

  if (!open) return null;

  const filtered = shops.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [s.name, s.city, s.email, s.phone].some(f => f?.toLowerCase().includes(q));
  });

  return (
    <div className="qps-overlay" onClick={onClose}>
      <div className="qps-modal" style={{ maxWidth: 480, maxHeight: '70vh' }} onClick={e => e.stopPropagation()}>
        <div className="qps-header">
          <h2>Pick a shop</h2>
          <button className="qps-close" onClick={onClose}>×</button>
        </div>
        <div className="qps-body">
          <button
            className="qps-dest-card"
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}
            onClick={onPickMarketing}>
            <Sparkles size={16} style={{ flexShrink: 0, color: '#0F6E56' }}/>
            <span>
              <div className="qps-dest-title">🌐 Marketing / Landing Page</div>
              <div className="qps-dest-desc">Not tied to a shop — website, pricing, demo, custom URL…</div>
            </span>
          </button>
          <div className="qps-field">
            <input placeholder="Search name, city, email…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          </div>
          <div className="qps-item-picker">
            {loading && <div style={{ padding: 14, fontSize: 13, color: 'var(--gray-500)' }}>Loading…</div>}
            {!loading && filtered.map(s => (
              <div key={s.id} className="qps-item-row" onClick={() => onPick(s)}>
                <span>{s.name}</span>
                <span style={{ color: 'var(--gray-500)' }}>{s.city}</span>
              </div>
            ))}
            {!loading && filtered.length === 0 && (
              <div style={{ padding: 14, fontSize: 13, color: 'var(--gray-500)' }}>No shops found.</div>
            )}
          </div>
        </div>
      </div>
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