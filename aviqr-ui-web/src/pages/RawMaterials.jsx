import { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Trash2, Search, AlertTriangle, Package, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { rawMaterialApi, menuApi, recipeApi } from '../api/index.js';

const UNITS = ['kg','gram','litre','ml','piece','dozen','packet','bottle'];

const EMPTY_MAT = { name:'', unit:'kg', currentStock:'', minStockLevel:'', costPerUnit:'', supplier:'' };

export default function RawMaterials() {
  const { user } = useAuth();
  const shopId = user?.shopId;

  const [materials, setMats]   = useState([]);
  const [menuItems, setMenu]   = useState([]);
  const [loading,   setLoad]   = useState(true);
  const [error,     setError]  = useState(null);
  const [search,    setSearch] = useState('');
  const [tab,       setTab]    = useState('materials'); // materials | recipes
  const [modal,     setModal]  = useState(null);  // { mode:'add'|'edit', data }
  const [form,      setForm]   = useState(EMPTY_MAT);
  const [saving,    setSaving] = useState(false);

  // Recipe tab state
  const [selItem,   setSelItem]  = useState(null);
  const [recipe,    setRecipe]   = useState([]);
  const [dishCost,  setDishCost] = useState(null);
  const [recipeRow, setRecRow]   = useState({ rawMaterialId:'', rawMaterialName:'', quantity:'', unit:'' });

  const load = async () => {
    if (!shopId) return;
    try {
      const [mRes, iRes] = await Promise.all([
        rawMaterialApi.getByShop(shopId),
        menuApi.getItems(shopId),
      ]);
      setMats(mRes.data.data || []);
      setMenu(iRes.data.data || []);
    } catch (e) { setError(e.response?.data?.message || 'Failed to load'); }
    finally { setLoad(false); }
  };

  useEffect(() => { load(); }, [shopId]);

  const loadRecipe = async (item) => {
    setSelItem(item);
    setRecipe([]);
    setDishCost(null);
    try {
      const [rRes, cRes] = await Promise.allSettled([
        recipeApi.getRecipe(item.id),
        recipeApi.getDishCost(item.id),
      ]);
      if (rRes.status === 'fulfilled') setRecipe(rRes.value.data.data || []);
      if (cRes.status === 'fulfilled') setDishCost(cRes.value.data.data);
    } catch {}
  };

  const addRecipeRow = async () => {
    if (!recipeRow.rawMaterialId || !recipeRow.quantity) return;
    const mat = materials.find(m => m.id === recipeRow.rawMaterialId);
    const newRow = { ...recipeRow, rawMaterialName: mat?.name || '', unit: mat?.unit || recipeRow.unit };
    const updated = [...recipe, newRow];
    setRecipe(updated);
    await saveRecipe(updated);
    setRecRow({ rawMaterialId:'', rawMaterialName:'', quantity:'', unit:'' });
  };

  const removeRecipeRow = async (idx) => {
    const updated = recipe.filter((_, i) => i !== idx);
    setRecipe(updated);
    await saveRecipe(updated);
  };

  const saveRecipe = async (rows) => {
    if (!selItem) return;
    try {
      await recipeApi.saveRecipe(selItem.id, rows);
      const cRes = await recipeApi.getDishCost(selItem.id);
      setDishCost(cRes.data.data);
    } catch (e) { console.error('Save recipe error', e); }
  };

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const payload = {
        shopId,
        name:          form.name,
        unit:          form.unit,
        currentStock:  parseFloat(form.currentStock || 0),
        minStockLevel: parseFloat(form.minStockLevel || 0),
        costPerUnit:   parseFloat(form.costPerUnit || 0),
        supplier:      form.supplier,
      };
      if (modal.mode === 'edit') {
        await rawMaterialApi.update(modal.id, payload);
        setMats(prev => prev.map(m => m.id === modal.id ? { ...m, ...payload } : m));
      } else {
        const res = await rawMaterialApi.create(payload);
        setMats(prev => [...prev, res.data.data]);
      }
      setModal(null);
    } catch (e) { alert('Save failed: ' + (e.response?.data?.message || e.message)); }
    finally { setSaving(false); }
  };

  const adjustStock = async (mat, delta) => {
    const reason = delta > 0 ? 'Stock added' : 'Stock consumed';
    try {
      await rawMaterialApi.adjustStock(mat.id, delta, reason);
      setMats(prev => prev.map(m => m.id === mat.id ? { ...m, currentStock: parseFloat(m.currentStock || 0) + delta } : m));
    } catch {}
  };

  const filtered = materials.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));
  const lowStock = materials.filter(m => parseFloat(m.currentStock || 0) <= parseFloat(m.minStockLevel || 0));

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:300, flexDirection:'column', gap:10 }}>
      <div className="spinner" />
      <p style={{ color:'var(--gray-500)', fontSize:13 }}>Loading…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinner{width:28px;height:28px;border:3px solid var(--green);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}`}</style>
    </div>
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Raw Materials & Recipes</h1>
          <p className="page-subtitle">Track ingredients, costs, and dish recipes</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /> Refresh</button>
          {tab === 'materials' && <button className="btn btn-primary" onClick={() => { setForm(EMPTY_MAT); setModal({ mode:'add' }); }}><Plus size={14} /> Add material</button>}
        </div>
      </div>

      {error && <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#92400E', marginBottom:14 }}>⚠ {error}</div>}

      {lowStock.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#92400E', marginBottom:14 }}>
          <AlertTriangle size={15} />
          <strong>{lowStock.length} material{lowStock.length > 1 ? 's' : ''} low / out of stock:</strong>
          {lowStock.slice(0,3).map(m => ` ${m.name}`).join(',')}
          {lowStock.length > 3 && ` +${lowStock.length-3} more`}
        </div>
      )}

      {/* Tabs */}
      <div className="filter-chips" style={{ marginBottom:16 }}>
        <button className={`chip${tab==='materials'?' active':''}`} onClick={() => setTab('materials')}>📦 Ingredient Master ({materials.length})</button>
        <button className={`chip${tab==='recipes'?' active':''}`} onClick={() => setTab('recipes')}>📋 Recipes & Cost</button>
      </div>

      {/* ── Materials tab ───────────────────────────────────────────────── */}
      {tab === 'materials' && (
        <>
          <div style={{ position:'relative', marginBottom:14 }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)', pointerEvents:'none' }} />
            <input className="field-input" style={{ paddingLeft:32, height:38 }} placeholder="Search ingredients…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--gray-50)', fontSize:12, fontWeight:600, color:'var(--gray-500)' }}>
                  {['Ingredient','Unit','In Stock','Min Level','Cost/Unit','Total Value','Supplier',''].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign: h === '' ? 'right' : 'left', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding:'40px 0', textAlign:'center', color:'var(--gray-400)', fontSize:13 }}>
                    <Package size={24} style={{ display:'block', margin:'0 auto 8px', opacity:.4 }} />
                    No ingredients yet — add your first raw material
                  </td></tr>
                ) : filtered.map(m => {
                  const stock = parseFloat(m.currentStock || 0);
                  const minLevel = parseFloat(m.minStockLevel || 0);
                  const isLow = stock <= minLevel;
                  const cost = parseFloat(m.costPerUnit || 0);
                  return (
                    <tr key={m.id} style={{ borderTop:'1px solid var(--gray-100)', background: isLow ? '#FFFBEB' : 'white' }}>
                      <td style={{ padding:'12px 14px', fontWeight:600, fontSize:13 }}>{m.name}</td>
                      <td style={{ padding:'12px 14px', fontSize:12, color:'var(--gray-500)' }}>{m.unit}</td>
                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ fontSize:14, fontWeight:700, color: isLow ? '#D97706' : '#1D9E75' }}>{stock.toFixed(2)}</span>
                      </td>
                      <td style={{ padding:'12px 14px', fontSize:13, color:'var(--gray-600)' }}>{minLevel.toFixed(2)}</td>
                      <td style={{ padding:'12px 14px', fontSize:13, fontWeight:600 }}>₹{cost.toFixed(2)}</td>
                      <td style={{ padding:'12px 14px', fontSize:13, color:'var(--gray-700)', fontWeight:600 }}>₹{(stock * cost).toFixed(0)}</td>
                      <td style={{ padding:'12px 14px', fontSize:12, color:'var(--gray-500)' }}>{m.supplier || '—'}</td>
                      <td style={{ padding:'12px 14px', textAlign:'right' }}>
                        <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                          <button onClick={() => { const d = parseFloat(prompt(`Adjust stock for ${m.name} (enter positive to add, negative to subtract):`) || 0); if (d) adjustStock(m, d); }}
                            style={{ background:'var(--green-light)', color:'var(--green-darker)', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                            ± Stock
                          </button>
                          <button onClick={() => { setForm({ name:m.name, unit:m.unit, currentStock:m.currentStock, minStockLevel:m.minStockLevel, costPerUnit:m.costPerUnit, supplier:m.supplier||'' }); setModal({ mode:'edit', id:m.id }); }}
                            style={{ background:'var(--gray-100)', border:'none', borderRadius:6, padding:'4px 8px', cursor:'pointer' }}>
                            <Edit2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {materials.length > 0 && (
                <tfoot>
                  <tr style={{ background:'var(--gray-50)', fontWeight:700, fontSize:13 }}>
                    <td colSpan={5} style={{ padding:'10px 14px' }}>Total inventory value</td>
                    <td style={{ padding:'10px 14px' }}>₹{materials.reduce((s,m) => s + parseFloat(m.currentStock||0)*parseFloat(m.costPerUnit||0), 0).toLocaleString('en-IN', { maximumFractionDigits:0 })}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {/* ── Recipes tab ─────────────────────────────────────────────────── */}
      {tab === 'recipes' && (
        <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:16 }}>
          {/* Menu item list */}
          <div className="card" style={{ padding:8 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-500)', textTransform:'uppercase', padding:'6px 8px 10px', letterSpacing:.4 }}>Menu Items</div>
            {menuItems.map(item => (
              <button key={item.id} onClick={() => loadRecipe(item)}
                style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 10px', borderRadius:8, border:'none', background: selItem?.id===item.id ? 'var(--green-light)' : 'transparent', cursor:'pointer', textAlign:'left', marginBottom:2 }}>
                <span style={{ fontSize:10, fontWeight:700, color:item.veg!==false?'#1D9E75':'#DC2626', border:`1.5px solid ${item.veg!==false?'#1D9E75':'#DC2626'}`, borderRadius:2, padding:'1px 3px', flexShrink:0 }}>■</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color: selItem?.id===item.id ? 'var(--green-darker)' : '#374151' }}>{item.name}</div>
                  <div style={{ fontSize:11, color:'var(--gray-400)' }}>₹{item.price}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Recipe editor */}
          <div>
            {!selItem ? (
              <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, color:'var(--gray-400)', gap:8 }}>
                <Package size={32} style={{ opacity:.4 }} />
                <p style={{ fontSize:14 }}>Select a menu item to view or edit its recipe</p>
              </div>
            ) : (
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">{selItem.name} — Recipe</div>
                    <div className="card-subtitle">Selling price: ₹{selItem.price} · Ingredient cost: ₹{parseFloat(dishCost?.ingredientCost||0).toFixed(2)}{selItem.price > 0 && dishCost ? ` · Gross margin: ${(((parseFloat(selItem.price)-parseFloat(dishCost.ingredientCost||0))/parseFloat(selItem.price))*100).toFixed(1)}%` : ''}</div>
                  </div>
                </div>

                {recipe.length > 0 ? (
                  <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:16 }}>
                    <thead>
                      <tr style={{ background:'var(--gray-50)', fontSize:12, fontWeight:600, color:'var(--gray-500)' }}>
                        <th style={{ padding:'8px 12px', textAlign:'left' }}>Ingredient</th>
                        <th style={{ padding:'8px 12px', textAlign:'center' }}>Qty</th>
                        <th style={{ padding:'8px 12px', textAlign:'center' }}>Unit</th>
                        <th style={{ padding:'8px 12px', textAlign:'right' }}>Cost</th>
                        <th style={{ padding:'8px 12px', textAlign:'right' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipe.map((row, i) => (
                        <tr key={i} style={{ borderTop:'1px solid var(--gray-100)' }}>
                          <td style={{ padding:'10px 12px', fontSize:13, fontWeight:500 }}>{row.rawMaterialName}</td>
                          <td style={{ padding:'10px 12px', textAlign:'center', fontSize:13 }}>{parseFloat(row.quantity||0).toFixed(3)}</td>
                          <td style={{ padding:'10px 12px', textAlign:'center', fontSize:13, color:'var(--gray-500)' }}>{row.unit}</td>
                          <td style={{ padding:'10px 12px', textAlign:'right', fontSize:13, fontWeight:600 }}>₹{parseFloat(row.costContribution||0).toFixed(2)}</td>
                          <td style={{ padding:'10px 12px', textAlign:'right' }}>
                            <button onClick={() => removeRecipeRow(i)} style={{ background:'var(--red-bg)', border:'none', borderRadius:6, padding:'3px 7px', cursor:'pointer', color:'var(--red)' }}><X size={12} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p style={{ fontSize:13, color:'var(--gray-400)', marginBottom:16 }}>No recipe defined yet. Add ingredients below.</p>}

                {/* Add ingredient row */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 80px auto', gap:8, alignItems:'flex-end' }}>
                  <div className="field" style={{ margin:0 }}>
                    <label className="field-label" style={{ fontSize:11 }}>Ingredient</label>
                    <select className="field-input" style={{ height:36 }} value={recipeRow.rawMaterialId}
                      onChange={e => {
                        const mat = materials.find(m => m.id === e.target.value);
                        setRecRow(r => ({ ...r, rawMaterialId:e.target.value, unit:mat?.unit||r.unit }));
                      }}>
                      <option value="">Select ingredient</option>
                      {materials.map(m => <option key={m.id} value={m.id}>{m.name} (₹{parseFloat(m.costPerUnit||0).toFixed(2)}/{m.unit})</option>)}
                    </select>
                  </div>
                  <div className="field" style={{ margin:0 }}>
                    <label className="field-label" style={{ fontSize:11 }}>Quantity</label>
                    <input className="field-input" style={{ height:36 }} type="number" step="0.001" min="0" placeholder="0.250"
                      value={recipeRow.quantity} onChange={e => setRecRow(r => ({ ...r, quantity:e.target.value }))} />
                  </div>
                  <div className="field" style={{ margin:0 }}>
                    <label className="field-label" style={{ fontSize:11 }}>Unit</label>
                    <input className="field-input" style={{ height:36 }} value={recipeRow.unit} onChange={e => setRecRow(r => ({ ...r, unit:e.target.value }))} placeholder="kg" />
                  </div>
                  <button className="btn btn-primary" style={{ height:36 }} onClick={addRecipeRow} disabled={!recipeRow.rawMaterialId || !recipeRow.quantity}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Material modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:460 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ fontSize:17, fontWeight:700 }}>{modal.mode==='edit'?'Edit ingredient':'Add ingredient'}</h2>
              <button onClick={() => setModal(null)} style={{ background:'var(--gray-100)', border:'none', borderRadius:8, padding:'5px 7px', cursor:'pointer' }}><X size={15} /></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 120px', gap:12 }}>
                <div className="field"><label className="field-label">Ingredient name *</label><input className="field-input" placeholder="Paneer" value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} /></div>
                <div className="field"><label className="field-label">Unit *</label>
                  <select className="field-input" value={form.unit} onChange={e => setForm(f => ({...f,unit:e.target.value}))}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="field"><label className="field-label">Current stock</label><input className="field-input" type="number" step="0.01" min="0" placeholder="10" value={form.currentStock} onChange={e => setForm(f => ({...f,currentStock:e.target.value}))} /></div>
                <div className="field"><label className="field-label">Min level (reorder at)</label><input className="field-input" type="number" step="0.01" min="0" placeholder="2" value={form.minStockLevel} onChange={e => setForm(f => ({...f,minStockLevel:e.target.value}))} /></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="field"><label className="field-label">Cost per {form.unit} (₹)</label><input className="field-input" type="number" step="0.01" min="0" placeholder="320" value={form.costPerUnit} onChange={e => setForm(f => ({...f,costPerUnit:e.target.value}))} /></div>
                <div className="field"><label className="field-label">Supplier name</label><input className="field-input" placeholder="Krishna Dairy" value={form.supplier} onChange={e => setForm(f => ({...f,supplier:e.target.value}))} /></div>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={save} disabled={saving}>{saving?'Saving…':modal.mode==='edit'?'Save changes':'Add ingredient'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
