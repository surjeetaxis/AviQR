import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/context/AuthContext.js';
import { authApi } from '../src/api/index.js';
import { Button } from '../src/components/common/Button.js';
import { Input } from '../src/components/common/Input.js';
import { Colors, Radius, Spacing, FontSize } from '../src/theme/index.js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MailIcon, KeyIcon, ShieldIcon } from '../src/components/common/NavIcons.js';
import { Logo } from '../src/components/common/Logo.js';

function homeFor(role) {
  const r=(role||'').toUpperCase();
  if(r==='ADMIN')return'/(admin)/admin-home';if(r==='SUPPORT')return'/(support)/support-home';
  if(r==='HOTEL')return'/(hotel)/hotel-home';if(r==='MALL')return'/(mall)/mall-home';
  if(r==='SUPPLIER')return'/(supplier)/supplier-home';if(r==='CUSTOMER')return'/(customer)/shop/menu';
  return'/(owner)/dashboard';
}

export default function Login() {
  const { login, loginOtp } = useAuth();
  const insets = useSafeAreaInsets();
  const [securityOpen, setSecurityOpen] = useState(false);
  const [tab, setTab]       = useState('password');
  const [email, setEmail]   = useState('');
  const [pw, setPw]         = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otp, setOtp]       = useState('');
  const [sent, setSent]     = useState(false);
  const [challengeId,setChallengeId] = useState(null);
  const [trustDevice,setTrustDevice] = useState(false);
  const [loading, setLoad]  = useState(false);
  const [err, setErr]       = useState('');

  const doLogin = async () => {
    if(!email||!pw) return setErr('Enter email and password');
    setLoad(true); setErr('');
    try { const u=await login(email,pw);
      if(u.requiresOtp) {setChallengeId(u.challengeId);setOtpEmail(email);setSent(true);setTab('otp');setPw('');}
      else router.replace(homeFor(u.role)); }
    catch(e){ setErr(e.response ? (e.response.data?.message||'Invalid credentials.') : 'Could not reach the server. Check your connection.'); }
    finally { setLoad(false); }
  };

  const sendOtp = async () => {
    if(!otpEmail) return setErr('Enter email address');
    setLoad(true); setErr('');
    try { await authApi.sendOtp(otpEmail); setSent(true); }
    catch { setErr('Could not send OTP. Please try again.'); setSent(true); }
    finally { setLoad(false); }
  };

  const verifyOtp = async () => {
    if(!otp) return;
    setLoad(true); setErr('');
    try { const u=await loginOtp(otpEmail,otp,{challengeId,trustDevice}); router.replace(homeFor(u.role)); }
    catch(e) { setErr(e.response?.data?.message || 'OTP verification failed'); }
    finally { setLoad(false); }
  };

  return (
    <KeyboardAvoidingView style={ss.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={ss.screen} contentContainerStyle={ss.scroll} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={[Colors.brandSurface, Colors.brandRaised]} style={[ss.hero,{paddingTop:Math.max(insets.top,24)+24}]}>
        <TouchableOpacity onPress={() => router.push('/landing')} activeOpacity={0.8} style={ss.brandRow} accessibilityRole="button" accessibilityLabel="AviQR home">
          <Logo size={36} />
          <Text style={ss.brand}>Avi<Text style={ss.accent}>QR</Text></Text>
        </TouchableOpacity>
        <Text style={ss.tagline}>LESS BUSYWORK. MORE HOSPITALITY.</Text>
        <Text style={ss.sub}>Great service starts behind the scenes.</Text>
      </LinearGradient>

      <View style={ss.body}>
        <Text style={ss.eyebrow}>YOUR WORKSPACE AWAITS</Text>
        <Text accessibilityRole="header" style={ss.title}>Welcome back</Text>
        <Text style={ss.subtitle}>A fresh start for your next service. Sign in below.</Text>
        {err?<View style={ss.errBox}><Text style={ss.errTxt}>{err}</Text></View>:null}

        <View style={ss.tabs}>
          {['password','otp'].map(t=>(
            <TouchableOpacity key={t} accessibilityRole="button" accessibilityState={{selected:tab===t}} style={[ss.tab,tab===t&&ss.tabActive]} onPress={()=>{setTab(t);setErr('');if(t==='password'){setChallengeId(null);setSent(false);}}}>
              {t==='password' ? <KeyIcon size={16} color={tab===t?Colors.primaryDark:Colors.gray500} /> : <MailIcon size={16} color={tab===t?Colors.primaryDark:Colors.gray500} />}
              <Text style={[ss.tabTxt,tab===t&&ss.tabTxtActive]}>{t==='password'?'Password':'Email OTP'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab==='password'?(
          <View>
            <Input label="Email address" placeholder="you@restaurant.in" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/>
            <Input label="Password" placeholder="Password" value={pw} onChangeText={setPw} secureEntry/>
            <TouchableOpacity onPress={()=>router.push('/forgot-password')} style={{alignSelf:'flex-end',marginBottom:12}}>
              <Text style={{fontSize:FontSize.xs,color:Colors.primary,fontWeight:'700'}}>Forgot?</Text>
            </TouchableOpacity>
            <Button title={loading?'Signing in…':'Sign in'} onPress={doLogin} loading={loading}/>
          </View>
        ):(
          <View>
            <Input label="Email address" placeholder="you@restaurant.in" value={otpEmail} onChangeText={setOtpEmail} keyboardType="email-address" autoCapitalize="none"/>
            {sent?(
              <View>
                <Input label="6-digit code" placeholder="123456" maxLength={6} textContentType="oneTimeCode" value={otp} onChangeText={setOtp} keyboardType="number-pad"/>
                <Button title={loading?'Verifying…':'Verify & Login'} onPress={verifyOtp} loading={loading}/>
                <TouchableOpacity onPress={sendOtp} style={ss.resend}><Text style={ss.resendTxt}>Resend OTP</Text></TouchableOpacity>
              </View>
            ):(
              <Button title={loading?'Sending…':'Send OTP'} onPress={sendOtp} loading={loading}/>
            )}
          </View>
        )}

        <View style={ss.security}>
          <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel="Trust this device for 15 days" accessibilityState={{checked:trustDevice}} onPress={()=>setTrustDevice(!trustDevice)} style={ss.trust}>
            <View style={[ss.checkbox,trustDevice&&ss.checkboxChecked]}><Text style={ss.check}>{trustDevice?'✓':''}</Text></View>
            <View style={{flex:1}}><Text style={ss.trustTitle}>Trust this device for 15 days</Text><Text style={ss.trustHint}>Saved after OTP verification. Use on your personal device.</Text></View>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:securityOpen}} onPress={()=>setSecurityOpen(!securityOpen)} style={ss.securityToggle}>
            <ShieldIcon size={15} color={Colors.gray500} /><Text style={ss.trustHint}>Account security {securityOpen?'−':'+'}</Text>
          </TouchableOpacity>
          {securityOpen&&<Text style={ss.trustHint}>Admin/support require password + OTP. Five wrong attempts lock the account for one hour. Reset your password to unlock it. Maximum five OTP sends per hour.</Text>}
        </View>
        <TouchableOpacity onPress={()=>router.push('/register')} style={ss.registerLink}>
          <Text style={ss.registerTxt}>New to AviQR? <Text style={{color:Colors.primary,fontWeight:'700'}}>Create account</Text></Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ss = StyleSheet.create({
  screen:{flex:1,backgroundColor:Colors.background},
  scroll:{flexGrow:1},
  hero:{paddingBottom:36,paddingHorizontal:24,gap:16},
  brandRow:{flexDirection:'row',alignItems:'center',gap:10},
  brand:{fontSize:26,fontWeight:'700',color:Colors.white,letterSpacing:-1},
  accent:{color:Colors.mint},
  tagline:{fontSize:10,fontWeight:'700',letterSpacing:1.4,color:Colors.mint,marginTop:12},
  sub:{fontSize:28,fontWeight:'600',letterSpacing:-0.8,lineHeight:34,color:Colors.white,maxWidth:340},
  body:{width:'100%',maxWidth:520,alignSelf:'center',padding:24,backgroundColor:Colors.background,borderTopLeftRadius:24,borderTopRightRadius:24,marginTop:-20,flex:1},
  errBox:{backgroundColor:Colors.errorLight,borderRadius:Radius.md,padding:12,marginBottom:14,borderWidth:1,borderColor:'#FCA5A5'},
  errTxt:{color:Colors.error,fontSize:FontSize.sm,fontWeight:'500'},
  tabs:{flexDirection:'row',backgroundColor:Colors.gray100,borderRadius:Radius.md,padding:4,marginBottom:20},
  tab:{flex:1,height:44,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',borderRadius:Radius.sm},
  tabActive:{backgroundColor:Colors.white,shadowColor:'#000',shadowOpacity:0.06,shadowRadius:4,elevation:2},
  tabTxt:{fontSize:FontSize.sm,fontWeight:'600',color:Colors.gray500},
  tabTxtActive:{color:Colors.primaryDark},
  resend:{alignSelf:'center',marginTop:10},
  resendTxt:{color:Colors.primary,fontWeight:'600',fontSize:FontSize.sm},
  eyebrow:{fontSize:10,fontWeight:'700',letterSpacing:1.4,color:Colors.primaryDark,marginBottom:10},
  title:{fontSize:30,fontWeight:'600',letterSpacing:-1,color:Colors.gray900,marginBottom:8},
  subtitle:{fontSize:13,lineHeight:21,color:Colors.gray500,marginBottom:24},
  security:{borderTopWidth:1,borderTopColor:Colors.border,paddingTop:20,marginTop:24,gap:14},
  trust:{flexDirection:'row',gap:10,alignItems:'flex-start',paddingVertical:4},
  checkbox:{width:20,height:20,borderWidth:1,borderColor:Colors.gray300,borderRadius:5,alignItems:'center',justifyContent:'center'},
  checkboxChecked:{backgroundColor:Colors.primary,borderColor:Colors.primary},
  check:{color:Colors.white,fontSize:13},
  trustTitle:{fontSize:12,fontWeight:'500',color:Colors.gray700,marginBottom:4},
  trustHint:{fontSize:11,color:Colors.gray500,lineHeight:18},
  securityToggle:{flexDirection:'row',alignItems:'center',gap:6,minHeight:36},
  registerLink:{alignItems:'center',marginTop:24},
  registerTxt:{fontSize:FontSize.base,color:Colors.gray500},
});