import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { menuApi, orderApi, paymentApi, favoritesApi } from '../../api/index.js';
import { useCart } from '../../context/CartContext.jsx';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';
import { setCustomerContext } from '../../context/customerContext.js';
import CustomerLoginSheet from '../../components/customer/CustomerLoginSheet.jsx';
import OrderCodePanel from '../../components/shared/OrderCodePanel.jsx';
import OrderProgressTrack, { STATUSES } from '../../components/shared/OrderProgressTrack.jsx';
import {
  ShoppingCart, Plus, Minus, Search, Star, Clock, MapPin,
  X, ChevronRight, ChevronLeft, CheckCircle, QrCode, Globe, ChevronDown,
  Flame, Leaf, Phone, Share2, Heart, AlertCircle, Bike,
  Play, Box, RotateCcw
} from 'lucide-react';

// ─── Media helpers ────────────────────────────────────────────────────────────

function parseVideoUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (yt) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1` };
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { type: 'direct' };
  return null;
}

function loadModelViewerScript() {
  if (document.querySelector('[data-mv-loader]')) return;
  const s = document.createElement('script');
  s.type = 'module';
  s.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js';
  s.setAttribute('data-mv-loader', '1');
  document.head.appendChild(s);
}

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ─── Item detail sheet — swipeable photo/video/3D carousel + full details ─────

function ModelSlide({ item }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!item.modelUrl || !wrapRef.current) return;
    loadModelViewerScript();
    const el = document.createElement('model-viewer');
    el.src = item.modelUrl;
    el.alt = item.name;
    el.setAttribute('auto-rotate', '');
    el.setAttribute('camera-controls', '');
    el.setAttribute('environment-image', 'neutral');
    el.setAttribute('shadow-intensity', '1');
    el.style.cssText = 'width:100%;height:100%;background:transparent;';
    wrapRef.current.innerHTML = '';
    wrapRef.current.appendChild(el);
    return () => { if (wrapRef.current) wrapRef.current.innerHTML = ''; };
  }, [item.modelUrl, item.name]);

  return (
    <div className="cm-carousel-3d">
      <div ref={wrapRef} className="cm-carousel-3d-inner">
        <div className="cm-media-3d-loading">Loading 3D model…</div>
      </div>
      <div className="cm-media-3d-hint"><RotateCcw size={12} /> Drag to rotate · scroll to zoom</div>
    </div>
  );
}

function VideoSlide({ item }) {
  const parsed = parseVideoUrl(item.videoUrl);
  if (!parsed) return <div className="cm-media-error">Could not load video</div>;
  return parsed.type === 'direct'
    ? <video src={item.videoUrl} controls playsInline preload="metadata" className="cm-carousel-video" />
    : (
      <iframe
        src={parsed.embedUrl}
        title={item.name}
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        className="cm-media-iframe"
      />
    );
}

// Photos, then video, then 3D model — all swipeable left/right in one strip
// via native CSS scroll-snap, with dots + arrows kept in sync via scroll position.
function MediaCarousel({ item, startIndex = 0 }) {
  const images = item.images && item.images.length ? item.images : (item.imageUrl ? [item.imageUrl] : []);
  const slides = [
    ...images.map(src => ({ type: 'image', src })),
    ...(item.videoUrl ? [{ type: 'video' }] : []),
    ...(item.modelUrl ? [{ type: 'model' }] : []),
  ];
  if (slides.length === 0) slides.push({ type: 'empty' });

  const trackRef = useRef(null);
  const [active, setActive] = useState(Math.min(startIndex, slides.length - 1));
  const scrollTimeout = useRef(null);

  useEffect(() => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: active * el.clientWidth, behavior: 'auto' });
    // Only run once on mount — jump straight to the requested starting slide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      setActive(Math.round(el.scrollLeft / el.clientWidth));
    }, 80);
  };

  const goTo = (idx) => {
    const el = trackRef.current;
    if (!el) return;
    setActive(idx);
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="cm-carousel">
      <div className="cm-carousel-track" ref={trackRef} onScroll={handleScroll}>
        {slides.map((s, i) => (
          <div className="cm-carousel-slide" key={i}>
            {s.type === 'image' && <img src={s.src} alt={item.name} className="cm-carousel-img" />}
            {s.type === 'video' && <VideoSlide item={item} />}
            {s.type === 'model' && <ModelSlide item={item} />}
            {s.type === 'empty' && <div className="cm-carousel-empty">🍽</div>}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          {active > 0 && (
            <button className="cm-carousel-arrow cm-carousel-arrow-left" onClick={() => goTo(active - 1)} aria-label="Previous">
              <ChevronLeft size={18} />
            </button>
          )}
          {active < slides.length - 1 && (
            <button className="cm-carousel-arrow cm-carousel-arrow-right" onClick={() => goTo(active + 1)} aria-label="Next">
              <ChevronRight size={18} />
            </button>
          )}
          <div className="cm-carousel-dots">
            {slides.map((s, i) => (
              <button
                key={i}
                className={`cm-carousel-dot ${active === i ? 'active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {(item.videoUrl || item.modelUrl) && (
        <div className="cm-carousel-badges">
          {item.videoUrl && <span className="cm-carousel-badge"><Play size={10} fill="currentColor" /> Video</span>}
          {item.modelUrl && <span className="cm-carousel-badge cm-carousel-badge-3d"><Box size={10} /> 3D</span>}
        </div>
      )}
    </div>
  );
}

function ItemDetailSheet({ item, startIndex, lang, getItemName, getItemDesc, inCart, onAdd, onRemove, onClose }) {
  // Lock body scroll while the sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="cm-media-overlay" onClick={onClose}>
      <div className="cm-media-modal cm-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="cm-media-modal-header">
          <div className="cm-media-modal-title">{getItemName(item)}</div>
          <button className="cm-media-modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <MediaCarousel item={item} startIndex={startIndex} />

        <div className="cm-detail-body">
          <div className="cm-detail-badges">
            <span className={`cm-dot ${item.veg ? 'cm-dot-veg' : 'cm-dot-nonveg'}`} style={{ position:'static', width:12, height:12 }}><div className="cm-dot-inner" /></span>
            {item.popular && <span className="cm-badge cm-badge-popular"><Flame size={9} /> {t('popular', lang)}</span>}
            {item.spicy && <span className="cm-badge cm-badge-spicy">🌶</span>}
          </div>
          <p className="cm-detail-desc">{getItemDesc(item)}</p>
        </div>

        <div className="cm-media-modal-footer">
          <span className="cm-media-modal-price">₹{item.price}</span>
          {inCart === 0 ? (
            <button className="cm-add-btn" onClick={onAdd}><Plus size={14} /> {t('addToCart', lang)}</button>
          ) : (
            <div className="cm-qty">
              <button className="cm-qty-btn" onClick={onRemove}><Minus size={13} /></button>
              <span className="cm-qty-num">{inCart}</span>
              <button className="cm-qty-btn" onClick={onAdd}><Plus size={13} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import './CustomerMenu.css';

// ─── Language definitions ─────────────────────────────────────────────────────
const LANGUAGES = [
  { code:'en',  label:'English',    native:'English' },
  { code:'hi',  label:'Hindi',      native:'हिंदी' },
  { code:'ta',  label:'Tamil',      native:'தமிழ்' },
  { code:'te',  label:'Telugu',     native:'తెలుగు' },
  { code:'kn',  label:'Kannada',    native:'ಕನ್ನಡ' },
  { code:'ml',  label:'Malayalam',  native:'മലയാളം' },
  { code:'bn',  label:'Bengali',    native:'বাংলা' },
  { code:'mr',  label:'Marathi',    native:'मराठी' },
  { code:'gu',  label:'Gujarati',   native:'ગુજરાતી' },
];

// ─── All UI strings in all languages ─────────────────────────────────────────
const T = {
  search: {
    en:'Search dishes…', hi:'खाना खोजें…', ta:'உணவு தேடுக…',
    te:'వంటకాలు వెతకండి…', kn:'ಆಹಾರ ಹುಡುಕಿ…', ml:'ഭക്ഷണം തിരയൂ…',
    bn:'খাবার খুঁজুন…', mr:'जेवण शोधा…', gu:'ખાવાનું શોધો…',
  },
  veg: {
    en:'Veg', hi:'शाकाहारी', ta:'சைவம்', te:'శాకాహారి',
    kn:'ಸಸ್ಯಾಹಾರ', ml:'സസ്യഭക്ഷണം', bn:'নিরামিষ', mr:'शाकाहारी', gu:'શાકાહારી',
  },
  nonveg: {
    en:'Non-Veg', hi:'मांसाहारी', ta:'அசைவம்', te:'మాంసాహారి',
    kn:'ಮಾಂಸಾಹಾರ', ml:'മാംസാഹാരം', bn:'আমিষ', mr:'मांसाहारी', gu:'માંસાહારી',
  },
  popular: {
    en:'Popular', hi:'लोकप्रिय', ta:'பிரபலம்', te:'జనాదరణ',
    kn:'ಜನಪ್ರಿಯ', ml:'ജനപ്രിയം', bn:'জনপ্রিয়', mr:'लोकप्रिय', gu:'લોકપ્રિય',
  },
  addToCart: {
    en:'Add', hi:'जोड़ें', ta:'சேர்', te:'చేర్చు',
    kn:'ಸೇರಿಸಿ', ml:'ചേർക്കുക', bn:'যোগ করুন', mr:'जोडा', gu:'ઉમેરો',
  },
  cart: {
    en:'Your Cart', hi:'आपकी टोकरी', ta:'உங்கள் கூடை', te:'మీ కార్ట్',
    kn:'ನಿಮ್ಮ ಕಾರ್ಟ್', ml:'നിങ്ങളുടെ കാർട്ട്', bn:'আপনার কার্ট', mr:'तुमची टोपली', gu:'તમારી ટોપલી',
  },
  placeOrder: {
    en:'Place Order', hi:'ऑर्डर दें', ta:'ஆர்டர் செய்', te:'ఆర్డర్ చేయండి',
    kn:'ಆರ್ಡರ್ ಮಾಡಿ', ml:'ഓർഡർ ചെയ്യൂ', bn:'অর্ডার দিন', mr:'ऑर्डर द्या', gu:'ઓર્ડર આપો',
  },
  name: {
    en:'Your name', hi:'आपका नाम', ta:'உங்கள் பெயர்', te:'మీ పేరు',
    kn:'ನಿಮ್ಮ ಹೆಸರು', ml:'നിങ്ങളുടെ പേര്', bn:'আপনার নাম', mr:'तुमचे नाव', gu:'તમારું નામ',
  },
  phone: {
    en:'Mobile number', hi:'मोबाइल नंबर', ta:'மொபைல் எண்', te:'మొబైల్ నంబర్',
    kn:'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ', ml:'മൊബൈൽ നമ്പർ', bn:'মোবাইল নম্বর', mr:'मोबाइल नंबर', gu:'મોબાઇલ નંબર',
  },
  tableNo: {
    en:'Table number', hi:'टेबल नंबर', ta:'மேசை எண்', te:'టేబుల్ నంబర్',
    kn:'ಟೇಬಲ್ ಸಂಖ್ಯೆ', ml:'ടേബിൾ നമ്പർ', bn:'টেবিল নম্বর', mr:'टेबल नंबर', gu:'ટેબલ નંબર',
  },
  dineIn: {
    en:'Dine-in', hi:'यहाँ खाएं', ta:'உள்ளே சாப்பிட', te:'లోపల తినండి',
    kn:'ಒಳಗೆ ತಿನ್ನಿ', ml:'അകത്ത് കഴിക്കൂ', bn:'ভেতরে খান', mr:'आत जेवा', gu:'અંદર જમો',
  },
  takeaway: {
    en:'Takeaway', hi:'पार्सल', ta:'பார்சல்', te:'పార్సల్',
    kn:'ಪಾರ್ಸೆಲ್', ml:'പാഴ്സൽ', bn:'পার্সেল', mr:'पार्सल', gu:'પાર્સલ',
  },
  payOnline: {
    en:'Pay Online', hi:'ऑनलाइन भुगतान', ta:'ஆன்லைன் பணம்', te:'ఆన్లైన్ చెల్లింపు',
    kn:'ಆನ್ಲೈನ್ ಪಾವತಿ', ml:'ഓൺലൈൻ പേ', bn:'অনলাইন পেমেন্ট', mr:'ऑनलाइन पैसे', gu:'ઓનલાઇન ચૂકવો',
  },
  payCash: {
    en:'Cash at Counter', hi:'काउंटर पर नकद', ta:'கவுண்டரில் பணம்', te:'కౌంటర్‌లో నగదు',
    kn:'ಕೌಂಟರ್‌ನಲ್ಲಿ ನಗದು', ml:'കൌണ്ടറിൽ പണം', bn:'কাউন্টারে নগদ', mr:'काउंटरवर रोख', gu:'કાઉન્ટર પર રોકડ',
  },
  orderConfirmed: {
    en:'Order Confirmed!', hi:'ऑर्डर हो गया!', ta:'ஆர்டர் உறுதி!', te:'ఆర్డర్ నిర్ధారించబడింది!',
    kn:'ಆರ್ಡರ್ ದೃಢಪಟ್ಟಿದೆ!', ml:'ഓർഡർ സ്ഥിരീകരിച്ചു!', bn:'অর্ডার নিশ্চিত!', mr:'ऑर्डर झाला!', gu:'ઓર્ડર થઈ ગયો!',
  },
  preparing: {
    en:'Preparing your order…', hi:'आपका ऑर्डर बन रहा है…', ta:'உங்கள் ஆர்டர் தயாராகிறது…',
    te:'మీ ఆర్డర్ తయారవుతోంది…', kn:'ನಿಮ್ಮ ಆರ್ಡರ್ ತಯಾರಾಗುತ್ತಿದೆ…',
    ml:'നിങ്ങളുടെ ഓർഡർ തയ്യാറാക്കുന്നു…', bn:'আপনার অর্ডার প্রস্তুত হচ্ছে…',
    mr:'तुमचा ऑर्डर तयार होतोय…', gu:'તમારો ઓર્ડર બની રહ્યો છે…',
  },
  subtotal: {
    en:'Subtotal', hi:'कुल', ta:'மொத்தம்', te:'మొత్తం',
    kn:'ಒಟ್ಟು', ml:'ആകെ', bn:'সর্বমোট', mr:'एकूण', gu:'કુલ',
  },
  proceedToOrder: {
    en:'Proceed to Order', hi:'ऑर्डर करें', ta:'ஆர்டர் செய்ய செல்லவும்', te:'ఆర్డర్‌కు వెళ్ళండి',
    kn:'ಆರ್ಡರ್‌ಗೆ ಹೋಗಿ', ml:'ഓർഡറിലേക്ക് പോകൂ', bn:'অর্ডারে এগিয়ে যান', mr:'ऑर्डरकडे जा', gu:'ઓર્ডર કરવા જાઓ',
  },
  signInRewards: {
    en:'Sign in for rewards', hi:'रिवॉर्ड के लिए लॉगिन करें', ta:'பரிசுகளுக்கு உள்நுழையவும்',
    te:'రివార్డులకు సైన్ ఇన్ చేయండి', kn:'ಬಹುಮಾನಗಳಿಗೆ ಲಾಗಿನ್ ಮಾಡಿ',
    ml:'റിവാർഡുകൾക്ക് സൈൻ ഇൻ ചെയ്യൂ', bn:'পুরস্কারের জন্য সাইন ইন করুন',
    mr:'बक्षिसांसाठी लॉगिन करा', gu:'ઇનામ માટે સાઇન ઇન કરો',
  },
  all: {
    en:'All', hi:'सभी', ta:'அனைத்தும்', te:'అన్నీ',
    kn:'ಎಲ್ಲಾ', ml:'എല്ലാം', bn:'সব', mr:'सर्व', gu:'બધું',
  },
  filterVeg: {
    en:'Veg only', hi:'सिर्फ शाकाहारी', ta:'சைவம் மட்டும்', te:'శాకాహారం మాత్రమే',
    kn:'ಕೇವಲ ಸಸ್ಯಾಹಾರ', ml:'സസ്യഭക്ഷണം മാത്രം', bn:'শুধু নিরামিষ', mr:'फक्त शाकाहारी', gu:'ફક્ત શાકાહારી',
  },
};

const t = (key, lang) => T[key]?.[lang] || T[key]?.['en'] || key;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Shop data — keyed by shopId ──────────────────────────────────────────────
const SHOPS = {
  spiceroute: {
    id: 'spiceroute',
    name: 'Spice Route',
    nameHi: 'स्पाइस रूट',
    tagline: 'Authentic North Indian Cuisine',
    emoji: '🍛',
    rating: 4.6, reviews: 284,
    timing: '9 AM – 11 PM',
    phone: '+91 98450 12345',
    location: 'MG Road, Bengaluru',
    minOrder: 100,
    color: '#1D9E75',
    categories: [
      { id:'c1', name:'Starters', nameHi:'स्टार्टर', nameTa:'தொடக்க உணவு', nameTe:'ప్రారంభం', nameKn:'ಸ್ಟಾರ್ಟರ್', nameMl:'ആദ്യ ഭക്ഷണം', nameBn:'স্টার্টার', nameMr:'स्टार्टर', nameGu:'સ્ટાર્ટર', emoji:'🥗',
        items:[
          {id:'i1',name:'Paneer Tikka',nameHi:'पनीर टिक्का',nameTa:'பன்னீர் டிக்கா',desc:'Cottage cheese marinated in spices, grilled in tandoor',descHi:'मसालों में मैरीनेट किया हुआ पनीर, तंदूर में पका हुआ',price:280,popular:true,veg:true,spicy:false,imageUrl:'/demo/dishes/paneer-tikka.jpg',images:['/demo/dishes/paneer-tikka.jpg','/demo/dishes/paneer-tikka-2.jpg']},
          {id:'i2',name:'Chicken Tikka',nameHi:'चिकन टिक्का',nameTa:'சிக்கன் டிக்கா',desc:'Tender chicken charcoal grilled, served with mint chutney',descHi:'कोमल चिकन चारकोल ग्रिल किया हुआ, पुदीना चटनी के साथ',price:320,popular:true,veg:false,spicy:true,imageUrl:'/demo/dishes/chicken-tikka.jpg',images:['/demo/dishes/chicken-tikka.jpg','/demo/dishes/chicken-tikka-2.jpg']},
          {id:'i3',name:'Samosa (2 pcs)',nameHi:'समोसा (2 पीस)',nameTa:'சமோசா (2 பீஸ்)',desc:'Classic potato-filled pastry, served with chutneys',descHi:'आलू भरा हुआ क्लासिक समोसा, चटनी के साथ',price:60,popular:false,veg:true,spicy:false,imageUrl:'/demo/dishes/samosa.jpg'},
          {id:'i4',name:'Veg Spring Rolls',nameHi:'वेज स्प्रिंग रोल',nameTa:'வெஜ் ஸ்பிரிங் ரோல்',desc:'Crispy rolls filled with fresh vegetables',descHi:'ताज़ी सब्जियों से भरे क्रिस्पी रोल',price:140,popular:false,veg:true,spicy:false,imageUrl:'/demo/dishes/veg-spring-rolls.jpg'},
        ]
      },
      { id:'c2', name:'Main Course', nameHi:'मुख्य व्यंजन', nameTa:'முக்கிய உணவு', nameTe:'ముఖ్య వంటకాలు', nameKn:'ಮುಖ್ಯ ಕೋರ್ಸ್', nameMl:'പ്രധാന ഭക്ഷണം', nameBn:'মূল খাবার', nameMr:'मुख्य जेवण', nameGu:'મુખ્ય ભોજન', emoji:'🍛',
        items:[
          {id:'i5',name:'Paneer Butter Masala',nameHi:'पनीर बटर मसाला',nameTa:'பன்னீர் பட்டர் மசாலா',desc:'Cottage cheese in rich tomato-cream gravy',descHi:'मलाईदार टमाटर की ग्रेवी में पनीर',price:320,popular:true,veg:true,spicy:false,imageUrl:'/demo/dishes/paneer-butter-masala.jpg',images:['/demo/dishes/paneer-butter-masala.jpg','/demo/dishes/paneer-butter-masala-2.jpg']},
          {id:'i6',name:'Butter Chicken',nameHi:'बटर चिकन',nameTa:'பட்டர் சிக்கன்',desc:'Succulent chicken in velvety butter-tomato sauce',descHi:'मखमली बटर-टमाटर सॉस में रसीला चिकन',price:380,popular:true,veg:false,spicy:false,imageUrl:'/demo/dishes/butter-chicken.jpg',images:['/demo/dishes/butter-chicken.jpg','/demo/dishes/butter-chicken-2.jpg'],videoUrl:'/demo/media/butter-chicken.mp4'},
          {id:'i7',name:'Dal Makhani',nameHi:'दाल मखनी',nameTa:'தால் மக்கனி',desc:'Black lentils slow-cooked overnight with cream',descHi:'रात भर धीमी आँच पर पकाई हुई काली दाल',price:260,popular:false,veg:true,spicy:false,imageUrl:'/demo/dishes/dal-makhani.jpg'},
          {id:'i8',name:'Kadai Paneer',nameHi:'कड़ाई पनीर',nameTa:'கடாய் பன்னீர்',desc:'Cottage cheese with bell peppers in spiced tomato gravy',descHi:'शिमला मिर्च के साथ मसालेदार टमाटर ग्रेवी में पनीर',price:300,popular:false,veg:true,spicy:true,imageUrl:'/demo/dishes/kadai-paneer.jpg'},
          {id:'i9',name:'Chicken Biryani',nameHi:'चिकन बिरयानी',nameTa:'சிக்கன் பிரியாணி',desc:'Aromatic basmati rice layered with spiced chicken',descHi:'मसालेदार चिकन के साथ खुशबूदार बासमती चावल',price:380,popular:true,veg:false,spicy:true,imageUrl:'/demo/dishes/chicken-biryani.jpg',images:['/demo/dishes/chicken-biryani.jpg','/demo/dishes/chicken-biryani-2.jpg']},
        ]
      },
      { id:'c3', name:'Breads', nameHi:'रोटी', nameTa:'ரொட்டி', nameTe:'రొట్టెలు', nameKn:'ರೊಟ್ಟಿ', nameMl:'റൊട്ടി', nameBn:'রুটি', nameMr:'भाकरी', nameGu:'રોટી', emoji:'🫓',
        items:[
          {id:'i10',name:'Butter Naan',nameHi:'बटर नान',nameTa:'பட்டர் நான்',desc:'Leavened flatbread cooked in tandoor, brushed with butter',descHi:'तंदूर में बनी नरम नान, मक्खन लगी हुई',price:50,popular:false,veg:true,spicy:false,imageUrl:'/demo/dishes/butter-naan.jpg'},
          {id:'i11',name:'Garlic Naan',nameHi:'गार्लिक नान',nameTa:'பூண்டு நான்',desc:'Naan topped with garlic and coriander',descHi:'लहसुन और धनिया से सजी नान',price:60,popular:false,veg:true,spicy:false,imageUrl:'/demo/dishes/garlic-naan.jpg'},
          {id:'i12',name:'Laccha Paratha',nameHi:'लच्छा पराठा',nameTa:'லச்சா பராட்டா',desc:'Flaky multi-layered flatbread, fresh from tandoor',descHi:'तंदूर से ताज़ा, परतदार पराठा',price:55,popular:false,veg:true,spicy:false,imageUrl:'/demo/dishes/laccha-paratha.jpg'},
        ]
      },
      { id:'c4', name:'Drinks', nameHi:'पेय', nameTa:'பானங்கள்', nameTe:'పానీయాలు', nameKn:'ಪಾನೀಯಗಳು', nameMl:'പാനീയങ്ങൾ', nameBn:'পানীয়', nameMr:'पेये', nameGu:'પીણાં', emoji:'🥤',
        items:[
          {id:'i13',name:'Sweet Lassi',nameHi:'मीठी लस्सी',nameTa:'இனிப்பு லஸ்ஸி',desc:'Thick chilled yoghurt drink sweetened with sugar',descHi:'चीनी से मीठी, ठंडी गाढ़ी लस्सी',price:80,popular:true,veg:true,spicy:false,imageUrl:'/demo/dishes/sweet-lassi.jpg',images:['/demo/dishes/sweet-lassi.jpg','/demo/dishes/sweet-lassi-2.jpg'],videoUrl:'/demo/media/sweet-lassi.mp4'},
          {id:'i14',name:'Masala Chaas',nameHi:'मसाला छाछ',nameTa:'மசாலா மோர்',desc:'Spiced buttermilk with cumin and coriander',descHi:'जीरा और धनिया के साथ मसालेदार छाछ',price:60,popular:false,veg:true,spicy:false,imageUrl:'/demo/dishes/masala-chaas.jpg'},
          {id:'i15',name:'Filter Coffee',nameHi:'फ़िल्टर कॉफ़ी',nameTa:'ஃபில்டர் காபி',desc:'South Indian decoction with frothy hot milk',descHi:'दक्षिण भारतीय कॉफी, झागदार गर्म दूध के साथ',price:50,popular:false,veg:true,spicy:false,imageUrl:'/demo/dishes/filter-coffee.jpg',videoUrl:'/demo/media/filter-coffee.mp4',modelUrl:'/demo/media/filter-coffee.glb'},
        ]
      },
    ]
  },
  demo: { id:'demo', name:'Spice Route', nameHi:'स्पाइस रूट', tagline:'Demo Restaurant', emoji:'🍛', rating:4.6, reviews:284, timing:'9 AM – 11 PM', phone:'+91 98450 12345', location:'MG Road, Bengaluru', minOrder:100, color:'#1D9E75', categories:[] },
};

// Fall back to spiceroute data for demo
SHOPS.demo.categories = SHOPS.spiceroute.categories;

// ─── Map API response to SHOPS shape ─────────────────────────────────────────
function normalizeApiShop(data) {
  if (!data) return null;
  const shop = data.shop || data;
  const categories = (data.categories || []).map(c => ({
    id: c.id,
    name: c.name,
    nameHi: c.nameHi || c.name,
    nameTa: c.nameTa || c.name,
    nameTe: c.nameTe || c.name,
    nameKn: c.nameKn || c.name,
    nameMl: c.nameMl || c.name,
    nameBn: c.nameBn || c.name,
    nameMr: c.nameMr || c.name,
    nameGu: c.nameGu || c.name,
    emoji: c.emoji || '🍽',
    items: (c.items || []).filter(i => i.available !== false).map(i => ({
      id: i.id,
      name: i.name,
      nameHi: i.nameHi || i.name,
      nameTa: i.nameTa || i.name,
      desc: i.description || i.desc || '',
      descHi: i.descHi || i.description || '',
      price: i.price,
      popular: !!i.popular,
      veg: i.veg !== false,
      spicy: !!i.spicy,
      imageUrl:  i.imageUrl  || '',
      images:    i.images && i.images.length ? i.images : (i.imageUrl ? [i.imageUrl] : []),
      videoUrl:  i.videoUrl  || '',
      modelUrl:  i.modelUrl  || '',
      mediaType: i.mediaType || 'NONE',
    })),
  }));
  return {
    // /api/v1/menu/public/{shopId} returns the id at the top level (data.shopId),
    // not nested inside data.shop — shop.id was always undefined here, which sent
    // every order to /api/v1/orders/shop/undefined (shop_id stored as the literal
    // string "undefined").
    id: data.shopId || shop.id,
    name: shop.name || 'Restaurant',
    nameHi: shop.nameHi || shop.name,
    tagline: shop.tagline || '',
    emoji: shop.emoji || '🍽',
    rating: shop.rating || 4.5,
    reviews: shop.reviews || 0,
    timing: shop.timing || shop.openingHours || '9 AM – 11 PM',
    phone: shop.phone || '',
    location: shop.address || shop.location || '',
    minOrder: shop.minOrder || 0,
    color: shop.color || '#1D9E75',
    categories,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CustomerMenu() {
  const { shopId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL params
  const tableFromQR  = searchParams.get('table') || '';
  const qrType       = searchParams.get('type') || 'shop';
  const groupFilter  = searchParams.get('cat') || '';
  const focusSearchParam = searchParams.get('focusSearch') === '1';
  const openCartParam    = searchParams.get('openCart') === '1';
  const itemFromQR       = searchParams.get('item') || '';

  // State
  const [lang, setLang]                 = useState('en');
  const [apiShop, setApiShop]           = useState(null);
  const [menuLoading, setMenuLoading]   = useState(true);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [vegOnly, setVegOnly]           = useState(false);
  const [search, setSearch]             = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const { cart, addItem: cartAddItem, remItem: cartRemItem, bindShop, clearCart } = useCart();
  const { isLoggedIn, customer, authHeader } = useCustomerAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  // Resolve shop: prefer API data, fall back to mock
  const shop = apiShop || SHOPS[shopId] || SHOPS.spiceroute;

  useEffect(() => {
    if (!shopId || SHOPS[shopId]) { setMenuLoading(false); return; }
    menuApi.getPublicMenu(shopId, lang)
      .then(res => {
        const normalized = normalizeApiShop(res.data.data || res.data);
        if (normalized) {
          setApiShop(normalized);
          setActiveCategory(normalized.categories[0]?.id || '');
        }
      })
      .catch(() => {})
      .finally(() => setMenuLoading(false));
  }, [shopId]);
  const [detailItem, setDetailItem]     = useState(null); // { item, startIndex }
  const [showCart, setShowCart]         = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [liked, setLiked]              = useState({});
  const [checkoutForm, setCheckoutForm] = useState({
    name: '', phone: '', table: tableFromQR, type: tableFromQR ? 'dine-in' : 'dine-in', payment: 'online',
  });
  const catRefs = useRef({});
  const itemRefs = useRef({});
  const [highlightedItem, setHighlightedItem] = useState('');

  // Derived
  const allItems = shop.categories.flatMap(c => c.items);
  const addItem  = cartAddItem;
  const remItem  = cartRemItem;
  const cartCount = Object.values(cart).reduce((a, v) => a + v, 0);
  const cartTotal = Object.entries(cart).reduce((a, [id, qty]) => {
    const item = allItems.find(i => i.id === id);
    return a + (item?.price || 0) * qty;
  }, 0);
  const cartItems = Object.entries(cart).map(([id, qty]) => ({ ...allItems.find(i=>i.id===id), qty }));

  // Keep the shared cart context's catalog snapshot in sync so the shell's
  // Cart/Home tabs can still render item names/prices after this page unmounts.
  useEffect(() => {
    if (shop?.id && allItems.length) bindShop(shop.id, shop.name, allItems);
  }, [shop?.id, shop?.name, allItems.length]);

  // Remember this as the shell's "current context" so its Home/Search/Cart
  // tabs know to bring the customer back here.
  useEffect(() => {
    if (shop?.id) setCustomerContext('shop', shop.id, shop.name);
  }, [shop?.id, shop?.name]);

  // Deep links from the shell: /menu/:id?openCart=1 or ?focusSearch=1
  useEffect(() => {
    if (openCartParam) setShowCart(true);
    if (focusSearchParam) setTimeout(() => document.querySelector('.cm-search-input')?.focus(), 300);
  }, [openCartParam, focusSearchParam]);

  // Deep link from a "Product Page" QR/poster: /menu/:id?item={itemId} —
  // scroll to that item and briefly highlight it once the menu has loaded.
  useEffect(() => {
    if (!itemFromQR || menuLoading) return;
    const el = itemRefs.current[itemFromQR];
    if (!el) return;
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedItem(itemFromQR);
      setTimeout(() => setHighlightedItem(''), 2500);
    }, 300);
  }, [itemFromQR, menuLoading]);

  const [isFavorited, setIsFavorited] = useState(false);
  useEffect(() => {
    if (isLoggedIn && customer?.phone && shop?.id) {
      favoritesApi.mine(customer.phone, authHeader)
        .then(res => setIsFavorited((res.data.data || []).some(f => f.shopId === shop.id)))
        .catch(() => {});
    }
  }, [isLoggedIn, customer?.phone, shop?.id]);

  const toggleShopFavorite = () => {
    if (!isLoggedIn) { setShowLogin(true); return; }
    favoritesApi.toggle(customer.phone, shop.id, authHeader)
      .then(res => setIsFavorited(res.data.data.favorited))
      .catch(() => {});
  };

  // Once logged in, prefill the checkout form instead of leaving it blank.
  useEffect(() => {
    if (customer?.phone) {
      setCheckoutForm(f => ({ ...f, phone: f.phone || customer.phone, name: f.name || (customer.name !== 'Guest' ? customer.name : f.name) }));
    }
  }, [customer?.phone]);

  const getItemName = (item) => {
    if (lang === 'hi') return item.nameHi || item.name;
    if (lang === 'ta') return item.nameTa || item.name;
    return item.name;
  };
  const getItemDesc = (item) => {
    if (lang === 'hi') return item.descHi || item.desc;
    return item.desc;
  };
  const getCatName = (cat) => {
    const map = { hi:'nameHi', ta:'nameTa', te:'nameTe', kn:'nameKn', ml:'nameMl', bn:'nameBn', mr:'nameMr', gu:'nameGu' };
    return cat[map[lang]] || cat.name;
  };
  const getShopName = () => {
    if (lang === 'hi') return shop.nameHi || shop.name;
    return shop.name;
  };

  const searchLow = search.toLowerCase();
  const filteredCats = shop.categories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => {
      if (vegOnly && !item.veg) return false;
      if (search && !item.name.toLowerCase().includes(searchLow) && !getItemName(item).toLowerCase().includes(searchLow)) return false;
      if (groupFilter && cat.id !== groupFilter) return false;
      return true;
    }),
  })).filter(cat => !search || cat.items.length > 0);

  const scrollToCategory = (catId) => {
    setActiveCategory(catId);
    setSearch('');
    catRefs.current[catId]?.scrollIntoView({ behavior:'smooth', block:'start' });
  };

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveCategory(entry.target.dataset.catid);
      });
    }, { rootMargin:'-60px 0px -60% 0px' });
    Object.values(catRefs.current).forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, [shop]);

  // Real order placement — replaces the old setOrderPlaced(true) mock. Cash
  // orders are placed directly; Online orders are placed then paid for via a
  // real Razorpay order (payment-service gracefully returns a mock Razorpay
  // order id in dev when no live gateway keys are configured, so this whole
  // path is exercisable end-to-end without a production Razorpay account).
  const placeRealOrder = async () => {
    if (!isLoggedIn) { setShowLogin(true); return; }
    // The bundled offline preview menu (SHOPS.spiceroute/demo) ships fake item
    // ids like "i1" for browsing only — it was never wired to real menu rows,
    // so sending these as menuItemId 500s the backend (expects a UUID). Catch
    // it here with a clear message instead of letting that request fire.
    if (cartItems.some(i => !UUID_RE.test(i.id))) {
      setOrderError("This is a preview menu and can't take real orders — scan the restaurant's actual QR code to order.");
      return;
    }
    setOrderError('');
    setPlacingOrder(true);
    try {
      const orderReq = {
        customerName: checkoutForm.name || customer?.name || 'Guest',
        customerPhone: checkoutForm.phone || customer?.phone || '',
        tableNumber: checkoutForm.type === 'dine-in' ? checkoutForm.table : '',
        type: checkoutForm.type === 'dine-in' ? 'DINE_IN' : 'TAKEAWAY',
        paymentMethod: checkoutForm.payment === 'online' ? 'ONLINE' : 'CASH',
        items: cartItems.map(i => ({
          menuItemId: i.id, itemName: getItemName(i), quantity: i.qty, unitPrice: i.price,
        })),
      };
      const orderRes = await orderApi.placeOrder(shop.id, orderReq, authHeader);
      const order = orderRes.data.data;

      if (checkoutForm.payment === 'online') {
        const payRes = await paymentApi.createOrder({
          shopId: shop.id, orderId: order.id, amount: cartTotal,
          currency: 'INR', customerId: customer?.userId,
        }, authHeader);
        const pay = payRes.data.data;
        const loaded = await loadRazorpayScript();
        if (loaded && window.Razorpay) {
          const rzp = new window.Razorpay({
            key: pay.key,
            amount: pay.amount,
            currency: pay.currency,
            order_id: pay.razorpayOrderId,
            name: shop.name,
            description: `Order at ${shop.name}`,
            prefill: { name: orderReq.customerName, contact: orderReq.customerPhone },
            handler: async (resp) => {
              try {
                await paymentApi.verify({
                  orderId: order.id,
                  razorpayOrderId: resp.razorpay_order_id,
                  razorpayPaymentId: resp.razorpay_payment_id,
                  razorpaySignature: resp.razorpay_signature,
                }, authHeader);
              } catch { /* verification failure surfaces via order status, not blocking here */ }
              setPlacedOrder(order);
              clearCart();
              setShowCheckout(false);
            },
            modal: { ondismiss: () => setPlacingOrder(false) },
          });
          rzp.open();
          return; // placedOrder is set from the Razorpay handler callback above
        }
      }

      // Cash orders (or if Razorpay failed to load) complete immediately.
      setPlacedOrder(order);
      clearCart();
      setShowCheckout(false);
    } catch (e) {
      setOrderError(e?.response?.data?.message || 'Could not place order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (menuLoading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:12}}>
      <div style={{width:40,height:40,border:'3px solid #E5E7EB',borderTopColor:'#1D9E75',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <p style={{fontSize:14,color:'#6B7280'}}>Loading menu…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (placedOrder) return (
    <OrderConfirmed
      lang={lang} shop={shop} order={placedOrder}
      onBack={() => setPlacedOrder(null)}
    />
  );

  return (
    <div className="cm-page">
      {/* ── Header ── */}
      <header className="cm-header">
        <div className="cm-header-inner">
          <div className="cm-brand">
            <QrCode size={17} className="cm-brand-icon" />
            <span className="cm-brand-name">Avi<em>QR</em></span>
          </div>

          <div className="cm-header-right">
            {/* Language picker */}
            <div className="cm-lang-wrap">
              <button className="cm-lang-btn" onClick={() => setShowLangPicker(p => !p)}>
                <Globe size={14} />
                <span>{LANGUAGES.find(l => l.code === lang)?.native}</span>
                <ChevronDown size={12} />
              </button>
              {showLangPicker && (
                <div className="cm-lang-dropdown">
                  {LANGUAGES.map(l => (
                    <button key={l.code}
                      className={`cm-lang-option ${lang === l.code ? 'active' : ''}`}
                      onClick={() => { setLang(l.code); setShowLangPicker(false); }}>
                      <span className="cm-lang-native">{l.native}</span>
                      <span className="cm-lang-label">{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="cm-icon-btn" onClick={() => navigator.share?.({ title: shop.name, url: window.location.href })}>
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Shop banner ── */}
      <div className="cm-shop-banner" style={{ '--shop-color': shop.color }}>
        <div className="cm-shop-emoji-wrap">
          <span className="cm-shop-emoji">{shop.emoji}</span>
        </div>
        <div className="cm-shop-info">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <h1 className="cm-shop-name" style={{ margin:0 }}>{getShopName()}</h1>
            <button
              onClick={toggleShopFavorite}
              aria-label="Favorite this restaurant"
              style={{ background:'rgba(255,255,255,.2)', border:'none', borderRadius:'50%', width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}
            >
              <Heart size={13} fill={isFavorited ? '#DC2626' : 'none'} stroke={isFavorited ? '#DC2626' : '#fff'} />
            </button>
          </div>
          <p className="cm-shop-tagline">{shop.tagline}</p>
          <div className="cm-shop-meta">
            <span className="cm-meta-chip">
              <Star size={11} className="cm-star" /> {shop.rating} ({shop.reviews})
            </span>
            <span className="cm-meta-chip"><Clock size={11} /> {shop.timing}</span>
            <span className="cm-meta-chip"><MapPin size={11} /> {shop.location}</span>
          </div>
        </div>
        {tableFromQR && (
          <div className="cm-table-chip">
            📍 {lang === 'hi' ? 'टेबल' : 'Table'} {tableFromQR}
          </div>
        )}
      </div>

      {/* ── Search + filter bar ── */}
      <div className="cm-toolbar">
        <div className="cm-search-wrap">
          <Search size={14} className="cm-search-ico" />
          <input
            className="cm-search-input"
            placeholder={t('search', lang)}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="cm-search-clear" onClick={() => setSearch('')}><X size={13} /></button>}
        </div>
        <button
          className={`cm-veg-filter ${vegOnly ? 'active' : ''}`}
          onClick={() => setVegOnly(p => !p)}
          title={t('filterVeg', lang)}
        >
          <span className="cm-veg-dot" />
          <span className="cm-veg-text">{t('veg', lang)}</span>
        </button>
      </div>

      {/* ── Category tabs ── */}
      <div className="cm-cats">
        <button
          className={`cm-cat-tab ${activeCategory === 'all' && !search ? 'active' : ''}`}
          onClick={() => { setSearch(''); setActiveCategory('all'); window.scrollTo({ top: 0, behavior:'smooth' }); }}
        >
          {t('all', lang)}
        </button>
        {shop.categories.map(cat => (
          <button
            key={cat.id}
            className={`cm-cat-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => scrollToCategory(cat.id)}
          >
            {cat.emoji} {getCatName(cat)}
          </button>
        ))}
      </div>

      {/* ── Menu items ── */}
      <div className="cm-menu-body">
        {filteredCats.map(cat => (
          <div
            key={cat.id}
            ref={el => { catRefs.current[cat.id] = el; }}
            data-catid={cat.id}
            className="cm-cat-section"
          >
            <div className="cm-cat-heading">
              <span className="cm-cat-emoji">{cat.emoji}</span>
              <span>{getCatName(cat)}</span>
              <span className="cm-cat-count">{cat.items.length}</span>
            </div>

            {cat.items.map(item => {
              const inCart    = cart[item.id] || 0;
              const hasVideo  = !!item.videoUrl;
              const hasModel  = !!item.modelUrl;
              const hasImage  = !!item.imageUrl;
              const hasMedia  = hasVideo || hasModel;
              const imageCount = item.images && item.images.length ? item.images.length : (hasImage ? 1 : 0);
              const videoSlideIndex = imageCount;
              const modelSlideIndex = imageCount + (hasVideo ? 1 : 0);
              const openDetail = (startIndex = 0) => setDetailItem({ item, startIndex });
              return (
                <div
                  key={item.id}
                  ref={el => { itemRefs.current[item.id] = el; }}
                  className={`cm-item ${!item.veg ? 'cm-item-nonveg' : ''} ${highlightedItem === item.id ? 'cm-item-highlighted' : ''}`}
                >
                  {/* veg / non-veg dot */}
                  <div className={`cm-dot ${item.veg ? 'cm-dot-veg' : 'cm-dot-nonveg'}`}>
                    <div className="cm-dot-inner" />
                  </div>

                  <div className="cm-item-body">
                    <div className="cm-item-top">
                      <div className="cm-item-info" onClick={() => openDetail(0)} role="button" tabIndex={0}>
                        <div className="cm-item-name-row">
                          <span className="cm-item-name">{getItemName(item)}</span>
                          {item.popular && (
                            <span className="cm-badge cm-badge-popular">
                              <Flame size={9} /> {t('popular', lang)}
                            </span>
                          )}
                          {item.spicy && <span className="cm-badge cm-badge-spicy">🌶</span>}
                        </div>
                        <div className="cm-item-desc">{getItemDesc(item)}</div>

                        {/* Media action links */}
                        {hasMedia && (
                          <div className="cm-item-media-links">
                            {hasVideo && (
                              <button
                                className="cm-media-link cm-media-link-video"
                                onClick={e => { e.stopPropagation(); openDetail(videoSlideIndex); }}
                              >
                                <Play size={10} fill="currentColor" /> Watch video
                              </button>
                            )}
                            {hasModel && (
                              <button
                                className="cm-media-link cm-media-link-3d"
                                onClick={e => { e.stopPropagation(); openDetail(modelSlideIndex); }}
                              >
                                <Box size={10} /> View in 3D
                              </button>
                            )}
                          </div>
                        )}

                        <div className="cm-item-price">₹{item.price}</div>
                      </div>

                      <div className="cm-item-right">
                        {/* Thumbnail — always tappable, opens the full detail sheet */}
                        <div
                          className="cm-item-img-wrap cm-item-img-wrap-clickable"
                          onClick={() => openDetail(0)}
                        >
                          {hasImage ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              loading="lazy"
                              decoding="async"
                              className="cm-item-img-photo"
                              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                            />
                          ) : null}
                          <div className="cm-item-img" style={hasImage ? { display:'none' } : {}}>{cat.emoji}</div>

                          {/* Media overlay badge */}
                          {hasVideo && (
                            <div className="cm-item-play-btn" aria-label="Watch video">
                              <Play size={14} fill="white" />
                            </div>
                          )}
                          {hasModel && !hasVideo && (
                            <div className="cm-item-3d-btn" aria-label="View 3D">
                              <Box size={13} />
                            </div>
                          )}
                          {imageCount > 1 && (
                            <div className="cm-item-gallery-badge" aria-label={`${imageCount} photos`}>
                              {imageCount}
                            </div>
                          )}

                          <button
                            className="cm-like-btn"
                            onClick={e => { e.stopPropagation(); setLiked(l => ({ ...l, [item.id]: !l[item.id] })); }}
                          >
                            <Heart size={12} fill={liked[item.id] ? '#DC2626' : 'none'} stroke={liked[item.id] ? '#DC2626' : '#9CA3AF'} />
                          </button>
                        </div>

                        {inCart === 0 ? (
                          <button className="cm-add-btn" onClick={() => addItem(item.id)}>
                            <Plus size={14} /> {t('addToCart', lang)}
                          </button>
                        ) : (
                          <div className="cm-qty">
                            <button className="cm-qty-btn" onClick={() => remItem(item.id)}><Minus size={13} /></button>
                            <span className="cm-qty-num">{inCart}</span>
                            <button className="cm-qty-btn" onClick={() => addItem(item.id)}><Plus size={13} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {filteredCats.every(c => c.items.length === 0) && (
          <div className="cm-empty">
            <Search size={28} className="cm-empty-icon" />
            <p>{lang === 'hi' ? 'कोई आइटम नहीं मिला' : 'No items found'}</p>
          </div>
        )}

        <div className="cm-footer-note">
          <QrCode size={14} /> Powered by AviQR
        </div>
      </div>

      {/* ── Item detail sheet — swipeable photos/video/3D + full details ── */}
      {detailItem && (
        <ItemDetailSheet
          item={detailItem.item}
          startIndex={detailItem.startIndex}
          lang={lang}
          getItemName={getItemName}
          getItemDesc={getItemDesc}
          inCart={cart[detailItem.item.id] || 0}
          onAdd={() => addItem(detailItem.item.id)}
          onRemove={() => remItem(detailItem.item.id)}
          onClose={() => setDetailItem(null)}
        />
      )}

      {/* ── Cart FAB ── */}
      {cartCount > 0 && !showCart && !showCheckout && (
        <button className="cm-cart-fab" onClick={() => setShowCart(true)}>
          <div className="cm-cart-fab-left">
            <span className="cm-cart-fab-count">{cartCount}</span>
            <span>{t('cart', lang)}</span>
          </div>
          <div className="cm-cart-fab-right">
            ₹{cartTotal} <ChevronRight size={16} />
          </div>
        </button>
      )}

      {/* ── Cart bottom sheet ── */}
      {showCart && (
        <BottomSheet onClose={() => setShowCart(false)}>
          <div className="cm-sheet-header">
            <h2 className="cm-sheet-title">{t('cart', lang)}</h2>
            <button className="cm-sheet-close" onClick={() => setShowCart(false)}><X size={18} /></button>
          </div>
          <div className="cm-cart-list">
            {cartItems.map(item => (
              <div key={item.id} className="cm-cart-row">
                <div className="cm-cart-qty-ctrl">
                  <button onClick={() => remItem(item.id)}><Minus size={12} /></button>
                  <span>{item.qty}</span>
                  <button onClick={() => addItem(item.id)}><Plus size={12} /></button>
                </div>
                <span className="cm-cart-name">{getItemName(item)}</span>
                <span className="cm-cart-price">₹{item.price * item.qty}</span>
              </div>
            ))}
          </div>
          <div className="cm-cart-divider" />
          <div className="cm-cart-summary-row">
            <span>{t('subtotal', lang)}</span>
            <span className="cm-cart-total-val">₹{cartTotal}</span>
          </div>
          <button className="cm-proceed-btn" onClick={() => {
            setShowCart(false);
            if (isLoggedIn) setShowCheckout(true); else setShowLogin(true);
          }}>
            {t('proceedToOrder', lang)} <ChevronRight size={16} />
          </button>
        </BottomSheet>
      )}

      {/* ── Checkout sheet ── */}
      {showCheckout && (
        <BottomSheet tall onClose={() => setShowCheckout(false)}>
          <div className="cm-sheet-header">
            <h2 className="cm-sheet-title">{t('placeOrder', lang)}</h2>
            <button className="cm-sheet-close" onClick={() => setShowCheckout(false)}><X size={18} /></button>
          </div>
          <div className="cm-checkout-form">
            <div className="cm-field">
              <label>{t('name', lang)}</label>
              <input placeholder={lang === 'hi' ? 'जैसे: अंजलि' : 'e.g. Anjali'}
                value={checkoutForm.name}
                onChange={e => setCheckoutForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="cm-field">
              <label>{t('phone', lang)}</label>
              <input type="tel" placeholder="98765 43210"
                value={checkoutForm.phone}
                onChange={e => setCheckoutForm(f => ({ ...f, phone: e.target.value }))} />
            </div>

            <div className="cm-type-row">
              {['dine-in', 'takeaway'].map(tp => (
                <button key={tp}
                  className={`cm-type-btn ${checkoutForm.type === tp ? 'active' : ''}`}
                  onClick={() => setCheckoutForm(f => ({ ...f, type: tp }))}>
                  {tp === 'dine-in' ? `🍽 ${t('dineIn', lang)}` : `🛍 ${t('takeaway', lang)}`}
                </button>
              ))}
            </div>

            {checkoutForm.type === 'dine-in' && (
              <div className="cm-field">
                <label>{t('tableNo', lang)}</label>
                <input placeholder={lang === 'hi' ? 'जैसे: 7' : 'e.g. 7'}
                  value={checkoutForm.table}
                  onChange={e => setCheckoutForm(f => ({ ...f, table: e.target.value }))} />
              </div>
            )}

            <div className="cm-payment-section">
              <div className="cm-payment-label">
                {lang === 'hi' ? 'भुगतान का तरीका' : lang === 'ta' ? 'கட்டண முறை' : 'Payment method'}
              </div>
              <div className="cm-pay-opts">
                {[
                  { k:'online', label: t('payOnline', lang), icon:'💳' },
                  { k:'cash',   label: t('payCash', lang),   icon:'💵' },
                ].map(p => (
                  <button key={p.k}
                    className={`cm-pay-opt ${checkoutForm.payment === p.k ? 'active' : ''}`}
                    onClick={() => setCheckoutForm(f => ({ ...f, payment: p.k }))}>
                    <span className="cm-pay-icon">{p.icon}</span>
                    <span>{p.label}</span>
                    {checkoutForm.payment === p.k && <CheckCircle size={14} className="cm-pay-check" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Order summary */}
            <div className="cm-order-summary">
              {cartItems.map(item => (
                <div key={item.id} className="cm-sum-row">
                  <span className="cm-sum-qty">{item.qty}×</span>
                  <span className="cm-sum-name">{getItemName(item)}</span>
                  <span className="cm-sum-price">₹{item.price * item.qty}</span>
                </div>
              ))}
              <div className="cm-sum-total">
                <span>{t('subtotal', lang)}</span>
                <span>₹{cartTotal}</span>
              </div>
            </div>

            {orderError && <div className="cm-order-error" style={{color:'#DC2626',fontSize:12.5,marginBottom:8}}>{orderError}</div>}
            <button className="cm-proceed-btn" onClick={placeRealOrder} disabled={placingOrder}>
              {placingOrder ? '…' : checkoutForm.payment === 'online'
                ? `${t('payOnline', lang)} · ₹${cartTotal}`
                : `${t('placeOrder', lang)} · ₹${cartTotal}`}
            </button>
          </div>
        </BottomSheet>
      )}

      {showLogin && (
        <CustomerLoginSheet
          onClose={() => setShowLogin(false)}
          onLoggedIn={() => { setShowLogin(false); setShowCheckout(true); }}
        />
      )}
    </div>
  );
}

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────
function BottomSheet({ children, onClose, tall }) {
  return (
    <div className="cm-backdrop" onClick={onClose}>
      <div className={`cm-sheet ${tall ? 'cm-sheet-tall' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="cm-sheet-handle" />
        {children}
      </div>
    </div>
  );
}

// ─── Order Confirmed — real order tracking, polls the actual order status ────
function OrderConfirmed({ lang, shop, order: initialOrder, onBack }) {
  const [order, setOrder] = useState(initialOrder);
  const [refreshing, setRefreshing] = useState(false);
  const { authHeader } = useCustomerAuth();

  const refresh = () => {
    setRefreshing(true);
    return orderApi.getById(initialOrder.id, authHeader)
      .then(res => setOrder(res.data.data))
      .catch(() => {})
      .finally(() => setRefreshing(false));
  };

  // Poll the real order every 5s so status reflects what the kitchen actually does,
  // plus a manual refresh button below for an on-demand check.
  useEffect(() => {
    const iv = setInterval(refresh, 5000);
    return () => clearInterval(iv);
  }, [initialOrder.id]);

  const currentStatus = STATUSES.find(s => s.key === order.status) || STATUSES[0];
  const statusLabel = lang === 'hi' ? currentStatus.hi : lang === 'ta' ? currentStatus.ta : currentStatus.en;
  const cancelled = order.status === 'CANCELLED' || order.status === 'REJECTED';

  return (
    <div className="cm-confirmed-page">
      <div className="cm-confirmed-card">
        <div className="cm-confirmed-pulse">
          <div className="cm-confirmed-emoji">{cancelled ? '❌' : currentStatus.icon}</div>
        </div>
        <h1 className="cm-confirmed-title">{t('orderConfirmed', lang)}</h1>
        <p className="cm-confirmed-sub">
          {lang === 'hi' ? `${shop.nameHi || shop.name} में आपका ऑर्डर हो गया।` : `Your order at ${shop.name} is placed.`}
        </p>
        <div className="cm-order-id-chip">#{order.orderNumber || order.id?.slice(0,8)} · ₹{order.totalAmount}</div>

        {/* Order code + QR — shown at the counter to pay (if pay-at-counter) and,
            later, reused to collect the order once it's ready. Same panel is
            reused on the order-history detail page (PortalOrderDetail). */}
        <OrderCodePanel order={order} lang={lang} />

        {/* Status bar */}
        <div className="cm-status-current">
          <div className="cm-status-dot-live" />
          {lang === 'hi' ? 'स्थिति:' : lang === 'ta' ? 'நிலை:' : 'Status:'} <strong>{cancelled ? order.status : statusLabel}</strong>
          <button
            onClick={refresh}
            disabled={refreshing}
            style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:'inherit', textDecoration:'underline', opacity: refreshing ? .5 : 1 }}>
            {refreshing ? '…' : (lang === 'hi' ? 'रीफ़्रेश करें' : lang === 'ta' ? 'புதுப்பிக்க' : 'Refresh')}
          </button>
        </div>

        {/* Progress track — same component reused on the order-history detail page */}
        <OrderProgressTrack status={order.status} lang={lang} />

        {/* Order summary — from the real placed order, not the (now-cleared) cart */}
        <div className="cm-confirmed-items">
          {(order.items || []).map(item => (
            <div key={item.id} className="cm-conf-item-row">
              <span>{item.quantity}× {item.itemName}</span>
              <span>₹{item.totalPrice}</span>
            </div>
          ))}
        </div>

        <div className="cm-confirmed-actions">
          <button className="cm-back-btn" onClick={onBack}>
            ← {lang === 'hi' ? 'मेनू पर वापस' : lang === 'ta' ? 'மெனுவிற்கு திரும்பு' : 'Back to menu'}
          </button>
        </div>
      </div>
    </div>
  );
}
