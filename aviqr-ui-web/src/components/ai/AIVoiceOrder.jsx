import { useState, useRef } from 'react';
import { Mic, MicOff, Sparkles, ShoppingCart, Volume2, WifiOff } from 'lucide-react';
import { callAIJson } from './aiClient.js';
import { voiceFallback } from './aiFallback.js';

const SYSTEM = `You are an AI voice ordering assistant for an Indian restaurant. Given a transcribed voice command, extract the order intent.

Return ONLY JSON:
{
  "understood": true,
  "items": [{"name":"Paneer Tikka","qty":2,"note":"less spicy"}],
  "action": "add_to_cart|remove|clear|checkout|status",
  "response": "Natural language response to speak back to user",
  "tableNumber": null
}

Handle phrases like: "2 paneer tikka less spicy", "ek butter naan", "remove the lassi", "what's in my cart", "place the order for table 5".
Support Hindi mixing: "ek", "do", "teen" = 1, 2, 3.`;

const MENU_ITEMS = ['Paneer Tikka', 'Butter Naan', 'Dal Makhani', 'Sweet Lassi', 'Veg Biryani', 'Filter Coffee', 'Gulab Jamun', 'Samosa'];

export default function AIVoiceOrder() {
  const [listening, setListening]   = useState(false);
  const [transcript, setTranscript] = useState('');
  const [cart, setCart]             = useState([]);
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [aiOffline, setAiOffline]   = useState(false);
  const [supported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const recognitionRef = useRef(null);

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-IN'; u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'en-IN'; r.continuous = false; r.interimResults = true;
    r.onresult = e => {
      const t = Array.from(e.results).map(x => x[0].transcript).join('');
      setTranscript(t);
      if (e.results[0].isFinal) processVoice(t);
    };
    r.onend = () => setListening(false);
    r.start(); setListening(true); recognitionRef.current = r;
  };

  const stopListening = () => { recognitionRef.current?.stop(); setListening(false); };

  const processVoice = async (text) => {
    setLoading(true);
    let r = null;
    try {
      r = await callAIJson(SYSTEM, `Voice command: "${text}"\nCurrent cart: ${JSON.stringify(cart)}\nAvailable items: ${MENU_ITEMS.join(', ')}`);
      if (r) setAiOffline(false);
      else { r = voiceFallback(text, cart, MENU_ITEMS); setAiOffline(true); }
    } catch {
      r = voiceFallback(text, cart, MENU_ITEMS);
      setAiOffline(true);
    }
    if (r) {
      setResult(r);
      if (r.action === 'add_to_cart' && r.items) {
        setCart(prev => {
          const newCart = [...prev];
          r.items.forEach(item => {
            const existing = newCart.find(c => c.name.toLowerCase() === item.name.toLowerCase());
            if (existing) existing.qty += item.qty;
            else newCart.push(item);
          });
          return newCart;
        });
      } else if (r.action === 'clear') setCart([]);
      if (r.response) speak(r.response);
    }
    setLoading(false);
  };

  const typeAndProcess = async (text) => {
    setTranscript(text);
    await processVoice(text);
  };

  return (
    <div style={{ maxWidth:680, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Mic size={20} color="#DC2626"/>
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>AI Voice Ordering</div>
          <div style={{ fontSize:12, color:'var(--gray-400)' }}>Speak to order · Hindi + English · Hands-free</div>
        </div>
      </div>

      {!supported && (
        <div style={{ background:'#FEF3C7', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#92400E' }}>
          Voice recognition requires Chrome or Edge browser.
        </div>
      )}

      {aiOffline && (
        <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:8, padding:'8px 14px', marginBottom:14, fontSize:12, color:'#92400E', display:'flex', alignItems:'center', gap:6 }}>
          <WifiOff size={12}/> AI offline — using keyword-based order parsing
        </div>
      )}

      {/* Mic button */}
      <div style={{ textAlign:'center', marginBottom:20 }}>
        <button onClick={listening ? stopListening : startListening} disabled={!supported}
          style={{ width:80, height:80, borderRadius:'50%', border:'none', cursor:supported?'pointer':'not-allowed',
            background: listening ? '#DC2626' : 'var(--green)', color:'white', display:'inline-flex', alignItems:'center', justifyContent:'center',
            transition:'all .2s', transform: listening ? 'scale(1.1)' : 'scale(1)',
            boxShadow: listening ? '0 0 0 8px rgba(220,38,38,0.15),0 0 0 16px rgba(220,38,38,0.08)' : 'none' }}>
          {listening ? <MicOff size={32}/> : <Mic size={32}/>}
        </button>
        <div style={{ marginTop:10, fontSize:13, color:'var(--gray-400)' }}>
          {listening ? '🔴 Listening… speak your order' : 'Tap to start voice ordering'}
        </div>
        {transcript && <div style={{ marginTop:6, fontSize:13, fontWeight:600, color:'var(--gray-700)' }}>"{transcript}"</div>}
      </div>

      {/* Quick text commands */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
        {['2 paneer tikka less spicy','ek butter naan','add sweet lassi','what\'s in my cart?','place order for table 5'].map(cmd => (
          <button key={cmd} onClick={() => typeAndProcess(cmd)}
            style={{ fontSize:12, padding:'5px 12px', background:'var(--gray-100)', border:'none', borderRadius:20, cursor:'pointer', color:'var(--gray-700)' }}>
            "{cmd}"
          </button>
        ))}
      </div>

      {/* AI response */}
      {(result || loading) && (
        <div style={{ background: result?.understood ? '#DCFCE7' : '#FEE2E2', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', gap:10 }}>
          <Volume2 size={16} color={result?.understood ? '#059669' : '#DC2626'} style={{ flexShrink:0, marginTop:1 }}/>
          <div style={{ fontSize:13, color: result?.understood ? '#065F46' : '#991B1B', lineHeight:1.5 }}>
            {loading ? 'Processing…' : result?.response}
          </div>
        </div>
      )}

      {/* Cart */}
      {cart.length > 0 && (
        <div style={{ background:'var(--white)', borderRadius:12, border:'1px solid var(--gray-200)', padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
            <ShoppingCart size={14} color="var(--green)"/>
            <span style={{ fontSize:13, fontWeight:700 }}>Voice cart ({cart.length} items)</span>
            <button onClick={() => setCart([])} style={{ marginLeft:'auto', fontSize:11, color:'var(--gray-400)', background:'none', border:'none', cursor:'pointer' }}>Clear</button>
          </div>
          {cart.map((item, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'5px 0', borderBottom: i<cart.length-1?'1px solid var(--gray-100)':'none' }}>
              <span>{item.name} {item.note && <span style={{ fontSize:11, color:'var(--gray-400)' }}>({item.note})</span>}</span>
              <span style={{ fontWeight:700 }}>×{item.qty}</span>
            </div>
          ))}
          <button style={{ marginTop:10, width:'100%', padding:'9px', fontSize:13, fontWeight:700, background:'var(--green)', color:'white', border:'none', borderRadius:8, cursor:'pointer' }}>
            <Sparkles size={13} style={{ verticalAlign:'middle', marginRight:4 }}/>Place Order
          </button>
        </div>
      )}
    </div>
  );
}
