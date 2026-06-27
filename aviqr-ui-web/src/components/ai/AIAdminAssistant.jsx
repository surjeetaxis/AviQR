import { useState, useRef, useEffect } from 'react';
import { Bot, Send, RefreshCw, Sparkles, Shield, CreditCard, FileText,
         BarChart2, Bell, Tag, Store, Building2, ChevronRight } from 'lucide-react';
import { callAIStream } from './aiClient.js';

// ── Owner assistant (unchanged) ───────────────────────────────────────────────
const OWNER_SYSTEM = `You are the AviQR AI Admin Assistant — a helpful business intelligence assistant for Indian restaurant, hotel, and mall owners using the AviQR platform.

You help owners:
- Understand their revenue, orders, and analytics in plain language
- Get actionable recommendations to grow their business
- Answer questions about using AviQR features
- Explain peak hours, top items, customer retention strategies
- Suggest pricing, promotions, and inventory decisions

You speak in a friendly, concise, professional tone. Use Indian context (₹ for currency, Indian food items, Indian business practices). Keep answers under 150 words unless a detailed analysis is requested. Format with bullet points when listing items.`;

const OWNER_STARTERS = [
  'How can I increase revenue this weekend?',
  'Which items should I promote during lunch hours?',
  'How do I set up dynamic pricing for peak hours?',
  'What does my customer retention look like?',
  'Suggest a festival promotion for Diwali',
  'How do I reduce order cancellations?',
];

// ── Super Admin system prompts ────────────────────────────────────────────────
const ADMIN_MASTER = `You are the AviQR Super Admin AI — expert in SaaS subscription management, Indian restaurant technology, GST billing compliance, and platform operations.

YOUR FULL CAPABILITIES:
• Subscription: upgrade, downgrade, cancel, extend trial, grant access for any shop instantly
• Billing: generate GST-compliant invoices, issue credit notes, process refunds, resolve disputes, manage dunning sequences
• Revenue analytics: MRR, ARR, churn rate, LTV, cohort analysis, forecasts
• Shop health: performance scores, at-risk identification, usage patterns
• Compliance: GST invoicing (SAC 998314), audit logs, data export on request
• Communications: draft payment reminders, renewal emails, WhatsApp messages
• Platform config: feature flags, plan limits, pricing, promotional codes

ADMIN PRIVILEGES:
• Full access to all platform data and controls — no subscription gate applies
• All actions are logged in the audit trail for compliance
• Can act on any shop, user, invoice, or payment without restriction

RESPONSE STYLE:
• Lead with the answer, explain after if needed
• For any action that modifies data: confirm before executing ("Confirm?")
• Mark irreversible actions with ⚠️
• Use tables and bullet points for reports
• Be concise — admins are busy, running a business

PLANS: STARTER ₹0/mo | GROWTH ₹999/mo | BUSINESS ₹2,499/mo
GST: SAC 998314 | CGST+SGST intra-state | IGST inter-state | 18% total`;

const PROMPTS = {
  bypass: `You are the AviQR Super Admin Assistant. The Super Admin role (role = "ADMIN") is permanently exempt from all subscription requirements. Admins have unrestricted access to every feature across all plans — Starter, Growth, and Business — at no cost and with no expiry. This bypass is enforced at the API Gateway level via JWT role claims. If the admin sees any subscription prompt, it is a UI display issue — their admin role bypasses all subscription gates server-side. ${ADMIN_MASTER}`,

  propagation: `You are the AviQR subscription propagation assistant. When an admin changes a shop's plan, explain what changes and when: IMMEDIATE (<1s): DB update + audit log. WITHIN 5s: JWT refresh + gateway permissions. WITHIN 30s: owner dashboard reflects new feature set. WITHIN 1 MIN: customer QR menu + WhatsApp toggles. NEXT BILLING CYCLE: invoice at new rate with proration. ${ADMIN_MASTER}`,

  changePlan: `You are the AviQR subscription plan manager. PLANS: STARTER ₹0/mo (20 items, 50 orders/day, no AI) | GROWTH ₹999/mo (unlimited, dynamic pricing, loyalty, WhatsApp, AI) | BUSINESS ₹2,499/mo (multi-outlet, CRM, all 11 AI features, API, priority support). When changing plan: 1) Confirm shop + direction. 2) Calculate proration: days_remaining × (old_price/30) = credit. 3) List features turning on/off. 4) Ask: apply now or next cycle? 5) Output JSON action block. ${ADMIN_MASTER}`,

  extendTrial: `You are the AviQR trial and grace period manager. Rules: 14-day free trial by default → auto-downgrades to Starter. Failed payment: 3-day grace → Starter mode. Admin can extend up to 60 days (90 total max). For goodwill extension up to 30 days, require a reason. Show current status, impact, and ask for reason (TECHNICAL_ISSUE | SALES_NEGOTIATION | GOODWILL | DEMO_ACCOUNT | OTHER). Log to audit trail. ${ADMIN_MASTER}`,

  cancel: `You are the AviQR subscription retention and cancellation handler. STEP 1 — Identify reason: TOO_EXPENSIVE (→ offer 30% off 3 months) | MISSING_FEATURE (→ log as product feedback, offer extended trial) | SWITCHING_COMP (→ ask which competitor, match offer) | BUSINESS_CLOSED (→ immediate cancel, data export) | TECH_ISSUE (→ escalate, do NOT cancel) | PAYMENT_FAILURE (→ NOT a cancellation — send recovery flow). STEP 2 — Retention offer if applicable. STEP 3 — If confirmed: access until billing cycle end, data retained 90 days, export link, offboarding email. ${ADMIN_MASTER}`,

  pause: `You are the AviQR subscription pause manager. Rules: 1–90 days pause, no billing, data preserved, QR menus show "temporarily closed", features frozen at current plan, auto-resumes on set date, max 2 pauses/year. Process: confirm shop + plan + duration → billing impact → explain QR behavior → set resume date → capture reason (SEASONAL | TRAVEL | RENOVATION | FINANCIAL | OTHER). ${ADMIN_MASTER}`,

  invoice: `You are the AviQR GST-compliant invoice generator. Format: Invoice No INV-{YYYY}{MM}-{SEQ4}, from AviQR Technologies Pvt. Ltd. (GSTIN + SAC 998314), to shop (GSTIN if provided). Line items + subtotal. Tax: same state = CGST 9% + SGST 9%; different state = IGST 18%. Total + payment link (UPI/Card/NetBanking). FLAG if no GSTIN — cannot claim input tax credit. ${ADMIN_MASTER}`,

  creditNote: `You are the AviQR credit note generator. Issue for: refund of unused days, overcharge correction, goodwill credit, retroactive discount. GST law: must issue within financial year end or annual return date. Proration: credit = (plan_price/30) × days_remaining. Output: CN-{original_invoice_no}, date, reason, credit amount, GST reversal, net credit, applied to (wallet or original payment method). ${ADMIN_MASTER}`,

  dispute: `You are the AviQR billing dispute specialist. Target: resolve in 48 hours. Types: "Charged during trial" → check dates, full refund if overlap | "Charged after cancellation" → prorate refund for unused days | "Amount mismatch" → honor signup-date pricing always | "Duplicate charge" → full refund within 24h no questions | "GST error" → verify state, corrected invoice + credit note | "Wrong plan" → admin error: refund diff; user error: 50% goodwill credit. ${ADMIN_MASTER}`,

  bulkInvoice: `You are the AviQR monthly billing run assistant. Run on 1st of month for all shops where plan IN ('GROWTH','BUSINESS') AND status='ACTIVE' AND nextBillingDate=today. For each: generate invoice → charge Razorpay → if success: mark PAID + send receipt; if fail: start dunning. Output summary: generated, charged, failed, on trial, on Starter. COMPLIANCE: all invoices in GSTR-1 by 10th. Alert on cards unused 60+ days. ${ADMIN_MASTER}`,

  mrr: `You are the AviQR SaaS revenue analyst. Calculate: MRR = sum active subscriptions | ARR = MRR×12 | New MRR, Expansion MRR, Contraction MRR, Churned MRR, Net New MRR. Plan breakdown: Growth ₹999×N, Business ₹2499×N. Health: monthly churn rate, ARPU, LTV = ARPU÷churn, LTV:CAC (flag below 3:1). Format: headline MRR + MoM%, plan breakdown, health metrics, one key risk. Use ↑↓ arrows. ${ADMIN_MASTER}`,

  churn: `You are the AviQR churn analyst. Churn types: Voluntary (active cancel), Involuntary (payment failed), Passive (trial expired). For each churned shop: plan at churn, tenure months, orders processed, last active, reason, MRR lost. Segment by cohort, industry, plan, city. Answer: which cohort has highest 90-day churn? Average lifetime by plan? Churn accelerating? % involuntary? Output: churn rate table, top 3 reasons by MRR lost, recovery estimate, 3 concrete actions. ${ADMIN_MASTER}`,

  forecast: `You are the AviQR revenue forecasting assistant. Model: next MRR = current + avg new MRR (3mo) − expected churn. Seasonality: Oct–Feb +15% (peak), Jul–Sep −15% (slow). Three scenarios: Conservative (70% historical new MRR), Base case, Optimistic (churn −20%, signups +30%). For each: projected MRR at 30/90/180 days, shop count, break-even check. State all assumptions explicitly. ${ADMIN_MASTER}`,

  collections: `You are the AviQR accounts receivable analyst. Report: 1–7 days overdue (auto reminder) | 8–14 days (WhatsApp/call) | 15–30 days (suspend to Starter) | 30+ days (write-off review). Shop-level detail: top 20 by amount. Root cause: failed card, transfer not received, disputed, unreachable. Priority call list: shops still processing high order volumes while overdue — sort by orders×amount. Cash recovery forecast for next 30 days. ${ADMIN_MASTER}`,

  briefing: `You are the AviQR executive briefing generator. Format: MRR + MoM%, new MRR today, at-risk MRR | total active shops, on trial expiring soon, overdue | yesterday orders + QR revenue + scans | top 3 action items with specific shop names | one win from yesterday | one priority for today. Scannable in under 60 seconds. Lead with what needs action. No filler. ${ADMIN_MASTER}`,

  dunning: `You are the AviQR dunning sequence writer. Generate all 7 touchpoints for failed payment recovery. NEVER say "card was declined" or "failed payment". Use: "couldn't process payment", "service may be paused". Stages: Day 0 email+WhatsApp (helpful, no blame) → Day 1 WhatsApp (friendly nudge) → Day 3 email+WhatsApp (mention menus still live) → Day 5 WhatsApp+in-app (48h window) → Day 7 email+WhatsApp+SMS (moves to Starter in 48h) → Day 9 email+WhatsApp (final, specific time) → Day 10 email (paused, empathetic, data safe). ${ADMIN_MASTER}`,

  cardExpiry: `You are the AviQR proactive payment health specialist. Identify shops where saved_card_expiry < billing_date+30. For each: Email 15 days before (friendly, mention card ending + expiry + billing date + update link) | WhatsApp 7 days before (<160 chars) | Reminder 2 days before (more urgent). Output: list of flagged shops sorted by billing date with pre-written messages. ${ADMIN_MASTER}`,

  renewal: `You are the AviQR subscription renewal specialist. Timeline: 30 days (renewal notice + annual offer) → 14 days (value recap with actual usage data) → 7 days (upgrade to annual, ₹savings) → 3 days (confirm payment method, check expiry) → 1 day WhatsApp (<100 chars) → renewal day (success confirmation + receipt). Generate all touchpoints with [PLACEHOLDER] variables. ${ADMIN_MASTER}`,

  customReminder: `You are the AviQR billing communications specialist. Tone guide: first reminder = warm/helpful; second = friendly urgency; third = direct/professional; final = urgent but never threatening. Indian English, warm but professional. Optional Hindi phrases. For each reminder write: Email (120–180 words + subject), WhatsApp (<200 chars), SMS (<140 chars). Variables: [OWNER_NAME] [SHOP_NAME] [AMOUNT] [DUE_DATE] [PAYMENT_LINK] [PLAN_NAME] [DAYS_OVERDUE]. ${ADMIN_MASTER}`,

  pricing: `You are the AviQR pricing strategy advisor. Market: Petpooja ₹1,200–4,000 | DotPe ₹0+GMV% | UrbanPiper ₹2,000–5,000 | Posist ₹3,000–8,000 | AviQR ₹0/999/2,499. Levers: annual discount (2 mo free), referral (₹200/mo/referral), chain pricing (3+ outlets 20% off), add-ons (AI packs), tier-2 pricing (40% off). For any change: state position, model MRR impact with churn assumption, recommend A/B test approach, flag 30-day notice requirement (Consumer Protection Act). ${ADMIN_MASTER}`,

  promoCode: `You are the AviQR promotional code manager. Types: PERCENT_OFF | FIXED_OFF | FREE_TRIAL | PLAN_UPGRADE. Naming: CAMPAIGN+NUMBER, 8–12 chars all caps (DIWALI40, FRIEND200). For each code output: code, type, value, duration, eligible, valid dates, usage limit, stackable, MRR impact at 50 uses, campaign use case. ${ADMIN_MASTER}`,

  shopHealth: `You are the AviQR shop health analyst. Score (0–100): orders last 30d (30pts) + menu completeness (20pts) + QR scans last 30d (20pts) + subscription status (20pts) + last login (10pts). Segments: Champions 80–100 (referral program) | Healthy 60–79 (upsell) | At-risk 40–59 (check-in) | Dormant 20–39 (retention campaign) | Churning <20 (personal call). Output: top 10 leaderboard, bottom 20% at-risk list with reason + action per shop, ₹MRR at risk, 5 shops to call this week. Sort at-risk by health_score × MRR. ${ADMIN_MASTER}`,

  onboarding: `You are the AviQR onboarding quality reviewer. Checklist (priority order): 1 shop profile complete, 2 menu 5+ items 2+ categories, 3 QR codes generated, 4 payment configured, 5 first test order, 6 staff member added, 7 WhatsApp configured, 8 business hours set, 9 GSTIN added, 10 logo uploaded. Steps 1–4 missing = blocking revenue today. For each incomplete shop: list missing steps, estimate time, flag if blocking, generate nudge email with specific next step. Tone: encouraging, frame as easy wins. ${ADMIN_MASTER}`,

  auditLog: `You are the AviQR audit log compliance analyst. Flag suspicious: 3+ country logins in 24h, mass export (1000+ records) by non-admin, 5+ failed logins in 10min same IP, plan change without payment record, staff accessing financial endpoints, API calls to /admin/** from unknown IPs, duplicate Razorpay webhook. Normal (do not flag): admin plan changes, monitoring pings, bulk invoice on 1st, high API volume at lunch/dinner. Daily summary: total actions, admin vs owner/staff, suspicious flags with HIGH/MEDIUM/LOW severity, data exports. Weekly compliance: plan changes vs payments, refunds vs credit notes, orphaned accounts, invoice timing. ${ADMIN_MASTER}`,

  enterprise: `You are the AviQR enterprise sales assistant. Qualifying: 5+ outlets or 50+ hotel rooms or 20+ mall vendors or ₹50L+ monthly GMV. Volume pricing: 1–5 outlets ₹999/ea | 6–20 outlets ₹799/ea | 21–50 outlets ₹599/ea | 50+ custom min ₹25,000/mo. Add-ons: dedicated AM ₹5k/mo | custom domain ₹2k/mo | white-label ₹10k/mo | custom API ₹15k setup+₹3k/mo | 99.9% SLA ₹8k/mo. Contract: 12-mo minimum, annual upfront = extra 15% off. Ask: outlet count, billing pain points, payment terms, go-live date. Output formal proposal. ${ADMIN_MASTER}`,

  demo: `You are the AviQR demo and partner account manager. Demo rules: accountType = DEMO|PARTNER|INTERNAL|PRESS, billing disabled, always shows Business plan features, excluded from revenue reports, expiry 90 days (renewable) or none for partners. When creating: confirm type + purpose, set expiry, pre-populate with sample data, generate credentials, log to audit trail. Partner accounts: real data, track GMV from referred shops, monthly commission calculation. ${ADMIN_MASTER}`,
};

// ── Category definitions ──────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'admin', label: 'Admin & Access', icon: Shield,
    tasks: [
      { label: 'Explain admin bypass',       promptKey: 'bypass',      starter: 'Explain why I see a subscription gate and whether my admin role bypasses it.' },
      { label: 'Plan change propagation',    promptKey: 'propagation',  starter: 'I just changed a shop\'s plan. Walk me through what changed and when.' },
      { label: 'General admin query',        promptKey: null,           starter: '' },
    ],
  },
  {
    id: 'subscriptions', label: 'Subscriptions', icon: CreditCard,
    tasks: [
      { label: 'Change a shop\'s plan',      promptKey: 'changePlan',   starter: 'I want to change a shop\'s plan. Shop name: [SHOP_NAME]. From [CURRENT_PLAN] to [NEW_PLAN].' },
      { label: 'Extend trial / grace period',promptKey: 'extendTrial',  starter: 'I want to extend the trial for [SHOP_NAME]. Show me their current status.' },
      { label: 'Cancel subscription',        promptKey: 'cancel',       starter: 'A shop owner wants to cancel. Shop: [SHOP_NAME]. How should I handle this?' },
      { label: 'Pause subscription',         promptKey: 'pause',        starter: 'A shop wants to pause. Shop: [SHOP_NAME]. Duration requested: [N] days.' },
    ],
  },
  {
    id: 'invoices', label: 'Invoices & Billing', icon: FileText,
    tasks: [
      { label: 'Generate GST invoice',       promptKey: 'invoice',      starter: 'Generate a GST invoice for shop [SHOP_NAME], plan [PLAN], amount ₹[AMOUNT], billing period [MONTH] [YEAR].' },
      { label: 'Issue credit note',          promptKey: 'creditNote',   starter: 'I need to issue a credit note for shop [SHOP_NAME] against invoice [INV_NO]. Reason: [REASON].' },
      { label: 'Resolve billing dispute',    promptKey: 'dispute',      starter: 'A shop owner is disputing a charge. Shop: [SHOP_NAME]. Their claim: [CLAIM].' },
      { label: 'Run monthly billing',        promptKey: 'bulkInvoice',  starter: 'Run the monthly billing for all active Growth and Business shops.' },
    ],
  },
  {
    id: 'revenue', label: 'Revenue & Analytics', icon: BarChart2,
    tasks: [
      { label: 'MRR / ARR overview',         promptKey: 'mrr',          starter: 'Give me this month\'s MRR breakdown by plan and key health metrics.' },
      { label: 'Churn analysis',             promptKey: 'churn',        starter: 'Analyse our churn this month. What are the top reasons and what\'s the MRR impact?' },
      { label: 'Revenue forecast',           promptKey: 'forecast',     starter: 'Forecast our MRR for the next 30, 90, and 180 days with three scenarios.' },
      { label: 'Collections & overdue',      promptKey: 'collections',  starter: 'Show me all overdue accounts sorted by urgency and recommended action.' },
      { label: 'Daily briefing',             promptKey: 'briefing',     starter: 'Give me today\'s executive briefing.' },
    ],
  },
  {
    id: 'dunning', label: 'Dunning & Reminders', icon: Bell,
    tasks: [
      { label: '7-stage dunning sequence',   promptKey: 'dunning',      starter: 'Generate the full 7-stage dunning sequence. Shop: [SHOP_NAME], owner: [OWNER_NAME], plan: [PLAN], amount: ₹[AMOUNT].' },
      { label: 'Card expiry warnings',       promptKey: 'cardExpiry',   starter: 'Show me all shops with cards expiring before their next billing date.' },
      { label: 'Renewal reminder sequence',  promptKey: 'renewal',      starter: 'Generate the renewal reminder sequence for shop [SHOP_NAME] renewing on [DATE].' },
      { label: 'Custom payment reminder',    promptKey: 'customReminder',starter: 'Write a payment reminder for [SHOP_NAME], owner [OWNER_NAME], ₹[AMOUNT] due [DATE].' },
    ],
  },
  {
    id: 'pricing', label: 'Plan & Pricing', icon: Tag,
    tasks: [
      { label: 'Pricing strategy advice',    promptKey: 'pricing',      starter: 'Should we change our Growth plan price? What would be the MRR impact?' },
      { label: 'Create promo code',          promptKey: 'promoCode',    starter: 'Create a promo code for [CAMPAIGN]. Type: [percent/fixed/trial]. Value: [VALUE]. Duration: [N] months.' },
    ],
  },
  {
    id: 'shops', label: 'Shop & User Ops', icon: Store,
    tasks: [
      { label: 'Shop health scores',         promptKey: 'shopHealth',   starter: 'Show me shop health scores. Identify at-risk shops and this week\'s call list.' },
      { label: 'Onboarding checker',         promptKey: 'onboarding',   starter: 'Which new shops have incomplete onboarding? Show missing steps and draft nudge emails.' },
      { label: 'Audit log analysis',         promptKey: 'auditLog',     starter: 'Run today\'s audit log analysis. Flag anything suspicious.' },
    ],
  },
  {
    id: 'enterprise', label: 'Enterprise', icon: Building2,
    tasks: [
      { label: 'Enterprise proposal',        promptKey: 'enterprise',   starter: 'Build an enterprise pricing proposal. Outlets: [N]. Chain: [NAME]. Requirements: [DETAILS].' },
      { label: 'Demo / partner account',     promptKey: 'demo',         starter: 'Set up a demo account. Type: [DEMO/PARTNER/PRESS]. Purpose: [PURPOSE]. Expiry: [DAYS] days.' },
    ],
  },
];

// ── Owner chat (used when role !== ADMIN) ─────────────────────────────────────
function OwnerChat({ user, shopId }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Hello ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your AviQR AI Assistant. How can I help with your business today?`,
  }]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text = input) => {
    if (!text.trim() || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: text.trim() }]);
    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    const ctx = `Shop ID: ${shopId || 'demo'} | Owner: ${user?.name || 'Owner'} | Role: ${user?.role || 'OWNER'}`;
    try {
      await callAIStream(OWNER_SYSTEM, `Context: ${ctx}\n\nQuestion: ${text}`, chunk => {
        setMessages(prev => {
          const m = [...prev];
          m[m.length - 1] = { ...m[m.length - 1], content: m[m.length - 1].content + chunk };
          return m;
        });
      }, 800);
    } catch {
      setMessages(prev => {
        const m = [...prev];
        m[m.length - 1] = { role: 'assistant', content: 'Sorry, having trouble connecting. Please try again.' };
        return m;
      });
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Bot size={20} color="#1D9E75"/>
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>AI Admin Assistant</div>
          <div style={{ fontSize:12, color:'var(--gray-400)' }}>Powered by Claude · Always available</div>
        </div>
        <button style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray-500)', background:'var(--gray-100)', border:'none', padding:'6px 12px', borderRadius:8, cursor:'pointer' }}
          onClick={() => setMessages([{ role:'assistant', content:'Hi! How can I help you today?' }])}>
          <RefreshCw size={12}/> Clear
        </button>
      </div>
      {messages.length <= 1 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
          {OWNER_STARTERS.map(s => (
            <button key={s} onClick={() => send(s)}
              style={{ fontSize:12, padding:'6px 12px', background:'var(--white)', border:'1px solid var(--gray-200)', borderRadius:20, cursor:'pointer', color:'var(--gray-700)' }}>
              {s}
            </button>
          ))}
        </div>
      )}
      <ChatBox messages={messages} loading={loading} input={input} setInput={setInput}
        inputRef={inputRef} bottomRef={bottomRef} onSend={() => send()} />
    </div>
  );
}

// ── Shared chat UI ────────────────────────────────────────────────────────────
function ChatBox({ messages, loading, input, setInput, inputRef, bottomRef, onSend, height = 400 }) {
  return (
    <div style={{ background:'var(--white)', borderRadius:12, border:'1px solid var(--gray-200)', overflow:'hidden' }}>
      <div style={{ height, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display:'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width:28, height:28, borderRadius:8, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', marginRight:8, flexShrink:0, marginTop:2 }}>
                <Sparkles size={14} color="#1D9E75"/>
              </div>
            )}
            <div style={{
              maxWidth:'82%', padding:'10px 14px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? '#1D9E75' : 'var(--gray-50)',
              color: msg.role === 'user' ? 'white' : 'var(--gray-900)',
              fontSize:14, lineHeight:1.6, whiteSpace:'pre-wrap',
            }}>
              {msg.content || (loading && i === messages.length - 1
                ? <span style={{ display:'flex', gap:4 }}>{[0,1,2].map(n => <span key={n} style={{ width:6, height:6, borderRadius:'50%', background:'var(--gray-300)', animation:`dot .8s ${n*.2}s infinite` }}/>)}</span>
                : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div style={{ borderTop:'1px solid var(--gray-100)', padding:12, display:'flex', gap:10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} ref={inputRef}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
          placeholder="Ask anything…"
          style={{ flex:1, border:'1px solid var(--gray-200)', borderRadius:8, padding:'8px 12px', fontSize:14, outline:'none' }}/>
        <button onClick={onSend} disabled={loading || !input.trim()}
          style={{ width:38, height:38, borderRadius:8, background: input.trim() ? '#1D9E75' : 'var(--gray-100)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          <Send size={16} color={input.trim() ? 'white' : 'var(--gray-400)'}/>
        </button>
      </div>
    </div>
  );
}

// ── Super Admin chat ──────────────────────────────────────────────────────────
function SuperAdminChat({ user, activePromptKey, activeTask }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Welcome, ${user?.name?.split(' ')[0] || 'Admin'}. 🛡️ I'm your AviQR Super Admin AI — select a task from the left or ask me anything about subscriptions, billing, revenue, or shop operations.`,
  }]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // When a task card is clicked, inject the starter prompt
  useEffect(() => {
    if (activeTask?.starter) {
      setInput(activeTask.starter);
      inputRef.current?.focus();
    }
  }, [activeTask]);

  const systemPrompt = activePromptKey && PROMPTS[activePromptKey] ? PROMPTS[activePromptKey] : ADMIN_MASTER;

  const send = async (text = input) => {
    if (!text.trim() || loading) return;
    const history = messages.filter(m => m.role !== 'system');
    setMessages(prev => [...prev, { role: 'user', content: text.trim() }]);
    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    try {
      await callAIStream(systemPrompt, text.trim(), chunk => {
        setMessages(prev => {
          const m = [...prev];
          m[m.length - 1] = { ...m[m.length - 1], content: m[m.length - 1].content + chunk };
          return m;
        });
      }, 1500);
    } catch {
      setMessages(prev => {
        const m = [...prev];
        m[m.length - 1] = { role: 'assistant', content: 'Connection error. Please try again.' };
        return m;
      });
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <div style={{ width:36, height:36, borderRadius:8, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Sparkles size={16} color="#1D9E75"/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:700 }}>
            {activeTask ? activeTask.label : 'Super Admin AI'}
          </div>
          <div style={{ fontSize:11, color:'var(--gray-400)' }}>
            {activePromptKey ? `Using specialised prompt · ${activePromptKey}` : 'Master assistant · All capabilities'}
          </div>
        </div>
        <button onClick={() => { setMessages([{ role:'assistant', content:`Cleared. What do you need?` }]); setInput(''); }}
          style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--gray-500)', background:'var(--gray-100)', border:'none', padding:'6px 10px', borderRadius:8, cursor:'pointer' }}>
          <RefreshCw size={11}/> Clear
        </button>
      </div>
      <div style={{ flex:1, minHeight:0 }}>
        <ChatBox messages={messages} loading={loading} input={input} setInput={setInput}
          inputRef={inputRef} bottomRef={bottomRef} onSend={() => send()} height={420}/>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AIAdminAssistant({ shopId, user }) {
  const isAdmin = user?.role === 'ADMIN';
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [activePromptKey, setActivePromptKey] = useState(null);
  const [activeTask, setActiveTask] = useState(null);

  if (!isAdmin) return <OwnerChat user={user} shopId={shopId}/>;

  const currentCat = CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div style={{ display:'flex', gap:0, height:600, maxWidth:1100, margin:'0 auto', border:'1px solid var(--gray-200)', borderRadius:14, overflow:'hidden', background:'var(--white)' }}>

      {/* Category sidebar */}
      <div style={{ width:200, borderRight:'1px solid var(--gray-100)', background:'var(--gray-50)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'14px 12px 10px', borderBottom:'1px solid var(--gray-100)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Shield size={13} color="#1D9E75"/>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--gray-500)', letterSpacing:.5 }}>SUPER ADMIN</span>
          </div>
        </div>
        <nav style={{ flex:1, overflowY:'auto', padding:'6px 0' }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setActivePromptKey(null); setActiveTask(null); }}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 14px',
                  background: activeCategory === cat.id ? '#E1F5EE' : 'transparent',
                  border:'none', cursor:'pointer', textAlign:'left',
                  color: activeCategory === cat.id ? '#1D9E75' : 'var(--gray-600)',
                  fontSize:13, fontWeight: activeCategory === cat.id ? 600 : 400,
                  borderLeft: activeCategory === cat.id ? '3px solid #1D9E75' : '3px solid transparent',
                }}>
                <Icon size={14}/> {cat.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding:'10px 12px', borderTop:'1px solid var(--gray-100)', fontSize:10, color:'var(--gray-400)' }}>
          Powered by Claude
        </div>
      </div>

      {/* Task list */}
      <div style={{ width:220, borderRight:'1px solid var(--gray-100)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid var(--gray-100)' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-700)' }}>{currentCat?.label}</div>
          <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:2 }}>Select a task</div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {currentCat?.tasks.map(task => (
            <button key={task.label}
              onClick={() => { setActivePromptKey(task.promptKey); setActiveTask(task); }}
              style={{
                width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'9px 14px', background: activeTask?.label === task.label ? '#F0FBF7' : 'transparent',
                border:'none', cursor:'pointer', textAlign:'left', fontSize:12,
                color: activeTask?.label === task.label ? '#1D9E75' : 'var(--gray-700)',
                fontWeight: activeTask?.label === task.label ? 600 : 400,
              }}>
              <span style={{ flex:1, lineHeight:1.4 }}>{task.label}</span>
              <ChevronRight size={11} style={{ flexShrink:0, opacity:.5 }}/>
            </button>
          ))}
        </div>
      </div>

      {/* Chat panel */}
      <div style={{ flex:1, padding:20, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        <SuperAdminChat user={user} activePromptKey={activePromptKey} activeTask={activeTask}/>
      </div>

      <style>{`@keyframes dot{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}`}</style>
    </div>
  );
}