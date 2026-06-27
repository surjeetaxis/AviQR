import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Phone, RefreshCw, Sparkles } from 'lucide-react';
import { callAIStream } from './aiClient.js';

const SYSTEM = `You are a friendly customer support chatbot for AviQR — a restaurant ordering platform.

You can help customers with:
- Order status and tracking
- Menu questions (ingredients, allergens, veg/non-veg)
- Payment questions and refunds
- Restaurant information (hours, location, contact)
- Promotions and offers
- How to place or modify an order

Keep responses brief (under 80 words). Be warm and helpful. If a question requires human intervention (refund disputes, allergies, complaints), say "Let me connect you to our team" and offer to take their phone number.

You speak in English by default but switch languages if customer uses Hindi or another Indian language.`;

const QUICK_REPLIES = ['Where is my order?', 'Is this item veg?', 'Can I get a refund?', 'What are today\'s specials?', 'Speak to a human'];

export default function AIChatbot({ shopId }) {
  const [messages, setMessages] = useState([{
    role:'assistant',
    content:'Hi! 👋 I\'m your AviQR support assistant. How can I help you today? You can ask about your order, menu, or payments.'
  }]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [escalated, setEscalated] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const send = async (text = input) => {
    if (!text.trim() || loading) return;
    if (text.toLowerCase().includes('human') || text.toLowerCase().includes('agent')) {
      setEscalated(true);
      setMessages(prev => [...prev,
        { role:'user', content:text },
        { role:'assistant', content:'Connecting you to our support team! 📞 You can also reach us directly at support@aviqr.in or call +91 98450 00000. Average response time: under 2 hours.' }
      ]);
      setInput('');
      return;
    }

    const userMsg = { role:'user', content:text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role:'assistant', content:'' }]);

    const history = messages.slice(-6).map(m => `${m.role === 'user' ? 'Customer' : 'Bot'}: ${m.content}`).join('\n');
    try {
      await callAIStream(SYSTEM,
        `Conversation history:\n${history}\n\nCustomer says: ${text}`,
        chunk => {
          setMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length-1] = { ...msgs[msgs.length-1], content: msgs[msgs.length-1].content + chunk };
            return msgs;
          });
        }, 400);
    } catch {
      setMessages(prev => { const m=[...prev]; m[m.length-1]={role:'assistant',content:'Sorry, something went wrong. Please try again!'}; return m; });
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth:600, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#DBEAFE', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <MessageSquare size={20} color="#2563EB"/>
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>Customer Support Chatbot</div>
          <div style={{ fontSize:12, color:'var(--gray-400)' }}>AI-powered · Multilingual · 24/7</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#059669', fontWeight:600 }}>
          <span style={{ width:7, height:7, background:'#059669', borderRadius:'50%', display:'inline-block', animation:'pulse 2s infinite' }}/>
          Online
        </div>
      </div>

      <div style={{ background:'var(--white)', borderRadius:12, border:'1px solid var(--gray-200)', overflow:'hidden' }}>
        <div style={{ height:380, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:10 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display:'flex', justifyContent: msg.role==='user' ? 'flex-end' : 'flex-start', alignItems:'flex-end', gap:8 }}>
              {msg.role === 'assistant' && (
                <div style={{ width:26, height:26, borderRadius:8, background:'#DBEAFE', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Sparkles size={12} color="#2563EB"/>
                </div>
              )}
              <div style={{ maxWidth:'75%', padding:'9px 13px',
                borderRadius: msg.role==='user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                background: msg.role==='user' ? '#2563EB' : '#F8FAFC',
                color: msg.role==='user' ? 'white' : 'var(--gray-900)',
                fontSize:13, lineHeight:1.5 }}>
                {msg.content || <span style={{ color:'var(--gray-300)' }}>…</span>}
              </div>
            </div>
          ))}
          {escalated && (
            <div style={{ textAlign:'center', padding:'10px', background:'#FEF3C7', borderRadius:8, fontSize:12, color:'#92400E' }}>
              <Phone size={12} style={{ verticalAlign:'middle', marginRight:4 }}/> Connecting to human support…
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        <div style={{ borderTop:'1px solid var(--gray-100)', padding:'10px 12px' }}>
          <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
            {QUICK_REPLIES.map(q => (
              <button key={q} onClick={() => send(q)}
                style={{ fontSize:11, padding:'4px 10px', background:'var(--gray-50)', border:'1px solid var(--gray-200)', borderRadius:20, cursor:'pointer', color:'var(--gray-700)' }}>
                {q}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key==='Enter' && send()}
              placeholder="Type your message…"
              style={{ flex:1, border:'1px solid var(--gray-200)', borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none' }}/>
            <button onClick={() => send()} disabled={!input.trim() || loading}
              style={{ width:36, height:36, borderRadius:8, background:input.trim()?'#2563EB':'var(--gray-100)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <Send size={15} color={input.trim()?'white':'var(--gray-400)'}/>
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
