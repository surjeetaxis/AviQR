import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gift, Search, Users, TrendingUp, Plus, RefreshCw,
  Award, Star, Clock, Phone, ChevronRight, Download, Bell, Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { loyaltyApi, orderApi, shopApi } from '../api/index.js';

const TIERS = [
  { name:'Bronze',  min:0,    max:499,   color:'#CD7F32', bg:'#FDF3E7', emoji:'🥉' },
  { name:'Silver',  min:500,  max:1999,  color:'#9CA3AF', bg:'#F9FAFB', emoji:'🥈' },
  { name:'Gold',    min:2000, max:4999,  color:'#D97706', bg:'#FFFBEB', emoji:'🥇' },
  { name:'Platinum',min:5000, max:Infinity, color:'#7C3AED', bg:'#F5F3FF', emoji:'💎' },
];

function getTier(pts) {
  return TIERS.find(t => pts >= t.min && pts < t.max) || TIERS[0];
}

export default function Loyalty() {
  const { user } = useAuth();
  const shopId   = user?.shopId;
  const navigate = useNavigate();

  const [customers,      setCust]    = useState([]);
  const [loading,        setLoad]    = useState(true);
  const [loyaltyEnabled, setEnabled] = useState(null); // null = unknown
  const [error,          setError]   = useState(null);
  const [search,    setSearch]  = useState('');
  const [sortBy,    setSort]    = useState('points'); // points | visits | recent
  const [modal,     setModal]   = useState(null);    // 'earn' | 'redeem' | 'history'
  const [selCust,   setSelCust] = useState(null);
  const [form,      setForm]    = useState({ phone:'', name:'', amount:'' });
  const [balRes,    setBalRes]  = useState(null);
  const [history,   setHistory] = useState([]);
  const [saving,    setSaving]  = useState(false);

  const load = useCallback(async () => {
    if (!shopId) { setLoad(false); return; }
    try {
      const [custRes, settingsRes] = await Promise.allSettled([
        loyaltyApi.getCustomers(shopId),
        shopApi.getSettings(shopId),
      ]);
      if (custRes.status === 'fulfilled') setCust(custRes.value.data.data || []);
      else setError(custRes.reason?.response?.data?.message || 'Failed to load customers');
      if (settingsRes.status === 'fulfilled') {
        const s = settingsRes.value.data.data || {};
        setEnabled(!!s.loyaltyEnabled);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load');
    } finally { setLoad(false); }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const lookupBalance = async (phone) => {
    if (!phone) return;
    try {
      const res = await loyaltyApi.getBalance(shopId, phone);
      setBalRes(res.data.data);
    } catch { setBalRes({ totalPoints:0, phone, customerName:'New customer' }); }
  };

  const openHistory = async (c) => {
    setSelCust(c);
    setModal('history');
    setHistory([]);
    try {
      const res = await loyaltyApi.getHistory(shopId, c.customerPhone);
      setHistory(res.data.data || []);
    } catch {}
  };

  const earn = async () => {
    if (!form.phone || !form.amount) return;
    setSaving(true);
    try {
      const res = await loyaltyApi.earn(shopId, {
        customerPhone: form.phone,
        customerName:  balRes?.customerName || form.name || '',
        orderAmount:   parseFloat(form.amount),
      });
      if (res.data.data === null && res.data.message?.includes('not enabled')) {
        alert('Loyalty is disabled. Go to Settings → Features and enable "Loyalty points" first.');
        setSaving(false); return;
      }
      setModal(null); setForm({ phone:'', amount:'' }); setBalRes(null);
      load();
    } catch (e) { alert(e.response?.data?.message || 'Failed to add points'); }
    finally { setSaving(false); }
  };

  const redeem = async () => {
    if (!form.phone || !form.amount) return;
    setSaving(true);
    try {
      await loyaltyApi.redeem(shopId, { customerPhone:form.phone, pointsToRedeem:parseInt(form.amount) });
      setModal(null); setForm({ phone:'', amount:'' }); setBalRes(null);
      load();
    } catch (e) { alert(e.response?.data?.message || 'Failed to redeem'); }
    finally { setSaving(false); }
  };

  const exportCsv = () => {
    const rows = [['Name','Phone','Points','Tier','Visits'],
      ...customers.map(c => [c.customerName||'', c.customerPhone||'', c.totalPoints||0, getTier(c.totalPoints||0).name, c.visitCount||0])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'}));
    a.download = `loyalty_members_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  // Stats
  const totalPts   = customers.reduce((s,c) => s + (c.totalPoints||0), 0);
  const redeemVal  = Math.floor(totalPts / 100) * 10;
  const tierCounts = TIERS.map(t => ({ ...t, count:customers.filter(c => getTier(c.totalPoints||0).name === t.name).length }));

  // Sort + filter
  const sorted = [...customers]
    .filter(c => !search || c.customerName?.toLowerCase().includes(search.toLowerCase()) || c.customerPhone?.includes(search))
    .sort((a,b) => {
      if (sortBy === 'points')  return (b.totalPoints||0) - (a.totalPoints||0);
      if (sortBy === 'visits')  return (b.visitCount||0)  - (a.visitCount||0);
      return new Date(b.lastVisit||0) - new Date(a.lastVisit||0);
    });

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:300, flexDirection:'column', gap:10 }}>
      <div className="spinner" />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinner{width:28px;height:28px;border:3px solid var(--green);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}`}</style>
    </div>
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1 className="page-title">Loyalty & CRM</h1><p className="page-subtitle">Know your regulars. Reward them. Bring them back.</p></div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn btn-secondary" onClick={exportCsv}><Download size={14} /> Export</button>
          <button className="btn btn-secondary" onClick={() => { setForm({phone:'',name:'',amount:''}); setBalRes(null); setModal('redeem'); }}><Gift size={14} /> Redeem</button>
          <button className="btn btn-primary"   onClick={() => { setForm({phone:'',name:'',amount:''}); setBalRes(null); setModal('earn'); }}><Plus size={14} /> Add points</button>
        </div>
      </div>

      {error && <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#92400E', marginBottom:14 }}>⚠ {error}</div>}

      {/* Loyalty disabled banner */}
      {loyaltyEnabled === false && (
        <div style={{
          display:'flex', alignItems:'center', gap:14,
          background:'linear-gradient(135deg, #1D9E75 0%, #065F46 100%)',
          border:'none', borderRadius:14, padding:'18px 22px', marginBottom:20, color:'#fff',
        }}>
          <div style={{ fontSize:36, flexShrink:0 }}>🎁</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:3 }}>Loyalty Program is Off</div>
            <div style={{ fontSize:13, opacity:.85, lineHeight:1.5 }}>
              Enable loyalty points in Settings to start rewarding your regulars.
              Points are earned on every order and can be redeemed for discounts.
            </div>
          </div>
          <button
            onClick={() => navigate('/settings')}
            style={{
              background:'rgba(255,255,255,.2)', border:'1.5px solid rgba(255,255,255,.4)',
              borderRadius:10, padding:'10px 18px', color:'#fff', fontWeight:700, fontSize:13,
              cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', gap:6,
              whiteSpace:'nowrap',
            }}
          >
            <Settings size={14} /> Enable in Settings
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="kpi-grid" style={{ marginBottom:20 }}>
        <div className="card" style={{ textAlign:'center' }}>
          <Users size={20} style={{ color:'var(--green)', margin:'0 auto 6px' }} />
          <div style={{ fontSize:26, fontWeight:800, color:'var(--gray-900)' }}>{customers.length}</div>
          <div style={{ fontSize:12, color:'var(--gray-500)' }}>Members enrolled</div>
        </div>
        <div className="card" style={{ textAlign:'center' }}>
          <Award size={20} style={{ color:'#7C3AED', margin:'0 auto 6px' }} />
          <div style={{ fontSize:26, fontWeight:800, color:'var(--gray-900)' }}>{totalPts.toLocaleString('en-IN')}</div>
          <div style={{ fontSize:12, color:'var(--gray-500)' }}>Total points issued</div>
        </div>
        <div className="card" style={{ textAlign:'center' }}>
          <Gift size={20} style={{ color:'#D97706', margin:'0 auto 6px' }} />
          <div style={{ fontSize:26, fontWeight:800, color:'var(--gray-900)' }}>₹{redeemVal.toLocaleString('en-IN')}</div>
          <div style={{ fontSize:12, color:'var(--gray-500)' }}>Redeemable (100pts = ₹10)</div>
        </div>
        <div className="card" style={{ textAlign:'center' }}>
          <TrendingUp size={20} style={{ color:'#2563EB', margin:'0 auto 6px' }} />
          <div style={{ fontSize:26, fontWeight:800, color:'var(--gray-900)' }}>
            {customers.length > 0 ? Math.round(totalPts / customers.length) : 0}
          </div>
          <div style={{ fontSize:12, color:'var(--gray-500)' }}>Avg points per member</div>
        </div>
      </div>

      {/* Tier breakdown */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-title" style={{ marginBottom:12 }}>Member Tiers</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {tierCounts.map(t => (
            <div key={t.name} style={{ textAlign:'center', background:t.bg, border:`1px solid ${t.color}33`, borderRadius:10, padding:'12px 8px' }}>
              <div style={{ fontSize:24 }}>{t.emoji}</div>
              <div style={{ fontSize:14, fontWeight:700, color:t.color, marginTop:4 }}>{t.name}</div>
              <div style={{ fontSize:20, fontWeight:800, color:'var(--gray-900)', marginTop:2 }}>{t.count}</div>
              <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:2 }}>{t.min === 0 ? `0–${t.max}` : t.max === Infinity ? `${t.min}+` : `${t.min}–${t.max}`} pts</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search + sort */}
      <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center' }}>
        <div style={{ position:'relative', flex:1 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)', pointerEvents:'none' }} />
          <input className="field-input" style={{ paddingLeft:32, height:38 }} placeholder="Search by name or phone…" value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="field-input" style={{ height:38, width:'auto', minWidth:160 }} value={sortBy} onChange={e=>setSort(e.target.value)}>
          <option value="points">Sort: Most points</option>
          <option value="visits">Sort: Most visits</option>
          <option value="recent">Sort: Recent first</option>
        </select>
      </div>

      {/* Customer list */}
      {sorted.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'48px 0', color:'var(--gray-400)' }}>
          <Gift size={32} style={{ opacity:.3, display:'block', margin:'0 auto 10px' }} />
          <p style={{ fontSize:14, fontWeight:500 }}>{search ? `No members matching "${search}"` : 'No loyalty members yet'}</p>
          <p style={{ fontSize:12, marginTop:4 }}>Points are added automatically when customers order via AviQR QR</p>
          <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => { setForm({phone:'',name:'',amount:''}); setBalRes(null); setModal('earn'); }}>Add first points manually</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {sorted.map((c, i) => {
            const tier = getTier(c.totalPoints || 0);
            const pts  = c.totalPoints || 0;
            const nxtTier = TIERS[TIERS.indexOf(tier) + 1];
            const ptsToNext = nxtTier ? nxtTier.min - pts : 0;
            return (
              <div key={i} className="card" style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px' }}>
                {/* Avatar */}
                <div style={{ width:44, height:44, borderRadius:12, background:tier.bg, border:`2px solid ${tier.color}44`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:18 }}>{tier.emoji}</span>
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:14, fontWeight:700 }}>{c.customerName || 'Customer'}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:tier.color, background:tier.bg, padding:'2px 8px', borderRadius:999 }}>{tier.name}</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2, display:'flex', gap:12 }}>
                    <span><Phone size={10} /> {c.customerPhone}</span>
                    <span><Clock size={10} /> {c.visitCount||0} visits</span>
                    {c.lastVisit && <span>Last: {new Date(c.lastVisit).toLocaleDateString('en-IN')}</span>}
                  </div>
                  {nxtTier && (
                    <div style={{ marginTop:6 }}>
                      <div style={{ height:4, borderRadius:2, background:'var(--gray-100)', overflow:'hidden', maxWidth:200 }}>
                        <div style={{ height:'100%', width:`${Math.min(((pts - tier.min)/(nxtTier.min - tier.min))*100, 100)}%`, background:tier.color, borderRadius:2 }} />
                      </div>
                      <div style={{ fontSize:10, color:'var(--gray-400)', marginTop:2 }}>{ptsToNext} pts to {nxtTier.name}</div>
                    </div>
                  )}
                </div>

                {/* Points */}
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:20, fontWeight:800, color:'#7C3AED' }}>{pts.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize:11, color:'var(--gray-400)' }}>points</div>
                  <div style={{ fontSize:11, color:'#D97706', fontWeight:600, marginTop:2 }}>≈ ₹{Math.floor(pts/100)*10} value</div>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', flexDirection:'column', gap:5, flexShrink:0 }}>
                  <button style={{ background:'var(--green-light)', color:'var(--green-darker)', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:600 }}
                    onClick={() => { setForm({phone:c.customerPhone, name:c.customerName||'', amount:''}); setBalRes({totalPoints:pts, ...c}); setModal('earn'); }}>
                    + Points
                  </button>
                  <button style={{ background:'#EFF6FF', color:'#2563EB', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:600 }}
                    onClick={() => { setForm({phone:c.customerPhone, name:c.customerName||'', amount:''}); setBalRes({totalPoints:pts, ...c}); setModal('redeem'); }}>
                    Redeem
                  </button>
                  <button style={{ background:'#F5F3FF', color:'#7C3AED', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:600 }}
                    onClick={() => openHistory(c)}>
                    History →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Earn / Redeem modal */}
      {(modal === 'earn' || modal === 'redeem') && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:420 }}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>
              {modal==='earn' ? '➕ Add Loyalty Points' : '🎁 Redeem Points'}
            </h2>
            <div className="field" style={{ marginBottom:14 }}>
              <label className="field-label">Customer phone *</label>
              <div style={{ display:'flex', gap:8 }}>
                <input className="field-input" type="tel" value={form.phone}
                  onChange={e => { setForm(f=>({...f,phone:e.target.value})); setBalRes(null); }}
                  placeholder="9900112233" />
                <button className="btn btn-secondary" style={{ flexShrink:0 }} onClick={() => lookupBalance(form.phone)}>Check</button>
              </div>
              {balRes && (
                <div style={{ marginTop:8, background:'#E1F5EE', border:'1px solid #A7F3D0', borderRadius:6, padding:'8px 12px', fontSize:12 }}>
                  <strong>{balRes.customerName || 'Customer'}</strong> — {balRes.totalPoints||0} points
                  {balRes.totalPoints > 0 && ` (≈ ₹${Math.floor((balRes.totalPoints||0)/100)*10} redeemable)`}
                  {balRes.totalPoints === 0 && ' — no loyalty account yet, will be created'}
                </div>
              )}
            </div>
            {modal === 'earn' && !balRes && (
              <div className="field" style={{ marginBottom:14 }}>
                <label className="field-label">Customer name (optional)</label>
                <input className="field-input" value={form.name}
                  onChange={e => setForm(f=>({...f,name:e.target.value}))}
                  placeholder="Rahul Sharma" />
              </div>
            )}
            <div className="field" style={{ marginBottom:20 }}>
              <label className="field-label">{modal==='earn' ? 'Order amount (₹) *' : 'Points to redeem *'}</label>
              <input className="field-input" type="number" min="0" value={form.amount}
                onChange={e => setForm(f=>({...f,amount:e.target.value}))}
                placeholder={modal==='earn' ? '350' : '100'} />
              {modal==='earn' && form.amount > 0 && <p style={{ fontSize:11, color:'var(--green-dark)', marginTop:4 }}>Points to award: <strong>{Math.floor(form.amount/10)}</strong> (₹10 = 1 point)</p>}
              {modal==='redeem' && form.amount > 0 && <p style={{ fontSize:11, color:'#D97706', marginTop:4 }}>Discount: <strong>₹{Math.floor(form.amount/100)*10}</strong> off (100 pts = ₹10)</p>}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={()=>{setModal(null);setBalRes(null);}}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:1 }} disabled={saving||!form.phone||!form.amount}
                onClick={modal==='earn' ? earn : redeem}>
                {saving ? 'Processing…' : modal==='earn' ? 'Add points' : 'Redeem now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {modal === 'history' && selCust && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:480, maxHeight:'80vh', overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 22px', borderBottom:'1px solid var(--gray-100)' }}>
              <div>
                <h3 style={{ fontSize:16, fontWeight:700 }}>{selCust.customerName || 'Customer'}</h3>
                <p style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{selCust.customerPhone} · {selCust.totalPoints||0} points</p>
              </div>
              <button onClick={()=>{setModal(null);setSelCust(null);}} style={{ background:'var(--gray-100)', border:'none', borderRadius:8, padding:'6px 10px', cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ overflowY:'auto', padding:'16px 22px', flex:1 }}>
              {history.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)', fontSize:13 }}>No transaction history available</div>
              ) : history.map((h, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--gray-100)' }}>
                  <div style={{ width:36, height:36, borderRadius:10, background: h.type==='EARN'?'#E1F5EE':'#F5F3FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:16 }}>{h.type==='EARN'?'➕':'🎁'}</span>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{h.type==='EARN' ? 'Points earned' : 'Points redeemed'}</div>
                    {h.orderAmount && <div style={{ fontSize:11, color:'var(--gray-400)' }}>Order: ₹{h.orderAmount}</div>}
                    <div style={{ fontSize:11, color:'var(--gray-400)' }}>{h.createdAt ? new Date(h.createdAt).toLocaleString('en-IN') : ''}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <span style={{ fontSize:15, fontWeight:800, color:h.type==='EARN'?'#1D9E75':'#7C3AED' }}>
                      {h.type==='EARN'?'+':'-'}{h.points||0}
                    </span>
                    <div style={{ fontSize:10, color:'var(--gray-400)' }}>pts</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
