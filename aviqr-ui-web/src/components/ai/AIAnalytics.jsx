import { useState } from 'react';
import { BarChart2, TrendingUp, Sparkles, RefreshCw, WifiOff, Zap } from 'lucide-react';
import { callAIStream } from './aiClient.js';
import { analyticsFallback } from './aiFallback.js';

const SYSTEM = `You are an expert restaurant business analytics AI for AviQR.
Given order and revenue data, produce a clear, actionable business summary.
Structure your response with these exact sections (use ### headers):
### Daily snapshot
### Revenue insights
### Top performers
### Peak hours analysis
### Customer behaviour
### Actionable recommendations (3 bullet points)

Be specific with numbers. Use Indian context (₹, Indian food terms). Keep each section to 2-3 sentences. Total under 300 words.`;

const DEMO_DATA = {
  today:     { revenue: 24680, orders: 73, avg: 338 },
  yesterday: { revenue: 18920, orders: 58, avg: 326 },
  week:      { revenue: 142000, orders: 412, avg: 345 },
  topItems:  ['Paneer Tikka Masala', 'Butter Naan', 'Sweet Lassi'],
  peakHours: ['12:30 PM', '1:30 PM', '7:45 PM'],
  newCustomers: 14,
  returnCustomers: 59,
};

export default function AIAnalytics({ shopId }) {
  const [report, setReport]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [range, setRange]       = useState('today');
  const [aiOffline, setAiOffline] = useState(false);

  const generate = async () => {
    setLoading(true);
    setReport('');
    const d = DEMO_DATA;
    const dataStr = `Shop: ${shopId || 'demo'}
Period: ${range}
Revenue: ₹${d.today.revenue.toLocaleString('en-IN')}
Orders: ${d.today.orders}
Avg order value: ₹${d.today.avg}
vs Yesterday: Revenue +${Math.round((d.today.revenue-d.yesterday.revenue)/d.yesterday.revenue*100)}%, Orders +${Math.round((d.today.orders-d.yesterday.orders)/d.yesterday.orders*100)}%
Top items: ${d.topItems.join(', ')}
Peak hours: ${d.peakHours.join(', ')}
New customers: ${d.newCustomers}, Returning: ${d.returnCustomers}`;

    try {
      await callAIStream(SYSTEM, `Analyse this restaurant data and generate a business intelligence report:\n\n${dataStr}`,
        chunk => setReport(prev => prev + chunk), 800);
      setAiOffline(false);
    } catch {
      setReport(analyticsFallback(DEMO_DATA));
      setAiOffline(true);
    }
    setLoading(false);
  };

  const generateOffline = () => { setReport(analyticsFallback(DEMO_DATA)); setAiOffline(true); };

  // Render markdown-ish output
  const renderReport = (text) => text.split('\n').map((line, i) => {
    if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize:14, fontWeight:700, color:'var(--gray-900)', margin:'16px 0 6px' }}>{line.slice(4)}</h3>;
    if (line.startsWith('• ') || line.startsWith('- ')) return <div key={i} style={{ display:'flex', gap:8, fontSize:13, color:'var(--gray-700)', marginBottom:4 }}><span style={{ color:'var(--green)', fontWeight:700 }}>→</span><span>{line.slice(2)}</span></div>;
    if (!line.trim()) return <br key={i}/>;
    return <p key={i} style={{ fontSize:13, color:'var(--gray-700)', lineHeight:1.6, marginBottom:4 }}>{line}</p>;
  });

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#DCFCE7', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <BarChart2 size={20} color="#059669"/>
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>AI Order Analytics</div>
          <div style={{ fontSize:12, color:'var(--gray-400)' }}>Plain-language business intelligence · Updated on demand</div>
        </div>
      </div>

      {/* KPI snapshot */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
        {[
          { label:"Today's Revenue", value:`₹${DEMO_DATA.today.revenue.toLocaleString('en-IN')}`, delta:'+30.4%', up:true },
          { label:"Total Orders",    value:DEMO_DATA.today.orders, delta:'+25.9%', up:true },
          { label:"Avg Order Value", value:`₹${DEMO_DATA.today.avg}`, delta:'+3.7%', up:true },
        ].map(k => (
          <div key={k.label} style={{ background:'var(--white)', borderRadius:10, border:'1px solid var(--gray-200)', padding:'12px 16px' }}>
            <div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:4 }}>{k.label}</div>
            <div style={{ fontSize:20, fontWeight:700, color:'var(--gray-900)' }}>{k.value}</div>
            <div style={{ fontSize:11, color: k.up ? '#059669' : '#DC2626', fontWeight:600, marginTop:2 }}>{k.delta} vs yesterday</div>
          </div>
        ))}
      </div>

      {aiOffline && (
        <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:8, padding:'8px 14px', marginBottom:14, fontSize:12, color:'#92400E', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><WifiOff size={12}/> AI offline — showing rule-based analysis</span>
          <button onClick={generate} style={{ fontSize:11, background:'none', border:'1px solid #D97706', color:'#92400E', padding:'3px 10px', borderRadius:6, cursor:'pointer' }}>Retry AI</button>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {['today','week','month'].map(r => (
          <button key={r} onClick={() => setRange(r)}
            style={{ padding:'6px 14px', fontSize:12, fontWeight:600, borderRadius:8, border:'1px solid var(--gray-200)', background: range===r ? 'var(--green)' : 'var(--white)', color: range===r ? 'white' : 'var(--gray-600)', cursor:'pointer' }}>
            {r.charAt(0).toUpperCase()+r.slice(1)}
          </button>
        ))}
        <button onClick={generate} disabled={loading}
          style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, padding:'6px 16px', fontSize:12, fontWeight:600, background:'var(--green)', color:'white', border:'none', borderRadius:8, cursor:'pointer' }}>
          <Sparkles size={12}/> {loading ? 'Generating…' : 'Generate AI Report'}
        </button>
        <button onClick={generateOffline} disabled={loading} title="Instant rule-based report — no AI required"
          style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', fontSize:12, fontWeight:600, background:'var(--gray-100)', color:'var(--gray-600)', border:'1px solid var(--gray-200)', borderRadius:8, cursor:'pointer' }}>
          <Zap size={12}/> Without AI
        </button>
      </div>

      {(report || loading) && (
        <div style={{ background:'var(--white)', borderRadius:12, border:'1px solid var(--gray-200)', padding:20 }}>
          {loading && !report && <div style={{ color:'var(--gray-400)', fontSize:13 }}>Analysing your data…</div>}
          {renderReport(report)}
          {loading && <span style={{ display:'inline-block', width:8, height:16, background:'var(--green)', animation:'blink .7s infinite', marginLeft:2, verticalAlign:'middle' }}/>}
        </div>
      )}
      {!report && !loading && (
        <div style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>
          <TrendingUp size={32} style={{ marginBottom:10 }}/>
          <div style={{ fontSize:14 }}>Click "Generate AI Report" to get plain-language insights about your business</div>
        </div>
      )}
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}
