import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { supportApi, orderApi, authApi, shopApi, paymentApi, ocrApi, auditApi, planApi, offerApi } from '../../api/index.js';
import { AdminQRCodesPage, AdminReports } from '../admin/AdminDashboard.jsx';
import ProfileMenu from '../../components/shared/ProfileMenu.jsx';
import {
  Headphones, ShoppingBag, CreditCard, Users, Store, QrCode,
  ScanLine, MessageCircle, FileText, UserCheck, LogOut,
  Menu as MenuIcon, Search, Bell, AlertCircle, CheckCircle2,
  XCircle, Clock, Eye, RefreshCw, Filter,
  TrendingUp, Activity, Shield, ExternalLink, Layers, Gift
} from 'lucide-react';
import '../admin/Admin.css';
import './Support.css';

// ─── mock data (initial placeholder only — overwritten by real fetches below) ──
const MOCK_TICKETS = [
  { id:'TKT-441', user:'Sujeet N',   role:'owner',    subject:'QR code not showing menu after price update', priority:'high',   status:'open',     created:'2h ago' },
  { id:'TKT-440', user:'Anjali S',   role:'customer', subject:'Paid twice for same order, need refund',        priority:'urgent', status:'open',     created:'3h ago' },
  { id:'TKT-439', user:'Vikram S',   role:'manager',  subject:'Cannot add new staff member — OTP not arriving',priority:'medium', status:'pending',  created:'5h ago' },
  { id:'TKT-438', user:'Meena P',    role:'owner',    subject:'OCR menu upload stuck at 90% for 2 hours',      priority:'high',   status:'resolved', created:'1d ago' },
  { id:'TKT-437', user:'Farhan K',   role:'owner',    subject:'Orders not appearing on dashboard',              priority:'urgent', status:'open',     created:'1d ago' },
  { id:'TKT-436', user:'Priya D',    role:'customer', subject:'App shows wrong price at checkout',              priority:'medium', status:'pending',  created:'2d ago' },
];

const MOCK_USERS = [
  { id:'u1', name:'Sujeet Narayanan', email:'sujeet@aviqr.in', role:'owner',    plan:'Growth',  shops:1, joined:'Jan 2025', status:'active' },
  { id:'u2', name:'Meena Pillai',     email:'meena@coconut.in', role:'owner',    plan:'Business',shops:2, joined:'Feb 2025', status:'active' },
  { id:'u3', name:'Farhan Khan',      email:'farhan@biryani.in',role:'owner',    plan:'Growth',  shops:1, joined:'Mar 2025', status:'suspended' },
  { id:'u4', name:'Anjali Singh',     email:'anjali@gmail.com', role:'customer', plan:'-',       shops:0, joined:'Apr 2025', status:'active' },
  { id:'u5', name:'Priya Desai',      email:'priya@gmail.com',  role:'customer', plan:'-',       shops:0, joined:'May 2025', status:'active' },
];

const NAV = [
  { key:'overview',    label:'Overview',       icon:Activity },
  { key:'tickets',     label:'Support Tickets',icon:MessageCircle, badge:4 },
  { key:'orders',      label:'Orders',         icon:ShoppingBag },
  { key:'payments',    label:'Payments',       icon:CreditCard },
  { key:'users',       label:'Users',          icon:Users },
  { key:'shops',       label:'Shops',          icon:Store },
  { key:'qrcodes',     label:'QR Codes',       icon:QrCode },
  { key:'ocr',         label:'OCR Jobs',       icon:ScanLine },
  { key:'audit',       label:'Audit Logs',     icon:FileText },
  { key:'reports',     label:'Reports',        icon:TrendingUp },
  { key:'billing',     label:'Billing',        icon:Layers },
  { key:'impersonate', label:'Impersonation',  icon:UserCheck },
];

// ─── main component ───────────────────────────────────────────────────────────
export default function SupportDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickets, setTickets]   = useState(MOCK_TICKETS);
  const [orders, setOrders]     = useState([]);
  const [users, setUsers]       = useState(MOCK_USERS);
  const [shops, setShops]       = useState([]);
  const [ocrJobs, setOcrJobs]   = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    supportApi.getTickets({ limit: 50 })
      .then(r => { const d = r.data.data; if (d?.length) setTickets(d); })
      .catch(() => {});
    authApi.getUsers({ limit: 50 })
      .then(r => { const d = r.data.data?.content || r.data.data; if (d?.length) setUsers(d); })
      .catch(() => {});
    orderApi.listAll({ size: 50 })
      .then(r => { const d = r.data.data; setOrders(Array.isArray(d) ? d : d?.content || []); })
      .catch(() => {});
    shopApi.list({ size: 100 })
      .then(r => { const d = r.data.data; setShops(Array.isArray(d) ? d : d?.content || []); })
      .catch(() => {});
    ocrApi.listAllJobs({ size: 50 })
      .then(r => { const d = r.data.data; setOcrJobs(Array.isArray(d) ? d : d?.content || []); })
      .catch(() => {});
    auditApi.list({ size: 50 })
      .then(r => { const d = r.data.data; setAuditLogs(Array.isArray(d) ? d : d?.content || []); })
      .catch(() => {});
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <Headphones size={18} style={{ color: '#FCD34D' }} />
            <span className="admin-brand-name">Avi<em>QR</em></span>
            <span className="admin-role-tag support-tag">SUPPORT</span>
          </div>
        </div>

        <div className="admin-user-card">
          <div className="admin-avatar" style={{ background: '#D97706' }}>
            {user?.avatar || 'SA'}
          </div>
          <div>
            <div className="admin-user-name">{user?.name || 'Support Agent'}</div>
            <div className="admin-user-role">Support Team</div>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV.map(n => (
            <button
              key={n.key}
              className={`admin-nav-item ${tab === n.key ? 'active' : ''}`}
              onClick={() => { setTab(n.key); setSidebarOpen(false); }}
            >
              <n.icon size={16} />
              <span>{n.label}</span>
              {n.badge && <span className="support-nav-badge">{n.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-logout" onClick={handleLogout}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-mobile-menu" onClick={() => setSidebarOpen(o => !o)}>
            <MenuIcon size={20} />
          </button>
          <div className="admin-topbar-search">
            <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--gray-400)' }} />
            <input style={{ paddingLeft: 32 }} placeholder="Search orders, tickets, users…" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            <button className="admin-icon-btn" style={{ position: 'relative' }}>
              <Bell size={18} />
              <span className="support-bell-dot" />
            </button>
            <ProfileMenu
              name={user?.name}
              email={user?.email}
              avatar={user?.avatar || 'SA'}
              avatarColor="#D97706"
              onLogout={() => { logout(); navigate('/'); }}
            />
          </div>
        </header>

        <main className="admin-content">
          {tab === 'overview'    && <SupportOverview onNavigate={setTab} tickets={tickets} orders={orders} auditLogs={auditLogs} />}
          {tab === 'tickets'     && <TicketsPanel tickets={tickets} onUpdate={t => setTickets(ts => ts.map(x => x.id===t.id?t:x))} />}
          {tab === 'orders'      && <OrdersPanel orders={orders} />}
          {tab === 'payments'    && <SupportPaymentsPanel />}
          {tab === 'users'       && <UsersPanel users={users} />}
          {tab === 'shops'       && <ShopsPanel shops={shops} />}
          {tab === 'qrcodes'     && <AdminQRCodesPage/>}
          {tab === 'ocr'         && <OCRPanel jobs={ocrJobs} />}
          {tab === 'audit'       && <AuditPanel logs={auditLogs} />}
          {tab === 'reports'     && <AdminReports/>}
          {tab === 'billing'     && <SupportBillingPanel />}
          {tab === 'impersonate' && <ImpersonatePanel users={users} agent={user} />}
        </main>
      </div>
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function SupportOverview({ onNavigate, tickets = MOCK_TICKETS, orders = [], auditLogs = [] }) {
  const openTickets   = tickets.filter(t => t.status === 'open' || t.status === 'OPEN').length;
  const urgentTickets = tickets.filter(t => t.priority === 'urgent' || t.priority === 'URGENT').length;
  const failedOrders   = orders.filter(o => o.paymentStatus === 'FAILED').length;
  const pendingOrders  = orders.filter(o => o.paymentStatus === 'PENDING').length;

  return (
    <div className="support-overview">
      <div className="page-header">
        <div>
          <h1 className="page-title">Support Overview</h1>
          <p className="page-subtitle">Real-time platform health · {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</p>
        </div>
        <button className="btn-refresh"><RefreshCw size={14} /> Refresh</button>
      </div>

      {/* Alert banner for urgent items */}
      {urgentTickets > 0 && (
        <div className="support-alert-banner">
          <AlertCircle size={16} />
          <span><strong>{urgentTickets} urgent ticket{urgentTickets > 1 ? 's' : ''}</strong> need immediate attention.</span>
          <button className="support-alert-action" onClick={() => onNavigate('tickets')}>View tickets →</button>
        </div>
      )}

      {/* KPI grid */}
      <div className="admin-kpi-grid">
        {[
          { label:'Open tickets',    value:openTickets,   icon:MessageCircle, color:'amber',  action:()=>onNavigate('tickets') },
          { label:'Urgent tickets',  value:urgentTickets, icon:AlertCircle,   color:'red',    action:()=>onNavigate('tickets') },
          { label:'Failed payments (orders)', value:failedOrders, icon:CreditCard, color:'red',  action:()=>onNavigate('orders') },
          { label:'Pending payments (orders)',value:pendingOrders,icon:Clock,      color:'blue', action:()=>onNavigate('orders') },
        ].map(k => (
          <button key={k.label} className="admin-kpi-card kpi-clickable" onClick={k.action}>
            <div className={`admin-kpi-icon icon-${k.color}`}><k.icon size={18} /></div>
            <div className="admin-kpi-value">{k.value}</div>
            <div className="admin-kpi-label">{k.label}</div>
            <div className="kpi-click-hint">Click to view →</div>
          </button>
        ))}
      </div>

      {/* Two panels */}
      <div className="support-two-col">
        {/* Recent tickets */}
        <div className="support-panel">
          <div className="support-panel-header">
            <h3>Recent tickets</h3>
            <button className="panel-view-all" onClick={() => onNavigate('tickets')}>View all</button>
          </div>
          {tickets.slice(0, 4).map(t => <TicketRow key={t.id} ticket={t} compact />)}
        </div>

        {/* Recent orders with payment issues */}
        <div className="support-panel">
          <div className="support-panel-header">
            <h3>Orders needing attention</h3>
            <button className="panel-view-all" onClick={() => onNavigate('orders')}>View all</button>
          </div>
          {orders.filter(o => o.paymentStatus === 'FAILED' || o.paymentStatus === 'PENDING').slice(0, 5).map(o => (
            <div key={o.id} className="support-pay-row">
              <div>
                <div className="support-pay-id">{o.orderNumber || o.id}</div>
                <div className="support-pay-shop">{o.shopId}</div>
              </div>
              <div className="support-pay-right">
                <div className="support-pay-amount">₹{o.totalAmount}</div>
                <span className={`pay-status-pill ps-${(o.paymentStatus||'pending').toLowerCase()}`}>{o.paymentStatus}</span>
              </div>
            </div>
          ))}
          {orders.filter(o => o.paymentStatus === 'FAILED' || o.paymentStatus === 'PENDING').length === 0 && (
            <div className="support-empty">No payment issues right now.</div>
          )}
        </div>
      </div>

      {/* Audit log preview */}
      <div className="support-panel">
        <div className="support-panel-header">
          <h3>Recent audit activity</h3>
          <button className="panel-view-all" onClick={() => onNavigate('audit')}>View all</button>
        </div>
        {auditLogs.slice(0, 4).map(log => <AuditRow key={log.id} log={log} />)}
        {auditLogs.length === 0 && <div className="support-empty">No recent activity.</div>}
      </div>
    </div>
  );
}

// ─── Tickets ──────────────────────────────────────────────────────────────────
const PRIORITY_CFG = {
  urgent: { cls:'pri-urgent', label:'Urgent' },
  high:   { cls:'pri-high',   label:'High' },
  medium: { cls:'pri-medium', label:'Medium' },
  low:    { cls:'pri-low',    label:'Low' },
};
const TICKET_STATUS_CFG = {
  open:     { cls:'tst-open',     label:'Open' },
  pending:  { cls:'tst-pending',  label:'Pending' },
  resolved: { cls:'tst-resolved', label:'Resolved' },
};

function TicketRow({ ticket, compact }) {
  const priority = (ticket.priority || 'medium').toLowerCase();
  const status   = (ticket.status || 'open').toLowerCase();
  const pri = PRIORITY_CFG[priority] || PRIORITY_CFG.medium;
  const st  = TICKET_STATUS_CFG[status] || TICKET_STATUS_CFG.open;
  return (
    <div className={`ticket-row ${compact ? 'ticket-row-compact' : ''}`}>
      <div className="ticket-id">{ticket.ticketNumber || ticket.id}</div>
      <div className="ticket-body">
        <div className="ticket-subject">{ticket.subject}</div>
        <div className="ticket-meta">
          <span className="ticket-user">{ticket.userName || ticket.user}</span>
          <span className="ticket-role-tag">{(ticket.userRole || ticket.role || '').toLowerCase()}</span>
          <span className="ticket-time">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('en-IN') : ticket.created}</span>
        </div>
      </div>
      <div className="ticket-badges">
        <span className={`priority-pill ${pri.cls}`}>{pri.label}</span>
        <span className={`ticket-status-pill ${st.cls}`}>{st.label}</span>
      </div>
      {!compact && (
        <div className="ticket-actions">
          <button className="support-action-btn">Assign</button>
          <button className="support-action-btn support-action-primary">Reply</button>
        </div>
      )}
    </div>
  );
}

function TicketsPanel({ tickets }) {
  const [filter, setFilter] = useState('all');
  const norm = t => (t.status || 'open').toLowerCase();
  const filtered = filter === 'all' ? tickets : tickets.filter(t => norm(t) === filter || (t.priority||'').toLowerCase() === filter);
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Support Tickets</h1><p className="page-subtitle">{tickets.filter(t=>norm(t)!=='resolved').length} open · {tickets.length} total</p></div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-refresh"><Filter size={13} /> Filter</button>
          <button className="btn-refresh support-action-primary">+ New ticket</button>
        </div>
      </div>
      <div className="support-filter-tabs">
        {['all','open','pending','resolved','urgent'].map(f => (
          <button key={f} className={`support-filter-tab ${filter===f?'active':''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
            <span className="support-filter-count">{f==='all'?tickets.length:tickets.filter(t=>norm(t)===f||(t.priority||'').toLowerCase()===f).length}</span>
          </button>
        ))}
      </div>
      <div className="support-panel">
        {filtered.map(t => <TicketRow key={t.id} ticket={t} />)}
        {filtered.length === 0 && <div className="support-empty">No tickets match this filter.</div>}
      </div>
    </div>
  );
}

// ─── Orders panel ─────────────────────────────────────────────────────────────
function OrdersPanel({ orders }) {
  const STATUS_CLR = { NEW:'status-new', PREPARING:'status-preparing', COMPLETED:'status-ready', CANCELLED:'status-rejected' };
  const PAY_CLR    = { PAID:'ps-captured', PENDING:'ps-pending', FAILED:'ps-failed', REFUNDED:'ps-refunded', CASH:'ps-cash' };
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Orders</h1><p className="page-subtitle">{orders.length} loaded · platform-wide</p></div>
        <div className="support-search-row">
          <Search size={14} style={{ position:'absolute', left:10, color:'var(--gray-400)' }} />
          <input style={{ paddingLeft:32 }} className="support-search-input" placeholder="Search order ID, shop, customer…" />
        </div>
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Order ID</th><th>Shop</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th><th>Time</th><th></th></tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td className="support-order-id">{o.orderNumber}</td>
                <td>{o.shopId}</td>
                <td>{o.customerName || o.customerId}</td>
                <td style={{ fontWeight:700 }}>₹{o.totalAmount}</td>
                <td><span className={`pay-status-pill ${PAY_CLR[o.paymentStatus]||'ps-pending'}`}>{o.paymentStatus}</span></td>
                <td><span className={`order-status-pill ${STATUS_CLR[o.status]||'status-new'}`}>{o.status}</span></td>
                <td className="support-time-cell">{o.createdAt ? new Date(o.createdAt).toLocaleString('en-IN') : ''}</td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="admin-row-btn"><Eye size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={8} className="support-empty">No orders loaded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Payments panel — ticket-scoped lookup ────────────────────────────────────
// Support agents don't have platform-wide payment visibility (only ADMIN does);
// instead they look up a specific customer's payment history to investigate a ticket.
function SupportPaymentsPanel() {
  const [customerId, setCustomerId] = useState('');
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const PAY_CLR = { CAPTURED:'ps-captured', PENDING:'ps-pending', FAILED:'ps-failed', REFUNDED:'ps-refunded' };

  const search = async (e) => {
    e.preventDefault();
    if (!customerId.trim()) return;
    setLoading(true); setError(''); setPayments(null);
    try {
      const res = await paymentApi.getByCustomer(customerId.trim(), { size: 50 });
      const d = res.data?.data;
      setPayments(Array.isArray(d) ? d : d?.content || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load payments for this customer.');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Payments</h1><p className="page-subtitle">Look up a customer's payment history to investigate a ticket</p></div>
      </div>
      <form onSubmit={search} className="support-search-row" style={{ position:'static', marginBottom:16 }}>
        <input
          className="support-search-input"
          style={{ paddingLeft:12, width:320 }}
          placeholder="Customer ID (from the ticket)…"
          value={customerId}
          onChange={e => setCustomerId(e.target.value)}
        />
        <button type="submit" className="btn-refresh support-action-primary" style={{ marginLeft:8 }}>
          <Search size={13} /> Look up
        </button>
      </form>

      {error && <div className="support-alert-banner"><AlertCircle size={16} /><span>{error}</span></div>}

      {loading && <div className="support-empty">Loading…</div>}

      {payments && (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead><tr><th>Payment ID</th><th>Order</th><th>Shop</th><th>Amount</th><th>Gateway</th><th>Status</th><th>Time</th></tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="support-order-id">{p.paymentId}</td>
                  <td>{p.orderId}</td>
                  <td>{p.shopId}</td>
                  <td style={{ fontWeight:700 }}>₹{p.amount}</td>
                  <td>{p.gateway}</td>
                  <td><span className={`pay-status-pill ${PAY_CLR[p.status]||'ps-pending'}`}>{p.status}</span></td>
                  <td className="support-time-cell">{p.createdAt ? new Date(p.createdAt).toLocaleString('en-IN') : ''}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={7} className="support-empty">No payments found for this customer.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Users panel ──────────────────────────────────────────────────────────────
function UsersPanel({ users }) {
  const [search, setSearch] = useState('');
  const filtered = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.includes(search)
  );
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Users</h1><p className="page-subtitle">{users.length} registered</p></div>
        <div style={{ position:'relative' }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)' }} />
          <input style={{ height:38, border:'1px solid var(--gray-200)', borderRadius:'var(--radius-md)', padding:'0 12px 0 32px', fontSize:13, width:220 }}
            placeholder="Search name, email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight:600 }}>{u.name}</td>
                <td style={{ fontSize:12.5, color:'var(--gray-500)' }}>{u.email}</td>
                <td><span className="role-chip-sm">{(u.role||'').toLowerCase()}</span></td>
                <td className="support-time-cell">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : u.joined}</td>
                <td>
                  <span className={`status-pill ${(u.status||'').toUpperCase()==='ACTIVE'||u.status==='active'?'st-active':'st-suspended'}`}>
                    {(u.status||'').toUpperCase()==='ACTIVE'||u.status==='active'?<CheckCircle2 size={11}/>:<XCircle size={11}/>} {(u.status||'').toLowerCase()}
                  </span>
                </td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="admin-row-btn" title="View profile"><Eye size={13} /></button>
                    <button className="admin-row-btn" title="Open user's dashboard"><ExternalLink size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="support-empty">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Shops panel ──────────────────────────────────────────────────────────────
function ShopsPanel({ shops }) {
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Shops</h1><p className="page-subtitle">{shops.length} registered</p></div>
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Shop</th><th>City</th><th>Plan</th><th>Table count</th><th>Rating</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {shops.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight:700 }}>{s.name}</td>
                <td>{s.city}</td>
                <td><span className="plan-pill">{s.subscriptionPlan || 'STARTER'}</span></td>
                <td>{s.tableCount}</td>
                <td>{s.rating}</td>
                <td>
                  <span className={`status-pill ${s.status==='ACTIVE'?'st-active':'st-suspended'}`}>
                    {s.status==='ACTIVE'?<CheckCircle2 size={11}/>:<XCircle size={11}/>} {s.status}
                  </span>
                </td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="admin-row-btn"><Eye size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {shops.length === 0 && (
              <tr><td colSpan={7} className="support-empty">Loading shops…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── OCR Jobs panel ───────────────────────────────────────────────────────────
function OCRPanel({ jobs }) {
  const STATUS_CFG = {
    COMPLETED:  { cls:'ocr-done',       label:'Completed' },
    FAILED:     { cls:'ocr-failed',     label:'Failed' },
    PROCESSING: { cls:'ocr-processing', label:'Processing' },
    PENDING:    { cls:'ocr-processing', label:'Pending' },
  };
  const failedCount = jobs.filter(j=>j.status==='FAILED').length;
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">OCR Jobs</h1><p className="page-subtitle">Menu upload processing queue · platform-wide</p></div>
        <button className="btn-refresh"><RefreshCw size={13} /> Refresh</button>
      </div>
      {failedCount > 0 && (
        <div className="support-alert-banner">
          <AlertCircle size={16} />
          <span><strong>{failedCount} OCR job{failedCount>1?'s':''}</strong> failed. Shop owners may need assistance uploading their menu.</span>
        </div>
      )}
      <div className="support-panel">
        {jobs.map(job => {
          const cfg = STATUS_CFG[job.status] || STATUS_CFG.PENDING;
          return (
            <div key={job.id} className="ocr-job-row">
              <div className="ocr-job-icon">
                <ScanLine size={18} style={{ color: job.status === 'FAILED' ? 'var(--red)' : job.status === 'COMPLETED' ? 'var(--green-dark)' : 'var(--blue)' }} />
              </div>
              <div className="ocr-job-info">
                <div className="ocr-job-shop">{job.shopId}</div>
                <div className="ocr-job-file">{job.fileType}</div>
              </div>
              <div className="ocr-job-items">
                {job.status === 'COMPLETED' ? `${job.extractedItems?.length || 0} items extracted` : job.status === 'PROCESSING' ? 'Processing…' : job.status === 'FAILED' ? (job.errorMessage || 'Extraction failed') : 'Pending'}
              </div>
              <div className="ocr-job-time">{job.createdAt ? new Date(job.createdAt).toLocaleString('en-IN') : ''}</div>
              <span className={`ocr-status-pill ${cfg.cls}`}>{cfg.label}</span>
            </div>
          );
        })}
        {jobs.length === 0 && <div className="support-empty">No OCR jobs yet.</div>}
      </div>
    </div>
  );
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────
function auditLevel(log) {
  const a = (log.action || '').toUpperCase();
  if (a.includes('DELETE')) return 'error';
  if (a.includes('STATUS') || a.includes('ROLE') || a.includes('SUSPEND')) return 'warn';
  return 'info';
}

function AuditRow({ log }) {
  const LEVEL_CLR = { info:'audit-info', warn:'audit-warn', error:'audit-error' };
  const level = auditLevel(log);
  return (
    <div className="audit-row">
      <div className={`audit-level-dot ${LEVEL_CLR[level]}`} />
      <div className="audit-body">
        <div className="audit-action">{log.description || log.action}</div>
        <div className="audit-meta">
          <span className="audit-actor">{log.actorId}</span>
          <span className="audit-time">{log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : ''}</span>
        </div>
      </div>
    </div>
  );
}

function AuditPanel({ logs }) {
  const [levelFilter, setLevelFilter] = useState('all');
  const filtered = levelFilter === 'all' ? logs : logs.filter(l => auditLevel(l) === levelFilter);
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Audit Logs</h1><p className="page-subtitle">Platform activity trail</p></div>
        <div style={{ display:'flex', gap:8 }}>
          {['all','info','warn','error'].map(f => (
            <button key={f} className={`support-filter-tab ${levelFilter===f?'active':''}`} onClick={() => setLevelFilter(f)}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="support-panel">
        {filtered.map(log => <AuditRow key={log.id} log={log} />)}
        {filtered.length === 0 && <div className="support-empty">No logs for this level.</div>}
      </div>
    </div>
  );
}

// ─── Billing panel — read-only plans + offers (ADMIN manages, SUPPORT views) ──
function SupportBillingPanel() {
  const [plans, setPlans] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([planApi.listAdmin(), offerApi.listAdmin()])
      .then(([pRes, oRes]) => {
        setPlans(pRes.data?.data || []);
        setOffers(oRes.data?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Billing</h1><p className="page-subtitle">Plans & discount offers — read-only (managed by Admin)</p></div>
      </div>
      {loading ? (
        <div className="support-empty">Loading…</div>
      ) : (
        <>
          <div className="support-panel" style={{ marginBottom:16 }}>
            <div className="support-panel-header"><h3><Layers size={15} style={{ verticalAlign:'-2px', marginRight:6 }}/>Plans</h3></div>
            <div className="admin-table-card">
              <table className="admin-table">
                <thead><tr><th>Plan</th><th>Vertical</th><th>Price</th><th>Active</th></tr></thead>
                <tbody>
                  {plans.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight:700 }}>{p.label}</td>
                      <td>{p.vertical}</td>
                      <td>₹{p.price}</td>
                      <td>
                        <span className={`status-pill ${p.active?'st-active':'st-suspended'}`}>
                          {p.active?<CheckCircle2 size={11}/>:<XCircle size={11}/>} {p.active?'Active':'Hidden'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {plans.length === 0 && <tr><td colSpan={4} className="support-empty">No plans configured.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="support-panel">
            <div className="support-panel-header"><h3><Gift size={15} style={{ verticalAlign:'-2px', marginRight:6 }}/>Discount offers</h3></div>
            <div className="admin-table-card">
              <table className="admin-table">
                <thead><tr><th>Offer</th><th>Valid from</th><th>Valid to</th><th>Active</th></tr></thead>
                <tbody>
                  {offers.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight:700 }}>{o.title || o.code}</td>
                      <td>{o.startsAt ? new Date(o.startsAt).toLocaleDateString('en-IN') : '—'}</td>
                      <td>{o.endsAt ? new Date(o.endsAt).toLocaleDateString('en-IN') : '—'}</td>
                      <td>
                        <span className={`status-pill ${o.active?'st-active':'st-suspended'}`}>
                          {o.active?<CheckCircle2 size={11}/>:<XCircle size={11}/>} {o.active?'Active':'Hidden'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {offers.length === 0 && <tr><td colSpan={4} className="support-empty">No offers configured.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Impersonation panel ─────────────────────────────────────────────────────
function ImpersonatePanel({ users, agent }) {
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleImpersonate = async () => {
    if (!selected || !reason.trim()) return;
    setSubmitting(true); setError('');
    try {
      await supportApi.impersonate({
        agentName: agent?.name || '',
        targetUserId: selected.id,
        targetUserName: selected.name,
        reason: reason.trim(),
      });
      setDone(true);
      setTimeout(() => { setDone(false); setSelected(null); setReason(''); }, 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not start impersonation session.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Impersonation</h1><p className="page-subtitle">Log in as any user for debugging. All actions are fully audited.</p></div>
      </div>

      <div className="impersonate-warning">
        <Shield size={18} />
        <div>
          <strong>Restricted feature.</strong> Impersonation is logged permanently in the audit trail with your name, the target user, reason, and timestamp. Only use this to reproduce and debug reported issues.
        </div>
      </div>

      <div className="impersonate-layout">
        <div className="support-panel">
          <div className="support-panel-header"><h3>Select user to impersonate</h3></div>
          {users.filter(u => (u.role||'').toLowerCase() !== 'customer').map(u => (
            <button
              key={u.id}
              className={`impersonate-user-row ${selected?.id === u.id ? 'selected' : ''}`}
              onClick={() => setSelected(u)}
            >
              <div className="imp-avatar">{(u.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
              <div className="imp-info">
                <div className="imp-name">{u.name}</div>
                <div className="imp-email">{u.email} · {(u.role||'').toLowerCase()}</div>
              </div>
              {selected?.id === u.id && <CheckCircle2 size={16} style={{ color:'var(--green)', marginLeft:'auto' }} />}
            </button>
          ))}
        </div>

        <div className="impersonate-form-panel">
          <h3 className="impersonate-form-title">Start session</h3>
          {selected ? (
            <>
              <div className="impersonate-target-card">
                <div className="imp-avatar large">{(selected.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{selected.name}</div>
                  <div style={{ fontSize:12.5, color:'var(--gray-500)' }}>{selected.email}</div>
                  <span className="role-chip-sm" style={{ marginTop:6, display:'inline-block' }}>{(selected.role||'').toLowerCase()}</span>
                </div>
              </div>
              <div className="impersonate-field">
                <label>Reason for impersonation *</label>
                <textarea
                  placeholder="e.g. Customer reported orders not showing on dashboard. Reproducing issue to identify root cause."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                />
              </div>
              {error && <div className="support-alert-banner"><AlertCircle size={16} /><span>{error}</span></div>}
              {done ? (
                <div className="impersonate-success">
                  <CheckCircle2 size={16} /> Session started. This is logged in the audit trail.
                </div>
              ) : (
                <button
                  className="impersonate-start-btn"
                  onClick={handleImpersonate}
                  disabled={!reason.trim() || submitting}
                >
                  <UserCheck size={15} /> {submitting ? 'Starting…' : 'Start impersonation session'}
                </button>
              )}
            </>
          ) : (
            <div className="impersonate-placeholder">
              <UserCheck size={32} style={{ color:'var(--gray-300)' }} />
              <p>Select a user on the left to begin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
