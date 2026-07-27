import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QrCode, Search, Star, MapPin, Clock, X, PackageSearch } from 'lucide-react';
import { shopApi } from '../../api/index.js';
import { getRecentSearches, addRecentSearch, removeRecentSearch } from '../../utils/recentSearches.js';

// Shown only when the customer has no "current context" yet (hasn't scanned any
// QR this session) — the shell's Home tab otherwise redirects straight to the
// restaurant/hotel/mall they last scanned into. Leads with "Scan a QR to get
// started" (in-browser camera scanner at /portal/scan), backed by a search box
// (with recent-search history) and a nearby-shops list.
export default function PortalHome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | granted | denied
  const [shops, setShops] = useState([]);
  const [sort, setSort] = useState('distance'); // distance | rating
  const [coords, setCoords] = useState(null);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [recent, setRecent] = useState(getRecentSearches());
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchParams.get('focusSearch') === '1') searchInputRef.current?.focus();
  }, [searchParams]);

  useEffect(() => {
    if (!('geolocation' in navigator)) { setStatus('denied'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStatus('granted'); },
      () => setStatus('denied'),
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (status !== 'granted' || !coords) return;
    shopApi.nearby(coords.lat, coords.lng, 10, sort === 'distance' ? undefined : sort)
      .then(res => setShops(res.data.data || []))
      .catch(() => setShops([]));
  }, [status, coords, sort]);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      const q = search.trim();
      shopApi.list({ search: q })
        .then(res => {
          setSearchResults(res.data.data?.content || res.data.data || []);
          setRecent(addRecentSearch(q));
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const runRecentSearch = (term) => { setSearch(term); searchInputRef.current?.focus(); };
  const onDeleteRecent = (term, e) => { e.stopPropagation(); setRecent(removeRecentSearch(term)); };

  const showingRecents = searchFocused && !search.trim();
  const showingResults = !!search.trim();

  if (status === 'loading') {
    return (
      <div style={sx.center}>
        <p style={{ fontSize: 13.5, color: '#6B7280' }}>Finding restaurants near you…</p>
      </div>
    );
  }

  return (
    <div style={sx.page}>
      <div style={sx.header}>
        <button style={sx.scanBanner} onClick={() => navigate('/portal/scan')}>
          <div style={sx.scanIconWrap}><QrCode size={22} color="#1D9E75" /></div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={sx.scanTitle}>Scan a QR to get started</div>
            <div style={sx.scanSub}>Point your camera at a table or menu code</div>
          </div>
          <span style={sx.scanArrow}>›</span>
        </button>

        <button style={sx.trackLink} onClick={() => navigate('/track-order')}>
          <PackageSearch size={14} /> Track an order
        </button>

        <div style={sx.searchBox}>
          <Search size={16} color="#9CA3AF" />
          <input
            ref={searchInputRef}
            style={sx.searchInput}
            placeholder="Search restaurants…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
          />
          {searching && <span style={{ fontSize: 12, color: '#9CA3AF' }}>Searching…</span>}
        </div>

        {status === 'granted' && !showingRecents && !showingResults && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {[['distance', '📍 Nearest'], ['rating', '⭐ Top rated']].map(([key, label]) => (
              <button key={key} style={{ ...sx.sortChip, ...(sort === key ? sx.sortChipActive : {}) }} onClick={() => setSort(key)}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {showingRecents ? (
        <div style={{ padding: '4px 16px 40px' }}>
          {recent.length > 0 && <div style={sx.sectionTitle}>Recent searches</div>}
          {recent.length === 0 ? (
            <p style={{ fontSize: 13.5, color: '#6B7280', marginTop: 20 }}>No recent searches yet.</p>
          ) : recent.map(term => (
            <button key={term} style={sx.recentRow} onMouseDown={() => runRecentSearch(term)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={15} color="#9CA3AF" />
                <span style={{ fontSize: 14, color: '#111827' }}>{term}</span>
              </span>
              <span onMouseDown={e => onDeleteRecent(term, e)} style={sx.recentRemove}><X size={14} /></span>
            </button>
          ))}
        </div>
      ) : showingResults ? (
        <div style={{ padding: '0 16px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {searchResults.length === 0 && !searching && (
            <p style={{ fontSize: 13.5, color: '#6B7280', marginTop: 20 }}>No restaurants found for "{search.trim()}".</p>
          )}
          {searchResults.map(s => <ShopCard key={s.id} shop={s} onClick={() => navigate(`/menu/${s.id}`)} />)}
        </div>
      ) : status === 'denied' ? (
        <div style={sx.center}>
          <p style={{ fontSize: 13.5, color: '#6B7280' }}>We couldn't access your location — search above or scan a QR code.</p>
        </div>
      ) : shops.length === 0 ? (
        <div style={sx.center}>
          <p style={{ fontSize: 13.5, color: '#6B7280' }}>No restaurants found within 10km. Try scanning a QR code instead.</p>
        </div>
      ) : (
        <div style={{ padding: '0 16px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shops.map(s => <ShopCard key={s.id} shop={s} onClick={() => navigate(`/menu/${s.id}`)} />)}
        </div>
      )}
    </div>
  );
}

function ShopCard({ shop, onClick }) {
  return (
    <button style={sx.card} onClick={onClick}>
      <div style={sx.cardEmojiWrap}>🍽</div>
      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{shop.name}</div>
        {!!shop.tagline && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{shop.tagline}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
          {shop.rating != null && (
            <span style={sx.metaChip}><Star size={11} style={{ marginRight: 3 }} />{Number(shop.rating).toFixed(1)} ({shop.ratingCount || 0})</span>
          )}
          {shop.distanceKm != null && (
            <span style={sx.metaChip}><MapPin size={11} style={{ marginRight: 3 }} />{shop.distanceKm < 1 ? `${Math.round(shop.distanceKm * 1000)}m` : `${shop.distanceKm.toFixed(1)}km`}</span>
          )}
          {!!shop.city && <span style={sx.metaChip}>{shop.city}</span>}
        </div>
      </div>
    </button>
  );
}

const sx = {
  page: { paddingTop: 0 },
  header: { padding: '16px 16px 12px', borderBottom: '1px solid #F0F0F0' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', textAlign: 'center', padding: '0 30px' },
  scanBanner: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: '#E1F5EE', border: 'none', borderRadius: 14, padding: 12, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 },
  scanIconWrap: { width: 44, height: 44, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  scanTitle: { fontSize: 15, fontWeight: 800, color: '#0F6E56' },
  scanSub: { fontSize: 11.5, color: '#4B5563', marginTop: 2 },
  scanArrow: { fontSize: 22, color: '#0F6E56', fontWeight: 700 },
  trackLink: { display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#4B5563', fontSize: 12.5, fontWeight: 600, padding: '0 2px 10px', cursor: 'pointer', fontFamily: 'inherit' },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#F3F4F6', borderRadius: 99, padding: '0 14px', height: 42 },
  searchInput: { flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit' },
  sortChip: { padding: '0 12px', height: 32, borderRadius: 99, background: '#F3F4F6', border: '1.5px solid transparent', fontSize: 12.5, fontWeight: 600, color: '#4B5563', cursor: 'pointer', fontFamily: 'inherit' },
  sortChipActive: { background: '#E1F5EE', borderColor: '#1D9E75', color: '#065F46' },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#6B7280', padding: '16px 0 4px' },
  recentRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #F0F0F0', padding: '12px 0', cursor: 'pointer', fontFamily: 'inherit' },
  recentRemove: { display: 'flex', color: '#9CA3AF', padding: 4 },
  card: { display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #F0F0F0', borderRadius: 14, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,.04)', cursor: 'pointer', width: '100%', fontFamily: 'inherit', textAlign: 'left' },
  cardEmojiWrap: { width: 52, height: 52, borderRadius: 12, background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 },
  metaChip: { display: 'inline-flex', alignItems: 'center', fontSize: 11.5, color: '#6B7280', fontWeight: 600 },
};
