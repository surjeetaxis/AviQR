import { useState } from 'react';
import { Search, Sparkles, Leaf, Flame, X } from 'lucide-react';
import { callAIJson } from './aiClient.js';

const SYSTEM = `You are an intelligent menu search engine for an Indian restaurant. Given a natural language query and a menu, return matching items.

Support: veg/non-veg filters, price ranges, spice levels, dietary preferences (jain, vegan, gluten-free), meal types, ingredient exclusions, language variants (Hindi, Tamil transliterations).

Return ONLY JSON:
{
  "results": [
    {"id":"i1","name":"Item Name","price":250,"veg":true,"spicy":false,"desc":"One line description","matchReason":"Why this matches","emoji":"🍛","score":0.95}
  ],
  "interpretation": "What the AI understood from the query",
  "alternatives": ["Suggestion 1 if no results", "Suggestion 2"]
}`;

const SAMPLE_MENU = `MENU:
Starters: Paneer Tikka ₹280 (veg,spicy), Samosa ₹60 (veg), Chicken 65 ₹320 (nonveg,spicy), Soup ₹80 (veg)
Mains: Paneer Butter Masala ₹320 (veg), Dal Makhani ₹260 (veg), Chicken Tikka Masala ₹380 (nonveg,spicy), Veg Biryani ₹220 (veg,mild), Chicken Biryani ₹320 (nonveg,spicy)
Breads: Butter Naan ₹50 (veg), Garlic Naan ₹60 (veg), Paratha ₹55 (veg)
Drinks: Sweet Lassi ₹80 (veg), Masala Chai ₹30 (veg), Filter Coffee ₹50 (veg)
Desserts: Gulab Jamun ₹90 (veg), Rasmalai ₹110 (veg)`;

const EXAMPLES = [
  'Vegetarian dishes under ₹300',
  'Best spicy chicken',
  'Jain food options',
  'Something for kids',
  'High protein meals',
  'Breakfast under ₹200',
  'Veg biryani without onion',
];

export default function AIMenuSearch({ shopId }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    const r = await callAIJson(SYSTEM, `${SAMPLE_MENU}\n\nUSER QUERY: "${q}"`);
    setResults(r);
    setLoading(false);
  };

  return (
    <div style={{ maxWidth:680, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#EDE9FE', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Search size={20} color="#7C3AED"/>
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>AI Menu Search</div>
          <div style={{ fontSize:12, color:'var(--gray-400)' }}>Natural language · Spell-tolerant · Multilingual</div>
        </div>
      </div>

      <div style={{ position:'relative', marginBottom:14 }}>
        <Search size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)' }}/>
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder='Try: "veg under ₹300", "spicy chicken", "jain food", "high protein"'
          style={{ width:'100%', padding:'12px 48px 12px 44px', fontSize:14, border:'2px solid var(--gray-200)', borderRadius:12, outline:'none', transition:'border .15s' }}
          onFocus={e => e.target.style.borderColor='var(--green)'}
          onBlur={e => e.target.style.borderColor='var(--gray-200)'}/>
        {query && <button onClick={() => { setQuery(''); setResults(null); }}
          style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--gray-400)' }}>
          <X size={14}/>
        </button>}
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:20 }}>
        {EXAMPLES.map(e => (
          <button key={e} onClick={() => { setQuery(e); search(e); }}
            style={{ fontSize:12, padding:'4px 10px', background:'var(--gray-100)', border:'none', borderRadius:20, cursor:'pointer', color:'var(--gray-700)' }}>
            {e}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>
          <Sparkles size={24} style={{ animation:'spin 1s linear infinite', marginBottom:8 }}/>
          <div style={{ fontSize:14 }}>Searching with AI…</div>
        </div>
      )}

      {results && !loading && (
        <>
          {results.interpretation && (
            <div style={{ background:'#EDE9FE', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#5B21B6' }}>
              <strong>Understood as:</strong> {results.interpretation}
            </div>
          )}
          {results.results?.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {results.results.map((item, i) => (
                <div key={i} style={{ background:'var(--white)', borderRadius:10, border:'1px solid var(--gray-200)', padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:28 }}>{item.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:14, fontWeight:700 }}>{item.name}</span>
                      {item.veg ? <Leaf size={12} color="#059669"/> : <Flame size={12} color="#DC2626"/>}
                    </div>
                    <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{item.desc}</div>
                    <div style={{ fontSize:11, color:'#7C3AED', marginTop:3 }}>✦ {item.matchReason}</div>
                  </div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--green)', flexShrink:0 }}>₹{item.price}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>
              <div style={{ fontSize:14, marginBottom:10 }}>No exact matches found</div>
              {results.alternatives?.map(a => (
                <button key={a} onClick={() => { setQuery(a); search(a); }}
                  style={{ display:'block', margin:'6px auto', fontSize:13, color:'var(--green)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                  Try: "{a}"
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
