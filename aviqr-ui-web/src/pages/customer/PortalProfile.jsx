import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loyaltyApi, favoritesApi } from '../../api/index.js';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';
import { getCustomerContext } from '../../context/customerContext.js';
import CustomerLoginSheet from '../../components/customer/CustomerLoginSheet.jsx';
import { User, Gift, Heart, LogOut, LogIn, Star } from 'lucide-react';

// Profile + Rewards + Favorites all live here rather than as separate bottom-nav
// tabs (the spec's 8-item nav collapses to 5 in the bar — see CustomerPortalShell).
// Rewards is honestly scoped to the shop the customer is currently in — loyalty
// is tracked per-shop in the real backend, not as a cross-shop point wallet.
export default function PortalProfile() {
  const navigate = useNavigate();
  const { customer, isLoggedIn, authHeader, logout } = useCustomerAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [loyalty, setLoyalty] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loadingFav, setLoadingFav] = useState(true);

  const ctx = getCustomerContext();
  const currentShopId = ctx?.type === 'shop' ? ctx.id : null;

  useEffect(() => {
    if (!isLoggedIn) { setLoadingFav(false); return; }
    favoritesApi.mine(customer.phone, authHeader)
      .then(res => setFavorites(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingFav(false));
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !currentShopId) return;
    loyaltyApi.getBalance(currentShopId, customer.phone, authHeader)
      .then(res => setLoyalty(res.data.data))
      .catch(() => {});
  }, [isLoggedIn, currentShopId]);

  const toggleFavorite = (shopId) => {
    favoritesApi.toggle(customer.phone, shopId, authHeader)
      .then(() => setFavorites(prev => prev.filter(f => f.shopId !== shopId)))
      .catch(() => {});
  };

  if (!isLoggedIn) {
    return (
      <div style={sx.center}>
        <LogIn size={28} color="#9CA3AF" />
        <p style={{ fontSize:13.5, color:'#6B7280', margin:'10px 0 16px' }}>Log in to see your profile, rewards, and favorites.</p>
        <button style={sx.loginBtn} onClick={() => setShowLogin(true)}>Log in</button>
        {showLogin && <CustomerLoginSheet onClose={() => setShowLogin(false)} onLoggedIn={() => setShowLogin(false)} />}
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Identity */}
      <div style={sx.identityCard}>
        <div style={sx.avatar}><User size={22} color="#1D9E75" /></div>
        <div>
          <div style={{ fontWeight:800, fontSize:15 }}>{customer.name === 'Guest' ? 'Guest' : customer.name}</div>
          <div style={{ fontSize:12.5, color:'#6B7280' }}>{customer.phone}</div>
        </div>
      </div>

      {/* Rewards */}
      <div style={sx.section}>
        <div style={sx.sectionTitle}><Gift size={14} /> Rewards</div>
        {!currentShopId ? (
          <p style={sx.emptyHint}>Visit a restaurant to see your rewards there — loyalty points are tracked per restaurant, not as a single wallet.</p>
        ) : loyalty ? (
          <div style={sx.rewardCard}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Star size={16} color="#D97706" />
              <span style={{ fontWeight:800, fontSize:18 }}>{loyalty.totalPoints ?? loyalty.balance ?? 0}</span>
              <span style={{ fontSize:12, color:'#6B7280' }}>points at this restaurant</span>
            </div>
          </div>
        ) : (
          <p style={sx.emptyHint}>Loading…</p>
        )}
      </div>

      {/* Favorites */}
      <div style={sx.section}>
        <div style={sx.sectionTitle}><Heart size={14} /> Favorites</div>
        {loadingFav ? (
          <p style={sx.emptyHint}>Loading…</p>
        ) : favorites.length === 0 ? (
          <p style={sx.emptyHint}>No favorites yet — tap the heart on a restaurant to save it here.</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {favorites.map(f => (
              <div key={f.shopId} style={sx.favRow}>
                <button style={sx.favName} onClick={() => navigate(`/menu/${f.shopId}`)}>
                  <div style={{ fontWeight:700, fontSize:13.5 }}>{f.shopName}</div>
                  {f.city && <div style={{ fontSize:11.5, color:'#9CA3AF' }}>{f.city}</div>}
                </button>
                <button style={sx.unfavBtn} onClick={() => toggleFavorite(f.shopId)}>
                  <Heart size={16} fill="#DC2626" stroke="#DC2626" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button style={sx.logoutBtn} onClick={logout}><LogOut size={14} /> Sign out</button>
    </div>
  );
}

const sx = {
  center: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', textAlign:'center', padding:'0 30px' },
  loginBtn: { background:'#1D9E75', color:'#fff', border:'none', borderRadius:12, padding:'12px 28px', fontWeight:700, fontSize:14, cursor:'pointer' },
  identityCard: { display:'flex', alignItems:'center', gap:12, padding:'14px 16px', margin:'0 16px 8px', background:'#fff', border:'1px solid #F0F0F0', borderRadius:14 },
  avatar: { width:44, height:44, borderRadius:12, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center' },
  section: { padding:'14px 16px' },
  sectionTitle: { display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700, color:'#374151', marginBottom:8, textTransform:'uppercase', letterSpacing:.3 },
  emptyHint: { fontSize:12.5, color:'#9CA3AF', margin:0 },
  rewardCard: { background:'#fff', border:'1px solid #F0F0F0', borderRadius:14, padding:'14px 16px' },
  favRow: { display:'flex', alignItems:'center', gap:10, background:'#fff', border:'1px solid #F0F0F0', borderRadius:12, padding:'10px 12px' },
  favName: { flex:1, textAlign:'left', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit' },
  unfavBtn: { background:'none', border:'none', cursor:'pointer', padding:4 },
  logoutBtn: { display:'flex', alignItems:'center', gap:8, justifyContent:'center', width:'calc(100% - 32px)', margin:'8px 16px 24px', padding:'12px', background:'#fff', border:'1px solid #F0F0F0', borderRadius:12, color:'#DC2626', fontWeight:700, fontSize:13.5, cursor:'pointer' },
};