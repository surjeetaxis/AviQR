// Mobile port of aviqr-ui-web's aiFallback.js — rule-based fallbacks used
// when the real Claude API call fails (no ANTHROPIC_API_KEY configured,
// network error, etc.). Every function mirrors the JSON/text shape its
// caller expects from the real AI, so the UI degrades gracefully instead
// of breaking. Pure logic, ported as-is (no DOM/React dependency on web's side).

export function descriptionFallback(name, details = '') {
  const lower = (name + ' ' + details).toLowerCase();
  const isNonVeg = /chicken|mutton|fish|prawn|egg|meat|lamb|beef|keema/i.test(lower);
  const isDessert = /gulab|halwa|kheer|ice.?cream|rasgulla|rasmalai|barfi|ladoo|jalebi|payasam/i.test(lower);
  const isBreakfast = /dosa|idli|vada|paratha|poha|upma|uttapam/i.test(lower);
  const isBiryani = /biryani|pulao|fried.?rice/i.test(lower);
  const isDrink = /lassi|chai|tea|coffee|juice|lemonade|sharbat/i.test(lower);
  const d = name.trim();
  let short, long, ingredients, taste, allergens, tags;

  if (isDrink) {
    short = `Refreshing ${d} — the perfect accompaniment to your meal, crafted fresh every time.`;
    long = `Our ${d} is prepared fresh to order using quality ingredients that deliver a perfectly balanced, refreshing experience.`;
    ingredients = 'Fresh ingredients, No artificial preservatives'; taste = 'Refreshing, Balanced, Smooth'; allergens = 'Dairy (may contain)';
    tags = `${d}, Indian drink, refreshing, restaurant beverage, fresh`;
  } else if (isDessert) {
    short = `Indulgent ${d} — a timeless Indian sweet to end your meal on a perfect, memorable note.`;
    long = `Our ${d} is crafted with care using authentic, time-honoured recipes — a balance of sweetness, richness, and delicate spice.`;
    ingredients = 'Milk, Sugar, Cardamom, Saffron, Rose water'; taste = 'Sweet, Rich, Aromatic, Melt-in-mouth'; allergens = 'Milk, Nuts (may contain)';
    tags = `${d}, Indian dessert, sweet dish, traditional, mithais`;
  } else if (isBiryani) {
    short = `Aromatic ${d} — fragrant basmati layered with spices and slow-cooked to absolute perfection.`;
    long = `Our signature ${d}: long-grain basmati slow-cooked with hand-picked spices, fresh herbs, and ${isNonVeg ? 'tender marinated meat' : 'farm-fresh vegetables'}.`;
    ingredients = `Basmati rice, Onion, Yoghurt, Whole spices, Saffron, Ghee${isNonVeg ? ', Marinated meat' : ', Fresh vegetables'}`;
    taste = 'Aromatic, Rich, Mildly spiced, Buttery'; allergens = 'Dairy (ghee)'; tags = `${d}, biryani, aromatic rice, Indian biryani, dum biryani`;
  } else if (isBreakfast) {
    short = `Crispy ${d} — a South Indian breakfast staple that is light, nutritious, and incredibly satisfying.`;
    long = `Start your day with our freshly made ${d} — golden and crispy outside, soft inside, served with fresh chutneys and hot sambar.`;
    ingredients = 'Rice, Lentils, Fenugreek, Salt, Fresh spices'; taste = 'Light, Crispy, Mildly tangy, Wholesome'; allergens = 'Gluten-free option available';
    tags = `${d}, South Indian breakfast, healthy, vegetarian, traditional`;
  } else if (isNonVeg) {
    short = `Tender ${d} — expertly marinated and cooked to bring out bold, smoky, unforgettable flavours.`;
    long = `Our ${d}: premium cuts marinated overnight in aromatic spices and yoghurt, cooked to a beautifully caramelised finish.`;
    ingredients = details || 'Premium meat, Yoghurt, Ginger, Garlic, Whole spices, Cream'; taste = 'Bold, Smoky, Juicy, Richly spiced'; allergens = 'None identified';
    tags = `${d}, non-vegetarian, Indian cuisine, grilled, restaurant signature`;
  } else {
    short = `Delicious ${d} — a vibrant vegetarian delight crafted with the finest fresh ingredients.`;
    long = `Our ${d} celebrates the best of Indian vegetarian cooking — fresh, farm-sourced produce with a balanced blend of aromatic spices.`;
    ingredients = details || 'Fresh vegetables, Cream, Tomatoes, Ginger, Garlic, Aromatic spices'; taste = 'Rich, Creamy, Well-spiced, Balanced'; allergens = 'None identified';
    tags = `${d}, vegetarian, Indian cuisine, fresh, healthy`;
  }
  return `**Short description**\n${short}\n\n**Long description**\n${long}\n\n**Ingredients highlight**\n${ingredients}\n\n**Taste profile**\n${taste}\n\n**Allergens**\n${allergens}\n\n**SEO tags**\n${tags}`;
}

export function analyticsFallback(data) {
  const { today, yesterday, topItems, peakHours, newCustomers, returnCustomers } = data;
  const revGrowth = Math.round((today.revenue - yesterday.revenue) / yesterday.revenue * 100);
  const ordGrowth = Math.round((today.orders - yesterday.orders) / yesterday.orders * 100);
  const retPct = Math.round(returnCustomers / (returnCustomers + newCustomers) * 100);
  return `### Daily snapshot\nToday's service generated ₹${today.revenue.toLocaleString('en-IN')} across ${today.orders} orders (avg ₹${today.avg}/order). Revenue is ${revGrowth >= 0 ? `up ${revGrowth}%` : `down ${Math.abs(revGrowth)}%`}, orders ${ordGrowth >= 0 ? `up ${ordGrowth}%` : `down ${Math.abs(ordGrowth)}%`} vs yesterday.\n\n### Revenue insights\nAverage order value ₹${today.avg} suggests ${today.avg > 300 ? 'strong upsell performance' : 'room to improve combo offers'}.\n\n### Top performers\n${topItems.map((item, i) => `${i + 1}. ${item}`).join(' · ')} are today's revenue drivers.\n\n### Peak hours analysis\nBusiest windows: ${peakHours.join(' and ')}. Ensure full staffing then.\n\n### Customer behaviour\n${returnCustomers} returning (${retPct}%) vs ${newCustomers} new. ${retPct > 70 ? 'Excellent loyalty.' : 'Focus on converting new guests into regulars.'}\n\n### Actionable recommendations\n• Stock extra ${topItems[0]} and ${topItems[1]}\n• Add kitchen staff at ${peakHours[0]}\n• ${retPct < 60 ? 'Launch a loyalty programme' : 'Send a WhatsApp weekend offer to your loyal base'}`;
}

export function recommendationsFallback() {
  return {
    peopleAlsoOrdered: [
      { name: 'Butter Naan', reason: 'Ordered with 78% of mains', price: 50, emoji: '🫓' },
      { name: 'Sweet Lassi', reason: 'Top drink pairing today', price: 80, emoji: '🥛' },
      { name: 'Gulab Jamun', reason: 'Most popular dessert', price: 90, emoji: '🍮' },
    ],
    trending: [
      { name: 'Paneer Tikka', reason: '+31% orders this week', price: 280, emoji: '🧆' },
      { name: 'Masala Dosa', reason: 'Breakfast trending now', price: 120, emoji: '🥞' },
      { name: 'Filter Coffee', reason: 'Morning rush favourite', price: 50, emoji: '☕' },
    ],
    chefsPick: [
      { name: 'Dal Makhani', reason: 'Slow-cooked overnight — house specialty', price: 260, emoji: '🫕' },
      { name: 'Chicken Tikka Masala', reason: "Chef's signature recipe", price: 380, emoji: '🍗' },
      { name: 'Rasmalai', reason: 'Made fresh daily at 4 PM', price: 110, emoji: '🍮' },
    ],
    bestValue: [
      { name: 'Thali (Full)', reason: '₹8.50/calorie — best value meal', price: 180, emoji: '🍱' },
      { name: 'Vada Pav', reason: 'Street classic, restaurant quality', price: 40, emoji: '🍔' },
      { name: 'Masala Chai', reason: 'Most loved, most affordable', price: 30, emoji: '🍵' },
    ],
  };
}

const MENU = [
  { name: 'Paneer Tikka', price: 280, veg: true, spicy: true, emoji: '🧆', tags: ['starter', 'paneer', 'spicy', 'grilled', 'protein'] },
  { name: 'Samosa', price: 60, veg: true, spicy: false, emoji: '🥟', tags: ['starter', 'snack', 'veg', 'cheap', 'kids'] },
  { name: 'Chicken 65', price: 320, veg: false, spicy: true, emoji: '🍗', tags: ['starter', 'chicken', 'spicy', 'fried'] },
  { name: 'Paneer Butter Masala', price: 320, veg: true, spicy: false, emoji: '🍛', tags: ['main', 'paneer', 'veg', 'creamy', 'protein'] },
  { name: 'Dal Makhani', price: 260, veg: true, spicy: false, emoji: '🫕', tags: ['main', 'dal', 'veg', 'protein', 'healthy'] },
  { name: 'Chicken Tikka Masala', price: 380, veg: false, spicy: true, emoji: '🍗', tags: ['main', 'chicken', 'spicy', 'nonveg', 'protein'] },
  { name: 'Veg Biryani', price: 220, veg: true, spicy: false, emoji: '🍚', tags: ['main', 'biryani', 'veg', 'rice', 'meal'] },
  { name: 'Chicken Biryani', price: 320, veg: false, spicy: true, emoji: '🍚', tags: ['main', 'biryani', 'nonveg', 'rice', 'meal'] },
  { name: 'Butter Naan', price: 50, veg: true, spicy: false, emoji: '🫓', tags: ['bread', 'naan', 'veg', 'cheap'] },
  { name: 'Sweet Lassi', price: 80, veg: true, spicy: false, emoji: '🥛', tags: ['drink', 'sweet', 'veg', 'dairy'] },
  { name: 'Masala Chai', price: 30, veg: true, spicy: false, emoji: '🍵', tags: ['drink', 'tea', 'cheap', 'veg'] },
  { name: 'Gulab Jamun', price: 90, veg: true, spicy: false, emoji: '🍮', tags: ['dessert', 'sweet', 'veg', 'warm'] },
  { name: 'Thali (Full)', price: 180, veg: true, spicy: false, emoji: '🍱', tags: ['main', 'value', 'veg', 'meal', 'kids'] },
];

export function menuSearchFallback(query) {
  const q = query.toLowerCase();
  const f = {
    veg: /\bveg(etarian)?\b|no.?meat|jain/i.test(q), nonVeg: /non.?veg|chicken|mutton|meat|fish/i.test(q),
    spicy: /\bspic(y|ier)\b|\bhot\b/i.test(q), mild: /\bmild\b|not spicy|no.?spice|\bkids?\b/i.test(q),
    u100: /under.{0,5}100|very cheap/i.test(q), u200: /under.{0,5}200|cheap|budget/i.test(q), u300: /under.{0,5}300/i.test(q),
    dessert: /dessert|sweet/i.test(q), drink: /drink|lassi|chai|tea|coffee/i.test(q),
    protein: /protein|healthy|gym/i.test(q), starter: /starter|appetis|snack/i.test(q), main: /\bmain|curry|mains\b/i.test(q),
  };
  let results = MENU.filter(item => {
    if (f.veg && !item.veg) return false;
    if (f.nonVeg && item.veg) return false;
    if (f.spicy && !item.spicy) return false;
    if (f.mild && item.spicy) return false;
    if (f.u100 && item.price >= 100) return false; else if (f.u200 && item.price >= 200) return false; else if (f.u300 && item.price >= 300) return false;
    if (f.dessert && !item.tags.includes('dessert')) return false;
    if (f.drink && !item.tags.includes('drink')) return false;
    if (f.protein && !item.tags.some(t => ['protein', 'chicken', 'paneer', 'dal'].includes(t))) return false;
    if (f.starter && !item.tags.includes('starter')) return false;
    if (f.main && !item.tags.includes('main')) return false;
    return true;
  });
  const kws = q.split(/\s+/).filter(w => w.length > 2);
  results = results.map(item => {
    const score = kws.reduce((s, kw) => s + (item.name.toLowerCase().includes(kw) || item.tags.some(t => t.includes(kw)) ? 0.4 : 0), 0.5);
    return { ...item, score, matchReason: [f.veg && item.veg ? 'Vegetarian' : '', f.nonVeg && !item.veg ? 'Non-vegetarian' : '', f.mild && !item.spicy ? 'Mild' : '', f.spicy && item.spicy ? 'Spicy' : '', item.price < 100 ? 'Budget-friendly' : ''].filter(Boolean).join(', ') || 'Matches your query', desc: `${item.veg ? 'Vegetarian' : 'Non-vegetarian'} · ${item.tags[0]} · ${item.spicy ? 'Spicy' : 'Mild'}` };
  }).sort((a, b) => b.score - a.score).slice(0, 6);
  const activeFilters = Object.entries(f).filter(([, v]) => v).map(([k]) => k).join(', ');
  return { results, interpretation: `Keyword search (AI offline): ${activeFilters || 'general match'}`, alternatives: results.length === 0 ? ['Vegetarian dishes', 'Under ₹200', 'Best sellers'] : [] };
}

const POS_WORDS = ['amazing', 'great', 'excellent', 'loved', 'best', 'perfect', 'delicious', 'fantastic', 'awesome', 'fresh', 'friendly', 'quick', 'good', 'nice', 'superb', 'tasty'];
const NEG_WORDS = ['cold', 'slow', 'long wait', 'bad', 'poor', 'disappointed', 'issue', 'problem', 'rude', 'overpriced', 'late', 'missing', 'burnt', 'bland', 'stale'];

export function sentimentFallback(reviewsText) {
  const reviews = reviewsText.split(/---|\n\n/).map(r => r.trim()).filter(r => r.length > 10);
  let pos = 0, neg = 0, neu = 0;
  const posThings = new Set(), negThings = new Set(), dishes = [];
  reviews.forEach(review => {
    const lower = review.toLowerCase();
    const posHits = POS_WORDS.filter(w => lower.includes(w)).length;
    const negHits = NEG_WORDS.filter(w => lower.includes(w)).length;
    if (posHits > negHits) pos++; else if (negHits > posHits) neg++; else neu++;
    if (lower.includes('wait') || lower.includes('slow')) negThings.add('Long wait times noted');
    if (lower.includes('cold')) negThings.add('Food temperature issues (served cold)');
    if (lower.includes('staff') && posHits > negHits) posThings.add('Staff praised for friendliness');
    if (lower.includes('fresh')) posThings.add('Fresh ingredients appreciated');
    if (lower.includes('value')) posThings.add('Good value for money');
    if (posHits > 1) posThings.add('Food quality positively mentioned');
    ['biryani', 'paneer', 'dosa', 'naan', 'coffee', 'thali', 'tikka', 'lassi', 'chai'].forEach(dish => { if (lower.includes(dish)) dishes.push(dish.charAt(0).toUpperCase() + dish.slice(1)); });
  });
  const total = reviews.length || 1;
  const score = Math.round((pos / total) * 100);
  return {
    overallSentiment: score >= 60 ? 'positive' : score >= 35 ? 'neutral' : 'negative', score,
    summary: `Rule-based analysis of ${reviews.length} reviews: ${score}% positive. ${pos} positive, ${neg} negative, ${neu} neutral. (AI offline — keyword mode)`,
    positives: [...posThings].slice(0, 3), negatives: [...negThings].slice(0, 2), popularDishes: [...new Set(dishes)].slice(0, 4),
    serviceIssues: [...negThings].filter(t => t.includes('wait')).slice(0, 1),
    recommendations: ['Address wait times at peak hours', 'Ensure food is served hot', 'Train staff on proactive communication about delays'],
    reviewBreakdown: { positive: Math.round(pos / total * 100), neutral: Math.round(neu / total * 100), negative: Math.round(neg / total * 100) },
  };
}

export function forecastFallback() {
  return {
    nextWeekRevenue: 168000, confidence: 74, peakDays: ['Friday', 'Saturday', 'Sunday'], peakHours: ['12:30–1:30 PM', '7:30–9:00 PM'],
    staffRecommendation: '4–5 staff on weekdays, 7–8 on Friday & Saturday evenings',
    inventoryNeeds: [
      { item: 'Paneer', currentStock: '2 kg', predictedNeed: '5 kg', urgency: 'high' },
      { item: 'Basmati Rice', currentStock: '10 kg', predictedNeed: '8 kg', urgency: 'low' },
      { item: 'Butter', currentStock: '1 kg', predictedNeed: '2 kg', urgency: 'medium' },
    ],
    promotionSuggestion: 'Run a "Monday Lunch Special" (15% off all mains) — weekday lunch is historically your slowest window',
    weatherImpact: 'No live weather data in offline mode — check local forecast manually',
    insights: ['Weekend revenue typically 60–80% higher than weekday average', 'Lunch window 12–2 PM generates ~40% of daily revenue', 'Paneer-based items drive the highest order frequency'],
  };
}

export function pricingFallback() {
  return {
    promotions: [
      { name: 'Weekday Lunch Deal', trigger: 'Monday–Thursday, 12:00–3:00 PM', discount: '15% off all mains', targetItems: ['Dal Makhani', 'Veg Biryani', 'Paneer Butter Masala'], expectedImpact: '+20–25% orders during slow weekday lunch', emoji: '🍱', urgency: 'high' },
      { name: 'Happy Hour Beverages', trigger: 'Daily, 3:00–6:00 PM', discount: '20% off all drinks', targetItems: ['Sweet Lassi', 'Filter Coffee', 'Masala Chai'], expectedImpact: 'Increases afternoon footfall', emoji: '☕', urgency: 'medium' },
      { name: 'Family Feast Weekend', trigger: 'Saturday & Sunday, dine-in only', discount: 'Free dessert on orders above ₹800', targetItems: ['Thali', 'Family Biryani', 'Gulab Jamun'], expectedImpact: 'Increases average table spend by ₹150–200', emoji: '👨‍👩‍👧', urgency: 'low' },
    ],
    peakSurcharge: { amount: '10%', when: 'Friday & Saturday, 7:00–10:00 PM', rationale: 'High demand, limited seating — modest surcharge reflects premium timing' },
    insights: ['Weekday lunch shows lowest utilisation — targeted discounts improve seat turnover', 'Weekend evenings are near capacity — a small peak surcharge is justified', 'Beverage attach rate is typically low — a happy hour promotion can raise revenue 12–18%'],
  };
}

export function fraudFallback(order) {
  const flags = []; let score = 0;
  if (!/^[6-9]\d{9}$/.test(order.phone)) { flags.push({ type: 'FAKE_PHONE', severity: 'high', description: `Phone "${order.phone}" is not a valid Indian mobile number`, recommendation: 'Require OTP verification before accepting this order' }); score += 45; }
  if (order.pastOrders === 0 && order.amount > 1500) { flags.push({ type: 'SUSPICIOUS_AMOUNT', severity: 'medium', description: 'First-time customer with unusually large order (above ₹1,500)', recommendation: 'Confirm payment receipt before beginning preparation' }); score += 20; }
  if (order.pastOrders === 0 && order.paymentMethod === 'COD') { flags.push({ type: 'COD_NEW_CUSTOMER', severity: 'medium', description: 'Cash on delivery for a customer with no order history', recommendation: 'Collect 50% prepayment for large COD orders from new customers' }); score += 15; }
  const safeSignals = [];
  if (order.pastOrders > 5) { safeSignals.push(`Returning customer — ${order.pastOrders} previous orders`); score = Math.max(0, score - 25); }
  if (order.paymentMethod === 'UPI') safeSignals.push('UPI payment — low fraud risk');
  if (order.amount < 600) safeSignals.push('Order amount within normal range');
  const riskLevel = score >= 70 ? 'high' : score >= 35 ? 'medium' : 'low';
  return {
    riskScore: Math.min(100, score), riskLevel, flags,
    summary: flags.length > 0 ? `${flags.length} risk signal(s) detected for ${order.id}. Score: ${Math.min(100, score)}/100. Manual review recommended. (AI offline — rule-based)` : `Order ${order.id} passed all rule-based checks. (AI offline)`,
    autoActions: riskLevel === 'high' ? ['Flag for manual review', 'Hold order'] : riskLevel === 'medium' ? ['Flag for review'] : [], safeSignals,
  };
}

const FAQ = [
  { p: ['veg', 'vegetarian', 'jain'], r: 'We have a full vegetarian menu! Popular veg choices: Paneer Tikka (₹280), Dal Makhani (₹260), Veg Biryani (₹220).' },
  { p: ['spicy', 'hot', 'heat', 'chilli'], r: 'Mild options: Butter Naan (₹50), Sweet Lassi (₹80), Dal Makhani (₹260). Spice lovers: Paneer Tikka (₹280), Chicken 65 (₹320).' },
  { p: ['price', 'cheap', 'budget', '200'], r: 'Budget picks: Masala Chai ₹30, Samosa ₹60, Butter Naan ₹50, Thali ₹180, Veg Biryani ₹220.' },
  { p: ['wait', 'long', 'order', 'ready'], r: 'Average order time: 15–20 minutes. Peak hours may take up to 30 minutes.' },
  { p: ['pay', 'payment', 'upi', 'card'], r: 'We accept UPI (Google Pay, PhonePe, Paytm), credit/debit cards, and cash.' },
  { p: ['allerg', 'dairy', 'gluten', 'nut'], r: 'Please inform staff of any allergies. Our kitchen handles dairy, gluten, and nuts.' },
  { p: ['recommend', 'best', 'popular'], r: "Chef's picks: Dal Makhani (house specialty), Paneer Tikka Masala (#1 bestseller), Gulab Jamun for dessert!" },
  { p: ['dessert', 'sweet', 'gulab'], r: 'Desserts: Gulab Jamun ₹90 (warm), Rasmalai ₹110 (chilled). Both made fresh daily!' },
  { p: ['loyalty', 'points', 'reward'], r: 'Earn 1 point per ₹10 spent. 100 points = ₹10 off. Double points on your birthday!' },
  { p: ['takeaway', 'parcel', 'delivery'], r: 'Takeaway available at the counter. Minimum ₹200 for delivery.' },
];

export function chatbotFallback(message) {
  const lower = message.toLowerCase();
  if (/human|agent|staff|speak to|connect/i.test(lower)) return 'Connecting you to our team! Reach us at support@aviqr.com or call +91 98450 00000. *(AI offline — FAQ mode)*';
  for (const entry of FAQ) { if (entry.p.some(p => lower.includes(p))) return entry.r + ' *(AI offline — FAQ mode)*'; }
  return "Thanks for your message! Our AI is temporarily offline. For immediate help: call +91 98450 00000, email support@aviqr.com. *(AI offline)*";
}

export function adminChatbotFallback(message) {
  const ADMIN_FAQ = [
    { p: ['revenue', 'mrr', 'arr'], r: 'MRR = GROWTH ₹999 × active shops + BUSINESS ₹2,499 × active shops. Check Reports for live numbers. *(AI offline)*' },
    { p: ['plan', 'subscription', 'change'], r: 'Plan changes propagate within 5 seconds to owner dashboard. *(AI offline)*' },
    { p: ['invoice', 'billing', 'gst'], r: 'Invoices: SAC 998314. Same-state → CGST+SGST @9% each. Different state → IGST @18%. *(AI offline)*' },
    { p: ['churn', 'cancel'], r: 'Churn types: Voluntary, Involuntary (payment failed), Passive (trial expired). *(AI offline)*' },
    { p: ['inventory', 'stock'], r: 'Reorder formula: (avg_daily_usage × 7) + 20% safety stock. Flag when days_remaining < 2. *(AI offline)*' },
    { p: ['upsell', 'combo'], r: '"Add Butter Naan for ₹40?" → 12% avg order increase. *(AI offline)*' },
  ];
  const lower = message.toLowerCase();
  for (const entry of ADMIN_FAQ) { if (entry.p.some(p => lower.includes(p))) return entry.r; }
  return 'AI assistant is temporarily offline. Check your dashboard directly, or try again in a few minutes. *(AI offline)*';
}

const NUM_MAP = { ek: 1, do: 2, teen: 3, char: 4, paanch: 5, one: 1, two: 2, three: 3, four: 4, five: 5 };

export function voiceFallback(text, cart, menuItems) {
  const lower = text.toLowerCase().replace(/['"]/g, '');
  if (/what.{0,10}cart|show cart|my order|cart items/i.test(lower)) return { understood: true, items: [], action: 'status', tableNumber: null, response: cart.length ? `Your cart: ${cart.map(i => `${i.qty}× ${i.name}`).join(', ')}.` : 'Your cart is empty!' };
  if (/clear|empty|remove all|start over/i.test(lower)) return { understood: true, items: [], action: 'clear', tableNumber: null, response: 'Cart cleared! What would you like to order?' };
  const tableMatch = lower.match(/table\s*(\d+)/);
  if (/place order|checkout|confirm order/i.test(lower)) return { understood: true, items: [], action: 'checkout', tableNumber: tableMatch?.[1] || null, response: tableMatch ? `Order placed for Table ${tableMatch[1]}!` : 'Order placed! Thank you.' };
  const items = [];
  for (const item of menuItems) {
    const itemLower = item.toLowerCase();
    if (lower.includes(itemLower) || lower.includes(itemLower.split(' ')[0])) {
      let qty = 1;
      const numDigit = lower.match(/(\d+)/);
      if (numDigit) qty = parseInt(numDigit[1]);
      else { for (const [word, n] of Object.entries(NUM_MAP)) { if (lower.includes(word + ' ') || lower.startsWith(word)) { qty = n; break; } } }
      const noteMatch = lower.match(/(?:less|no|extra|more|little|without)\s+\w+/);
      items.push({ name: item, qty, note: noteMatch?.[0] || '' });
    }
  }
  if (items.length) return { understood: true, items, action: 'add_to_cart', tableNumber: null, response: `Added ${items.map(i => `${i.qty}× ${i.name}`).join(', ')} to your cart! (AI offline — keyword mode)` };
  return { understood: false, items: [], action: 'status', tableNumber: null, response: `Couldn't recognise that (AI offline). Try: "${menuItems.slice(0, 2).join('", "')}"` };
}
