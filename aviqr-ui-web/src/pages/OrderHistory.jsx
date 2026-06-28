import { useState, useEffect } from 'react';
import { Download, Search, Filter, Bike, ShoppingBag, UtensilsCrossed, FileText, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { invoiceApi } from '../api/index.js';

const TYPE_ICON = { DINE_IN:UtensilsCrossed, TAKEAWAY:ShoppingBag, DELIVERY:Bike };
const TYPE_COLOR= { DINE_IN:'#1D9E75', TAKEAWAY:'#7C3AED', DELIVERY:'#D97706' };
const STATUS_COLOR = { COMPLETED:'#1D9E75', CANCELLED:'#DC2626', REJECTED:'#DC2626', NEW:'#2563EB', PREPARING:'#7C3AED', READY:'#D97706' };

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function OrderHistory() {
  const { user } = useAuth();
  const shopId = user?.shopId;

  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoad]     = useState(true);
  const [error,    setError]    = useState(null);
  const [page,     setPage]     = useState(0);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(0);
  const [search,   setSearch]   = useState('');
  const [typeF,    setType]     = useState('');
  const [statusF,  setStatus]   = useState('');
  const [startDate,setStart]    = useState('');
  const [endDate,  setEnd]      = useState('');

  const load = async (p = 0) => {
    if (!shopId) { setLoad(false); return; }
    setLoad(true);
    try {
      const params = new URLSearchParams({ page:p, size:20 });
      if (typeF)    params.append('type', typeF);
      if (statusF)  params.append('status', statusF);
      if (startDate)params.append('startDate', startDate);
      if (endDate)  params.append('endDate', endDate);
      const res = await fetch(`${API_BASE}/api/v1/reports/shop/${shopId}/history?${params}`, {
        headers:{ Authorization:`Bearer ${localStorage.getItem('aviqr_token')}` }
      });
      const data = await res.json();
      const d = data.data || {};
      setOrders(d.content || []);
      setTotal(d.totalElements || 0);
      setPages(d.totalPages || 0);
      setPage(p);
    } catch (e) { setError('Failed to load order history'); }
    finally { setLoad(false); }
  };

  useEffect(() => { load(0); }, [shopId, typeF, statusF, startDate, endDate]);

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.order_number?.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q) || o.customer_phone?.includes(q);
  });

  const exportCsv = () => {
    const rows = [['Order #','Date','Customer','Phone','Type','Status','Payment','Amount'],
      ...orders.map(o=>[o.order_number,o.created_at?.slice(0,10),o.customer_name,o.customer_phone,o.type,o.status,o.payment_method,o.total_amount])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'}));
    a.download = `order_history_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1 className="page-title">Order History</h1><p className="page-subtitle">{total.toLocaleString('en-IN')} orders in selected range</p></div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => load(0)}><RefreshCw size={14} /></button>
          <button className="btn btn-secondary" onClick={exportCsv}><Download size={14} /> Export</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14, alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)', pointerEvents:'none' }} />
          <input className="field-input" style={{ paddingLeft:32, height:36 }} placeholder="Search order #, customer, phone…" value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <input type="date" className="field-input" style={{ height:36, width:150 }} value={startDate} onChange={e=>setStart(e.target.value)} />
        <input type="date" className="field-input" style={{ height:36, width:150 }} value={endDate} onChange={e=>setEnd(e.target.value)} />
        <select className="field-input" style={{ height:36, width:130 }} value={typeF} onChange={e=>setType(e.target.value)}>
          <option value="">All types</option>
          <option value="DINE_IN">Dine-in</option>
          <option value="TAKEAWAY">Takeaway</option>
          <option value="DELIVERY">Delivery</option>
        </select>
        <select className="field-input" style={{ height:36, width:140 }} value={statusF} onChange={e=>setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="NEW">New</option>
        </select>
      </div>

      {error && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#DC2626', marginBottom:14 }}>⚠ {error}</div>}

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'var(--gray-50)', fontSize:12, fontWeight:600, color:'var(--gray-500)' }}>
              {['Order #','Date','Customer','Phone','Type','Status','Payment','Amount','Invoice'].map(h=>(
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading history…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)', fontSize:13 }}>No orders found for this period</td></tr>
            ) : filtered.map((o,i) => {
              const TypeIcon = TYPE_ICON[o.type] || ShoppingBag;
              const typeColor = TYPE_COLOR[o.type] || '#6B7280';
              return (
                <tr key={i} style={{ borderTop:'1px solid var(--gray-100)' }}>
                  <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:12, fontWeight:600 }}>{o.order_number}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--gray-600)' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>{o.customer_name}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--gray-500)' }}>{o.customer_phone||'—'}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, color:typeColor }}>
                      <TypeIcon size={12}/> {o.type?.replace('_',' ')}
                    </span>
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:999, background:(STATUS_COLOR[o.status]||'#6B7280')+'18', color:STATUS_COLOR[o.status]||'#6B7280' }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--gray-600)' }}>{o.payment_method}</td>
                  <td style={{ padding:'10px 14px', fontWeight:700, fontSize:14 }}>₹{parseFloat(o.total_amount||0).toFixed(0)}</td>
                  <td style={{ padding:'10px 14px' }}>
                    {o.status === 'COMPLETED' && (
                      <button style={{ background:'var(--gray-100)', border:'none', borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', gap:3 }}
                        onClick={() => window.open(invoiceApi.downloadUrl(o.id, {}), '_blank')}>
                        <FileText size={11}/> Invoice
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:16 }}>
          <button className="btn btn-secondary" disabled={page===0} onClick={()=>load(page-1)}>← Prev</button>
          <span style={{ padding:'6px 14px', fontSize:13, color:'var(--gray-600)' }}>Page {page+1} of {pages}</span>
          <button className="btn btn-secondary" disabled={page>=pages-1} onClick={()=>load(page+1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
