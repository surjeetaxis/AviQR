import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderApi, reviewApi } from '../../api/index.js';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';
import { ArrowLeft, ChevronRight, RefreshCw, Star } from 'lucide-react';
import OrderCodePanel from '../../components/shared/OrderCodePanel.jsx';
import OrderProgressTrack from '../../components/shared/OrderProgressTrack.jsx';

const STATUS_COLOR = { PENDING_PAYMENT:'#d97706', NEW:'#f59e0b', ACCEPTED:'#3b82f6', PREPARING:'#3b82f6', READY:'#10b981', COMPLETED:'#6b7280', CANCELLED:'#ef4444', REJECTED:'#ef4444' };

export default function PortalOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { authHeader, customerToken, customer } = useCustomerAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [rateOpen, setRateOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [myReview, setMyReview] = useState(null); // { rating } once submitted this session

  // customerToken (not authHeader) is the dependency here on purpose: authHeader
  // is a fresh object literal every render, so using it directly would recreate
  // this callback constantly. On the very first mount, CustomerAuthProvider's own
  // effect (reading localStorage) hasn't necessarily run yet — its child's effects
  // fire first in React's commit order — so without customerToken in the deps,
  // this closes over an empty authHeader forever and every direct/refreshed visit
  // to an order link 404s even when the customer is logged in.
  const load = useCallback((showRefreshing) => {
    if (showRefreshing) setRefreshing(true);
    return orderApi.getById(orderId, authHeader)
      .then(res => { setOrder(res.data.data); setError(''); })
      .catch(() => setError('Could not load this order.'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [orderId, customerToken]);

  // Same tracking behavior as the just-placed-order screen: auto-refresh every
  // 5s, plus a manual refresh button for an on-demand check.
  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  const submitReview = async () => {
    if (rating < 1) { setSubmitError('Tap a star to rate your order.'); return; }
    setSubmitError('');
    setSubmitting(true);
    try {
      await reviewApi.submit({
        shopId: order.shopId,
        orderId: order.id,
        customerName: customer?.name || 'Guest',
        rating,
        comment: comment.trim() || undefined,
      }, authHeader);
      setMyReview({ rating });
      setRateOpen(false);
    } catch (e) {
      setSubmitError(e?.response?.data?.message || 'Could not submit rating. Please try again.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div style={sx.center}><p style={{fontSize:13,color:'#9CA3AF'}}>Loading order…</p></div>;
  if (error || !order) return <div style={sx.center}><p style={{fontSize:13,color:'#DC2626'}}>{error || 'Order not found.'}</p></div>;

  const statusColor = STATUS_COLOR[order.status] || '#6b7280';

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={sx.header}>
        <button style={sx.backBtn} onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
        <div>
          <h1 style={sx.title}>#{order.orderNumber || order.id?.slice(0,8)}</h1>
          <div style={{ fontSize:12, color:'#9CA3AF' }}>
            {order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}
          </div>
        </div>
        <button style={sx.refreshBtn} onClick={() => load(true)} disabled={refreshing} title="Refresh status">
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
        <span style={{ ...sx.statusBadge, color: statusColor, background: statusColor+'22' }}>{order.status}</span>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ padding: '0 16px' }}>
        {/* Order code + QR — same panel shown right after checkout, so a customer
            revisiting from order history can still pull up the code to pay at
            the counter or collect their order */}
        <div style={sx.section}>
          <OrderCodePanel order={order} />
        </div>

        {/* Confirmed → Preparing → Ready → Served — same track shown right
            after checkout */}
        <div style={sx.section}>
          <OrderProgressTrack status={order.status} />
        </div>

        <div style={sx.section}>
          <div style={sx.sectionTitle}>Items</div>
          <div style={sx.card}>
            {(order.items || []).map((it, i) => (
              <div key={it.id || i} style={sx.itemRow}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13.5 }}>{it.itemName}</div>
                  <div style={{ fontSize:12, color:'#9CA3AF' }}>Qty {it.quantity} · ₹{it.unitPrice}</div>
                </div>
                <div style={{ fontWeight:700, fontSize:13.5 }}>₹{it.totalPrice}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={sx.section}>
          <div style={sx.sectionTitle}>Bill Summary</div>
          <div style={sx.card}>
            <div style={sx.billRow}><span>Subtotal</span><span>₹{order.subtotal}</span></div>
            <div style={sx.billRow}><span>Tax</span><span>₹{order.tax}</span></div>
            <div style={{ ...sx.billRow, fontWeight:800, fontSize:14.5, borderTop:'1px solid #F0F0F0', paddingTop:8, marginTop:4 }}>
              <span>Total</span><span>₹{order.totalAmount}</span>
            </div>
          </div>
        </div>

        <button style={sx.menuLink} onClick={() => navigate(`/menu/${order.shopId}`)}>
          <span>View shop menu</span>
          <ChevronRight size={16} color="#9CA3AF" />
        </button>

        {order.status === 'COMPLETED' && (
          myReview ? (
            <div style={sx.ratedBanner}>
              Thanks for your feedback — you rated this order {'★'.repeat(myReview.rating)}{'☆'.repeat(5 - myReview.rating)}
            </div>
          ) : (
            <button style={sx.rateBtn} onClick={() => setRateOpen(true)}>
              <Star size={15} /> Rate this order
            </button>
          )
        )}
      </div>

      {rateOpen && (
        <div style={sx.backdrop} onClick={() => setRateOpen(false)}>
          <div style={sx.sheet} onClick={e => e.stopPropagation()}>
            <div style={sx.sheetTitle}>Rate your order</div>
            <div style={sx.starRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} style={sx.starBtn} onClick={() => setRating(n)}>
                  <Star size={30} color="#F59E0B" fill={n <= rating ? '#F59E0B' : 'none'} />
                </button>
              ))}
            </div>
            <textarea
              style={sx.commentInput}
              placeholder="Tell us more (optional)…"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
            {!!submitError && <div style={sx.errorTxt}>{submitError}</div>}
            <button style={sx.submitBtn} onClick={submitReview} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit rating'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const sx = {
  center: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', textAlign:'center', padding:'0 30px' },
  header: { display:'flex', alignItems:'center', gap:10, padding:'0 16px', marginBottom:16 },
  backBtn: { background:'#F9FAFB', border:'1px solid #F0F0F0', borderRadius:10, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 },
  refreshBtn: { marginLeft:'auto', background:'#F9FAFB', border:'1px solid #F0F0F0', borderRadius:10, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, color:'#374151' },
  title: { fontSize:16, fontWeight:800, margin:0 },
  statusBadge: { fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:99, flexShrink:0 },
  section: { marginBottom:16 },
  sectionTitle: { fontSize:13, fontWeight:700, color:'#374151', marginBottom:8, textTransform:'uppercase', letterSpacing:.3 },
  card: { background:'#fff', border:'1px solid #F0F0F0', borderRadius:14, padding:'12px 14px' },
  itemRow: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F9FAFB' },
  billRow: { display:'flex', justifyContent:'space-between', fontSize:13, color:'#374151', padding:'2px 0' },
  menuLink: { display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', background:'#fff', border:'1px solid #F0F0F0', borderRadius:12, padding:'12px 14px', fontSize:13.5, fontWeight:600, color:'#374151', cursor:'pointer', marginBottom:24 },
  rateBtn: { display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', background:'#111827', border:'none', borderRadius:12, padding:'13px 14px', fontSize:13.5, fontWeight:700, color:'#fff', cursor:'pointer', marginBottom:24 },
  ratedBanner: { background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:12, padding:'12px 14px', fontSize:13, fontWeight:600, color:'#166534', textAlign:'center', marginBottom:24 },
  backdrop: { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:1000 },
  sheet: { width:'100%', maxWidth:480, background:'#fff', borderTopLeftRadius:20, borderTopRightRadius:20, padding:20, paddingBottom:28 },
  sheetTitle: { fontSize:16, fontWeight:800, textAlign:'center', marginBottom:16 },
  starRow: { display:'flex', justifyContent:'center', gap:8, marginBottom:16 },
  starBtn: { background:'none', border:'none', cursor:'pointer', padding:4, display:'flex' },
  commentInput: { width:'100%', minHeight:80, border:'1px solid #E5E7EB', borderRadius:10, padding:12, fontSize:13, fontFamily:'inherit', color:'#111827', boxSizing:'border-box', resize:'vertical', marginBottom:12 },
  errorTxt: { fontSize:12, color:'#DC2626', marginBottom:12 },
  submitBtn: { width:'100%', background:'#111827', border:'none', borderRadius:10, padding:'13px 14px', fontSize:13.5, fontWeight:700, color:'#fff', cursor:'pointer' },
};
