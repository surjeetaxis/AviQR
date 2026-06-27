import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Sparkles, WifiOff, Zap } from 'lucide-react';
import { callAIJson } from './aiClient.js';
import { fraudFallback } from './aiFallback.js';

const SYSTEM = `You are a fraud detection AI for AviQR restaurant platform. Analyse order/user data for suspicious patterns.

Return ONLY JSON:
{
  "riskScore": 72,
  "riskLevel": "high|medium|low",
  "flags": [
    {"type":"DUPLICATE_ORDER","severity":"high","description":"Same items, same table, within 3 min","recommendation":"Hold order, call customer to confirm"}
  ],
  "summary": "Brief summary of risk assessment",
  "autoActions": ["Block payment", "Flag for review"],
  "safeSignals": ["Returning customer (12 orders)", "Payment method verified"]
}

Risk levels: high (score 70+), medium (40-69), low (0-39).
Fraud types: DUPLICATE_ORDER, FAKE_PHONE, SUSPICIOUS_AMOUNT, BOT_TRAFFIC, COUPON_ABUSE, DUPLICATE_ACCOUNT.`;

const DEMO_ORDERS = [
  { id:'ORD-001', phone:'9845012345', amount:1250, items:4, table:'5', timeAgo:'2min', pastOrders:12, paymentMethod:'UPI' },
  { id:'ORD-002', phone:'9845012345', amount:1250, items:4, table:'5', timeAgo:'1min', pastOrders:0,  paymentMethod:'UPI' },
  { id:'ORD-003', phone:'0000000000', amount:5000, items:1, table:'12',timeAgo:'5min', pastOrders:0,  paymentMethod:'COD' },
];

export default function AIFraudDetection() {
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [selOrder, setSelOrder] = useState(DEMO_ORDERS[0]);
  const [aiOffline, setAiOffline] = useState(false);

  const analyse = async () => {
    setLoading(true);
    try {
      const r = await callAIJson(SYSTEM,
        `Analyse this order for fraud:\n${JSON.stringify(selOrder, null, 2)}\n\nContext: Order 1 and 2 are from same phone, same table, same amount within 3 minutes.`);
      if (r) { setResult(r); setAiOffline(false); }
      else { setResult(fraudFallback(selOrder)); setAiOffline(true); }
    } catch {
      setResult(fraudFallback(selOrder));
      setAiOffline(true);
    }
    setLoading(false);
  };

  const analyseOffline = () => { setResult(fraudFallback(selOrder)); setAiOffline(true); };

  const riskColor = l => l==='high'?'#DC2626':l==='medium'?'#D97706':'#059669';
  const riskBg    = l => l==='high'?'#FEE2E2':l==='medium'?'#FEF3C7':'#DCFCE7';

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Shield size={20} color="#DC2626"/>
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>AI Fraud Detection</div>
          <div style={{ fontSize:12, color:'var(--gray-400)' }}>Risk scoring · Duplicate detection · Suspicious pattern alerts</div>
        </div>
      </div>

      <div style={{ background:'var(--white)', borderRadius:12, border:'1px solid var(--gray-200)', padding:16, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Select order to analyse</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {DEMO_ORDERS.map(o => (
            <button key={o.id} onClick={() => { setSelOrder(o); setResult(null); }}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:8,
                border: selOrder.id===o.id ? '2px solid var(--green)' : '1px solid var(--gray-200)',
                background: selOrder.id===o.id ? 'var(--green-light)' : 'var(--gray-50)',
                cursor:'pointer', textAlign:'left' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{o.id}</div>
                <div style={{ fontSize:11, color:'var(--gray-400)' }}>Phone: {o.phone} · Table {o.table} · ₹{o.amount} · {o.timeAgo} ago · {o.pastOrders} past orders</div>
              </div>
              {(o.phone === '0000000000' || o.pastOrders === 0 || o.id === 'ORD-002') && (
                <AlertTriangle size={14} color="#D97706"/>
              )}
            </button>
          ))}
        </div>
      </div>

      {aiOffline && (
        <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:8, padding:'8px 14px', marginBottom:12, fontSize:12, color:'#92400E', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><WifiOff size={12}/> AI offline — using rule-based fraud detection</span>
          <button onClick={analyse} style={{ fontSize:11, background:'none', border:'1px solid #D97706', color:'#92400E', padding:'3px 10px', borderRadius:6, cursor:'pointer' }}>Retry AI</button>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        <button onClick={analyse} disabled={loading}
          style={{ flex:1, padding:'11px', fontSize:14, fontWeight:600, background:'var(--red)', color:'white', border:'none', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Sparkles size={15}/> {loading ? 'Analysing…' : 'Analyse for fraud'}
        </button>
        <button onClick={analyseOffline} disabled={loading} title="Rule-based checks — no AI required"
          style={{ padding:'11px 16px', fontSize:13, fontWeight:600, background:'var(--gray-100)', color:'var(--gray-600)', border:'1px solid var(--gray-200)', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
          <Zap size={14}/> Without AI
        </button>
      </div>

      {result && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:12, marginBottom:14 }}>
            <div style={{ background: riskBg(result.riskLevel), borderRadius:12, padding:'16px 20px', textAlign:'center', minWidth:120 }}>
              <div style={{ fontSize:36, fontWeight:700, color: riskColor(result.riskLevel) }}>{result.riskScore}</div>
              <div style={{ fontSize:12, fontWeight:700, color: riskColor(result.riskLevel), textTransform:'uppercase' }}>Risk score</div>
              <div style={{ fontSize:11, color: riskColor(result.riskLevel), marginTop:4 }}>{result.riskLevel?.toUpperCase()} RISK</div>
            </div>
            <div style={{ background:'var(--white)', borderRadius:12, border:'1px solid var(--gray-200)', padding:'16px' }}>
              <div style={{ fontSize:13, color:'var(--gray-700)', marginBottom:10, lineHeight:1.5 }}>{result.summary}</div>
              {result.safeSignals?.map(s => (
                <div key={s} style={{ display:'flex', gap:6, fontSize:12, color:'#059669', marginBottom:3 }}>
                  <CheckCircle size={12} style={{ flexShrink:0, marginTop:1 }}/>{s}
                </div>
              ))}
            </div>
          </div>

          {result.flags?.map((flag, i) => (
            <div key={i} style={{ display:'flex', gap:12, background: flag.severity==='high'?'#FEE2E2':'#FEF3C7', borderRadius:10, padding:'12px 16px', marginBottom:10 }}>
              <XCircle size={16} color={flag.severity==='high'?'#DC2626':'#D97706'} style={{ flexShrink:0, marginTop:1 }}/>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color: flag.severity==='high'?'#991B1B':'#92400E' }}>{flag.type?.replace(/_/g,' ')}</div>
                <div style={{ fontSize:12, color: flag.severity==='high'?'#7F1D1D':'#78350F', marginTop:2 }}>{flag.description}</div>
                <div style={{ fontSize:12, color: flag.severity==='high'?'#DC2626':'#D97706', fontWeight:600, marginTop:4 }}>→ {flag.recommendation}</div>
              </div>
            </div>
          ))}

          {result.autoActions?.length > 0 && (
            <div style={{ background:'#F8FAFC', borderRadius:10, border:'1px solid var(--gray-200)', padding:'12px 16px' }}>
              <div style={{ fontSize:12, fontWeight:700, marginBottom:8 }}>Recommended auto-actions</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {result.autoActions.map(a => (
                  <button key={a} style={{ fontSize:12, padding:'6px 14px', background:'var(--red)', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
