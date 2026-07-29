import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { planApi, offerApi } from '../../api/index.js';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../theme/index.js';
import { Logo } from '../common/Logo.js';

// Mobile port of aviqr-ui-web/src/pages/landing/Landing.jsx — same section
// order and same copy, condensed for a single scrolling phone column instead
// of a multi-column desktop grid. Pricing pulls the same real endpoints the
// web page uses (planApi.listPublic / offerApi.listActive), not static copy.

// Real seeded public shop ("AviQR Demo Kitchen") — the demo CTA opens an
// actual live menu backed by the real backend, not fabricated preview data
// (web's own "/menu/demo" route is a hardcoded client-side mock for this exact button).
const DEMO_SHOP_ID = '37b03f5b-564e-40be-a998-b42e52e24004';

const STATS = [
  { value: 'Free',   label: 'Starter plan — no card' },
  { value: '9',      label: 'Indian languages' },
  { value: '<10m',   label: 'Setup time' },
  { value: '99.9%',  label: 'Uptime SLA' },
];

const CUSTOMER_FEATURES = [
  { emoji: '📱', title: 'No App to Install',        desc: 'Scan with any phone camera — opens straight in the browser.' },
  { emoji: '🌐', title: '9 Indian Languages',        desc: 'Every menu auto-translates — Hindi, Tamil, Telugu, Bengali and more.' },
  { emoji: '🎥', title: 'Video & 3D Dish Previews',  desc: 'See a video or rotatable 3D model before ordering.' },
  { emoji: '📍', title: 'Live Order Tracking',       desc: 'Confirmed → Preparing → Ready, in real time, with a pickup code.' },
  { emoji: '⭐', title: 'Loyalty Rewards',           desc: 'Earn points on every order, redeem for discounts.' },
  { emoji: '🔔', title: 'In-Room Hotel Requests',    desc: 'Housekeeping, laundry, spa or room service from the QR in the room.' },
  { emoji: '🏢', title: 'One QR, Whole Food Court',  desc: 'Browse every vendor in a mall from a single scan.' },
  { emoji: '💳', title: 'Pay Any Way',               desc: 'UPI, card, cash or wallet — checkout in under 30 seconds.' },
];

const BUSINESS_FEATURES = [
  { emoji: '🔗', title: 'Permanent QR Code',      desc: 'Print once. Update the menu forever — no reprinting.' },
  { emoji: '✨', title: '11 AI Features',          desc: 'Admin assistant, demand forecasting, fraud detection and more.' },
  { emoji: '⚡', title: 'Dynamic Pricing',         desc: 'Weekend, festival, happy-hour pricing switches automatically.' },
  { emoji: '📷', title: 'OCR Menu Upload',         desc: 'Photograph your printed menu — AI builds your digital menu in minutes.' },
  { emoji: '🧩', title: 'Item-wise Customisation', desc: 'Variants and add-ons with separate pricing per item.' },
  { emoji: '🔄', title: 'Aggregator Integration',  desc: 'Sync to Zomato/Swiggy, toggle items off the moment stock runs low.' },
  { emoji: '⚡', title: 'Quick-Bill Shortcodes',    desc: 'Assign shortcodes for lightning-fast billing.' },
  { emoji: '🍽️', title: 'Multiple Dine-in Areas', desc: 'Separate areas, each with its own menu and pricing.' },
  { emoji: '🏆', title: 'Loyalty & CRM',           desc: 'Bronze → Platinum tiers, points issued and redeemed automatically.' },
  { emoji: '📈', title: 'Analytics & Reports',     desc: 'Revenue trends, peak hours, top items, customer spend.' },
  { emoji: '💬', title: 'SMS Campaigns',           desc: 'Birthday & anniversary wishes, segment broadcasts.' },
  { emoji: '👨‍🍳', title: 'Kitchen Display (KOT)', desc: 'Orders hit the kitchen screen instantly — no paper tickets.' },
  { emoji: '🧾', title: 'POS & Billing',           desc: 'Counter orders, GST-ready bills, settle payments.' },
  { emoji: '📦', title: 'Inventory & Recipes',     desc: 'Track raw material stock and ingredient cost per dish.' },
  { emoji: '💰', title: 'Real Payments',           desc: 'Razorpay-powered online payments plus cash — real, not a mockup.' },
  { emoji: '👔', title: 'Staff Roles',             desc: 'Owner, manager, kitchen, cashier — everyone sees only their role.' },
  { emoji: '🏨', title: 'Hotel Operations',        desc: 'Rooms, bookings, housekeeping, laundry, spa, room-charge billing.' },
  { emoji: '🏬', title: 'Mall & Food-Court Mode',  desc: 'Onboard vendors, track revenue share per stall.' },
  { emoji: '🏢', title: 'Multi-Outlet Brands',     desc: 'Suppliers manage every outlet\'s menu and orders from one login.' },
];

const AI_FEATURES = [
  'Admin Assistant', 'Recommendations', 'Smart Menu Search', 'Support Chatbot',
  'AI Analytics', 'Description Writer', 'Review Sentiment', 'Fraud Detection',
  'Demand Forecast', 'Dynamic Pricing', 'Voice Ordering',
];

const VERTICALS = ['🍛 Restaurants', '☕ Cafés & Bakeries', '🏢 Food Courts', '🏨 Hotels & Resorts', '🏬 Malls', '🛵 Cloud Kitchens'];

const HOW_IT_WORKS = [
  { emoji: '☁️', title: 'Add your menu',         desc: 'Manually, or upload a photo — OCR reads it in minutes.' },
  { emoji: '🔗', title: 'Get your QR',            desc: 'One permanent QR code for your shop.' },
  { emoji: '📷', title: 'Customers scan & order', desc: 'Menu opens in their browser — order and pay in 30 seconds.' },
  { emoji: '✅', title: 'You receive & manage',   desc: 'Orders appear instantly on your dashboard.' },
];

const FALLBACK_PLANS = [
  { planKey: 'STARTER', name: 'Starter', price: 0, tag: null, desc: 'Perfect for food stalls and small shops.', features: ['Up to 20 menu items', '50 orders/day', '1 QR code', 'Basic analytics'], cta: 'Start free', primary: false },
  { planKey: 'GROWTH',  name: 'Growth',  price: 999, tag: 'Most popular', desc: 'For growing restaurants that need more.', features: ['Unlimited items & orders', 'Dynamic pricing', 'OCR menu upload', 'Staff roles (10)', 'Loyalty & wallet', 'SMS campaigns'], cta: 'Start 14-day trial', primary: true },
  { planKey: 'BUSINESS', name: 'Business', price: 2499, tag: null, desc: 'Multi-outlet brands and cloud kitchens.', features: ['Everything in Growth', 'Multi-outlet dashboard', 'CRM & retention', 'AI recommendations', 'Priority support'], cta: 'Contact sales', primary: false },
];
const PLAN_META = {
  STARTER:  { desc: 'Perfect for food stalls and small shops.', cta: 'Start free', tag: null, primary: false },
  GROWTH:   { desc: 'For growing restaurants that need more.',  cta: 'Start 14-day trial', tag: 'Most popular', primary: true },
  BUSINESS: { desc: 'Multi-outlet brands and cloud kitchens.',  cta: 'Contact sales', tag: null, primary: false },
};

const TESTIMONIALS = [
  { name: 'Ankit Joshi', shop: 'Chai & Chaat, Pune', avatar: 'AJ', text: 'Our weekend orders jumped 40% after switching to dynamic pricing.' },
  { name: 'Meena Pillai', shop: 'The Coconut Grove, Kochi', avatar: 'MP', text: 'Uploaded a photo of our old menu and got a digital version in 8 minutes.' },
  { name: 'Suresh Nadar', shop: 'Grand Palace Hotel, Chennai', avatar: 'SN', text: 'Hotel module handles room service, laundry and spa from one QR. Staff productivity up 60%.' },
];

const TRUST = [
  { emoji: '💳', title: 'Real payment processing', desc: 'Online payments run through Razorpay.' },
  { emoji: '🔒', title: 'Encrypted end to end',      desc: 'TLS in transit, bcrypt-hashed passwords.' },
  { emoji: '🛡️', title: 'Short-lived, rotating tokens', desc: 'Every login issues a JWT that rotates.' },
  { emoji: '✅', title: 'GST-ready billing',         desc: 'Subscription invoices are GST-compliant from day one.' },
  { emoji: '⏱️', title: '99.9% uptime SLA',          desc: 'Same infrastructure whether you have one table or a hundred outlets.' },
];

export default function LandingScreen() {
  // Mobile only ever offers the free Starter plan — paid tiers (Growth,
  // Business, Enterprise) are web-only so the app never runs a subscription
  // purchase flow. Full pricing/upgrade lives at aviqr.in/#pricing.
  const [plans, setPlans]   = useState(FALLBACK_PLANS.filter(p => p.planKey === 'STARTER'));
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [planRes, offerRes] = await Promise.all([planApi.listPublic('SHOP'), offerApi.listActive()]);
        const live = (planRes.data?.data || []).filter(p => p.planKey === 'STARTER');
        if (live.length > 0) {
          setPlans([...live].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(p => {
            const meta = PLAN_META[p.planKey] || {};
            return {
              planKey: p.planKey, name: p.label, price: p.price,
              features: (p.features || '').split('\n').map(f => f.trim()).filter(Boolean),
              desc: meta.desc || `${p.label} plan`,
              cta: meta.cta || (p.price === 0 ? 'Start free' : 'Contact sales'),
              tag: meta.tag || null, primary: meta.primary || false,
            };
          }));
        }
        setOffers(offerRes.data?.data || []);
      } catch { /* keep static fallback — pricing must never look broken */ }
    })();
  }, []);

  return (
    <ScrollView style={ss.screen} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <LinearGradient colors={['#0F6E56', '#1D9E75']} style={ss.hero}>
        <View style={{ marginBottom: 10 }}><Logo size={40} /></View>
        <Text style={ss.brand}>Avi<Text style={ss.accent}>QR</Text></Text>
        <Text style={ss.eyebrow}>India's multilingual QR menu & order platform</Text>
        <Text style={ss.headline}>One QR code.{'\n'}Your entire restaurant OS.</Text>
        <Text style={ss.heroSub}>Menu · Orders · Payments · Loyalty · CRM · Campaigns · Staff · Reports — all through one permanent QR code.</Text>
        <TouchableOpacity style={ss.ctaPrimary} onPress={() => router.push('/register')}>
          <Text style={ss.ctaPrimaryTxt}>Start free — no credit card →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ss.ctaSecondary} onPress={() => router.push('/login')}>
          <Text style={ss.ctaSecondaryTxt}>Already have an account? Sign in</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ss.ctaDemo} onPress={() => router.push({ pathname: '/(customer)/shop/menu', params: { shopId: DEMO_SHOP_ID } })}>
          <Text style={ss.ctaDemoTxt}>▶ See live demo menu</Text>
        </TouchableOpacity>
        <View style={ss.proofRow}>
          {['No app download', 'Live in 10 minutes', 'Cancel anytime'].map(t => (
            <Text key={t} style={ss.proofItem}>✓ {t}</Text>
          ))}
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={ss.statsBand}>
        {STATS.map(s => (
          <View key={s.label} style={ss.statItem}>
            <Text style={ss.statValue}>{s.value}</Text>
            <Text style={ss.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* For customers */}
      <View style={ss.section}>
        <Text style={ss.eyebrowLabel}>PLATFORM</Text>
        <Text style={ss.sectionTitle}>Two sides. One QR.</Text>
        <View style={ss.groupBadge}><Text style={ss.groupBadgeTxt}>👥 For your customers</Text></View>
        {CUSTOMER_FEATURES.map(f => (
          <View key={f.title} style={ss.featureRow}>
            <Text style={ss.featureEmoji}>{f.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={ss.featureTitle}>{f.title}</Text>
              <Text style={ss.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}

        {/* Dish preview spotlight — mirrors web's icon-based mockup card (not a
            real photo/video on either platform — it's an illustrative preview
            of the feature, same as aviqr-ui-web's .dish-spotlight-visual). */}
        <View style={ss.dishSpotlight}>
          <View style={ss.dishBadge}><Text style={ss.dishBadgeTxt}>📹 Dish previews</Text></View>
          <Text style={ss.dishTitle}>Let the dish sell itself</Text>
          <Text style={ss.dishDesc}>Add a short video or a rotatable 3D model to any menu item — customers see exactly what's coming before they order.</Text>
          <View style={ss.dishCard}>
            <View style={ss.dishMedia}>
              <Text style={{ fontSize: 36 }}>🍛</Text>
              <View style={ss.dishPlayBtn}><Text style={{ color: Colors.white, fontSize: 12 }}>▶</Text></View>
              <View style={ss.dish3dBadge}><Text style={ss.dish3dBadgeTxt}>360° 3D</Text></View>
            </View>
            <View style={ss.dishInfo}>
              <View>
                <Text style={ss.dishName}>Butter Chicken</Text>
                <Text style={ss.dishSub}>Chef's special · ★ 4.8</Text>
              </View>
              <Text style={ss.dishPrice}>₹320</Text>
            </View>
            <View style={ss.dishTabs}>
              {['Photo', 'Video', '3D'].map((t, i) => (
                <View key={t} style={[ss.dishTab, i === 0 && ss.dishTabActive]}><Text style={[ss.dishTabTxt, i === 0 && ss.dishTabTxtActive]}>{t}</Text></View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* For business */}
      <View style={ss.section}>
        <View style={[ss.groupBadge, { backgroundColor: Colors.gray900 }]}><Text style={[ss.groupBadgeTxt, { color: Colors.white }]}>⚙️ For your business</Text></View>
        {BUSINESS_FEATURES.map(f => (
          <View key={f.title} style={ss.featureRow}>
            <Text style={ss.featureEmoji}>{f.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={ss.featureTitle}>{f.title}</Text>
              <Text style={ss.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
        <View style={ss.aiStrip}>
          <Text style={ss.aiStripHead}>🤖 The 11 AI features, unpacked</Text>
          <View style={ss.pillWrap}>
            {AI_FEATURES.map(name => <View key={name} style={ss.pill}><Text style={ss.pillTxt}>{name}</Text></View>)}
          </View>
        </View>
      </View>

      {/* Verticals */}
      <View style={ss.section}>
        <Text style={ss.eyebrowLabel}>WHO IT'S FOR</Text>
        <Text style={ss.sectionTitle}>Built for every food business</Text>
        <View style={ss.pillWrap}>
          {VERTICALS.map(v => <View key={v} style={ss.chip}><Text style={ss.chipTxt}>{v}</Text></View>)}
        </View>
      </View>

      {/* How it works */}
      <View style={ss.section}>
        <Text style={ss.sectionTitle}>How it works</Text>
        {HOW_IT_WORKS.map((s, i) => (
          <View key={s.title} style={ss.stepRow}>
            <View style={ss.stepNum}><Text style={ss.stepNumTxt}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={ss.featureTitle}>{s.emoji} {s.title}</Text>
              <Text style={ss.featureDesc}>{s.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Pricing */}
      <View style={ss.section}>
        <Text style={ss.eyebrowLabel}>PRICING</Text>
        <Text style={ss.sectionTitle}>Simple, transparent pricing</Text>
        <Text style={ss.sectionSub}>Start free right here. Growth and Business plans are available on the web.</Text>
        {plans.map(plan => {
          const offer = offers.find(o => o.applicablePlans === 'ALL' || (o.applicablePlans || '').split(',').map(s => s.trim()).includes(plan.planKey));
          const discounted = offer ? Math.round(plan.price * (1 - offer.discountPercent / 100)) : null;
          return (
            <View key={plan.planKey || plan.name} style={[ss.priceCard, plan.primary && ss.priceCardPrimary]}>
              {(offer || plan.tag) && (
                <View style={ss.priceTag}><Text style={ss.priceTagTxt}>{offer ? `${offer.discountPercent}% OFF` : plan.tag}</Text></View>
              )}
              <Text style={ss.priceName}>{plan.name}</Text>
              <Text style={ss.priceValue}>
                {plan.price === 0 ? 'Free' : offer ? `₹${discounted?.toLocaleString('en-IN')}` : `₹${plan.price.toLocaleString('en-IN')}`}
                {plan.price > 0 && <Text style={ss.pricePeriod}> /month</Text>}
              </Text>
              <Text style={ss.priceDesc}>{plan.desc}</Text>
              {plan.features.map(f => <Text key={f} style={ss.priceFeature}>✓ {f}</Text>)}
              <TouchableOpacity style={[ss.priceBtn, plan.primary && ss.priceBtnPrimary]} onPress={() => router.push('/register')}>
                <Text style={[ss.priceBtnTxt, plan.primary && ss.priceBtnTxtPrimary]}>{plan.cta}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        <TouchableOpacity style={ss.webPricingLink} onPress={() => Linking.openURL('https://aviqr.in/#pricing')}>
          <Text style={ss.webPricingLinkTxt}>See Growth & Business plans on the web →</Text>
        </TouchableOpacity>
      </View>

      {/* Testimonials */}
      <View style={ss.section}>
        <Text style={ss.sectionTitle}>What our customers say</Text>
        {TESTIMONIALS.map(t => (
          <View key={t.name} style={ss.testimonialCard}>
            <Text style={{ color: '#F59E0B' }}>★★★★★</Text>
            <Text style={ss.testimonialText}>"{t.text}"</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <View style={ss.avatar}><Text style={ss.avatarTxt}>{t.avatar}</Text></View>
              <View>
                <Text style={ss.testimonialName}>{t.name}</Text>
                <Text style={ss.testimonialShop}>{t.shop}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Trust */}
      <View style={ss.section}>
        <Text style={ss.sectionTitle}>Built to be trusted with real orders and payments</Text>
        {TRUST.map(t => (
          <View key={t.title} style={ss.featureRow}>
            <Text style={ss.featureEmoji}>{t.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={ss.featureTitle}>{t.title}</Text>
              <Text style={ss.featureDesc}>{t.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA banner */}
      <LinearGradient colors={['#0F6E56', '#1D9E75']} style={ss.ctaBanner}>
        <Text style={ss.ctaBannerTitle}>Ready to go digital?</Text>
        <Text style={ss.ctaBannerSub}>Set up your digital menu in under 10 minutes. No hardware. No app download.</Text>
        <TouchableOpacity style={ss.ctaBannerBtn} onPress={() => router.push('/register')}>
          <Text style={ss.ctaBannerBtnTxt}>Create your free account →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={ss.ctaBannerLink}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={ss.footer}>
        <View style={ss.footerLinks}>
          {[
            ['About us', '/about'], ["What's new", '/features'], ['Contact', '/contact'], ['FAQ', '/faq'],
            ['Privacy policy', '/privacy'], ['Terms of service', '/terms'], ['Refund policy', '/refund'],
          ].map(([label, href]) => (
            <TouchableOpacity key={href} onPress={() => router.push(href)}>
              <Text style={ss.footerLink}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={ss.footerTagline}>Scan. Order. Engage. Grow.</Text>
        <Text style={ss.footerTxt}>© {new Date().getFullYear()} AviQR Technologies Pvt Ltd</Text>
      </View>
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  hero: { padding: Spacing.lg, paddingTop: 64, paddingBottom: 32 },
  brand: { fontSize: FontSize['3xl'], fontWeight: '800', color: Colors.white, marginBottom: 8 },
  accent: { color: '#A7F3D0' },
  eyebrow: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginBottom: 12 },
  headline: { fontSize: FontSize['3xl'], fontWeight: '800', color: Colors.white, lineHeight: 36, marginBottom: 12 },
  heroSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)', lineHeight: 20, marginBottom: 20 },
  ctaPrimary: { backgroundColor: Colors.white, borderRadius: Radius.full, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  ctaPrimaryTxt: { color: Colors.primaryDark, fontWeight: '800', fontSize: FontSize.base },
  ctaSecondary: { paddingVertical: 10, alignItems: 'center' },
  ctaSecondaryTxt: { color: Colors.white, fontWeight: '600', fontSize: FontSize.sm, textDecorationLine: 'underline' },
  ctaDemo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: Radius.full, paddingVertical: 10, marginTop: 4 },
  ctaDemoTxt: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  proofRow: { marginTop: 12, gap: 4 },
  proofItem: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs },
  statsBand: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: Colors.white, padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statItem: { width: '50%', alignItems: 'center', paddingVertical: 10 },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: FontSize.xs, color: Colors.gray500, textAlign: 'center', marginTop: 2 },
  section: { padding: Spacing.base, borderBottomWidth: 8, borderBottomColor: Colors.gray100 },
  eyebrowLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, letterSpacing: 0.8 },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900, marginTop: 4, marginBottom: 12 },
  sectionSub: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: -8, marginBottom: 12 },
  groupBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 },
  groupBadgeTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primaryDark },
  featureRow: { flexDirection: 'row', gap: 12, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, marginBottom: 8, ...Shadow.sm },
  featureEmoji: { fontSize: 22 },
  featureTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  featureDesc: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2, lineHeight: 16 },
  dishSpotlight: { marginTop: 16, backgroundColor: '#F5FBF9', borderRadius: Radius.xl, padding: 18, borderWidth: 1, borderColor: '#D3EEE5' },
  dishBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  dishBadgeTxt: { fontSize: 11, fontWeight: '700', color: Colors.primaryDark },
  dishTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900 },
  dishDesc: { fontSize: FontSize.sm, color: Colors.gray600, marginTop: 6, lineHeight: 19, marginBottom: 14 },
  dishCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, ...Shadow.md, overflow: 'hidden' },
  dishMedia: { height: 130, backgroundColor: '#FDECEA', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  dishPlayBtn: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  dish3dBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  dish3dBadgeTxt: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  dishInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  dishName: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  dishSub: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  dishPrice: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  dishTabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.gray100 },
  dishTab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  dishTabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  dishTabTxt: { fontSize: 11, fontWeight: '600', color: Colors.gray400 },
  dishTabTxtActive: { color: Colors.primary },
  aiStrip: { backgroundColor: Colors.gray900, borderRadius: Radius.md, padding: 14, marginTop: 8 },
  aiStripHead: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm, marginBottom: 10 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  pillTxt: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '600' },
  chip: { backgroundColor: Colors.white, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  chipTxt: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'flex-start' },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumTxt: { color: Colors.white, fontWeight: '800', fontSize: FontSize.sm },
  priceCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, marginBottom: 14, borderWidth: 1.5, borderColor: Colors.border, ...Shadow.sm },
  priceCardPrimary: { borderColor: Colors.primary, borderWidth: 2 },
  priceTag: { alignSelf: 'flex-start', backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  priceTagTxt: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  priceName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900 },
  priceValue: { fontSize: FontSize['3xl'], fontWeight: '800', color: Colors.gray900, marginTop: 4 },
  pricePeriod: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray500 },
  priceDesc: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: 4, marginBottom: 10 },
  priceFeature: { fontSize: FontSize.sm, color: Colors.gray700, marginBottom: 4 },
  priceBtn: { marginTop: 10, backgroundColor: Colors.gray100, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  priceBtnPrimary: { backgroundColor: Colors.primary },
  priceBtnTxt: { fontWeight: '700', color: Colors.gray700 },
  priceBtnTxtPrimary: { color: Colors.white },
  webPricingLink: { marginTop: 8, alignItems: 'center', paddingVertical: 10 },
  webPricingLinkTxt: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  testimonialCard: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, marginBottom: 10, ...Shadow.sm },
  testimonialText: { fontSize: FontSize.sm, color: Colors.gray700, marginTop: 6, fontStyle: 'italic', lineHeight: 20 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: Colors.primaryDark, fontWeight: '700', fontSize: FontSize.xs },
  testimonialName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  testimonialShop: { fontSize: FontSize.xs, color: Colors.gray500 },
  ctaBanner: { padding: Spacing.xl, alignItems: 'center' },
  ctaBannerTitle: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.white, textAlign: 'center' },
  ctaBannerSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 8, marginBottom: 20 },
  ctaBannerBtn: { backgroundColor: Colors.white, borderRadius: Radius.full, paddingVertical: 14, paddingHorizontal: 28, marginBottom: 12 },
  ctaBannerBtnTxt: { color: Colors.primaryDark, fontWeight: '800' },
  ctaBannerLink: { color: Colors.white, fontWeight: '600', fontSize: FontSize.sm, textDecorationLine: 'underline' },
  footer: { padding: Spacing.lg, alignItems: 'center' },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginBottom: 14 },
  footerLink: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600, textDecorationLine: 'underline' },
  footerTagline: { fontSize: FontSize.xs, color: Colors.gray500, fontWeight: '600', marginBottom: 4 },
  footerTxt: { fontSize: FontSize.xs, color: Colors.gray400 },
});
