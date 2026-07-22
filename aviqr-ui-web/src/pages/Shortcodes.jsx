import { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, X, Save, Zap, RefreshCw, Power,
} from 'lucide-react';
import { useActiveShopId } from '../hooks/useActiveShopId.js';
import { menuApi, variantApi, shortcodeApi } from '../api/index.js';

// ── Tiny toggle switch (matches MenuVariations.jsx) ─────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 38, height: 22, borderRadius: 99,
        background: checked ? '#1D9E75' : '#D1D5DB',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background .2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 19 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left .2s',
        boxShadow: '0 1px 4px rgba(0,0,0,.2)',
      }} />
    </button>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ active }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700,
      padding: '2px 8px', borderRadius: 99,
      background: active ? '#E6F7F0' : '#F3F4F6',
      color: active ? '#065F46' : '#9CA3AF',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: active ? '#1D9E75' : '#D1D5DB',
        display: 'inline-block',
      }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function Shortcodes() {
  const shopId = useActiveShopId();

  const [items,       setItems]       = useState([]);
  const [shortcodes,  setShortcodes]  = useState([]);
  const [itemVariants,setItemVariants]= useState({}); // itemId -> variants[]
  const [loading,     setLoad]        = useState(true);
  const [modal,       setModal]       = useState(null); // { mode:'add'|'edit', id }
  const [form,        setForm]        = useState({ code:'', menuItemId:'', variantId:'', active:true });
  const [saving,      setSaving]      = useState(false);
  const [togglingId,  setTogglingId]  = useState(null);

  const load = async () => {
    if (!shopId) return;
    setLoad(true);
    try {
      const [iRes, sRes] = await Promise.all([
        menuApi.getItems(shopId),
        shortcodeApi.getByShop(shopId),
      ]);
      setItems(iRes.data.data?.content ?? iRes.data.data ?? []);
      setShortcodes(sRes.data.data || []);
    } catch {}
    finally { setLoad(false); }
  };

  useEffect(() => { load(); }, [shopId]);

  const loadVariantsFor = async (itemId) => {
    if (!itemId || itemVariants[itemId]) return;
    try {
      const res = await variantApi.getVariants(itemId);
      setItemVariants(v => ({ ...v, [itemId]: res.data.data || [] }));
    } catch {}
  };

  const openAdd = () => { setForm({ code:'', menuItemId:'', variantId:'', active:true }); setModal({ mode:'add' }); };

  const openEdit = (s) => {
    setForm({ code:s.code, menuItemId:s.menuItemId, variantId:s.variantId || '', active:s.active !== false });
    if (s.menuItemId) loadVariantsFor(s.menuItemId);
    setModal({ mode:'edit', id:s.id });
  };

  const save = async () => {
    if (!form.code || !form.menuItemId) return;
    setSaving(true);
    try {
      const payload = {
        shopId,
        code:       form.code.trim().toUpperCase(),
        menuItemId: form.menuItemId,
        variantId:  form.variantId || null,
        active:     form.active,
      };
      if (modal.mode === 'edit') {
        const res = await shortcodeApi.update(modal.id, payload);
        setShortcodes(prev => prev.map(s => s.id === modal.id ? (res.data.data || { ...s, ...payload }) : s));
      } else {
        const res = await shortcodeApi.create(payload);
        setShortcodes(prev => [...prev, res.data.data]);
      }
      setModal(null);
    } catch (e) { alert('Save failed: ' + (e.response?.data?.message || e.message)); }
    finally { setSaving(false); }
  };

  const toggle = async (s) => {
    setTogglingId(s.id);
    try {
      const updated = { ...s, active: !s.active };
      await shortcodeApi.update(s.id, updated);
      setShortcodes(prev => prev.map(x => x.id === s.id ? updated : x));
    } catch (e) { alert('Toggle failed: ' + (e.response?.data?.message || e.message)); }
    finally { setTogglingId(null); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this shortcode?')) return;
    try { await shortcodeApi.delete(id); setShortcodes(prev => prev.filter(s => s.id !== id)); } catch {}
  };

  const itemName = (id) => items.find(i => i.id === id)?.name || '—';
  const variantLabel = (itemId, variantId) => {
    if (!variantId) return null;
    return itemVariants[itemId]?.find(v => v.id === variantId)?.variantName;
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:300, flexDirection:'column', gap:10 }}>
      <div className="spinner" />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinner{width:28px;height:28px;border:3px solid #1D9E75;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}`}</style>
    </div>
  );

  const selectedItemVariants = form.menuItemId ? (itemVariants[form.menuItemId] || []) : [];

  return (
    <div className="page-content">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Quick-Bill Shortcodes</h1>
          <p className="page-subtitle">Assign short codes to menu items for faster billing at the POS</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={load} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={14} /> Add shortcode
          </button>
        </div>
      </div>

      {shortcodes.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'48px 0', color:'var(--gray-400)' }}>
          <Zap size={28} style={{ opacity:.3, display:'block', margin:'0 auto 12px' }} />
          <p style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>No shortcodes yet</p>
          <p style={{ fontSize:12, marginBottom:16 }}>Create codes like "P1" or "CB" to add items to a bill instantly</p>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={14} /> Add first shortcode
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:12 }}>
          {shortcodes.map(s => (
            <ShortcodeCard
              key={s.id}
              shortcode={s}
              itemName={itemName(s.menuItemId)}
              variantLabel={variantLabel(s.menuItemId, s.variantId)}
              toggling={togglingId === s.id}
              onEdit={() => openEdit(s)}
              onToggle={() => toggle(s)}
              onDelete={() => remove(s.id)}
            />
          ))}
        </div>
      )}

      {/* ── Add / Edit modal ─────────────────────────────────────────────── */}
      {modal && (
        <div style={{
          position:'fixed', inset:0,
          background:'rgba(0,0,0,.45)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:1000, padding:16,
        }}>
          <div style={{ background:'white', borderRadius:18, padding:28, width:'100%', maxWidth:400 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
              <h2 style={{ fontSize:17, fontWeight:800 }}>
                {modal.mode === 'edit' ? 'Edit shortcode' : 'New shortcode'}
              </h2>
              <button
                onClick={() => setModal(null)}
                style={{ background:'var(--gray-100)', border:'none', borderRadius:8, padding:'5px 7px', cursor:'pointer' }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="field">
                <label className="field-label">Code *</label>
                <input
                  className="field-input"
                  placeholder="e.g. P1"
                  maxLength={10}
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code:e.target.value.toUpperCase() }))}
                  style={{ textTransform:'uppercase', fontWeight:700, letterSpacing:'.05em' }}
                />
              </div>

              <div className="field">
                <label className="field-label">Menu item *</label>
                <select
                  className="field-input"
                  value={form.menuItemId}
                  onChange={e => {
                    const itemId = e.target.value;
                    setForm(f => ({ ...f, menuItemId:itemId, variantId:'' }));
                    loadVariantsFor(itemId);
                  }}
                >
                  <option value="">Select an item…</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} — ₹{i.price}</option>)}
                </select>
              </div>

              {selectedItemVariants.length > 0 && (
                <div className="field">
                  <label className="field-label">Variant (optional)</label>
                  <select
                    className="field-input"
                    value={form.variantId}
                    onChange={e => setForm(f => ({ ...f, variantId:e.target.value }))}
                  >
                    <option value="">Base price</option>
                    {selectedItemVariants.map(v => (
                      <option key={v.id} value={v.id}>{v.variantName} — ₹{v.price}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--gray-50)', borderRadius:10 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:600 }}>Active</div>
                  <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:1 }}>Inactive shortcodes can't be used at the POS</div>
                </div>
                <Toggle checked={form.active} onChange={val => setForm(f => ({ ...f, active:val }))} />
              </div>
            </div>

            <div style={{ display:'flex', gap:10, marginTop:22 }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary" style={{ flex:1 }}
                onClick={save} disabled={saving || !form.code || !form.menuItemId}
              >
                {saving ? 'Saving…' : <><Save size={13} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shortcode card ───────────────────────────────────────────────────────────
function ShortcodeCard({ shortcode, itemName, variantLabel, toggling, onEdit, onToggle, onDelete }) {
  const isActive = shortcode.active !== false;
  return (
    <div className="card" style={{
      padding:'14px 16px',
      opacity: isActive ? 1 : 0.65,
      transition: 'opacity .2s',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
        <div style={{
          width:44, height:44, borderRadius:10, flexShrink:0,
          background:'var(--green-light)', color:'var(--green-darker)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:14, fontWeight:800, letterSpacing:'.03em',
        }}>
          {shortcode.code}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, lineHeight:1.3 }}>{itemName}</div>
          {variantLabel && <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{variantLabel}</div>}
        </div>
        <StatusPill active={isActive} />
      </div>

      <div style={{ display:'flex', gap:6, borderTop:'1px solid var(--gray-100)', paddingTop:10 }}>
        <button
          onClick={onEdit}
          style={{
            flex:1, height:32, borderRadius:8, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:5,
            fontSize:12, fontWeight:600,
            background:'var(--gray-50)', border:'1.5px solid var(--gray-200)', color:'var(--gray-700)',
          }}
          title="Edit"
        >
          <Edit2 size={12} /> Edit
        </button>

        <button
          onClick={onToggle}
          disabled={toggling}
          style={{
            flex:1, height:32, borderRadius:8, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:5,
            fontSize:12, fontWeight:600,
            background: isActive ? '#FEF3C7' : '#E6F7F0',
            border: `1.5px solid ${isActive ? '#FCD34D' : '#6EE7B7'}`,
            color: isActive ? '#92400E' : '#065F46',
            opacity: toggling ? 0.6 : 1,
          }}
          title={isActive ? 'Deactivate' : 'Activate'}
        >
          <Power size={12} />
          {toggling ? '…' : isActive ? 'Deactivate' : 'Activate'}
        </button>

        <button
          onClick={onDelete}
          style={{
            width:34, height:32, borderRadius:8, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            background:'var(--red-bg)', border:'1.5px solid var(--red-bg)', color:'var(--red)',
            flexShrink:0,
          }}
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
