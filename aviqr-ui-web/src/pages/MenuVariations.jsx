import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, Tag, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { menuApi, variantApi, addonApi } from '../api/index.js';

export default function MenuVariations() {
  const { user } = useAuth();
  const shopId = user?.shopId;

  const [menuItems, setMenu]     = useState([]);
  const [allAddons, setAddons]   = useState([]);
  const [variants,  setVariants] = useState({});  // itemId → [variants]
  const [expanded,  setExpanded] = useState({});
  const [loading,   setLoad]     = useState(true);
  const [tab,       setTab]      = useState('variants');
  const [addonModal,setAMod]     = useState(null);
  const [addonForm, setAForm]    = useState({ name:'', price:'', veg:true });
  const [saving,    setSaving]   = useState(false);

  const load = async () => {
    if (!shopId) return;
    try {
      const [iRes, aRes] = await Promise.all([
        menuApi.getItems(shopId),
        addonApi.getByShop(shopId),
      ]);
      setMenu(iRes.data.data || []);
      setAddons(aRes.data.data || []);
    } catch {}
    finally { setLoad(false); }
  };

  useEffect(() => { load(); }, [shopId]);

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

  // ── Variant editing ───────────────────────────────────────────────────────
  const addVariantRow = (itemId) => {
    setVariants(v => ({
      ...v,
      [itemId]: [...(v[itemId] || []), { id: `new_${Date.now()}`, variantName:'', price:'', isDefault:false, sortOrder:(v[itemId]||[]).length, _new:true }]
    }));
  };

  const updateVariantRow = (itemId, idx, field, value) => {
    setVariants(v => ({
      ...v,
      [itemId]: v[itemId].map((row, i) => i === idx ? { ...row, [field]: value } : row)
    }));
  };

  const removeVariantRow = (itemId, idx) => {
    setVariants(v => ({
      ...v,
      [itemId]: v[itemId].filter((_, i) => i !== idx)
    }));
  };

  const saveVariants = async (itemId) => {
    setSaving(true);
    try {
      const rows = (variants[itemId] || []).filter(v => v.variantName && v.price).map((v, i) => ({
        variantName: v.variantName,
        price:       parseFloat(v.price),
        isDefault:   v.isDefault || false,
        sortOrder:   i,
        active:      true,
      }));
      await variantApi.saveVariants(itemId, rows);
      await loadVariants(itemId);
    } catch (e) { alert('Save failed: ' + (e.response?.data?.message || e.message)); }
    finally { setSaving(false); }
  };

  // ── Add-on editing ────────────────────────────────────────────────────────
  const saveAddon = async () => {
    if (!addonForm.name || !addonForm.price) return;
    setSaving(true);
    try {
      const payload = { shopId, name:addonForm.name, price:parseFloat(addonForm.price), veg:addonForm.veg, active:true };
      if (addonModal.mode === 'edit') {
        await addonApi.update(addonModal.id, payload);
        setAddons(prev => prev.map(a => a.id === addonModal.id ? { ...a, ...payload } : a));
      } else {
        const res = await addonApi.create(payload);
        setAddons(prev => [...prev, res.data.data]);
      }
      setAMod(null);
    } catch (e) { alert('Save failed: ' + (e.response?.data?.message || e.message)); }
    finally { setSaving(false); }
  };

  const deleteAddon = async (id) => {
    if (!confirm('Delete this add-on?')) return;
    try { await addonApi.delete(id); setAddons(prev => prev.filter(a => a.id !== id)); } catch {}
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:300, flexDirection:'column', gap:10 }}>
      <div className="spinner" />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinner{width:28px;height:28px;border:3px solid var(--green);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}`}</style>
    </div>
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1 className="page-title">Variations & Add-ons</h1><p className="page-subtitle">Size variants, portion options, and add-on extras</p></div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /></button>
          {tab === 'addons' && <button className="btn btn-primary" onClick={() => { setAForm({ name:'', price:'', veg:true }); setAMod({ mode:'add' }); }}><Plus size={14} /> Add add-on</button>}
        </div>
      </div>

      <div className="filter-chips" style={{ marginBottom:16 }}>
        <button className={`chip${tab==='variants'?' active':''}`} onClick={() => setTab('variants')}>📐 Size Variants</button>
        <button className={`chip${tab==='addons'?' active':''}`} onClick={() => setTab('addons')}>➕ Add-ons ({allAddons.length})</button>
      </div>

      {/* ── Variants tab ─────────────────────────────────────────────────── */}
      {tab === 'variants' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {menuItems.length === 0 && <div className="card" style={{ textAlign:'center', padding:'40px 0', color:'var(--gray-400)', fontSize:13 }}>No menu items found. Add items in the Menu page first.</div>}
          {menuItems.map(item => (
            <div key={item.id} className="card" style={{ padding:'14px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer' }} onClick={() => toggleExpand(item)}>
                <span style={{ fontSize:10, fontWeight:700, color:item.veg!==false?'#1D9E75':'#DC2626', border:`1.5px solid ${item.veg!==false?'#1D9E75':'#DC2626'}`, borderRadius:2, padding:'1px 4px', flexShrink:0 }}>■</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600 }}>{item.name}</div>
                  <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:1 }}>
                    Base price: ₹{item.price} &nbsp;·&nbsp;
                    {variants[item.id] ? `${variants[item.id].length} variant${variants[item.id].length !== 1 ? 's' : ''}` : 'Click to manage variants'}
                  </div>
                </div>
                {expanded[item.id] ? <ChevronUp size={16} color="var(--gray-400)" /> : <ChevronDown size={16} color="var(--gray-400)" />}
              </div>

              {expanded[item.id] && (
                <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--gray-100)' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-500)', marginBottom:10, textTransform:'uppercase' }}>
                    Variants (leave empty = use base price ₹{item.price})
                  </div>

                  {(variants[item.id] || []).map((v, idx) => (
                    <div key={v.id || idx} style={{ display:'grid', gridTemplateColumns:'1fr 120px 80px auto', gap:8, marginBottom:8, alignItems:'center' }}>
                      <input className="field-input" style={{ height:34 }} placeholder="e.g. Small / Half / 500ml"
                        value={v.variantName} onChange={e => updateVariantRow(item.id, idx, 'variantName', e.target.value)} />
                      <input className="field-input" style={{ height:34 }} type="number" min="0" placeholder="Price ₹"
                        value={v.price} onChange={e => updateVariantRow(item.id, idx, 'price', e.target.value)} />
                      <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, cursor:'pointer' }}>
                        <input type="checkbox" checked={!!v.isDefault} onChange={e => updateVariantRow(item.id, idx, 'isDefault', e.target.checked)} style={{ accentColor:'#1D9E75' }} />
                        Default
                      </label>
                      <button onClick={() => removeVariantRow(item.id, idx)}
                        style={{ background:'var(--red-bg)', border:'none', borderRadius:6, padding:'6px 10px', cursor:'pointer', color:'var(--red)' }}><Trash2 size={13} /></button>
                    </div>
                  ))}

                  <div style={{ display:'flex', gap:8, marginTop:8 }}>
                    <button className="btn btn-secondary" style={{ height:32, fontSize:12 }} onClick={() => addVariantRow(item.id)}><Plus size={12} /> Add variant</button>
                    <button className="btn btn-primary" style={{ height:32, fontSize:12 }} onClick={() => saveVariants(item.id)} disabled={saving}><Save size={12} /> {saving?'Saving…':'Save variants'}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Add-ons tab ───────────────────────────────────────────────────── */}
      {tab === 'addons' && (
        <div>
          <p style={{ fontSize:13, color:'var(--gray-500)', marginBottom:16 }}>
            Add-ons are available across all menu items. Customers can choose them at the time of ordering.
            Examples: Extra Cheese ₹30, Extra Sauce ₹20, Butter ₹10, Papad ₹15.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
            {allAddons.map(a => (
              <div key={a.id} className="card" style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:18 }}>{a.veg!==false ? '🟢' : '🔴'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600 }}>{a.name}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--green-dark)', marginTop:2 }}>+₹{parseFloat(a.price).toFixed(0)}</div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => { setAForm({ name:a.name, price:String(a.price), veg:a.veg!==false }); setAMod({ mode:'edit', id:a.id }); }}
                    style={{ background:'var(--gray-100)', border:'none', borderRadius:6, padding:'5px 8px', cursor:'pointer' }}><Edit2 size={12} /></button>
                  <button onClick={() => deleteAddon(a.id)}
                    style={{ background:'var(--red-bg)', border:'none', borderRadius:6, padding:'5px 8px', cursor:'pointer', color:'var(--red)' }}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
            {allAddons.length === 0 && (
              <div className="card" style={{ gridColumn:'1/-1', textAlign:'center', padding:'40px 0', color:'var(--gray-400)' }}>
                <Tag size={28} style={{ opacity:.3, display:'block', margin:'0 auto 10px' }} />
                <p style={{ fontSize:14 }}>No add-ons yet</p>
                <p style={{ fontSize:12, marginTop:4 }}>Add extras like cheese, sauce, or toppings that customers can add to any item</p>
                <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => { setAForm({ name:'', price:'', veg:true }); setAMod({ mode:'add' }); }}>Add first add-on</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit add-on modal */}
      {addonModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:380 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ fontSize:17, fontWeight:700 }}>{addonModal.mode==='edit'?'Edit add-on':'New add-on'}</h2>
              <button onClick={() => setAMod(null)} style={{ background:'var(--gray-100)', border:'none', borderRadius:8, padding:'5px 7px', cursor:'pointer' }}><X size={15} /></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div className="field"><label className="field-label">Name *</label><input className="field-input" placeholder="Extra Cheese" value={addonForm.name} onChange={e => setAForm(f => ({...f,name:e.target.value}))} /></div>
              <div className="field"><label className="field-label">Additional price (₹) *</label><input className="field-input" type="number" min="0" placeholder="30" value={addonForm.price} onChange={e => setAForm(f => ({...f,price:e.target.value}))} /></div>
              <div style={{ display:'flex', gap:12 }}>
                {[{ v:true, l:'🟢 Veg' }, { v:false, l:'🔴 Non-veg' }].map(({ v, l }) => (
                  <button key={l} type="button" onClick={() => setAForm(f => ({...f,veg:v}))}
                    style={{ flex:1, height:36, borderRadius:8, border:`1.5px solid ${addonForm.veg===v?'#1D9E75':'var(--gray-200)'}`, background:addonForm.veg===v?'#E1F5EE':'white', fontSize:13, fontWeight:600, cursor:'pointer', color:addonForm.veg===v?'var(--green-darker)':'var(--gray-600)' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setAMod(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={saveAddon} disabled={saving}>{saving?'Saving…':'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
