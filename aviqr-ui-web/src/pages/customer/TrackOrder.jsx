import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, RefreshCw } from 'lucide-react';
import { orderApi } from '../../api/index.js';
import OrderCodePanel from '../../components/shared/OrderCodePanel.jsx';
import OrderProgressTrack from '../../components/shared/OrderProgressTrack.jsx';

const STATUS_COLOR = { PENDING_PAYMENT:'#d97706', NEW:'#f59e0b', ACCEPTED:'#3b82f6', PREPARING:'#3b82f6', READY:'#10b981', COMPLETED:'#6b7280', CANCELLED:'#ef4444', REJECTED:'#ef4444' };

// Public, no-login "check my order" screen — the fix for guests who place an
// order without an account and then close the tab/app: they can come back
// here anytime with their order number + phone to see status again, instead
// of the tracking view only existing as in-memory state for one session.
export default function TrackOrder() {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const lookup = async (e) => {
    e?.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) { setError('Enter both your order number and phone number.'); return; }
    setLoading(true); setError('');
    try {
      const res = await orderApi.lookupPublic(orderNumber.trim(), phone.trim());
      setOrder(res.data.data);
    } catch {
      setOrder(null);
      setError("We couldn't find that order — check your order number and phone number and try again.");
    } finally { setLoading(false); }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await orderApi.lookupPublic(orderNumber.trim(), phone.trim());
      setOrder(res.data.data);
    } catch { /* keep showing last known state */ }
    finally { setRefreshing(false); }
  };

  const statusColor = order ? (STATUS_COLOR[order.status] || '#6b7280') : null;

  return (
    <div style={sx.wrap}>
      <div style={sx.header}>
        <button style={sx.backBtn} onClick={() => navigate('/')}><ArrowLeft size={18} /></button>
        <h1 style={sx.title}>Track your order</h1>
      </div>

      <form onSubmit={lookup} style={sx.card}>
        <div className="field">
          <label className="field-label">Order number</label>
          <input className="field-input" placeholder="ORD-1785085857568" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label className="field-label">Phone number used at checkout</label>
          <input className="field-input" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        {error && <p style={sx.errMsg}>{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} disabled={loading}>
          <Search size={14} /> {loading ? 'Looking up…' : 'Check status'}
        </button>
      </form>

      {order && (
        <div style={sx.result}>
          <div style={sx.resultHeader}>
            <div>
              <div style={sx.orderNum}>#{order.orderNumber}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                {order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
              </div>
            </div>
            <button style={sx.refreshBtn} onClick={refresh} disabled={refreshing} title="Refresh status">
              <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <span style={{ ...sx.statusBadge, color: statusColor, background: statusColor + '22' }}>{order.status}</span>
          </div>

          <div style={sx.section}><OrderCodePanel order={order} /></div>
          <div style={sx.section}><OrderProgressTrack status={order.status} /></div>

          <div style={sx.section}>
            <div style={sx.sectionTitle}>Items</div>
            <div style={sx.itemsCard}>
              {(order.items || []).map((it, i) => (
                <div key={it.id || i} style={sx.itemRow}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{it.itemName}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>Qty {it.quantity} · ₹{it.unitPrice}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>₹{it.totalPrice}</div>
                </div>
              ))}
              <div style={{ ...sx.itemRow, fontWeight: 800, borderBottom: 'none' }}>
                <span>Total</span><span>₹{order.totalAmount}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const sx = {
  wrap: { maxWidth: 480, margin: '0 auto', padding: '24px 16px 60px' },
  header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
  backBtn: { background: '#F9FAFB', border: '1px solid #F0F0F0', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  title: { fontSize: 18, fontWeight: 800, margin: 0, color: '#111827' },
  card: { background: '#fff', borderRadius: 16, border: '1px solid var(--gray-200)', padding: 20 },
  errMsg: { color: '#DC2626', fontSize: 13, marginTop: 10, marginBottom: 0, padding: '8px 12px', background: '#FEF2F2', borderRadius: 6, border: '1px solid #FCA5A5' },
  result: { marginTop: 20 },
  resultHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  orderNum: { fontSize: 16, fontWeight: 800, color: '#111827' },
  refreshBtn: { marginLeft: 'auto', background: '#F9FAFB', border: '1px solid #F0F0F0', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#374151' },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, flexShrink: 0 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .3 },
  itemsCard: { background: '#fff', border: '1px solid #F0F0F0', borderRadius: 14, padding: '12px 14px' },
  itemRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F9FAFB' },
};
