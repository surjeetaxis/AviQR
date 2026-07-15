import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loyaltyApi, favoritesApi, authApi, customerApi } from '../../api/index.js';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';
import { getCustomerContext } from '../../context/customerContext.js';
import CustomerLoginSheet from '../../components/customer/CustomerLoginSheet.jsx';
import { User, Gift, Heart, LogOut, LogIn, Star, Pencil, X, Package, MapPin, ChevronRight } from 'lucide-react';
import '../customer/CustomerMenu.css';

const LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'hi', label: 'Hindi' }, { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' }, { code: 'kn', label: 'Kannada' }, { code: 'ml', label: 'Malayalam' },
  { code: 'bn', label: 'Bengali' },
];

// Profile + Rewards + Favorites all live here rather than as separate bottom-nav
// tabs (the spec's 8-item nav collapses to 5 in the bar — see CustomerPortalShell).
// Rewards is honestly scoped to the shop the customer is currently in — loyalty
// is tracked per-shop in the real backend, not as a cross-shop point wallet.
export default function PortalProfile() {
  const navigate = useNavigate();
  const { customer, isLoggedIn, authHeader, logout, updateProfile } = useCustomerAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [loyalty, setLoyalty] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loadingFav, setLoadingFav] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', preferredLanguage: 'en', birthday: '', anniversary: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [editError, setEditError] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

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

  const openEdit = () => {
    setEditForm({ name: customer.name || '', preferredLanguage: customer.preferredLanguage || 'en', birthday: '', anniversary: '' });
    setEditError('');
    setShowEdit(true);
    if (currentShopId) {
      customerApi.getProfile(currentShopId, customer.phone, authHeader)
        .then(res => {
          const p = res.data.data;
          setEditForm(f => ({ ...f, birthday: p.birthday || '', anniversary: p.anniversary || '' }));
        })
        .catch(() => {});
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setEditError(''); setSavingProfile(true);
    try {
      await updateProfile({ name: editForm.name, preferredLanguage: editForm.preferredLanguage });
      if (currentShopId) {
        await customerApi.updateProfile(currentShopId, {
          phone: customer.phone,
          name: editForm.name,
          birthday: editForm.birthday || null,
          anniversary: editForm.anniversary || null,
        }, authHeader).catch(() => {});
      }
      setShowEdit(false);
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Could not save changes');
    } finally { setSavingProfile(false); }
  };

  const confirmedDeactivate = async () => {
    setDeactivating(true);
    try {
      await authApi.deactivateAccount(authHeader);
      logout();
      navigate('/');
    } catch {
      setDeactivating(false);
    }
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
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:15 }}>{customer.name === 'Guest' ? 'Guest' : customer.name}</div>
          <div style={{ fontSize:12.5, color:'#6B7280' }}>{customer.phone}</div>
        </div>
        <button style={sx.editIconBtn} onClick={openEdit} aria-label="Edit profile"><Pencil size={15} color="#6B7280" /></button>
      </div>

      {/* Account */}
      <div style={sx.section}>
        <div style={sx.sectionTitle}>Account</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <button style={sx.navRow} onClick={() => navigate('/portal/orders')}>
            <Package size={16} color="#6B7280" />
            <span style={sx.navRowText}>Order History</span>
            <ChevronRight size={16} color="#9CA3AF" />
          </button>
          <button style={sx.navRow} onClick={() => navigate('/portal/profile/addresses')}>
            <MapPin size={16} color="#6B7280" />
            <span style={sx.navRowText}>Saved Addresses</span>
            <ChevronRight size={16} color="#9CA3AF" />
          </button>
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

      {confirmDeactivate ? (
        <div style={sx.deactivateConfirm}>
          <p style={{ fontSize:12.5, color:'#374151', margin:'0 0 10px' }}>Deactivate your account? You'll be signed out and this can't be undone from here.</p>
          <div style={{ display:'flex', gap:8 }}>
            <button style={sx.cancelBtn} onClick={() => setConfirmDeactivate(false)} disabled={deactivating}>Cancel</button>
            <button style={sx.confirmDeactivateBtn} onClick={confirmedDeactivate} disabled={deactivating}>
              {deactivating ? 'Deactivating…' : 'Deactivate'}
            </button>
          </div>
        </div>
      ) : (
        <button style={sx.deactivateLink} onClick={() => setConfirmDeactivate(true)}>Deactivate account</button>
      )}

      {showEdit && (
        <div className="cm-backdrop" onClick={() => setShowEdit(false)}>
          <div className="cm-sheet" onClick={e => e.stopPropagation()}>
            <div className="cm-sheet-handle" />
            <div className="cm-sheet-header">
              <h2 className="cm-sheet-title">Edit Profile</h2>
              <button className="cm-sheet-close" onClick={() => setShowEdit(false)}><X size={18} /></button>
            </div>
            <form className="cm-checkout-form" onSubmit={submitEdit}>
              <div className="cm-field">
                <label>Name</label>
                <input type="text" value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div className="cm-field">
                <label>Preferred language</label>
                <select value={editForm.preferredLanguage}
                  onChange={e => setEditForm(f => ({ ...f, preferredLanguage: e.target.value }))}
                  style={sx.langSelect}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
              {currentShopId && (
                <>
                  <div className="cm-field">
                    <label>Birthday</label>
                    <input type="date" value={editForm.birthday}
                      onChange={e => setEditForm(f => ({ ...f, birthday: e.target.value }))} />
                  </div>
                  <div className="cm-field">
                    <label>Anniversary</label>
                    <input type="date" value={editForm.anniversary}
                      onChange={e => setEditForm(f => ({ ...f, anniversary: e.target.value }))} />
                  </div>
                  <p style={{ fontSize:11, color:'#9CA3AF', margin:'-6px 0 10px' }}>Saved for this restaurant — we'll remember it for birthday offers here.</p>
                </>
              )}
              {editError && <div style={{color:'#DC2626',fontSize:12.5,marginBottom:8}}>{editError}</div>}
              <button className="cm-proceed-btn" type="submit" disabled={savingProfile || !editForm.name.trim()}>
                {savingProfile ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>
        </div>
      )}
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
  logoutBtn: { display:'flex', alignItems:'center', gap:8, justifyContent:'center', width:'calc(100% - 32px)', margin:'8px 16px 8px', padding:'12px', background:'#fff', border:'1px solid #F0F0F0', borderRadius:12, color:'#DC2626', fontWeight:700, fontSize:13.5, cursor:'pointer' },
  editIconBtn: { background:'#F9FAFB', border:'1px solid #F0F0F0', borderRadius:10, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' },
  navRow: { display:'flex', alignItems:'center', gap:10, background:'#fff', border:'1px solid #F0F0F0', borderRadius:12, padding:'12px', cursor:'pointer', width:'100%', fontFamily:'inherit' },
  navRowText: { flex:1, textAlign:'left', fontSize:13.5, fontWeight:600, color:'#374151' },
  langSelect: { width:'100%', height:46, border:'1.5px solid #E5E7EB', borderRadius:12, background:'#FAFAFA', padding:'0 12px', fontSize:14, fontFamily:'inherit' },
  deactivateLink: { display:'block', margin:'0 16px 24px', background:'none', border:'none', color:'#9CA3AF', fontSize:12.5, textDecoration:'underline', cursor:'pointer', textAlign:'center', width:'calc(100% - 32px)' },
  deactivateConfirm: { margin:'0 16px 24px', padding:'14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:12 },
  cancelBtn: { flex:1, padding:'10px', background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, color:'#374151', fontWeight:700, fontSize:13, cursor:'pointer' },
  confirmDeactivateBtn: { flex:1, padding:'10px', background:'#DC2626', border:'none', borderRadius:10, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' },
};