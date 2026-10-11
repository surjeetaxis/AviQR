import {useEffect,useState} from 'react';
import {ScrollView,View,Text,TouchableOpacity,ActivityIndicator} from 'react-native';
import {router} from 'expo-router';
import api from '../src/api/index.js';
import {Colors,Radius,FontSize} from '../src/theme/index.js';
import {PageHeader} from '../src/components/common/PageHeader.js';
import {useAuth} from '../src/context/AuthContext.js';
export default function AccountSecurity(){
 const {user}=useAuth();const [sessions,setSessions]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=async()=>{try{const r=await api.get('/api/v1/auth/security/sessions');setSessions(r.data.data.content);}catch(e){setError(e.response?.data?.message||'Could not load sessions.');}};
 useEffect(()=>{if(user)load();else router.replace('/login');},[user?.userId]);
 const revoke=async id=>{setBusy(true);setError('');try{await api.post(`/api/v1/auth/security/sessions/${id}/revoke`);await load();}catch(e){setError(e.response?.data?.message||e.message);}finally{setBusy(false);}};
 return <ScrollView style={{backgroundColor:Colors.background}} contentContainerStyle={{padding:20,gap:18}}><PageHeader title="Account Security" subtitle="Review devices with access to your account" />{!!error&&<Text style={{color:'#b91c1c'}}>{error}</Text>}{busy&&<ActivityIndicator/>}
 {sessions.map(s=><View key={s.id} style={{padding:16,backgroundColor:Colors.white,borderRadius:Radius.lg,borderWidth:1,borderColor:Colors.border,gap:8}}><Text>{s.platform} — {s.deviceModel||'Device'}</Text><Text style={{fontSize:FontSize.sm,color:Colors.gray500}}>IP: {s.ipAddress||'unknown'}</Text><Text>{s.revoked?'Revoked':new Date(s.expiresAt)<new Date()?'Expired':'Active'}</Text>{!s.revoked&&new Date(s.expiresAt)>new Date()&&<TouchableOpacity disabled={busy} onPress={()=>revoke(s.id)}><Text style={{color:Colors.primary}}>Revoke session</Text></TouchableOpacity>}</View>)}
 {['ADMIN','SUPPORT'].includes(user?.role)&&<Text style={{fontSize:FontSize.sm,lineHeight:20,color:Colors.gray500}}>Manage passkeys and hardware security keys from Account Security on the AviQR website. Mobile sensitive actions use password and email OTP.</Text>}
 </ScrollView>;
}
