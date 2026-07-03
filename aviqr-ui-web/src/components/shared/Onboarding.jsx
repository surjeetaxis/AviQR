import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLang } from './LangPicker.jsx';
import { t, LANGUAGES } from '../../i18n/translations.js';
import { LangPicker } from './LangPicker.jsx';
import {
  Store, Hotel, Building2, ShoppingBag, MapPin, Phone, Globe,
  Upload, Camera, Check, ChevronRight, QrCode, Sparkles,
  Clock, CreditCard, Users, Star, ArrowRight
} from 'lucide-react';
import './Onboarding.css';

// Steps per role
const STEPS = {
  owner: [
    { id:'welcome',   title:'Welcome to AviQR',         sub:'Let\'s set up your digital menu in 4 quick steps.' },
    { id:'shop',      title:'Tell us about your shop',   sub:'This appears on your customer menu page.' },
    { id:'menu',      title:'How will you add your menu?',sub:'Choose the easiest way for you.' },
    { id:'qr',        title:'Your QR code is ready!',    sub:'Print it and let customers start ordering.' },
  ],
  hotel: [
    { id:'welcome',   title:'Welcome to AviQR Hotel',   sub:'Set up your hotel QR system in 4 steps.' },
    { id:'hotel',     title:'Tell us about your hotel',  sub:'This appears on your guest QR pages.' },
    { id:'rooms',     title:'Set up your rooms',         sub:'Add your room types and numbers.' },
    { id:'services',  title:'Enable hotel services',     sub:'Choose which services guests can request.' },
  ],
  mall: [
    { id:'welcome',   title:'Welcome to AviQR Mall',    sub:'Set up your mall QR system in 4 steps.' },
    { id:'mall',      title:'Tell us about your mall',   sub:'This appears on your food court QR.' },
    { id:'vendors',   title:'Add your first vendors',    sub:'Invite vendors to join your QR system.' },
    { id:'qr',        title:'Mall QR is ready!',         sub:'Place it at mall entrances and kiosks.' },
  ],
  supplier: [
    { id:'welcome',   title:'Welcome to AviQR Brands',  sub:'Set up your brand in 4 quick steps.' },
    { id:'brand',     title:'Tell us about your brand',  sub:'This appears across all your outlets.' },
    { id:'outlets',   title:'Add your outlets',          sub:'How many locations do you have?' },
    { id:'sync',      title:'Central menu sync',         sub:'One menu, all outlets — automatic.' },
  ],
};

const MENU_OPTIONS = [
  { id:'manual', icon:'✏️', title:'Add manually',       desc:'Add categories and items one by one' },
  { id:'ocr',    icon:'📷', title:'Upload menu photo',   desc:'Take a photo of your printed menu — AI reads it' },
  { id:'pdf',    icon:'📄', title:'Upload PDF menu',     desc:'Extract items from your existing PDF menu' },
];

const HOTEL_SERVICES = [
  { id:'roomservice', icon:'🍽', label:'Room Service' },
  { id:'laundry',     icon:'👕', label:'Laundry' },
  { id:'spa',         icon:'💆', label:'Spa & Wellness' },
  { id:'housekeeping',icon:'🧹', label:'Housekeeping' },
  { id:'maintenance', icon:'🔧', label:'Maintenance' },
  { id:'transport',   icon:'🚗', label:'Airport Transport' },
];

export default function Onboarding() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLang();
  const role = (user?.role || 'owner').toLowerCase();
  const steps = STEPS[role] || STEPS.owner;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name:'', address:'', phone:'', website:'', menuOption:'ocr', services:['roomservice','laundry'] });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const ROUTES = { owner:'/dashboard', hotel:'/hotel', mall:'/mall', supplier:'/supplier', admin:'/admin' };

  const finish = () => navigate(ROUTES[role] || '/dashboard');

  const progress = Math.round((step / (steps.length - 1)) * 100);

  return (
    <div className="onb-page">
      {/* Header */}
      <div className="onb-topbar">
        <div className="onb-brand">
          <QrCode size={18} style={{color:'var(--green)'}}/> <span>Avi<em>QR</em></span>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <LangPicker />
          <button className="onb-skip" onClick={finish}>{t('skip', lang)}</button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="onb-progress-bar">
        <div className="onb-progress-fill" style={{width:`${progress}%`}}/>
      </div>

      {/* Step dots */}
      <div className="onb-dots">
        {steps.map((_,i)=>(
          <div key={i} className={`onb-dot ${i<=step?'active':''} ${i<step?'done':''}`}/>
        ))}
      </div>

      <div className="onb-body">
        <div className="onb-card">
          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div className="onb-step">
              <div className="onb-welcome-icon">
                {role==='hotel'?'🏨':role==='mall'?'🏬':role==='supplier'?'📦':'🏪'}
              </div>
              <h1 className="onb-title">{t('welcome', lang)}</h1>
              <p className="onb-sub">{steps[0].sub}</p>
              <div className="onb-lang-select">
                <div className="onb-lang-label">Choose your preferred language:</div>
                <div className="onb-lang-grid">
                  {LANGUAGES.map(l=>(
                    <button key={l.code}
                      className={`onb-lang-chip ${lang===l.code?'active':''}`}
                      onClick={()=>{}}>
                      {l.flag} {l.native}
                    </button>
                  ))}
                </div>
              </div>
              <div className="onb-feature-list">
                {role==='owner'&&[
                  {icon:'⚡',text:'Go live in under 10 minutes'},
                  {icon:'📱',text:'Customers scan & order — no app needed'},
                  {icon:'💸',text:'Online + cash payments supported'},
                ].map(f=>(
                  <div key={f.text} className="onb-feature-item"><span>{f.icon}</span>{f.text}</div>
                ))}
                {role==='hotel'&&[
                  {icon:'🔔',text:'Room service, laundry, spa — one QR per room'},
                  {icon:'⚡',text:'Guests request without calling reception'},
                  {icon:'📊',text:'Track all requests in real time'},
                ].map(f=>(
                  <div key={f.text} className="onb-feature-item"><span>{f.icon}</span>{f.text}</div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — Shop/Hotel/Mall/Brand details */}
          {step === 1 && (
            <div className="onb-step">
              <h1 className="onb-title">{steps[1].title}</h1>
              <p className="onb-sub">{steps[1].sub}</p>
              <div className="onb-form">
                <div className="onb-field">
                  <label>{role==='hotel'?'Hotel name':role==='mall'?'Mall name':role==='supplier'?'Brand name':'Shop name'} *</label>
                  <input placeholder="e.g. Spice Route" value={form.name} onChange={e=>set('name',e.target.value)}/>
                </div>
                <div className="onb-field">
                  <label>Phone *</label>
                  <input type="tel" placeholder="+91 98450 12345" value={form.phone} onChange={e=>set('phone',e.target.value)}/>
                </div>
                <div className="onb-field">
                  <label>Address</label>
                  <input placeholder="Full address" value={form.address} onChange={e=>set('address',e.target.value)}/>
                </div>
                <div className="onb-logo-upload">
                  <div className="onb-logo-preview">{form.name?form.name[0].toUpperCase():'?'}</div>
                  <div>
                    <div className="onb-logo-label">Upload logo / photo</div>
                    <label className="onb-upload-btn">
                      <Camera size={13}/> Choose photo
                      <input type="file" accept="image/*" style={{display:'none'}}/>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Menu method / Rooms / Vendors / Outlets */}
          {step === 2 && role === 'owner' && (
            <div className="onb-step">
              <h1 className="onb-title">{steps[2].title}</h1>
              <p className="onb-sub">{steps[2].sub}</p>
              <div className="onb-menu-opts">
                {MENU_OPTIONS.map(opt=>(
                  <button key={opt.id}
                    className={`onb-menu-opt ${form.menuOption===opt.id?'active':''}`}
                    onClick={()=>set('menuOption',opt.id)}>
                    <span className="onb-menu-icon">{opt.icon}</span>
                    <div><div className="onb-menu-title">{opt.title}</div><div className="onb-menu-desc">{opt.desc}</div></div>
                    {form.menuOption===opt.id && <Check size={16} className="onb-menu-check"/>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && role === 'hotel' && (
            <div className="onb-step">
              <h1 className="onb-title">{steps[2].title}</h1>
              <p className="onb-sub">{steps[2].sub}</p>
              <div className="onb-form">
                <div className="onb-field">
                  <label>Total number of rooms</label>
                  <input type="number" placeholder="e.g. 120"/>
                </div>
                <div className="onb-field">
                  <label>Room types (comma separated)</label>
                  <input placeholder="Standard, Deluxe, Suite, Presidential"/>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (role==='mall'||role==='supplier') && (
            <div className="onb-step">
              <h1 className="onb-title">{steps[2].title}</h1>
              <p className="onb-sub">{steps[2].sub}</p>
              <div className="onb-form">
                <div className="onb-field">
                  <label>{role==='mall'?'Number of vendors':'Number of outlets'}</label>
                  <input type="number" placeholder="e.g. 24"/>
                </div>
                <div className="onb-field">
                  <label>{role==='mall'?'Invite vendor email':'First outlet name'}</label>
                  <input placeholder={role==='mall'?'vendor@restaurant.com':'Branch name'}/>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — QR / Services / Sync */}
          {step === 3 && role === 'owner' && (
            <div className="onb-step onb-step-success">
              <div className="onb-qr-ready">
                <div className="onb-qr-icon"><QrCode size={48} style={{color:'var(--green)'}}/></div>
                <h1 className="onb-title">Your QR code is ready!</h1>
                <p className="onb-sub">Scan it now to preview your customer menu. Print and place it on your tables.</p>
                <div className="onb-qr-url">aviqr.in/menu/{form.name.toLowerCase().replace(/\s+/g,'-')||'your-shop'}</div>
                <div className="onb-qr-actions">
                  <button className="onb-dl-btn">📥 Download PNG</button>
                  <button className="onb-dl-btn">🖨 Print sheet</button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && role === 'hotel' && (
            <div className="onb-step">
              <h1 className="onb-title">{steps[3].title}</h1>
              <p className="onb-sub">{steps[3].sub}</p>
              <div className="onb-services-grid">
                {HOTEL_SERVICES.map(s=>(
                  <button key={s.id}
                    className={`onb-service-chip ${form.services.includes(s.id)?'active':''}`}
                    onClick={()=>set('services', form.services.includes(s.id)?form.services.filter(x=>x!==s.id):[...form.services,s.id])}>
                    <span>{s.icon}</span> {s.label}
                    {form.services.includes(s.id)&&<Check size={12}/>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (role==='mall'||role==='supplier') && (
            <div className="onb-step onb-step-success">
              <div className="onb-qr-ready">
                <div className="onb-qr-icon"><Sparkles size={48} style={{color:'var(--green)'}}/></div>
                <h1 className="onb-title">You're all set!</h1>
                <p className="onb-sub">Your {role==='mall'?'mall':'brand'} dashboard is ready. Start managing your {role==='mall'?'vendors':'outlets'} now.</p>
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div className="onb-nav">
            {step > 0 && (
              <button className="onb-back-btn" onClick={()=>setStep(s=>s-1)}>← Back</button>
            )}
            {step < steps.length - 1 ? (
              <button className="onb-next-btn" onClick={()=>setStep(s=>s+1)}>
                {t('next', lang)} <ChevronRight size={16}/>
              </button>
            ) : (
              <button className="onb-next-btn" onClick={finish}>
                {t('finish', lang)} <ArrowRight size={16}/>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
