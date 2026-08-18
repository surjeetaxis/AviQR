import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/context/AuthContext.js';
import { authApi } from '../src/api/index.js';
import { Button } from '../src/components/common/Button.js';
import { Input } from '../src/components/common/Input.js';
import { Colors, Radius, Spacing, FontSize } from '../src/theme/index.js';
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
  const [tab, setTab]       = useState('password');
  const [email, setEmail]   = useState('');
  const [pw, setPw]         = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otp, setOtp]       = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoad]  = useState(false);
  const [err, setErr]       = useState('');

  const doLogin = async () => {
    if(!email||!pw) return setErr('Enter email and password');
    setLoad(true); setErr('');
    try { const u=await login(email,pw); router.replace(homeFor(u.role)); }
    catch(e){ setErr(e.response ? (e.response.data?.message||'Invalid credentials.') : 'Could not reach the server. Check your connection.'); }
    finally { setLoad(false); }
  };

  const sendOtp = async () => {
    if(!otpEmail) return setErr('Enter email address');
    setLoad(true); setErr('');
    try { await authApi.sendOtp(otpEmail); setSent(true); }
    catch { setErr('Could not send OTP. Use 123456 for dev.'); setSent(true); }
    finally { setLoad(false); }
  };

  const verifyOtp = async () => {
    if(!otp) return;
    setLoad(true); setErr('');
    try { const u=await loginOtp(otpEmail,otp); router.replace(homeFor(u.role)); }
    catch { setErr('Invalid OTP'); }
    finally { setLoad(false); }
  };

  return (
    <ScrollView style={ss.screen} contentContainerStyle={ss.scroll} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={['#0F6E56','#1D9E75']} style={ss.hero}>
        <TouchableOpacity onPress={() => router.push('/landing')} activeOpacity={0.8} style={{alignItems:'center'}}>
          <Logo size={48} />
          <Text style={ss.brand}>Avi<Text style={ss.accent}>QR</Text></Text>
        </TouchableOpacity>
        <Text style={ss.tagline}>Restaurant · Hotel · Mall OS</Text>
        <Text style={ss.sub}>Scan · Order · Pay</Text>
      </LinearGradient>

      <View style={ss.body}>
        {err?<View style={ss.errBox}><Text style={ss.errTxt}>{err}</Text></View>:null}

        <View style={ss.tabs}>
          {['password','otp'].map(t=>(
            <TouchableOpacity key={t} style={[ss.tab,tab===t&&ss.tabActive]} onPress={()=>{setTab(t);setErr('');}}>
              <Text style={[ss.tabTxt,tab===t&&ss.tabTxtActive]}>{t==='password'?'🔑 Password':'📧 OTP'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab==='password'?(
          <View>
            <Input label="Email" placeholder="sujeet@spiceroute.in" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/>
            <Input label="Password" placeholder="Axis321#" value={pw} onChangeText={setPw} secureEntry/>
            <TouchableOpacity onPress={()=>router.push('/forgot-password')} style={{alignSelf:'flex-end',marginBottom:12}}>
              <Text style={{fontSize:FontSize.xs,color:Colors.primary,fontWeight:'700'}}>Forgot?</Text>
            </TouchableOpacity>
            <Button title={loading?'Signing in…':'Sign In'} onPress={doLogin} loading={loading}/>
          </View>
        ):(
          <View>
            <Input label="Email" placeholder="sujeet@spiceroute.in" value={otpEmail} onChangeText={setOtpEmail} keyboardType="email-address" autoCapitalize="none"/>
            {sent?(
              <View>
                <Input label="OTP (dev: 123456)" placeholder="123456" value={otp} onChangeText={setOtp} keyboardType="number-pad"/>
                <Button title={loading?'Verifying…':'Verify & Login'} onPress={verifyOtp} loading={loading}/>
                <TouchableOpacity onPress={sendOtp} style={ss.resend}><Text style={ss.resendTxt}>Resend OTP</Text></TouchableOpacity>
              </View>
            ):(
              <Button title={loading?'Sending…':'Send OTP'} onPress={sendOtp} loading={loading}/>
            )}
          </View>
        )}

        <TouchableOpacity onPress={()=>router.push('/register')} style={ss.registerLink}>
          <Text style={ss.registerTxt}>New to AviQR? <Text style={{color:Colors.primary,fontWeight:'700'}}>Create account</Text></Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  screen:{flex:1,backgroundColor:Colors.background},
  scroll:{flexGrow:1},
  hero:{paddingTop:72,paddingBottom:40,paddingHorizontal:24,alignItems:'center',gap:10},
  brand:{fontSize:44,fontWeight:'900',color:Colors.white,letterSpacing:-1},
  accent:{color:'#A7F3D0'},
  tagline:{fontSize:FontSize.base,color:'rgba(255,255,255,0.8)',marginTop:6},
  sub:{fontSize:FontSize.sm,color:'rgba(255,255,255,0.5)',marginTop:4,letterSpacing:2},
  body:{padding:24,backgroundColor:Colors.background,borderTopLeftRadius:24,borderTopRightRadius:24,marginTop:-20,flex:1},
  errBox:{backgroundColor:Colors.errorLight,borderRadius:Radius.md,padding:12,marginBottom:14,borderWidth:1,borderColor:'#FCA5A5'},
  errTxt:{color:Colors.error,fontSize:FontSize.sm,fontWeight:'500'},
  tabs:{flexDirection:'row',backgroundColor:Colors.gray100,borderRadius:Radius.md,padding:4,marginBottom:20},
  tab:{flex:1,height:38,alignItems:'center',justifyContent:'center',borderRadius:Radius.sm},
  tabActive:{backgroundColor:Colors.white,shadowColor:'#000',shadowOpacity:0.06,shadowRadius:4,elevation:2},
  tabTxt:{fontSize:FontSize.sm,fontWeight:'600',color:Colors.gray500},
  tabTxtActive:{color:Colors.gray900},
  resend:{alignSelf:'center',marginTop:10},
  resendTxt:{color:Colors.primary,fontWeight:'600',fontSize:FontSize.sm},
  registerLink:{alignItems:'center',marginTop:24},
  registerTxt:{fontSize:FontSize.base,color:Colors.gray500},
});