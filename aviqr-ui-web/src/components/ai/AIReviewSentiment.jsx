import { useState } from 'react';
import { TrendingUp, ThumbsUp, ThumbsDown, AlertTriangle, Sparkles, WifiOff, Zap } from 'lucide-react';
import { callAIJson } from './aiClient.js';
import { sentimentFallback } from './aiFallback.js';

const SYSTEM = `You are a restaurant review sentiment analysis AI. Analyse customer reviews and return ONLY this JSON:
{
  "overallSentiment": "positive|neutral|negative",
  "score": 85,
  "summary": "2-sentence executive summary",
  "positives": ["thing customers loved 1", "thing 2", "thing 3"],
  "negatives": ["complaint 1", "complaint 2"],
  "popularDishes": ["Dish mentioned positively 1", "Dish 2"],
  "serviceIssues": ["Issue 1 if any"],
  "recommendations": ["Actionable recommendation 1", "Rec 2", "Rec 3"],
  "reviewBreakdown": {"positive": 70, "neutral": 20, "negative": 10}
}`;

const SAMPLE_REVIEWS = [
  "Amazing paneer tikka! Best I've had in Bengaluru. Service was quick and staff were friendly. Will definitely come back.",
  "Food was delicious but had to wait 40 minutes for our order. The biryani was cold when it arrived.",
  "Loved the ambiance and the dosas were perfect. Sambar and chutney were fresh. A bit pricey though.",
  "Great place overall. The butter naan was soft and the dal makhani was rich. Staff need to be more attentive.",
  "Came for lunch, the thali was excellent value. The filter coffee at the end was perfect. Minor issue with billing.",
  "Spice route never disappoints. Their paneer butter masala is my favourite in the city. Highly recommend!",
];

export default function AIReviewSentiment() {
  const [reviews, setReviews]   = useState(SAMPLE_REVIEWS.join('\n---\n'));
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [aiOffline, setAiOffline] = useState(false);

  const analyse = async () => {
    setLoading(true);
    try {
      const r = await callAIJson(SYSTEM, `Analyse these ${reviews.split('---').length} restaurant reviews:\n\n${reviews}`);
      if (r) { setResult(r); setAiOffline(false); }
      else { setResult(sentimentFallback(reviews)); setAiOffline(true); }
    } catch {
      setResult(sentimentFallback(reviews));
      setAiOffline(true);
    }
    setLoading(false);
  };

  const analyseOffline = () => { setResult(sentimentFallback(reviews)); setAiOffline(true); };

  const sentimentColor = s => s === 'positive' ? '#059669' : s === 'negative' ? '#DC2626' : '#D97706';
  const sentimentBg    = s => s === 'positive' ? '#DCFCE7' : s === 'negative' ? '#FEE2E2' : '#FEF3C7';

  return (
    <div style={{ maxWidth:760, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#DCFCE7', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <TrendingUp size={20} color="#059669"/>
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>AI Review Sentiment Analysis</div>
          <div style={{ fontSize:12, color:'var(--gray-400)' }}>Identify trends, popular dishes, service issues</div>
        </div>
      </div>

      <textarea value={reviews} onChange={e => setReviews(e.target.value)} rows={6}
        placeholder="Paste customer reviews, one per line or separated by ---"
        style={{ width:'100%', border:'1px solid var(--gray-200)', borderRadius:10, padding:'12px', fontSize:13, lineHeight:1.6, outline:'none', resize:'vertical', marginBottom:12 }}/>

      {aiOffline && (
        <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:8, padding:'8px 14px', marginBottom:12, fontSize:12, color:'#92400E', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><WifiOff size={12}/> AI offline — using keyword sentiment analysis</span>
          <button onClick={analyse} style={{ fontSize:11, background:'none', border:'1px solid #D97706', color:'#92400E', padding:'3px 10px', borderRadius:6, cursor:'pointer' }}>Retry AI</button>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        <button onClick={analyse} disabled={loading || !reviews.trim()}
          style={{ flex:1, padding:'11px', fontSize:14, fontWeight:600, background:'var(--green)', color:'white', border:'none', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Sparkles size={15}/> {loading ? 'Analysing…' : `Analyse ${reviews.split('---').length} reviews`}
        </button>
        <button onClick={analyseOffline} disabled={loading || !reviews.trim()} title="Keyword-based analysis — no AI required"
          style={{ padding:'11px 16px', fontSize:13, fontWeight:600, background:'var(--gray-100)', color:'var(--gray-600)', border:'1px solid var(--gray-200)', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
          <Zap size={14}/> Without AI
        </button>
      </div>

      {result && (
        <>
          {/* Overall */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:14, marginBottom:14 }}>
            <div style={{ background:'var(--white)', borderRadius:12, border:'1px solid var(--gray-200)', padding:16 }}>
              <div style={{ fontSize:12, color:'var(--gray-400)', marginBottom:4 }}>Overall sentiment</div>
              <div style={{ fontSize:22, fontWeight:700, color: sentimentColor(result.overallSentiment) }}>
                {result.score}% positive
              </div>
              <div style={{ fontSize:13, color:'var(--gray-600)', marginTop:6, lineHeight:1.5 }}>{result.summary}</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {Object.entries(result.reviewBreakdown || {}).map(([k,v]) => (
                <div key={k} style={{ background: sentimentBg(k), borderRadius:8, padding:'8px 16px', textAlign:'center', minWidth:90 }}>
                  <div style={{ fontSize:18, fontWeight:700, color: sentimentColor(k) }}>{v}%</div>
                  <div style={{ fontSize:11, color: sentimentColor(k) }}>{k}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { icon:ThumbsUp, color:'#059669', bg:'#DCFCE7', label:'What customers love', items: result.positives },
              { icon:ThumbsDown, color:'#DC2626', bg:'#FEE2E2', label:'Complaints & issues', items: result.negatives },
              { icon:TrendingUp, color:'#D97706', bg:'#FEF3C7', label:'Popular dishes mentioned', items: result.popularDishes },
              { icon:AlertTriangle, color:'#7C3AED', bg:'#EDE9FE', label:'Recommendations', items: result.recommendations },
            ].map(card => (
              <div key={card.label} style={{ background:'var(--white)', borderRadius:10, border:'1px solid var(--gray-200)', padding:'12px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                  <div style={{ width:24, height:24, borderRadius:6, background:card.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <card.icon size={13} color={card.color}/>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--gray-700)' }}>{card.label}</span>
                </div>
                {(card.items || []).map((item, i) => (
                  <div key={i} style={{ display:'flex', gap:8, fontSize:12, color:'var(--gray-600)', marginBottom:4, lineHeight:1.4 }}>
                    <span style={{ color:card.color, fontWeight:700, flexShrink:0 }}>·</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
