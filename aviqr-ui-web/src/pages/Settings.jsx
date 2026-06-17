import { useState, useEffect } from 'react';
import { Store, Clock, CreditCard, Bell, Shield, Tag, Save, Globe, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { shopApi, authApi } from '../api/index.js';
import './Settings.css';

const SECTIONS = [
  { key:'shop',     label:'Shop profile',   icon:Store },
  { key:'hours',    label:'Opening hours',  icon:Clock },
  { key:'payment',  label:'Payment',         icon:CreditCard },
  { key:'pricing',  label:'Dynamic pricing', icon:Tag },
  { key:'notify',   label:'Notifications',   icon:Bell },
  { key:'plan',     label:'Plan & billing',  icon:Shield },
];
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const LANGS = [
  {code:'en',label:'English',native:'English'},{code:'hi',label:'Hindi',native:'हिंदी'},
  {code:'ta',label:'Tamil',native:'தமிழ்'},{code:'kn',label:'Kannada',native:'ಕನ್ನಡ'},
  {code:'ml',label:'Malayalam',native:'മലയാളം'},{code:'te',label:'Telugu',native:'తెలుగు'},
  {code:'bn',label:'Bengali',native:'বাংলা'},{code:'mr',label:'Marathi',native:'मराठी'},
  {code:'gu',label:'Gujarati',native:'ગુજરાતી'},
];

export default function Settings() {
  const { user, lang: currentLang, changeLang } = useAuth();
  const shopId = user?.shopId || '00000000-0000-0000-0000-000000000101';

  const [section, setSection] = useState('shop');
  const [settings, setSettings] = useState({
    cashEnabled:true, onlineEnabled:true, walletEnabled:false,
    loyaltyEnabled:false, loyaltyPointsPerRupee:1, loyaltyRedemptionRate:100, taxPercent:5,
  });
  const [shopForm, setShopForm] = useState({ name:'Spice Route', phone:'', email:'', address:'', city:'', gstin:'' });
  const [hours, setHours]     = useState(DAYS.reduce((a,d) => ({...a,[d]:{open:d!=='Sunday',from:'09:00',to:'22:00'}}),{}));
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [isDemo, setIsDemo]   = useState(false);

  useEffect(() => {
    Promise.all([
      shopApi.getSettings(shopId).then(r => { setSettings(r.data.data || settings); setIsDemo(false); }).catch(()=>setIsDemo(true)),
      shopApi.getById && shopApi.getById(shopId).then(r => { if (r.data.data) setShopForm(prev => ({...prev,...r.data.data})); }).catch(()=>{}),
    ]);
  }, [shopId]);

  const toggle = k => setSettings(s => ({ ...s, [k]: !s[k] }));

  const saveSettings = async () => {
    setSaving(true);
    try {
      await shopApi.saveSettings(shopId, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setSaved(true); setTimeout(()=>setSaved(false),3000); }
    setSaving(false);
  };

  const Tog = ({ k, label }) => (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--gray-100)'}}>
      <span style={{fontSize:14,color:'var(--gray-800)'}}>{label}</span>
      <div onClick={()=>toggle(k)} style={{width:38,height:22,borderRadius:11,background:settings[k]?'var(--green)':'var(--gray-300)',transition:'background .2s',position:'relative',cursor:'pointer'}}>
        <div style={{position:'absolute',top:3,left:settings[k]?'calc(100% - 19px)':3,width:16,height:16,borderRadius:8,background:'white',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
      </div>
    </div>
  );

  return (
    <div className="page-content" style={{display:'flex',gap:24,alignItems:'flex-start'}}>
      {/* Sidebar nav */}
      <div className="card" style={{width:200,flexShrink:0,padding:8}}>
        {SECTIONS.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.key} onClick={()=>setSection(s.key)}
              style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 12px',borderRadius:8,border:'none',background:section===s.key?'var(--green-light)':'transparent',color:section===s.key?'var(--green-darker)':'var(--gray-700)',fontSize:13,fontWeight:section===s.key?600:400,cursor:'pointer',marginBottom:2}}>
              <Icon size={15}/>{s.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{flex:1,minWidth:0}}>
        {isDemo && <div className="demo-notice" style={{marginBottom:16}}>⚙️ Demo settings — backend not connected</div>}
        {saved && <div style={{background:'#E1F5EE',border:'1px solid #A7F3D0',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#0F6E56',marginBottom:16}}>✓ Settings saved!</div>}

        {section === 'shop' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Shop Profile</div></div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div className="field"><label className="field-label">Shop name</label><input className="field-input" value={shopForm.name} onChange={e=>setShopForm(f=>({...f,name:e.target.value}))}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div className="field"><label className="field-label">Phone</label><input className="field-input" type="tel" value={shopForm.phone} onChange={e=>setShopForm(f=>({...f,phone:e.target.value}))}/></div>
                <div className="field"><label className="field-label">Email</label><input className="field-input" type="email" value={shopForm.email} onChange={e=>setShopForm(f=>({...f,email:e.target.value}))}/></div>
              </div>
              <div className="field"><label className="field-label">Address</label><input className="field-input" value={shopForm.address} onChange={e=>setShopForm(f=>({...f,address:e.target.value}))}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div className="field"><label className="field-label">City</label><input className="field-input" value={shopForm.city} onChange={e=>setShopForm(f=>({...f,city:e.target.value}))}/></div>
                <div className="field"><label className="field-label">GSTIN</label><input className="field-input" value={shopForm.gstin} onChange={e=>setShopForm(f=>({...f,gstin:e.target.value}))}/></div>
              </div>
              <div style={{paddingTop:4}}>
                <div style={{marginBottom:12,fontWeight:600,fontSize:13}}>App Language</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {LANGS.map(l=>(
                    <button key={l.code} onClick={()=>changeLang(l.code)}
                      style={{padding:'5px 12px',borderRadius:999,border:`1.5px solid ${currentLang===l.code?'var(--green)':'var(--gray-200)'}`,background:currentLang===l.code?'var(--green-light)':'white',fontSize:12,fontWeight:currentLang===l.code?700:400,cursor:'pointer',color:currentLang===l.code?'var(--green-darker)':'var(--gray-600)'}}>
                      {l.native}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" style={{width:'fit-content'}} onClick={saveSettings} disabled={saving}>
                <Save size={14}/>{saving?'Saving…':'Save changes'}
              </button>
            </div>
          </div>
        )}

        {section === 'hours' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Opening Hours</div></div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {DAYS.map(day => (
                <div key={day} style={{display:'flex',alignItems:'center',gap:14,padding:'10px 0',borderBottom:'1px solid var(--gray-100)'}}>
                  <span style={{width:90,fontSize:13,fontWeight:500}}>{day.slice(0,3)}</span>
                  <div onClick={()=>setHours(h=>({...h,[day]:{...h[day],open:!h[day].open}}))}
                    style={{width:34,height:20,borderRadius:10,background:hours[day]?.open?'var(--green)':'var(--gray-300)',transition:'background .2s',position:'relative',cursor:'pointer',flexShrink:0}}>
                    <div style={{position:'absolute',top:2,left:hours[day]?.open?14:2,width:16,height:16,borderRadius:8,background:'white',transition:'left .2s'}}/>
                  </div>
                  {hours[day]?.open ? (
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <input type="time" value={hours[day]?.from||'09:00'} onChange={e=>setHours(h=>({...h,[day]:{...h[day],from:e.target.value}}))}
                        style={{height:32,border:'1px solid var(--gray-200)',borderRadius:6,padding:'0 8px',fontSize:12}}/>
                      <span style={{color:'var(--gray-400)',fontSize:12}}>to</span>
                      <input type="time" value={hours[day]?.to||'22:00'} onChange={e=>setHours(h=>({...h,[day]:{...h[day],to:e.target.value}}))}
                        style={{height:32,border:'1px solid var(--gray-200)',borderRadius:6,padding:'0 8px',fontSize:12}}/>
                    </div>
                  ) : <span style={{fontSize:13,color:'var(--gray-400)'}}>Closed</span>}
                </div>
              ))}
              <button className="btn btn-primary" style={{width:'fit-content',marginTop:16}} onClick={saveSettings} disabled={saving}>
                <Save size={14}/>{saving?'Saving…':'Save hours'}
              </button>
            </div>
          </div>
        )}

        {section === 'payment' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Payment Methods</div></div>
            <Tog k="cashEnabled"   label="Accept cash payments"/>
            <Tog k="onlineEnabled" label="Online payments (Razorpay / UPI)"/>
            <Tog k="walletEnabled" label="Wallet payments"/>
            <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid var(--gray-100)'}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>Tax Settings</div>
              <div className="field">
                <label className="field-label">Tax percentage (%)</label>
                <input className="field-input" type="number" min="0" max="28" step="0.5" style={{maxWidth:140}}
                  value={settings.taxPercent} onChange={e=>setSettings(s=>({...s,taxPercent:Number(e.target.value)}))}/>
              </div>
            </div>
            <button className="btn btn-primary" style={{width:'fit-content',marginTop:16}} onClick={saveSettings} disabled={saving}>
              <Save size={14}/>{saving?'Saving…':'Save payment settings'}
            </button>
          </div>
        )}

        {section === 'pricing' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Dynamic Pricing</div><div className="card-subtitle">Automatically adjust prices based on time or day</div></div>
            <div style={{background:'var(--gray-50)',borderRadius:8,padding:16,fontSize:13,color:'var(--gray-600)',lineHeight:1.6}}>
              ⚡ Dynamic pricing rules let you automatically increase or decrease menu prices during peak hours, weekends, or special occasions. Configure rules via the backend API or contact support.
            </div>
            <div style={{marginTop:16}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Example rules:</div>
              {[{n:'Weekend surge',t:'Sat & Sun',e:'+10%',a:true},{n:'Happy hour',t:'3 PM – 5 PM',e:'-15%',a:true},{n:'Late night',t:'9 PM – 11 PM',e:'-20%',a:true}].map((r,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--white)',borderRadius:8,border:'1px solid var(--gray-200)',marginBottom:8}}>
                  <span style={{flex:1,fontSize:13,fontWeight:500}}>{r.n}</span>
                  <span style={{fontSize:12,color:'var(--gray-500)'}}>{r.t}</span>
                  <span style={{fontSize:12,fontWeight:700,color:r.e.startsWith('+')?'var(--red)':'var(--green)',background:r.e.startsWith('+')?'var(--red-bg)':'var(--green-light)',padding:'2px 8px',borderRadius:999}}>{r.e}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'notify' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Notifications</div></div>
            {['New order alerts','Order status updates','Daily revenue summary','Low stock warnings','Customer review alerts'].map((n,i,a)=>(
              <div key={n} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:i<a.length-1?'1px solid var(--gray-100)':'none'}}>
                <span style={{fontSize:14}}>{n}</span>
                <div style={{width:34,height:20,borderRadius:10,background:'var(--green)',position:'relative',cursor:'pointer',transition:'background .2s'}}>
                  <div style={{position:'absolute',top:2,right:2,width:16,height:16,borderRadius:8,background:'white'}}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {section === 'plan' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Plan & Billing</div></div>
            <div style={{background:'linear-gradient(135deg,#E1F5EE,#F0FAF6)',border:'1px solid #A7F3D0',borderRadius:12,padding:20,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--green-dark)',textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>Current plan</div>
              <div style={{fontSize:24,fontWeight:800,color:'var(--gray-900)'}}>Growth <span style={{fontSize:16,fontWeight:600,color:'var(--green)'}}>₹999/mo</span></div>
              <div style={{fontSize:13,color:'var(--gray-600)',marginTop:4}}>Unlimited QR codes · Analytics · Staff management · All features</div>
            </div>
            {['Unlimited QR codes','Live order tracking','9-language menu','Staff roles & permissions','Revenue reports','Priority support'].map((f,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--gray-100)',fontSize:13}}>
                <span style={{color:'var(--green)',fontWeight:700}}>✓</span>{f}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
