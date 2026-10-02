import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { adminSecurityApi, authApi } from '../../src/api/index.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { Colors } from '../../src/theme/index.js';

const TABS=[['LOGIN_SUCCESS','Login History'],['LOGIN_FAILURE','Failed Logins'],['BLOCKED_LOGIN','Blocked Logins'],
 ['OTP_EXEMPTION','OTP Exemptions'],['TRUSTED_DEVICE','Trusted Devices'],['PASSWORD_RESET','Reset Password'],['SUPPORT','Support Accounts'],['ADMIN_ACTION','Admin Actions']];
const date=value=>value?new Date(value).toLocaleString():'—';
export default function AdminLoginSecurity() {
 const [kind,setKind]=useState('LOGIN_SUCCESS'),[page,setPage]=useState(0),[data,setData]=useState({content:[],totalPages:0});
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [form,setForm]=useState({name:'',email:'',reason:'',days:'7'}),[action,setAction]=useState(null),[reason,setReason]=useState('');
 const field=(key,value)=>setForm(old=>({...old,[key]:value}));
 const request=()=>kind==='SUPPORT'?adminSecurityApi.support(page):adminSecurityApi.records(kind,page);
 const load=async()=>{setLoading(true);try{const response=await request();setData(response.data.data);}catch(err){setError(err.response?.data?.message||'Could not load records.');}finally{setLoading(false);}};
 useEffect(()=>{let active=true;setLoading(true);setError('');setMessage('');
  request().then(response=>{if(active)setData(response.data.data);}).catch(err=>{if(active)setError(err.response?.data?.message||'Could not load records.');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[kind,page]);
 const submit=async()=>{
  if(!form.email.trim())return setError('Enter the account email.');
  if(kind==='SUPPORT'&&!form.name.trim())return setError('Enter the agent name.');
  if(kind!=='SUPPORT'&&!form.reason.trim())return setError('Enter a reason.');
  setBusy(true);setError('');setMessage('');
  try{
   if(kind==='SUPPORT'){await adminSecurityApi.createSupport({name:form.name,email:form.email});setMessage('Pending support account created. Approval is required before login.');}
   else if(kind==='OTP_EXEMPTION'){
    const days=Number(form.days);if(!Number.isInteger(days)||days<1||days>30)throw new Error('Choose 1–30 days.');
    const response=await authApi.getUsers({search:form.email,size:100});
    const user=response.data.data.content.find(user=>user.email.toLowerCase()===form.email.trim().toLowerCase());
    if(!user)throw new Error('Account not found.');
    await adminSecurityApi.exempt({userId:user.id,reason:form.reason,days});setMessage('Temporary exemption granted. Password is still required.');
   }else{await adminSecurityApi.reset({email:form.email,reason:form.reason});setMessage('Sessions revoked and reset requested. The user completes setup by email.');}
   setForm({name:'',email:'',reason:'',days:'7'});await load();
  }catch(err){setError(err.response?.data?.message||err.message||'Action failed.');}finally{setBusy(false);}
 };
 const confirm=async()=>{
  if(!reason.trim())return setError('Enter a reason.');setBusy(true);setError('');
  try{
   if(action.type==='approve')await adminSecurityApi.approve(action.row.id,reason);
   else if(action.type==='terminate')await adminSecurityApi.terminate(action.row.id,reason);
   else if(action.type==='unblock')await adminSecurityApi.unblock({email:action.row.email,reason});
   else await adminSecurityApi.revoke(action.row.id,reason);
   setAction(null);setMessage('Security action saved.');await load();
  }catch(err){setError(err.response?.data?.message||'Action failed.');}finally{setBusy(false);}
 };
 const select=(type,row)=>{setAction({type,row});setReason('');setError('');};
 return <View style={styles.screen}>
  <View style={styles.header}><TouchableOpacity onPress={()=>router.back()}><Text style={styles.back}>← Back</Text></TouchableOpacity><Text style={styles.title}>Login Security</Text></View>
  <ScrollView horizontal style={styles.tabs} contentContainerStyle={{gap:8,padding:12}}>{TABS.map(([key,label])=><TouchableOpacity key={key} accessibilityRole="tab" accessibilityState={{selected:key===kind}} style={[styles.tab,key===kind&&styles.selected]} onPress={()=>{setKind(key);setPage(0);}}><Text style={{color:key===kind?'white':'#334155'}}>{label}</Text></TouchableOpacity>)}</ScrollView>
  <ScrollView contentContainerStyle={styles.content}>
   {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}{!!message&&<Text style={styles.message}>{message}</Text>}
   {['SUPPORT','OTP_EXEMPTION','PASSWORD_RESET'].includes(kind)&&<View style={styles.card}>
    <Text style={styles.subtitle}>{kind==='SUPPORT'?'Register support agent':kind==='OTP_EXEMPTION'?'Grant temporary exemption':'Request password reset'}</Text>
    {kind==='SUPPORT'&&<Input label="Name" value={form.name} onChangeText={value=>field('name',value)}/>}
    <Input label="Account email" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={value=>field('email',value)}/>
    {kind!=='SUPPORT'&&<Input label="Reason" value={form.reason} onChangeText={value=>field('reason',value)}/>}
    {kind==='OTP_EXEMPTION'&&<><Input label="Expires in days (1–30)" keyboardType="number-pad" value={form.days} onChangeText={value=>field('days',value)}/><Text>Admin and support always require password and OTP.</Text></>}
    <Button title={kind==='SUPPORT'?'Create pending account':kind==='OTP_EXEMPTION'?'Grant exemption':'Send reset request'} loading={busy} onPress={submit}/>
   </View>}
   {kind==='BLOCKED_LOGIN'&&<Text>Historical attempts. Locks expire after 15 minutes. Clearing a lock does not reactivate suspended or terminated accounts.</Text>}
   {kind==='TRUSTED_DEVICE'&&<Text>Devices are trusted only after OTP verification. Credentials expire in 30 days.</Text>}
   {loading?<ActivityIndicator color={Colors.primary}/>:!data.content?.length?<Text>No records found.</Text>:data.content.map(row=><View key={row.id} style={styles.card}>
    <Text style={styles.subtitle}>{row.email}</Text><Text style={styles.status}>{row.status}</Text>
    {kind==='SUPPORT'?<><Text>{row.name}</Text><Text>Last login: {date(row.lastLoginAt)}</Text></>:<><Text>{row.reason||'—'}</Text><Text>{row.deviceId||row.userAgent||'—'}</Text><Text>IP: {row.ipAddress||'—'}</Text><Text>Recorded: {date(row.createdAt)}</Text><Text>Expires: {date(row.expiresAt)}</Text></>}
    <View style={styles.actions}>
     {kind==='SUPPORT'&&row.status==='PENDING'&&<Button title="Approve" loading={busy} onPress={()=>select('approve',row)}/>}
     {kind==='SUPPORT'&&row.status!=='TERMINATED'&&<Button title="Terminate" loading={busy} onPress={()=>select('terminate',row)}/>}
     {['OTP_EXEMPTION','TRUSTED_DEVICE'].includes(kind)&&row.status==='ACTIVE'&&<Button title="Revoke" loading={busy} onPress={()=>select('revoke',row)}/>}
     {kind==='BLOCKED_LOGIN'&&<Button title="Clear account lock" loading={busy} onPress={()=>select('unblock',row)}/>}
    </View>
   </View>)}
   <View style={styles.pagination}><TouchableOpacity disabled={page===0||loading} onPress={()=>setPage(page-1)}><Text style={{opacity:page===0?.4:1}}>Previous</Text></TouchableOpacity><Text>{page+1} / {Math.max(1,data.totalPages||0)}</Text><TouchableOpacity disabled={page+1>=(data.totalPages||0)||loading} onPress={()=>setPage(page+1)}><Text>Next</Text></TouchableOpacity></View>
  </ScrollView>
  <Modal visible={!!action} transparent animationType="fade" onRequestClose={()=>{if(!busy)setAction(null);}}><View style={styles.overlay}><View style={styles.modal}>
   <Text style={styles.subtitle}>{action?.type} — {action?.row.email}</Text>
   {!!error&&<Text style={styles.error}>{error}</Text>}
   <Text>{action?.type==='terminate'?'Termination blocks login and revokes all sessions and grants.':'This action is recorded in the audit history.'}</Text>
   <Input label="Reason" value={reason} onChangeText={setReason}/><Button title="Confirm" loading={busy} onPress={confirm}/>
   <TouchableOpacity disabled={busy} onPress={()=>setAction(null)}><Text style={{textAlign:'center',padding:12}}>Cancel</Text></TouchableOpacity>
  </View></View></Modal>
 </View>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#f8fafc'},header:{paddingTop:55,padding:20,gap:12,backgroundColor:'white'},back:{color:'#0f766e'},title:{fontSize:24,fontWeight:'700'},tabs:{maxHeight:65},tab:{padding:12,backgroundColor:'white',borderRadius:8},selected:{backgroundColor:'#0f766e'},content:{padding:16,gap:16,paddingBottom:40},card:{padding:16,backgroundColor:'white',borderRadius:12,gap:10},subtitle:{fontSize:16,fontWeight:'700'},status:{fontWeight:'700',color:'#0f766e'},actions:{gap:8},error:{padding:12,backgroundColor:'#fee2e2',color:'#991b1b',borderRadius:8},message:{padding:12,backgroundColor:'#dcfce7',color:'#166534',borderRadius:8},pagination:{flexDirection:'row',justifyContent:'space-between',padding:12},overlay:{flex:1,justifyContent:'center',padding:24,backgroundColor:'#0008'},modal:{backgroundColor:'white',borderRadius:12,padding:20,gap:12}});
