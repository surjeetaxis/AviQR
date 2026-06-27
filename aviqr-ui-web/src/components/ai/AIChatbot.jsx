import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Phone, RefreshCw, Sparkles, WifiOff } from 'lucide-react';
import { callAIStream } from './aiClient.js';
import { chatbotFallback } from './aiFallback.js';

const SYSTEM = `You are the friendly menu and order assistant for an AviQR restaurant, available via the QR menu. Your personality: warm, helpful, knowledgeable about the food — like a great waiter who knows the menu inside-out but is never pushy.

WHAT YOU CAN HELP WITH (CUS-1):
• Explaining what a dish is and how it tastes
• Finding veg/non-veg options ("Show me only veg")
• Dietary needs ("I'm Jain — what can I eat?", "Does this have dairy?")
• Price-based questions ("What's good under ₹200?")
• Spice level guidance ("I can't handle spicy food")
• Portion size ("Is this enough for 2 people?")
• Recommendations based on mood ("Something light and refreshing")
• Order status and tracking

WHAT YOU CANNOT DO:
• Process payments — direct to checkout
• Change prices or apply discounts — direct to cashier
• Promise delivery times — direct to staff

LOYALTY AWARENESS (CUS-2):
If customer asks about points: "You can earn 1 point for every ₹10 spent. 100 points = ₹10 off your next order. Double points on your birthday month. Milestones: 500 points = free dessert, 1000 = free starter."
If customer is close to a milestone, mention it enthusiastically.

POST-ORDER FEEDBACK (CUS-3):
If collecting feedback: ask ONE question at a time. Start with star rating. If 4–5 stars: "What was the highlight?" If 1–3 stars: "What can we do better?" Then: "Was the issue with: Food quality / Wait time / Staff / Something else?" Finally: "Would you recommend us?" (Yes/No/Maybe). Keep tone conversational — "How was it?" not "Please rate your experience."

LANGUAGE: Match the customer — English → English, Hindi → Hindi, Hinglish → Hinglish.
NEVER make up information about a dish. If unsure about an ingredient, say "Please ask our staff to confirm."
When a customer decides what they want, say: "Great choice! You can add it by tapping the + button next to [ITEM_NAME]."
Keep responses brief (under 100 words). Be warm, specific, and genuine.`;

const QUICK_REPLIES = ['What\'s good under ₹200?', 'Show me veg options', 'Is this dish spicy?', 'My order is taking long', 'Speak to a human'];

export default function AIChatbot({ shopId }) {
  const [messages, setMessages] = useState([{
    role:'assistant',
    content:'Hi! 👋 I\'m your AviQR support assistant. How can I help you today? You can ask about your order, menu, or payments.'
  }]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [aiOffline, setAiOffline] = useState(false);
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
      setAiOffline(false);
    } catch {
      const fallbackReply = chatbotFallback(text);
      setMessages(prev => { const m=[...prev]; m[m.length-1]={role:'assistant',content:fallbackReply}; return m; });
      setAiOffline(true);
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
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:600, color: aiOffline ? '#D97706' : '#059669' }}>
          {aiOffline ? <><WifiOff size={11}/> FAQ mode</> : <><span style={{ width:7, height:7, background:'#059669', borderRadius:'50%', display:'inline-block', animation:'pulse 2s infinite' }}/>Online</>}
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
