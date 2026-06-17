import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, DEMO_USERS } from '../src/context/AuthContext.js';
import { authApi } from '../src/api/index.js';
import { Button } from '../src/components/common/Button.js';
import { Input } from '../src/components/common/Input.js';
import { Colors, Radius, Spacing, FontSize } from '../src/theme/index.js';

const DEMO_BTNS = [
  {role:'owner',    label:'Owner',    color:'#1D9E75'},
  {role:'admin',    label:'Admin',    color:'#DC2626'},
  {role:'hotel',    label:'Hotel',    color:'#7C3AED'},
  {role:'mall',     label:'Mall',     color:'#2563EB'},
  {role:'support',  label:'Support',  color:'#0891B2'},
  {role:'customer', label:'Customer', color:'#059669'},
];

function homeFor(role) {
  const r=(role||'').toUpperCase();
  if(r==='ADMIN')return'/(admin)/home';if(r==='SUPPORT')return'/(support)/home';
  if(r==='HOTEL')return'/(hotel)/home';if(r==='MALL')return'/(mall)/home';
  if(r==='SUPPLIER')return'/(supplier)/home';if(r==='CUSTOMER')return'/(customer)/menu';
  return'/(owner)/dashboard';
}

export default function Login() {
  const { login, loginOtp, demoLogin } = useAuth();
  const [tab, setTab]     = useState('password');
  const [email, setEmail] = useState('');
  const [pw, setPw]       = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp]     = useState('');
  const [sent, setSent]   = useState(false);
  const [loading, setLoad]= useState(false);
  const [err, setErr]     = useState('');

  const doLogin = async () => {
    if(!email||!pw) return setErr('Enter email and password');
    setLoad(true); setErr('');
    try { const u=await login(email,pw); router.replace(homeFor(u.role)); }
    catch(e){ setErr(e.response?.data?.message||'Invalid credentials. Try a demo button below.'); }
    finally { setLoad(false); }
  };

  const sendOtp = async () => {
    if(!phone) return setErr('Enter phone number');
    setLoad(true); setErr('');
    try { await authApi.sendOtp(phone); setSent(true); }
    catch { setErr('Could not send OTP. Use 123456 for dev.'); setSent(true); }
    finally { setLoad(false); }
  };

  const verifyOtp = async () => {
    if(!otp) return;
    setLoad(true); setErr('');
    try { const u=await loginOtp(phone,otp); router.replace(homeFor(u.role)); }
    catch { setErr('Invalid OTP'); }
    finally { setLoad(false); }
  };

  const quickDemo = async (role) => {
    const u = await demoLogin(role);
    router.replace(homeFor(u.role));
  };

  return (
    <ScrollView style={ss.screen} contentContainerStyle={ss.scroll} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={['#0F6E56','#1D9E75']} style={ss.hero}>
        <Text style={ss.brand}>Avi<Text style={ss.accent}>QR</Text></Text>
        <Text style={ss.tagline}>Restaurant · Hotel · Mall OS</Text>
        <Text style={ss.sub}>Scan · Order · Pay</Text>
      </LinearGradient>

      <View style={ss.body}>
        {err?<View style={ss.errBox}><Text style={ss.errTxt}>{err}</Text></View>:null}

        <View style={ss.tabs}>
          {['password','otp'].map(t=>(
            <TouchableOpacity key={t} style={[ss.tab,tab===t&&ss.tabActive]} onPress={()=>{setTab(t);setErr('');}}>
              <Text style={[ss.tabTxt,tab===t&&ss.tabTxtActive]}>{t==='password'?'🔑 Password':'📱 OTP'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab==='password'?(
          <View>
            <Input label="Email" placeholder="sujeet@spiceroute.in" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/>
            <Input label="Password" placeholder="Test@1234" value={pw} onChangeText={setPw} secureEntry/>
            <Button title={loading?'Signing in…':'Sign In'} onPress={doLogin} loading={loading}/>
          </View>
        ):(
          <View>
            <Input label="Phone" placeholder="9845012345" value={phone} onChangeText={setPhone} keyboardType="phone-pad"/>
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

        <View style={ss.divider}><View style={ss.divLine}/><Text style={ss.divTxt}>Quick Demo</Text><View style={ss.divLine}/></View>

        <View style={ss.demoGrid}>
          {DEMO_BTNS.map(d=>(
            <TouchableOpacity key={d.role} style={[ss.demoBtn,{borderColor:d.color}]} onPress={()=>quickDemo(d.role)}>
              <View style={[ss.demoDot,{backgroundColor:d.color}]}/>
              <Text style={[ss.demoTxt,{color:d.color}]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
  hero:{paddingTop:72,paddingBottom:40,paddingHorizontal:24,alignItems:'center'},
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
  divider:{flexDirection:'row',alignItems:'center',gap:10,marginVertical:20},
  divLine:{flex:1,height:1,backgroundColor:Colors.gray200},
  divTxt:{fontSize:FontSize.xs,color:Colors.gray400,fontWeight:'600'},
  demoGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  demoBtn:{flexDirection:'row',alignItems:'center',gap:5,paddingVertical:7,paddingHorizontal:14,borderRadius:Radius.full,borderWidth:1.5},
  demoDot:{width:7,height:7,borderRadius:4},
  demoTxt:{fontSize:FontSize.sm,fontWeight:'700'},
  resend:{alignSelf:'center',marginTop:10},
  resendTxt:{color:Colors.primary,fontWeight:'600',fontSize:FontSize.sm},
  registerLink:{alignItems:'center',marginTop:24},
  registerTxt:{fontSize:FontSize.base,color:Colors.gray500},
});