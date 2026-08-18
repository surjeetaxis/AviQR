import { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, Plus, Upload, Mail, Send, Edit2, X,
  Building2, TrendingUp, UserCheck, Ban,
} from 'lucide-react';
import { leadApi } from '../../api/index.js';

// Internal sales-lead CRM — AviQR staff working prospective restaurant/hotel/
// mall owners, distinct from a shop's own customer CRM (Loyalty.jsx/Campaigns.jsx
// manage a shop's diners, not AviQR's own prospects). Every email here is a
// manually-written draft that a staff member explicitly sends — nothing here
// auto-contacts anyone. See LeadController (support-service) for enforcement.
const STATUS_COLOR = {
  NEW: 'blue', CONTACTED: 'amber', RESPONDED: 'purple',
  CONVERTED: 'green', DECLINED: 'gray', DO_NOT_CONTACT: 'red',
};
const STATUSES = ['NEW', 'CONTACTED', 'RESPONDED', 'CONVERTED', 'DECLINED', 'DO_NOT_CONTACT'];
const EMPTY_FORM = { businessName: '', contactName: '', phone: '', email: '', city: '', consentBasis: '', notes: '' };
const CSV_COLUMNS = ['businessName', 'contactName', 'phone', 'email', 'city', 'consentBasis', 'notes'];

function parseCsv(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ['Paste a header row plus at least one data row.'] };
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const idx = Object.fromEntries(CSV_COLUMNS.map(c => [c, header.indexOf(c.toLowerCase())]));
  const errors = [];
  const rows = [];
  lines.slice(1).forEach((line, i) => {
    const cells = line.split(',').map(c => c.trim());
    const row = Object.fromEntries(CSV_COLUMNS.map(c => [c, idx[c] >= 0 ? (cells[idx[c]] || '') : '']));
    if (!row.businessName) { errors.push(`Row ${i + 2}: missing businessName`); return; }
    if (!row.consentBasis) { errors.push(`Row ${i + 2}: missing consentBasis — every lead needs a documented reason AviQR may contact them`); return; }
    rows.push(row);
  });
  return { rows, errors };
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('all');

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState(null); // { rows, errors }
  const [importing, setImporting] = useState(false);

  const [detailLead, setDetailLead] = useState(null);
  const [emails, setEmails] = useState([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [draftForm, setDraftForm] = useState({ subject: '', body: '' });
  const [editingEmailId, setEditingEmailId] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await leadApi.list({ q: search || undefined, status: statusF !== 'all' ? statusF : undefined, size: 100 });
      const d = res.data?.data;
      setLeads(Array.isArray(d) ? d : d?.content || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load leads. Check backend connection.');
    } finally { setLoading(false); }
  }, [search, statusF]);

  const loadStats = useCallback(async () => {
    try { setStats((await leadApi.getStats()).data?.data || {}); } catch { /* stats are best-effort */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);

  // ── Add lead ───────────────────────────────────────────────────────────────
  const submitAdd = async () => {
    if (!addForm.businessName.trim() || !addForm.consentBasis.trim()) return;
    setSaving(true);
    try {
      await leadApi.create(addForm);
      setAddOpen(false); setAddForm(EMPTY_FORM);
      load(); loadStats();
    } catch (e) { alert(e.response?.data?.message || 'Could not save lead'); }
    finally { setSaving(false); }
  };

  // ── CSV import ─────────────────────────────────────────────────────────────
  const handleParse = () => setImportResult(parseCsv(importText));
  const submitImport = async () => {
    if (!importResult?.rows?.length) return;
    setImporting(true);
    try {
      await leadApi.import(importResult.rows);
      setImportOpen(false); setImportText(''); setImportResult(null);
      load(); loadStats();
    } catch (e) { alert(e.response?.data?.message || 'Import failed'); }
    finally { setImporting(false); }
  };

  // ── Detail + emails ────────────────────────────────────────────────────────
  const openDetail = async (lead) => {
    setDetailLead(lead); setEmails([]); setDraftForm({ subject: '', body: '' }); setEditingEmailId(null);
    setEmailsLoading(true);
    try { setEmails((await leadApi.listEmails(lead.id)).data?.data || []); }
    catch { /* leave list empty */ }
    finally { setEmailsLoading(false); }
  };

  const changeStatus = async (status) => {
    try {
      const res = await leadApi.updateStatus(detailLead.id, status);
      const updated = res.data?.data;
      setDetailLead(updated);
      setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
      loadStats();
    } catch (e) { alert(e.response?.data?.message || 'Could not update status'); }
  };

  const startEditDraft = (email) => { setEditingEmailId(email.id); setDraftForm({ subject: email.subject, body: email.body }); };
  const cancelDraftEdit = () => { setEditingEmailId(null); setDraftForm({ subject: '', body: '' }); };

  const submitDraft = async () => {
    if (!draftForm.subject.trim() || !draftForm.body.trim()) return;
    setSavingDraft(true);
    try {
      if (editingEmailId) await leadApi.editDraft(detailLead.id, editingEmailId, draftForm);
      else await leadApi.draftEmail(detailLead.id, draftForm);
      setEmails((await leadApi.listEmails(detailLead.id)).data?.data || []);
      cancelDraftEdit();
    } catch (e) { alert(e.response?.data?.message || 'Could not save draft'); }
    finally { setSavingDraft(false); }
  };

  const sendEmail = async (email) => {
    if (!window.confirm(`Send this email to ${detailLead.email}? This cannot be undone.`)) return;
    setSendingId(email.id);
    try {
      await leadApi.sendEmail(detailLead.id, email.id);
      const [freshEmails, freshLead] = await Promise.all([
        leadApi.listEmails(detailLead.id),
        leadApi.getById(detailLead.id),
      ]);
      setEmails(freshEmails.data?.data || []);
      setDetailLead(freshLead.data?.data);
      setLeads(prev => prev.map(l => l.id === detailLead.id ? freshLead.data?.data : l));
      loadStats();
    } catch (e) { alert(e.response?.data?.message || 'Send failed'); }
    finally { setSendingId(null); }
  };

  const KPIS = [
    { label: 'New',       value: stats.new || 0,       icon: Building2,  color: '#2563EB', bg: '#DBEAFE' },
    { label: 'Contacted', value: stats.contacted || 0, icon: Mail,       color: '#D97706', bg: '#FEF3C7' },
    { label: 'Converted', value: stats.converted || 0, icon: UserCheck,  color: '#059669', bg: '#DCFCE7' },
    { label: 'Declined / DNC', value: (stats.declined || 0) + (stats.do_not_contact || 0), icon: Ban, color: '#DC2626', bg: '#FEE2E2' },
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Leads</h1><p className="page-subtitle">Prospective restaurant/hotel/mall owners — outreach requires a documented consent basis and a manual send.</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setImportOpen(true)}><Upload size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Import CSV</button>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Add lead</button>
        </div>
      </div>

      <div className="admin-kpi-grid" style={{ marginBottom: 16 }}>
        {KPIS.map(k => (
          <div key={k.label} className="admin-kpi-card" style={{ textAlign: 'left' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <k.icon size={17} color={k.color} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-900)' }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="demo-notice" style={{ background: 'var(--red-bg)', borderColor: '#FCA5A5', color: 'var(--red)', marginBottom: 12 }}>
          ⚠ {error} <button onClick={load} style={{ fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      <div className="admin-filter-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="admin-filter-input" style={{ paddingLeft: 32, width: '100%' }} placeholder="Search business or city…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="admin-filter-select" value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="all">All status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <button className="btn-refresh" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--gray-400)' }}>Loading leads…</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead><tr><th>Business</th><th>Contact</th><th>City</th><th>Status</th><th>Last contacted</th><th></th></tr></thead>
            <tbody>
              {leads.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray-400)' }}>No leads found</td></tr>
              )}
              {leads.map(l => (
                <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(l)}>
                  <td style={{ fontWeight: 700, fontSize: 13.5 }}>{l.businessName}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--gray-700)' }}>{l.contactName || '—'}<div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{l.email || l.phone || ''}</div></td>
                  <td style={{ fontSize: 12.5, color: 'var(--gray-600)' }}>{l.city || '—'}</td>
                  <td><span className={`role-badge-sm role-${STATUS_COLOR[l.status] || 'gray'}`}>{l.status.replace(/_/g, ' ')}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{l.lastContactedAt ? new Date(l.lastContactedAt).toLocaleDateString('en-IN') : 'Never'}</td>
                  <td><button className="admin-row-btn" title="Open" onClick={e => { e.stopPropagation(); openDetail(l); }}><Mail size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add lead modal ── */}
      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Add lead</h2><button className="modal-close" onClick={() => setAddOpen(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row-2">
                <div className="form-field"><label className="form-label">Business name *</label>
                  <input className="form-input" value={addForm.businessName} onChange={e => setAddForm(f => ({ ...f, businessName: e.target.value }))} /></div>
                <div className="form-field"><label className="form-label">Contact name</label>
                  <input className="form-input" value={addForm.contactName} onChange={e => setAddForm(f => ({ ...f, contactName: e.target.value }))} /></div>
              </div>
              <div className="form-row-2">
                <div className="form-field"><label className="form-label">Email</label>
                  <input className="form-input" type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div className="form-field"><label className="form-label">Phone</label>
                  <input className="form-input" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <div className="form-field"><label className="form-label">City</label>
                <input className="form-input" value={addForm.city} onChange={e => setAddForm(f => ({ ...f, city: e.target.value }))} /></div>
              <div className="form-field">
                <label className="form-label">Consent basis * — how does AviQR have the right to contact them?</label>
                <input className="form-input" placeholder="e.g. met at NRAI trade show, referred by an existing owner" value={addForm.consentBasis} onChange={e => setAddForm(f => ({ ...f, consentBasis: e.target.value }))} />
              </div>
              <div className="form-field"><label className="form-label">Notes</label>
                <textarea className="form-input" rows={3} value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving || !addForm.businessName.trim() || !addForm.consentBasis.trim()} onClick={submitAdd}>{saving ? 'Saving…' : 'Add lead'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import CSV modal ── */}
      {importOpen && (
        <div className="modal-backdrop" onClick={() => setImportOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Import leads from CSV</h2><button className="modal-close" onClick={() => setImportOpen(false)}>✕</button></div>
            <div className="modal-body">
              <p style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>
                Paste CSV with a header row. Required columns: <code>businessName</code>, <code>consentBasis</code>. Optional: <code>contactName, phone, email, city, notes</code>.
              </p>
              <textarea className="form-input" rows={8} style={{ fontFamily: 'monospace', fontSize: 12 }}
                placeholder={'businessName,contactName,phone,email,city,consentBasis,notes\nSpice Garden,Ravi Kumar,9900000000,ravi@example.com,Bengaluru,Met at NRAI 2026 trade show,'}
                value={importText} onChange={e => { setImportText(e.target.value); setImportResult(null); }} />
              <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={handleParse} disabled={!importText.trim()}>Preview</button>
              {importResult && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: importResult.rows.length ? 'var(--green-darker)' : 'var(--red)' }}>
                    {importResult.rows.length} row(s) ready to import
                  </div>
                  {importResult.errors.length > 0 && (
                    <ul style={{ fontSize: 12, color: 'var(--red)', marginTop: 6, paddingLeft: 18 }}>
                      {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setImportOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={importing || !importResult?.rows?.length} onClick={submitImport}>{importing ? 'Importing…' : `Import ${importResult?.rows?.length || ''} lead(s)`}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lead detail + email drawer ── */}
      {detailLead && (
        <div className="modal-backdrop" onClick={() => setDetailLead(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{detailLead.businessName}</h2>
              <button className="modal-close" onClick={() => setDetailLead(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-section-title">Lead info</div>
              <div style={{ fontSize: 12.5, color: 'var(--gray-600)', lineHeight: 1.7 }}>
                {detailLead.contactName && <div><strong>Contact:</strong> {detailLead.contactName}</div>}
                {detailLead.email && <div><strong>Email:</strong> {detailLead.email}</div>}
                {detailLead.phone && <div><strong>Phone:</strong> {detailLead.phone}</div>}
                {detailLead.city && <div><strong>City:</strong> {detailLead.city}</div>}
                <div><strong>Consent basis:</strong> {detailLead.consentBasis}</div>
                {detailLead.notes && <div><strong>Notes:</strong> {detailLead.notes}</div>}
              </div>

              <div className="modal-section-title" style={{ marginTop: 14 }}>Status</div>
              <select className="form-input" value={detailLead.status} onChange={e => changeStatus(e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>

              <div className="modal-section-title" style={{ marginTop: 16 }}>Emails</div>
              {emailsLoading ? (
                <div style={{ fontSize: 12.5, color: 'var(--gray-400)' }}>Loading…</div>
              ) : emails.length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--gray-400)' }}>No drafts yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {emails.map(em => (
                    <div key={em.id} className="modal-list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: 13 }}>{em.subject}</strong>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {em.autoGenerated && em.status === 'DRAFT' && (
                            <span className="role-badge-sm role-purple" title="Auto-drafted by the follow-up scheduler — review before sending">Suggested follow-up</span>
                          )}
                          <span className={`role-badge-sm role-${em.status === 'SENT' ? 'green' : 'amber'}`}>{em.status}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--gray-500)', whiteSpace: 'pre-wrap' }}>{em.body.slice(0, 160)}{em.body.length > 160 ? '…' : ''}</div>
                      {em.status === 'DRAFT' && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <button className="admin-row-btn" title="Edit" onClick={() => startEditDraft(em)}><Edit2 size={12} /></button>
                          <button className="btn btn-primary" style={{ height: 26, padding: '0 10px', fontSize: 11.5 }} disabled={sendingId === em.id} onClick={() => sendEmail(em)}>
                            <Send size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{sendingId === em.id ? 'Sending…' : 'Send'}
                          </button>
                        </div>
                      )}
                      {em.status === 'SENT' && em.sentAt && (
                        <div style={{ fontSize: 10.5, color: 'var(--gray-400)' }}>Sent {new Date(em.sentAt).toLocaleString('en-IN')}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-section-title" style={{ marginTop: 16 }}>{editingEmailId ? 'Edit draft' : 'New draft'}</div>
              {detailLead.status === 'DO_NOT_CONTACT' ? (
                <div style={{ fontSize: 12.5, color: 'var(--red)' }}>This lead is marked Do Not Contact — no new drafts can be created.</div>
              ) : !detailLead.email ? (
                <div style={{ fontSize: 12.5, color: 'var(--gray-400)' }}>Add an email address to this lead before drafting.</div>
              ) : (
                <>
                  <div className="form-field"><label className="form-label">Subject</label>
                    <input className="form-input" value={draftForm.subject} onChange={e => setDraftForm(f => ({ ...f, subject: e.target.value }))} /></div>
                  <div className="form-field"><label className="form-label">Body</label>
                    <textarea className="form-input" rows={6} value={draftForm.body} onChange={e => setDraftForm(f => ({ ...f, body: e.target.value }))} /></div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 8 }}>An unsubscribe link and AviQR's sender identity are appended automatically before sending.</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {editingEmailId && <button className="btn btn-secondary" onClick={cancelDraftEdit}><X size={13} style={{ verticalAlign: -2 }} /> Cancel edit</button>}
                    <button className="btn btn-primary" disabled={savingDraft || !draftForm.subject.trim() || !draftForm.body.trim()} onClick={submitDraft}>
                      {savingDraft ? 'Saving…' : editingEmailId ? 'Save changes' : 'Save draft'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
