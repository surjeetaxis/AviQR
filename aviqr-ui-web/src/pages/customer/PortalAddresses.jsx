import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addressApi } from '../../api/index.js';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';
import { ArrowLeft, MapPin, Pencil, Trash2, Plus, X, Star } from 'lucide-react';
import '../customer/CustomerMenu.css';

const LABELS = ['Home', 'Work', 'Other'];
const EMPTY_FORM = { label: 'Home', line1: '', line2: '', city: '', state: '', pincode: '', phone: '', isDefault: false };

export default function PortalAddresses() {
  const navigate = useNavigate();
  const { authHeader } = useCustomerAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    addressApi.list(authHeader)
      .then(res => setAddresses(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => { setEditId(null); setForm(EMPTY_FORM); setError(''); setShowForm(true); };
  const openEdit = (addr) => {
    setEditId(addr.id);
    setForm({
      label: addr.label || 'Home', line1: addr.line1 || '', line2: addr.line2 || '',
      city: addr.city || '', state: addr.state || '', pincode: addr.pincode || '',
      phone: addr.phone || '', isDefault: !!addr.isDefault,
    });
    setError(''); setShowForm(true);
  };

  const remove = (id) => {
    addressApi.remove(id, authHeader).then(load).catch(() => {});
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.line1.trim()) { setError('Address line is required'); return; }
    setError(''); setSaving(true);
    try {
      if (editId) await addressApi.update(editId, form, authHeader);
      else await addressApi.create(form, authHeader);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save address');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={sx.header}>
        <button style={sx.backBtn} onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
        <h1 style={sx.title}>Saved Addresses</h1>
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <p style={sx.emptyHint}>Loading…</p>
        ) : addresses.length === 0 ? (
          <div style={sx.emptyState}>
            <MapPin size={26} color="#9CA3AF" />
            <p style={sx.emptyHint}>No saved addresses yet.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {addresses.map(a => (
              <div key={a.id} style={sx.card}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <span style={sx.labelBadge}>{a.label}</span>
                    {(a.isDefault) && <span style={sx.defaultBadge}><Star size={10} fill="#D97706" stroke="#D97706" /> Default</span>}
                  </div>
                  <div style={{ fontSize:13.5, color:'#374151' }}>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</div>
                  <div style={{ fontSize:12.5, color:'#6B7280' }}>
                    {[a.city, a.state, a.pincode].filter(Boolean).join(', ')}
                  </div>
                  {a.phone && <div style={{ fontSize:12.5, color:'#9CA3AF', marginTop:2 }}>{a.phone}</div>}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <button style={sx.iconBtn} onClick={() => openEdit(a)} aria-label="Edit"><Pencil size={14} color="#6B7280" /></button>
                  <button style={sx.iconBtn} onClick={() => remove(a.id)} aria-label="Delete"><Trash2 size={14} color="#DC2626" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button style={sx.addBtn} onClick={openAdd}><Plus size={16} /> Add new address</button>
      </div>

      {showForm && (
        <div className="cm-backdrop" onClick={() => setShowForm(false)}>
          <div className="cm-sheet" onClick={e => e.stopPropagation()}>
            <div className="cm-sheet-handle" />
            <div className="cm-sheet-header">
              <h2 className="cm-sheet-title">{editId ? 'Edit Address' : 'Add Address'}</h2>
              <button className="cm-sheet-close" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form className="cm-checkout-form" onSubmit={submit}>
              <div className="cm-type-row">
                {LABELS.map(l => (
                  <button type="button" key={l} className={`cm-type-btn ${form.label === l ? 'active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, label: l }))}>{l}</button>
                ))}
              </div>
              <div className="cm-field">
                <label>Address line 1</label>
                <input type="text" value={form.line1} onChange={e => setForm(f => ({ ...f, line1: e.target.value }))} autoFocus />
              </div>
              <div className="cm-field">
                <label>Address line 2 (optional)</label>
                <input type="text" value={form.line2} onChange={e => setForm(f => ({ ...f, line2: e.target.value }))} />
              </div>
              <div className="cm-field">
                <label>City</label>
                <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="cm-field">
                <label>State</label>
                <input type="text" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
              </div>
              <div className="cm-field">
                <label>Pincode</label>
                <input inputMode="numeric" value={form.pincode}
                  onChange={e => setForm(f => ({ ...f, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} />
              </div>
              <div className="cm-field">
                <label>Contact phone (optional)</label>
                <input type="tel" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#374151' }}>
                <input type="checkbox" checked={form.isDefault}
                  onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
                Set as default address
              </label>
              {error && <div style={{color:'#DC2626',fontSize:12.5,marginBottom:8}}>{error}</div>}
              <button className="cm-proceed-btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save address'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const sx = {
  header: { display:'flex', alignItems:'center', gap:10, padding:'0 16px', marginBottom:14 },
  backBtn: { background:'#F9FAFB', border:'1px solid #F0F0F0', borderRadius:10, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' },
  title: { fontSize:17, fontWeight:800, margin:0 },
  emptyHint: { fontSize:12.5, color:'#9CA3AF', margin:0 },
  emptyState: { display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'40px 0' },
  card: { display:'flex', gap:10, background:'#fff', border:'1px solid #F0F0F0', borderRadius:14, padding:'14px 16px' },
  labelBadge: { fontSize:11, fontWeight:700, color:'#065F46', background:'#E6F7F0', borderRadius:6, padding:'2px 8px' },
  defaultBadge: { display:'flex', alignItems:'center', gap:3, fontSize:11, fontWeight:700, color:'#D97706' },
  iconBtn: { background:'#F9FAFB', border:'1px solid #F0F0F0', borderRadius:8, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' },
  addBtn: { display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', marginTop:14, marginBottom:24, padding:'12px', background:'#fff', border:'1.5px dashed #D1D5DB', borderRadius:12, color:'#1D9E75', fontWeight:700, fontSize:13.5, cursor:'pointer' },
};
