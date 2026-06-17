import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Tag, Upload, X, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { menuApi } from '../api/index.js';
import './Menu.css';

const TAG_CFG = {
  bestseller:{ label:'⭐ Bestseller', cls:'tag-bestseller' },
  spicy:     { label:'🌶 Spicy',      cls:'tag-spicy' },
  veg:       { label:'🌿 Veg',        cls:'tag-veg' },
};

const EMPTY_ITEM = { name:'', desc:'', price:'', veg:true, spicy:false, popular:false };

export default function Menu() {
  const { user } = useAuth();
  const shopId = user?.shopId || '00000000-0000-0000-0000-000000000101';

  const [categories, setCats]   = useState(DEMO_CATEGORIES);
  const [expanded, setExpanded] = useState({ cat1:true, cat2:true });
  const [search, setSearch]     = useState('');
  const [selCat, setSelCat]     = useState(null);
  const [isDemo, setIsDemo]     = useState(false);

  // Add/edit modal state
  const [modal, setModal]   = useState(null); // null | { mode:'add'|'edit', catId, item }
  const [form, setForm]     = useState(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { loadMenu(); }, [shopId]);

  const loadMenu = async () => {
    try {
      const [cRes, iRes] = await Promise.all([
        menuApi.getCategories(shopId),
        menuApi.getItems(shopId),
      ]);
      const cats = cRes.data.data || [];
      const items = iRes.data.data || [];
      if (cats.length) {
        const merged = cats.map(c => ({
          ...c,
          items: items.filter(i => i.categoryId === c.id),
        }));
        setCats(merged);
        setIsDemo(false);
      }
    } catch { setIsDemo(true); }
  };

  const toggleAvail = async (catId, itemId, current) => {
    setCats(prev => prev.map(c => c.id !== catId ? c : {
      ...c,
      items: c.items.map(i => i.id !== itemId ? i : { ...i, available: !i.available })
    }));
    try { await menuApi.toggleAvail(itemId, !current); } catch {}
  };

  const deleteItem = async (catId, item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    setCats(prev => prev.map(c => c.id !== catId ? c : { ...c, items: c.items.filter(i => i.id !== item.id) }));
    try { await menuApi.deleteItem(item.id); } catch {}
  };

  const openAdd = (catId) => {
    setForm({ ...EMPTY_ITEM, categoryId: catId, shopId });
    setModal({ mode:'add', catId });
  };

  const openEdit = (catId, item) => {
    setForm({ name:item.name, desc:item.desc||item.description||'', price:String(item.price), veg:item.veg??true, spicy:!!item.spicy, popular:!!item.popular, categoryId:catId, shopId });
    setModal({ mode:'edit', catId, item });
  };

  const saveItem = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return;
    setSaving(true);
    const payload = { ...form, price: parseFloat(form.price) };
    try {
      if (modal.mode === 'edit') {
        await menuApi.updateItem(modal.item.id, payload);
        setCats(prev => prev.map(c => c.id !== modal.catId ? c : {
          ...c, items: c.items.map(i => i.id !== modal.item.id ? i : { ...i, ...payload })
        }));
      } else {
        const res = await menuApi.createItem(payload);
        const newItem = res.data.data || { ...payload, id: `local_${Date.now()}` };
        setCats(prev => prev.map(c => c.id !== modal.catId ? c : { ...c, items: [...c.items, newItem] }));
      }
    } catch {
      // Demo mode: update locally
      if (modal.mode === 'edit') {
        setCats(prev => prev.map(c => c.id !== modal.catId ? c : {
          ...c, items: c.items.map(i => i.id !== modal.item.id ? i : { ...i, ...payload })
        }));
      } else {
        setCats(prev => prev.map(c => c.id !== modal.catId ? c : {
          ...c, items: [...c.items, { ...payload, id:`local_${Date.now()}` }]
        }));
      }
    }
    setSaving(false);
    setModal(null);
  };

  const filteredCats = categories.map(c => ({
    ...c,
    items: c.items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
  })).filter(c => !selCat || c.id === selCat);

  return (
    <div className="page-content">
      {error && <div className="demo-notice" style={{background:'var(--red-bg)',borderColor:'#FCA5A5',color:'var(--red)'}}>⚠ {error}</div>}

      {/* Top bar */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Menu</h1>
          <p className="page-subtitle">{categories.reduce((n,c) => n + c.items.length, 0)} items across {categories.length} categories</p>
        </div>
        <div className="page-header-actions">
          <div className="topbar-search" style={{width:240}}>
            <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--gray-400)',pointerEvents:'none'}}/>
            <input style={{paddingLeft:32,paddingRight:12,height:36,border:'1px solid var(--gray-200)',borderRadius:8,fontSize:13,width:'100%',outline:'none'}}
              placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="seg-control" style={{marginBottom:16,flexWrap:'wrap',gap:4}}>
        <button className={`seg-btn${!selCat?' is-active':''}`} onClick={() => setSelCat(null)}>All</button>
        {categories.map(c => (
          <button key={c.id} className={`seg-btn${selCat===c.id?' is-active':''}`} onClick={() => setSelCat(c.id)}>
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      {/* Category cards */}
      {filteredCats.map(cat => (
        <div key={cat.id} className="card" style={{marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',userSelect:'none'}}
            onClick={() => setExpanded(e => ({ ...e, [cat.id]: !e[cat.id] }))}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:20}}>{cat.emoji}</span>
              <div>
                <div className="card-title">{cat.name}</div>
                <div className="card-subtitle">{cat.items.length} items</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button className="btn btn-secondary" style={{height:32,fontSize:12}} onClick={e=>{e.stopPropagation();openAdd(cat.id);}}>
                <Plus size={12}/> Add item
              </button>
              <span style={{color:'var(--gray-400)',fontSize:18}}>{expanded[cat.id]?'−':'+'}</span>
            </div>
          </div>

          {expanded[cat.id] && (
            <div style={{marginTop:12,borderTop:'1px solid var(--gray-100)',paddingTop:8}}>
              {cat.items.length === 0 ? (
                <p style={{textAlign:'center',color:'var(--gray-400)',padding:'20px 0',fontSize:13}}>No items yet. <button style={{color:'var(--green-dark)',background:'none',border:'none',cursor:'pointer',fontWeight:600}} onClick={()=>openAdd(cat.id)}>Add first item →</button></p>
              ) : cat.items.map(item => (
                <div key={item.id} style={{display:'flex',alignItems:'center',gap:14,padding:'10px 0',borderBottom:'1px solid var(--gray-100)'}}>
                  {/* Veg/non-veg dot */}
                  <div style={{width:12,height:12,borderRadius:2,border:`2px solid ${item.veg!==false?'#1D9E75':'#DC2626'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <div style={{width:5,height:5,borderRadius:1,background:item.veg!==false?'#1D9E75':'#DC2626'}}/>
                  </div>

                  {/* Name + desc */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontSize:14,fontWeight:600}}>{item.name}</span>
                      {item.tag && TAG_CFG[item.tag] && <span className={`menu-tag ${TAG_CFG[item.tag].cls}`}>{TAG_CFG[item.tag].label}</span>}
                    </div>
                    {(item.desc||item.description) && <div style={{fontSize:12,color:'var(--gray-400)',marginTop:1}} className="text-clamp">{item.desc||item.description}</div>}
                  </div>

                  <span style={{fontSize:14,fontWeight:700,color:'var(--gray-900)',flexShrink:0}}>₹{item.price}</span>

                  {/* Available toggle */}
                  <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',flexShrink:0}}>
                    <div onClick={()=>toggleAvail(cat.id,item.id,item.available)}
                      style={{width:34,height:20,borderRadius:10,background:item.available?'#1D9E75':'#D1D5DB',transition:'background .2s',position:'relative',cursor:'pointer'}}>
                      <div style={{position:'absolute',top:2,left:item.available?'calc(100% - 18px)':2,width:16,height:16,borderRadius:8,background:'white',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
                    </div>
                    <span style={{fontSize:11,color:'var(--gray-500)',width:36}}>{item.available?'On':'Off'}</span>
                  </label>

                  {/* Actions */}
                  <div style={{display:'flex',gap:6}}>
                    <button style={{background:'var(--gray-100)',border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer'}} onClick={()=>openEdit(cat.id,item)} title="Edit"><Edit2 size={13}/></button>
                    <button style={{background:'var(--red-bg)',border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',color:'var(--red)'}} onClick={()=>deleteItem(cat.id,item)} title="Delete"><Trash2 size={13}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Add/Edit Modal */}
      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
          <div style={{background:'#fff',borderRadius:16,padding:28,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:700}}>{modal.mode==='edit'?'Edit item':'Add new item'}</h2>
              <button style={{background:'var(--gray-100)',border:'none',borderRadius:8,padding:'6px 8px',cursor:'pointer'}} onClick={()=>setModal(null)}><X size={16}/></button>
            </div>
            <form onSubmit={saveItem} style={{display:'flex',flexDirection:'column',gap:14}}>
              <div className="field">
                <label className="field-label">Item name *</label>
                <input className="field-input" placeholder="Paneer Tikka" value={form.name} onChange={e=>set('name',e.target.value)} required/>
              </div>
              <div className="field">
                <label className="field-label">Description</label>
                <textarea className="field-input" style={{height:72,resize:'vertical',paddingTop:10}} placeholder="Brief description of the dish" value={form.desc} onChange={e=>set('desc',e.target.value)}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="field">
                  <label className="field-label">Price (₹) *</label>
                  <input className="field-input" type="number" min="1" placeholder="280" value={form.price} onChange={e=>set('price',e.target.value)} required/>
                </div>
                <div className="field">
                  <label className="field-label">Type</label>
                  <div style={{display:'flex',gap:8,paddingTop:8}}>
                    {[{v:true,l:'🟢 Veg'},{v:false,l:'🔴 Non-veg'}].map(({v,l})=>(
                      <button key={l} type="button"
                        style={{flex:1,height:36,borderRadius:8,border:`1.5px solid ${form.veg===v?'#1D9E75':'#E5E7EB'}`,background:form.veg===v?'#E1F5EE':'#fff',fontSize:12,fontWeight:600,cursor:'pointer',color:form.veg===v?'#0F6E56':'#6B7280'}}
                        onClick={()=>set('veg',v)}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{display:'flex',gap:12}}>
                {[['spicy','🌶 Spicy'],['popular','⭐ Popular']].map(([k,l])=>(
                  <label key={k} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:13,fontWeight:500}}>
                    <input type="checkbox" checked={!!form[k]} onChange={e=>set(k,e.target.checked)} style={{accentColor:'#1D9E75'}}/>
                    {l}
                  </label>
                ))}
              </div>
              <div style={{display:'flex',gap:10,marginTop:4}}>
                <button type="button" className="btn btn-secondary" style={{flex:1}} onClick={()=>setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{flex:1}} disabled={saving}>
                  {saving ? 'Saving…' : modal.mode==='edit' ? 'Save changes' : 'Add item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
