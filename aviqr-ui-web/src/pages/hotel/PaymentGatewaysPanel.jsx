import { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Loader2, Save, Trash2 } from 'lucide-react';
import { paymentGatewayApi } from '../../api/index.js';

const TRUST = {
  SIGNED: 'Results are signed by the gateway',
  CONFIRMED_WITH_GATEWAY: 'Results are confirmed with the gateway',
  UNVERIFIED: 'Results are unsigned: confirm each payment in the gateway’s portal',
};
const rowBtn = { width: 'auto', height: 30, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6 };
const STATUS_CLASS = { PAID: 'st-active', FAILED: 'st-suspended', UNVERIFIED: 'st-pending', PENDING: 'st-pending', CREATED: 'st-pending' };

/** Connect the hotel's own merchant account so guests can pay deposits online. */
export default function PaymentGatewaysPanel({ hotelId }) {
  const [catalog, setCatalog] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [editing, setEditing] = useState('');
  const [form, setForm] = useState({ settings: {}, testMode: false, active: true });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    paymentGatewayApi.accounts(hotelId).then(r => setAccounts(r.data.data || [])).catch(() => {});
    paymentGatewayApi.transactions(hotelId).then(r => setPayments(r.data.data || [])).catch(() => {});
  };
  useEffect(() => {
    if (!hotelId) return;
    paymentGatewayApi.gateways().then(r => setCatalog(r.data.data || [])).catch(() => {});
    load();
  }, [hotelId]);

  const info = catalog.find(g => g.gateway === editing);
  const account = accounts.find(a => a.gateway === editing);

  const edit = (gateway) => {
    const a = accounts.find(x => x.gateway === gateway);
    setEditing(gateway);
    setMessage('');
    setForm({ settings: { ...(a?.settings || {}) }, testMode: a ? a.testMode : true, active: a ? a.active : true });
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await paymentGatewayApi.saveAccount(hotelId, editing, form);
      setMessage('Saved. Guests can now pay online through this gateway.');
      load();
    } catch (err) { setMessage(err?.response?.data?.message || 'Could not save these settings'); }
    finally { setBusy(false); }
  };

  const act = (fn, done) => fn().then(() => { load(); if (done) done(); }).catch(err => setMessage(err?.response?.data?.message || 'That didn’t work'));

  return (
    <div className="booking-settings-section">
      <div className="booking-section-title"><div><h3>Online payment gateway</h3><p>Connect your own merchant account. Money goes straight to you; AviQR never sees card numbers.</p></div></div>
      {accounts.length > 0 && (
        <table className="admin-table" style={{ marginBottom: 12 }}>
          <thead><tr><th>Gateway</th><th>Mode</th><th>Status</th><th></th></tr></thead>
          <tbody>{accounts.map(a => (
            <tr key={a.gateway}>
              <td className="admin-td-shop">{a.label}{a.preferred && <span className="status-pill st-active" style={{ marginLeft: 8 }}>Used at checkout</span>}</td>
              <td>{a.testMode ? 'Test' : 'Live'}</td>
              <td><span className={a.active ? 'status-pill st-active' : 'status-pill st-suspended'}>{a.active ? 'On' : 'Off'}</span></td>
              <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" className="admin-row-btn" style={rowBtn} onClick={() => edit(a.gateway)}>Edit</button>
                {!a.preferred && a.active && <button type="button" className="admin-row-btn" style={rowBtn} onClick={() => act(() => paymentGatewayApi.prefer(hotelId, a.gateway))}>Use at checkout</button>}
                <button type="button" className="admin-row-btn" style={rowBtn} aria-label={`Remove ${a.label}`} onClick={() => window.confirm(`Remove ${a.label}? Guests won't be able to pay through it.`) && act(() => paymentGatewayApi.removeAccount(hotelId, a.gateway), () => setEditing(''))}><Trash2 size={13} /></button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
      <div className="form-field" style={{ maxWidth: 360 }}>
        <label className="form-label" htmlFor="pg-choose">{accounts.length ? 'Add or edit a gateway' : 'Choose your gateway'}</label>
        <select id="pg-choose" className="form-input" value={editing} onChange={e => edit(e.target.value)}>
          <option value="">Select a payment gateway…</option>
          {catalog.filter(g => !g.unsupportedReason).map(g => <option key={g.gateway} value={g.gateway}>{g.label}</option>)}
        </select>
      </div>
      {info && (
        <form onSubmit={save} style={{ marginTop: 14 }}>
          <p style={{ fontSize: 12.5, color: 'var(--gray-500)', margin: '0 0 10px' }}><CreditCard size={13} style={{ verticalAlign: -2 }} /> {TRUST[info.verification]}</p>
          <div className="booking-form-grid">
            {info.fields.map(f => (
              <div key={f.key} className="form-field">
                <label className="form-label" htmlFor={`pg-${f.key}`}>{f.label}{!f.required && <span className="booking-optional"> Optional</span>}</label>
                {f.help && f.help.includes('base64') ? (
                  <textarea id={`pg-${f.key}`} className="form-input" rows={3} value={form.settings[f.key] || ''} placeholder={account?.secretsSet?.includes(f.key) ? 'Saved; paste to replace' : ''}
                    onChange={e => setForm(v => ({ ...v, settings: { ...v.settings, [f.key]: e.target.value } }))} />
                ) : (
                  <input id={`pg-${f.key}`} className="form-input" type={f.secret ? 'password' : 'text'} autoComplete="off"
                    value={form.settings[f.key] ?? ''} placeholder={f.secret && account?.secretsSet?.includes(f.key) ? '•••••••• saved' : (f.defaultValue || '')}
                    onChange={e => setForm(v => ({ ...v, settings: { ...v.settings, [f.key]: e.target.value } }))} />
                )}
                {f.help && <small>{f.help}</small>}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: 6, fontSize: 13 }}><input type="checkbox" checked={form.testMode} onChange={e => setForm(v => ({ ...v, testMode: e.target.checked }))} /> Test / sandbox mode</label>
            <label style={{ display: 'flex', gap: 6, fontSize: 13 }}><input type="checkbox" checked={form.active} onChange={e => setForm(v => ({ ...v, active: e.target.checked }))} /> Turned on</label>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? <><Loader2 size={14} className="booking-spin" /> Saving…</> : <><Save size={14} /> Save gateway</>}</button>
          </div>
        </form>
      )}
      {message && <div className={`booking-save-message ${message.startsWith('Saved') ? 'success' : 'error'}`} role="status">{message.startsWith('Saved') && <CheckCircle2 size={16} />} {message}</div>}
      {payments.length > 0 && (
        <>
          <h3 className="booking-subheading">Recent online payments</h3>
          <table className="admin-table">
            <thead><tr><th>Date</th><th>Reference</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>{payments.slice(0, 20).map(p => (
              <tr key={p.id}>
                <td>{p.createdAt ? new Date(p.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                <td style={{ fontFamily: 'monospace' }}>{p.reference}</td>
                <td>{Number(p.amount).toLocaleString('en-IN', { style: 'currency', currency: p.currency || 'INR' })}</td>
                <td><span className={`status-pill ${STATUS_CLASS[p.status] || ''}`} title={p.message || ''}>{p.status === 'UNVERIFIED' ? 'Check portal' : p.status}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>{p.status === 'UNVERIFIED' && <>
                  <button type="button" className="admin-row-btn" style={rowBtn} onClick={() => act(() => paymentGatewayApi.resolve(p.id, true))}>Received</button>
                  <button type="button" className="admin-row-btn" style={rowBtn} onClick={() => act(() => paymentGatewayApi.resolve(p.id, false))}>Not received</button></>}</td>
              </tr>
            ))}</tbody>
          </table>
        </>
      )}
    </div>
  );
}
