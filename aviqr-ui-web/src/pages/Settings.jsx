import { useState, useEffect } from 'react';
import { Store, Clock, CreditCard, Bell, Shield, Tag, Save, Globe, Check, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { shopApi, authApi } from '../api/index.js';
import './Settings.css';

const SECTIONS = [
  { key:'shop',    label:'Shop profile',    icon:Store },
  { key:'hours',   label:'Opening hours',   icon:Clock },
  { key:'payment', label:'Payment & Tax',   icon:CreditCard },
  { key:'pricing', label:'Dynamic pricing', icon:Tag },
  { key:'notify',  label:'Notifications',   icon:Bell },
  { key:'plan',    label:'Plan & billing',  icon:Shield },
];

const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const LANGS = [
  { code:'en', native:'English' }, { code:'hi', native:'हिंदी' },
  { code:'ta', native:'தமிழ்' }, { code:'kn', native:'ಕನ್ನಡ' },
  { code:'ml', native:'മലയാളം' }, { code:'te', native:'తెలుగు' },
  { code:'bn', native:'বাংলা'  }, { code:'mr', native:'मराठी' },
  { code:'gu', native:'ગુજરાતી' },
];

const PLAN_INFO = {
  STARTER:  { name:'Starter',  price:'Free',      color:'#6B7280', features:['20 menu items','50 orders/day','1 QR code','Basic analytics'] },
  GROWTH:   { name:'Growth',   price:'₹999/mo',   color:'#1D9E75', features:['Unlimited items & orders','Dynamic pricing','Staff roles','Loyalty','WhatsApp','AI features'] },
  BUSINESS: { name:'Business', price:'₹2,499/mo', color:'#7C3AED', features:['Everything in Growth','Multi-outlet dashboard','CRM','API access','Priority support'] },
};

export default function Settings() {
  const { user, lang: currentLang, changeLang } = useAuth();
  const shopId = user?.shopId;

  const [section,  setSection]  = useState('shop');
  const [settings, setSettings] = useState({
    cashEnabled: true, onlineEnabled: true, walletEnabled: false,
    loyaltyEnabled: false, loyaltyPointsPerRupee: 1, loyaltyRedemptionRate: 100,
    taxPercent: 5,
    notifyNewOrder: true, notifyStatus: true, notifyDailySummary: true,
    notifyLowStock: true, notifyReview: false,
  });
  const [shopForm, setShopForm] = useState({ name:'', phone:'', email:'', address:'', city:'', gstin:'', description:'' });
  const [hours,    setHours]    = useState(DAYS.reduce((a, d) => ({ ...a, [d]: { open: d !== 'Sunday', from:'09:00', to:'22:00' } }), {}));
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState(null);
  const [shopPlan, setShopPlan] = useState('STARTER');

  useEffect(() => {
    if (!shopId) return;
    shopApi.getSettings(shopId)
      .then(r => { if (r.data.data) setSettings(s => ({ ...s, ...r.data.data })); })
      .catch(() => {});
    shopApi.getById(shopId)
      .then(r => {
        const d = r.data.data;
        if (d) {
          setShopForm(f => ({ ...f, name:d.name||'', phone:d.phone||'', email:d.email||'', address:d.address||'', city:d.city||'', gstin:d.gstin||'', description:d.description||'' }));
          setShopPlan((d.subscriptionPlan || 'STARTER').toUpperCase());
        }
      })
      .catch(() => {});
  }, [shopId]);

  const toggle = k => setSettings(s => ({ ...s, [k]: !s[k] }));

  const save = async () => {
    if (!shopId) return;
    setSaving(true); setError(null);
    try {
      const calls = [shopApi.saveSettings(shopId, settings)];
      if (section === 'shop') calls.push(shopApi.update(shopId, shopForm));
      await Promise.allSettled(calls);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed — check your connection');
    } finally { setSaving(false); }
  };

  const Tog = ({ k, label, sub }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid var(--gray-100)' }}>
      <div>
        <div style={{ fontSize:14, color:'var(--gray-800)', fontWeight:500 }}>{label}</div>
        {sub && <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{sub}</div>}
      </div>
      <div onClick={() => toggle(k)}
        style={{ width:38, height:22, borderRadius:11, background: settings[k] ? 'var(--green)' : 'var(--gray-300)', transition:'background .2s', position:'relative', cursor:'pointer', flexShrink:0 }}>
        <div style={{ position:'absolute', top:3, left: settings[k] ? 'calc(100% - 19px)' : 3, width:16, height:16, borderRadius:8, background:'white', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }} />
      </div>
    </div>
  );

  const plan = PLAN_INFO[shopPlan] || PLAN_INFO.STARTER;

  return (
    <div className="page-content" style={{ display:'flex', gap:24, alignItems:'flex-start' }}>
      {/* Sidebar */}
      <div className="card" style={{ width:200, flexShrink:0, padding:8 }}>
        {SECTIONS.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.key} onClick={() => setSection(s.key)}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 12px', borderRadius:8, border:'none', background: section === s.key ? 'var(--green-light)' : 'transparent', color: section === s.key ? 'var(--green-darker)' : 'var(--gray-700)', fontSize:13, fontWeight: section === s.key ? 600 : 400, cursor:'pointer', marginBottom:2 }}>
              <Icon size={15} /> {s.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex:1, minWidth:0 }}>
        {error  && <div className="alert alert-error" style={{ marginBottom:14 }}><AlertTriangle size={14} /> {error}</div>}
        {saved  && <div className="alert alert-success" style={{ marginBottom:14 }}><Check size={14} /> Settings saved!</div>}

        {section === 'shop' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Shop Profile</div><div className="card-subtitle">Business information shown to customers</div></div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="field"><label className="field-label">Shop name *</label>
                <input className="field-input" value={shopForm.name} onChange={e => setShopForm(f => ({ ...f, name:e.target.value }))} placeholder="Spice Route" /></div>
              <div className="field"><label className="field-label">Description</label>
                <textarea className="field-input" style={{ height:60, resize:'vertical', paddingTop:8 }} value={shopForm.description} onChange={e => setShopForm(f => ({ ...f, description:e.target.value }))} placeholder="Brief description shown on your QR menu…" /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="field"><label className="field-label">Phone</label><input className="field-input" type="tel" value={shopForm.phone} onChange={e => setShopForm(f => ({ ...f, phone:e.target.value }))} placeholder="9900112233" /></div>
                <div className="field"><label className="field-label">Email</label><input className="field-input" type="email" value={shopForm.email} onChange={e => setShopForm(f => ({ ...f, email:e.target.value }))} placeholder="owner@spiceroute.in" /></div>
              </div>
              <div className="field"><label className="field-label">Address</label><input className="field-input" value={shopForm.address} onChange={e => setShopForm(f => ({ ...f, address:e.target.value }))} placeholder="123 MG Road" /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="field"><label className="field-label">City</label><input className="field-input" value={shopForm.city} onChange={e => setShopForm(f => ({ ...f, city:e.target.value }))} placeholder="Bengaluru" /></div>
                <div className="field"><label className="field-label">GSTIN <span style={{ fontSize:11, color:'var(--gray-400)', fontWeight:400 }}>(for GST invoices)</span></label>
                  <input className="field-input" value={shopForm.gstin} onChange={e => setShopForm(f => ({ ...f, gstin:e.target.value.toUpperCase() }))} placeholder="29AABCU9603R1ZQ" maxLength={15} /></div>
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:8 }}>Dashboard language</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {LANGS.map(l => (
                    <button key={l.code} onClick={() => changeLang(l.code)}
                      style={{ padding:'5px 12px', borderRadius:999, border:`1.5px solid ${currentLang === l.code ? 'var(--green)' : 'var(--gray-200)'}`, background: currentLang === l.code ? 'var(--green-light)' : 'white', fontSize:12, fontWeight: currentLang === l.code ? 700 : 400, cursor:'pointer', color: currentLang === l.code ? 'var(--green-darker)' : 'var(--gray-600)' }}>
                      {l.native}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" style={{ width:'fit-content' }} onClick={save} disabled={saving}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </div>
        )}

        {section === 'hours' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Opening Hours</div><div className="card-subtitle">Shown on your QR menu. Customers see when you're open.</div></div>
            {DAYS.map(day => (
              <div key={day} style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 0', borderBottom:'1px solid var(--gray-100)' }}>
                <span style={{ width:90, fontSize:13, fontWeight:500 }}>{day}</span>
                <div onClick={() => setHours(h => ({ ...h, [day]: { ...h[day], open: !h[day].open } }))}
                  style={{ width:34, height:20, borderRadius:10, background: hours[day]?.open ? 'var(--green)' : 'var(--gray-300)', transition:'background .2s', position:'relative', cursor:'pointer', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:2, left: hours[day]?.open ? 14 : 2, width:16, height:16, borderRadius:8, background:'white', transition:'left .2s' }} />
                </div>
                {hours[day]?.open ? (
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="time" value={hours[day]?.from || '09:00'} onChange={e => setHours(h => ({ ...h, [day]: { ...h[day], from:e.target.value } }))}
                      style={{ height:32, border:'1px solid var(--gray-200)', borderRadius:6, padding:'0 8px', fontSize:12 }} />
                    <span style={{ color:'var(--gray-400)', fontSize:12 }}>to</span>
                    <input type="time" value={hours[day]?.to || '22:00'} onChange={e => setHours(h => ({ ...h, [day]: { ...h[day], to:e.target.value } }))}
                      style={{ height:32, border:'1px solid var(--gray-200)', borderRadius:6, padding:'0 8px', fontSize:12 }} />
                  </div>
                ) : <span style={{ fontSize:13, color:'var(--gray-400)' }}>Closed</span>}
              </div>
            ))}
            <button className="btn btn-primary" style={{ width:'fit-content', marginTop:16 }} onClick={save} disabled={saving}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save hours'}
            </button>
          </div>
        )}

        {section === 'payment' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Payment & Tax</div></div>
            <Tog k="cashEnabled"   label="Accept cash" sub="Customer pays in cash at the counter" />
            <Tog k="onlineEnabled" label="Online payments (Razorpay / UPI)" sub="QR code or link-based payment" />
            <Tog k="walletEnabled" label="AviQR wallet" sub="Customer top-up and pay from wallet" />
            <Tog k="loyaltyEnabled" label="Loyalty points" sub="Earn & redeem points on every order" />
            <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid var(--gray-100)' }}>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:10 }}>GST / Tax Settings</div>
              <div className="field" style={{ maxWidth:200 }}>
                <label className="field-label">Tax rate (%)</label>
                <input className="field-input" type="number" min="0" max="28" step="0.5"
                  value={settings.taxPercent} onChange={e => setSettings(s => ({ ...s, taxPercent:Number(e.target.value) }))} />
                <p style={{ fontSize:11, color:'var(--gray-400)', marginTop:4 }}>Standard for restaurants: 5% (no ITC) or 12% (with ITC)</p>
              </div>
            </div>
            <button className="btn btn-primary" style={{ width:'fit-content', marginTop:16 }} onClick={save} disabled={saving}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save payment settings'}
            </button>
          </div>
        )}

        {section === 'pricing' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Dynamic Pricing</div><div className="card-subtitle">Auto-adjust prices by time of day, day of week, or occasion</div></div>
            <div style={{ background:'#E1F5EE', border:'1px solid #A7F3D0', borderRadius:8, padding:'12px 16px', fontSize:13, color:'#065F46', marginBottom:16 }}>
              ⚡ Dynamic pricing is active on your Growth plan. Rules apply automatically at the scheduled times — no action needed.
            </div>
            {[
              { n:'Weekend surge',  t:'Sat & Sun (all day)',   e:'+10%',  active:true },
              { n:'Happy hour',     t:'3:00 PM – 5:00 PM',    e:'-15%',  active:true },
              { n:'Late night',     t:'9:00 PM – 11:00 PM',   e:'-20%',  active:true },
              { n:'Festival surge', t:'Diwali, Holi (custom)', e:'+15%',  active:false },
            ].map((r, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'white', borderRadius:8, border:'1px solid var(--gray-200)', marginBottom:8 }}>
                <div style={{ width:8, height:8, borderRadius:4, background: r.active ? '#1D9E75' : '#D1D5DB', flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{r.n}</div>
                  <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:1 }}>{r.t}</div>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color: r.e.startsWith('+') ? '#DC2626' : '#1D9E75', background: r.e.startsWith('+') ? '#FEF2F2' : '#E1F5EE', padding:'3px 10px', borderRadius:999 }}>{r.e}</span>
                <span style={{ fontSize:11, color: r.active ? '#1D9E75' : '#9CA3AF' }}>{r.active ? 'Active' : 'Inactive'}</span>
              </div>
            ))}
            <p style={{ fontSize:12, color:'var(--gray-400)', marginTop:12 }}>To add or remove rules, contact support or use the API.</p>
          </div>
        )}

        {section === 'notify' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Notifications</div><div className="card-subtitle">Control what alerts you receive via WhatsApp and email</div></div>
            <Tog k="notifyNewOrder"     label="New order alerts"         sub="Instant WhatsApp when a customer places an order" />
            <Tog k="notifyStatus"       label="Order status updates"     sub="When kitchen marks an order ready" />
            <Tog k="notifyDailySummary" label="Daily revenue summary"    sub="EOD summary sent at 11 PM" />
            <Tog k="notifyLowStock"     label="Low stock warnings"       sub="When an item drops below threshold" />
            <Tog k="notifyReview"       label="Customer review alerts"   sub="When a customer leaves a review" />
            <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#92400E', marginTop:12 }}>
              ⚠ WhatsApp notifications require Twilio credentials to be set in your server environment (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN).
            </div>
            <button className="btn btn-primary" style={{ width:'fit-content', marginTop:16 }} onClick={save} disabled={saving}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save notification settings'}
            </button>
          </div>
        )}

        {section === 'plan' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Plan & Billing</div></div>
            <div style={{ background:`linear-gradient(135deg,${plan.color}18,${plan.color}08)`, border:`1px solid ${plan.color}44`, borderRadius:12, padding:20, marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:plan.color, textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>Current plan</div>
              <div style={{ fontSize:26, fontWeight:800, color:'var(--gray-900)', display:'flex', alignItems:'baseline', gap:10 }}>
                {plan.name}
                <span style={{ fontSize:16, fontWeight:600, color:plan.color }}>{plan.price}</span>
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              {plan.features.map((f, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid var(--gray-100)', fontSize:13 }}>
                  <Check size={14} style={{ color:'var(--green)', flexShrink:0 }} /> {f}
                </div>
              ))}
            </div>
            {shopPlan !== 'BUSINESS' && (
              <div style={{ background:'#F5F3FF', border:'1px solid #DDD6FE', borderRadius:10, padding:16 }}>
                <div style={{ fontWeight:600, fontSize:13, color:'#5B21B6', marginBottom:4 }}>
                  Upgrade to {shopPlan === 'STARTER' ? 'Growth ₹999/mo' : 'Business ₹2,499/mo'}
                </div>
                <p style={{ fontSize:12, color:'#7C3AED', marginBottom:10 }}>
                  {shopPlan === 'STARTER' ? 'Get unlimited orders, AI features, WhatsApp, and loyalty program.' : 'Get multi-outlet, CRM, API access, and dedicated support.'}
                </p>
                <button className="btn btn-primary" onClick={() => alert('Contact support to upgrade: support@aviqr.in')}>
                  Upgrade plan <ExternalLink size={13} style={{ marginLeft:4 }} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .alert{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;font-size:13px;border:1px solid}
        .alert-error{background:var(--red-bg);border-color:#FCA5A5;color:var(--red)}
        .alert-success{background:#E1F5EE;border-color:#A7F3D0;color:#065F46}
      `}</style>
    </div>
  );
}
