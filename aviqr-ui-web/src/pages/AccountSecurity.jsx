import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {api} from '../api/index.js';
import {ROLE_DEFAULT_ROUTE, useAuth} from '../context/AuthContext.jsx';
import {useCustomerAuth} from '../context/CustomerAuthContext.jsx';
import {registerPasskey} from '../api/passkeys.js';
export default function AccountSecurity({customerMode=false}){
 const {user}=useAuth();const {customer,authHeader}=useCustomerAuth();const current=customerMode?customer:user;
 const config=customerMode?{headers:{...authHeader,'X-Auth-Audience':'customer'}}:{};
 const role=(user?.role||'').toUpperCase();
 const backTo=customerMode?'/portal/profile':ROLE_DEFAULT_ROUTE[role]||'/dashboard';
 const [sessions,setSessions]=useState([]),[keys,setKeys]=useState([]),[name,setName]=useState('My security key'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const privileged=['ADMIN','SUPPORT'].includes(current?.role);
 const load=async()=>{try{const response=await api.get('/api/v1/auth/security/sessions',config);setSessions(response.data.data.content);if(privileged){const response=await api.get('/api/v1/auth/passkeys');setKeys(response.data.data);}}catch(e){setError(e.response?.data?.message||'Could not load account security.');}};
 useEffect(()=>{if(current)load();},[current?.userId,current?.id]);
 const run=async fn=>{setBusy(true);setError('');try{await fn();await load();}catch(e){setError(e.response?.data?.message||e.message);}finally{setBusy(false);}};
 return <main className="account-security-page" style={{maxWidth:950,margin:'30px auto',padding:24}}><Link to={backTo}>← Back</Link><h1>Account Security</h1><p>Review signed-in devices and remove access you no longer recognize.</p>
 {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}{!current?<Link to="/login">Sign in to manage security</Link>:<>
 <h2>Sessions</h2>{sessions.map(s=><section key={s.id} style={{padding:16,borderBottom:'1px solid #ddd'}}><strong>{s.platform} — {s.deviceModel||s.userAgent||'Device'}</strong><p>IP: {s.ipAddress||'unknown'} · Last active: {s.lastActiveAt?new Date(s.lastActiveAt).toLocaleString():'—'} · {s.revoked?'Revoked':new Date(s.expiresAt)<new Date()?'Expired':'Active'}</p>{!s.revoked&&new Date(s.expiresAt)>new Date()&&<button disabled={busy} onClick={()=>run(()=>api.post(`/api/v1/auth/security/sessions/${s.id}/revoke`,{},config))}>Revoke session</button>}</section>)}
 {privileged&&<><h2>Passkeys and security keys</h2><p>Use a registered key to verify sensitive actions. Password + email OTP remains required for admin/support sign-in.</p><label>Key name <input maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><button disabled={busy||!name.trim()} onClick={()=>run(()=>registerPasskey(api,name))}>Add passkey / security key</button>{keys.map(k=><p key={k.id}>{k.name} · Added {new Date(k.createdAt).toLocaleDateString()} <button disabled={busy} onClick={()=>run(()=>api.delete(`/api/v1/auth/passkeys/${k.id}`))}>Remove key</button></p>)}</>}
 </>}</main>;
}
