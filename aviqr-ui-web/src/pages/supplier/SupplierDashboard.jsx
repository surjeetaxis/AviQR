import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { shopApi, menuApi, orderApi, qrApi, reportApi, authApi, brandApi } from '../../api/index.js';
import QRCode from 'qrcode';
import SubscriptionPage from '../../components/shared/SubscriptionPage.jsx';
import ProfileMenu from '../../components/shared/ProfileMenu.jsx';
import {
  Store, BarChart2, ShoppingBag, Tag, QrCode, Settings, LogOut,
  Menu as MenuIcon, TrendingUp, CreditCard, ArrowLeft, ChevronRight,
  RefreshCw, Save, CheckCircle2, XCircle, Package, Edit2, Plus, Search, Star,
  Eye, Sparkles
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import '../admin/Admin.css';
import '../admin/AdminExtra.css';
import '../hotel/HotelExtra.css';
import './Supplier.css';

const NAV = [
  { key: 'overview', label: 'Overview',   icon: BarChart2 },
  { key: 'outlets',  label: 'Outlets',    icon: Store },
  { key: 'menu',     label: 'Menu Sync',  icon: Tag },
  { key: 'orders',   label: 'All Orders', icon: ShoppingBag },
  { key: 'qr',       label: 'QR Codes',  icon: QrCode },
  { key: 'reports',  label: 'Reports',   icon: TrendingUp },
  { key: 'subscription', label: 'Subscription', icon: Star },
  { key: 'settings', label: 'Settings',  icon: Settings },
];

const WEEKLY_FALLBACK = [
  { day: 'Mon', revenue: 0 }, { day: 'Tue', revenue: 0 }, { day: 'Wed', revenue: 0 },
  { day: 'Thu', revenue: 0 }, { day: 'Fri', revenue: 0 }, { day: 'Sat', revenue: 0 }, { day: 'Sun', revenue: 0 },
];

export default function SupplierDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [outlets, setOutlets] = useState([]);
  const [weekly, setWeekly] = useState(WEEKLY_FALLBACK);
  const [loadingOutlets, setLoadingOutlets] = useState(true);
  const [managingOutlet, setManagingOutlet] = useState(null);
  const [brand, setBrand] = useState(null);

  const loadOutlets = () => {
    setLoadingOutlets(true);
    shopApi.getMyShops()
      .then(res => {
        const shops = res.data.data || [];
        const base = shops.map(s => ({
          id: s.id,
          name: s.name,
          phone: s.phone,
          city: s.city,
          shopStatus: s.status || 'ACTIVE',
          orders: 0,
          revenue: 0,
        }));
        setOutlets(base);
        setLoadingOutlets(false);
        // Today's orders/revenue per outlet — the supplier's own login token has
        // no shopId, so report-service's same-shop check 403s a direct call;
        // mint a shop-scoped token first (same pattern as ReportsTab below).
        Promise.all(base.map(o =>
          shopApi.enter(o.id)
            .then(res => reportApi.getDaily(o.id, res.data.data.accessToken))
            .then(res => ({ id: o.id, ...res.data.data }))
            .catch(() => null)
        )).then(results => {
          setOutlets(prev => prev.map(o => {
            const r = results.find(x => x?.id === o.id);
            return r ? { ...o, orders: r.totalOrders || 0, revenue: r.totalRevenue || 0 } : o;
          }));
        });
      })
      .catch(() => setLoadingOutlets(false));
  };

  useEffect(() => {
    loadOutlets();
    brandApi.getMine().then(res => setBrand(res.data.data)).catch(() => setBrand(null));
  }, []);

  if (managingOutlet) {
    return (
      <OutletManager
        outlet={managingOutlet}
        onBack={() => setManagingOutlet(null)}
        user={user}
        logout={logout}
        navigate={navigate}
      />
    );
  }

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <QrCode size={18} style={{ color: '#5DCAA5' }} />
            <span className="admin-brand-name">Avi<em>QR</em></span>
            <span className="admin-role-tag supplier-tag">SUPPLIER</span>
          </div>
        </div>
        <div className="admin-user-card">
          <div className="admin-avatar" style={{ background: 'var(--blue)' }}>{user?.avatar || 'S'}</div>
          <div>
            <div className="admin-user-name">{brand?.name || user?.name || 'Supplier'}</div>
            <div className="admin-user-role">Supplier · {outlets.length} outlets</div>
          </div>
        </div>
        <nav className="admin-nav">
          {NAV.map(n => (
            <button
              key={n.key}
              className={`admin-nav-item ${tab === n.key ? 'active' : ''}`}
              onClick={() => { setTab(n.key); setSidebarOpen(false); }}
            >
              <n.icon size={16} /> {n.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button className="admin-logout" onClick={() => { logout(); navigate('/'); }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-mobile-menu" onClick={() => setSidebarOpen(o => !o)}>
            <MenuIcon size={20} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>Supplier Dashboard</span>
          <ProfileMenu
            name={user?.name}
            email={user?.email}
            avatar={user?.avatar}
            avatarColor="var(--blue)"
            onLogout={() => { logout(); navigate('/'); }}
            items={[
              { label:'Profile & Settings', icon:Settings, onClick:() => setTab('settings') },
              ...(brand ? [{ label:'Preview all outlets', icon:Eye, onClick:() => navigate(`/brand/${brand.id}`) }]
                : outlets.length ? [{ label:'Preview customer menu', icon:Eye, onClick:() => navigate(`/menu/${outlets[0].id}`) }] : []),
              { label:'Onboarding guide', icon:Sparkles, onClick:() => navigate('/onboarding') },
            ]}
          />
        </header>
        <main className="admin-content">
          {tab === 'overview' && (
            <SupplierOverview
              outlets={outlets}
              weekly={weekly}
              loading={loadingOutlets}
              onManage={setManagingOutlet}
              onReload={loadOutlets}
            />
          )}
          {tab === 'outlets' && (
            <OutletsList outlets={outlets} loading={loadingOutlets} onManage={setManagingOutlet} onReload={loadOutlets} />
          )}
          {tab === 'menu'    && <MenuSyncTab outlets={outlets} />}
          {tab === 'orders'  && <AllOrdersTab outlets={outlets} />}
          {tab === 'qr'      && <QRCodesTab outlets={outlets} brand={brand} onBrandSaved={setBrand} />}
          {tab === 'reports' && <ReportsTab outlets={outlets} />}
          {tab === 'subscription' && <SubscriptionPage userRole="supplier" currentPlan="SUPPLIER_PRO" />}
          {tab === 'settings'&& <SettingsTab user={user} brand={brand} onBrandSaved={setBrand} />}
        </main>
      </div>
    </div>
  );
}

/* ─── Overview ─────────────────────────────────────────────────────────────── */
function SupplierOverview({ outlets, weekly, loading, onManage, onReload }) {
  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Loading outlets…</div>;
  const totalRevenue = outlets.reduce((a, o) => a + o.revenue, 0);
  const totalOrders  = outlets.reduce((a, o) => a + o.orders, 0);
  return (
    <div className="admin-overview">
      <div className="page-header">
        <div>
          <h1 className="page-title">Brand Overview</h1>
          <p className="page-subtitle">All outlets · today</p>
        </div>
      </div>
      <div className="admin-kpi-grid">
        {[
          { label: 'Total outlets',  value: outlets.length,                                          icon: Store,     color: 'green' },
          { label: 'Active now',     value: outlets.filter(o => o.shopStatus === 'ACTIVE').length,    icon: TrendingUp,color: 'blue' },
          { label: 'Orders today',   value: totalOrders,                                                icon: ShoppingBag,color:'purple' },
          { label: 'Revenue today',  value: `₹${totalRevenue.toLocaleString('en-IN')}`,               icon: CreditCard,color: 'amber' },
        ].map(k => (
          <div key={k.label} className="admin-kpi-card">
            <div className={`admin-kpi-icon icon-${k.color}`}><k.icon size={18} /></div>
            <div className="admin-kpi-value">{k.value}</div>
            <div className="admin-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>
      <div className="admin-chart-card">
        <h3>Combined revenue — last 7 days</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weekly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 12 }} />
            <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <OutletsList outlets={outlets} onManage={onManage} onReload={onReload} />
    </div>
  );
}

const SUPPLIER_ROOM_STATUS = { ACTIVE: 'rs-occupied', INACTIVE: 'rs-vacant', SUSPENDED: 'rs-maintenance' };

/* ─── Outlets list — same card layout as the Hotel Outlets page ─────────────── */
function OutletsList({ outlets, loading, onManage, onReload }) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', city: '' });
  const [saving, setSaving] = useState(false);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Loading outlets…</div>;
  const filtered = search.trim()
    ? outlets.filter(o => o.name?.toLowerCase().includes(search.trim().toLowerCase()))
    : outlets;

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    try {
      await shopApi.create({ name: form.name, phone: form.phone, city: form.city });
      setForm({ name: '', phone: '', city: '' });
      setShowForm(false);
      onReload?.();
    } catch { alert('Could not create outlet'); }
    finally { setSaving(false); }
  };

  const toggleActive = (o) => shopApi
    .updateStatus(o.id, o.shopStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
    .then(onReload)
    .catch(() => alert('Could not update outlet status'));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Outlets</h1>
          <p className="page-subtitle">{outlets.length} outlet{outlets.length !== 1 ? 's' : ''} · each gets its own menu, staff &amp; billing</p>
        </div>
        <button className="btn-refresh" onClick={() => setShowForm(f => !f)}><Plus size={13} /> Add outlet</button>
      </div>

      {showForm && (
        <form onSubmit={create} className="admin-chart-card" style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div className="form-field">
            <label className="form-label">Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Domino's — Indiranagar" required />
          </div>
          <div className="form-field">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 9845012345" required />
          </div>
          <div className="form-field">
            <label className="form-label">City</label>
            <input className="form-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Bengaluru" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
        </form>
      )}

      {outlets.length > 0 && (
        <div style={{ position: 'relative', maxWidth: 320, marginBottom: 16 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--gray-400)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search outlet by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}
      {outlets.length === 0 && (
        <div className="admin-stub">
          <div className="admin-stub-icon"><Store size={28} /></div>
          <h2>No outlets yet</h2>
          <p>Add your first outlet or link an existing restaurant.</p>
        </div>
      )}
      {outlets.length > 0 && filtered.length === 0 && (
        <div className="admin-stub">
          <div className="admin-stub-icon"><Search size={28} /></div>
          <h2>No matches</h2>
          <p>No outlets match "{search}".</p>
        </div>
      )}
      <div className="rooms-grid">
        {filtered.map(o => (
          <div key={o.id} className="room-card">
            <div className="room-card-header">
              <div className="room-number">{o.name}</div>
              <span className={`room-status-badge ${SUPPLIER_ROOM_STATUS[o.shopStatus] || 'rs-vacant'}`}>
                {o.shopStatus === 'ACTIVE' ? 'Active' : o.shopStatus === 'SUSPENDED' ? 'Suspended' : 'Inactive'}
              </span>
            </div>
            <div className="room-type">{o.city || 'No city set'}</div>
            <div className="outlet-stats" style={{ marginBottom: 10 }}>
              <div>
                <div className="outlet-stat-val">{o.orders}</div>
                <div className="outlet-stat-lbl">Orders today</div>
              </div>
              <div>
                <div className="outlet-stat-val">₹{o.revenue.toLocaleString('en-IN')}</div>
                <div className="outlet-stat-lbl">Revenue today</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="btn-room-action" onClick={() => onManage(o)}>⚙️ Manage</button>
              <button className="btn-room-action" onClick={() => toggleActive(o)} disabled={o.shopStatus === 'SUSPENDED'}>
                {o.shopStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Menu Sync tab ─────────────────────────────────────────────────────────── */
function MenuSyncTab({ outlets }) {
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!outlets.length) { setLoading(false); return; }
    Promise.all(
      outlets.map(o =>
        Promise.all([
          menuApi.getCategories(o.id).catch(() => ({ data: { data: [] } })),
          menuApi.getItems(o.id).catch(() => ({ data: { data: [] } })),
        ]).then(([cats, items]) => ({
          id: o.id,
          categories: (cats.data.data || []).length,
          items: (items.data.data || []).length,
        }))
      )
    )
      .then(results => {
        const map = {};
        results.forEach(r => { map[r.id] = r; });
        setMenuData(map);
      })
      .finally(() => setLoading(false));
  }, [outlets]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Loading menus…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Menu Sync</h1>
          <p className="page-subtitle">View and manage menu per outlet</p>
        </div>
      </div>
      {outlets.length === 0 && (
        <div className="admin-stub">
          <div className="admin-stub-icon"><Tag size={28} /></div>
          <h2>No outlets</h2>
          <p>Add outlets first to manage menus.</p>
        </div>
      )}
      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Outlet</th>
              <th>Status</th>
              <th>Categories</th>
              <th>Menu items</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {outlets.map(o => {
              const md = menuData[o.id] || { categories: 0, items: 0 };
              return (
                <tr key={o.id}>
                  <td style={{ fontWeight: 700 }}>{o.name}</td>
                  <td>
                    <span className={`status-pill ${o.status === 'open' ? 'st-active' : 'st-suspended'}`}>
                      {o.status === 'open' ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {o.status}
                    </span>
                  </td>
                  <td>{md.categories}</td>
                  <td>{md.items}</td>
                  <td>
                    <OutletMenuManager shopId={o.id} outletName={o.name} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OutletMenuManager({ shopId, outletName }) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      menuApi.getCategories(shopId).catch(() => ({ data: { data: [] } })),
      menuApi.getItems(shopId).catch(() => ({ data: { data: [] } })),
    ])
      .then(([cats, itms]) => {
        setCategories(cats.data.data || []);
        setItems(itms.data.data || []);
      })
      .finally(() => setLoading(false));
  };

  const toggleAvail = (item) => {
    menuApi.toggleAvail(item.id, !item.available)
      .then(() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, available: !i.available } : i)))
      .catch(() => {});
  };

  if (!open) {
    return (
      <button className="btn-outline btn-sm" onClick={() => { setOpen(true); load(); }}>
        <Edit2 size={12} /> Edit menu
      </button>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '90%', maxWidth: 640, maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>{outletName} — Menu</h2>
          <button className="btn-outline btn-sm" onClick={() => setOpen(false)}>Close</button>
        </div>
        {loading && <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>Loading…</div>}
        {!loading && (
          <>
            <div style={{ marginBottom: 12 }}>
              <strong style={{ fontSize: 13, color: 'var(--gray-500)' }}>Categories ({categories.length})</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {categories.map(c => (
                  <span key={c.id} style={{ background: 'var(--gray-100)', borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>{c.name}</span>
                ))}
                {categories.length === 0 && <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>No categories</span>}
              </div>
            </div>
            <div>
              <strong style={{ fontSize: 13, color: 'var(--gray-500)' }}>Items ({items.length})</strong>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--gray-500)' }}>₹{item.price}</div>
                    </div>
                    <button
                      className={`toggle-btn ${item.available ? 'toggle-on' : 'toggle-off'}`}
                      style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', background: item.available ? 'var(--green-light)' : 'var(--gray-100)', color: item.available ? 'var(--green-darker)' : 'var(--gray-400)', fontWeight: 600 }}
                      onClick={() => toggleAvail(item)}
                    >
                      {item.available ? 'Available' : 'Unavailable'}
                    </button>
                  </div>
                ))}
                {items.length === 0 && <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>No items</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── All Orders tab ─────────────────────────────────────────────────────────── */
function AllOrdersTab({ outlets }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!outlets.length) { setLoading(false); return; }
    Promise.all(
      outlets.map(o =>
        orderApi.getOrders(o.id, { page: 0, size: 20 })
          .then(res => (res.data.data?.content || res.data.data || []).map(ord => ({ ...ord, outletName: o.name })))
          .catch(() => [])
      )
    )
      .then(results => setOrders(results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
      .finally(() => setLoading(false));
  }, [outlets]);

  const statusColor = s => ({ PENDING: '#f59e0b', PREPARING: '#3b82f6', READY: '#10b981', DELIVERED: '#6b7280', CANCELLED: '#ef4444' }[s] || '#6b7280');

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Loading orders…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">All Orders</h1>
          <p className="page-subtitle">{orders.length} orders across {outlets.length} outlets</p>
        </div>
      </div>
      {orders.length === 0 && (
        <div className="admin-stub">
          <div className="admin-stub-icon"><ShoppingBag size={28} /></div>
          <h2>No orders yet</h2>
          <p>Orders from all your outlets will appear here.</p>
        </div>
      )}
      {orders.length > 0 && (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Outlet</th>
                <th>Table</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>#{String(o.id).slice(-6)}</td>
                  <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{o.outletName}</td>
                  <td>{o.tableNumber || o.table || '—'}</td>
                  <td style={{ fontWeight: 700 }}>₹{(o.totalAmount || o.total || 0).toLocaleString('en-IN')}</td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(o.status), background: statusColor(o.status) + '22', padding: '3px 9px', borderRadius: 99 }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 11.5, color: 'var(--gray-500)' }}>
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
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

/* ─── QR Codes tab ───────────────────────────────────────────────────────────── */
function QRCodesTab({ outlets, brand, onBrandSaved }) {
  const [qrByOutlet, setQrByOutlet] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!outlets.length) { setLoading(false); return; }
    Promise.all(
      outlets.map(o =>
        qrApi.getByShop(o.id)
          .then(res => ({ id: o.id, name: o.name, codes: res.data.data || [] }))
          .catch(() => ({ id: o.id, name: o.name, codes: [] }))
      )
    )
      .then(results => {
        const map = {};
        results.forEach(r => { map[r.id] = r; });
        setQrByOutlet(map);
      })
      .finally(() => setLoading(false));
  }, [outlets]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Loading QR codes…</div>;

  const allCodes = Object.values(qrByOutlet).flatMap(o => o.codes.map(c => ({ ...c, outletName: o.name })));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">QR Codes</h1>
          <p className="page-subtitle">{allCodes.length} QR codes across {outlets.length} outlets</p>
        </div>
      </div>
      {brand ? <BrandQR brand={brand} /> : <BrandSetup onSaved={onBrandSaved} />}
      {allCodes.length === 0 && (
        <div className="admin-stub">
          <div className="admin-stub-icon"><QrCode size={28} /></div>
          <h2>No QR codes</h2>
          <p>Go to an outlet to generate QR codes.</p>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
        {allCodes.map(q => (
          <div key={q.id} className="admin-chart-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{q.label || q.tableLabel || `Table ${q.tableNumber}`}</div>
            <div style={{ fontSize: 11.5, color: 'var(--gray-400)' }}>{q.outletName}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--gray-500)' }}>Scans: <strong>{q.scanCount || 0}</strong></span>
              <span style={{ fontWeight: 700, color: q.active ? 'var(--green-darker)' : 'var(--gray-400)' }}>
                {q.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--gray-400)', wordBreak: 'break-all' }}>{q.code || q.qrCode}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// One QR for the whole brand: encodes the public /brand/:brandId route (Brand QR
// Flow) so scanning it lists every outlet the supplier owns — mirrors Mall's
// Food Court QR (MallQRPage) one level up.
function BrandQR({ brand }) {
  const [qrImg, setQrImg] = useState('');
  const [targetUrl, setTargetUrl] = useState('');

  useEffect(() => {
    if (!brand?.id) return;
    brandApi.createQr(brand.id)
      .then(res => setTargetUrl(res.data.data?.targetUrl || `${window.location.origin}/brand/${brand.id}`))
      .catch(() => setTargetUrl(`${window.location.origin}/brand/${brand.id}`));
  }, [brand?.id]);

  useEffect(() => {
    if (!targetUrl) return;
    QRCode.toDataURL(targetUrl, { width: 512, margin: 2, color: { dark: '#0F172A', light: '#ffffff' } })
      .then(setQrImg).catch(() => {});
  }, [targetUrl]);

  const download = () => {
    if (!qrImg) return;
    const a = document.createElement('a');
    a.href = qrImg;
    a.download = `${brand.name || 'brand'}-qr.png`.replace(/\s+/g, '-');
    a.click();
  };

  return (
    <div className="admin-chart-card" style={{ maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>Main Brand QR</div>
      {qrImg ? <img src={qrImg} alt="Brand QR" style={{ width: 200, height: 200, borderRadius: 8 }} /> : <div style={{ width: 200, height: 200, background: 'var(--gray-100)', borderRadius: 8 }} />}
      <div style={{ fontSize: 11.5, color: 'var(--gray-400)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{targetUrl}</div>
      <button className="btn-primary" style={{ width: '100%' }} onClick={download}>Download PNG</button>
    </div>
  );
}

// Prompted once, lazily — a supplier has no brand until they name it. Saving
// creates the shop-service Brand row that the QR above and /brand/:id page read from.
function BrandSetup({ onSaved }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = () => {
    if (!name.trim()) return;
    setSaving(true); setError('');
    brandApi.save({ name: name.trim() })
      .then(res => onSaved(res.data.data))
      .catch(() => setError('Could not save. Please try again.'))
      .finally(() => setSaving(false));
  };

  return (
    <div className="admin-chart-card" style={{ maxWidth: 340, marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Set up your Brand QR</div>
      <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 12 }}>
        Name your brand once to get one QR that lists all your outlets to customers.
      </p>
      <div className="form-field">
        <input className="form-input" placeholder="e.g. Spice Route Group" value={name} onChange={e => setName(e.target.value)} />
      </div>
      {error && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{error}</p>}
      <button className="btn-primary" style={{ width: '100%', marginTop: 10 }} disabled={saving || !name.trim()} onClick={save}>
        {saving ? 'Saving…' : 'Create Brand QR'}
      </button>
    </div>
  );
}

/* ─── Reports tab ─────────────────────────────────────────────────────────────── */
function ReportsTab({ outlets }) {
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!outlets.length) { setLoading(false); return; }
    Promise.all(
      outlets.map(o =>
        // The supplier's own login token has no shopId, so report-service's
        // same-shop check 403s a direct call — mint a shop-scoped token first.
        shopApi.enter(o.id)
          .then(res => reportApi.getRevenue(o.id, 7, res.data.data.accessToken))
          .then(res => {
            const data = res.data.data || [];
            const total = Array.isArray(data) ? data.reduce((a, d) => a + (d.revenue || d.totalRevenue || 0), 0) : 0;
            return { outletName: o.name, total, daily: data };
          })
          .catch(() => ({ outletName: o.name, total: 0, daily: [] }))
      )
    )
      .then(setRevenueData)
      .finally(() => setLoading(false));
  }, [outlets]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Loading reports…</div>;

  const grandTotal = revenueData.reduce((a, r) => a + r.total, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Last 7 days · all outlets</p>
        </div>
      </div>
      <div className="admin-kpi-grid" style={{ marginBottom: 20 }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-icon icon-green"><TrendingUp size={18} /></div>
          <div className="admin-kpi-value">₹{grandTotal.toLocaleString('en-IN')}</div>
          <div className="admin-kpi-label">Total revenue (7 days)</div>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-icon icon-blue"><Store size={18} /></div>
          <div className="admin-kpi-value">{outlets.length}</div>
          <div className="admin-kpi-label">Outlets tracked</div>
        </div>
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Outlet</th>
              <th>Revenue (7 days)</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            {revenueData.map(r => (
              <tr key={r.outletName}>
                <td style={{ fontWeight: 700 }}>{r.outletName}</td>
                <td style={{ fontWeight: 700 }}>₹{r.total.toLocaleString('en-IN')}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${grandTotal ? (r.total / grandTotal) * 100 : 0}%`, height: '100%', background: 'var(--green)', borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 36 }}>
                      {grandTotal ? ((r.total / grandTotal) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Settings tab ────────────────────────────────────────────────────────────── */
function SettingsTab({ user, brand, onBrandSaved }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    brandName: brand?.name || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // brandName isn't a User field — auth-service silently drops it — so it's saved
  // separately to shop-service's Brand (the entity the Brand QR / /brand/:id page read from).
  const save = () => {
    setSaving(true);
    Promise.all([
      authApi.updateProfile({ name: form.name, email: form.email, phone: form.phone }),
      form.brandName.trim() ? brandApi.save({ name: form.brandName.trim() }) : Promise.resolve(null),
    ])
      .then(([, brandRes]) => { if (brandRes) onBrandSaved(brandRes.data.data); setSaved(true); setTimeout(() => setSaved(false), 2000); })
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Supplier profile</p>
        </div>
      </div>
      <div className="admin-chart-card" style={{ maxWidth: 540 }}>
        <h3 style={{ marginBottom: 16 }}>Profile</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { key: 'name',      label: 'Full name' },
            { key: 'email',     label: 'Email' },
            { key: 'phone',     label: 'Phone' },
            { key: 'brandName', label: 'Brand / Company name' },
          ].map(f => (
            <div key={f.key} className="form-field">
              <label className="form-label">{f.label}</label>
              <input
                className="form-input"
                value={form[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.label}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span style={{ color: 'var(--green-darker)', fontSize: 13, fontWeight: 600 }}>Saved!</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── Outlet Manager (full drill-down) ────────────────────────────────────────── */
const OUTLET_NAV = [
  { key: 'overview', label: 'Overview',  icon: BarChart2 },
  { key: 'menu',     label: 'Menu',      icon: Tag },
  { key: 'orders',   label: 'Orders',    icon: ShoppingBag },
  { key: 'qr',       label: 'QR Codes',  icon: QrCode },
  { key: 'settings', label: 'Settings',  icon: Settings },
];

function OutletManager({ outlet, onBack, user, logout, navigate }) {
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <QrCode size={18} style={{ color: '#5DCAA5' }} />
            <span className="admin-brand-name">Avi<em>QR</em></span>
            <span className="admin-role-tag supplier-tag">OUTLET</span>
          </div>
        </div>
        <div className="admin-user-card">
          <div className="admin-avatar" style={{ background: 'var(--blue)' }}>
            {outlet.name?.charAt(0) || 'O'}
          </div>
          <div>
            <div className="admin-user-name">{outlet.name}</div>
            <div className="admin-user-role" style={{ color: outlet.status === 'open' ? 'var(--green-darker)' : 'var(--gray-400)' }}>
              {outlet.status === 'open' ? 'Open' : 'Closed'}
            </div>
          </div>
        </div>
        <nav className="admin-nav">
          <button className="admin-nav-item" onClick={onBack} style={{ color: 'var(--gray-400)', fontSize: 12 }}>
            <ArrowLeft size={14} /> Back to dashboard
          </button>
          <div style={{ height: 1, background: 'var(--gray-100)', margin: '6px 0' }} />
          {OUTLET_NAV.map(n => (
            <button
              key={n.key}
              className={`admin-nav-item ${tab === n.key ? 'active' : ''}`}
              onClick={() => { setTab(n.key); setSidebarOpen(false); }}
            >
              <n.icon size={16} /> {n.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button className="admin-logout" onClick={() => { logout(); navigate('/'); }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-mobile-menu" onClick={() => setSidebarOpen(o => !o)}>
            <MenuIcon size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={16} />
            </button>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>{outlet.name}</span>
          </div>
          <div className="admin-avatar sm" style={{ marginLeft: 'auto', background: 'var(--blue)' }}>{user?.avatar}</div>
        </header>
        <main className="admin-content">
          {tab === 'overview'  && <OutletOverview outlet={outlet} />}
          {tab === 'menu'      && <OutletMenuTab shopId={outlet.id} />}
          {tab === 'orders'    && <OutletOrdersTab shopId={outlet.id} />}
          {tab === 'qr'        && <OutletQRTab shopId={outlet.id} />}
          {tab === 'settings'  && <OutletSettingsTab shopId={outlet.id} />}
        </main>
      </div>
    </div>
  );
}

function OutletOverview({ outlet }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{outlet.name}</h1>
          <p className="page-subtitle">Outlet overview · today</p>
        </div>
      </div>
      <div className="admin-kpi-grid">
        {[
          { label: 'Status',        value: outlet.status === 'open' ? 'Open' : 'Closed', icon: Store,      color: outlet.status === 'open' ? 'green' : 'amber' },
          { label: 'Orders today',  value: outlet.orders,                                  icon: ShoppingBag, color: 'blue' },
          { label: 'Revenue today', value: `₹${outlet.revenue.toLocaleString('en-IN')}`,   icon: CreditCard, color: 'purple' },
        ].map(k => (
          <div key={k.label} className="admin-kpi-card">
            <div className={`admin-kpi-icon icon-${k.color}`}><k.icon size={18} /></div>
            <div className="admin-kpi-value">{k.value}</div>
            <div className="admin-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutletMenuTab({ shopId }) {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      menuApi.getCategories(shopId).catch(() => ({ data: { data: [] } })),
      menuApi.getItems(shopId).catch(() => ({ data: { data: [] } })),
    ])
      .then(([cats, itms]) => {
        setCategories(cats.data.data || []);
        setItems(itms.data.data || []);
      })
      .finally(() => setLoading(false));
  }, [shopId]);

  const toggleAvail = (item) => {
    menuApi.toggleAvail(item.id, !item.available)
      .then(() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, available: !i.available } : i)))
      .catch(() => {});
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Loading menu…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Menu</h1>
          <p className="page-subtitle">{categories.length} categories · {items.length} items</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="admin-chart-card">
          <h3 style={{ marginBottom: 12 }}>Categories</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {categories.map(c => (
              <span key={c.id} style={{ background: 'var(--gray-100)', borderRadius: 99, padding: '4px 14px', fontSize: 13, fontWeight: 600 }}>{c.name}</span>
            ))}
            {categories.length === 0 && <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>No categories found.</span>}
          </div>
        </div>
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Item</th><th>Category</th><th>Price</th><th>Availability</th></tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700 }}>{item.name}</td>
                  <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{item.categoryName || '—'}</td>
                  <td>₹{item.price}</td>
                  <td>
                    <button
                      style={{ fontSize: 11, padding: '3px 12px', borderRadius: 99, border: 'none', cursor: 'pointer', fontWeight: 700, background: item.available ? 'var(--green-light)' : 'var(--gray-100)', color: item.available ? 'var(--green-darker)' : 'var(--gray-400)' }}
                      onClick={() => toggleAvail(item)}
                    >
                      {item.available ? 'Available' : 'Unavailable'}
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 24 }}>No items found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function OutletOrdersTab({ shopId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi.getOrders(shopId, { page: 0, size: 50 })
      .then(res => setOrders(res.data.data?.content || res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shopId]);

  const statusColor = s => ({ PENDING: '#f59e0b', PREPARING: '#3b82f6', READY: '#10b981', DELIVERED: '#6b7280', CANCELLED: '#ef4444' }[s] || '#6b7280');

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Loading orders…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">{orders.length} orders</p>
        </div>
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr><th>Order #</th><th>Table</th><th>Total</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>#{String(o.id).slice(-6)}</td>
                <td>{o.tableNumber || o.table || '—'}</td>
                <td style={{ fontWeight: 700 }}>₹{(o.totalAmount || o.total || 0).toLocaleString('en-IN')}</td>
                <td>
                  <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(o.status), background: statusColor(o.status) + '22', padding: '3px 9px', borderRadius: 99 }}>
                    {o.status}
                  </span>
                </td>
                <td style={{ fontSize: 11.5, color: 'var(--gray-500)' }}>
                  {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 24 }}>No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OutletQRTab({ shopId }) {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    qrApi.getByShop(shopId)
      .then(res => setCodes(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shopId]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Loading QR codes…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">QR Codes</h1>
          <p className="page-subtitle">{codes.length} QR codes</p>
        </div>
      </div>
      {codes.length === 0 && (
        <div className="admin-stub">
          <div className="admin-stub-icon"><QrCode size={28} /></div>
          <h2>No QR codes</h2>
          <p>No QR codes have been generated for this outlet yet.</p>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
        {codes.map(q => (
          <div key={q.id} className="admin-chart-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{q.label || q.tableLabel || `Table ${q.tableNumber || q.id}`}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--gray-500)' }}>Scans: <strong>{q.scanCount || 0}</strong></span>
              <span style={{ fontWeight: 700, color: q.active ? 'var(--green-darker)' : 'var(--gray-400)' }}>
                {q.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--gray-400)', wordBreak: 'break-all' }}>{q.code || q.qrCode}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutletSettingsTab({ shopId }) {
  const [settings, setSettings] = useState({ gstNumber: '', address: '', phone: '', openTime: '', closeTime: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    shopApi.getSettings(shopId)
      .then(res => {
        const d = res.data.data || {};
        setSettings(prev => ({ ...prev, ...d }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shopId]);

  const save = () => {
    setSaving(true);
    shopApi.saveSettings(shopId, settings)
      .then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); })
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Loading settings…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Outlet Settings</h1>
          <p className="page-subtitle">Configure this outlet</p>
        </div>
      </div>
      <div className="admin-chart-card" style={{ maxWidth: 540 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { key: 'address',   label: 'Address' },
            { key: 'phone',     label: 'Phone' },
            { key: 'gstNumber', label: 'GST Number' },
            { key: 'openTime',  label: 'Opening time' },
            { key: 'closeTime', label: 'Closing time' },
          ].map(f => (
            <div key={f.key} className="form-field">
              <label className="form-label">{f.label}</label>
              <input
                className="form-input"
                value={settings[f.key] || ''}
                onChange={e => setSettings(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.label}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save settings'}
          </button>
          {saved && <span style={{ color: 'var(--green-darker)', fontSize: 13, fontWeight: 600 }}>Saved!</span>}
        </div>
      </div>
    </div>
  );
}