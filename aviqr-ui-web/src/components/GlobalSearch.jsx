import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, ArrowRight,
  LayoutDashboard, ShoppingBag, BookOpen, QrCode, Users, BarChart3,
  Settings, Package, Gift, ChefHat, Receipt, FlaskConical, Clock,
  Sparkles, TrendingUp, PlusCircle,
} from 'lucide-react';
import { useAuth, ROLE_PERMISSIONS } from '../context/AuthContext.jsx';
import { orderApi, menuApi } from '../api/index.js';

const NAV_ITEMS = [
  { to: '/dashboard',     label: 'Dashboard',            icon: LayoutDashboard },
  { to: '/orders',        label: 'Orders',               icon: ShoppingBag },
  { to: '/billing',       label: 'POS / Billing',        icon: Receipt },
  { to: '/kot',           label: 'Kitchen Display (KOT)',icon: ChefHat },
  { to: '/menu',          label: 'Menu Items',           icon: BookOpen },
  { to: '/variations',    label: 'Variants & Add-ons',   icon: PlusCircle },
  { to: '/qr-codes',      label: 'QR Codes',             icon: QrCode },
  { to: '/inventory',     label: 'Stock Levels',         icon: Package },
  { to: '/raw-materials', label: 'Raw Materials',        icon: FlaskConical },
  { to: '/loyalty',       label: 'Loyalty Program',      icon: Gift },
  { to: '/staff',         label: 'Staff',                icon: Users },
  { to: '/reports',       label: 'Reports',              icon: BarChart3 },
  { to: '/analytics',     label: 'Advanced Analytics',   icon: TrendingUp },
  { to: '/order-history', label: 'Order History',        icon: Clock },
  { to: '/ai',            label: 'AI Features',          icon: Sparkles },
  { to: '/settings',      label: 'Settings',             icon: Settings },
];

const STATUS_COLOR = {
  NEW: '#2563EB', ACCEPTED: '#D97706', PREPARING: '#7C3AED',
  READY: '#1D9E75', COMPLETED: '#6B7280', CANCELLED: '#DC2626',
};

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery]       = useState('');
  const [orders, setOrders]     = useState([]);
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [activeIdx, setActive]  = useState(0);
  const inputRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filter nav items to only what this role can access
  const role = (user?.role || '').toUpperCase();
  const perms = ROLE_PERMISSIONS[role];
  const allowedNav = NAV_ITEMS.filter(item => {
    if (perms === null || perms === undefined) return true;
    return perms.includes(item.to.replace('/', ''));
  });

  const canSearchOrders = perms === null || perms?.includes('orders');
  const canSearchMenu   = perms === null || perms?.includes('menu');

  // Fetch data once when palette opens (only what the role can see)
  useEffect(() => {
    if (!open || !user?.shopId) return;
    setLoading(true);
    Promise.all([
      canSearchOrders
        ? orderApi.getLiveOrders(user.shopId).then(r => r.data.data || []).catch(() => [])
        : Promise.resolve([]),
      canSearchMenu
        ? menuApi.getItems(user.shopId).then(r => { const d = r.data.data; return d?.content ?? d ?? []; }).catch(() => [])
        : Promise.resolve([]),
    ]).then(([ords, mItems]) => {
      setOrders(ords);
      setItems(mItems);
    }).finally(() => setLoading(false));
  }, [open, user?.shopId]);

  // Focus + reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const q = query.trim().toLowerCase();

  const navResults = q
    ? allowedNav.filter(n => n.label.toLowerCase().includes(q))
    : allowedNav.slice(0, 6);

  const orderResults = q
    ? orders.filter(o =>
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerPhone?.includes(q) ||
        o.tableNumber?.toString().includes(q)
      ).slice(0, 4)
    : [];

  const menuResults = q
    ? items.filter(m => m.name?.toLowerCase().includes(q)).slice(0, 4)
    : [];

  // Flat list for keyboard nav
  const allResults = [
    ...navResults.map(r => ({ ...r, type: 'nav' })),
    ...orderResults.map(o => ({ type: 'order', to: '/orders', _order: o })),
    ...menuResults.map(m => ({ type: 'menu', to: '/menu', _item: m })),
  ];

  useEffect(() => { setActive(0); }, [query]);

  const go = (item) => {
    navigate(item.to);
    onClose();
  };

  const handleKey = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, allResults.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && allResults[activeIdx]) go(allResults[activeIdx]);
  };

  if (!open) return null;

  const navOffset   = 0;
  const orderOffset = navResults.length;
  const menuOffset  = navResults.length + orderResults.length;

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', zIndex:9999,
               display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:72 }}
      onClick={onClose}
    >
      <div
        style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:560,
                 boxShadow:'0 24px 64px rgba(0,0,0,0.25)', overflow:'hidden', margin:'0 16px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Input ──────────────────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px',
                      borderBottom:'1px solid #F3F4F6' }}>
          <Search size={17} color="#9CA3AF" style={{ flexShrink:0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search pages, orders, menu items…"
            style={{ flex:1, border:'none', outline:'none', fontSize:14, color:'#111827',
                     background:'transparent', minWidth:0 }}
          />
          {query
            ? <button onClick={() => setQuery('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:2 }}><X size={15}/></button>
            : <kbd style={{ fontSize:10, color:'#9CA3AF', background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:4, padding:'2px 6px', whiteSpace:'nowrap' }}>Esc</kbd>
          }
        </div>

        {/* ── Results ────────────────────────────────────────────── */}
        <div style={{ maxHeight:420, overflowY:'auto' }}>

          {/* Empty state */}
          {allResults.length === 0 && q && !loading && (
            <div style={{ padding:'36px 16px', textAlign:'center', color:'#9CA3AF', fontSize:13 }}>
              No results for <strong>"{query}"</strong>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ padding:'20px 16px', textAlign:'center', color:'#9CA3AF', fontSize:12 }}>
              Searching…
            </div>
          )}

          {/* Pages */}
          {navResults.length > 0 && (
            <Section label={q ? 'Pages' : 'Quick Access'}>
              {navResults.map((item, i) => {
                const Icon = item.icon;
                const idx  = navOffset + i;
                const active = activeIdx === idx;
                return (
                  <Row key={item.to} active={active} onClick={() => go(item)} onHover={() => setActive(idx)}>
                    <IconBox active={active} color="#1D9E75" bg="#F0FDF8"><Icon size={14}/></IconBox>
                    <span style={{ fontSize:13, fontWeight:500, color:'#111827' }}>{item.label}</span>
                    <ArrowRight size={13} style={{ marginLeft:'auto', color:'#D1D5DB' }}/>
                  </Row>
                );
              })}
            </Section>
          )}

          {/* Orders */}
          {orderResults.length > 0 && (
            <Section label="Live Orders">
              {orderResults.map((o, i) => {
                const idx = orderOffset + i;
                const active = activeIdx === idx;
                const col = STATUS_COLOR[o.status] || '#6B7280';
                return (
                  <Row key={o.id} active={active} onClick={() => go({ to:'/orders' })} onHover={() => setActive(idx)}>
                    <IconBox active={active} color="#2563EB" bg="#EFF6FF"><ShoppingBag size={14}/></IconBox>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:'#111827' }}>#{o.orderNumber}</div>
                      <div style={{ fontSize:11, color:'#6B7280' }}>{o.customerName}{o.tableNumber ? ` · T-${o.tableNumber}` : ''}</div>
                    </div>
                    <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999,
                                   background:col+'18', color:col }}>{o.status}</span>
                  </Row>
                );
              })}
            </Section>
          )}

          {/* Menu items */}
          {menuResults.length > 0 && (
            <Section label="Menu Items">
              {menuResults.map((m, i) => {
                const idx = menuOffset + i;
                const active = activeIdx === idx;
                return (
                  <Row key={m.id} active={active} onClick={() => go({ to:'/menu' })} onHover={() => setActive(idx)}>
                    <IconBox active={active} color="#1D9E75" bg="#F0FDF8"><BookOpen size={14}/></IconBox>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, color:'#111827' }}>{m.name}</div>
                      <div style={{ fontSize:11, color:'#9CA3AF' }}>{m.veg === false ? '🔴 Non-veg' : '🟢 Veg'}</div>
                    </div>
                    <span style={{ marginLeft:'auto', fontSize:13, fontWeight:700, color:'#1D9E75' }}>₹{m.price}</span>
                  </Row>
                );
              })}
            </Section>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div style={{ padding:'7px 16px', borderTop:'1px solid #F3F4F6', display:'flex', gap:14,
                      fontSize:10, color:'#9CA3AF' }}>
          <span>↑ ↓ navigate</span>
          <span>↵ select</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div style={{ fontSize:10, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase',
                    letterSpacing:.8, padding:'10px 16px 3px' }}>{label}</div>
      {children}
    </div>
  );
}

function Row({ active, onClick, onHover, children }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 16px',
               border:'none', cursor:'pointer', textAlign:'left',
               background: active ? '#F0FDF8' : 'transparent', transition:'background .08s' }}
    >
      {children}
    </button>
  );
}

function IconBox({ active, color, bg, children }) {
  return (
    <div style={{ width:30, height:30, borderRadius:7, flexShrink:0, display:'flex',
                  alignItems:'center', justifyContent:'center',
                  background: active ? color : bg,
                  color: active ? '#fff' : color, transition:'background .08s' }}>
      {children}
    </div>
  );
}