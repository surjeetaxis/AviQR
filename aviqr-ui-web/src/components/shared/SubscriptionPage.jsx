import { useState, useEffect } from 'react';
import { Check, Zap, Crown, Building2, Star, CreditCard, Download, AlertCircle, ArrowRight } from 'lucide-react';
import { useLang } from './LangPicker.jsx';
import { t } from '../../i18n/translations.js';
import { planApi, offerApi } from '../../api/index.js';
import './Subscription.css';

// Maps this page's userRole prop to the Plan.vertical values admin manages
// in Subscription Management (AdminDashboard "Manage Plans" tab).
const VERTICAL_MAP = { owner:'SHOP', hotel:'HOTEL', mall:'MALL', supplier:'SUPPLIER' };
const TIER_ICONS  = [Star, Zap, Crown];
const TIER_COLORS = ['gray', 'green', 'purple'];

const BILLING = [
  { date:'14 Jun 2025', amount:'₹999', invoice:'INV-2025-06', status:'Paid' },
  { date:'14 May 2025', amount:'₹999', invoice:'INV-2025-05', status:'Paid' },
  { date:'14 Apr 2025', amount:'₹999', invoice:'INV-2025-04', status:'Paid' },
];

export default function SubscriptionPage({ userRole = 'owner', currentPlan = 'growth' }) {
  const { lang } = useLang();
  const [plans, setPlans]     = useState([]);
  const [offers, setOffers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState(currentPlan);
  const [selected, setSelected]     = useState(currentPlan);
  const [billing, setBilling] = useState('monthly');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const vertical = VERTICAL_MAP[userRole] || 'SHOP';
        const [planRes, offerRes] = await Promise.all([planApi.listPublic(vertical), offerApi.listActive()]);
        const live = (planRes.data?.data || [])
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          .map((p, i) => ({
            id: p.planKey,
            name: p.label,
            price: p.price,
            color: TIER_COLORS[Math.min(i, TIER_COLORS.length - 1)],
            icon: TIER_ICONS[Math.min(i, TIER_ICONS.length - 1)],
            tag: i === 1 ? 'Recommended' : null,
            features: (p.features || '').split('\n').map(f => f.trim()).filter(Boolean),
          }));
        setPlans(live);
        setOffers(offerRes.data?.data || []);
      } catch { setPlans([]); }
      finally { setLoading(false); }
    })();
  }, [userRole]);

  useEffect(() => { setActivePlan(currentPlan); setSelected(currentPlan); }, [currentPlan]);

  const upgrade = (plan) => {
    if (!confirm(`Switch to ${plan.name}? This is a demo — no payment will be charged.`)) return;
    setActivePlan(plan.id);
    setSelected(plan.id);
    alert(`Plan updated to ${plan.name}.`);
  };

  const cancelPlan = () => {
    const fallback = plans[0];
    if (!fallback) return;
    if (!confirm(`Cancel your ${plans.find(p=>p.id===activePlan)?.name} plan and move to ${fallback.name}?`)) return;
    setActivePlan(fallback.id);
    setSelected(fallback.id);
    alert(`Plan cancelled — you're now on ${fallback.name}.`);
  };

  const offerFor = (planKey) => offers.find(o => o.applicablePlans === 'ALL'
    || (o.applicablePlans || '').split(',').map(s => s.trim()).includes(planKey));

  const COLOR = { gray:'var(--gray-400)', green:'var(--green)', purple:'var(--purple)' };

  if (loading) {
    return <div className="sub-page"><p style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading plans…</p></div>;
  }
  if (plans.length === 0) {
    return <div className="sub-page"><p style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>No plans configured yet — check back soon.</p></div>;
  }

  return (
    <div className="sub-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('subscription', lang)}</h1>
          <p className="page-subtitle">{t('currentPlan', lang)}: <strong style={{color:'var(--green)'}}>
            {plans.find(p=>p.id===activePlan)?.name || 'Growth'}</strong>
          </p>
        </div>
        <div className="sub-billing-toggle">
          <button className={`sub-toggle-btn ${billing==='monthly'?'active':''}`} onClick={()=>setBilling('monthly')}>Monthly</button>
          <button className={`sub-toggle-btn ${billing==='yearly'?'active':''}`} onClick={()=>setBilling('yearly')}>
            Yearly <span className="sub-save-badge">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Current plan banner */}
      <div className="sub-current-banner">
        <div className="sub-current-left">
          <Crown size={18} style={{color:'var(--green)'}}/>
          <div>
            <div className="sub-current-name">{plans.find(p=>p.id===activePlan)?.name}</div>
            <div className="sub-current-meta">Next billing: 14 July 2025 · Auto-debit HDFC ****4821</div>
          </div>
        </div>
        <button className="sub-manage-btn" onClick={()=>alert('Billing portal is not available in this demo environment.')}>Manage billing</button>
      </div>

      {/* Plans */}
      <div className="sub-plans-grid">
        {plans.map(plan => {
          const Icon = plan.icon;
          const basePrice = billing==='yearly' ? Math.round(plan.price * 0.8) : plan.price;
          const offer = offerFor(plan.id);
          const price = offer ? Math.round(basePrice * (1 - offer.discountPercent / 100)) : basePrice;
          const isCurrent = plan.id === activePlan;
          return (
            <div key={plan.id} className={`sub-plan-card ${selected===plan.id?'is-selected':''} ${isCurrent?'is-current':''}`}
              onClick={()=>setSelected(plan.id)}>
              {offer && !isCurrent && <div className="sub-plan-tag" style={{ background:'#DC2626' }}>{offer.discountPercent}% OFF</div>}
              {!offer && plan.tag && !isCurrent && <div className="sub-plan-tag">{plan.tag}</div>}
              {isCurrent && <div className="sub-current-tag">Current</div>}
              <div className="sub-plan-icon" style={{background:plan.color==='green'?'var(--green-light)':plan.color==='purple'?'var(--purple-bg)':'var(--gray-100)'}}>
                <Icon size={20} style={{color:COLOR[plan.color]}}/>
              </div>
              <div className="sub-plan-name">{plan.name}</div>
              <div className="sub-plan-price">
                {plan.price===0 ? 'Free' : (
                  <>
                    {offer && <span style={{ textDecoration:'line-through', opacity:.5, fontSize:'0.6em', marginRight:4 }}>₹{basePrice.toLocaleString('en-IN')}</span>}
                    ₹{price.toLocaleString('en-IN')}<span>/mo</span>
                  </>
                )}
              </div>
              {offer && !isCurrent && <div style={{ fontSize:11, color:'#DC2626', fontWeight:600, marginTop:-6, marginBottom:8 }}>🎉 {offer.title}</div>}
              <ul className="sub-plan-features">
                {plan.features.map(f=>(
                  <li key={f}><Check size={12} style={{color:'var(--green)',flexShrink:0}}/>{f}</li>
                ))}
              </ul>
              {!isCurrent && (
                <button className={`sub-plan-btn ${plan.color==='green'?'sub-btn-primary':''}`} onClick={(e)=>{e.stopPropagation(); upgrade(plan);}}>
                  {t('upgradePlan', lang)} <ArrowRight size={13}/>
                </button>
              )}
              {isCurrent && (
                <button className="sub-plan-btn sub-btn-cancel" onClick={(e)=>{e.stopPropagation(); cancelPlan();}}>Cancel plan</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Billing history */}
      <div className="sub-billing-section">
        <h2 className="sub-section-title">Billing history</h2>
        <div className="sub-billing-table">
          {BILLING.map((b,i)=>(
            <div key={i} className="sub-billing-row">
              <span className="sub-billing-date">{b.date}</span>
              <span className="sub-billing-inv">{b.invoice}</span>
              <span className="sub-billing-amount">{b.amount}</span>
              <span className="sub-billing-status">{b.status}</span>
              <button className="sub-billing-dl"><Download size={13}/> PDF</button>
            </div>
          ))}
        </div>
      </div>

      <div className="sub-tip">
        <AlertCircle size={13}/>
        Need a custom plan for enterprise or government? <a href="#" className="sub-link">Contact our sales team →</a>
      </div>
    </div>
  );
}
