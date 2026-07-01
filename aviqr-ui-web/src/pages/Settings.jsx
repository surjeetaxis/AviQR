import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Store, Clock, CreditCard, Bell, Shield, Tag, Save, Globe, Check, AlertTriangle,
  ExternalLink, Plus, Trash2, X, Link2, Lock, Eye, EyeOff, Palette, ShoppingBag,
  Printer, ChevronRight, Wifi, WifiOff, RefreshCw, Info, Key, QrCode,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useActiveShopId } from '../hooks/useActiveShopId.js';
import { shopApi, authApi, menuApi, aggregatorConfigApi } from '../api/index.js';

const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const LANGS = [
  { code:'en', native:'English' }, { code:'hi', native:'हिंदी' },
  { code:'ta', native:'தமிழ்'  }, { code:'kn', native:'ಕನ್ನಡ'  },
  { code:'ml', native:'മലയാളം' }, { code:'te', native:'తెలుగు' },
  { code:'bn', native:'বাংলা'  }, { code:'mr', native:'मराठी'  },
  { code:'gu', native:'ગુજરાતી' },
];
const PLAN_INFO = {
  STARTER: {
    name:'Starter', price:'Free', color:'#6B7280',
    features:['Up to 50 menu items','1 QR code','Basic POS','Order management'],
  },
  GROWTH: {
    name:'Growth', price:'₹999/mo', color:'#1D9E75',
    features:['Unlimited items & orders','Dynamic pricing','Staff roles','Loyalty program','WhatsApp alerts','AI features'],
  },
  BUSINESS: {
    name:'Business', price:'₹2,499/mo', color:'#7C3AED',
    features:['Everything in Growth','Multi-outlet dashboard','CRM & customer data','API access','Dedicated support','Custom integrations'],
  },
};

// ── Reusable sub-components ──────────────────────────────────────────────────
function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, paddingBottom:16, borderBottom:'1px solid var(--gray-100)' }}>
      <div>
        <h2 style={{ fontSize:16, fontWeight:700, color:'var(--gray-900)', margin:0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize:13, color:'var(--gray-500)', margin:'4px 0 0' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Toggle({ label, sub, value, onChange, status }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16, padding:'13px 0', borderBottom:'1px solid var(--gray-50)' }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, color:'var(--gray-800)', fontWeight:500, display:'flex', alignItems:'center', gap:8 }}>
          {label}
          {status && (
            <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:999,
              background: value ? '#E1F5EE' : '#F3F4F6', color: value ? '#1D9E75' : '#6B7280' }}>
              {value ? 'Active' : 'Off'}
            </span>
          )}
        </div>
        {sub && <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{sub}</div>}
      </div>
      <div onClick={onChange}
        style={{ width:40, height:22, borderRadius:11, background: value ? '#1D9E75' : '#D1D5DB',
                 transition:'all .2s', position:'relative', cursor:'pointer', flexShrink:0 }}>
        <div style={{ position:'absolute', top:3, left: value ? 'calc(100% - 19px)' : 3, width:16, height:16,
                      borderRadius:8, background:'white', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="field" style={{ margin:0 }}>
      <label className="field-label">{label}</label>
      {children}
      {hint && <p style={{ fontSize:11, color:'var(--gray-400)', marginTop:4 }}>{hint}</p>}
    </div>
  );
}

function SaveBar({ onSave, saving, saved, onCancel }) {
  return (
    <div style={{ display:'flex', gap:10, paddingTop:20, marginTop:20, borderTop:'1px solid var(--gray-100)' }}>
      <button className="btn btn-primary" onClick={onSave} disabled={saving} style={{ minWidth:120 }}>
        {saved ? <><Check size={14}/> Saved!</> : saving ? 'Saving…' : <><Save size={14}/> Save changes</>}
      </button>
    </div>
  );
}

function StatusBadge({ ok, okLabel = 'Configured', noLabel = 'Not set' }) {
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999,
      background: ok ? '#E1F5EE' : '#F3F4F6', color: ok ? '#1D9E75' : '#9CA3AF' }}>
      {ok ? okLabel : noLabel}
    </span>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Settings() {
  const { user, lang: currentLang, changeLang, updateUser } = useAuth();
  const shopId = useActiveShopId();
  const [section, setSection] = useState('shop');

  // ── State ────────────────────────────────────────────────────────────────
  const [shopForm, setShopForm] = useState({
    name:'', phone:'', email:'', address:'', city:'', gstin:'', description:'', website:'',
  });
  const [hours, setHours] = useState(
    DAYS.reduce((a, d) => ({ ...a, [d]:{ open: d !== 'Sunday', from:'09:00', to:'22:00' } }), {})
  );
  const [settings, setSettings] = useState({
    cashEnabled:true, onlineEnabled:false, walletEnabled:false,
    loyaltyEnabled:false, loyaltyPointsPerRupee:1, loyaltyRedemptionRate:100,
    razorpayKeyId:'', upiEnabled:false, upiId:'',
    taxPercent:5,
    notifyNewOrder:true, notifyStatus:true, notifyDailySummary:true,
    notifyLowStock:true, notifyReview:false, notifySms:false,
    autoAcceptOrders:false, kitchenPrinter:false, defaultPrepTime:20,
    dineInEnabled:true, takeawayEnabled:true, deliveryEnabled:false,
    minOrderValue:0, estimatedDeliveryTime:45,
    accentColor:'#1D9E75', menuStyle:'grid',
  });

  // Payment method modal
  const [payModal, setPayModal]   = useState(null); // null | { type, mode:'enable'|'configure' }
  const [payForm, setPayForm]     = useState({ razorpayKeyId:'', upiId:'', loyaltyPointsPerRupee:1, loyaltyRedemptionRate:100 });
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError]   = useState('');

  // Integration modal (Zomato / Swiggy only)
  const [intgModal, setIntgModal] = useState(null); // null | { type:'zomato'|'swiggy', mode:'enable'|'configure' }
  const [intgForm, setIntgForm]   = useState({ restaurantId:'' });
  const [intgMSaving, setIntgMSave] = useState(false);
  const [intgMError, setIntgMError] = useState('');
  const [upiQrPreview, setUpiQrPreview] = useState('');
  const [intg, setIntg] = useState({ zomatoRestaurantId:'', swiggyRestaurantId:'', zomatoEnabled:false, swiggyEnabled:false });

  // Pricing rules
  const [rules, setRules]         = useState([]);
  const [ruleModal, setRuleModal] = useState(false);
  const [ruleForm, setRuleForm]   = useState({ name:'', type:'TIME_OF_DAY', adjustmentType:'PERCENTAGE', adjustmentValue:'', fromTime:'', toTime:'', daysOfWeek:[], active:true });
  const [ruleSaving, setRuleSave] = useState(false);

  // Security
  const [pwForm, setPwForm]       = useState({ current:'', next:'', confirm:'' });
  const [showPw, setShowPw]       = useState(false);
  const [pwSaving, setPwSave]     = useState(false);
  const [pwSaved, setPwSaved]     = useState(false);
  const [pwError, setPwError]     = useState('');

  // Plan
  const [shopPlan, setShopPlan]   = useState('STARTER');

  // Save state
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState(null);
  const [intgSaving, setIntgSave] = useState(false);
  const [intgSaved, setIntgSaved] = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!shopId) return;
    shopApi.getById(shopId).then(r => {
      const d = r.data.data;
      if (d) {
        setShopForm(f => ({ ...f, name:d.name||'', phone:d.phone||'', email:d.email||'', address:d.address||'', city:d.city||'', gstin:d.gstin||'', description:d.description||'', website:d.website||'' }));
        setShopPlan((d.subscriptionPlan || 'STARTER').toUpperCase());
      }
    }).catch(() => {});
    shopApi.getSettings(shopId).then(r => {
      if (r.data.data) setSettings(s => ({ ...s, ...r.data.data }));
    }).catch(() => {});
    menuApi.getPricingRules(shopId).then(r => setRules(r.data.data || [])).catch(() => {});
    aggregatorConfigApi.getMapping(shopId).then(r => { if (r.data.data) setIntg(i => ({ ...i, ...r.data.data })); }).catch(() => {});
  }, [shopId]);

  const set  = k => v  => setSettings(s => ({ ...s, [k]: v }));
  const tog  = k => () => setSettings(s => ({ ...s, [k]: !s[k] }));
  const setS = k => e  => setShopForm(f => ({ ...f, [k]: e.target.value }));

  // ── Save helpers ─────────────────────────────────────────────────────────
  const saveSection = async (extraCalls = []) => {
    if (!shopId) return;
    setSaving(true); setError(null);
    try {
      await Promise.allSettled([shopApi.saveSettings(shopId, settings), ...extraCalls]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const saveShop = () => saveSection([shopApi.update(shopId, shopForm)]);

  const saveIntegrations = async () => {
    setIntgSave(true);
    try {
      await aggregatorConfigApi.saveMapping({ shopId, ...intg });
      setIntgSaved(true); setTimeout(() => setIntgSaved(false), 2500);
    } catch (e) { alert(e.response?.data?.message || 'Save failed'); }
    finally { setIntgSave(false); }
  };

  // Open modal pre-filled with current config
  const openPayConfig = (type) => {
    setPayError('');
    setPayForm({
      razorpayKeyId: settings.razorpayKeyId || '',
      upiId: settings.upiId || '',
      loyaltyPointsPerRupee: settings.loyaltyPointsPerRupee || 1,
      loyaltyRedemptionRate: settings.loyaltyRedemptionRate || 100,
    });
    const alreadyEnabled = settings[`${type}Enabled`];
    setPayModal({ type, mode: alreadyEnabled ? 'configure' : 'enable' });
  };

  const submitPayModal = async () => {
    if (!shopId || !payModal) return;
    const { type } = payModal;
    setPayError('');
    if (type === 'online' && !payForm.razorpayKeyId.trim())
      return setPayError('Razorpay Key ID is required');
    if (type === 'upi' && !payForm.upiId.trim())
      return setPayError('UPI ID is required');
    setPaySaving(true);
    const patch = { [`${type}Enabled`]: true };
    if (type === 'online')  patch.razorpayKeyId = payForm.razorpayKeyId.trim();
    if (type === 'upi')     patch.upiId = payForm.upiId.trim();
    if (type === 'loyalty') {
      patch.loyaltyPointsPerRupee = Number(payForm.loyaltyPointsPerRupee);
      patch.loyaltyRedemptionRate = Number(payForm.loyaltyRedemptionRate);
    }
    const updated = { ...settings, ...patch };
    try {
      await shopApi.saveSettings(shopId, updated);
      setSettings(updated);
      setPayModal(null);
    } catch (e) { setPayError(e.response?.data?.message || 'Save failed'); }
    finally { setPaySaving(false); }
  };

  const disablePayment = async (type) => {
    if (type === 'cash') return; // cash cannot be disabled — it's always available
    if (!confirm(`Disable ${type} payments for your shop?`)) return;
    const updated = { ...settings, [`${type}Enabled`]: false };
    try {
      await shopApi.saveSettings(shopId, updated);
      setSettings(updated);
    } catch {}
  };

  // UPI QR preview — for the payment modal
  useEffect(() => {
    if (payModal?.type !== 'upi' || !payForm.upiId.trim()) { setUpiQrPreview(''); return; }
    const upiStr = `upi://pay?pa=${encodeURIComponent(payForm.upiId.trim())}&pn=${encodeURIComponent(shopForm.name||'Shop')}&cu=INR`;
    QRCode.toDataURL(upiStr, { width:160, margin:1, color:{ dark:'#0F172A', light:'#FFFFFF' } })
      .then(setUpiQrPreview).catch(() => setUpiQrPreview(''));
  }, [payModal?.type, payForm.upiId, shopForm.name]);

  const openIntgConfig = (type) => {
    setIntgMError('');
    setIntgForm({
      restaurantId: type === 'zomato' ? intg.zomatoRestaurantId : intg.swiggyRestaurantId,
    });
    setIntgModal({ type, mode: intg[`${type}Enabled`] ? 'configure' : 'enable' });
  };

  const submitIntgModal = async () => {
    if (!shopId || !intgModal) return;
    setIntgMError('');
    if (!intgForm.restaurantId.trim()) return setIntgMError('Restaurant ID is required');
    const { type } = intgModal;
    setIntgMSave(true);
    try {
      const patch = { ...intg, [`${type}Enabled`]:true, [`${type}RestaurantId`]:intgForm.restaurantId.trim() };
      await aggregatorConfigApi.saveMapping({ shopId, ...patch });
      setIntg(patch);
      setIntgModal(null);
    } catch (e) { setIntgMError(e.response?.data?.message || 'Save failed'); }
    finally { setIntgMSave(false); }
  };

  const disableIntegration = async (type) => {
    if (!confirm(`Disconnect ${type} integration?`)) return;
    try {
      const patch = { ...intg, [`${type}Enabled`]: false };
      await aggregatorConfigApi.saveMapping({ shopId, ...patch });
      setIntg(patch);
    } catch {}
  };

  const changePassword = async () => {
    if (!pwForm.current || !pwForm.next) return setPwError('Fill all fields');
    if (pwForm.next !== pwForm.confirm) return setPwError('Passwords do not match');
    if (pwForm.next.length < 8) return setPwError('Password must be at least 8 characters');
    setPwError(''); setPwSave(true);
    try {
      await authApi.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwSaved(true); setPwForm({ current:'', next:'', confirm:'' });
      setTimeout(() => setPwSaved(false), 3000);
    } catch (e) { setPwError(e.response?.data?.message || 'Current password is incorrect'); }
    finally { setPwSave(false); }
  };

  const saveRule = async () => {
    if (!ruleForm.name || !ruleForm.adjustmentValue) return;
    setRuleSave(true);
    try {
      const payload = { shopId, name:ruleForm.name, type:ruleForm.type, adjustmentType:ruleForm.adjustmentType, adjustmentValue:parseFloat(ruleForm.adjustmentValue), fromTime:ruleForm.fromTime||null, toTime:ruleForm.toTime||null, daysOfWeek:ruleForm.daysOfWeek.length ? JSON.stringify(ruleForm.daysOfWeek) : null, active:ruleForm.active };
      const res = await menuApi.createRule(payload);
      setRules(prev => [...prev, res.data.data || payload]);
      setRuleModal(false);
      setRuleForm({ name:'', type:'TIME_OF_DAY', adjustmentType:'PERCENTAGE', adjustmentValue:'', fromTime:'', toTime:'', daysOfWeek:[], active:true });
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    finally { setRuleSave(false); }
  };
  const deleteRule = async (id) => {
    if (!confirm('Delete this rule?')) return;
    try { await menuApi.deleteRule(id); setRules(p => p.filter(r => r.id !== id)); } catch {}
  };

  // ── Sidebar status computation ────────────────────────────────────────────
  const shopOk   = !!(shopForm.name && shopForm.phone);
  const intgOk   = intg.zomatoEnabled || intg.swiggyEnabled;
  const notifyOn = settings.notifyNewOrder || settings.notifyDailySummary;
  const plan     = PLAN_INFO[shopPlan] || PLAN_INFO.STARTER;

  const SECTIONS = [
    { key:'shop',     label:'Shop Profile',     icon:Store,     badge: shopOk ? 'ok' : 'warn' },
    { key:'hours',    label:'Opening Hours',     icon:Clock,     badge: 'ok' },
    { key:'orders',   label:'Order Settings',    icon:ShoppingBag, badge: 'ok' },
    { key:'payment',  label:'Payment & Tax',     icon:CreditCard, badge: 'ok' },
    { key:'pricing',  label:'Dynamic Pricing',   icon:Tag,       badge: rules.length > 0 ? 'ok' : 'gray' },
    { key:'notify',   label:'Notifications',     icon:Bell,      badge: notifyOn ? 'ok' : 'gray' },
    { key:'integrations', label:'Integrations',  icon:Link2,     badge: intgOk ? 'ok' : 'gray' },
    { key:'appearance',   label:'Appearance',    icon:Palette,   badge: 'ok' },
    { key:'security', label:'Security',          icon:Lock,      badge: 'ok' },
    { key:'plan',     label:'Plan & Billing',    icon:Shield,    badge: shopPlan === 'BUSINESS' ? 'ok' : 'gray' },
  ];

  const badgeColor = b => b === 'ok' ? '#1D9E75' : b === 'warn' ? '#D97706' : '#D1D5DB';

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', gap:0, alignItems:'flex-start', minHeight:'calc(100vh - 140px)' }}>

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <div style={{ width:230, flexShrink:0, background:'white', borderRadius:12, border:'1px solid var(--gray-200)', overflow:'hidden', position:'sticky', top:24, marginRight:20 }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--gray-100)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:.8 }}>Settings</div>
        </div>
        <nav style={{ padding:'6px 0' }}>
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const active = section === s.key;
            return (
              <button key={s.key} onClick={() => setSection(s.key)}
                style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 14px', border:'none',
                         background: active ? '#F0FDF8' : 'transparent', cursor:'pointer',
                         borderLeft: `3px solid ${active ? '#1D9E75' : 'transparent'}`, transition:'all .1s' }}>
                <Icon size={15} color={active ? '#1D9E75' : '#6B7280'}/>
                <span style={{ flex:1, textAlign:'left', fontSize:13, fontWeight: active ? 600 : 400, color: active ? '#1D9E75' : 'var(--gray-700)' }}>
                  {s.label}
                </span>
                <span style={{ width:7, height:7, borderRadius:50, background: badgeColor(s.badge), flexShrink:0 }}/>
              </button>
            );
          })}
        </nav>
        <div style={{ padding:'12px 16px', borderTop:'1px solid var(--gray-100)' }}>
          <div style={{ fontSize:10, color:'var(--gray-400)' }}>
            <span style={{ display:'inline-block', width:7, height:7, borderRadius:50, background:'#1D9E75', marginRight:4 }}/>Configured
            <span style={{ display:'inline-block', width:7, height:7, borderRadius:50, background:'#D97706', margin:'0 4px 0 12px' }}/>Needs attention
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:16 }}>

        {error && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:8, background:'#FEF2F2', border:'1px solid #FECACA', fontSize:13, color:'#DC2626' }}>
            <AlertTriangle size={14}/> {error}
          </div>
        )}
        {saved && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:8, background:'#E1F5EE', border:'1px solid #A7F3D0', fontSize:13, color:'#065F46' }}>
            <Check size={14}/> Settings saved successfully
          </div>
        )}

        {/* ── SHOP PROFILE ───────────────────────────────────────────────── */}
        {section === 'shop' && (
          <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
            <SectionHeader title="Shop Profile" subtitle="Business information shown to customers on your menu"/>

            {!shopOk && (
              <div style={{ display:'flex', gap:8, alignItems:'center', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#92400E', marginBottom:20 }}>
                <Info size={13}/> Complete your shop name and phone number to activate the customer menu.
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="Shop name *">
                  <input className="field-input" value={shopForm.name} onChange={setS('name')} placeholder="Spice Route"/>
                </Field>
                <Field label="Phone *">
                  <input className="field-input" type="tel" value={shopForm.phone} onChange={setS('phone')} placeholder="9900112233"/>
                </Field>
              </div>
              <Field label="Description" hint="Brief description shown on your QR menu">
                <textarea className="field-input" style={{ height:64, resize:'vertical', paddingTop:8 }}
                  value={shopForm.description} onChange={setS('description')} placeholder="Authentic South Indian cuisine since 1998"/>
              </Field>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="Email">
                  <input className="field-input" type="email" value={shopForm.email} onChange={setS('email')} placeholder="owner@spiceroute.in"/>
                </Field>
                <Field label="Website">
                  <input className="field-input" value={shopForm.website} onChange={setS('website')} placeholder="https://spiceroute.in"/>
                </Field>
              </div>
              <Field label="Address">
                <input className="field-input" value={shopForm.address} onChange={setS('address')} placeholder="123 MG Road"/>
              </Field>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="City">
                  <input className="field-input" value={shopForm.city} onChange={setS('city')} placeholder="Bengaluru"/>
                </Field>
                <Field label="GSTIN" hint="15-character GST number for tax invoices">
                  <input className="field-input" value={shopForm.gstin} onChange={e => setShopForm(f => ({ ...f, gstin:e.target.value.toUpperCase() }))} placeholder="29AABCU9603R1ZQ" maxLength={15}/>
                </Field>
              </div>

              <div>
                <label className="field-label">Dashboard Language</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
                  {LANGS.map(l => (
                    <button key={l.code} onClick={() => changeLang(l.code)}
                      style={{ padding:'5px 12px', borderRadius:999, border:`1.5px solid ${currentLang === l.code ? '#1D9E75' : 'var(--gray-200)'}`, background:currentLang === l.code ? '#E1F5EE' : 'white', fontSize:12, fontWeight:currentLang === l.code ? 700 : 400, cursor:'pointer', color:currentLang === l.code ? '#1D9E75' : 'var(--gray-600)' }}>
                      {l.native}
                    </button>
                  ))}
                </div>
              </div>

              <SaveBar onSave={saveShop} saving={saving} saved={saved}/>
            </div>
          </div>
        )}

        {/* ── OPENING HOURS ──────────────────────────────────────────────── */}
        {section === 'hours' && (
          <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
            <SectionHeader title="Opening Hours" subtitle="Shown on your QR menu — customers see when you are open"/>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {DAYS.map(day => (
                <div key={day} style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 12px', borderRadius:8, background: hours[day]?.open ? '#FAFAFA' : 'white', border:'1px solid var(--gray-100)', marginBottom:4 }}>
                  <span style={{ width:90, fontSize:13, fontWeight:600 }}>{day}</span>
                  <div onClick={() => setHours(h => ({ ...h, [day]:{ ...h[day], open:!h[day].open } }))}
                    style={{ width:36, height:20, borderRadius:10, background:hours[day]?.open ? '#1D9E75' : '#D1D5DB', transition:'all .2s', position:'relative', cursor:'pointer', flexShrink:0 }}>
                    <div style={{ position:'absolute', top:2, left:hours[day]?.open ? 16 : 2, width:16, height:16, borderRadius:8, background:'white', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
                  </div>
                  {hours[day]?.open ? (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <input type="time" value={hours[day]?.from || '09:00'} onChange={e => setHours(h => ({ ...h, [day]:{ ...h[day], from:e.target.value } }))}
                        style={{ height:32, border:'1px solid var(--gray-200)', borderRadius:6, padding:'0 8px', fontSize:12 }}/>
                      <span style={{ color:'var(--gray-400)', fontSize:12 }}>to</span>
                      <input type="time" value={hours[day]?.to || '22:00'} onChange={e => setHours(h => ({ ...h, [day]:{ ...h[day], to:e.target.value } }))}
                        style={{ height:32, border:'1px solid var(--gray-200)', borderRadius:6, padding:'0 8px', fontSize:12 }}/>
                      <span style={{ fontSize:11, fontWeight:600, color:'#1D9E75', background:'#E1F5EE', padding:'2px 8px', borderRadius:999 }}>Open</span>
                    </div>
                  ) : (
                    <span style={{ fontSize:12, fontWeight:600, color:'#9CA3AF', background:'#F3F4F6', padding:'2px 10px', borderRadius:999 }}>Closed</span>
                  )}
                </div>
              ))}
            </div>
            <SaveBar onSave={() => saveSection()} saving={saving} saved={saved}/>
          </div>
        )}

        {/* ── ORDER SETTINGS ─────────────────────────────────────────────── */}
        {section === 'orders' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Order types */}
            <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
              <SectionHeader title="Order Types" subtitle="Choose which order modes your restaurant accepts"/>
              <Toggle label="Dine-in" sub="Customers sit and eat at your restaurant" value={settings.dineInEnabled} onChange={tog('dineInEnabled')} status/>
              <Toggle label="Takeaway" sub="Customers pick up food themselves" value={settings.takeawayEnabled} onChange={tog('takeawayEnabled')} status/>
              <Toggle label="Delivery" sub="You deliver food to customer's address" value={settings.deliveryEnabled} onChange={tog('deliveryEnabled')} status/>
              {settings.deliveryEnabled && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:14, paddingTop:14, borderTop:'1px solid var(--gray-100)' }}>
                  <Field label="Min order value (₹)">
                    <input className="field-input" type="number" min="0" value={settings.minOrderValue} onChange={e => set('minOrderValue')(Number(e.target.value))}/>
                  </Field>
                  <Field label="Estimated delivery time (min)">
                    <input className="field-input" type="number" min="1" value={settings.estimatedDeliveryTime} onChange={e => set('estimatedDeliveryTime')(Number(e.target.value))}/>
                  </Field>
                </div>
              )}
            </div>

            {/* Kitchen settings */}
            <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
              <SectionHeader title="Kitchen & Operations" subtitle="How orders flow from customer to kitchen"/>
              <Toggle label="Auto-accept orders" sub="Orders are accepted immediately without manual confirmation" value={settings.autoAcceptOrders} onChange={tog('autoAcceptOrders')} status/>
              <Toggle label="Kitchen printer" sub="Print a KOT slip for every new order" value={settings.kitchenPrinter} onChange={tog('kitchenPrinter')} status/>
              <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--gray-100)' }}>
                <Field label="Default prep time (minutes)" hint="Shown to customers as estimated wait time">
                  <input className="field-input" type="number" min="1" max="120" value={settings.defaultPrepTime} style={{ maxWidth:160 }}
                    onChange={e => set('defaultPrepTime')(Number(e.target.value))}/>
                </Field>
              </div>
            </div>

            <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
              <SaveBar onSave={() => saveSection()} saving={saving} saved={saved}/>
            </div>
          </div>
        )}

        {/* ── PAYMENT & TAX ──────────────────────────────────────────────── */}
        {section === 'payment' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Payment method cards */}
            <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
              <SectionHeader title="Payment Methods" subtitle="Enable and configure how customers can pay at your restaurant"/>

              {[
                {
                  type:'cash', icon:'💵', label:'Cash',
                  desc:'Customer pays in cash at the counter — no setup required',
                  locked: true,
                  configLabel: null,
                  noConfig: true,
                },
                {
                  type:'upi', icon:'📲', label:'UPI (Direct Pay)',
                  desc:'Generate a UPI QR at checkout — customer scans and pays directly to your UPI ID',
                  configLabel: settings.upiId ? `UPI: ${settings.upiId}` : null,
                  noConfig: false,
                },
                {
                  type:'online', icon:'💳', label:'Razorpay',
                  desc:'Accept cards, net banking, and Razorpay UPI via Razorpay payment gateway',
                  configLabel: settings.razorpayKeyId ? `Key: ${settings.razorpayKeyId.slice(0,14)}…` : null,
                  noConfig: false,
                },
                {
                  type:'wallet', icon:'👜', label:'AviQR Wallet',
                  desc:'Customers top up an AviQR wallet and pay from their balance',
                  configLabel: null,
                  noConfig: true,
                },
                {
                  type:'loyalty', icon:'⭐', label:'Loyalty Points',
                  desc:'Let customers earn and redeem points at checkout',
                  configLabel: settings.loyaltyEnabled
                    ? `${settings.loyaltyPointsPerRupee} pt/₹ · redeem ${settings.loyaltyRedemptionRate} pts = ₹1`
                    : null,
                  noConfig: false,
                },
              ].map(pm => {
                const enabled = settings[`${pm.type}Enabled`];
                return (
                  <div key={pm.type} style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 0', borderBottom:'1px solid var(--gray-50)' }}>
                    {/* Icon */}
                    <div style={{ width:44, height:44, borderRadius:12, background: enabled ? '#E1F5EE' : '#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                      {pm.icon}
                    </div>

                    {/* Label + desc */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                        <span style={{ fontSize:14, fontWeight:600, color:'var(--gray-900)' }}>{pm.label}</span>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999,
                          background: enabled ? '#E1F5EE' : '#F3F4F6',
                          color:      enabled ? '#1D9E75' : '#9CA3AF' }}>
                          {enabled ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div style={{ fontSize:12, color:'var(--gray-500)' }}>{pm.desc}</div>
                      {enabled && pm.configLabel && (
                        <div style={{ fontSize:11, color:'#1D9E75', fontWeight:600, marginTop:3 }}>
                          ✓ {pm.configLabel}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                      {enabled ? (
                        <>
                          {/* Configure button — for methods that have settable config */}
                          {!pm.noConfig && (
                            <button onClick={() => openPayConfig(pm.type)}
                              style={{ padding:'6px 14px', borderRadius:8, border:'1px solid var(--gray-300)', background:'white', fontSize:12, fontWeight:600, cursor:'pointer', color:'var(--gray-700)' }}>
                              Configure
                            </button>
                          )}
                          {/* Disable — not allowed for cash */}
                          {!pm.locked && (
                            <button onClick={() => disablePayment(pm.type)}
                              style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #FECACA', background:'#FEF2F2', fontSize:12, fontWeight:600, cursor:'pointer', color:'#DC2626' }}>
                              Disable
                            </button>
                          )}
                          {pm.locked && (
                            <span style={{ fontSize:11, color:'var(--gray-400)', padding:'6px 10px', fontStyle:'italic' }}>Default</span>
                          )}
                        </>
                      ) : (
                        <button onClick={() => openPayConfig(pm.type)}
                          style={{ padding:'6px 18px', borderRadius:8, border:'2px solid #1D9E75', background:'white', fontSize:12, fontWeight:700, cursor:'pointer', color:'#1D9E75', transition:'all .1s' }}>
                          Enable →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* GST */}
            <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
              <SectionHeader title="GST / Tax" subtitle="Applied to all orders in your shop"/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="Tax rate (%)" hint="Standard: 5% (no ITC) or 12% (with ITC)">
                  <input className="field-input" type="number" min="0" max="28" step="0.5" value={settings.taxPercent}
                    onChange={e => set('taxPercent')(Number(e.target.value))}/>
                </Field>
                <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end', paddingBottom:2 }}>
                  <div style={{ fontSize:12, color:'var(--gray-500)', background:'var(--gray-50)', borderRadius:8, padding:'10px 12px', border:'1px solid var(--gray-100)' }}>
                    <div style={{ fontWeight:600, color:'var(--gray-700)', marginBottom:4 }}>Common rates</div>
                    <div>0% — exempt items (fresh produce)</div>
                    <div>5% — restaurant (no input tax credit)</div>
                    <div>12% — with ITC</div>
                    <div>18% — AC restaurants above ₹7,500</div>
                  </div>
                </div>
              </div>
              <SaveBar onSave={() => saveSection()} saving={saving} saved={saved}/>
            </div>
          </div>
        )}

        {/* ── DYNAMIC PRICING ────────────────────────────────────────────── */}
        {section === 'pricing' && (
          <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
            <SectionHeader title="Dynamic Pricing" subtitle="Auto-adjust prices by time of day or day of week"
              action={<button className="btn btn-primary" onClick={() => setRuleModal(true)}><Plus size={14}/> Add rule</button>}/>
            {rules.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px 0', color:'var(--gray-400)' }}>
                <Tag size={32} style={{ opacity:.2, display:'block', margin:'0 auto 12px' }}/>
                <div style={{ fontSize:14, fontWeight:500, color:'var(--gray-600)', marginBottom:4 }}>No pricing rules yet</div>
                <div style={{ fontSize:13 }}>Add happy hour discounts or peak-time surcharges</div>
              </div>
            ) : rules.map(r => {
              const val = parseFloat(r.adjustmentValue || 0);
              const isUp = val > 0;
              return (
                <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:r.active ? '#FAFAFA' : 'white', borderRadius:10, border:'1px solid var(--gray-200)', marginBottom:8 }}>
                  <div style={{ width:10, height:10, borderRadius:5, background: r.active ? '#1D9E75' : '#D1D5DB', flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{r.name}</div>
                    <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:2 }}>
                      {r.type === 'TIME_OF_DAY' && r.fromTime && r.toTime ? `${r.fromTime} – ${r.toTime}` : 'All day'}
                      {r.daysOfWeek ? ` · ${JSON.parse(r.daysOfWeek||'[]').join(', ')}` : ' · All days'}
                    </div>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:isUp?'#DC2626':'#1D9E75', background:isUp?'#FEF2F2':'#E1F5EE', padding:'3px 10px', borderRadius:999 }}>
                    {isUp ? '+' : ''}{val}{r.adjustmentType === 'PERCENTAGE' ? '%' : '₹'}
                  </span>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:999, background:r.active?'#E1F5EE':'#F3F4F6', color:r.active?'#1D9E75':'#9CA3AF' }}>
                    {r.active ? 'Active' : 'Paused'}
                  </span>
                  <button onClick={() => deleteRule(r.id)} style={{ background:'#FEF2F2', border:'none', borderRadius:6, padding:'5px 8px', cursor:'pointer', color:'#DC2626' }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── NOTIFICATIONS ──────────────────────────────────────────────── */}
        {section === 'notify' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
              <SectionHeader title="Order Notifications" subtitle="Alerts sent via WhatsApp and app when order activity happens"/>
              <Toggle label="New order alert" sub="Instant WhatsApp when a customer places an order" value={settings.notifyNewOrder} onChange={tog('notifyNewOrder')} status/>
              <Toggle label="Order status updates" sub="When kitchen marks an order as ready or completed" value={settings.notifyStatus} onChange={tog('notifyStatus')} status/>
              <Toggle label="SMS confirmation to customer" sub="Send SMS order confirmation to the customer's phone" value={settings.notifySms} onChange={tog('notifySms')} status/>
            </div>
            <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
              <SectionHeader title="Business Alerts" subtitle="Daily summaries and operational warnings"/>
              <Toggle label="Daily revenue summary" sub="End-of-day summary sent at 11 PM with revenue and order count" value={settings.notifyDailySummary} onChange={tog('notifyDailySummary')} status/>
              <Toggle label="Low stock warnings" sub="When a tracked menu item or ingredient drops below threshold" value={settings.notifyLowStock} onChange={tog('notifyLowStock')} status/>
              <Toggle label="Customer review alerts" sub="When a customer leaves a review or rating" value={settings.notifyReview} onChange={tog('notifyReview')} status/>
            </div>
            <div style={{ background:'#FFFBEB', borderRadius:10, border:'1px solid #FDE68A', padding:'12px 16px', fontSize:12, color:'#92400E', display:'flex', gap:8, alignItems:'flex-start' }}>
              <Info size={14} style={{ flexShrink:0, marginTop:1 }}/>
              <span>WhatsApp notifications require Twilio credentials configured on your server (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN).</span>
            </div>
            <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
              <SaveBar onSave={() => saveSection()} saving={saving} saved={saved}/>
            </div>
          </div>
        )}

        {/* ── INTEGRATIONS ───────────────────────────────────────────────── */}
        {section === 'integrations' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Food aggregators + UPI — card list */}
            <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
              <SectionHeader title="Integrations" subtitle="Connect third-party platforms and payment channels"/>

              {[
                {
                  type:'zomato', icon:'🍕', label:'Zomato', accent:'#DC2626',
                  desc:'Sync orders placed on Zomato directly into your Orders page',
                  isOn: intg.zomatoEnabled && !!intg.zomatoRestaurantId,
                  configLabel: intg.zomatoRestaurantId ? `ID: ${intg.zomatoRestaurantId}` : null,
                },
                {
                  type:'swiggy', icon:'🛵', label:'Swiggy', accent:'#D97706',
                  desc:'Sync orders placed on Swiggy directly into your Orders page',
                  isOn: intg.swiggyEnabled && !!intg.swiggyRestaurantId,
                  configLabel: intg.swiggyRestaurantId ? `ID: ${intg.swiggyRestaurantId}` : null,
                },
              ].map(ig => (
                <div key={ig.type} style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 0', borderBottom:'1px solid var(--gray-50)' }}>
                  {/* Icon */}
                  <div style={{ width:44, height:44, borderRadius:12, background: ig.isOn ? ig.accent+'18' : '#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                    {ig.icon}
                  </div>
                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                      <span style={{ fontSize:14, fontWeight:600, color:'var(--gray-900)' }}>{ig.label}</span>
                      {ig.isOn
                        ? <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, background:'#E1F5EE', color:'#1D9E75', display:'flex', alignItems:'center', gap:3 }}><Wifi size={9}/> Connected</span>
                        : <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, background:'#F3F4F6', color:'#9CA3AF', display:'flex', alignItems:'center', gap:3 }}><WifiOff size={9}/> Not connected</span>}
                    </div>
                    <div style={{ fontSize:12, color:'var(--gray-500)' }}>{ig.desc}</div>
                    {ig.isOn && ig.configLabel && (
                      <div style={{ fontSize:11, color:'#1D9E75', fontWeight:600, marginTop:3 }}>✓ {ig.configLabel}</div>
                    )}
                  </div>
                  {/* Actions */}
                  <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                    {ig.isOn ? (
                      <>
                        <button onClick={() => openIntgConfig(ig.type)}
                          style={{ padding:'6px 14px', borderRadius:8, border:'1px solid var(--gray-300)', background:'white', fontSize:12, fontWeight:600, cursor:'pointer', color:'var(--gray-700)' }}>
                          Configure
                        </button>
                        <button onClick={() => disableIntegration(ig.type)}
                          style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #FECACA', background:'#FEF2F2', fontSize:12, fontWeight:600, cursor:'pointer', color:'#DC2626' }}>
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button onClick={() => openIntgConfig(ig.type)}
                        style={{ padding:'6px 18px', borderRadius:8, border:`2px solid ${ig.accent}`, background:'white', fontSize:12, fontWeight:700, cursor:'pointer', color:ig.accent }}>
                        Connect →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Razorpay — server-side note */}
            <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
              <SectionHeader title="Payment Gateway" subtitle="Razorpay credentials for card and net banking payments"/>
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'#F8FAFC', borderRadius:10, border:'1px solid var(--gray-200)' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'#EEF2FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>💳</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600 }}>Razorpay</div>
                  <div style={{ fontSize:12, color:'var(--gray-500)' }}>Configure via server environment: RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET</div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:'#6B7280', background:'#F3F4F6', padding:'3px 10px', borderRadius:999 }}>Server-side config</span>
              </div>
            </div>
          </div>
        )}

        {/* ── APPEARANCE ─────────────────────────────────────────────────── */}
        {section === 'appearance' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
              <SectionHeader title="Menu Display" subtitle="How your customer-facing QR menu looks"/>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div>
                  <label className="field-label">Menu layout</label>
                  <div style={{ display:'flex', gap:10, marginTop:8 }}>
                    {[{ key:'grid', label:'Grid', desc:'Items in cards (recommended)' }, { key:'list', label:'List', desc:'Compact list view' }].map(opt => (
                      <button key={opt.key} onClick={() => set('menuStyle')(opt.key)}
                        style={{ flex:1, padding:'14px 16px', borderRadius:10, border:`2px solid ${settings.menuStyle === opt.key ? '#1D9E75' : 'var(--gray-200)'}`, background:settings.menuStyle === opt.key ? '#E1F5EE' : 'white', cursor:'pointer', textAlign:'left', transition:'all .15s' }}>
                        <div style={{ fontSize:13, fontWeight:700, color:settings.menuStyle === opt.key ? '#1D9E75' : 'var(--gray-800)' }}>{opt.label}</div>
                        <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:2 }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="field-label">Brand colour</label>
                  <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
                    {['#1D9E75','#2563EB','#7C3AED','#DC2626','#D97706','#0F172A','#EC4899','#06B6D4'].map(c => (
                      <button key={c} onClick={() => set('accentColor')(c)}
                        style={{ width:36, height:36, borderRadius:8, background:c, border:`3px solid ${settings.accentColor === c ? '#0F172A' : 'transparent'}`, cursor:'pointer', transition:'border .1s' }}/>
                    ))}
                    <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, color:'var(--gray-600)' }}>
                      <input type="color" value={settings.accentColor} onChange={e => set('accentColor')(e.target.value)}
                        style={{ width:36, height:36, border:'none', borderRadius:8, cursor:'pointer', padding:0 }}/>
                      Custom
                    </label>
                  </div>
                </div>
              </div>
              <SaveBar onSave={() => saveSection()} saving={saving} saved={saved}/>
            </div>
          </div>
        )}

        {/* ── SECURITY ───────────────────────────────────────────────────── */}
        {section === 'security' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Account info */}
            <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
              <SectionHeader title="Account" subtitle="Your login credentials and account details"/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
                <div style={{ padding:'14px 16px', background:'var(--gray-50)', borderRadius:10, border:'1px solid var(--gray-100)' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--gray-500)', textTransform:'uppercase', marginBottom:4 }}>Account Email</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--gray-900)' }}>{user?.email || '—'}</div>
                </div>
                <div style={{ padding:'14px 16px', background:'var(--gray-50)', borderRadius:10, border:'1px solid var(--gray-100)' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--gray-500)', textTransform:'uppercase', marginBottom:4 }}>Role</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--gray-900)' }}>Shop Owner</div>
                </div>
              </div>
            </div>

            {/* Change password */}
            <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
              <SectionHeader title="Change Password" subtitle="Use a strong password of at least 8 characters"/>
              {pwError && (
                <div style={{ display:'flex', gap:8, alignItems:'center', padding:'9px 12px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, fontSize:13, color:'#DC2626', marginBottom:16 }}>
                  <AlertTriangle size={13}/> {pwError}
                </div>
              )}
              {pwSaved && (
                <div style={{ display:'flex', gap:8, alignItems:'center', padding:'9px 12px', background:'#E1F5EE', border:'1px solid #A7F3D0', borderRadius:8, fontSize:13, color:'#065F46', marginBottom:16 }}>
                  <Check size={13}/> Password updated successfully
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <Field label="Current password">
                  <div style={{ position:'relative' }}>
                    <input className="field-input" type={showPw ? 'text' : 'password'} value={pwForm.current}
                      onChange={e => setPwForm(f => ({ ...f, current:e.target.value }))} placeholder="Enter current password" style={{ paddingRight:40 }}/>
                    <button onClick={() => setShowPw(p => !p)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--gray-400)', padding:0 }}>
                      {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                </Field>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <Field label="New password">
                    <input className="field-input" type={showPw ? 'text' : 'password'} value={pwForm.next}
                      onChange={e => setPwForm(f => ({ ...f, next:e.target.value }))} placeholder="At least 8 characters"/>
                  </Field>
                  <Field label="Confirm new password">
                    <input className="field-input" type={showPw ? 'text' : 'password'} value={pwForm.confirm}
                      onChange={e => setPwForm(f => ({ ...f, confirm:e.target.value }))} placeholder="Repeat new password"/>
                  </Field>
                </div>
                <div>
                  <button className="btn btn-primary" onClick={changePassword} disabled={pwSaving} style={{ minWidth:160 }}>
                    <Key size={14}/> {pwSaving ? 'Updating…' : 'Update password'}
                  </button>
                </div>
              </div>
            </div>

            {/* Danger zone */}
            <div style={{ background:'white', borderRadius:12, border:'2px solid #FEE2E2', padding:24 }}>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:15, fontWeight:700, color:'#DC2626', marginBottom:4 }}>Danger Zone</div>
                <div style={{ fontSize:13, color:'var(--gray-500)' }}>These actions are permanent and cannot be undone</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #FEE2E2' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--gray-800)' }}>Export all data</div>
                  <div style={{ fontSize:12, color:'var(--gray-500)' }}>Download all your orders, menu items, and customer data as CSV</div>
                </div>
                <button className="btn btn-secondary" style={{ fontSize:12, color:'var(--gray-600)' }}
                  onClick={() => alert('Contact support@aviqr.in to request a data export')}>
                  Request export
                </button>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:12 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#DC2626' }}>Delete account</div>
                  <div style={{ fontSize:12, color:'var(--gray-500)' }}>Permanently delete your shop, menu, orders, and all data</div>
                </div>
                <button style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:12, fontWeight:600, color:'#DC2626' }}
                  onClick={() => alert('Contact support@aviqr.in to delete your account')}>
                  Delete account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PLAN & BILLING ─────────────────────────────────────────────── */}
        {section === 'plan' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Current plan card */}
            <div style={{ background:'white', borderRadius:12, border:'1px solid var(--gray-200)', padding:24 }}>
              <SectionHeader title="Current Plan" subtitle="Your active subscription and features"/>
              <div style={{ background:`linear-gradient(135deg, ${plan.color}14, ${plan.color}06)`, border:`1.5px solid ${plan.color}44`, borderRadius:12, padding:20, marginBottom:20, display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:plan.color, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Active plan</div>
                  <div style={{ fontSize:28, fontWeight:800, color:'var(--gray-900)' }}>{plan.name}</div>
                  <div style={{ fontSize:16, fontWeight:600, color:plan.color, marginTop:2 }}>{plan.price}</div>
                </div>
                <div style={{ fontSize:48 }}>{shopPlan === 'BUSINESS' ? '🏢' : shopPlan === 'GROWTH' ? '📈' : '🌱'}</div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'var(--gray-50)', borderRadius:8, fontSize:13 }}>
                    <Check size={13} style={{ color:'#1D9E75', flexShrink:0 }}/> {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Upgrade cards */}
            {shopPlan !== 'BUSINESS' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                {shopPlan === 'STARTER' && (
                  <div style={{ background:'white', borderRadius:12, border:'2px solid #1D9E75', padding:20, position:'relative' }}>
                    <div style={{ position:'absolute', top:-1, right:16, background:'#1D9E75', color:'white', fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:'0 0 8px 8px', letterSpacing:.5 }}>POPULAR</div>
                    <div style={{ fontSize:16, fontWeight:800, color:'#1D9E75', marginBottom:4 }}>Growth</div>
                    <div style={{ fontSize:22, fontWeight:800, marginBottom:12 }}>₹999<span style={{ fontSize:13, fontWeight:400, color:'var(--gray-500)' }}>/mo</span></div>
                    {['Unlimited items & orders','Dynamic pricing','Staff roles','Loyalty program','WhatsApp alerts','AI features'].map(f => (
                      <div key={f} style={{ display:'flex', gap:6, alignItems:'center', fontSize:12, marginBottom:5 }}><Check size={12} style={{ color:'#1D9E75' }}/>{f}</div>
                    ))}
                    <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:14 }}
                      onClick={() => alert('Contact support@aviqr.in to upgrade')}>
                      Upgrade to Growth
                    </button>
                  </div>
                )}
                <div style={{ background:'white', borderRadius:12, border:'2px solid #7C3AED', padding:20 }}>
                  <div style={{ fontSize:16, fontWeight:800, color:'#7C3AED', marginBottom:4 }}>Business</div>
                  <div style={{ fontSize:22, fontWeight:800, marginBottom:12 }}>₹2,499<span style={{ fontSize:13, fontWeight:400, color:'var(--gray-500)' }}>/mo</span></div>
                  {['Everything in Growth','Multi-outlet dashboard','CRM & customer data','API access','Dedicated support'].map(f => (
                    <div key={f} style={{ display:'flex', gap:6, alignItems:'center', fontSize:12, marginBottom:5 }}><Check size={12} style={{ color:'#7C3AED' }}/>{f}</div>
                  ))}
                  <button style={{ width:'100%', justifyContent:'center', marginTop:14, padding:'9px 0', borderRadius:8, border:'2px solid #7C3AED', background:'white', color:'#7C3AED', fontWeight:700, fontSize:13, cursor:'pointer' }}
                    onClick={() => alert('Contact support@aviqr.in to upgrade')}>
                    Upgrade to Business
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Payment method config modal ──────────────────────────────────── */}
      {payModal && (() => {
        const { type, mode } = payModal;
        const isEnable = mode === 'enable';
        const titles = { cash:'Cash Payments', upi:'UPI Direct Pay', online:'Razorpay', wallet:'AviQR Wallet', loyalty:'Loyalty Points' };
        const icons  = { cash:'💵', upi:'📲', online:'💳', wallet:'👜', loyalty:'⭐' };
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding:16 }}>
            <div style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:440, boxShadow:'0 24px 64px rgba(0,0,0,.25)' }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{icons[type]}</div>
                <div style={{ flex:1 }}>
                  <h2 style={{ fontSize:17, fontWeight:700, margin:0 }}>{isEnable ? 'Enable' : 'Configure'} {titles[type]}</h2>
                  <p style={{ fontSize:12, color:'var(--gray-500)', margin:'3px 0 0' }}>
                    {isEnable ? 'Fill in the details below to activate this payment method.' : 'Update the configuration for this payment method.'}
                  </p>
                </div>
                <button onClick={() => setPayModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gray-400)' }}><X size={18}/></button>
              </div>

              {/* Error */}
              {payError && (
                <div style={{ display:'flex', gap:8, alignItems:'center', padding:'9px 12px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, fontSize:13, color:'#DC2626', marginBottom:16 }}>
                  <AlertTriangle size={13}/> {payError}
                </div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

                {/* CASH — no config needed */}
                {type === 'cash' && (
                  <div style={{ padding:'14px 16px', background:'#F0FDF8', borderRadius:10, border:'1px solid #A7F3D0', fontSize:13, color:'#065F46' }}>
                    <div style={{ fontWeight:700, marginBottom:4 }}>No setup required</div>
                    Cash is the default payment method and is always available. Enabling it simply marks it as your accepted method in reports and receipts.
                  </div>
                )}

                {/* UPI — UPI ID + live QR preview */}
                {type === 'upi' && (
                  <>
                    <Field label="Your UPI ID *" hint="e.g. yourshop@okaxis · 9876543210@paytm · merchant@upi">
                      <input className="field-input" placeholder="merchant@okaxis"
                        value={payForm.upiId}
                        onChange={e => setPayForm(f => ({ ...f, upiId:e.target.value }))}/>
                    </Field>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'18px 16px', background:'#F9FAFB', borderRadius:12, border:'1px solid var(--gray-200)' }}>
                      {upiQrPreview ? (
                        <>
                          <img src={upiQrPreview} alt="UPI QR" style={{ width:150, height:150, borderRadius:8, border:'4px solid white', boxShadow:'0 4px 16px rgba(124,58,237,.15)' }}/>
                          <div style={{ fontSize:12, color:'var(--gray-500)', marginTop:10, textAlign:'center' }}>
                            <strong style={{ color:'var(--gray-800)' }}>{payForm.upiId}</strong>
                            <br/>This QR appears on the POS checkout for customers to scan
                          </div>
                        </>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, opacity:.35, padding:'8px 0' }}>
                          <QrCode size={44}/>
                          <div style={{ fontSize:12, color:'var(--gray-500)' }}>Enter UPI ID above to preview your QR</div>
                        </div>
                      )}
                    </div>
                    <div style={{ padding:'10px 14px', background:'#F5F3FF', borderRadius:8, border:'1px solid #DDD6FE', fontSize:12, color:'#5B21B6' }}>
                      <strong>Zero gateway fees.</strong> Customer scans → amount pre-filled → pays directly to your account. No Razorpay, no cut.
                    </div>
                  </>
                )}

                {/* ONLINE — Razorpay Key ID */}
                {type === 'online' && (
                  <>
                    <div style={{ padding:'10px 14px', background:'#EFF6FF', borderRadius:8, border:'1px solid #BFDBFE', fontSize:12, color:'#1D4ED8' }}>
                      <strong>Where to find your Key ID:</strong> Log in to <em>dashboard.razorpay.com</em> → Settings → API Keys → Generate Key. Copy the <strong>Key ID</strong> (starts with <code>rzp_</code>).
                    </div>
                    <Field label="Razorpay Key ID *" hint="Public key — safe to store here (starts with rzp_live_ or rzp_test_)">
                      <input className="field-input" placeholder="rzp_live_XXXXXXXXXXXX"
                        value={payForm.razorpayKeyId}
                        onChange={e => setPayForm(f => ({ ...f, razorpayKeyId:e.target.value }))}/>
                    </Field>
                  </>
                )}

                {/* WALLET — info only */}
                {type === 'wallet' && (
                  <div style={{ padding:'14px 16px', background:'#F0FDF8', borderRadius:10, border:'1px solid #A7F3D0', fontSize:13, color:'#065F46' }}>
                    <div style={{ fontWeight:700, marginBottom:4 }}>How AviQR Wallet works</div>
                    Customers can top up a digital wallet from the AviQR app. They scan your QR and pay directly from their balance — no OTP or PIN needed. No extra setup is required on your end.
                  </div>
                )}

                {/* LOYALTY — points config */}
                {type === 'loyalty' && (
                  <>
                    <div style={{ padding:'10px 14px', background:'#FFFBEB', borderRadius:8, border:'1px solid #FDE68A', fontSize:12, color:'#92400E' }}>
                      Example: 1 point per ₹1 spent, 100 points = ₹1 means a customer who spends ₹500 earns 500 points worth ₹5 in future visits.
                    </div>
                    <Field label="Points earned per ₹1 spent">
                      <input className="field-input" type="number" min="0.1" step="0.1"
                        value={payForm.loyaltyPointsPerRupee}
                        onChange={e => setPayForm(f => ({ ...f, loyaltyPointsPerRupee:e.target.value }))}/>
                    </Field>
                    <Field label="Points needed to redeem ₹1" hint="Lower = more generous redemption">
                      <input className="field-input" type="number" min="1"
                        value={payForm.loyaltyRedemptionRate}
                        onChange={e => setPayForm(f => ({ ...f, loyaltyRedemptionRate:e.target.value }))}/>
                    </Field>
                  </>
                )}

                {/* Buttons */}
                <div style={{ display:'flex', gap:10, marginTop:4 }}>
                  <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setPayModal(null)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex:1 }} onClick={submitPayModal} disabled={paySaving}>
                    {paySaving ? 'Saving…' : isEnable ? `Enable ${titles[type]}` : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Integration config modal ─────────────────────────────────────── */}
      {intgModal && (() => {
        const { type, mode } = intgModal;
        const isEnable = mode === 'enable';
        const META = {
          zomato: { icon:'🍕', label:'Zomato', accent:'#DC2626' },
          swiggy: { icon:'🛵', label:'Swiggy', accent:'#D97706' },
        };
        const m = META[type];
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding:16 }}>
            <div style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:460, boxShadow:'0 24px 64px rgba(0,0,0,.25)' }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:m.accent+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{m.icon}</div>
                <div style={{ flex:1 }}>
                  <h2 style={{ fontSize:17, fontWeight:700, margin:0 }}>{isEnable ? 'Connect' : 'Configure'} {m.label}</h2>
                  <p style={{ fontSize:12, color:'var(--gray-500)', margin:'3px 0 0' }}>
                    {isEnable ? 'Fill in the details below to activate this integration.' : 'Update the configuration for this integration.'}
                  </p>
                </div>
                <button onClick={() => setIntgModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gray-400)' }}><X size={18}/></button>
              </div>

              {intgMError && (
                <div style={{ display:'flex', gap:8, alignItems:'center', padding:'9px 12px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, fontSize:13, color:'#DC2626', marginBottom:16 }}>
                  <AlertTriangle size={13}/> {intgMError}
                </div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

                {/* ZOMATO */}
                {type === 'zomato' && (
                  <>
                    <div style={{ padding:'10px 14px', background:'#FEF2F2', borderRadius:8, border:'1px solid #FECACA', fontSize:12, color:'#991B1B' }}>
                      <strong>Where to find your Restaurant ID:</strong> Log in to <em>partner.zomato.com</em> → your restaurant page → the number in the URL (e.g. <code>/restaurants/12345678</code>).
                    </div>
                    <Field label="Zomato Restaurant ID *">
                      <input className="field-input" placeholder="e.g. 12345678"
                        value={intgForm.restaurantId}
                        onChange={e => setIntgForm(f => ({ ...f, restaurantId:e.target.value }))}/>
                    </Field>
                  </>
                )}

                {/* SWIGGY */}
                {type === 'swiggy' && (
                  <>
                    <div style={{ padding:'10px 14px', background:'#FFF7ED', borderRadius:8, border:'1px solid #FED7AA', fontSize:12, color:'#92400E' }}>
                      <strong>Where to find your Restaurant ID:</strong> Log in to <em>partner.swiggy.com</em> → Dashboard → Restaurant Settings → copy the Restaurant ID shown at the top.
                    </div>
                    <Field label="Swiggy Restaurant ID *">
                      <input className="field-input" placeholder="e.g. SWGY-98765"
                        value={intgForm.restaurantId}
                        onChange={e => setIntgForm(f => ({ ...f, restaurantId:e.target.value }))}/>
                    </Field>
                  </>
                )}

                <div style={{ display:'flex', gap:10, marginTop:4 }}>
                  <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setIntgModal(null)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex:1 }} onClick={submitIntgModal} disabled={intgMSaving}>
                    {intgMSaving ? 'Saving…' : isEnable ? `Connect ${m.label}` : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Pricing rule modal ────────────────────────────────────────────── */}
      {ruleModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:480 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:18, fontWeight:700, margin:0 }}>Add pricing rule</h2>
              <button onClick={() => setRuleModal(false)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={18}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Field label="Rule name *">
                <input className="field-input" value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name:e.target.value }))} placeholder="Happy hour"/>
              </Field>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label="Adjustment type">
                  <select className="field-input" value={ruleForm.adjustmentType} onChange={e => setRuleForm(f => ({ ...f, adjustmentType:e.target.value }))}>
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat amount (₹)</option>
                  </select>
                </Field>
                <Field label="Amount (use − for discount)">
                  <input className="field-input" type="number" step="0.01" value={ruleForm.adjustmentValue} onChange={e => setRuleForm(f => ({ ...f, adjustmentValue:e.target.value }))} placeholder="-15 or +10"/>
                </Field>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label="From time">
                  <input className="field-input" type="time" value={ruleForm.fromTime} onChange={e => setRuleForm(f => ({ ...f, fromTime:e.target.value }))}/>
                </Field>
                <Field label="To time">
                  <input className="field-input" type="time" value={ruleForm.toTime} onChange={e => setRuleForm(f => ({ ...f, toTime:e.target.value }))}/>
                </Field>
              </div>
              <Field label="Days (leave empty = all days)">
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
                  {['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'].map(d => (
                    <button key={d} type="button"
                      onClick={() => setRuleForm(f => ({ ...f, daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter(x => x !== d) : [...f.daysOfWeek, d] }))}
                      style={{ padding:'4px 10px', borderRadius:999, border:`1.5px solid ${ruleForm.daysOfWeek.includes(d)?'#1D9E75':'var(--gray-200)'}`, background:ruleForm.daysOfWeek.includes(d)?'#E1F5EE':'white', fontSize:11, fontWeight:ruleForm.daysOfWeek.includes(d)?700:400, cursor:'pointer', color:ruleForm.daysOfWeek.includes(d)?'#1D9E75':'var(--gray-600)' }}>
                      {d.slice(0,3)}
                    </button>
                  ))}
                </div>
              </Field>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setRuleModal(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex:1 }} onClick={saveRule} disabled={ruleSaving}>{ruleSaving?'Saving…':'Save rule'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}