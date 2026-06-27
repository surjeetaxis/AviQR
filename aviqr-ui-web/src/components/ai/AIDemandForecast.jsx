import { useState } from 'react';
import { TrendingUp, Sparkles, Package, Clock, Users } from 'lucide-react';
import { callAIJson } from './aiClient.js';

const SYSTEM = `You are a demand forecasting AI for an Indian restaurant. Return ONLY JSON:
{
  "nextWeekRevenue": 168000,
  "confidence": 82,
  "peakDays": ["Friday","Saturday"],
  "peakHours": ["12:30-1:30 PM","7:30-9 PM"],
  "staffRecommendation": "5 staff on weekdays, 8 on weekends",
  "inventoryNeeds": [
    {"item":"Paneer","currentStock":"2kg","predictedNeed":"5kg","urgency":"high"},
    {"item":"Basmati Rice","currentStock":"10kg","predictedNeed":"8kg","urgency":"low"}
  ],
  "promotionSuggestion": "Offer 15% off Monday lunch — historically slowest period",
  "weatherImpact": "Rain forecast Friday may reduce walk-ins by 20%",
  "insights": ["Insight 1","Insight 2","Insight 3"]
}`;

export default function AIDemandForecast({ shopId }) {
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  const forecast = async () => {
    setLoading(true);
    const r = await callAIJson(SYSTEM,
      `Restaurant: ${shopId||'Spice Route'}, Bengaluru\nLast 7 days: Mon ₹18k, Tue ₹22k, Wed ₹19k, Thu ₹26k, Fri ₹34k, Sat ₹42k, Sun ₹38k\nTop items: Paneer Tikka, Butter Naan, Biryani\nAvg daily customers: 85\nForecast next 7 days.`);
    setResult(r);
    setLoading(false);
  };

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#EDE9FE', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <TrendingUp size={20} color="#7C3AED"/>
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>AI Demand Forecast</div>
          <div style={{ fontSize:12, color:'var(--gray-400)' }}>Next 7 days · Inventory needs · Staff scheduling</div>
        </div>
      </div>

      <button onClick={forecast} disabled={loading}
        style={{ width:'100%', padding:'11px', fontSize:14, fontWeight:600, background:'#7C3AED', color:'white', border:'none', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:20 }}>
        <Sparkles size={15}/> {loading ? 'Forecasting…' : 'Forecast next 7 days'}
      </button>

      {result && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:14 }}>
            {[
              { label:'Predicted revenue', value:`₹${(result.nextWeekRevenue||0).toLocaleString('en-IN')}`, icon:TrendingUp, color:'#7C3AED' },
              { label:'Forecast confidence', value:`${result.confidence||0}%`, icon:Sparkles, color:'#059669' },
              { label:'Peak days', value:(result.peakDays||[]).join(', '), icon:Clock, color:'#D97706' },
            ].map(k => (
              <div key={k.label} style={{ background:'var(--white)', borderRadius:10, border:'1px solid var(--gray-200)', padding:'12px 16px', textAlign:'center' }}>
                <div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:4 }}>{k.label}</div>
                <div style={{ fontSize:17, fontWeight:700, color:k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {result.inventoryNeeds?.length > 0 && (
            <div style={{ background:'var(--white)', borderRadius:12, border:'1px solid var(--gray-200)', padding:16, marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                <Package size={14} color="#D97706"/><span style={{ fontSize:13, fontWeight:700 }}>Inventory needs next week</span>
              </div>
              {result.inventoryNeeds.map(i => (
                <div key={i.item} style={{ display:'flex', alignItems:'center', gap:12, padding:'7px 0', borderBottom:'1px solid var(--gray-100)' }}>
                  <span style={{ flex:1, fontSize:13, fontWeight:600 }}>{i.item}</span>
                  <span style={{ fontSize:12, color:'var(--gray-400)' }}>Have: {i.currentStock}</span>
                  <span style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>Need: {i.predictedNeed}</span>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: i.urgency==='high'?'#FEE2E2':'#DCFCE7', color: i.urgency==='high'?'#DC2626':'#059669', fontWeight:600 }}>
                    {i.urgency}
                  </span>
                </div>
              ))}
            </div>
          )}

          {[
            { label:'Staff recommendation', value:result.staffRecommendation, icon:Users, color:'#2563EB' },
            { label:'Promotion suggestion', value:result.promotionSuggestion, icon:Sparkles, color:'#D97706' },
            { label:'Weather impact', value:result.weatherImpact, icon:TrendingUp, color:'#6B7280' },
          ].filter(x => x.value).map(item => (
            <div key={item.label} style={{ display:'flex', gap:10, background:'var(--white)', borderRadius:10, border:'1px solid var(--gray-200)', padding:'12px 16px', marginBottom:10 }}>
              <item.icon size={16} color={item.color} style={{ flexShrink:0, marginTop:1 }}/>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', marginBottom:3 }}>{item.label.toUpperCase()}</div>
                <div style={{ fontSize:13, color:'var(--gray-700)', lineHeight:1.5 }}>{item.value}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
