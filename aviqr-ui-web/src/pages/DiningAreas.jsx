import { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, X, Save, LayoutGrid, RefreshCw, Power, Tag,
} from 'lucide-react';
import { useActiveShopId } from '../hooks/useActiveShopId.js';
import { menuApi, diningAreaApi } from '../api/index.js';

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

export default function DiningAreas() {
  const shopId = useActiveShopId();

  const [areas,      setAreas]      = useState([]);
  const [items,      setItems]      = useState([]);
  const [loading,    setLoad]       = useState(true);
  const [areaModal,  setAreaModal]  = useState(null); // { mode:'add'|'edit', id }
  const [areaForm,   setAreaForm]   = useState({ name:'', active:true });
  const [saving,     setSaving]     = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const [pricingArea, setPricingArea] = useState(null); // area object, or null
  const [priceRows,   setPriceRows]   = useState({});   // itemId -> price string override
  const [pricesLoading, setPricesLoading] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);

  const load = async () => {
    if (!shopId) return;
    setLoad(true);
    try {
      const [aRes, iRes] = await Promise.all([
        diningAreaApi.getByShop(shopId),
        menuApi.getItems(shopId),
      ]);
      setAreas(aRes.data.data || []);
      setItems(iRes.data.data?.content ?? iRes.data.data ?? []);
    } catch {}
    finally { setLoad(false); }
  };

  useEffect(() => { load(); }, [shopId]);

  // ── Area CRUD ─────────────────────────────────────────────────────────────
  const openAddArea  = () => { setAreaForm({ name:'', active:true }); setAreaModal({ mode:'add' }); };
  const openEditArea = (a) => { setAreaForm({ name:a.name, active:a.active !== false }); setAreaModal({ mode:'edit', id:a.id }); };

  const saveArea = async () => {
    if (!areaForm.name) return;
    setSaving(true);
    try {
      const payload = { shopId, name:areaForm.name, active:areaForm.active };
      if (areaModal.mode === 'edit') {
        const res = await diningAreaApi.update(areaModal.id, payload);
        setAreas(prev => prev.map(a => a.id === areaModal.id ? (res.data.data || { ...a, ...payload }) : a));
      } else {
        const res = await diningAreaApi.create(payload);
        setAreas(prev => [...prev, res.data.data]);
      }
      setAreaModal(null);
    } catch (e) { alert('Save failed: ' + (e.response?.data?.message || e.message)); }
    finally { setSaving(false); }
  };

  const toggleArea = async (area) => {
    setTogglingId(area.id);
    try {
      const updated = { ...area, active: !area.active };
      await diningAreaApi.update(area.id, updated);
      setAreas(prev => prev.map(a => a.id === area.id ? updated : a));
    } catch (e) { alert('Toggle failed: ' + (e.response?.data?.message || e.message)); }
    finally { setTogglingId(null); }
  };

  const deleteArea = async (id) => {
    if (!confirm('Delete this dine-in area? Any custom pricing for it will also be removed.')) return;
    try { await diningAreaApi.delete(id); setAreas(prev => prev.filter(a => a.id !== id)); } catch {}
  };

  // ── Per-area pricing ─────────────────────────────────────────────────────
  const openPricing = async (area) => {
    setPricingArea(area);
    setPricesLoading(true);
    try {
      const res = await diningAreaApi.getPrices(area.id);
      const rows = {};
      (res.data.data || []).forEach(p => { rows[p.menuItemId] = String(p.price); });
      setPriceRows(rows);
    } catch { setPriceRows({}); }
    finally { setPricesLoading(false); }
  };

  const savePricing = async () => {
    if (!pricingArea) return;
    setSavingPrices(true);
    try {
      const payload = Object.entries(priceRows)
        .filter(([, val]) => val !== '' && val != null)
        .map(([menuItemId, price]) => ({ menuItemId, price: parseFloat(price) }));
      await diningAreaApi.savePrices(pricingArea.id, payload);
      setPricingArea(null);
    } catch (e) { alert('Save failed: ' + (e.response?.data?.message || e.message)); }
    finally { setSavingPrices(false); }
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:300, flexDirection:'column', gap:10 }}>
      <div className="spinner" />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinner{width:28px;height:28px;border:3px solid #1D9E75;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}`}</style>
    </div>
  );

  return (
    <div className="page-content">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dine-in Areas</h1>
          <p className="page-subtitle">Create separate dine-in areas and set custom pricing for each</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={load} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button className="btn btn-primary" onClick={openAddArea}>
            <Plus size={14} /> Add area
          </button>
        </div>
      </div>

      {areas.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'48px 0', color:'var(--gray-400)' }}>
          <LayoutGrid size={28} style={{ opacity:.3, display:'block', margin:'0 auto 12px' }} />
          <p style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>No dine-in areas yet</p>
          <p style={{ fontSize:12, marginBottom:16 }}>Add areas like Indoor, Rooftop or Garden and give each its own pricing</p>
          <button className="btn btn-primary" onClick={openAddArea}>
            <Plus size={14} /> Add first area
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:12 }}>
          {areas.map(a => (
            <AreaCard
              key={a.id}
              area={a}
              toggling={togglingId === a.id}
              onEdit={() => openEditArea(a)}
              onToggle={() => toggleArea(a)}
              onDelete={() => deleteArea(a.id)}
              onPricing={() => openPricing(a)}
            />
          ))}
        </div>
      )}

      {/* ── Add / Edit area modal ────────────────────────────────────────── */}
      {areaModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.45)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:1000, padding:16,
        }}>
          <div style={{ background:'white', borderRadius:18, padding:28, width:'100%', maxWidth:380 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
              <h2 style={{ fontSize:17, fontWeight:800 }}>
                {areaModal.mode === 'edit' ? 'Edit area' : 'New dine-in area'}
              </h2>
              <button
                onClick={() => setAreaModal(null)}
                style={{ background:'var(--gray-100)', border:'none', borderRadius:8, padding:'5px 7px', cursor:'pointer' }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="field">
                <label className="field-label">Area name *</label>
                <input
                  className="field-input"
                  placeholder="e.g. Rooftop, AC Hall, Garden"
                  value={areaForm.name}
                  onChange={e => setAreaForm(f => ({ ...f, name:e.target.value }))}
                />
              </div>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--gray-50)', borderRadius:10 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:600 }}>Active</div>
                  <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:1 }}>Inactive areas won't show up at billing</div>
                </div>
                <Toggle checked={areaForm.active} onChange={val => setAreaForm(f => ({ ...f, active:val }))} />
              </div>
            </div>

            <div style={{ display:'flex', gap:10, marginTop:22 }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setAreaModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary" style={{ flex:1 }}
                onClick={saveArea} disabled={saving || !areaForm.name}
              >
                {saving ? 'Saving…' : <><Save size={13} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Per-area pricing modal ───────────────────────────────────────── */}
      {pricingArea && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.45)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:1000, padding:16,
        }}>
          <div style={{ background:'white', borderRadius:18, padding:28, width:'100%', maxWidth:480, maxHeight:'82vh', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <h2 style={{ fontSize:17, fontWeight:800 }}>Pricing — {pricingArea.name}</h2>
              <button
                onClick={() => setPricingArea(null)}
                style={{ background:'var(--gray-100)', border:'none', borderRadius:8, padding:'5px 7px', cursor:'pointer' }}
              >
                <X size={15} />
              </button>
            </div>
            <p style={{ fontSize:12, color:'var(--gray-500)', marginBottom:14 }}>
              Leave blank to use the item's normal menu price for this area.
            </p>

            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
              {pricesLoading ? (
                <div style={{ textAlign:'center', padding:'20px 0', color:'var(--gray-400)', fontSize:13 }}>Loading…</div>
              ) : items.length === 0 ? (
                <div style={{ textAlign:'center', padding:'20px 0', color:'var(--gray-400)', fontSize:13 }}>No menu items found.</div>
              ) : items.map(item => (
                <div key={item.id} style={{ display:'grid', gridTemplateColumns:'1fr 100px', gap:10, alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--gray-100)' }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{item.name}</div>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'var(--gray-400)' }}>₹</span>
                    <input
                      type="number" min="0"
                      className="field-input"
                      style={{ height:32, paddingLeft:20, fontSize:12 }}
                      placeholder={String(item.price)}
                      value={priceRows[item.id] ?? ''}
                      onChange={e => setPriceRows(prev => ({ ...prev, [item.id]: e.target.value }))}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:10, marginTop:18, paddingTop:14, borderTop:'1px solid var(--gray-100)' }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setPricingArea(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary" style={{ flex:1 }}
                onClick={savePricing} disabled={savingPrices || pricesLoading}
              >
                {savingPrices ? 'Saving…' : <><Save size={13} /> Save pricing</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Area card ─────────────────────────────────────────────────────────────────
function AreaCard({ area, toggling, onEdit, onToggle, onDelete, onPricing }) {
  const isActive = area.active !== false;
  return (
    <div className="card" style={{
      padding:'14px 16px',
      opacity: isActive ? 1 : 0.65,
      transition: 'opacity .2s',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
        <div style={{
          width:40, height:40, borderRadius:10, flexShrink:0,
          background:'var(--green-light)', color:'var(--green-darker)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <LayoutGrid size={18} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, lineHeight:1.3 }}>{area.name}</div>
        </div>
        <StatusPill active={isActive} />
      </div>

      <div style={{ display:'flex', gap:6, borderTop:'1px solid var(--gray-100)', paddingTop:10 }}>
        <button
          onClick={onPricing}
          style={{
            flex:1.4, height:32, borderRadius:8, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:5,
            fontSize:12, fontWeight:600,
            background:'var(--green-light)', border:'1.5px solid #A7F3D0', color:'var(--green-darker)',
          }}
          title="Manage pricing"
        >
          <Tag size={12} /> Pricing
        </button>

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
          <Edit2 size={12} />
        </button>

        <button
          onClick={onToggle}
          disabled={toggling}
          style={{
            width:34, height:32, borderRadius:8, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            background: isActive ? '#FEF3C7' : '#E6F7F0',
            border: `1.5px solid ${isActive ? '#FCD34D' : '#6EE7B7'}`,
            color: isActive ? '#92400E' : '#065F46',
            opacity: toggling ? 0.6 : 1,
            flexShrink:0,
          }}
          title={isActive ? 'Deactivate' : 'Activate'}
        >
          <Power size={12} />
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
