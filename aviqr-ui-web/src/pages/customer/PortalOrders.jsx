import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderApi } from '../../api/index.js';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';
import { Package, ChevronRight, LogIn } from 'lucide-react';

const STATUS_COLOR = { NEW:'#f59e0b', ACCEPTED:'#3b82f6', PREPARING:'#3b82f6', READY:'#10b981', COMPLETED:'#6b7280', CANCELLED:'#ef4444', REJECTED:'#ef4444' };

// Real order history — wires the backend's already-built (but previously
// orphaned) GET /api/v1/orders/customer/history, keyed by the customer's own
// login (X-User-Id from their phone+OTP token), across every shop they've
// ordered from.
export default function PortalOrders() {
  const navigate = useNavigate();
  const { isLoggedIn, authHeader } = useCustomerAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    orderApi.getHistory({ page: 0, size: 20 }, authHeader)
      .then(res => setOrders(res.data.data?.content || res.data.data || []))
      .catch(() => setError('Could not load your orders.'))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div style={sx.center}>
        <LogIn size={28} color="#9CA3AF" />
        <p style={{ fontSize:13.5, color:'#6B7280', marginTop:10 }}>Log in from your cart or checkout to see your orders here.</p>
      </div>
    );
  }

  if (loading) return <div style={sx.center}><p style={{fontSize:13,color:'#9CA3AF'}}>Loading orders…</p></div>;
  if (error) return <div style={sx.center}><p style={{fontSize:13,color:'#DC2626'}}>{error}</p></div>;

  return (
    <div style={sx.page}>
      <div style={sx.header}>
        <h1 style={{ fontSize:18, fontWeight:800, margin:0 }}>My Orders</h1>
      </div>
      {orders.length === 0 ? (
        <div style={sx.center}>
          <Package size={28} color="#9CA3AF" />
          <p style={{ fontSize:13.5, color:'#6B7280', marginTop:10 }}>No orders yet.</p>
        </div>
      ) : (
        <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {orders.map(o => (
            <button key={o.id} style={sx.card} onClick={() => navigate(`/portal/orders/${o.id}`)}>
              <div style={{ flex:1, textAlign:'left' }}>
                <div style={{ fontWeight:700, fontSize:14 }}>#{o.orderNumber || o.id?.slice(0,8)}</div>
                <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>
                  {(o.items || []).length} item{(o.items||[]).length !== 1 ? 's' : ''} · ₹{o.totalAmount}
                </div>
                <div style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>
                  {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}
                </div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, color: STATUS_COLOR[o.status] || '#6b7280', background:(STATUS_COLOR[o.status]||'#6b7280')+'22', padding:'4px 10px', borderRadius:99 }}>{o.status}</span>
              <ChevronRight size={16} color="#9CA3AF" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const sx = {
  page: { paddingTop: 8 },
  header: { padding: '10px 16px 14px' },
  center: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', textAlign:'center', padding:'0 30px' },
  card: { display:'flex', alignItems:'center', gap:10, background:'#fff', border:'1px solid #F0F0F0', borderRadius:14, padding:'12px 14px', boxShadow:'0 1px 3px rgba(0,0,0,.04)', cursor:'pointer', width:'100%', fontFamily:'inherit' },
};