import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, RefreshCw, Send, Pause, Play, Trash2, Clock, Users, Cake, Heart, Tag } from 'lucide-react';
import { useActiveShopId } from '../hooks/useActiveShopId.js';
import { campaignApi, customerApi } from '../api/index.js';

const AUDIENCE_META = {
  ALL:               { label: 'All customers',        icon: Users },
  LABEL:             { label: 'By label',              icon: Tag },
  BIRTHDAY_TODAY:    { label: 'Birthday (recurring)',   icon: Cake },
  ANNIVERSARY_TODAY: { label: 'Anniversary (recurring)',icon: Heart },
};

const STATUS_COLORS = {
  DRAFT:     { bg:'#F3F4F6', color:'#6B7280' },
  SCHEDULED: { bg:'#EFF6FF', color:'#2563EB' },
  ACTIVE:    { bg:'#E1F5EE', color:'#1D9E75' },
  SENT:      { bg:'#F5F3FF', color:'#7C3AED' },
  PAUSED:    { bg:'#FFFBEB', color:'#D97706' },
};

const emptyForm = { name:'', messageTemplate:'', audienceType:'ALL', audienceLabel:'', scheduledAt:'' };

export default function Campaigns() {
  const shopId = useActiveShopId();

  const [campaigns, setCampaigns] = useState([]);
  const [labels,    setLabels]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [modal,     setModal]     = useState(null); // 'new' | 'logs'
  const [selCampaign, setSelCampaign] = useState(null);
  const [logs,      setLogs]      = useState([]);
  const [form,      setForm]      = useState(emptyForm);
  const [saving,    setSaving]    = useState(false);

  const load = useCallback(async () => {
    if (!shopId) { setLoading(false); return; }
    try {
      const [campRes, custRes] = await Promise.allSettled([
        campaignApi.list(shopId),
        customerApi.list(shopId),
      ]);
      if (campRes.status === 'fulfilled') setCampaigns(campRes.value.data.data || []);
      else setError(campRes.reason?.response?.data?.message || 'Failed to load campaigns');
      if (custRes.status === 'fulfilled') {
        const all = new Set();
        (custRes.value.data.data || []).forEach(c => (c.labels || []).forEach(l => all.add(l)));
        setLabels([...all]);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load');
    } finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(emptyForm); setModal('new'); };

  const submitNew = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isRecurring = form.audienceType === 'BIRTHDAY_TODAY' || form.audienceType === 'ANNIVERSARY_TODAY';
      await campaignApi.create(shopId, {
        name: form.name,
        messageTemplate: form.messageTemplate,
        audienceType: form.audienceType,
        audienceLabel: form.audienceType === 'LABEL' ? form.audienceLabel : null,
        scheduledAt: !isRecurring && form.scheduledAt ? form.scheduledAt : null,
      });
      setModal(null);
      load();
    } catch (e) { alert(e.response?.data?.message || 'Failed to create campaign'); }
    finally { setSaving(false); }
  };

  const sendNow = async (c) => {
    if (!confirm(`Send "${c.name}" now?`)) return;
    try { await campaignApi.sendNow(shopId, c.id); load(); }
    catch (e) { alert(e.response?.data?.message || 'Failed to send'); }
  };

  const togglePause = async (c) => {
    try {
      if (c.status === 'PAUSED') await campaignApi.resume(shopId, c.id);
      else await campaignApi.pause(shopId, c.id);
      load();
    } catch (e) { alert(e.response?.data?.message || 'Failed to update campaign'); }
  };

  const remove = async (c) => {
    if (!confirm(`Delete campaign "${c.name}"? This can't be undone.`)) return;
    try { await campaignApi.remove(shopId, c.id); load(); }
    catch (e) { alert(e.response?.data?.message || 'Failed to delete'); }
  };

  const openLogs = async (c) => {
    setSelCampaign(c);
    setModal('logs');
    setLogs([]);
    try {
      const res = await campaignApi.logs(shopId, c.id);
      setLogs(res.data.data || []);
    } catch {}
  };

  const isRecurringType = form.audienceType === 'BIRTHDAY_TODAY' || form.audienceType === 'ANNIVERSARY_TODAY';

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:300, flexDirection:'column', gap:10 }}>
      <div className="spinner" />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinner{width:28px;height:28px;border:3px solid var(--green);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}`}</style>
    </div>
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1 className="page-title">SMS Campaigns</h1><p className="page-subtitle">Birthday wishes, offers, and broadcasts to your customer segments.</p></div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> New campaign</button>
        </div>
      </div>

      {error && <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#92400E', marginBottom:14 }}>⚠ {error}</div>}

      {campaigns.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'48px 0', color:'var(--gray-400)' }}>
          <MessageSquare size={32} style={{ opacity:.3, display:'block', margin:'0 auto 10px' }} />
          <p style={{ fontSize:14, fontWeight:500 }}>No campaigns yet</p>
          <p style={{ fontSize:12, marginTop:4 }}>Create a birthday-wish or segment broadcast campaign to bring customers back.</p>
          <button className="btn btn-primary" style={{ marginTop:16 }} onClick={openNew}>Create first campaign</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {campaigns.map(c => {
            const meta = AUDIENCE_META[c.audienceType] || AUDIENCE_META.ALL;
            const Icon = meta.icon;
            const sc = STATUS_COLORS[c.status] || STATUS_COLORS.DRAFT;
            return (
              <div key={c.id} className="card" style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:sc.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={17} color={sc.color} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:14, fontWeight:700 }}>{c.name}</span>
                    <span style={{ fontSize:10.5, fontWeight:700, color:sc.color, background:sc.bg, padding:'2px 8px', borderRadius:999 }}>{c.status}</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2, display:'flex', gap:12, flexWrap:'wrap' }}>
                    <span>{meta.label}{c.audienceType === 'LABEL' && c.audienceLabel ? `: ${c.audienceLabel}` : ''}</span>
                    <span>{c.sentCount || 0} sent{c.failedCount ? `, ${c.failedCount} failed` : ''}</span>
                    {c.scheduledAt && <span><Clock size={10} /> {new Date(c.scheduledAt).toLocaleString('en-IN')}</span>}
                    {c.lastRunAt && <span>Last run: {new Date(c.lastRunAt).toLocaleDateString('en-IN')}</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                    <button style={btnSm('#E1F5EE', '#065F46')} onClick={() => sendNow(c)}><Send size={11} /> Send now</button>
                  )}
                  {(c.status === 'ACTIVE' || c.status === 'PAUSED') && (
                    <button style={btnSm(c.status === 'PAUSED' ? '#E1F5EE' : '#FFFBEB', c.status === 'PAUSED' ? '#065F46' : '#D97706')} onClick={() => togglePause(c)}>
                      {c.status === 'PAUSED' ? <><Play size={11} /> Resume</> : <><Pause size={11} /> Pause</>}
                    </button>
                  )}
                  <button style={btnSm('#F5F3FF', '#7C3AED')} onClick={() => openLogs(c)}>Log</button>
                  <button style={btnSm('#FEF2F2', '#DC2626')} onClick={() => remove(c)}><Trash2 size={11} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New campaign modal */}
      {modal === 'new' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <form style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:460 }} onSubmit={submitNew}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>📣 New Campaign</h2>
            <div className="field" style={{ marginBottom:14 }}>
              <label className="field-label">Campaign name *</label>
              <input className="field-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Diwali offer blast" required />
            </div>
            <div className="field" style={{ marginBottom:14 }}>
              <label className="field-label">Message *</label>
              <textarea className="field-input" rows={3} value={form.messageTemplate}
                onChange={e => setForm(f => ({ ...f, messageTemplate: e.target.value }))}
                placeholder="Hi {name}, enjoy 20% off this weekend at our restaurant!" required />
              <p style={{ fontSize:11, color:'var(--gray-400)', marginTop:4 }}>Use <code>{'{name}'}</code> to personalize with the customer's name.</p>
            </div>
            <div className="field" style={{ marginBottom:14 }}>
              <label className="field-label">Audience *</label>
              <select className="field-input" value={form.audienceType}
                onChange={e => setForm(f => ({ ...f, audienceType: e.target.value, scheduledAt: '' }))}>
                {Object.entries(AUDIENCE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select>
            </div>
            {form.audienceType === 'LABEL' && (
              <div className="field" style={{ marginBottom:14 }}>
                <label className="field-label">Label *</label>
                {labels.length === 0 ? (
                  <p style={{ fontSize:12, color:'var(--gray-400)' }}>No customer labels yet — add labels from the Loyalty &amp; CRM page first.</p>
                ) : (
                  <select className="field-input" value={form.audienceLabel} onChange={e => setForm(f => ({ ...f, audienceLabel: e.target.value }))} required>
                    <option value="">Select a label…</option>
                    {labels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                )}
              </div>
            )}
            {!isRecurringType && (
              <div className="field" style={{ marginBottom:20 }}>
                <label className="field-label">Schedule (optional)</label>
                <input className="field-input" type="datetime-local" value={form.scheduledAt}
                  onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
                <p style={{ fontSize:11, color:'var(--gray-400)', marginTop:4 }}>Leave blank to save as a draft you can send manually.</p>
              </div>
            )}
            {isRecurringType && (
              <p style={{ fontSize:11.5, color:'#1D9E75', background:'#E1F5EE', borderRadius:8, padding:'8px 12px', marginBottom:20 }}>
                This campaign runs automatically every day for customers whose {form.audienceType === 'BIRTHDAY_TODAY' ? 'birthday' : 'anniversary'} is today.
              </p>
            )}
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" className="btn btn-secondary" style={{ flex:1 }} onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex:1 }} disabled={saving || !form.name || !form.messageTemplate || (form.audienceType === 'LABEL' && !form.audienceLabel)}>
                {saving ? 'Creating…' : 'Create campaign'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delivery log modal */}
      {modal === 'logs' && selCampaign && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:480, maxHeight:'80vh', overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 22px', borderBottom:'1px solid var(--gray-100)' }}>
              <div>
                <h3 style={{ fontSize:16, fontWeight:700 }}>{selCampaign.name}</h3>
                <p style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{selCampaign.sentCount || 0} sent · {selCampaign.failedCount || 0} failed</p>
              </div>
              <button onClick={() => { setModal(null); setSelCampaign(null); }} style={{ background:'var(--gray-100)', border:'none', borderRadius:8, padding:'6px 10px', cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ overflowY:'auto', padding:'16px 22px', flex:1 }}>
              {logs.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)', fontSize:13 }}>No sends yet</div>
              ) : logs.map((l, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--gray-100)' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{l.customerName || 'Customer'}</div>
                    <div style={{ fontSize:11, color:'var(--gray-400)' }}>{l.customerPhone} · {l.sentAt ? new Date(l.sentAt).toLocaleString('en-IN') : ''}</div>
                    {l.errorMessage && <div style={{ fontSize:11, color:'#DC2626' }}>{l.errorMessage}</div>}
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color: l.status === 'SENT' ? '#1D9E75' : '#DC2626', background: l.status === 'SENT' ? '#E1F5EE' : '#FEF2F2', padding:'3px 10px', borderRadius:999 }}>{l.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function btnSm(bg, color) {
  return { background:bg, color, border:'none', borderRadius:6, padding:'6px 10px', cursor:'pointer', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:4 };
}
