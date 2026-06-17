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
  menu:     { en:'Menu',     hi:'मेनू',       ta:'மெனு',       kn:'ಮೆನು',        ml:'മെനു',       te:'మెనూ' },
};

export const t = (key, lang = 'en') => T[key]?.[lang] || T[key]?.['en'] || key;
export const getLangName = (code) => LANGUAGES.find(l => l.code === code)?.native || 'English';
