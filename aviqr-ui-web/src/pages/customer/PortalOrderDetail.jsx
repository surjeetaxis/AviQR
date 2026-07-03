import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderApi } from '../../api/index.js';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';
import { ArrowLeft, ChevronRight } from 'lucide-react';

const STATUS_COLOR = { NEW:'#f59e0b', ACCEPTED:'#3b82f6', PREPARING:'#3b82f6', READY:'#10b981', COMPLETED:'#6b7280', CANCELLED:'#ef4444', REJECTED:'#ef4444' };

export default function PortalOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { authHeader } = useCustomerAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    orderApi.getById(orderId, authHeader)
      .then(res => setOrder(res.data.data))
      .catch(() => setError('Could not load this order.'))
      .finally(() => setLoading(false));
  }, [orderId]);

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
        <span style={{ ...sx.statusBadge, color: statusColor, background: statusColor+'22' }}>{order.status}</span>
      </div>

      <div style={{ padding: '0 16px' }}>
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
      </div>
    </div>
  );
}

const sx = {
  center: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', textAlign:'center', padding:'0 30px' },
  header: { display:'flex', alignItems:'center', gap:10, padding:'0 16px', marginBottom:16 },
  backBtn: { background:'#F9FAFB', border:'1px solid #F0F0F0', borderRadius:10, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 },
  title: { fontSize:16, fontWeight:800, margin:0 },
  statusBadge: { marginLeft:'auto', fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:99, flexShrink:0 },
  section: { marginBottom:16 },
  sectionTitle: { fontSize:13, fontWeight:700, color:'#374151', marginBottom:8, textTransform:'uppercase', letterSpacing:.3 },
  card: { background:'#fff', border:'1px solid #F0F0F0', borderRadius:14, padding:'12px 14px' },
  itemRow: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F9FAFB' },
  billRow: { display:'flex', justifyContent:'space-between', fontSize:13, color:'#374151', padding:'2px 0' },
  menuLink: { display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', background:'#fff', border:'1px solid #F0F0F0', borderRadius:12, padding:'12px 14px', fontSize:13.5, fontWeight:600, color:'#374151', cursor:'pointer', marginBottom:24 },
};
