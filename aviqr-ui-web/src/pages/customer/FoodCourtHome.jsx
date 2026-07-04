import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { mallApi } from '../../api/index.js';
import { setCustomerContext } from '../../context/customerContext.js';
import { UtensilsCrossed, MapPin, Loader2, Store, Search, X } from 'lucide-react';

// Food Court QR Flow: customer scans one Food Court QR → lands here → picks a
// restaurant → goes straight to that restaurant's own menu/cart/checkout
// (CustomerMenu.jsx, unchanged), which orders directly against that shop —
// the mall is never involved in the order.
export default function FoodCourtHome() {
  const { mallId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mall, setMall]       = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');

  const load = useCallback(async () => {
    try {
      const [mallRes, vendorsRes] = await Promise.all([
        mallApi.getPublicMall(mallId),
        mallApi.getPublicVendors(mallId),
      ]);
      setMall(mallRes.data.data);
      setVendors(vendorsRes.data.data || []);
      setCustomerContext('mall', mallId, mallRes.data.data?.name);
    } catch (e) {
      setError('Could not load this food court. Please check the QR code and try again.');
    } finally { setLoading(false); }
  }, [mallId]);

  useEffect(() => { load(); }, [load]);

  // Deep link from the shell: /food-court/:id?focusSearch=1
  useEffect(() => {
    if (searchParams.get('focusSearch') === '1') {
      setTimeout(() => document.querySelector('.fc-search-input')?.focus(), 300);
    }
  }, [searchParams]);

  const filteredVendors = search
    ? vendors.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || (v.category || '').toLowerCase().includes(search.toLowerCase()))
    : vendors;

  if (loading) return (
    <div style={sx.center}>
      <Loader2 size={30} className="spin" style={{ color:'#1D9E75' }} />
      <p style={{ color:'#6B7280', fontSize:14, marginTop:12 }}>Loading food court…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>
    </div>
  );

  if (error || !mall) return (
    <div style={sx.center}>
      <div style={{ fontSize:40 }}>🍽️</div>
      <p style={{ color:'#DC2626', fontSize:14, marginTop:12, textAlign:'center', padding:'0 30px' }}>{error || 'Food court not found.'}</p>
    </div>
  );

  return (
    <div style={sx.page}>
      <div style={sx.header}>
        <div style={{ fontSize:12, opacity:0.85, letterSpacing:0.5 }}>FOOD COURT</div>
        <div style={{ fontSize:22, fontWeight:800, marginTop:2 }}>{mall.name}</div>
        {mall.city && <div style={{ fontSize:13, opacity:0.9, marginTop:4 }}>{mall.city}</div>}
      </div>

      <div style={sx.body}>
        <div style={sx.searchWrap}>
          <Search size={14} color="#9CA3AF" />
          <input
            className="fc-search-input"
            style={sx.searchInput}
            placeholder="Search restaurant or cuisine…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button style={sx.searchClear} onClick={() => setSearch('')}><X size={13} /></button>}
        </div>

        <div style={{ fontSize:13, color:'#6B7280', fontWeight:600, margin:'12px 0' }}>
          {filteredVendors.length} restaurant{filteredVendors.length !== 1 ? 's' : ''} · tap one to view its menu
        </div>

        {filteredVendors.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'#9CA3AF' }}>
            <Store size={32} />
            <p style={{ marginTop:10, fontSize:13 }}>{search ? 'No restaurants match your search.' : 'No restaurants are open here yet.'}</p>
          </div>
        ) : (
          <div style={sx.grid}>
            {filteredVendors.map(v => (
              <button
                key={v.id}
                style={v.shopId ? sx.vendorCard : { ...sx.vendorCard, opacity:0.5, cursor:'default' }}
                disabled={!v.shopId}
                onClick={() => v.shopId && navigate(`/menu/${v.shopId}`)}
              >
                <div style={sx.vendorIcon}><UtensilsCrossed size={20} color="#1D9E75" /></div>
                <div style={{ fontWeight:700, fontSize:14, color:'#111827' }}>{v.name}</div>
                {v.category && <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>{v.category}</div>}
                {v.floor && <div style={sx.floorTag}><MapPin size={11} /> {v.floor}</div>}
                {!v.shopId && <div style={{ fontSize:11, color:'#9CA3AF', marginTop:8 }}>Menu unavailable</div>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const sx = {
  page:{ maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'#F9FAFB', fontFamily:'system-ui,-apple-system,sans-serif' },
  center:{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh' },
  header:{ background:'linear-gradient(135deg,#1D9E75,#178A65)', color:'#fff', padding:'28px 22px 20px' },
  body:{ padding:'18px 16px 40px' },
  grid:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  searchWrap:{ display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'10px 12px' },
  searchInput:{ flex:1, border:'none', outline:'none', fontSize:13.5, fontFamily:'inherit', background:'transparent' },
  searchClear:{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:0, display:'flex' },
  vendorCard:{ background:'#fff', border:'1px solid #F0F0F0', borderRadius:16, padding:'16px 14px', textAlign:'left', cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' },
  vendorIcon:{ width:44, height:44, borderRadius:12, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 },
  floorTag:{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'#9CA3AF', marginTop:8 },
};
