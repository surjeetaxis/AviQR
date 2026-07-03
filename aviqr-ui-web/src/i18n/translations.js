// AviQR — Global translations for all user roles
// Languages: en, hi, ta, te, kn, ml, bn, mr, gu

export const LANGUAGES = [
  { code:'en', label:'English',   native:'English',   flag:'🇬🇧' },
  { code:'hi', label:'Hindi',     native:'हिंदी',      flag:'🇮🇳' },
  { code:'ta', label:'Tamil',     native:'தமிழ்',      flag:'🇮🇳' },
  { code:'te', label:'Telugu',    native:'తెలుగు',     flag:'🇮🇳' },
  { code:'kn', label:'Kannada',   native:'ಕನ್ನಡ',      flag:'🇮🇳' },
  { code:'ml', label:'Malayalam', native:'മലയാളം',     flag:'🇮🇳' },
  { code:'bn', label:'Bengali',   native:'বাংলা',      flag:'🇮🇳' },
  { code:'mr', label:'Marathi',   native:'मराठी',      flag:'🇮🇳' },
  { code:'gu', label:'Gujarati',  native:'ગુજરાતી',    flag:'🇮🇳' },
];

const T = {
  search:   { en:'Search…', hi:'खोजें…', ta:'தேடுங்கள்…', kn:'ಹುಡುಕಿ…', ml:'തിരയൂ…', te:'వెతకండి…' },
  profile:  { en:'Profile',  hi:'प्रोफ़ाइल', ta:'சுயவிவரம்', kn:'ಪ್ರೊಫೈಲ್', ml:'പ്രൊഫൈൽ', te:'ప్రొఫైల్' },
  settings: { en:'Settings', hi:'सेटिंग्स', ta:'அமைப்புகள்', kn:'ಸೆಟ್ಟಿಂಗ್ಸ್', ml:'ക്രമീകരണങ്ങൾ', te:'సెట్టింగులు' },
  logout:   { en:'Sign out', hi:'साइन आउट', ta:'வெளியேறு', kn:'ಸೈನ್ ಔಟ್', ml:'സൈൻ ഔട്ട്', te:'సైన్ అవుట్' },
  orders:   { en:'Orders',   hi:'ऑर्डर',     ta:'ஆர்டர்கள்', kn:'ಆರ್ಡರ್ಗಳು', ml:'ഓർഡറുകൾ', te:'ఆర్డర్లు' },
  menu:     { en:'Menu',     hi:'मेनू',       ta:'மெனு',       kn:'ಮೆನು',        ml:'മെனു',       te:'మెనూ' },
  // Added — these were called via t() throughout Hotel/Mall dashboards, the
  // shared SubscriptionPage, and Onboarding, but had no entry: t() falls back
  // to the raw (lowercase, uncapitalized) key when a translation is missing,
  // so every one of these was silently rendering as e.g. "save" instead of "Save".
  save:         { en:'Save',          hi:'सहेजें',              ta:'சேமி',                   kn:'ಉಳಿಸಿ',                ml:'സേവ് ചെയ്യുക',         te:'సేవ్ చేయండి' },
  vendors:      { en:'Vendors',       hi:'विक्रेता',            ta:'விற்பனையாளர்கள்',       kn:'ಮಾರಾಟಗಾರರು',           ml:'വെണ്ടർമാർ',            te:'విక్రేతలు' },
  subscription: { en:'Subscription',  hi:'सदस्यता',             ta:'சந்தா',                  kn:'ಚಂದಾದಾರಿಕೆ',           ml:'സബ്സ്ക്രിപ്ഷൻ',         te:'సబ్స్క్రిప్షన్' },
  currentPlan:  { en:'Current Plan',  hi:'वर्तमान योजना',       ta:'தற்போதைய திட்டம்',      kn:'ಪ್ರಸ್ತುತ ಯೋಜನೆ',       ml:'നിലവിലെ പ്ലാൻ',        te:'ప్రస్తుత ప్లాన్' },
  upgradePlan:  { en:'Upgrade Plan',  hi:'योजना अपग्रेड करें',  ta:'திட்டத்தை மேம்படுத்து', kn:'ಯೋಜನೆ ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ', ml:'പ്ലാൻ അപ്ഗ്രേഡ് ചെയ്യുക', te:'ప్లాన్ అప్‌గ్రేడ్ చేయండి' },
  welcome:      { en:'Welcome',       hi:'स्वागत है',           ta:'வரவேற்பு',              kn:'ಸುಸ್ವಾಗತ',             ml:'സ്വാഗതം',              te:'స్వాగతం' },
  next:         { en:'Next',         hi:'अगला',                ta:'அடுத்து',                kn:'ಮುಂದೆ',                ml:'അടുത്തത്',             te:'తదుపరి' },
  finish:       { en:'Finish',       hi:'समाप्त करें',         ta:'முடி',                   kn:'ಮುಗಿಸಿ',               ml:'പൂർത്തിയാക്കുക',       te:'ముగించు' },
  skip:         { en:'Skip',         hi:'छोड़ें',              ta:'தவிர்',                  kn:'ಬಿಟ್ಟುಬಿಡಿ',           ml:'ഒഴിവാക്കുക',           te:'దాటవేయి' },
};

export const t = (key, lang = 'en') => T[key]?.[lang] || T[key]?.['en'] || key;
export const getLangName = (code) => LANGUAGES.find(l => l.code === code)?.native || 'English';
