export const Colors = {
  primary:       '#146C50',
  primaryDark:   '#105940',
  primaryLight:  '#EDF6F0',
  brandSurface:  '#102E28',
  brandRaised:   '#24483C',
  onBrand:       '#C0D3CC',
  mint:          '#9DDDC6',
  error:         '#DC2626',
  errorLight:    '#FEE2E2',
  warning:       '#D97706',
  warningLight:  '#FEF3C7',
  info:          '#2563EB',
  infoLight:     '#DBEAFE',
  purple:        '#7C3AED',
  purpleLight:   '#EDE9FE',
  white:         '#FFFFFF',
  gray50:        '#F8FAF9',
  gray100:       '#EAF0ED',
  gray200:       '#E1E8E3',
  gray300:       '#C3D0C8',
  gray400:       '#74847B',
  gray500:       '#65766C',
  gray600:       '#53645E',
  gray700:       '#374B42',
  gray800:       '#24483C',
  gray900:       '#18382C',
  background:    '#F8FAF9',
  surface:       '#FFFFFF',
  border:        '#E1E8E3',
};

export const Spacing = { xs:4, sm:8, md:12, base:16, lg:20, xl:24, '2xl':32, '3xl':48 };
export const Radius  = { sm:8, md:10, lg:18, xl:20, '2xl':24, full:999 };
export const FontSize= { xs:11, sm:12, base:14, md:15, lg:16, xl:18, '2xl':20, '3xl':24, '4xl':28 };

export const Shadow = {
  sm: { shadowColor:Colors.gray900, shadowOffset:{width:0,height:2}, shadowOpacity:0.03, shadowRadius:6, elevation:1 },
  md: { shadowColor:Colors.gray900, shadowOffset:{width:0,height:3}, shadowOpacity:0.05, shadowRadius:10, elevation:2 },
  lg: { shadowColor:Colors.brandSurface, shadowOffset:{width:0,height:8}, shadowOpacity:0.10, shadowRadius:20,elevation:5 },
};

export const Typography = {
  title: { fontSize:28, fontWeight:'600', letterSpacing:-0.8, color:Colors.gray900 },
  section: { fontSize:16, fontWeight:'600', letterSpacing:-0.3, color:Colors.gray900 },
  body: { fontSize:14, lineHeight:22, color:Colors.gray700 },
  caption: { fontSize:12, lineHeight:18, color:Colors.gray500 },
  eyebrow: { fontSize:10, fontWeight:'700', letterSpacing:1.4, color:Colors.primaryDark },
};

export const ROLE_COLOR = {
  OWNER:'#1D9E75', MANAGER:'#2563EB', CASHIER:'#7C3AED', KITCHEN:'#D97706',
  ADMIN:'#DC2626', SUPPORT:'#0891B2', HOTEL:'#7C3AED', MALL:'#2563EB',
  SUPPLIER:'#059669', CUSTOMER:'#1D9E75',
};
