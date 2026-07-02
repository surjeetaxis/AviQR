import { useState } from 'react';
import { Check, Zap, Crown, Building2, Star, CreditCard, Download, AlertCircle, ArrowRight } from 'lucide-react';
import { useLang } from './LangPicker.jsx';
import { t } from '../../i18n/translations.js';
import './Subscription.css';

const PLANS = {
  owner: [
    { id:'free',     name:'Starter',  price:0,    period:'forever', color:'gray',   icon:Star,     tag:null,
      features:['Up to 20 menu items','50 orders/day','1 QR code','Basic analytics','Email support'] },
    { id:'growth',   name:'Growth',   price:999,  period:'month',   color:'green',  icon:Zap,      tag:'Most popular',
      features:['Unlimited items & orders','Dynamic pricing','OCR menu upload','Staff roles (10)','Loyalty & wallet','WhatsApp campaigns','Priority support'] },
    { id:'business', name:'Business', price:2499, period:'month',   color:'purple', icon:Crown,    tag:null,
      features:['Everything in Growth','Multi-outlet dashboard','CRM & retention','AI recommendations','API access','Dedicated support','Custom QR design'] },
  ],
  hotel: [
    { id:'basic',    name:'Hotel Basic',   price:1499, period:'month', color:'gray',   icon:Star,   tag:null,
      features:['Up to 50 rooms','Room service QR','Basic guest requests','Order tracking','Email support'] },
    { id:'pro',      name:'Hotel Pro',     price:3499, period:'month', color:'green',  icon:Zap,    tag:'Recommended',
      features:['Unlimited rooms','All service types','Housekeeping module','Laundry & spa','Maintenance tracking','Analytics dashboard','Priority support'] },
    { id:'resort',   name:'Resort Suite',  price:7999, period:'month', color:'purple', icon:Crown,  tag:null,
      features:['Everything in Pro','Multi-property','Guest loyalty','PMS integration','Custom branding','API access','Dedicated manager'] },
  ],
  mall: [
    { id:'basic',    name:'Mall Basic',    price:2499, period:'month', color:'gray',   icon:Star,   tag:null,
      features:['Up to 10 vendors','Mall QR code','Basic analytics','Vendor management','Email support'] },
    { id:'pro',      name:'Mall Pro',      price:5999, period:'month', color:'green',  icon:Zap,    tag:'Recommended',
      features:['Unlimited vendors','Revenue sharing','Commission tracking','All QR types','Vendor billing','Reports','Priority support'] },
    { id:'enterprise',name:'Enterprise',  price:14999,period:'month', color:'purple', icon:Crown,  tag:null,
      features:['Everything in Pro','Multi-mall management','Custom integrations','Footfall analytics','API access','Dedicated team'] },
  ],
  supplier: [
    { id:'basic',    name:'Brand Basic',   price:1999, period:'month', color:'gray',   icon:Star,   tag:null,
      features:['Up to 3 outlets','Central menu sync','Basic reports','Order management','Email support'] },
    { id:'pro',      name:'Brand Pro',     price:4499, period:'month', color:'green',  icon:Zap,    tag:'Most popular',
      features:['Up to 10 outlets','Central pricing','Analytics','Loyalty sync','Staff roles','Priority support'] },
    { id:'enterprise',name:'Enterprise',  price:9999, period:'month', color:'purple', icon:Crown,  tag:null,
      features:['Unlimited outlets','Franchise management','AI analytics','API access','Custom branding','Dedicated manager'] },
  ],
};

const BILLING = [
  { date:'14 Jun 2025', amount:'₹999', invoice:'INV-2025-06', status:'Paid' },
  { date:'14 May 2025', amount:'₹999', invoice:'INV-2025-05', status:'Paid' },
  { date:'14 Apr 2025', amount:'₹999', invoice:'INV-2025-04', status:'Paid' },
];

export default function SubscriptionPage({ userRole = 'owner', currentPlan = 'growth' }) {
  const { lang } = useLang();
  const [activePlan, setActivePlan] = useState(currentPlan);
  const [selected, setSelected] = useState(currentPlan);
  const [billing, setBilling] = useState('monthly');
  const plans = PLANS[userRole] || PLANS.owner;

  const upgrade = (plan) => {
    if (!confirm(`Switch to ${plan.name}? This is a demo — no payment will be charged.`)) return;
    setActivePlan(plan.id);
    setSelected(plan.id);
    alert(`Plan updated to ${plan.name}.`);
  };

  const cancelPlan = () => {
    const fallback = plans[0];
    if (!confirm(`Cancel your ${plans.find(p=>p.id===activePlan)?.name} plan and move to ${fallback.name}?`)) return;
    setActivePlan(fallback.id);
    setSelected(fallback.id);
    alert(`Plan cancelled — you're now on ${fallback.name}.`);
  };

  const COLOR = { gray:'var(--gray-400)', green:'var(--green)', purple:'var(--purple)' };

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
          const price = billing==='yearly' ? Math.round(plan.price * 0.8) : plan.price;
          const isCurrent = plan.id === activePlan;
          return (
            <div key={plan.id} className={`sub-plan-card ${selected===plan.id?'is-selected':''} ${isCurrent?'is-current':''}`}
              onClick={()=>setSelected(plan.id)}>
              {plan.tag && <div className="sub-plan-tag">{plan.tag}</div>}
              {isCurrent && <div className="sub-current-tag">Current</div>}
              <div className="sub-plan-icon" style={{background:plan.color==='green'?'var(--green-light)':plan.color==='purple'?'var(--purple-bg)':'var(--gray-100)'}}>
                <Icon size={20} style={{color:COLOR[plan.color]}}/>
              </div>
              <div className="sub-plan-name">{plan.name}</div>
              <div className="sub-plan-price">
                {plan.price===0 ? 'Free' : <>₹{price.toLocaleString('en-IN')}<span>/mo</span></>}
              </div>
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
