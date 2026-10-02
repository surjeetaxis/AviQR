import {useEffect,useState} from 'react';
import {Modal,View,Text,TextInput,TouchableOpacity,StyleSheet} from 'react-native';
import api from '../../api/index.js';
import {subscribeStepUp,finishStepUp} from '../../api/stepUpBroker.js';
export default function StepUpPrompt(){
 const [request,setRequest]=useState(null),[password,setPassword]=useState(''),[otp,setOtp]=useState(''),[challenge,setChallenge]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>subscribeStepUp(item=>{setRequest(item);setPassword('');setOtp('');setChallenge(null);setError('');}),[]);
 const submit=async()=>{setBusy(true);setError('');try{
  if(!challenge){const r=await api.post('/api/v1/auth/security/step-up/start',{password,method:request.method,target:request.target},request.config);setChallenge(r.data.data.challengeId);setPassword('');}
  else{const r=await api.post('/api/v1/auth/security/step-up/finish',{challengeId:challenge,otp},request.config);finishStepUp(r.data.data.token);}
 }catch(e){setError(e.response?.data?.message||e.message||'Verification failed.');}finally{setBusy(false);}};
 return <Modal visible={!!request} transparent onRequestClose={()=>{if(!busy)finishStepUp(null);}}><View style={s.overlay}><View style={s.dialog}><Text style={s.title}>Confirm sensitive action</Text><Text>Verify your password and email code to continue.</Text>{!!error&&<Text accessibilityRole="alert" style={{color:'#b91c1c'}}>{error}</Text>}
 {!challenge?<TextInput accessibilityLabel="Password" placeholder="Password" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} style={s.input}/>:<TextInput accessibilityLabel="Email verification code" placeholder="Email verification code" keyboardType="number-pad" maxLength={6} value={otp} onChangeText={setOtp} style={s.input}/>}
 <TouchableOpacity disabled={busy} onPress={submit}><Text style={s.button}>{busy?'Verifying…':challenge?'Verify and continue':'Send verification code'}</Text></TouchableOpacity><TouchableOpacity disabled={busy} onPress={()=>finishStepUp(null)}><Text style={s.button}>Cancel</Text></TouchableOpacity>
 </View></View></Modal>;
}
const s=StyleSheet.create({overlay:{flex:1,justifyContent:'center',padding:24,backgroundColor:'#0008'},dialog:{padding:24,gap:16,borderRadius:16,backgroundColor:'white'},title:{fontSize:20,fontWeight:'700'},input:{borderWidth:1,borderColor:'#94a3b8',padding:12,borderRadius:8},button:{padding:12,color:'#0f766e',textAlign:'center',fontWeight:'700'}});
