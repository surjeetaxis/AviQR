import { useState, useRef, useEffect } from 'react';
import { Bot, Send, RefreshCw, Sparkles } from 'lucide-react';
import { callAIStream } from './aiClient.js';

const SYSTEM = `You are the AviQR AI Admin Assistant — a helpful business intelligence assistant for Indian restaurant, hotel, and mall owners using the AviQR platform.

You help owners:
- Understand their revenue, orders, and analytics in plain language
- Get actionable recommendations to grow their business
- Answer questions about using AviQR features
- Explain peak hours, top items, customer retention strategies
- Suggest pricing, promotions, and inventory decisions

You speak in a friendly, concise, professional tone. Use Indian context (₹ for currency, Indian food items, Indian business practices). Keep answers under 150 words unless a detailed analysis is requested. Format with bullet points when listing items.`;

const STARTERS = [
  'How can I increase revenue this weekend?',
  'Which items should I promote during lunch hours?',
  'How do I set up dynamic pricing for peak hours?',
  'What does my customer retention look like?',
  'Suggest a festival promotion for Diwali',
  'How do I reduce order cancellations?',
];

export default function AIAdminAssistant({ shopId, user }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Hello ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your AviQR AI Assistant. I can help you understand your business performance, suggest promotions, and answer any questions about running your restaurant or hotel. What would you like to know?`,
  }]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text = input) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const assistantMsg = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMsg]);

    const context = `Shop ID: ${shopId || 'demo'} | Owner: ${user?.name || 'Owner'} | Role: ${user?.role || 'OWNER'}`;

    try {
      await callAIStream(
        SYSTEM,
        `Context: ${context}\n\nQuestion: ${text}`,
        chunk => {
          setMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: msgs[msgs.length - 1].content + chunk };
            return msgs;
          });
        },
        800
      );
    } catch {
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { role: 'assistant', content: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.' };
        return msgs;
      });
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Bot size={20} color="#1D9E75"/>
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>AI Admin Assistant</div>
          <div style={{ fontSize:12, color:'var(--gray-400)' }}>Powered by Claude · Always available</div>
        </div>
        <button style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray-500)', background:'var(--gray-100)', border:'none', padding:'6px 12px', borderRadius:8, cursor:'pointer' }}
          onClick={() => setMessages([{ role:'assistant', content:'Hi! How can I help you with your business today?' }])}>
          <RefreshCw size={12}/> Clear
        </button>
      </div>

      {/* Starter prompts */}
      {messages.length <= 1 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
          {STARTERS.map(s => (
            <button key={s} onClick={() => send(s)}
              style={{ fontSize:12, padding:'6px 12px', background:'var(--white)', border:'1px solid var(--gray-200)', borderRadius:20, cursor:'pointer', color:'var(--gray-700)', transition:'all .15s' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Chat */}
      <div style={{ background:'var(--white)', borderRadius:12, border:'1px solid var(--gray-200)', overflow:'hidden' }}>
        <div style={{ height:400, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display:'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ width:28, height:28, borderRadius:8, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', marginRight:8, flexShrink:0, marginTop:2 }}>
                  <Sparkles size={14} color="#1D9E75"/>
                </div>
              )}
              <div style={{
                maxWidth:'80%', padding:'10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? '#1D9E75' : 'var(--gray-50)',
                color: msg.role === 'user' ? 'white' : 'var(--gray-900)',
                fontSize:14, lineHeight:1.6,
              }}>
                {msg.content || (loading && i === messages.length - 1
                  ? <span style={{ display:'flex', gap:4 }}>{[0,1,2].map(n => <span key={n} style={{ width:6, height:6, borderRadius:'50%', background:'var(--gray-300)', animation:`dot .8s ${n*.2}s infinite` }}/>)}</span>
                  : '')}
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>
        <div style={{ borderTop:'1px solid var(--gray-100)', padding:12, display:'flex', gap:10 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            ref={inputRef}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask anything about your business…"
            style={{ flex:1, border:'1px solid var(--gray-200)', borderRadius:8, padding:'8px 12px', fontSize:14, outline:'none' }}/>
          <button onClick={() => send()} disabled={loading || !input.trim()}
            style={{ width:38, height:38, borderRadius:8, background: input.trim() ? '#1D9E75' : 'var(--gray-100)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
            <Send size={16} color={input.trim() ? 'white' : 'var(--gray-400)'}/>
          </button>
        </div>
      </div>
      <style>{`@keyframes dot{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}`}</style>
    </div>
  );
}
