import { useState } from 'react';
import { Sparkles, Search, MessageSquare, TrendingUp, Star, Shield, BarChart2,
         Zap, Mic, Package, ChevronRight, Bot } from 'lucide-react';
import AIRecommendations from '../../components/ai/AIRecommendations.jsx';
import AIMenuSearch from '../../components/ai/AIMenuSearch.jsx';
import AIChatbot from '../../components/ai/AIChatbot.jsx';
import AIAnalytics from '../../components/ai/AIAnalytics.jsx';
import AIDescriptionGenerator from '../../components/ai/AIDescriptionGenerator.jsx';
import AIReviewSentiment from '../../components/ai/AIReviewSentiment.jsx';
import AIFraudDetection from '../../components/ai/AIFraudDetection.jsx';
import AIDemandForecast from '../../components/ai/AIDemandForecast.jsx';
import AIDynamicPricing from '../../components/ai/AIDynamicPricing.jsx';
import AIAdminAssistant from '../../components/ai/AIAdminAssistant.jsx';
import AIVoiceOrder from '../../components/ai/AIVoiceOrder.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import './AIHub.css';

const FEATURES = [
  { key:'recommendations', icon:Star,          label:'Recommendations',     desc:'People also ordered, trending, personalized picks' },
  { key:'search',          icon:Search,         label:'Smart menu search',   desc:'Natural language: "veg under ₹300", "jain food"' },
  { key:'chatbot',         icon:MessageSquare,  label:'Support chatbot',     desc:'Orders, refunds, FAQs — always on' },
  { key:'analytics',       icon:BarChart2,      label:'AI analytics',        desc:'Revenue summaries, growth insights, forecasts' },
  { key:'descriptions',    icon:Sparkles,       label:'Description writer',  desc:'Generate SEO-friendly menu copy instantly' },
  { key:'sentiment',       icon:TrendingUp,     label:'Review sentiment',    desc:'Analyse customer feedback, spot issues' },
  { key:'fraud',           icon:Shield,         label:'Fraud detection',     desc:'Fake orders, duplicate accounts, risk scores' },
  { key:'forecast',        icon:TrendingUp,     label:'Demand forecast',     desc:'Predict peak hours, inventory needs, staff load' },
  { key:'pricing',         icon:Zap,            label:'Dynamic pricing',     desc:'AI-generated promotions based on demand & time' },
  { key:'assistant',       icon:Bot,            label:'Admin assistant',     desc:'Ask anything about your business in plain language' },
  { key:'voice',           icon:Mic,            label:'Voice ordering',      desc:'Hands-free ordering for kitchen and customers' },
];

const PANELS = {
  recommendations: AIRecommendations,
  search:          AIMenuSearch,
  chatbot:         AIChatbot,
  analytics:       AIAnalytics,
  descriptions:    AIDescriptionGenerator,
  sentiment:       AIReviewSentiment,
  fraud:           AIFraudDetection,
  forecast:        AIDemandForecast,
  pricing:         AIDynamicPricing,
  assistant:       AIAdminAssistant,
  voice:           AIVoiceOrder,
};

export default function AIHub() {
  const { user } = useAuth();
  const shopId = user?.shopId;
  const [active, setActive] = useState('assistant');
  const Panel = PANELS[active];

  return (
    <div className="ai-hub">
      <aside className="ai-sidebar">
        <div className="ai-sidebar-header">
          <Sparkles size={16} style={{ color:'#1D9E75' }}/>
          <span>AI Features</span>
          <span className="ai-badge">11 active</span>
        </div>
        <nav>
          {FEATURES.map(f => (
            <button key={f.key} className={`ai-nav-item ${active === f.key ? 'active' : ''}`}
              onClick={() => setActive(f.key)}>
              <f.icon size={15}/>
              <div className="ai-nav-text">
                <span className="ai-nav-label">{f.label}</span>
                <span className="ai-nav-desc">{f.desc}</span>
              </div>
              <ChevronRight size={12} className="ai-nav-arrow"/>
            </button>
          ))}
        </nav>
      </aside>
      <div className="ai-panel">
        <Panel shopId={shopId} user={user}/>
      </div>
    </div>
  );
}
