import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, Printer, FileText, Bell, XCircle, Search,
  Clock, Bike, ShoppingBag, UtensilsCrossed, AlertTriangle,
  CheckCircle2, ChefHat, Truck, Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { orderApi, invoiceApi } from '../api/index.js';
import './Orders.css';

// ── Constants ────────────────────────────────────────────────────────────────
const ORDER_TYPES = {
  DINE_IN:  { label:'Dine-in',  icon:UtensilsCrossed, color:'#1D9E75', bg:'#E1F5EE' },
  TAKEAWAY: { label:'Takeaway', icon:ShoppingBag,     color:'#7C3AED', bg:'#F5F3FF' },
  DELIVERY: { label:'Delivery', icon:Bike,            color:'#D97706', bg:'#FFFBEB' },
};
const STATUS_NEXT  = { NEW:'ACCEPTED', ACCEPTED:'PREPARING', PREPARING:'READY', READY:'COMPLETED' };
const STATUS_LABEL = { NEW:'New', ACCEPTED:'Accepted', PREPARING:'Preparing', READY:'Ready!', COMPLETED:'Done', CANCELLED:'Cancelled', REJECTED:'Rejected' };
const STATUS_COLOR = { NEW:'#2563EB', ACCEPTED:'#D97706', PREPARING:'#7C3AED', READY:'#1D9E75', COMPLETED:'#6B7280', CANCELLED:'#DC2626', REJECTED:'#DC2626' };
const STATUS_ICON  = { NEW:'🆕', ACCEPTED:'✓', PREPARING:'👨‍🍳', READY:'🔔', COMPLETED:'✅', CANCELLED:'✗', REJECTED:'✗' };
const ADVANCE_LABEL= { NEW:'Accept order', ACCEPTED:'Start cooking', PREPARING:'Mark ready', READY:'Mark delivered' };
const AGG_BADGE    = { ZOMATO:{ label:'Zomato', bg:'#E32', color:'#fff' }, SWIGGY:{ label:'Swiggy', bg:'#FC8019', color:'#fff' }, DUNZO:{ label:'Dunzo', bg:'#00D67F', color:'#fff' } };

function timeSince(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ago`;
}

function waitMinutes(ts) {
  return ts ? Math.floor((Date.now() - new Date(ts)) / 60000) : 0;
}

// ── KOT Component ─────────────────────────────────────────────────────────────
function KotPreview({ order, onClose }) {
  const printRef = useRef();
  const doPrint = () => {
    const w = window.open('', 'aviqr_kot', 'width=440,height=660,toolbar=0');
    w.document.write(printRef.current.innerHTML);
    w.document.close();
    w.print();
  };
  const typeInfo = ORDER_TYPES[order.type] || ORDER_TYPES.DINE_IN;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding:16 }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:400, overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid var(--gray-100)' }}>
          <h3 style={{ fontSize:16, fontWeight:700 }}>Kitchen Order Ticket</h3>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary" onClick={doPrint} style={{ height:34, fontSize:13 }}><Printer size={13} /> Print KOT</button>
            <button onClick={onClose} style={{ background:'var(--gray-100)', border:'none', borderRadius:8, padding:'6px 10px', cursor:'pointer' }}>✕</button>
          </div>
        </div>
        <div ref={printRef} style={{ padding:'20px', fontFamily:"'Courier New', monospace", fontSize:14 }}>
          <style>{`
            @media print { body { margin:0; } }
            .kot-header { text-align:center; border-bottom:2px dashed #000; padding-bottom:10px; margin-bottom:10px }
            .kot-title { font-size:22px; font-weight:900; letter-spacing:6px }
            .kot-num { font-size:28px; font-weight:900; margin:4px 0 }
            .kot-meta { display:flex; justify-content:space-between; font-size:12px; margin:4px 0 }
            .kot-divider { border-top:1px dashed #000; margin:8px 0 }
            .kot-item { display:flex; gap:10px; padding:6px 0; border-bottom:1px dashed #eee }
            .kot-qty { font-size:22px; font-weight:900; min-width:28px }
            .kot-name { font-size:15px; font-weight:700; line-height:1.3 }
            .kot-note { font-size:12px; color:#555; margin-top:3px }
            .kot-footer { text-align:center; font-size:11px; margin-top:10px; color:#555 }
          `}</style>
          <div className="kot-header">
            <div className="kot-title">K · O · T</div>
            <div className="kot-num">#{order.orderNumber}</div>
          </div>
          <div className="kot-meta"><span><b>Type:</b> {typeInfo.label}</span><span><b>Time:</b> {new Date(order.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span></div>
          {order.tableNumber && <div className="kot-meta"><span><b>Table:</b> {order.tableNumber}</span></div>}
          {order.customerName && order.customerName !== 'Walk-in' && <div className="kot-meta"><span><b>Customer:</b> {order.customerName}</span></div>}
          {order.type === 'DELIVERY' && order.customerPhone && <div className="kot-meta"><span><b>Phone:</b> {order.customerPhone}</span></div>}
          <div className="kot-divider" />
          {(order.items || []).map((it, i) => (
            <div key={i} className="kot-item">
              <span className="kot-qty">{it.quantity}</span>
              <div>
                <div className="kot-name">{it.itemName || it.name}</div>
                {it.notes && <div className="kot-note">⚠ {it.notes}</div>}
              </div>
            </div>
          ))}
          <div className="kot-divider" />
          {order.notes && <div style={{ fontSize:13, fontWeight:700, background:'#FFFBEB', padding:'6px 8px', borderRadius:4, marginBottom:6 }}>⚠ SPECIAL: {order.notes}</div>}
          <div className="kot-footer">AviQR · Kitchen Copy</div>
        </div>
      </div>
    </div>
  );
}

// ── Main Orders component ─────────────────────────────────────────────────────
export default function Orders() {
  const { user } = useAuth();
  const shopId   = user?.shopId;

  const [orders,     setOrders]   = useState([]);
  const [typeFilter, setTypeFilter]= useState('ALL');  // ALL | DINE_IN | TAKEAWAY | DELIVERY
  const [statusFilter,setStatus]  = useState('ACTIVE'); // ACTIVE | NEW | PREPARING | READY | COMPLETED | ALL
  const [search,     setSearch]   = useState('');
  const [loading,    setLoading]  = useState(true);
  const [refreshing, setRef]      = useState(false);
  const [error,      setError]    = useState(null);
  const [kotOrder,   setKot]      = useState(null);  // order shown in KOT preview
  const prevNew = useRef(0);

  const load = useCallback(async (showRef = false) => {
    if (!shopId) { setError('No shop linked to your account'); setLoading(false); return; }
    if (showRef) setRef(true);
    setError(null);
    try {
      const res  = await orderApi.getLiveOrders(shopId);
      const data = res.data.data || [];
      const newCount = data.filter(o => o.status === 'NEW').length;
      if (newCount > prevNew.current && prevNew.current >= 0) {
        document.title = `🔔 ${newCount} New Order${newCount > 1 ? 's' : ''} — AviQR`;
        setTimeout(() => { document.title = 'AviQR'; }, 6000);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New AviQR Order', { body: `${newCount} new order${newCount > 1 ? 's' : ''} waiting` });
        }
      }
      prevNew.current = newCount;
      setOrders(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load orders — check backend connection');
    } finally { setLoading(false); setRef(false); }
  }, [shopId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [shopId]);

  const advance = async (order) => {
    const next = STATUS_NEXT[order.status];
    if (!next) return;
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o));
    try { await orderApi.updateStatus(order.id, next); }
    catch { await load(); }
  };

  const cancel = async (order) => {
    if (!confirm(`Cancel order #${order.orderNumber}?\nThis cannot be undone.`)) return;
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'CANCELLED' } : o));
    try { await orderApi.updateStatus(order.id, 'CANCELLED'); }
    catch { await load(); }
  };

  const openInvoice = (order) => {
    window.open(invoiceApi.downloadUrl(order.id, {}), '_blank');
  };

  // Filtering
  const filtered = orders.filter(o => {
    if (typeFilter !== 'ALL' && o.type !== typeFilter) return false;
    if (statusFilter === 'ACTIVE' && ['COMPLETED','CANCELLED','REJECTED'].includes(o.status)) return false;
    if (statusFilter !== 'ACTIVE' && statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!o.orderNumber?.toLowerCase().includes(q) &&
          !o.customerName?.toLowerCase().includes(q) &&
          !o.tableNumber?.toString().includes(q) &&
          !o.customerPhone?.includes(q)) return false;
    }
    return true;
  });

  // Summary counts
  const counts = {
    ALL: orders.length,
    DINE_IN:  orders.filter(o => o.type === 'DINE_IN').length,
    TAKEAWAY: orders.filter(o => o.type === 'TAKEAWAY').length,
    DELIVERY: orders.filter(o => o.type === 'DELIVERY').length,
  };
  const newCount    = orders.filter(o => o.status === 'NEW').length;
  const activeCount = orders.filter(o => !['COMPLETED','CANCELLED','REJECTED'].includes(o.status)).length;
  const deliveryCount = orders.filter(o => o.type === 'DELIVERY' && !['COMPLETED','CANCELLED'].includes(o.status)).length;

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:320, flexDirection:'column', gap:12 }}>
      <div className="spinner" />
      <p style={{ color:'var(--gray-500)', fontSize:13 }}>Loading orders…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinner{width:28px;height:28px;border:3px solid var(--green);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}`}</style>
    </div>
  );

  return (
    <div className="page-content">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">{activeCount} active · auto-refreshes every 15s</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => load(true)}>
            <RefreshCw size={14} style={{ animation:refreshing?'spin 1s linear infinite':'none' }} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom:12 }}>
          <AlertTriangle size={14} /> {error}
          <button onClick={() => load()} className="alert-retry">Retry</button>
        </div>
      )}

      {/* New order alert banner */}
      {newCount > 0 && (
        <div style={{ background:'#EFF6FF', border:'1.5px solid #BFDBFE', borderRadius:10, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
          <Bell size={16} color="#2563EB" />
          <div style={{ flex:1, fontSize:13, color:'#1D4ED8' }}>
            <strong>{newCount} new order{newCount > 1 ? 's' : ''}</strong> waiting for acceptance
          </div>
          <button className="btn btn-primary" style={{ height:32, fontSize:12, padding:'0 14px' }}
            onClick={() => { setStatus('NEW'); setTypeFilter('ALL'); }}>
            View now →
          </button>
        </div>
      )}

      {/* Delivery active banner */}
      {deliveryCount > 0 && (
        <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#92400E' }}>
          <Bike size={15} />
          <strong>{deliveryCount} active delivery order{deliveryCount > 1 ? 's'  : ''}</strong> — check Zomato/Swiggy for rider status
        </div>
      )}

      {/* Type + Search bar */}
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        {/* Order type filter */}
        {[
          { key:'ALL',      label:'All',      count:counts.ALL,      icon:Package,          color:'#6B7280' },
          { key:'DINE_IN',  label:'Dine-in',  count:counts.DINE_IN,  icon:UtensilsCrossed,  color:'#1D9E75' },
          { key:'TAKEAWAY', label:'Takeaway', count:counts.TAKEAWAY, icon:ShoppingBag,      color:'#7C3AED' },
          { key:'DELIVERY', label:'Delivery', count:counts.DELIVERY, icon:Bike,             color:'#D97706' },
        ].map(({ key, label, count, icon:Icon, color }) => (
          <button key={key} onClick={() => setTypeFilter(key)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:999, border:`1.5px solid ${typeFilter===key ? color : 'var(--gray-200)'}`, background: typeFilter===key ? color+'14' : 'white', cursor:'pointer', fontSize:13, fontWeight: typeFilter===key ? 700 : 400, color: typeFilter===key ? color : 'var(--gray-600)' }}>
            <Icon size={13} /> {label}
            <span style={{ background: typeFilter===key ? color : 'var(--gray-200)', color: typeFilter===key ? 'white' : 'var(--gray-500)', borderRadius:999, padding:'1px 7px', fontSize:11, fontWeight:700 }}>{count}</span>
          </button>
        ))}

        {/* Search */}
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)', pointerEvents:'none' }} />
          <input className="field-input" style={{ paddingLeft:32, height:38, width:'100%' }}
            placeholder="Search order #, customer, table, phone…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Status tabs */}
      <div className="filter-chips" style={{ marginBottom:16 }}>
        {[
          { key:'ACTIVE',    label:'Active' },
          { key:'NEW',       label:'New' },
          { key:'PREPARING', label:'Preparing' },
          { key:'READY',     label:'Ready' },
          { key:'COMPLETED', label:'Completed' },
          { key:'ALL',       label:'All orders' },
        ].map(({ key, label }) => {
          const cnt = key === 'ACTIVE'
            ? orders.filter(o => !['COMPLETED','CANCELLED','REJECTED'].includes(o.status)).length
            : key === 'ALL' ? orders.length
            : orders.filter(o => o.status === key).length;
          return (
            <button key={key} className={`chip${statusFilter===key ? ' active' : ''}`} onClick={() => setStatus(key)}>
              {label} <span className="chip-count">({cnt})</span>
            </button>
          );
        })}
      </div>

      {/* Order cards grid */}
      <div className="orders-list-full">
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--gray-400)' }}>
            <div style={{ fontSize:44, marginBottom:10 }}>📭</div>
            <p style={{ fontSize:15, fontWeight:500 }}>
              {search ? `No orders matching "${search}"` :
               statusFilter === 'ACTIVE' ? 'No active orders right now' :
               `No ${statusFilter === 'ALL' ? '' : statusFilter.toLowerCase()+' '}orders`}
            </p>
            <p style={{ fontSize:12, marginTop:6 }}>Orders appear here in real-time as customers place them</p>
          </div>
        ) : filtered.map(order => {
          const wait    = waitMinutes(order.createdAt);
          const urgent  = ['NEW','ACCEPTED','PREPARING'].includes(order.status) && wait > 15;
          const critical= ['NEW','ACCEPTED','PREPARING'].includes(order.status) && wait > 25;
          const typeInfo= ORDER_TYPES[order.type] || ORDER_TYPES.DINE_IN;
          const statColor= STATUS_COLOR[order.status] || '#6B7280';
          const aggSource= order.aggregatorSource; // 'ZOMATO' | 'SWIGGY' | null
          const aggBadge = aggSource && AGG_BADGE[aggSource];

          return (
            <div key={order.id} className="order-card" style={{
              border: critical ? '2px solid #DC2626' : urgent ? '1.5px solid #FCA5A5' : '1px solid var(--gray-100)',
              background: critical ? '#FFF5F5' : urgent ? '#FFFAFA' : 'white',
              animation: order.status === 'NEW' && wait < 1 ? 'pulseNew 2s ease-in-out 3' : 'none',
            }}>

              {/* Top row */}
              <div className="order-card-top">
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <span className="order-num">#{order.orderNumber}</span>

                  {/* Order type badge */}
                  <span style={{ fontSize:11, fontWeight:700, background:typeInfo.bg, color:typeInfo.color, padding:'2px 8px', borderRadius:999, display:'flex', alignItems:'center', gap:3 }}>
                    <typeInfo.icon size={10} /> {typeInfo.label}
                  </span>

                  {/* Aggregator badge */}
                  {aggBadge && (
                    <span style={{ fontSize:11, fontWeight:700, background:aggBadge.bg, color:aggBadge.color, padding:'2px 8px', borderRadius:999 }}>
                      {aggBadge.label}
                    </span>
                  )}

                  {order.customerName && order.customerName !== 'Walk-in' && (
                    <span className="order-customer">{order.customerName}</span>
                  )}
                  {order.tableNumber && (
                    <span className="order-table">Table {order.tableNumber}</span>
                  )}
                  {critical && <span style={{ fontSize:11, background:'#FEE2E2', color:'#DC2626', padding:'2px 8px', borderRadius:999, fontWeight:700, animation:'blink 1s step-end infinite' }}>🚨 {wait}m — urgent</span>}
                  {urgent && !critical && <span style={{ fontSize:11, background:'#FEF3C7', color:'#92400E', padding:'2px 7px', borderRadius:999, fontWeight:700 }}>⏱ {wait}m</span>}
                </div>

                <span className="status-pill" style={{ background:statColor+'18', color:statColor, flexShrink:0 }}>
                  {STATUS_ICON[order.status]} {STATUS_LABEL[order.status] || order.status}
                </span>
              </div>

              {/* Items */}
              <div className="order-items-list" style={{ marginTop:8 }}>
                {(order.items || []).map((it, i) => (
                  <span key={i} className="order-item-tag">
                    {it.itemName || it.name} ×{it.quantity}
                    {it.notes && <em style={{ color:'#9CA3AF', fontSize:11 }}> ({it.notes})</em>}
                  </span>
                ))}
              </div>

              {/* Special instructions */}
              {order.notes && (
                <div style={{ fontSize:12, color:'#92400E', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:6, padding:'5px 10px', marginTop:8, fontWeight:600 }}>
                  📝 {order.notes}
                </div>
              )}

              {/* Delivery address if delivery order */}
              {order.type === 'DELIVERY' && order.deliveryAddress && (
                <div style={{ fontSize:12, color:'#4B5563', background:'#F9FAFB', borderRadius:6, padding:'5px 10px', marginTop:6 }}>
                  📍 {order.deliveryAddress}
                </div>
              )}

              {/* Footer */}
              <div className="order-card-footer" style={{ marginTop:10, flexWrap:'wrap', gap:6 }}>
                <span className="order-time" style={{ fontSize:12, color:'var(--gray-400)', display:'flex', alignItems:'center', gap:3 }}>
                  <Clock size={11} /> {timeSince(order.createdAt)}
                </span>
                <span className="order-amt" style={{ fontSize:15, fontWeight:800, color:'var(--gray-900)', marginLeft:'auto' }}>
                  ₹{parseFloat(order.totalAmount || 0).toFixed(0)}
                </span>

                {/* KOT */}
                <button className="action-btn action-btn--ghost" onClick={() => setKot(order)}>
                  <ChefHat size={13} /> KOT
                </button>

                {/* Invoice */}
                {['COMPLETED','READY'].includes(order.status) && (
                  <button className="action-btn action-btn--ghost" onClick={() => openInvoice(order)}>
                    <FileText size={13} /> Invoice
                  </button>
                )}

                {/* Cancel */}
                {['NEW','ACCEPTED'].includes(order.status) && (
                  <button className="action-btn action-btn--danger" onClick={() => cancel(order)} title="Cancel order">
                    <XCircle size={13} />
                  </button>
                )}

                {/* Advance status */}
                {STATUS_NEXT[order.status] && (
                  <button className="action-btn action-btn--primary" onClick={() => advance(order)} style={{ minWidth:130 }}>
                    {ADVANCE_LABEL[order.status]}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* KOT Preview modal */}
      {kotOrder && <KotPreview order={kotOrder} onClose={() => setKot(null)} />}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulseNew{0%,100%{box-shadow:0 0 0 0 rgba(37,99,235,0)}50%{box-shadow:0 0 0 6px rgba(37,99,235,0.15)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}
        .alert{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;font-size:13px;border:1px solid}
        .alert-error{background:var(--red-bg);border-color:#FCA5A5;color:var(--red)}
        .alert-retry{background:none;border:none;cursor:pointer;font-weight:700;text-decoration:underline;color:inherit;margin-left:8px}
        .action-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all .15s;white-space:nowrap}
        .action-btn--ghost{background:var(--gray-100);color:var(--gray-700)}
        .action-btn--ghost:hover{background:var(--gray-200)}
        .action-btn--primary{background:var(--green);color:white}
        .action-btn--primary:hover{opacity:.88}
        .action-btn--danger{background:var(--red-bg);color:var(--red)}
        .action-btn--danger:hover{background:#FEE2E2}
      `}</style>
    </div>
  );
}
