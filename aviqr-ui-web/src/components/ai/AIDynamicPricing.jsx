import { useState } from 'react';
import { Zap, Sparkles, Clock, Tag, TrendingUp, WifiOff } from 'lucide-react';
import { callAIJson } from './aiClient.js';
import { pricingFallback } from './aiFallback.js';

const SYSTEM = `You are a dynamic pricing AI for an Indian restaurant. Generate pricing promotions. Return ONLY JSON:
{
  "promotions": [
    {
      "name":"Lunch Rush Deal",
      "trigger":"Weekday 12-3 PM",
      "discount":"15% off mains",
      "targetItems":["Dal Makhani","Veg Biryani","Butter Naan combo"],
      "expectedImpact":"+25% orders during slow lunch",
      "emoji":"🍱",
      "urgency":"high"
    }
  ],
  "peakSurcharge": {"amount":"10%","when":"Fri-Sun 7-10 PM","rationale":"High demand, capacity constrained"},
  "insights": ["Why these promotions make sense for this restaurant"]
}`;

export default function AIDynamicPricing({ shopId }) {
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [context, setContext]   = useState('Indian restaurant, Bengaluru, weekday lunch is slow, weekends are packed');
  const [aiOffline, setAiOffline] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const r = await callAIJson(SYSTEM,
        `Restaurant context: ${context}\nShop: ${shopId||'demo'}\nGenerate dynamic pricing promotions and peak surcharge recommendations.`);
      if (r) { setResult(r); setAiOffline(false); }
      else { setResult(pricingFallback()); setAiOffline(true); }
    } catch {
      setResult(pricingFallback());
      setAiOffline(true);
    }
    setLoading(false);
  };

  const generateOffline = () => { setResult(pricingFallback()); setAiOffline(true); };

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#FEF3C7', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Zap size={20} color="#D97706"/>
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>AI Dynamic Pricing</div>
          <div style={{ fontSize:12, color:'var(--gray-400)' }}>Smart promotions · Peak surcharge · Festival offers</div>
        </div>
      </div>

      <textarea value={context} onChange={e => setContext(e.target.value)} rows={2}
        placeholder="Describe your restaurant context, busy times, slow periods…"
        style={{ width:'100%', border:'1px solid var(--gray-200)', borderRadius:8, padding:'10px 12px', fontSize:13, outline:'none', resize:'none', marginBottom:12 }}/>

      {aiOffline && (
        <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:8, padding:'8px 14px', marginBottom:12, fontSize:12, color:'#92400E', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><WifiOff size={12}/> AI offline — showing standard pricing strategy</span>
          <button onClick={generate} style={{ fontSize:11, background:'none', border:'1px solid #D97706', color:'#92400E', padding:'3px 10px', borderRadius:6, cursor:'pointer' }}>Retry AI</button>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        <button onClick={generate} disabled={loading}
          style={{ flex:1, padding:'11px', fontSize:14, fontWeight:600, background:'#D97706', color:'white', border:'none', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Sparkles size={15}/> {loading ? 'Generating…' : 'Generate pricing strategy'}
        </button>
        <button onClick={generateOffline} disabled={loading} title="Industry-standard promotions — no AI required"
          style={{ padding:'11px 16px', fontSize:13, fontWeight:600, background:'var(--gray-100)', color:'var(--gray-600)', border:'1px solid var(--gray-200)', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
          <Zap size={14}/> Without AI
        </button>
      </div>

      {result && (
        <>
          {result.promotions?.map((p, i) => (
            <div key={i} style={{ background:'var(--white)', borderRadius:12, border:'1px solid var(--gray-200)', padding:16, marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <span style={{ fontSize:28 }}>{p.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:14, fontWeight:700 }}>{p.name}</span>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: p.urgency==='high'?'#FEE2E2':'#FEF3C7', color: p.urgency==='high'?'#DC2626':'#D97706', fontWeight:600 }}>{p.urgency}</span>
                  </div>
                  <div style={{ display:'flex', gap:16, fontSize:12, color:'var(--gray-500)', marginBottom:8 }}>
                    <span><Clock size={11} style={{ verticalAlign:'middle', marginRight:3 }}/>{p.trigger}</span>
                    <span><Tag size={11} style={{ verticalAlign:'middle', marginRight:3 }}/>{p.discount}</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--gray-600)', marginBottom:6 }}>
                    Items: {p.targetItems?.join(' · ')}
                  </div>
                  <div style={{ fontSize:12, color:'#059669', fontWeight:600 }}>
                    <TrendingUp size={11} style={{ verticalAlign:'middle', marginRight:3 }}/>{p.expectedImpact}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {result.peakSurcharge && (
            <div style={{ background:'#FEF3C7', borderRadius:12, border:'1px solid #FDE68A', padding:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#92400E', marginBottom:4 }}>
                ⚡ Peak surcharge recommendation: {result.peakSurcharge.amount}
              </div>
              <div style={{ fontSize:12, color:'#78350F' }}>{result.peakSurcharge.when} — {result.peakSurcharge.rationale}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
