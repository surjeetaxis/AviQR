import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext.js';
import { Button } from '../src/components/common/Button.js';
import { Input } from '../src/components/common/Input.js';
import { Colors, Radius, FontSize } from '../src/theme/index.js';

const TYPES = [
  {role:'OWNER',   emoji:'🏪',label:'Restaurant / Cafe',sub:'I own a restaurant or cafe'},
  {role:'HOTEL',   emoji:'🏨',label:'Hotel / Resort',    sub:'I manage a hotel or resort'},
  {role:'MALL',    emoji:'🏬',label:'Mall / Food Court',  sub:'I manage a mall'},
  {role:'SUPPLIER',emoji:'📦',label:'Brand / Supplier',   sub:'I manage multiple outlets'},
];

function homeFor(role) {
  if(role==='ADMIN')return'/(admin)/admin-home';if(role==='SUPPORT')return'/(support)/support-home';
  if(role==='HOTEL')return'/(hotel)/hotel-home';if(role==='MALL')return'/(mall)/mall-home';
  if(role==='SUPPLIER')return'/(supplier)/supplier-home';
  return'/(owner)/dashboard';
}

export default function Register() {
  const {register} = useAuth();
  const [step, setStep]   = useState(0);
  const [role, setRole]   = useState('');
  const [form, setForm]   = useState({name:'',email:'',phone:'',password:''});
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoad]= useState(false);
  const [err, setErr]     = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const doRegister = async () => {
    if(!form.name||!form.email||!form.password) return setErr('Fill all required fields');
    if(!agreed) return setErr('Please accept the Terms of Service and Privacy Policy');
    setLoad(true); setErr('');
    try { const u=await register({...form,role}); router.replace(homeFor(u.role)); }
    catch(e){ setErr(e.response?.data?.message||'Registration failed. Try demo login.'); }
    finally { setLoad(false); }
  };

  return (
    <ScrollView style={ss.screen} contentContainerStyle={{padding:24,paddingTop:60}} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={()=>step>0?setStep(0):router.back()} style={ss.back}>
        <Text style={ss.backTxt}>← {step>0?'Back':'Login'}</Text>
      </TouchableOpacity>

      {step===0?(
        <View>
          <Text style={ss.title}>Create account</Text>
          <Text style={ss.sub}>Choose your account type</Text>
          {TYPES.map(t=>(
            <TouchableOpacity key={t.role} style={[ss.typeCard,role===t.role&&ss.typeSelected]} onPress={()=>setRole(t.role)}>
              <Text style={ss.typeEmoji}>{t.emoji}</Text>
              <View style={{flex:1}}>
                <Text style={ss.typeLabel}>{t.label}</Text>
                <Text style={ss.typeSub}>{t.sub}</Text>
              </View>
              <View style={[ss.check,role===t.role&&ss.checkFilled]}>
                {role===t.role&&<Text style={{color:'white',fontSize:12}}>✓</Text>}
              </View>
            </TouchableOpacity>
          ))}
          <Button title="Continue" onPress={()=>{if(role)setStep(1);else setErr('Select type');}} disabled={!role} style={{marginTop:20}}/>
        </View>
      ):(
        <View>
          <Text style={ss.title}>Your details</Text>
          {err?<View style={ss.errBox}><Text style={ss.errTxt}>{err}</Text></View>:null}
          <Input label="Full Name *" placeholder="Sujeet Narayanan" value={form.name} onChangeText={v=>set('name',v)}/>
          <Input label="Email *" placeholder="you@restaurant.in" value={form.email} onChangeText={v=>set('email',v)} keyboardType="email-address" autoCapitalize="none"/>
          <Input label="Phone" placeholder="9845012345" value={form.phone} onChangeText={v=>set('phone',v)} keyboardType="phone-pad"/>
          <Input label="Password *" placeholder="Min 8 characters" value={form.password} onChangeText={v=>set('password',v)} secureEntry/>
          {/* Terms of Service checkbox */}
          <TouchableOpacity onPress={()=>setAgreed(a=>!a)} style={[ss.termsRow,agreed&&ss.termsChecked]}>
            <View style={[ss.checkbox,agreed&&ss.checkboxFilled]}>
              {agreed&&<Text style={{color:'white',fontSize:12,fontWeight:'700'}}>✓</Text>}
            </View>
            <Text style={ss.termsTxt}>
              I agree to the{' '}
              <Text style={{color:Colors.primary,fontWeight:'700'}}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={{color:Colors.primary,fontWeight:'700'}}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>
          <Button title={loading?'Creating account…':'Create Account'} onPress={doRegister} loading={loading} disabled={!agreed} style={{marginTop:8,opacity:agreed?1:0.6}}/>
        </View>
      )}

      <TouchableOpacity onPress={()=>router.replace('/login')} style={{alignItems:'center',marginTop:24}}>
        <Text style={{color:Colors.gray500,fontSize:FontSize.base}}>Already have an account? <Text style={{color:Colors.primary,fontWeight:'700'}}>Sign in</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const ss=StyleSheet.create({
  screen:{flex:1,backgroundColor:Colors.background},
  back:{marginBottom:24}, backTxt:{color:Colors.primary,fontWeight:'600',fontSize:FontSize.base},
  title:{fontSize:26,fontWeight:'800',color:Colors.gray900,marginBottom:6},
  sub:{fontSize:FontSize.base,color:Colors.gray500,marginBottom:20},
  typeCard:{flexDirection:'row',alignItems:'center',gap:14,padding:16,backgroundColor:Colors.white,borderRadius:Radius.lg,borderWidth:1.5,borderColor:Colors.border,marginBottom:10},
  typeSelected:{borderColor:Colors.primary,backgroundColor:Colors.primaryLight},
  typeEmoji:{fontSize:26},
  typeLabel:{fontSize:FontSize.md,fontWeight:'700',color:Colors.gray900},
  typeSub:{fontSize:FontSize.xs,color:Colors.gray500,marginTop:2},
  check:{width:24,height:24,borderRadius:12,borderWidth:2,borderColor:Colors.gray300,alignItems:'center',justifyContent:'center'},
  checkFilled:{backgroundColor:Colors.primary,borderColor:Colors.primary},
  errBox:{backgroundColor:Colors.errorLight,borderRadius:Radius.md,padding:12,marginBottom:14},
  errTxt:{color:Colors.error,fontSize:FontSize.sm},
  termsRow:{flexDirection:'row',alignItems:'flex-start',gap:10,padding:12,borderRadius:Radius.md,borderWidth:1.5,borderColor:Colors.border,marginBottom:12,backgroundColor:Colors.background},
  termsChecked:{borderColor:Colors.primary,backgroundColor:Colors.primaryLight},
  checkbox:{width:22,height:22,borderRadius:4,borderWidth:2,borderColor:Colors.gray300,alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1},
  checkboxFilled:{backgroundColor:Colors.primary,borderColor:Colors.primary},
  termsTxt:{flex:1,fontSize:FontSize.sm,color:Colors.gray700,lineHeight:20},
});