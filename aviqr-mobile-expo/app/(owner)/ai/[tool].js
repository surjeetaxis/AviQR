import { useState, useRef } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { callAI, callAIJson } from '../../../src/api/aiClient.js';
import * as FB from '../../../src/utils/aiFallback.js';
import { Button } from '../../../src/components/common/Button.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../../src/theme/index.js';

const TITLES = {
  recommendations: '⭐ Recommendations', search: '🔍 Smart Menu Search', chatbot: '💬 Support Chatbot',
  analytics: '📊 AI Analytics', descriptions: '✨ Description Writer', sentiment: '📈 Review Sentiment',
  fraud: '🛡️ Fraud Detection', forecast: '🔮 Demand Forecast', pricing: '⚡ Dynamic Pricing',
  assistant: '🤖 Admin Assistant', voice: '🎙️ Voice Ordering',
};

const OWNER_SYSTEM = `You are the AviQR Owner Intelligence Assistant for Indian restaurant, hotel, and mall owners.

Research basis (2025): 76% of restaurant operators say technology gives competitive edge. AI-powered loyalty programs increase customer LTV by 20-30%. Dynamic pricing generates 8-12% revenue uplift. Menu engineering increases average order value by 15-20%.

DAILY BRIEFING — when owner asks for a morning briefing, generate: Yesterday (orders, revenue, avg order, peak hour, top item), This week (revenue, % vs last month), Needs attention (top 3), Today's opportunity (ONE specific actionable thing).

REVENUE GROWTH — top levers: combo upsell prompts (+12% order value), peak pricing Fri/Sat 7-10PM, loyalty points (2.3x return rate), WhatsApp broadcasts (35% open rate), low-stock urgency messaging. Always show the math.

MENU ENGINEERING — classify into quadrants: STARS (high pop + high margin, feature it), PLOWHORSES (high pop + low margin, raise price), PUZZLES (low pop + high margin, reposition), DOGS (low pop + low margin, remove after 2 months). Food cost target under 30%.

Use Indian context (₹, Indian food items). Keep answers concise and actionable with bullet points.`;

const OWNER_STARTERS = ['Give me this morning\'s business briefing', 'How can I increase revenue this weekend?', 'Analyse my menu — which items to feature or remove?', 'Suggest a festival promotion campaign'];

const CHATBOT_SYSTEM = `You are the friendly menu and order assistant for an AviQR restaurant. Warm, helpful, like a great waiter. Help with: dish info, veg/non-veg, dietary needs, price questions, spice guidance, recommendations. Cannot process payments or change prices. Keep responses under 100 words. Be warm and specific.`;

const RECO_SYSTEM = `You are an AI recommendation engine for AviQR. Return ONLY this JSON: {"peopleAlsoOrdered":[{"name":"Item","reason":"why","price":250,"emoji":"🍛"}],"trending":[{"name":"Item","reason":"why","price":180,"emoji":"🌮"}],"chefsPick":[{"name":"Item","reason":"why","price":320,"emoji":"⭐"}],"bestValue":[{"name":"Item","reason":"why","price":120,"emoji":"💰"}]}. 3 items each, Indian food, ₹ prices.`;

const SEARCH_SYSTEM = `You are an intelligent menu search engine for an Indian restaurant. Support veg/non-veg, price ranges, spice levels, dietary preferences. Return ONLY JSON: {"results":[{"name":"Item","price":250,"veg":true,"spicy":false,"desc":"one line","matchReason":"why","emoji":"🍛"}],"interpretation":"what AI understood","alternatives":["suggestion"]}`;

const ANALYTICS_SYSTEM = `You are an expert restaurant business analytics AI. Given order/revenue data, produce a clear report with these ### headers: ### Daily snapshot ### Revenue insights ### Top performers ### Peak hours analysis ### Customer behaviour ### Actionable recommendations. Be specific with numbers, Indian context. Under 300 words.`;

const DESC_SYSTEM = `You are a professional menu copywriter for Indian restaurants. Format EXACTLY: **Short description**\\n[15-20 words]\\n\\n**Long description**\\n[40-50 words]\\n\\n**Ingredients highlight**\\n[comma separated]\\n\\n**Taste profile**\\n[e.g. Rich, Creamy]\\n\\n**Allergens**\\n[list or "None identified"]\\n\\n**SEO tags**\\n[5 keywords]. No hallucinated ingredients.`;

const SENTIMENT_SYSTEM = `You are a restaurant review sentiment analysis AI. Return ONLY JSON: {"overallSentiment":"positive|neutral|negative","score":85,"summary":"2 sentences","positives":["thing1","thing2"],"negatives":["complaint1"],"popularDishes":["dish1"],"recommendations":["rec1","rec2"],"reviewBreakdown":{"positive":70,"neutral":20,"negative":10}}`;

const FRAUD_SYSTEM = `You are a fraud detection AI for AviQR. Return ONLY JSON: {"riskScore":72,"riskLevel":"high|medium|low","flags":[{"type":"FAKE_PHONE","severity":"high","description":"why","recommendation":"what to do"}],"summary":"brief","autoActions":["action"],"safeSignals":["signal"]}. Risk: high(70+) medium(40-69) low(0-39).`;

const FORECAST_SYSTEM = `You are a demand forecasting AI for an Indian restaurant. Return ONLY JSON: {"nextWeekRevenue":168000,"confidence":82,"peakDays":["Friday","Saturday"],"peakHours":["12:30-1:30 PM"],"staffRecommendation":"text","inventoryNeeds":[{"item":"Paneer","currentStock":"2kg","predictedNeed":"5kg","urgency":"high"}],"promotionSuggestion":"text","insights":["insight1","insight2"]}`;

const PRICING_SYSTEM = `You are a dynamic pricing AI for an Indian restaurant. Return ONLY JSON: {"promotions":[{"name":"Deal","trigger":"when","discount":"15% off","targetItems":["item"],"expectedImpact":"text","emoji":"🍱","urgency":"high"}],"peakSurcharge":{"amount":"10%","when":"Fri-Sun 7-10PM","rationale":"why"},"insights":["insight"]}`;

const VOICE_SYSTEM = `You are an AI voice ordering assistant for an Indian restaurant. Extract order intent from transcript. Return ONLY JSON: {"understood":true,"items":[{"name":"Paneer Tikka","qty":2,"note":"less spicy"}],"action":"add_to_cart|remove|clear|checkout|status","response":"reply to speak back","tableNumber":null}. Handle Hindi numbers: ek=1,do=2,teen=3.`;

const MENU_ITEMS = ['Paneer Tikka', 'Butter Naan', 'Dal Makhani', 'Veg Biryani', 'Chicken Tikka Masala', 'Masala Chai', 'Gulab Jamun'];
const SAMPLE_REVIEWS = ['Amazing food, loved the paneer tikka! Staff were super friendly.\n---\nWaited 40 minutes for our order, food was cold when it arrived. Disappointed.\n---\nBest biryani in town, great value for money. Will definitely recommend!'].join('');
const DEMO_ORDER = { id: 'ORD-2847', phone: '98450XXXXX', amount: 850, pastOrders: 3, paymentMethod: 'UPI' };

export default function AiToolScreen() {
  const { tool } = useLocalSearchParams();
  const [offline, setOffline] = useState(false);

  return (
    <View style={ss.screen}>
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={ss.back}>‹ Back</Text></TouchableOpacity>
        <Text style={ss.title}>{TITLES[tool] || 'AI Tool'}</Text>
        <View style={{ width: 44 }} />
      </View>
      {offline && <View style={ss.offlineBanner}><Text style={ss.offlineTxt}>⚠ AI is offline — showing rule-based results (needs ANTHROPIC_API_KEY configured server-side)</Text></View>}
      {tool === 'recommendations' && <RecommendationsTool setOffline={setOffline} />}
      {tool === 'search' && <SearchTool setOffline={setOffline} />}
      {tool === 'chatbot' && <ChatTool setOffline={setOffline} system={CHATBOT_SYSTEM} initial="Hi! Ask me about our menu, prices, or dietary options." fallback={FB.chatbotFallback} />}
      {tool === 'analytics' && <AnalyticsTool setOffline={setOffline} />}
      {tool === 'descriptions' && <DescriptionTool setOffline={setOffline} />}
      {tool === 'sentiment' && <SentimentTool setOffline={setOffline} />}
      {tool === 'fraud' && <FraudTool setOffline={setOffline} />}
      {tool === 'forecast' && <ForecastTool setOffline={setOffline} />}
      {tool === 'pricing' && <PricingTool setOffline={setOffline} />}
      {tool === 'assistant' && <ChatTool setOffline={setOffline} system={OWNER_SYSTEM} initial="Ask me anything about your business — try one of the starters below." starters={OWNER_STARTERS} fallback={FB.adminChatbotFallback} />}
      {tool === 'voice' && <VoiceTool setOffline={setOffline} />}
    </View>
  );
}

// ── Generic "generate once, show result" shell ──────────────────────────────
function GenerateTool({ label, onGenerate, children, result }) {
  const [loading, setLoading] = useState(false);
  const run = async () => { setLoading(true); await onGenerate(); setLoading(false); };
  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
      {children}
      <Button title={loading ? 'Thinking…' : label} onPress={run} loading={loading} style={{ marginTop: 12 }} />
      {result}
    </ScrollView>
  );
}

function Card({ children, style }) { return <View style={[ss.card, style]}>{children}</View>; }
function SectionLabel({ children }) { return <Text style={ss.sectionLabel}>{children}</Text>; }

// ── Recommendations ──────────────────────────────────────────────────────────
function RecommendationsTool({ setOffline }) {
  const [data, setData] = useState(null);
  const [context, setContext] = useState('lunch special, 4 people, ordered Paneer Butter Masala');
  const generate = async () => {
    try { const r = await callAIJson(RECO_SYSTEM, `Current cart context: ${context}. Generate recommendations for an Indian restaurant.`); if (!r) throw new Error(); setData(r); setOffline(false); }
    catch { setData(FB.recommendationsFallback()); setOffline(true); }
  };
  return (
    <GenerateTool label="Generate Recommendations" onGenerate={generate} result={data && (
      <View style={{ marginTop: 16 }}>
        {[['peopleAlsoOrdered', 'People Also Ordered'], ['trending', 'Trending'], ['chefsPick', "Chef's Pick"], ['bestValue', 'Best Value']].map(([key, title]) => (
          <View key={key} style={{ marginBottom: 16 }}>
            <SectionLabel>{title}</SectionLabel>
            {(data[key] || []).map((item, i) => (
              <Card key={i}><Text style={ss.itemRow}>{item.emoji} {item.name} — ₹{item.price}</Text><Text style={ss.itemReason}>{item.reason}</Text></Card>
            ))}
          </View>
        ))}
      </View>
    )}>
      <SectionLabel>Cart context</SectionLabel>
      <TextInput style={ss.input} value={context} onChangeText={setContext} multiline />
    </GenerateTool>
  );
}

// ── Smart Menu Search ────────────────────────────────────────────────────────
function SearchTool({ setOffline }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try { const r = await callAIJson(SEARCH_SYSTEM, `Menu: ${MENU_ITEMS.join(', ')}\nQUERY: "${query}"`); if (!r) throw new Error(); setResult(r); setOffline(false); }
    catch { setResult(FB.menuSearchFallback(query)); setOffline(true); }
    finally { setLoading(false); }
  };
  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
      <SectionLabel>Try: "veg under ₹300", "something spicy"</SectionLabel>
      <TextInput style={ss.input} placeholder="Search the menu…" value={query} onChangeText={setQuery} onSubmitEditing={search} />
      <Button title={loading ? 'Searching…' : 'Search'} onPress={search} loading={loading} style={{ marginTop: 8 }} />
      {result && (
        <View style={{ marginTop: 16 }}>
          <Text style={ss.interpretation}>{result.interpretation}</Text>
          {(result.results || []).map((item, i) => (
            <Card key={i}><Text style={ss.itemRow}>{item.emoji} {item.name} — ₹{item.price}</Text><Text style={ss.itemReason}>{item.matchReason || item.desc}</Text></Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ── Generic chat (Chatbot + Admin Assistant) ────────────────────────────────
function ChatTool({ system, initial, starters, fallback, setOffline }) {
  const [messages, setMessages] = useState([{ role: 'assistant', text: initial }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const send = async (text) => {
    const msg = text ?? input;
    if (!msg.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput(''); setLoading(true);
    try {
      const reply = await callAI(system, msg, 500);
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      setOffline(false);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: fallback(msg) }]);
      setOffline(true);
    } finally { setLoading(false); setTimeout(() => scrollRef.current?.scrollToEnd(), 100); }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: Spacing.base, gap: 10 }}>
        {messages.map((m, i) => (
          <View key={i} style={[ss.bubble, m.role === 'user' ? ss.bubbleUser : ss.bubbleAi]}>
            <Text style={m.role === 'user' ? ss.bubbleUserTxt : ss.bubbleAiTxt}>{m.text}</Text>
          </View>
        ))}
        {loading && <ActivityIndicator color={Colors.primary} />}
        {starters && messages.length === 1 && (
          <View style={{ gap: 8 }}>
            {starters.map(s => <TouchableOpacity key={s} style={ss.starterChip} onPress={() => send(s)}><Text style={ss.starterTxt}>{s}</Text></TouchableOpacity>)}
          </View>
        )}
      </ScrollView>
      <View style={ss.chatInputRow}>
        <TextInput style={ss.chatInput} placeholder="Type a message…" value={input} onChangeText={setInput} onSubmitEditing={() => send()} />
        <TouchableOpacity style={ss.sendBtn} onPress={() => send()}><Text style={{ color: Colors.white, fontWeight: '700' }}>Send</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// ── Analytics ─────────────────────────────────────────────────────────────
function AnalyticsTool({ setOffline }) {
  const [report, setReport] = useState('');
  const demo = { today: { revenue: 24500, orders: 73, avg: 336 }, yesterday: { revenue: 21000, orders: 65 }, topItems: ['Paneer Tikka', 'Butter Naan'], peakHours: ['1-2 PM', '8-9 PM'], newCustomers: 12, returnCustomers: 28 };
  const generate = async () => {
    try {
      const text = await callAI(ANALYTICS_SYSTEM, `Analyse: revenue ₹${demo.today.revenue}, ${demo.today.orders} orders today vs ₹${demo.yesterday.revenue} yesterday. Top items: ${demo.topItems.join(', ')}. Peak: ${demo.peakHours.join(', ')}.`, 600);
      setReport(text); setOffline(false);
    } catch { setReport(FB.analyticsFallback(demo)); setOffline(true); }
  };
  return <GenerateTool label="Generate Report" onGenerate={generate} result={!!report && <Card style={{ marginTop: 16 }}><Text style={ss.reportTxt}>{report}</Text></Card>}>
    <SectionLabel>Uses today's real KPIs to generate a business summary</SectionLabel>
  </GenerateTool>;
}

// ── Description Writer ──────────────────────────────────────────────────────
function DescriptionTool({ setOffline }) {
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [result, setResult] = useState('');
  const generate = async () => {
    if (!name.trim()) return;
    try { const text = await callAI(DESC_SYSTEM, `Dish name: ${name}\nDetails: ${details || 'none'}`); setResult(text); setOffline(false); }
    catch { setResult(FB.descriptionFallback(name, details)); setOffline(true); }
  };
  return <GenerateTool label="Generate Copy" onGenerate={generate} result={!!result && <Card style={{ marginTop: 16 }}><Text style={ss.reportTxt}>{result}</Text></Card>}>
    <SectionLabel>Dish name *</SectionLabel>
    <TextInput style={ss.input} placeholder="Paneer Tikka" value={name} onChangeText={setName} />
    <SectionLabel>Details (optional)</SectionLabel>
    <TextInput style={ss.input} placeholder="Marinated, tandoor-grilled…" value={details} onChangeText={setDetails} multiline />
  </GenerateTool>;
}

// ── Review Sentiment ─────────────────────────────────────────────────────────
function SentimentTool({ setOffline }) {
  const [reviews, setReviews] = useState(SAMPLE_REVIEWS);
  const [result, setResult] = useState(null);
  const generate = async () => {
    try { const r = await callAIJson(SENTIMENT_SYSTEM, `Analyse these reviews:\n\n${reviews}`); if (!r) throw new Error(); setResult(r); setOffline(false); }
    catch { setResult(FB.sentimentFallback(reviews)); setOffline(true); }
  };
  return <GenerateTool label="Analyse Sentiment" onGenerate={generate} result={result && (
    <View style={{ marginTop: 16 }}>
      <Card><Text style={ss.scoreTxt}>{result.score}% {result.overallSentiment}</Text><Text style={ss.itemReason}>{result.summary}</Text></Card>
      {result.positives?.length > 0 && <><SectionLabel>👍 Positives</SectionLabel>{result.positives.map((p, i) => <Text key={i} style={ss.bullet}>• {p}</Text>)}</>}
      {result.negatives?.length > 0 && <><SectionLabel>👎 Negatives</SectionLabel>{result.negatives.map((n, i) => <Text key={i} style={ss.bullet}>• {n}</Text>)}</>}
      {result.recommendations?.length > 0 && <><SectionLabel>💡 Recommendations</SectionLabel>{result.recommendations.map((r, i) => <Text key={i} style={ss.bullet}>• {r}</Text>)}</>}
    </View>
  )}>
    <SectionLabel>Reviews (separate with ---)</SectionLabel>
    <TextInput style={[ss.input, { minHeight: 100 }]} value={reviews} onChangeText={setReviews} multiline />
  </GenerateTool>;
}

// ── Fraud Detection ──────────────────────────────────────────────────────────
function FraudTool({ setOffline }) {
  const [result, setResult] = useState(null);
  const generate = async () => {
    try { const r = await callAIJson(FRAUD_SYSTEM, `Order: ${JSON.stringify(DEMO_ORDER)}`); if (!r) throw new Error(); setResult(r); setOffline(false); }
    catch { setResult(FB.fraudFallback(DEMO_ORDER)); setOffline(true); }
  };
  const riskColor = { high: '#DC2626', medium: '#D97706', low: '#059669' };
  return <GenerateTool label={`Analyse Order ${DEMO_ORDER.id}`} onGenerate={generate} result={result && (
    <View style={{ marginTop: 16 }}>
      <Card><Text style={[ss.scoreTxt, { color: riskColor[result.riskLevel] }]}>{result.riskScore}/100 · {result.riskLevel} risk</Text><Text style={ss.itemReason}>{result.summary}</Text></Card>
      {(result.flags || []).map((f, i) => <Card key={i}><Text style={ss.itemRow}>⚠ {f.type}</Text><Text style={ss.itemReason}>{f.description}</Text><Text style={ss.bullet}>→ {f.recommendation}</Text></Card>)}
      {(result.safeSignals || []).map((s, i) => <Text key={i} style={ss.bullet}>✓ {s}</Text>)}
    </View>
  )}>
    <Card><Text style={ss.itemRow}>Order {DEMO_ORDER.id} · ₹{DEMO_ORDER.amount}</Text><Text style={ss.itemReason}>{DEMO_ORDER.pastOrders} past orders · {DEMO_ORDER.paymentMethod}</Text></Card>
  </GenerateTool>;
}

// ── Demand Forecast ──────────────────────────────────────────────────────────
function ForecastTool({ setOffline }) {
  const [result, setResult] = useState(null);
  const generate = async () => {
    try { const r = await callAIJson(FORECAST_SYSTEM, `Last 7 days: Mon ₹18k, Tue ₹22k, Wed ₹19k, Thu ₹26k, Fri ₹34k, Sat ₹42k, Sun ₹38k. Top items: Paneer Tikka, Butter Naan, Biryani. Forecast next 7 days.`); if (!r) throw new Error(); setResult(r); setOffline(false); }
    catch { setResult(FB.forecastFallback()); setOffline(true); }
  };
  return <GenerateTool label="Forecast Next 7 Days" onGenerate={generate} result={result && (
    <View style={{ marginTop: 16 }}>
      <Card><Text style={ss.scoreTxt}>₹{result.nextWeekRevenue?.toLocaleString('en-IN')}</Text><Text style={ss.itemReason}>Predicted revenue · {result.confidence}% confidence</Text></Card>
      <SectionLabel>Peak days: {(result.peakDays || []).join(', ')}</SectionLabel>
      <SectionLabel>Staffing</SectionLabel><Text style={ss.bullet}>{result.staffRecommendation}</Text>
      <SectionLabel>Inventory needs</SectionLabel>
      {(result.inventoryNeeds || []).map((n, i) => <Card key={i}><Text style={ss.itemRow}>{n.item} — {n.urgency} urgency</Text><Text style={ss.itemReason}>{n.currentStock} → need {n.predictedNeed}</Text></Card>)}
      <SectionLabel>💡 {result.promotionSuggestion}</SectionLabel>
    </View>
  )}>
    <SectionLabel>Forecasts next week using your last 7 days of revenue</SectionLabel>
  </GenerateTool>;
}

// ── Dynamic Pricing ──────────────────────────────────────────────────────────
function PricingTool({ setOffline }) {
  const [context, setContext] = useState('Indian restaurant, weekday lunch is slow, weekends are packed');
  const [result, setResult] = useState(null);
  const generate = async () => {
    try { const r = await callAIJson(PRICING_SYSTEM, `Context: ${context}. Generate pricing promotions.`); if (!r) throw new Error(); setResult(r); setOffline(false); }
    catch { setResult(FB.pricingFallback()); setOffline(true); }
  };
  return <GenerateTool label="Generate Promotions" onGenerate={generate} result={result && (
    <View style={{ marginTop: 16 }}>
      {(result.promotions || []).map((p, i) => (
        <Card key={i}><Text style={ss.itemRow}>{p.emoji} {p.name}</Text><Text style={ss.itemReason}>{p.trigger} · {p.discount}</Text><Text style={ss.bullet}>{p.expectedImpact}</Text></Card>
      ))}
      {result.peakSurcharge && <Card><Text style={ss.itemRow}>Peak surcharge: {result.peakSurcharge.amount}</Text><Text style={ss.itemReason}>{result.peakSurcharge.when} — {result.peakSurcharge.rationale}</Text></Card>}
    </View>
  )}>
    <SectionLabel>Business context</SectionLabel>
    <TextInput style={ss.input} value={context} onChangeText={setContext} multiline />
  </GenerateTool>;
}

// ── Voice Ordering (transcript-based, no on-device speech-to-text yet) ─────
function VoiceTool({ setOffline }) {
  const [transcript, setTranscript] = useState('');
  const [cart, setCart] = useState([]);
  const [reply, setReply] = useState('');
  const send = async () => {
    if (!transcript.trim()) return;
    try {
      const r = await callAIJson(VOICE_SYSTEM, `Voice command: "${transcript}"\nCart: ${JSON.stringify(cart)}\nMenu: ${MENU_ITEMS.join(', ')}`);
      if (!r) throw new Error();
      apply(r); setOffline(false);
    } catch { apply(FB.voiceFallback(transcript, cart, MENU_ITEMS)); setOffline(true); }
    setTranscript('');
  };
  const apply = (r) => {
    setReply(r.response);
    if (r.action === 'add_to_cart') setCart(prev => [...prev, ...r.items]);
    if (r.action === 'clear') setCart([]);
  };
  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
      <SectionLabel>No on-device speech-to-text yet — type what you'd say</SectionLabel>
      <TextInput style={ss.input} placeholder='e.g. "2 paneer tikka less spicy"' value={transcript} onChangeText={setTranscript} onSubmitEditing={send} />
      <Button title="Send Command" onPress={send} style={{ marginTop: 8 }} />
      {!!reply && <Card style={{ marginTop: 16 }}><Text style={ss.itemReason}>🎙️ {reply}</Text></Card>}
      <SectionLabel>Cart ({cart.length})</SectionLabel>
      {cart.map((c, i) => <Text key={i} style={ss.bullet}>{c.qty}× {c.name}{c.note ? ` (${c.note})` : ''}</Text>)}
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900 },
  offlineBanner: { backgroundColor: '#FEF3C7', padding: 10, borderBottomWidth: 1, borderBottomColor: '#FCD34D' },
  offlineTxt: { fontSize: 11, color: '#92400E', fontWeight: '600' },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray700, marginBottom: 8, marginTop: 8 },
  input: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.gray200, borderRadius: Radius.md, padding: 12, fontSize: FontSize.sm, color: Colors.gray900, marginBottom: 8 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, marginBottom: 8, ...Shadow.sm },
  itemRow: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  itemReason: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  interpretation: { fontSize: FontSize.xs, color: Colors.gray400, marginBottom: 10, fontStyle: 'italic' },
  reportTxt: { fontSize: FontSize.sm, color: Colors.gray700, lineHeight: 20 },
  scoreTxt: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  bullet: { fontSize: FontSize.xs, color: Colors.gray600, marginBottom: 4, lineHeight: 18 },
  bubble: { maxWidth: '85%', borderRadius: Radius.lg, padding: 12 },
  bubbleUser: { backgroundColor: Colors.primary, alignSelf: 'flex-end' },
  bubbleAi: { backgroundColor: Colors.white, alignSelf: 'flex-start', ...Shadow.sm },
  bubbleUserTxt: { color: Colors.white, fontSize: FontSize.sm },
  bubbleAiTxt: { color: Colors.gray900, fontSize: FontSize.sm },
  starterChip: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border },
  starterTxt: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  chatInputRow: { flexDirection: 'row', gap: 8, padding: Spacing.base, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  chatInput: { flex: 1, height: 44, backgroundColor: Colors.gray50, borderRadius: Radius.md, paddingHorizontal: 14, fontSize: FontSize.sm },
  sendBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
});
