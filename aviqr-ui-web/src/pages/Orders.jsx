import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { orderApi, invoiceApi } from '../api/index.js';
import './Orders.css';

const STATUS_NEXT  = { NEW:'ACCEPTED', ACCEPTED:'PREPARING', PREPARING:'READY', READY:'COMPLETED' };
const STATUS_LABEL = { NEW:'New', ACCEPTED:'Accepted', PREPARING:'Preparing', READY:'Ready', COMPLETED:'Done', CANCELLED:'Cancelled' };
const STATUS_COLOR = { NEW:'#2563EB', ACCEPTED:'#D97706', PREPARING:'#D97706', READY:'#1D9E75', COMPLETED:'#6B7280', CANCELLED:'#DC2626' };

function timeSince(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

export default function Orders() {
  const { user } = useAuth();
  const shopId = user?.shopId;
  const [orders,  setOrders]  = useState([]);
  const [filter,  setFilter]  = useState('ALL');
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRef]  = useState(false);
  const [error,   setError]   = useState(null);

  const load = useCallback(async (showRefresh = false) => {
    if (!shopId) { setError('No shop linked to this account'); setLoading(false); return; }
    if (showRefresh) setRef(true);
    setError(null);
    try {
      const res = await orderApi.getLiveOrders(shopId);
      setOrders(res.data.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load orders');
    } finally { setLoading(false); setRef(false); }
  }, [shopId]);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const advance = async (order) => {
    const next = STATUS_NEXT[order.status]; if (!next) return;
    setOrders(prev => prev.map(o => o.id === order.id ? {...o, status: next} : o));
    try { await orderApi.updateStatus(order.id, next); }
    catch { await load(); } // revert on failure
  };

  const filtered = orders.filter(o => {
    if (filter !== 'ALL' && o.status !== filter) return false;
    if (search && !o.orderNumber?.toLowerCase().includes(search.toLowerCase()) &&
        !o.customerName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statuses = ['ALL','NEW','ACCEPTED','PREPARING','READY','COMPLETED'];

  if (loading) return (
    <div className="page-content" style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, flexDirection:'column', gap:10 }}>
      <div style={{ width:28, height:28, border:'3px solid var(--green)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>
      <p style={{ color:'var(--gray-500)', fontSize:13 }}>Loading orders…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="page-content">
      {error && (
        <div className="demo-notice" style={{ background:'var(--red-bg)', borderColor:'#FCA5A5', color:'var(--red)' }}>
          ⚠ {error} <button onClick={() => load()} style={{ fontWeight:700, background:'none', border:'none', cursor:'pointer', color:'var(--red)', textDecoration:'underline' }}>Retry</button>
        </div>
      )}

      <div className="orders-controls">
        <input className="search-input" placeholder="Search order # or customer…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <button className="icon-btn" onClick={() => load(true)}>
          <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}/>
        </button>
      </div>

      <div className="filter-chips">
        {statuses.map(s => (
          <button key={s} className={`chip${filter===s?' active':''}`} onClick={() => setFilter(s)}>
            {STATUS_LABEL[s] || s}
            <span className="chip-count">({orders.filter(o => s==='ALL' || o.status===s).length})</span>
          </button>
        ))}
      </div>

      <div className="orders-list-full">
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ textAlign:'center', padding:'48px 0', color:'var(--gray-400)' }}>
            📭 {filter !== 'ALL' ? `No ${STATUS_LABEL[filter]?.toLowerCase()||filter} orders` : 'No orders yet'}
          </div>
        ) : filtered.map(order => (
          <div key={order.id} className="order-card">
            <div className="order-card-top">
              <div>
                <span className="order-num">{order.orderNumber}</span>
                <span className="order-customer">{order.customerName}</span>
                {order.tableNumber && <span className="order-table">Table {order.tableNumber}</span>}
              </div>
              <span className="status-pill" style={{ background: STATUS_COLOR[order.status]+'18', color: STATUS_COLOR[order.status] }}>
                {STATUS_LABEL[order.status] || order.status}
              </span>
            </div>
            <div className="order-items-list">
              {(order.items||[]).slice(0,3).map((it,i) => (
                <span key={i} className="order-item-tag">{it.itemName||it.name} ×{it.quantity}</span>
              ))}
              {(order.items||[]).length > 3 && <span className="order-item-tag">+{order.items.length-3} more</span>}
            </div>
            <div className="order-card-footer">
              <span className="order-time">{timeSince(order.createdAt)}</span>
              <span className="order-amt">₹{parseFloat(order.totalAmount||0).toFixed(0)}</span>
              {/* KOT print — opens thermal-ready HTML in new tab */}
              <button className="advance-btn" style={{ background:'var(--gray-100)', color:'var(--gray-700)' }}
                onClick={() => window.open(invoiceApi.kotUrl(order.id), 'aviqr_kot', 'width=420,height=600')}>
                🖨 KOT
              </button>
              {/* GST Invoice download */}
              <a className="advance-btn" style={{ background:'var(--blue-bg)', color:'var(--blue)', textDecoration:'none' }}
                href={invoiceApi.downloadUrl(order.id, {})} target="_blank" rel="noreferrer">
                📄 Invoice
              </a>
              {STATUS_NEXT[order.status] && (
                <button className="advance-btn" onClick={() => advance(order)}>
                  {order.status==='NEW'?'✓ Accept':order.status==='ACCEPTED'?'👨‍🍳 Start':order.status==='PREPARING'?'✅ Ready':'🎉 Done'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
