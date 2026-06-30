import { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, X, Save, Tag, RefreshCw,
  ChevronDown, ChevronUp, Power, CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { menuApi, variantApi, addonApi } from '../api/index.js';

// ── Tiny toggle switch ────────────────────────────────────────────────────────
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

export default function MenuVariations() {
  const { user } = useAuth();
  const shopId = user?.shopId;

  const [menuItems, setMenu]       = useState([]);
  const [allAddons, setAddons]     = useState([]);
  const [variants,  setVariants]   = useState({});
  const [expanded,  setExpanded]   = useState({});
  const [loading,   setLoad]       = useState(true);
  const [tab,       setTab]        = useState('variants');
  const [addonModal, setAMod]      = useState(null);
  const [addonForm,  setAForm]     = useState({ name:'', price:'', veg:true, active:true });
  const [saving,    setSaving]     = useState(false);
  const [savingId,  setSavingId]   = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = async () => {
    if (!shopId) return;
    setLoad(true);
    try {
      const [iRes, aRes] = await Promise.all([
        menuApi.getItems(shopId),
        addonApi.getByShop(shopId),
      ]);
      setMenu(iRes.data.data?.content ?? iRes.data.data ?? []);
      setAddons(aRes.data.data || []);
    } catch {}
    finally { setLoad(false); }
  };

  useEffect(() => { load(); }, [shopId]);

  // ── Variant helpers ──────────────────────────────────────────────────────────
  const loadVariants = async (itemId) => {
    try {
      const res = await variantApi.getVariants(itemId);
      setVariants(v => ({ ...v, [itemId]: res.data.data || [] }));
    } catch {}
  };

  const toggleExpand = async (item) => {
    if (!expanded[item.id] && !variants[item.id]) await loadVariants(item.id);
    setExpanded(e => ({ ...e, [item.id]: !e[item.id] }));
  };

  const addVariantRow = (itemId) => {
    setVariants(v => ({
      ...v,
      [itemId]: [
        ...(v[itemId] || []),
        {
          id: `new_${Date.now()}`, variantName: '', price: '',
          isDefault: false, sortOrder: (v[itemId]||[]).length,
          active: true, _new: true,
        },
      ],
    }));
  };

  const updateVariantRow = (itemId, idx, field, value) => {
    setVariants(v => ({
      ...v,
      [itemId]: v[itemId].map((row, i) => i === idx ? { ...row, [field]: value } : row),
    }));
  };

  const removeVariantRow = (itemId, idx) => {
    setVariants(v => ({
      ...v,
      [itemId]: v[itemId].filter((_, i) => i !== idx),
    }));
  };

  const saveVariants = async (itemId) => {
    setSavingId(itemId);
    try {
      const rows = (variants[itemId] || [])
        .filter(v => v.variantName && v.price)
        .map((v, i) => ({
          variantName: v.variantName,
          price:       parseFloat(v.price),
          isDefault:   v.isDefault || false,
          sortOrder:   i,
          active:      v.active !== false,
        }));
      await variantApi.saveVariants(itemId, rows);
      await loadVariants(itemId);
    } catch (e) { alert('Save failed: ' + (e.response?.data?.message || e.message)); }
    finally { setSavingId(null); }
  };

  const deleteAllVariants = async (itemId) => {
    if (!confirm('Delete all variants for this item?')) return;
    try {
      await variantApi.deleteVariants(itemId);
      setVariants(v => ({ ...v, [itemId]: [] }));
    } catch (e) { alert('Delete failed: ' + (e.response?.data?.message || e.message)); }
  };

  // ── Add-on helpers ───────────────────────────────────────────────────────────
  const openAddAddon  = () => { setAForm({ name:'', price:'', veg:true, active:true }); setAMod({ mode:'add' }); };
  const openEditAddon = (a)  => { setAForm({ name:a.name, price:String(a.price), veg:a.veg!==false, active:a.active!==false }); setAMod({ mode:'edit', id:a.id }); };

  const saveAddon = async () => {
    if (!addonForm.name || !addonForm.price) return;
    setSaving(true);
    try {
      const payload = {
        shopId,
        name:   addonForm.name,
        price:  parseFloat(addonForm.price),
        veg:    addonForm.veg,
        active: addonForm.active,
      };
      if (addonModal.mode === 'edit') {
        const res = await addonApi.update(addonModal.id, payload);
        setAddons(prev => prev.map(a => a.id === addonModal.id ? (res.data.data || { ...a, ...payload }) : a));
      } else {
        const res = await addonApi.create(payload);
        setAddons(prev => [...prev, res.data.data]);
      }
      setAMod(null);
    } catch (e) { alert('Save failed: ' + (e.response?.data?.message || e.message)); }
    finally { setSaving(false); }
  };

  const toggleAddon = async (addon) => {
    setTogglingId(addon.id);
    try {
      const updated = { ...addon, active: !addon.active };
      await addonApi.update(addon.id, updated);
      setAddons(prev => prev.map(a => a.id === addon.id ? updated : a));
    } catch (e) { alert('Toggle failed: ' + (e.response?.data?.message || e.message)); }
    finally { setTogglingId(null); }
  };

  const deleteAddon = async (id) => {
    if (!confirm('Delete this add-on?')) return;
    try { await addonApi.delete(id); setAddons(prev => prev.filter(a => a.id !== id)); } catch {}
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:300, flexDirection:'column', gap:10 }}>
      <div className="spinner" />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinner{width:28px;height:28px;border:3px solid #1D9E75;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}`}</style>
    </div>
  );

  const activeAddons   = allAddons.filter(a => a.active !== false);
  const inactiveAddons = allAddons.filter(a => a.active === false);

  return (
    <div className="page-content">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Variations & Add-ons</h1>
          <p className="page-subtitle">Size variants, portion options, and extras</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={load} title="Refresh">
            <RefreshCw size={14} />
          </button>
          {tab === 'addons' && (
            <button className="btn btn-primary" onClick={openAddAddon}>
              <Plus size={14} /> Add add-on
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="filter-chips" style={{ marginBottom: 20 }}>
        <button className={`chip${tab==='variants'?' active':''}`} onClick={() => setTab('variants')}>
          📐 Size Variants
        </button>
        <button className={`chip${tab==='addons'?' active':''}`} onClick={() => setTab('addons')}>
          ➕ Add-ons ({allAddons.length})
        </button>
      </div>

      {/* ══════════════════ VARIANTS TAB ═══════════════════════════════════ */}
      {tab === 'variants' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {menuItems.length === 0 && (
            <div className="card" style={{ textAlign:'center', padding:'40px 0', color:'var(--gray-400)', fontSize:13 }}>
              No menu items found. Add items in the Menu page first.
            </div>
          )}

          {menuItems.map(item => {
            const itemVariants = variants[item.id] || [];
            const isSaving     = savingId === item.id;
            const isOpen       = !!expanded[item.id];
            const activeCount  = itemVariants.filter(v => v.active !== false).length;

            return (
              <div key={item.id} className="card" style={{ padding:0, overflow:'hidden' }}>
                {/* Accordion header */}
                <div
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', cursor:'pointer' }}
                  onClick={() => toggleExpand(item)}
                >
                  <span style={{
                    fontSize:10, fontWeight:700,
                    color: item.veg!==false ? '#1D9E75' : '#DC2626',
                    border: `1.5px solid ${item.veg!==false ? '#1D9E75' : '#DC2626'}`,
                    borderRadius: 2, padding:'1px 4px', flexShrink:0,
                  }}>■</span>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{item.name}</div>
                    <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>
                      Base ₹{item.price}
                      {itemVariants.length > 0
                        ? ` · ${itemVariants.length} variant${itemVariants.length !== 1 ? 's' : ''}${activeCount < itemVariants.length ? ` (${activeCount} active)` : ''}`
                        : ' · Click to manage variants'}
                    </div>
                  </div>

                  {itemVariants.length > 0 && (
                    <span style={{
                      fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99,
                      background:'#E6F7F0', color:'#065F46',
                    }}>
                      {itemVariants.length} variant{itemVariants.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {isOpen ? <ChevronUp size={16} color="var(--gray-400)" /> : <ChevronDown size={16} color="var(--gray-400)" />}
                </div>

                {/* Accordion body */}
                {isOpen && (
                  <div style={{ borderTop:'1px solid var(--gray-100)', padding:'16px 18px' }}>
                    {/* Column headers */}
                    {itemVariants.length > 0 && (
                      <div style={{
                        display:'grid', gridTemplateColumns:'1fr 110px 70px 52px 36px',
                        gap:8, marginBottom:8,
                        fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase',
                      }}>
                        <span>Name</span>
                        <span>Price (₹)</span>
                        <span>Default</span>
                        <span>Active</span>
                        <span></span>
                      </div>
                    )}

                    {/* Variant rows */}
                    {itemVariants.map((v, idx) => (
                      <div
                        key={v.id || idx}
                        style={{
                          display:'grid', gridTemplateColumns:'1fr 110px 70px 52px 36px',
                          gap:8, marginBottom:8, alignItems:'center',
                          opacity: v.active === false ? 0.5 : 1,
                        }}
                      >
                        <input
                          className="field-input" style={{ height:36 }}
                          placeholder="e.g. Small / Half / 500ml"
                          value={v.variantName}
                          onChange={e => updateVariantRow(item.id, idx, 'variantName', e.target.value)}
                        />
                        <input
                          className="field-input" style={{ height:36 }}
                          type="number" min="0" placeholder="₹"
                          value={v.price}
                          onChange={e => updateVariantRow(item.id, idx, 'price', e.target.value)}
                        />
                        <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, cursor:'pointer', justifyContent:'center' }}>
                          <input
                            type="checkbox" checked={!!v.isDefault}
                            onChange={e => updateVariantRow(item.id, idx, 'isDefault', e.target.checked)}
                            style={{ accentColor:'#1D9E75', width:15, height:15 }}
                          />
                          <span style={{ color:'var(--gray-500)' }}>Yes</span>
                        </label>
                        <div style={{ display:'flex', justifyContent:'center' }}>
                          <Toggle
                            checked={v.active !== false}
                            onChange={val => updateVariantRow(item.id, idx, 'active', val)}
                          />
                        </div>
                        <button
                          onClick={() => removeVariantRow(item.id, idx)}
                          style={{
                            background:'var(--red-bg)', border:'none', borderRadius:6,
                            padding:'6px 8px', cursor:'pointer', color:'var(--red)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                          }}
                          title="Remove row"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}

                    {itemVariants.length === 0 && (
                      <div style={{ textAlign:'center', padding:'20px 0', color:'var(--gray-400)', fontSize:13 }}>
                        No variants yet — add one below
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ height:34, fontSize:12, gap:5 }}
                        onClick={() => addVariantRow(item.id)}
                      >
                        <Plus size={12} /> Add row
                      </button>
                      <button
                        className="btn btn-primary"
                        style={{ height:34, fontSize:12, gap:5 }}
                        onClick={() => saveVariants(item.id)}
                        disabled={isSaving}
                      >
                        <Save size={12} />
                        {isSaving ? 'Saving…' : 'Save variants'}
                      </button>
                      {itemVariants.length > 0 && (
                        <button
                          className="btn btn-secondary"
                          style={{ height:34, fontSize:12, gap:5, marginLeft:'auto', color:'var(--red)', borderColor:'var(--red-bg)' }}
                          onClick={() => deleteAllVariants(item.id)}
                        >
                          <Trash2 size={12} /> Delete all
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════ ADD-ONS TAB ════════════════════════════════════ */}
      {tab === 'addons' && (
        <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
          <p style={{ fontSize:13, color:'var(--gray-500)', margin:0 }}>
            Add-ons are available across all menu items. Examples: Extra Cheese ₹30, Butter ₹10, Papad ₹15.
          </p>

          {/* Active add-ons */}
          {activeAddons.length > 0 && (
            <section>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', marginBottom:10, letterSpacing:'.04em' }}>
                Active ({activeAddons.length})
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:12 }}>
                {activeAddons.map(a => (
                  <AddonCard
                    key={a.id}
                    addon={a}
                    toggling={togglingId === a.id}
                    onEdit={() => openEditAddon(a)}
                    onToggle={() => toggleAddon(a)}
                    onDelete={() => deleteAddon(a.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Inactive add-ons */}
          {inactiveAddons.length > 0 && (
            <section>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', marginBottom:10, letterSpacing:'.04em' }}>
                Inactive ({inactiveAddons.length})
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:12 }}>
                {inactiveAddons.map(a => (
                  <AddonCard
                    key={a.id}
                    addon={a}
                    toggling={togglingId === a.id}
                    onEdit={() => openEditAddon(a)}
                    onToggle={() => toggleAddon(a)}
                    onDelete={() => deleteAddon(a.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {allAddons.length === 0 && (
            <div className="card" style={{ textAlign:'center', padding:'48px 0', color:'var(--gray-400)' }}>
              <Tag size={28} style={{ opacity:.3, display:'block', margin:'0 auto 12px' }} />
              <p style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>No add-ons yet</p>
              <p style={{ fontSize:12, marginBottom:16 }}>Add extras like extra cheese, sauce, or toppings</p>
              <button className="btn btn-primary" onClick={openAddAddon}>
                <Plus size={14} /> Add first add-on
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit Add-on modal ───────────────────────────────────────── */}
      {addonModal && (
        <div style={{
          position:'fixed', inset:0,
          background:'rgba(0,0,0,.45)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:1000, padding:16,
        }}>
          <div style={{ background:'white', borderRadius:18, padding:28, width:'100%', maxWidth:400 }}>
            {/* Modal header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
              <h2 style={{ fontSize:17, fontWeight:800 }}>
                {addonModal.mode === 'edit' ? 'Edit add-on' : 'New add-on'}
              </h2>
              <button
                onClick={() => setAMod(null)}
                style={{ background:'var(--gray-100)', border:'none', borderRadius:8, padding:'5px 7px', cursor:'pointer' }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Name */}
              <div className="field">
                <label className="field-label">Name *</label>
                <input
                  className="field-input"
                  placeholder="e.g. Extra Cheese"
                  value={addonForm.name}
                  onChange={e => setAForm(f => ({ ...f, name:e.target.value }))}
                />
              </div>

              {/* Price */}
              <div className="field">
                <label className="field-label">Additional price (₹) *</label>
                <input
                  className="field-input"
                  type="number" min="0" placeholder="30"
                  value={addonForm.price}
                  onChange={e => setAForm(f => ({ ...f, price:e.target.value }))}
                />
              </div>

              {/* Veg toggle */}
              <div>
                <div className="field-label" style={{ marginBottom:6 }}>Type</div>
                <div style={{ display:'flex', gap:8 }}>
                  {[{v:true,l:'🟢 Veg'},{v:false,l:'🔴 Non-veg'}].map(({ v, l }) => (
                    <button
                      key={l} type="button"
                      onClick={() => setAForm(f => ({ ...f, veg:v }))}
                      style={{
                        flex:1, height:38, borderRadius:10,
                        border:`1.5px solid ${addonForm.veg===v ? '#1D9E75' : 'var(--gray-200)'}`,
                        background: addonForm.veg===v ? '#E1F5EE' : 'white',
                        fontSize:13, fontWeight:600, cursor:'pointer',
                        color: addonForm.veg===v ? 'var(--green-darker)' : 'var(--gray-600)',
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active toggle */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--gray-50)', borderRadius:10 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:600 }}>Active</div>
                  <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:1 }}>Inactive add-ons won't be shown to customers</div>
                </div>
                <Toggle checked={addonForm.active} onChange={val => setAForm(f => ({ ...f, active:val }))} />
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ display:'flex', gap:10, marginTop:22 }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setAMod(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary" style={{ flex:1 }}
                onClick={saveAddon} disabled={saving || !addonForm.name || !addonForm.price}
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

// ── Add-on card component ─────────────────────────────────────────────────────
function AddonCard({ addon, toggling, onEdit, onToggle, onDelete }) {
  const isActive = addon.active !== false;
  return (
    <div className="card" style={{
      padding:'14px 16px',
      opacity: isActive ? 1 : 0.65,
      transition: 'opacity .2s',
    }}>
      {/* Top row */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
        <span style={{ fontSize:20, flexShrink:0 }}>{addon.veg !== false ? '🟢' : '🔴'}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, lineHeight:1.3 }}>{addon.name}</div>
          <div style={{ fontSize:15, fontWeight:800, color:'#1D9E75', marginTop:3 }}>
            +₹{parseFloat(addon.price).toFixed(0)}
          </div>
        </div>
        <StatusPill active={isActive} />
      </div>

      {/* Action row */}
      <div style={{ display:'flex', gap:6, borderTop:'1px solid var(--gray-100)', paddingTop:10 }}>
        {/* Edit */}
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

        {/* Activate / Deactivate */}
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

        {/* Delete */}
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
