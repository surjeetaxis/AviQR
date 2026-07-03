import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { supportApi, orderApi, authApi } from '../../api/index.js';
import ProfileMenu from '../../components/shared/ProfileMenu.jsx';
import {
  Headphones, ShoppingBag, CreditCard, Users, Store, QrCode,
  ScanLine, MessageCircle, FileText, UserCheck, LogOut,
  Menu as MenuIcon, Search, Bell, AlertCircle, CheckCircle2,
  XCircle, Clock, Eye, RefreshCw, Filter, ChevronDown,
  TrendingUp, Activity, Shield, Copy, ExternalLink
} from 'lucide-react';
import '../admin/Admin.css';
import './Support.css';

// ─── mock data ────────────────────────────────────────────────────────────────
const MOCK_ORDERS = [
  { id:'ORD-9912', shop:'Spice Route', customer:'Anjali Singh', amount:720, status:'preparing', payment:'paid', time:'3 min ago', issue: null },
  { id:'ORD-9911', shop:'Chai & Chaat', customer:'Ravi Kumar',  amount:180, status:'new',       payment:'pending', time:'8 min ago', issue:'payment_stuck' },
  { id:'ORD-9910', shop:'Coconut Grove', customer:'Meena P',   amount:1240,status:'cancelled',  payment:'refunded', time:'22 min ago', issue:null },
  { id:'ORD-9909', shop:'Biryani House', customer:'Walk-in',   amount:540, status:'completed',  payment:'cash',  time:'35 min ago', issue: null },
  { id:'ORD-9908', shop:'Cake Studio', customer:'Priya D',     amount:320, status:'new',        payment:'failed', time:'41 min ago', issue:'payment_failed' },
];

const MOCK_TICKETS = [
  { id:'TKT-441', user:'Sujeet N',   role:'owner',    subject:'QR code not showing menu after price update', priority:'high',   status:'open',     created:'2h ago' },
  { id:'TKT-440', user:'Anjali S',   role:'customer', subject:'Paid twice for same order, need refund',        priority:'urgent', status:'open',     created:'3h ago' },
  { id:'TKT-439', user:'Vikram S',   role:'manager',  subject:'Cannot add new staff member — OTP not arriving',priority:'medium', status:'pending',  created:'5h ago' },
  { id:'TKT-438', user:'Meena P',    role:'owner',    subject:'OCR menu upload stuck at 90% for 2 hours',      priority:'high',   status:'resolved', created:'1d ago' },
  { id:'TKT-437', user:'Farhan K',   role:'owner',    subject:'Orders not appearing on dashboard',              priority:'urgent', status:'open',     created:'1d ago' },
  { id:'TKT-436', user:'Priya D',    role:'customer', subject:'App shows wrong price at checkout',              priority:'medium', status:'pending',  created:'2d ago' },
];

const MOCK_PAYMENTS = [
  { id:'PAY-8821', order:'ORD-9912', shop:'Spice Route',  amount:720,  gateway:'Razorpay', status:'captured', time:'3 min ago' },
  { id:'PAY-8820', order:'ORD-9911', shop:'Chai & Chaat', amount:180,  gateway:'Razorpay', status:'pending',  time:'8 min ago' },
  { id:'PAY-8819', order:'ORD-9910', shop:'Coconut Grove',amount:1240, gateway:'Razorpay', status:'refunded', time:'22 min ago' },
  { id:'PAY-8818', order:'ORD-9908', shop:'Cake Studio',  amount:320,  gateway:'PhonePe',  status:'failed',   time:'41 min ago' },
  { id:'PAY-8817', order:'ORD-9907', shop:'Biryani House',amount:860,  gateway:'Stripe',   status:'captured', time:'1h ago' },
];

const MOCK_USERS = [
  { id:'u1', name:'Sujeet Narayanan', email:'sujeet@aviqr.in', role:'owner',    plan:'Growth',  shops:1, joined:'Jan 2025', status:'active' },
  { id:'u2', name:'Meena Pillai',     email:'meena@coconut.in', role:'owner',    plan:'Business',shops:2, joined:'Feb 2025', status:'active' },
  { id:'u3', name:'Farhan Khan',      email:'farhan@biryani.in',role:'owner',    plan:'Growth',  shops:1, joined:'Mar 2025', status:'suspended' },
  { id:'u4', name:'Anjali Singh',     email:'anjali@gmail.com', role:'customer', plan:'-',       shops:0, joined:'Apr 2025', status:'active' },
  { id:'u5', name:'Priya Desai',      email:'priya@gmail.com',  role:'customer', plan:'-',       shops:0, joined:'May 2025', status:'active' },
];

const MOCK_OCR = [
  { id:'OCR-301', shop:'Spice Route',   file:'menu_photo.jpg', items:24, status:'completed', time:'1h ago' },
  { id:'OCR-300', shop:'Chai & Chaat',  file:'menu_scan.pdf',  items:12, status:'completed', time:'3h ago' },
  { id:'OCR-299', shop:'Coconut Grove', file:'menu2.jpg',      items:0,  status:'failed',    time:'5h ago' },
  { id:'OCR-298', shop:'Cake Studio',   file:'cakes_menu.pdf', items:18, status:'processing',time:'10 min ago' },
];

const MOCK_AUDIT = [
  { id:'AL-991', actor:'Sujeet N (owner)',  action:'Updated item price — Paneer Butter Masala ₹300→₹320', time:'5 min ago', level:'info' },
  { id:'AL-990', actor:'Vikram S (manager)',action:'Added staff member — Rajan Kumar (Kitchen)',           time:'22 min ago',level:'info' },
  { id:'AL-989', actor:'System',            action:'Payment failed for ORD-9908 — Cake Studio',            time:'41 min ago',level:'warn' },
  { id:'AL-988', actor:'Farhan K (owner)',  action:'Shop status changed to suspended by Admin',            time:'2h ago',    level:'warn' },
  { id:'AL-987', actor:'System',            action:'OCR job OCR-299 failed — low image quality',           time:'5h ago',    level:'error' },
  { id:'AL-986', actor:'Priya M (admin)',   action:'Impersonated Meena Pillai (owner) for debugging',     time:'1d ago',    level:'warn' },
];

const MOCK_QRS = [
  { id:'QR-101', shop:'Spice Route',   type:'shop',  scans:1284, status:'active', url:'aviqr.in/menu/spiceroute' },
  { id:'QR-102', shop:'Chai & Chaat',  type:'table', scans:312,  status:'active', url:'aviqr.in/menu/chaichaat' },
  { id:'QR-103', shop:'Coconut Grove', type:'group', scans:856,  status:'active', url:'aviqr.in/menu/coconut' },
  { id:'QR-104', shop:'Biryani House', type:'shop',  scans:44,   status:'broken', url:'aviqr.in/menu/biryani' },
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
  { key:'impersonate', label:'Impersonation',  icon:UserCheck },
];

// ─── main component ───────────────────────────────────────────────────────────
export default function SupportDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickets, setTickets]   = useState(MOCK_TICKETS);
  const [orders, setOrders]     = useState(MOCK_ORDERS);
  const [users, setUsers]       = useState(MOCK_USERS);

  useEffect(() => {
    supportApi.getTickets({ limit: 50 })
      .then(r => { const d = r.data.data; if (d?.length) setTickets(d); })
      .catch(() => {});
    authApi.getUsers({ limit: 50 })
      .then(r => { const d = r.data.data; if (d?.length) setUsers(d); })
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
          {tab === 'overview'    && <SupportOverview onNavigate={setTab} tickets={tickets} orders={orders} />}
          {tab === 'tickets'     && <TicketsPanel tickets={tickets} onUpdate={t => setTickets(ts => ts.map(x => x.id===t.id?t:x))} />}
          {tab === 'orders'      && <OrdersPanel orders={orders} />}
          {tab === 'payments'    && <PaymentsPanel payments={MOCK_PAYMENTS} />}
          {tab === 'users'       && <UsersPanel users={users} />}
          {tab === 'shops'       && <ShopsPanel />}
          {tab === 'qrcodes'     && <QRPanel qrs={MOCK_QRS} />}
          {tab === 'ocr'         && <OCRPanel jobs={MOCK_OCR} />}
          {tab === 'audit'       && <AuditPanel logs={MOCK_AUDIT} />}
          {tab === 'impersonate' && <ImpersonatePanel users={users} />}
        </main>
      </div>
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function SupportOverview({ onNavigate, tickets = MOCK_TICKETS, orders = MOCK_ORDERS }) {
  const openTickets   = tickets.filter(t => t.status === 'open').length;
  const urgentTickets = tickets.filter(t => t.priority === 'urgent').length;
  const failedPay     = MOCK_PAYMENTS.filter(p => p.status === 'failed').length;
  const pendingPay    = MOCK_PAYMENTS.filter(p => p.status === 'pending').length;

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
          { label:'Failed payments', value:failedPay,     icon:CreditCard,    color:'red',    action:()=>onNavigate('payments') },
          { label:'Pending payments',value:pendingPay,    icon:Clock,         color:'blue',   action:()=>onNavigate('payments') },
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

        {/* Payment issues */}
        <div className="support-panel">
          <div className="support-panel-header">
            <h3>Payment issues</h3>
            <button className="panel-view-all" onClick={() => onNavigate('payments')}>View all</button>
          </div>
          {MOCK_PAYMENTS.filter(p => p.status !== 'captured').map(p => (
            <div key={p.id} className="support-pay-row">
              <div>
                <div className="support-pay-id">{p.id}</div>
                <div className="support-pay-shop">{p.shop} · {p.gateway}</div>
              </div>
              <div className="support-pay-right">
                <div className="support-pay-amount">₹{p.amount}</div>
                <span className={`pay-status-pill ps-${p.status}`}>{p.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit log preview */}
      <div className="support-panel">
        <div className="support-panel-header">
          <h3>Recent audit activity</h3>
          <button className="panel-view-all" onClick={() => onNavigate('audit')}>View all</button>
        </div>
        {MOCK_AUDIT.slice(0, 4).map(log => <AuditRow key={log.id} log={log} />)}
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
  const pri = PRIORITY_CFG[ticket.priority] || PRIORITY_CFG.medium;
  const st  = TICKET_STATUS_CFG[ticket.status] || TICKET_STATUS_CFG.open;
  return (
    <div className={`ticket-row ${compact ? 'ticket-row-compact' : ''}`}>
      <div className="ticket-id">{ticket.id}</div>
      <div className="ticket-body">
        <div className="ticket-subject">{ticket.subject}</div>
        <div className="ticket-meta">
          <span className="ticket-user">{ticket.user}</span>
          <span className="ticket-role-tag">{ticket.role}</span>
          <span className="ticket-time">{ticket.created}</span>
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
  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter || t.priority === filter);
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Support Tickets</h1><p className="page-subtitle">{tickets.filter(t=>t.status!=='resolved').length} open · {tickets.length} total</p></div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-refresh"><Filter size={13} /> Filter</button>
          <button className="btn-refresh support-action-primary">+ New ticket</button>
        </div>
      </div>
      <div className="support-filter-tabs">
        {['all','open','pending','resolved','urgent'].map(f => (
          <button key={f} className={`support-filter-tab ${filter===f?'active':''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
            <span className="support-filter-count">{f==='all'?tickets.length:tickets.filter(t=>t.status===f||t.priority===f).length}</span>
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
  const STATUS_CLR = { new:'status-new', preparing:'status-preparing', completed:'status-ready', cancelled:'status-rejected' };
  const PAY_CLR    = { paid:'ps-captured', pending:'ps-pending', failed:'ps-failed', refunded:'ps-refunded', cash:'ps-cash' };
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Orders</h1><p className="page-subtitle">All shops · today</p></div>
        <div className="support-search-row">
          <Search size={14} style={{ position:'absolute', left:10, color:'var(--gray-400)' }} />
          <input style={{ paddingLeft:32 }} className="support-search-input" placeholder="Search order ID, shop, customer…" />
        </div>
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Order ID</th><th>Shop</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th><th>Time</th><th>Issue</th><th></th></tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td className="support-order-id">{o.id}</td>
                <td>{o.shop}</td>
                <td>{o.customer}</td>
                <td style={{ fontWeight:700 }}>₹{o.amount}</td>
                <td><span className={`pay-status-pill ${PAY_CLR[o.payment]||'ps-pending'}`}>{o.payment}</span></td>
                <td><span className={`order-status-pill ${STATUS_CLR[o.status]||'status-new'}`}>{o.status}</span></td>
                <td className="support-time-cell">{o.time}</td>
                <td>
                  {o.issue && <span className="issue-badge"><AlertCircle size={11} /> {o.issue.replace('_',' ')}</span>}
                </td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="admin-row-btn"><Eye size={13} /></button>
                    {o.issue && <button className="admin-row-btn admin-row-btn-danger" title="Resolve issue"><CheckCircle2 size={13} /></button>}
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

// ─── Payments panel ───────────────────────────────────────────────────────────
function PaymentsPanel({ payments }) {
  const PAY_CLR = { captured:'ps-captured', pending:'ps-pending', failed:'ps-failed', refunded:'ps-refunded' };
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Payments</h1><p className="page-subtitle">All transactions · today</p></div>
        <button className="btn-refresh"><RefreshCw size={13} /> Sync gateway</button>
      </div>
      <div className="support-kpi-row">
        {[
          { label:'Captured', value:`₹${payments.filter(p=>p.status==='captured').reduce((a,p)=>a+p.amount,0).toLocaleString('en-IN')}`, color:'green' },
          { label:'Pending',  value:payments.filter(p=>p.status==='pending').length + ' txns',  color:'amber' },
          { label:'Failed',   value:payments.filter(p=>p.status==='failed').length + ' txns',   color:'red' },
          { label:'Refunded', value:`₹${payments.filter(p=>p.status==='refunded').reduce((a,p)=>a+p.amount,0).toLocaleString('en-IN')}`, color:'blue' },
        ].map(k => (
          <div key={k.label} className={`support-kpi-chip support-kpi-${k.color}`}>
            <div className="support-kpi-chip-val">{k.value}</div>
            <div className="support-kpi-chip-lbl">{k.label}</div>
          </div>
        ))}
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Payment ID</th><th>Order</th><th>Shop</th><th>Amount</th><th>Gateway</th><th>Status</th><th>Time</th><th>Actions</th></tr></thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td className="support-order-id">{p.id}</td>
                <td>{p.order}</td>
                <td>{p.shop}</td>
                <td style={{ fontWeight:700 }}>₹{p.amount}</td>
                <td>{p.gateway}</td>
                <td><span className={`pay-status-pill ${PAY_CLR[p.status]||'ps-pending'}`}>{p.status}</span></td>
                <td className="support-time-cell">{p.time}</td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    {p.status === 'failed' && <button className="support-action-btn support-action-primary">Retry</button>}
                    {p.status === 'captured' && <button className="support-action-btn">Refund</button>}
                    <button className="admin-row-btn" title="Copy payment ID" onClick={() => navigator.clipboard?.writeText(p.id)}><Copy size={12} /></button>
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

// ─── Users panel ──────────────────────────────────────────────────────────────
function UsersPanel({ users }) {
  const [search, setSearch] = useState('');
  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search)
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
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Plan</th><th>Shops</th><th>Joined</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight:600 }}>{u.name}</td>
                <td style={{ fontSize:12.5, color:'var(--gray-500)' }}>{u.email}</td>
                <td><span className="role-chip-sm">{u.role}</span></td>
                <td>{u.plan}</td>
                <td>{u.shops}</td>
                <td className="support-time-cell">{u.joined}</td>
                <td>
                  <span className={`status-pill ${u.status==='active'?'st-active':'st-suspended'}`}>
                    {u.status==='active'?<CheckCircle2 size={11}/>:<XCircle size={11}/>} {u.status}
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
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Shops panel ──────────────────────────────────────────────────────────────
function ShopsPanel() {
  const shops = [
    { id:'s1', name:'Spice Route',    owner:'Sujeet N',  plan:'Growth',  items:42, orders:73,  status:'active' },
    { id:'s2', name:'Chai & Chaat',   owner:'Ankit J',   plan:'Starter', items:18, orders:28,  status:'active' },
    { id:'s3', name:'Coconut Grove',  owner:'Meena P',   plan:'Business',items:86, orders:142, status:'active' },
    { id:'s4', name:'Biryani House',  owner:'Farhan K',  plan:'Growth',  items:31, orders:51,  status:'suspended' },
    { id:'s5', name:'Cake Studio',    owner:'Priya D',   plan:'Starter', items:24, orders:14,  status:'active' },
  ];
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Shops</h1><p className="page-subtitle">{shops.length} registered</p></div>
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Shop</th><th>Owner</th><th>Plan</th><th>Menu items</th><th>Orders today</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {shops.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight:700 }}>{s.name}</td>
                <td>{s.owner}</td>
                <td><span className="plan-pill">{s.plan}</span></td>
                <td>{s.items}</td>
                <td>{s.orders}</td>
                <td>
                  <span className={`status-pill ${s.status==='active'?'st-active':'st-suspended'}`}>
                    {s.status==='active'?<CheckCircle2 size={11}/>:<XCircle size={11}/>} {s.status}
                  </span>
                </td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="admin-row-btn"><Eye size={13} /></button>
                    <button className="support-action-btn">{s.status==='active'?'Suspend':'Activate'}</button>
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

// ─── QR Codes panel ───────────────────────────────────────────────────────────
function QRPanel({ qrs }) {
  const TYPE_CLR = { shop:'qr-type-green', table:'qr-type-blue', group:'qr-type-purple' };
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">QR Codes</h1><p className="page-subtitle">{qrs.length} codes · {qrs.filter(q=>q.status==='broken').length} broken</p></div>
      </div>
      {qrs.filter(q=>q.status==='broken').length > 0 && (
        <div className="support-alert-banner">
          <AlertCircle size={16} />
          <span><strong>{qrs.filter(q=>q.status==='broken').length} QR code{qrs.filter(q=>q.status==='broken').length>1?'s':''}</strong> are broken and may not resolve for customers.</span>
        </div>
      )}
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>QR ID</th><th>Shop</th><th>Type</th><th>URL</th><th>Scans</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {qrs.map(q => (
              <tr key={q.id}>
                <td style={{ fontWeight:700 }}>{q.id}</td>
                <td>{q.shop}</td>
                <td><span className={`qr-type-badge ${TYPE_CLR[q.type]||'qr-type-green'}`}>{q.type}</span></td>
                <td style={{ fontSize:12, fontFamily:'monospace', color:'var(--gray-500)' }}>{q.url}</td>
                <td>{q.scans.toLocaleString()}</td>
                <td>
                  <span className={`status-pill ${q.status==='active'?'st-active':'st-suspended'}`}>
                    {q.status==='active'?<CheckCircle2 size={11}/>:<XCircle size={11}/>} {q.status}
                  </span>
                </td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="admin-row-btn" title="Copy URL"><Copy size={12} /></button>
                    <button className="admin-row-btn" title="Open URL"><ExternalLink size={12} /></button>
                    {q.status==='broken' && <button className="support-action-btn support-action-primary">Fix</button>}
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

// ─── OCR Jobs panel ───────────────────────────────────────────────────────────
function OCRPanel({ jobs }) {
  const STATUS_CFG = {
    completed:  { cls:'ocr-done',       label:'Completed' },
    failed:     { cls:'ocr-failed',     label:'Failed' },
    processing: { cls:'ocr-processing', label:'Processing' },
  };
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">OCR Jobs</h1><p className="page-subtitle">Menu upload processing queue</p></div>
        <button className="btn-refresh"><RefreshCw size={13} /> Refresh</button>
      </div>
      {jobs.filter(j=>j.status==='failed').length > 0 && (
        <div className="support-alert-banner">
          <AlertCircle size={16} />
          <span><strong>{jobs.filter(j=>j.status==='failed').length} OCR job{jobs.filter(j=>j.status==='failed').length>1?'s':''}</strong> failed. Shop owners may need assistance uploading their menu.</span>
        </div>
      )}
      <div className="support-panel">
        {jobs.map(job => {
          const cfg = STATUS_CFG[job.status] || STATUS_CFG.processing;
          return (
            <div key={job.id} className="ocr-job-row">
              <div className="ocr-job-icon">
                <ScanLine size={18} style={{ color: job.status === 'failed' ? 'var(--red)' : job.status === 'completed' ? 'var(--green-dark)' : 'var(--blue)' }} />
              </div>
              <div className="ocr-job-info">
                <div className="ocr-job-shop">{job.shop}</div>
                <div className="ocr-job-file">{job.file}</div>
              </div>
              <div className="ocr-job-items">
                {job.status === 'completed' ? `${job.items} items extracted` : job.status === 'processing' ? 'Processing…' : 'Extraction failed'}
              </div>
              <div className="ocr-job-time">{job.time}</div>
              <span className={`ocr-status-pill ${cfg.cls}`}>{cfg.label}</span>
              {job.status === 'failed' && (
                <button className="support-action-btn support-action-primary">Retry</button>
              )}
              {job.status === 'processing' && (
                <button className="support-action-btn">Cancel</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────
function AuditRow({ log }) {
  const LEVEL_CLR = { info:'audit-info', warn:'audit-warn', error:'audit-error' };
  return (
    <div className="audit-row">
      <div className={`audit-level-dot ${LEVEL_CLR[log.level]}`} />
      <div className="audit-body">
        <div className="audit-action">{log.action}</div>
        <div className="audit-meta">
          <span className="audit-actor">{log.actor}</span>
          <span className="audit-time">{log.time}</span>
        </div>
      </div>
    </div>
  );
}

function AuditPanel({ logs }) {
  const [levelFilter, setLevelFilter] = useState('all');
  const filtered = levelFilter === 'all' ? logs : logs.filter(l => l.level === levelFilter);
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Audit Logs</h1><p className="page-subtitle">Complete activity trail</p></div>
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

// ─── Impersonation panel ─────────────────────────────────────────────────────
function ImpersonatePanel({ users }) {
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);

  const handleImpersonate = () => {
    if (!selected || !reason.trim()) return;
    setDone(true);
    setTimeout(() => { setDone(false); setSelected(null); setReason(''); }, 3000);
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
          {users.filter(u => u.role !== 'customer').map(u => (
            <button
              key={u.id}
              className={`impersonate-user-row ${selected?.id === u.id ? 'selected' : ''}`}
              onClick={() => setSelected(u)}
            >
              <div className="imp-avatar">{u.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
              <div className="imp-info">
                <div className="imp-name">{u.name}</div>
                <div className="imp-email">{u.email} · {u.role}</div>
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
                <div className="imp-avatar large">{selected.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{selected.name}</div>
                  <div style={{ fontSize:12.5, color:'var(--gray-500)' }}>{selected.email}</div>
                  <span className="role-chip-sm" style={{ marginTop:6, display:'inline-block' }}>{selected.role}</span>
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
              {done ? (
                <div className="impersonate-success">
                  <CheckCircle2 size={16} /> Session started. This is logged in the audit trail.
                </div>
              ) : (
                <button
                  className="impersonate-start-btn"
                  onClick={handleImpersonate}
                  disabled={!reason.trim()}
                >
                  <UserCheck size={15} /> Start impersonation session
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

