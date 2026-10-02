import { useEffect, useState } from 'react';
import { adminSecurityApi, authApi } from '../../api/index.js';
import './AdminLoginSecurity.css';

const TABS = [
  ['LOGIN_SUCCESS', 'Login History'], ['LOGIN_FAILURE', 'Failed Logins'],
  ['ACCOUNT_LOCK', 'Blocked Accounts'], ['BLOCKED_LOGIN', 'Blocked Logins'], ['OTP_EXEMPTION', 'OTP Exemptions'],
  ['TRUSTED_DEVICE', 'Trusted Devices'], ['PASSWORD_RESET', 'Reset Password'], ['SUPPORT', 'Support Accounts'], ['ADMIN_ACTION', 'Admin Actions'],
];
const format = value => value ? new Date(value).toLocaleString() : '—';

export default function AdminLoginSecurity({supportOnly=false}) {
  const [kind, setKind] = useState(supportOnly?'ACCOUNT_LOCK':'LOGIN_SUCCESS');
  const [page, setPage] = useState(0);
  const [data, setData] = useState({content: [], totalPages: 0});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({name:'',email:'',reason:'',days:7});
  const [action, setAction] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const field = (key,value) => setForm(old => ({...old,[key]:value}));

  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = kind === 'SUPPORT' ? await adminSecurityApi.support(page) : await adminSecurityApi.records(kind,page);
      setData(response.data.data);
    } catch (err) { setError(err.response?.data?.message || 'Could not load security records.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { let active = true;
    setLoading(true); setError('');
    const request = kind === 'SUPPORT' ? adminSecurityApi.support(page) : adminSecurityApi.records(kind,page);
    request.then(response => {if(active) setData(response.data.data);})
      .catch(err => {if(active) setError(err.response?.data?.message || 'Could not load security records.');})
      .finally(() => {if(active) setLoading(false);});
    return () => {active=false;};
  },[kind,page]);

  const submit = async event => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (kind === 'SUPPORT') {
        await adminSecurityApi.createSupport({name:form.name,email:form.email});
        setMessage('Support account created as pending. Approve it to allow password setup and login.');
      } else if (kind === 'OTP_EXEMPTION') {
        const response = await authApi.getUsers({search:form.email,size:100});
        const user = response.data.data.content.find(user => user.email.toLowerCase() === form.email.trim().toLowerCase());
        if (!user) throw new Error('No account matches this email.');
        await adminSecurityApi.exempt({userId:user.id,reason:form.reason,days:Number(form.days)});
        setMessage('Temporary OTP exemption granted. Password is still required.');
      } else {
        await adminSecurityApi.reset({email:form.email,reason:form.reason});
        setMessage('Sessions revoked and password reset requested. The user completes the reset using the email code.');
      }
      setForm({name:'',email:'',reason:'',days:7}); await load();
    } catch (err) { setError(err.response?.data?.message || err.message || 'Action failed.'); }
    finally {setBusy(false);}
  };
  const confirmAction = async event => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (action.type === 'approve') await adminSecurityApi.approve(action.row.id,actionReason);
      else if (action.type === 'terminate') await adminSecurityApi.terminate(action.row.id,actionReason);
      else if (action.type === 'unblock') await adminSecurityApi.unblock({email:action.row.email,reason:actionReason});
      else await adminSecurityApi.revoke(action.row.id,actionReason);
      setMessage(action.type === 'unblock' ? 'Account attempt lock cleared. IP limits and account status still apply.' : 'Security action saved.');
      setAction(null); setActionReason(''); await load();
    } catch (err) {setError(err.response?.data?.message || 'Action failed.');}
    finally {setBusy(false);}
  };
  return <section className="login-security">
    <header className="security-heading"><div><h1>Login Security</h1><p>Review sign-ins and manage access to AviQR.</p></div>
      <button type="button" onClick={load} disabled={loading || busy}>Refresh</button></header>
    <div className="security-tabs" role="tablist" aria-label="Login security sections">
      {TABS.filter(([key]) => !supportOnly || ['ACCOUNT_LOCK','BLOCKED_LOGIN'].includes(key)).map(([key,label]) => <button type="button" key={key} role="tab" aria-selected={kind===key}
        className={kind===key?'selected':''} onClick={() => {setKind(key);setPage(0);setAction(null);setMessage('');setError('');}}>{label}</button>)}
    </div>
    {error && <p className="security-error" role="alert">{error}</p>}
    {message && <p className="security-success" role="status">{message}</p>}
    {['SUPPORT','OTP_EXEMPTION','PASSWORD_RESET'].includes(kind) && <form className="security-form" onSubmit={submit}>
      <h2>{kind==='SUPPORT'?'Register support agent':kind==='OTP_EXEMPTION'?'Grant temporary OTP exemption':'Request password reset'}</h2>
      {kind==='SUPPORT' && <label>Name<input required maxLength={150} value={form.name} onChange={e => field('name',e.target.value)}/></label>}
      <label>Account email<input type="email" required value={form.email} onChange={e => field('email',e.target.value)}/></label>
      {kind!=='SUPPORT' && <label>Reason<input required maxLength={500} value={form.reason} onChange={e => field('reason',e.target.value)}/></label>}
      {kind==='OTP_EXEMPTION' && <><label>Expires in days<input type="number" min="1" max="30" required value={form.days} onChange={e => field('days',e.target.value)}/></label>
        <p>Admin and support accounts always require password and OTP.</p></>}
      <button disabled={busy} type="submit">{busy?'Saving…':kind==='SUPPORT'?'Create pending account':kind==='OTP_EXEMPTION'?'Grant exemption':'Send reset request'}</button>
    </form>}
    {action && <form className="security-form" onSubmit={confirmAction}>
      <h2>{action.type[0].toUpperCase()+action.type.slice(1)} — {action.row.email}</h2>
      <label>Reason<input autoFocus required maxLength={500} value={actionReason} onChange={e => setActionReason(e.target.value)}/></label>
      <p>{action.type==='terminate'?'Termination blocks login and revokes all sessions and security grants.':action.type==='approve'?'Approval enables the account and requests a password setup code by email.':'This action will be recorded in the audit log.'}</p>
      <button type="submit" disabled={busy}>Confirm {action.type}</button><button type="button" disabled={busy} onClick={() => setAction(null)}>Cancel</button>
    </form>}
    {kind==='TRUSTED_DEVICE' && <p>Devices become trusted only after OTP verification. Device credentials expire after 15 days; revoking a device also ends the user’s sessions.</p>}
    {['ACCOUNT_LOCK','BLOCKED_LOGIN'].includes(kind) && <p>These are historical blocked attempts. Account attempt locks expire after one hour. A verified password reset releases the account lock. Clearing a lock does not reactivate a suspended or terminated account.</p>}
    <div className="security-table-wrap"><table><thead><tr>
      <th>Account</th><th>Status</th><th>{kind==='SUPPORT'?'Last login':'Reason / method'}</th><th>{kind==='SUPPORT'?'Created':'Device / IP'}</th>
      {kind!=='SUPPORT' && <><th>Recorded</th><th>Expires</th></>}<th>Actions</th>
    </tr></thead><tbody>
      {loading ? <tr><td colSpan={7}>Loading…</td></tr> : !data.content?.length ? <tr><td colSpan={7}>No records found.</td></tr> : data.content.map(row => <tr key={row.id}>
        <td>{row.email}{kind==='SUPPORT' && <small>{row.name}</small>}</td><td><span className={`security-status ${row.status.toLowerCase()}`}>{row.status}</span></td>
        <td>{kind==='SUPPORT'?format(row.lastLoginAt):row.reason || '—'}</td>
        <td>{kind==='SUPPORT'?format(row.createdAt):<>{row.deviceId || row.userAgent || '—'}<small>{row.ipAddress || '—'}</small></>}</td>
        {kind!=='SUPPORT' && <><td>{format(row.createdAt)}</td><td>{format(row.expiresAt)}</td></>}
        <td>{kind==='SUPPORT' ? <>
          {row.status==='PENDING' && <button disabled={busy} type="button" onClick={() => {setAction({type:'approve',row});setActionReason('');}}>Approve</button>}
          {row.status!=='TERMINATED' && <button disabled={busy} type="button" onClick={() => {setAction({type:'terminate',row});setActionReason('');}}>Terminate</button>}
        </> : ['OTP_EXEMPTION','TRUSTED_DEVICE'].includes(kind) && row.status==='ACTIVE' ? <button disabled={busy} type="button" onClick={() => {setAction({type:'revoke',row});setActionReason('');}}>Revoke</button>
          : kind==='ACCOUNT_LOCK' && row.status==='BLOCKED' ? <button disabled={busy} type="button" onClick={() => {setAction({type:'unblock',row});setActionReason('');}}>Clear account lock</button> : '—'}</td>
      </tr>)}
    </tbody></table></div>
    <footer className="security-pagination"><button disabled={page===0 || loading || busy} onClick={() => setPage(page-1)}>Previous</button>
      <span>Page {page+1} of {Math.max(1,data.totalPages || 0)}</span>
      <button disabled={page+1>=(data.totalPages || 0) || loading || busy} onClick={() => setPage(page+1)}>Next</button></footer>
  </section>;
}
