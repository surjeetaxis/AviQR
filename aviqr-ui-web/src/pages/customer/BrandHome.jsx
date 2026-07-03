import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { brandApi } from '../../api/index.js';
import { setCustomerContext } from '../../context/customerContext.js';
import { Store, MapPin, Loader2, Search, X } from 'lucide-react';

// Brand QR Flow: customer scans a Supplier's main/brand QR → lands here → picks
// one of the brand's outlets → goes straight to that outlet's own menu/cart/checkout
// (CustomerMenu.jsx, unchanged), which orders directly against that shop —
// mirrors the Mall Food Court flow (FoodCourtHome.jsx) one level up: a brand
// groups shops by ownerId instead of by mallId.
export default function BrandHome() {
  const { brandId } = useParams();
  const navigate = useNavigate();

  const [brand, setBrand]   = useState(null);
  const [shops, setShops]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');

  const load = useCallback(async () => {
    try {
      const [brandRes, shopsRes] = await Promise.all([
        brandApi.getPublicBrand(brandId),
        brandApi.getPublicShops(brandId),
      ]);
      setBrand(brandRes.data.data);
      setShops(shopsRes.data.data || []);
      setCustomerContext('brand', brandId, brandRes.data.data?.name);
    } catch (e) {
      setError('Could not load this brand. Please check the QR code and try again.');
    } finally { setLoading(false); }
  }, [brandId]);

  useEffect(() => { load(); }, [load]);

  const filteredShops = search
    ? shops.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || (s.city || '').toLowerCase().includes(search.toLowerCase()))
    : shops;

  if (loading) return (
    <div style={sx.center}>
      <Loader2 size={30} className="spin" style={{ color:'#1D9E75' }} />
      <p style={{ color:'#6B7280', fontSize:14, marginTop:12 }}>Loading…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>
    </div>
  );

  if (error || !brand) return (
    <div style={sx.center}>
      <div style={{ fontSize:40 }}>🏪</div>
      <p style={{ color:'#DC2626', fontSize:14, marginTop:12, textAlign:'center', padding:'0 30px' }}>{error || 'Brand not found.'}</p>
    </div>
  );

  return (
    <div style={sx.page}>
      <div style={sx.header}>
        <div style={{ fontSize:12, opacity:0.85, letterSpacing:0.5 }}>OUR OUTLETS</div>
        <div style={{ fontSize:22, fontWeight:800, marginTop:2 }}>{brand.name}</div>
        {brand.city && <div style={{ fontSize:13, opacity:0.9, marginTop:4 }}>{brand.city}</div>}
      </div>

      <div style={sx.body}>
        <div style={sx.searchWrap}>
          <Search size={14} color="#9CA3AF" />
          <input
            style={sx.searchInput}
            placeholder="Search outlet or city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button style={sx.searchClear} onClick={() => setSearch('')}><X size={13} /></button>}
        </div>

        <div style={{ fontSize:13, color:'#6B7280', fontWeight:600, margin:'12px 0' }}>
          {filteredShops.length} outlet{filteredShops.length !== 1 ? 's' : ''} · tap one to view its menu
        </div>

        {filteredShops.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'#9CA3AF' }}>
            <Store size={32} />
            <p style={{ marginTop:10, fontSize:13 }}>{search ? 'No outlets match your search.' : 'No outlets are open yet.'}</p>
          </div>
        ) : (
          <div style={sx.grid}>
            {filteredShops.map(s => (
              <button key={s.id} style={sx.shopCard} onClick={() => navigate(`/menu/${s.id}`)}>
                <div style={sx.shopIcon}><Store size={20} color="#1D9E75" /></div>
                <div style={{ fontWeight:700, fontSize:14, color:'#111827' }}>{s.name}</div>
                {s.tagline && <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>{s.tagline}</div>}
                {s.city && <div style={sx.cityTag}><MapPin size={11} /> {s.city}</div>}
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
  shopCard:{ background:'#fff', border:'1px solid #F0F0F0', borderRadius:16, padding:'16px 14px', textAlign:'left', cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' },
  shopIcon:{ width:44, height:44, borderRadius:12, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 },
  cityTag:{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'#9CA3AF', marginTop:8 },
};
