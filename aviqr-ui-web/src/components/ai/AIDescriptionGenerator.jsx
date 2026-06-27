import { useState } from 'react';
import { Sparkles, Copy, Check, RefreshCw, WifiOff, Zap } from 'lucide-react';
import { callAI } from './aiClient.js';
import { descriptionFallback } from './aiFallback.js';

const SYSTEM = `You are a professional menu copywriter specialising in Indian restaurants.
Given a dish name and optional details, generate compelling menu copy.
Format your response EXACTLY as:

**Short description** (15-20 words, appetising, sensory):
[your text]

**Long description** (40-50 words, story-telling):
[your text]

**Ingredients highlight**:
[key ingredients comma-separated]

**Taste profile**:
[e.g. Rich, Creamy, Mildly spiced, Tangy finish]

**Allergens** (if any):
[list or "None identified"]

**SEO tags**:
[5 comma-separated keywords]

Write in English. Make it mouthwatering and authentic. No hallucinations about ingredients not mentioned.`;

export default function AIDescriptionGenerator() {
  const [name, setName]         = useState('');
  const [details, setDetails]   = useState('');
  const [result, setResult]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [copied, setCopied]     = useState('');
  const [aiOffline, setAiOffline] = useState(false);

  const generate = async () => {
    if (!name.trim()) return;
    setLoading(true); setResult('');
    try {
      const text = await callAI(SYSTEM, `Dish name: ${name}\nAdditional details: ${details || 'none'}`);
      setResult(text);
      setAiOffline(false);
    } catch {
      setResult(descriptionFallback(name, details));
      setAiOffline(true);
    }
    setLoading(false);
  };

  const generateOffline = () => {
    if (!name.trim()) return;
    setResult(descriptionFallback(name, details));
    setAiOffline(true);
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const parseSection = (key) => {
    const match = result.match(new RegExp(`\\*\\*${key}\\*\\*[^\\n]*\\n([\\s\\S]*?)(?=\\n\\n\\*\\*|$)`));
    return match?.[1]?.trim() || '';
  };

  const SECTIONS = [
    { key:'Short description', label:'Short description' },
    { key:'Long description',  label:'Long description' },
    { key:'Ingredients highlight', label:'Ingredients' },
    { key:'Taste profile', label:'Taste profile' },
    { key:'Allergens \\(if any\\)', label:'Allergens' },
    { key:'SEO tags', label:'SEO keywords' },
  ];

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#FEF3C7', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Sparkles size={20} color="#D97706"/>
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>AI Description Generator</div>
          <div style={{ fontSize:12, color:'var(--gray-400)' }}>SEO-friendly menu copy · Allergen info · Taste profile</div>
        </div>
      </div>

      {aiOffline && (
        <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:8, padding:'8px 14px', marginBottom:14, fontSize:12, color:'#92400E', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><WifiOff size={12}/> AI offline — showing template-based copy</span>
          <button onClick={generate} style={{ fontSize:11, background:'none', border:'1px solid #D97706', color:'#92400E', padding:'3px 10px', borderRadius:6, cursor:'pointer' }}>Retry AI</button>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, marginBottom:16 }}>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--gray-600)', display:'block', marginBottom:6 }}>Dish name *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Paneer Butter Masala, Veg Biryani, Filter Coffee"
            style={{ width:'100%', border:'1px solid var(--gray-200)', borderRadius:8, padding:'9px 12px', fontSize:14, outline:'none' }}/>
        </div>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--gray-600)', display:'block', marginBottom:6 }}>Key ingredients (optional)</label>
          <input value={details} onChange={e => setDetails(e.target.value)}
            placeholder="e.g. paneer, tomato, cream"
            style={{ width:'100%', border:'1px solid var(--gray-200)', borderRadius:8, padding:'9px 12px', fontSize:14, outline:'none' }}/>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {['Paneer Tikka','Masala Dosa','Chicken Biryani','Filter Coffee','Gulab Jamun'].map(d => (
          <button key={d} onClick={() => setName(d)}
            style={{ fontSize:12, padding:'5px 12px', background:'var(--gray-100)', border:'none', borderRadius:20, cursor:'pointer', color:'var(--gray-700)' }}>
            {d}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        <button onClick={generate} disabled={!name.trim() || loading}
          style={{ flex:1, padding:'12px', fontSize:14, fontWeight:600, background:name.trim()?'var(--green)':'var(--gray-200)', color:name.trim()?'white':'var(--gray-400)', border:'none', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Sparkles size={15}/> {loading ? 'Writing…' : 'Generate menu copy'}
        </button>
        <button onClick={generateOffline} disabled={!name.trim() || loading}
          title="Generate using templates — no AI required"
          style={{ padding:'12px 16px', fontSize:13, fontWeight:600, background:'var(--gray-100)', color:'var(--gray-600)', border:'1px solid var(--gray-200)', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
          <Zap size={14}/> Without AI
        </button>
      </div>

      {result && !loading && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {SECTIONS.map(s => {
            const content = parseSection(s.key);
            if (!content) return null;
            return (
              <div key={s.key} style={{ background:'var(--white)', borderRadius:10, border:'1px solid var(--gray-200)', padding:'12px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:.5 }}>{s.label}</span>
                  <button onClick={() => copy(content, s.key)}
                    style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color: copied===s.key ? '#059669' : 'var(--gray-400)', background:'none', border:'none', cursor:'pointer' }}>
                    {copied===s.key ? <><Check size={11}/> Copied</> : <><Copy size={11}/> Copy</>}
                  </button>
                </div>
                <p style={{ fontSize:13, color:'var(--gray-700)', lineHeight:1.6, margin:0 }}>{content}</p>
              </div>
            );
          })}
          <button onClick={generate}
            style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray-500)', background:'none', border:'none', cursor:'pointer', alignSelf:'flex-end', marginTop:4 }}>
            <RefreshCw size={12}/> Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
