import {useEffect,useState} from 'react';
import {api} from '../../api/index.js';
import {subscribeStepUp,finishStepUp} from '../../api/stepUpBroker.js';
import {verifyPasskey} from '../../api/passkeys.js';
import './StepUpPrompt.css';
export default function StepUpPrompt(){
 const [request,setRequest]=useState(null),[password,setPassword]=useState(''),[otp,setOtp]=useState(''),[challenge,setChallenge]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>subscribeStepUp(item=>{setRequest(item);setPassword('');setOtp('');setChallenge(null);setError('');}),[]);
 const submit=async event=>{event.preventDefault();setBusy(true);setError('');try{
  if(!challenge){const result=await api.post('/api/v1/auth/security/step-up/start',{password,method:request.method,target:request.target},request.config);setChallenge(result.data.data.challengeId);setPassword('');}
  else{const result=await api.post('/api/v1/auth/security/step-up/finish',{challengeId:challenge,otp},request.config);finishStepUp(result.data.data.token);}
 }catch(e){setError(e.response?.data?.message||e.message||'Verification failed.');}finally{setBusy(false);}};
 const passkey=async()=>{setBusy(true);setError('');try{finishStepUp(await verifyPasskey(api,request));}catch(e){setError(e.response?.data?.message||e.message||'Passkey verification failed.');}finally{setBusy(false);}};
 if(!request)return null;
 return <div className="step-up-overlay"><section role="dialog" aria-modal="true" aria-labelledby="step-up-title" className="step-up-dialog">
  <h2 id="step-up-title">Confirm sensitive action</h2><p>Verify your identity before changing access or financial settings.</p>
  {error&&<p role="alert">{error}</p>}<form onSubmit={submit}>
   {!challenge?<label>Password<input autoFocus type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>:<label>Email verification code<input autoFocus required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={otp} onChange={e=>setOtp(e.target.value)}/></label>}
   <button disabled={busy}>{busy?'Verifying…':challenge?'Verify and continue':'Send verification code'}</button>
  </form>
  <button type="button" disabled={busy} onClick={passkey}>Use registered passkey / security key</button>
  <button type="button" disabled={busy} onClick={()=>finishStepUp(null)}>Cancel</button>
 </section></div>;
}
