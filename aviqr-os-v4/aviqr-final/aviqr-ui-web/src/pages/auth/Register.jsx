import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, Hotel, Building2, ShoppingBag, ArrowRight,
         Check, ChefHat, Utensils } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import './Auth.css';

const TYPES = [
  { key:'OWNER',    Icon:Utensils,   label:'Restaurant / Café',   desc:'Single outlet, food stall, bakery, cloud kitchen' },
  { key:'SUPPLIER', Icon:ShoppingBag,label:'Supplier / Brand',    desc:'Multi-outlet brand, franchise, chain' },
  { key:'HOTEL',    Icon:Hotel,      label:'Hotel / Resort',      desc:'Room service, spa, housekeeping via QR' },
  { key:'MALL',     Icon:Building2,  label:'Mall / Food Court',   desc:'Multi-vendor food court or mall' },
];

const ROLE_HOME = {
  OWNER:'/dashboard', SUPPLIER:'/supplier', HOTEL:'/hotel', MALL:'/mall',
};

const STEPS = ['Choose type','Your details','Done'];

export default function Register() {
  const nav = useNavigate();
  const { register, demoLogin } = useAuth();
  const [step, setStep]     = useState(1);
  const [role, setRole]     = useState('OWNER');
  const [form, setForm]     = useState({ name:'', email:'', phone:'', password:'' });
  const [loading, setLoad]  = useState(false);
  const [error, setErr]     = useState('');
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return setErr('Please fill all required fields');
    setLoad(true); setErr('');
    try {
      const user = await register({ ...form, role });
      nav(ROLE_HOME[user.role] || '/dashboard');
    } catch (err) {
      setErr(err.response?.data?.message || 'Registration failed. Use a demo button to test without backend.');
    } finally { setLoad(false); }
  };

  return (
    <div className="auth-page">
      {/* ── Left panel ── */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <span>🍽️</span>
          </div>
          <h1 className="auth-brand-name">Avi<em>QR</em></h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 6 }}>
            Restaurant &amp; Hotel OS
          </p>
        </div>

        {/* Step tracker */}
        <div className="register-steps-visual">
          {STEPS.map((s, i) => (
            <div key={s} className={`reg-step${step > i+1 ? ' done' : step === i+1 ? ' active' : ''}`}>
              <div className="reg-step-dot">
                {step > i+1 ? <Check size={12}/> : i+1}
              </div>
              <span>{s}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right">
        <div className="auth-form-wrap">

          {step === 1 && (
            <>
              <div className="auth-form-header">
                <h1 className="auth-title">Create your account</h1>
                <p className="auth-subtitle">What best describes your business?</p>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {TYPES.map(({ key, Icon, label, desc }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRole(key)}
                    style={{
                      display:'flex', alignItems:'center', gap:16,
                      padding:'16px 20px',
                      background: role===key ? '#E1F5EE' : '#fff',
                      border: `2px solid ${role===key ? '#1D9E75' : '#E5E7EB'}`,
                      borderRadius:12, cursor:'pointer', textAlign:'left',
                      transition:'all .15s', position:'relative',
                    }}>
                    <div style={{
                      width:44, height:44, borderRadius:10, flexShrink:0,
                      background: role===key ? '#1D9E75' : '#F3F4F6',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <Icon size={20} color={role===key ? '#fff' : '#6B7280'}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:'#111827' }}>{label}</div>
                      <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>{desc}</div>
                    </div>
                    {role===key && (
                      <div style={{
                        width:22, height:22, borderRadius:11,
                        background:'#1D9E75', display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        <Check size={12} color="#fff"/>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button className="auth-btn" onClick={() => setStep(2)}>
                Continue <ArrowRight size={15}/>
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="auth-form-header">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#6B7280', fontSize:13, fontWeight:600, padding:0, marginBottom:12, display:'flex', alignItems:'center', gap:4 }}>
                  ← Back
                </button>
                <h1 className="auth-title">Your details</h1>
                <p className="auth-subtitle">
                  Setting up as <strong>{TYPES.find(t=>t.key===role)?.label}</strong>
                </p>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="field">
                  <label className="field-label">Full Name *</label>
                  <input className="field-input" type="text" placeholder="Sujeet Narayanan"
                    value={form.name} onChange={e=>set('name',e.target.value)} required/>
                </div>
                <div className="field">
                  <label className="field-label">Email *</label>
                  <input className="field-input" type="email" placeholder="you@restaurant.in"
                    value={form.email} onChange={e=>set('email',e.target.value)} required/>
                </div>
                <div className="field">
                  <label className="field-label">Phone</label>
                  <input className="field-input" type="tel" placeholder="9845012345"
                    value={form.phone} onChange={e=>set('phone',e.target.value)}/>
                </div>
                <div className="field">
                  <label className="field-label">Password *</label>
                  <input className="field-input" type="password" placeholder="Minimum 8 characters"
                    value={form.password} onChange={e=>set('password',e.target.value)} required/>
                </div>
                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? 'Creating account…' : <><span>Create account</span> <ArrowRight size={15}/></>}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
