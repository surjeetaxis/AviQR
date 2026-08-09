import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Video, Box, ScanLine, Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useActiveShopId } from '../hooks/useActiveShopId.js';
import { menuApi } from '../api/index.js';
import MenuItemModal, { EMPTY_MENU_ITEM } from '../components/shared/MenuItemModal.jsx';
import './Menu.css';

// ── Constants ──────────────────────────────────────────────────────────────────

const TAG_CFG = {
  bestseller: { label: '⭐ Bestseller', cls: 'tag-bestseller' },
  spicy:      { label: '🌶 Spicy',      cls: 'tag-spicy' },
  veg:        { label: '🌿 Veg',        cls: 'tag-veg' },
};

// ── Veg/Non-veg dot ────────────────────────────────────────────────────────────

function VegDot({ veg }) {
  const color = veg !== false ? '#1D9E75' : '#DC2626';
  return (
    <div style={{ width: 12, height: 12, borderRadius: 2, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ width: 5, height: 5, borderRadius: 1, background: color }} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Menu() {
  const { user } = useAuth();
  const nav = useNavigate();
  const shopId = useActiveShopId();

  if (!shopId) return (
    <div style={{ textAlign:'center', padding:'60px 24px', color:'#6B7280' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🍽️</div>
      <h2 style={{ fontSize:20, fontWeight:700, color:'#111827', marginBottom:8 }}>No restaurant yet</h2>
      <p style={{ fontSize:14, marginBottom:24 }}>Complete the setup to start adding your menu.</p>
      <button onClick={() => nav('/')} style={{ padding:'10px 24px', background:'#1D9E75', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>
        Complete setup →
      </button>
    </div>
  );

  const [categories, setCats]   = useState([]);
  const [expanded, setExpanded] = useState({});
  const [search, setSearch]     = useState('');
  const [selCat, setSelCat]     = useState(null);
  const [error, setError]       = useState(null);

  const [modal, setModal]   = useState(null);

  // Category modal
  const [catModal,  setCatModal]  = useState(false);
  const [catForm,   setCatForm]   = useState({ name:'', emoji:'🍽️' });
  const [catSaving, setCatSaving] = useState(false);
  const [editCatId, setEditCatId] = useState(null);

  // Import (CSV/Excel) modal
  const [importOpen,     setImportOpen]     = useState(false);
  const [importPickedFile, setImportPickedFile] = useState(null);
  const [importing,      setImporting]      = useState(false);
  const [importResult,   setImportResult]   = useState(null);
  const [importError,    setImportError]    = useState('');
  const [downloadingSample, setDownloadingSample] = useState('');

  useEffect(() => { loadMenu(); }, [shopId]);

  const loadMenu = async () => {
    try {
      const [cRes, iRes] = await Promise.all([
        menuApi.getCategories(shopId),
        menuApi.getAllItems(shopId),
      ]);
      const cats  = cRes.data.data || [];
      const items = (iRes.data.data?.content ?? iRes.data.data ?? []);
      if (cats.length) {
        setCats(cats.map(c => ({ ...c, items: items.filter(i => i.categoryId === c.id) })));
        setExpanded(Object.fromEntries(cats.map(c => [c.id, true])));
      }
    } catch (e) {
      setError(e.response?.data?.message || null);
    }
  };

  const openAddCat = () => {
    setCatForm({ name:'', emoji:'🍽️' });
    setEditCatId(null);
    setCatModal(true);
  };

  const openEditCat = (cat) => {
    setCatForm({ name: cat.name, emoji: cat.emoji || '🍽️' });
    setEditCatId(cat.id);
    setCatModal(true);
  };

  const saveCat = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    setCatSaving(true);
    try {
      if (editCatId) {
        await menuApi.updateCategory(editCatId, { ...catForm, shopId });
        setCats(p => p.map(c => c.id === editCatId ? { ...c, ...catForm } : c));
      } else {
        const res = await menuApi.createCategory({ ...catForm, shopId });
        const newCat = res.data.data || { ...catForm, id: `local_${Date.now()}`, items: [] };
        if (!newCat.items) newCat.items = [];
        setCats(p => [...p, newCat]);
        setExpanded(e => ({ ...e, [newCat.id]: true }));
      }
      setCatModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save category');
    } finally { setCatSaving(false); }
  };

  const deleteCat = async (cat) => {
    if (!confirm(`Delete category "${cat.name}" and all its items?`)) return;
    try {
      await menuApi.deleteCategory(cat.id);
      setCats(p => p.filter(c => c.id !== cat.id));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const openImport = () => {
    setImportPickedFile(null); setImportResult(null); setImportError('');
    setImportOpen(true);
  };

  const runImport = async () => {
    if (!importPickedFile) return;
    setImporting(true); setImportError(''); setImportResult(null);
    try {
      const res = await menuApi.importFile(shopId, importPickedFile);
      setImportResult(res.data.data);
      loadMenu();
    } catch (err) {
      setImportError(err.response?.data?.message || 'Import failed. Please check the file and try again.');
    } finally { setImporting(false); }
  };

  const downloadSample = async (format) => {
    setDownloadingSample(format);
    try { await menuApi.downloadSample(format); }
    catch { alert('Could not download sample file.'); }
    finally { setDownloadingSample(''); }
  };

  const toggleAvail = async (catId, itemId, current) => {
    setCats(p => p.map(c => c.id !== catId ? c : {
      ...c, items: c.items.map(i => i.id !== itemId ? i : { ...i, available: !i.available })
    }));
    try { await menuApi.toggleAvail(itemId, !current); } catch {}
  };

  const deleteItem = async (catId, item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    setCats(p => p.map(c => c.id !== catId ? c : { ...c, items: c.items.filter(i => i.id !== item.id) }));
    try { await menuApi.deleteItem(item.id); } catch {}
  };

  const openAdd = (catId) => {
    setModal({ mode: 'add', catId, initialForm: { ...EMPTY_MENU_ITEM, categoryId: catId, shopId } });
  };

  const openEdit = (catId, item) => {
    const mType = item.mediaType || (item.videoUrl ? 'VIDEO' : item.modelUrl ? 'MODEL_3D' : item.imageUrl ? 'IMAGE' : 'NONE');
    setModal({
      mode: 'edit', catId, item,
      initialForm: {
        name: item.name,
        desc: item.desc || item.description || '',
        price: String(item.price),
        veg: item.veg ?? true,
        spicy: !!item.spicy,
        popular: !!item.popular,
        categoryId: catId,
        shopId,
        nameHi: item.nameHi || '', nameTa: item.nameTa || '',
        nameKn: item.nameKn || '', nameTe: item.nameTe || '', nameMl: item.nameMl || '',
        stockQty: item.stockQty || '',
        trackStock: !!item.trackStock,
        imageUrl:  item.imageUrl  || '',
        videoUrl:  item.videoUrl  || '',
        modelUrl:  item.modelUrl  || '',
        mediaType: mType,
      },
    });
  };

  const saveItem = async (payload) => {
    const apiPayload = { ...payload, description: payload.desc, price: parseFloat(payload.price) };
    try {
      if (modal.mode === 'edit') {
        await menuApi.updateItem(modal.item.id, apiPayload);
        setCats(p => p.map(c => c.id !== modal.catId ? c : {
          ...c, items: c.items.map(i => i.id !== modal.item.id ? i : { ...i, ...apiPayload })
        }));
      } else {
        await menuApi.createItem(apiPayload);
        await loadMenu();
      }
      setModal(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save item. Please try again.');
    }
  };

  const filteredCats = categories.map(c => ({
    ...c,
    items: c.items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())),
  })).filter(c => !selCat || c.id === selCat);

  const totalItems = categories.reduce((n, c) => n + c.items.length, 0);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="page-content">
      {error && (
        <div className="demo-notice" style={{ background: 'var(--red-bg)', borderColor: '#FCA5A5', color: 'var(--red)' }}>
          ⚠ {error}
        </div>
      )}

      {/* Top bar */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Menu</h1>
          <p className="page-subtitle">{totalItems} items across {categories.length} categories</p>
        </div>
        <div className="page-header-actions">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
            <input
              style={{ paddingLeft: 32, paddingRight: 12, height: 36, border: '1px solid var(--gray-200)', borderRadius: 8, fontSize: 13, width: 220, outline: 'none' }}
              placeholder="Search items…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary" onClick={() => nav('/menu/scan')}><ScanLine size={14} /> Scan Menu</button>
          <button className="btn btn-secondary" onClick={openImport}><Upload size={14} /> Import CSV/Excel</button>
          <button className="btn btn-secondary" onClick={openAddCat}><Plus size={14} /> Add category</button>
        </div>
      </div>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="seg-control" style={{ flexWrap: 'wrap', gap: 4 }}>
          <button className={`seg-btn${!selCat ? ' is-active' : ''}`} onClick={() => setSelCat(null)}>All</button>
          {categories.map(c => (
            <button key={c.id} className={`seg-btn${selCat === c.id ? ' is-active' : ''}`} onClick={() => setSelCat(c.id)}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Empty state — no categories at all */}
      {categories.length === 0 && (
        <div style={{ textAlign:'center', padding:'64px 24px', background:'white', borderRadius:16, border:'2px dashed var(--gray-200)' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🍽️</div>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#111827', marginBottom:8 }}>No menu items yet</h2>
          <p style={{ fontSize:14, color:'var(--gray-500)', marginBottom:28, maxWidth:320, margin:'0 auto 28px' }}>
            Start by creating a category (e.g. "Starters", "Main Course"), then add dishes inside it.
          </p>
          <button className="btn btn-primary" style={{ fontSize:15, padding:'12px 28px' }} onClick={openAddCat}>
            <Plus size={16} /> Create first category
          </button>
        </div>
      )}

      {/* Category cards */}
      {filteredCats.map(cat => (
        <div key={cat.id} className="card" style={{ marginBottom: 12 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setExpanded(e => ({ ...e, [cat.id]: !e[cat.id] }))}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{cat.emoji}</span>
              <div>
                <div className="card-title">{cat.name}</div>
                <div className="card-subtitle">{cat.items.length} items</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-secondary" style={{ height: 32, fontSize: 12 }}
                onClick={e => { e.stopPropagation(); openAdd(cat.id); }}>
                <Plus size={12} /> Add item
              </button>
              <button className="btn btn-secondary" style={{ height: 32, fontSize: 12 }}
                onClick={e => { e.stopPropagation(); openEditCat(cat); }} title="Edit category">
                <Edit2 size={12} />
              </button>
              <button style={{ height:32, padding:'0 8px', background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:7, cursor:'pointer', color:'#DC2626', display:'flex', alignItems:'center' }}
                onClick={e => { e.stopPropagation(); deleteCat(cat); }} title="Delete category">
                <Trash2 size={12} />
              </button>
              <span style={{ color: 'var(--gray-400)', fontSize: 18 }}>{expanded[cat.id] ? '−' : '+'}</span>
            </div>
          </div>

          {expanded[cat.id] && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--gray-100)', paddingTop: 8 }}>
              {cat.items.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '20px 0', fontSize: 13 }}>
                  No items yet.{' '}
                  <button style={{ color: 'var(--green-dark)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => openAdd(cat.id)}>
                    Add first item →
                  </button>
                </p>
              ) : cat.items.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <VegDot veg={item.veg} />

                  {/* Thumbnail or media indicator */}
                  <div className={`item-thumb ${item.imageUrl ? 'has-thumb' : 'no-thumb'}`}>
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 14, color: 'var(--gray-300)' }}>🍽</span>
                    }
                  </div>

                  {/* Name + desc + media badges */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</span>
                      {item.tag && TAG_CFG[item.tag] && (
                        <span className={`menu-tag ${TAG_CFG[item.tag].cls}`}>{TAG_CFG[item.tag].label}</span>
                      )}
                      {(item.videoUrl || item.mediaType === 'VIDEO') && (
                        <span className="media-badge media-badge-video" title="Has video"><Video size={10} /> Video</span>
                      )}
                      {(item.modelUrl || item.mediaType === 'MODEL_3D') && (
                        <span className="media-badge media-badge-3d" title="Has 3D model"><Box size={10} /> 3D</span>
                      )}
                    </div>
                    {(item.desc || item.description) && (
                      <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 1 }} className="text-clamp">
                        {item.desc || item.description}
                      </div>
                    )}
                  </div>

                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)', flexShrink: 0 }}>₹{item.price}</span>

                  {/* Available toggle */}
                  <div
                    onClick={() => toggleAvail(cat.id, item.id, item.available)}
                    style={{ width: 34, height: 20, borderRadius: 10, background: item.available ? '#1D9E75' : '#D1D5DB', transition: 'background .2s', position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <div style={{ position: 'absolute', top: 2, left: item.available ? 'calc(100% - 18px)' : 2, width: 16, height: 16, borderRadius: 8, background: 'white', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ background: 'var(--gray-100)', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer' }} onClick={() => openEdit(cat.id, item)} title="Edit">
                      <Edit2 size={13} />
                    </button>
                    <button style={{ background: 'var(--red-bg)', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: 'var(--red)' }} onClick={() => deleteItem(cat.id, item)} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* ── Category Modal ── */}
      {catModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:400 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>{editCatId ? 'Edit category' : 'New category'}</h2>
              <button onClick={() => setCatModal(false)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={18}/></button>
            </div>
            <form onSubmit={saveCat} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="field">
                <label className="field-label">Category name *</label>
                <input className="field-input" autoFocus value={catForm.name}
                  onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Starters, Main Course, Beverages" />
              </div>
              <div className="field">
                <label className="field-label">Emoji</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
                  {['🍽️','🥗','🍛','🍜','🍕','🍔','🍱','🥤','🍰','🍺','🥘','🌮','🍣','🥪','🔥'].map(em => (
                    <button key={em} type="button" onClick={() => setCatForm(f => ({ ...f, emoji: em }))}
                      style={{ fontSize:22, padding:'4px 6px', border:`2px solid ${catForm.emoji===em?'var(--green)':'transparent'}`, borderRadius:8, cursor:'pointer', background:catForm.emoji===em?'var(--green-light)':'transparent' }}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:4 }}>
                <button type="button" className="btn btn-secondary" style={{ flex:1 }} onClick={() => setCatModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex:1 }} disabled={catSaving || !catForm.name.trim()}>
                  {catSaving ? 'Saving…' : editCatId ? 'Save changes' : 'Create category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Import CSV/Excel Modal ── */}
      {importOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}
          onClick={() => setImportOpen(false)}>
          <div style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>Import menu from CSV/Excel</h2>
              <button onClick={() => setImportOpen(false)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={18}/></button>
            </div>
            <p style={{ fontSize:13, color:'var(--gray-500)', marginBottom:18 }}>
              Bulk-add categories and items from a spreadsheet. Columns: <b>Category, Item Name, Description, Price, Veg, Spicy, Popular</b> (only the first three are required).
            </p>

            <div style={{ display:'flex', gap:10, marginBottom:20 }}>
              <button type="button" className="btn btn-secondary" style={{ flex:1, fontSize:12.5 }}
                disabled={downloadingSample === 'csv'} onClick={() => downloadSample('csv')}>
                <Download size={13} /> {downloadingSample === 'csv' ? 'Downloading…' : 'Sample CSV'}
              </button>
              <button type="button" className="btn btn-secondary" style={{ flex:1, fontSize:12.5 }}
                disabled={downloadingSample === 'xlsx'} onClick={() => downloadSample('xlsx')}>
                <Download size={13} /> {downloadingSample === 'xlsx' ? 'Downloading…' : 'Sample Excel'}
              </button>
            </div>

            {!importResult && (
              <>
                <label
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'28px 16px', border:'2px dashed var(--gray-200)', borderRadius:12, cursor:'pointer', marginBottom:16, textAlign:'center' }}>
                  <FileSpreadsheet size={26} style={{ color:'var(--gray-400)' }} />
                  <span style={{ fontSize:13, fontWeight:600 }}>
                    {importPickedFile ? importPickedFile.name : 'Click to choose a .csv or .xlsx file'}
                  </span>
                  <input type="file" accept=".csv,.xlsx,.xls" style={{ display:'none' }}
                    onChange={e => { setImportPickedFile(e.target.files?.[0] || null); setImportError(''); }} />
                </label>

                {importError && (
                  <div className="demo-notice" style={{ background:'var(--red-bg)', borderColor:'#FCA5A5', color:'var(--red)', marginBottom:16 }}>
                    ⚠ {importError}
                  </div>
                )}

                <div style={{ display:'flex', gap:10 }}>
                  <button type="button" className="btn btn-secondary" style={{ flex:1 }} onClick={() => setImportOpen(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" style={{ flex:1 }} disabled={!importPickedFile || importing} onClick={runImport}>
                    {importing ? 'Importing…' : 'Import'}
                  </button>
                </div>
              </>
            )}

            {importResult && (
              <>
                <div className="demo-notice" style={{ background:'var(--green-light)', borderColor:'var(--green-mid)', color:'var(--green-darker)', display:'flex', alignItems:'center', gap:8, marginBottom: importResult.errors?.length ? 12 : 20 }}>
                  <CheckCircle2 size={16} /> Added {importResult.itemsCreated} item{importResult.itemsCreated === 1 ? '' : 's'}
                  {importResult.categoriesCreated > 0 ? ` and ${importResult.categoriesCreated} new categor${importResult.categoriesCreated === 1 ? 'y' : 'ies'}` : ''}.
                </div>

                {importResult.errors?.length > 0 && (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12.5, fontWeight:700, color:'var(--gray-700)', marginBottom:6 }}>
                      <AlertTriangle size={13} style={{ color:'#D97706' }} /> {importResult.errors.length} row{importResult.errors.length === 1 ? '' : 's'} skipped
                    </div>
                    <div style={{ maxHeight:140, overflowY:'auto', border:'1px solid var(--gray-100)', borderRadius:8, padding:'6px 10px' }}>
                      {importResult.errors.map((e, i) => (
                        <div key={i} style={{ fontSize:12, color:'var(--gray-500)', padding:'3px 0' }}>Row {e.row}: {e.message}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', gap:10 }}>
                  <button type="button" className="btn btn-secondary" style={{ flex:1 }}
                    onClick={() => { setImportResult(null); setImportPickedFile(null); }}>Import another file</button>
                  <button type="button" className="btn btn-primary" style={{ flex:1 }} onClick={() => setImportOpen(false)}>Done</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <MenuItemModal
          title={modal.mode === 'edit' ? 'Edit item' : 'Add new item'}
          submitLabel={modal.mode === 'edit' ? 'Save changes' : 'Add item'}
          initialForm={modal.initialForm}
          onSave={saveItem}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}