import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Star, Clock, RefreshCw, WifiOff } from 'lucide-react';
import { callAIJson } from './aiClient.js';
import { recommendationsFallback } from './aiFallback.js';

const SYSTEM = `You are an AI recommendation engine for AviQR restaurant platform. Given menu items and order context, generate relevant recommendations.

Return ONLY this JSON structure (no other text):
{
  "peopleAlsoOrdered": [{"id":"i1","name":"Item Name","reason":"Brief why","price":250,"emoji":"🍛"}],
  "trending": [{"id":"i2","name":"Item Name","reason":"Brief why","price":180,"emoji":"🌮","trend":"+23%"}],
  "chefsPick": [{"id":"i3","name":"Item Name","reason":"Brief why","price":320,"emoji":"⭐"}],
  "bestValue": [{"id":"i4","name":"Item Name","reason":"Brief why","price":120,"emoji":"💰"}]
}
Each array should have 3 items. Use Indian food context. Prices in ₹.`;

const DEMO = {
  peopleAlsoOrdered:[
    {name:'Butter Naan',reason:'Ordered with 78% of mains',price:50,emoji:'🫓'},
    {name:'Sweet Lassi',reason:'Top drink pairing',price:80,emoji:'🥛'},
    {name:'Gulab Jamun',reason:'Most popular dessert',price:90,emoji:'🍮'},
  ],
  trending:[
    {name:'Paneer Tikka',reason:'+31% orders this week',price:280,emoji:'🧆',trend:'+31%'},
    {name:'Masala Dosa',reason:'Breakfast trending now',price:120,emoji:'🥞',trend:'+18%'},
    {name:'Filter Coffee',reason:'Morning rush favourite',price:50,emoji:'☕',trend:'+24%'},
  ],
  chefsPick:[
    {name:'Dal Makhani',reason:'Slow-cooked overnight — house specialty',price:260,emoji:'🫕'},
    {name:'Chicken Tikka Masala',reason:'Chef\'s signature recipe since 2010',price:380,emoji:'🍗'},
    {name:'Rasmalai',reason:'Made fresh daily at 4 PM',price:110,emoji:'🍮'},
  ],
  bestValue:[
    {name:'Thali (Full)',reason:'₹8.50/calorie — best value',price:180,emoji:'🍱'},
    {name:'Vada Pav',reason:'Street snack, restaurant quality',price:40,emoji:'🍔'},
    {name:'Masala Chai',reason:'Most loved, cheapest item',price:30,emoji:'🍵'},
  ],
};

function RecoCard({ title, icon: Icon, items, color }) {
  return (
    <div style={{ background:'var(--white)', borderRadius:12, border:'1px solid var(--gray-200)', padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <Icon size={16} color={color}/>
        <span style={{ fontSize:14, fontWeight:700 }}>{title}</span>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom: i < items.length-1 ? '1px solid var(--gray-100)' : 'none' }}>
          <span style={{ fontSize:22 }}>{item.emoji}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>{item.name}</div>
            <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:1 }}>{item.reason}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--green)' }}>₹{item.price}</div>
            {item.trend && <div style={{ fontSize:10, color:'#059669', fontWeight:700 }}>{item.trend}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AIRecommendations({ shopId }) {
  const [data, setData]         = useState(DEMO);
  const [loading, setLoading]   = useState(false);
  const [context, setContext]   = useState('lunch special, 4 people, ordered Paneer Butter Masala');
  const [aiOffline, setAiOffline] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const result = await callAIJson(SYSTEM, `Shop: ${shopId || 'demo restaurant'}\nCurrent cart context: ${context}\nGenerate recommendations for an Indian restaurant.`);
      if (result) { setData(result); setAiOffline(false); }
      else { setData(recommendationsFallback()); setAiOffline(true); }
    } catch {
      setData(recommendationsFallback());
      setAiOffline(true);
    }
    setLoading(false);
  };

  useEffect(() => { generate(); }, []);

  return (
    <div style={{ maxWidth:800, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#FEF3C7', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Star size={20} color="#D97706"/>
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>AI Recommendations</div>
          <div style={{ fontSize:12, color:'var(--gray-400)' }}>People Also Ordered · Trending · Chef's Pick · Best Value</div>
        </div>
        <button onClick={generate} disabled={loading} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, fontSize:12, background:'var(--green)', color:'white', border:'none', padding:'7px 14px', borderRadius:8, cursor:'pointer' }}>
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}/> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {aiOffline && (
        <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:8, padding:'8px 14px', marginBottom:14, fontSize:12, color:'#92400E', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><WifiOff size={12}/> AI offline — showing curated recommendations</span>
          <button onClick={generate} style={{ fontSize:11, background:'none', border:'1px solid #D97706', color:'#92400E', padding:'3px 10px', borderRadius:6, cursor:'pointer' }}>Retry AI</button>
        </div>
      )}

      <div style={{ marginBottom:16, display:'flex', gap:10 }}>
        <input value={context} onChange={e => setContext(e.target.value)}
          placeholder="Cart context (e.g. ordered paneer curry, 2 people…)"
          style={{ flex:1, border:'1px solid var(--gray-200)', borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none' }}/>
        <button onClick={generate} style={{ background:'var(--green-light)', color:'var(--green-dark)', border:'none', padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>
          <Sparkles size={12}/> Generate
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <RecoCard title="People Also Ordered" icon={Star}     color="#D97706" items={data.peopleAlsoOrdered || []}/>
        <RecoCard title="Trending Now"         icon={TrendingUp} color="#DC2626" items={data.trending || []}/>
        <RecoCard title="Chef's Pick"          icon={Star}     color="#1D9E75" items={data.chefsPick || []}/>
        <RecoCard title="Best Value"           icon={Clock}    color="#2563EB" items={data.bestValue || []}/>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
