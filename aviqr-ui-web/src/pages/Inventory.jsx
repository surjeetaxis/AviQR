import { useState, useEffect, useCallback } from 'react';
import {
  Package, AlertTriangle, RefreshCw, Edit2, Check, X,
  Bell, Download, Plus, Search, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useActiveShopId } from '../hooks/useActiveShopId.js';
import { inventoryApi, menuApi, rawMaterialApi } from '../api/index.js';

const TABS = [
  { key:'finished', label:'Finished Goods',  desc:'Stock per menu item' },
  { key:'raw',      label:'Raw Materials',   desc:'Ingredients & stock' },
];

export default function Inventory() {
  const { user } = useAuth();
  const shopId   = useActiveShopId();
  const [tab, setTab] = useState('finished');

  // ── Finished goods ───────────────────────────────────────────────────────
  const [items,    setItems]   = useState([]);   // merged menu+stock rows
  const [filter,   setFilter]  = useState('ALL');
  const [search,   setSearch]  = useState('');
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState(null);

  // Inline edit state
  const [editingId,    setEditingId]   = useState(null); // menuItemId being edited
  const [editQty,      setEditQty]     = useState('');
  const [editThreshId, setEditThreshId]= useState(null);
  const [editThreshVal,setEditThreshV] = useState('');

  // ── Raw materials ────────────────────────────────────────────────────────
  const [rawMats,      setRaw]       = useState([]);
  const [rawLoading,   setRawLoad]   = useState(false);
  const [rawSearch,    setRawSearch] = useState('');
  const [adjustModal,  setAdjust]    = useState(null);
  const [adjustDelta,  setDelta]     = useState('');
  const [adjustReason, setReason]    = useState('PURCHASE');
  const EMPTY_MAT = { name:'', unit:'kg', currentStock:'0', minStockLevel:'0', costPerUnit:'0', supplier:'' };
  const [matModal, setMatModal] = useState(false);
  const [matForm,  setMatForm]  = useState(EMPTY_MAT);
  const [matSaving,setMatSave]  = useState(false);

  // ── Load finished goods: merge menu items with stock records ─────────────
  const load = useCallback(async () => {
    if (!shopId) { setLoading(false); return; }
    setError(null);
    try {
      const [cRes, iRes, sRes] = await Promise.allSettled([
        menuApi.getCategories(shopId),
        menuApi.getItems(shopId),
        inventoryApi.getStock(shopId),
      ]);

      const cats      = cRes.status === 'fulfilled' ? (cRes.value.data.data || []) : [];
      const menuItems = iRes.status === 'fulfilled'
        ? (iRes.value.data.data?.content ?? iRes.value.data.data ?? []) : [];
      const stockRows = sRes.status === 'fulfilled' ? (sRes.value.data.data || []) : [];

      const catMap   = Object.fromEntries(cats.map(c => [c.id, c]));
      const stockMap = Object.fromEntries(stockRows.map(s => [String(s.menuItemId), s]));

      // Every menu item gets a row; stock record merged in if it exists
      const merged = menuItems.map(m => {
        const s = stockMap[String(m.id)] || {};
        return {
          menuItemId:        m.id,
          stockRecordId:     s.id || null,
          name:              m.name,
          veg:               m.veg,
          price:             m.price || 0,
          categoryName:      catMap[m.categoryId]?.name || '',
          stockQty:          s.stockQty ?? null,
          lowStockThreshold: s.lowStockThreshold ?? 5,
          trackStock:        s.trackStock ?? false,
        };
      });

      setItems(merged);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  const loadRaw = useCallback(async () => {
    if (!shopId) return;
    setRawLoad(true);
    try {
      const res = await rawMaterialApi.getByShop(shopId);
      setRaw(res.data.data || []);
    } catch {}
    finally { setRawLoad(false); }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'raw') loadRaw(); }, [tab, loadRaw]);

  // ── Save stock qty ───────────────────────────────────────────────────────
  const saveQty = async (item) => {
    const qty = parseInt(editQty, 10);
    if (isNaN(qty) || qty < 0) { setEditingId(null); return; }
    try {
      await inventoryApi.setStock(item.menuItemId, { stockQty: qty, trackStock: true, shopId });
      setItems(prev => prev.map(i =>
        i.menuItemId === item.menuItemId ? { ...i, stockQty: qty, trackStock: true } : i
      ));
    } catch (e) { alert(e.response?.data?.message || 'Failed to update stock'); }
    setEditingId(null);
  };

  // ── Save threshold ───────────────────────────────────────────────────────
  const saveThreshold = async (item) => {
    const val = parseInt(editThreshVal, 10);
    if (isNaN(val) || val < 0) { setEditThreshId(null); return; }
    try {
      await inventoryApi.setStock(item.menuItemId, { lowStockThreshold: val, shopId });
      setItems(prev => prev.map(i =>
        i.menuItemId === item.menuItemId ? { ...i, lowStockThreshold: val } : i
      ));
    } catch (e) { alert(e.response?.data?.message || 'Failed to update threshold'); }
    setEditThreshId(null);
  };

  // ── Toggle tracking on/off ───────────────────────────────────────────────
  const toggleTracking = async (item) => {
    const next = !item.trackStock;
    try {
      await inventoryApi.setStock(item.menuItemId, {
        trackStock: next,
        stockQty:   item.stockQty ?? 0,
        shopId,
      });
      setItems(prev => prev.map(i =>
        i.menuItemId === item.menuItemId ? { ...i, trackStock: next } : i
      ));
    } catch (e) { alert(e.response?.data?.message || 'Failed to toggle tracking'); }
  };

  // ── Raw material helpers ─────────────────────────────────────────────────
  const saveMaterial = async () => {
    if (!matForm.name.trim()) return;
    setMatSave(true);
    try {
      const res = await rawMaterialApi.create({
        shopId,
        ...matForm,
        currentStock:  parseFloat(matForm.currentStock  || 0),
        minStockLevel: parseFloat(matForm.minStockLevel || 0),
        costPerUnit:   parseFloat(matForm.costPerUnit   || 0),
      });
      setRaw(prev => [...prev, res.data.data || { ...matForm, id: `local_${Date.now()}` }]);
      setMatModal(false);
      setMatForm(EMPTY_MAT);
    } catch (e) { alert(e.response?.data?.message || 'Failed to save'); }
    finally { setMatSave(false); }
  };

  const doAdjust = async () => {
    if (!adjustModal || !adjustDelta) return;
    const delta = parseFloat(adjustDelta);
    if (isNaN(delta)) return;
    try {
      await rawMaterialApi.adjustStock(adjustModal.id, delta, adjustReason);
      setRaw(prev => prev.map(m => m.id === adjustModal.id
        ? { ...m, currentStock: (parseFloat(m.currentStock || 0) + delta).toFixed(3) }
        : m));
      setAdjust(null); setDelta(''); setReason('PURCHASE');
    } catch (e) { alert('Adjust failed: ' + (e.response?.data?.message || e.message)); }
  };

  // ── CSV export ───────────────────────────────────────────────────────────
  const exportCsv = () => {
    const rows = [
      ['Item', 'Category', 'Tracking', 'Stock', 'Threshold', 'Status'],
      ...items.map(i => {
        const qty = i.stockQty ?? 0;
        const status = !i.trackStock ? 'Not tracked' : qty <= 0 ? 'Out' : qty <= i.lowStockThreshold ? 'Low' : 'OK';
        return [i.name, i.categoryName, i.trackStock ? 'Yes' : 'No', qty, i.lowStockThreshold, status];
      }),
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type:'text/csv' }));
    a.download = `inventory_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  // ── Derived values ───────────────────────────────────────────────────────
  const tracked   = items.filter(i => i.trackStock);
  const outCount  = tracked.filter(i => (i.stockQty ?? 0) <= 0).length;
  const lowCount  = tracked.filter(i => (i.stockQty ?? 0) > 0 && (i.stockQty ?? 0) <= i.lowStockThreshold).length;
  const rawLow    = rawMats.filter(m => parseFloat(m.currentStock || 0) <= parseFloat(m.minStockLevel || 0));

  const filtItems = items.filter(i => {
    const qty = i.stockQty ?? 0;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
                                 || i.categoryName.toLowerCase().includes(search.toLowerCase());
    if (filter === 'TRACKING') return i.trackStock && matchSearch;
    if (filter === 'OUT')      return i.trackStock && qty <= 0 && matchSearch;
    if (filter === 'LOW')      return i.trackStock && qty > 0 && qty <= i.lowStockThreshold && matchSearch;
    return matchSearch;
  });

  const filtRaw = rawMats.filter(m => !rawSearch || m.name.toLowerCase().includes(rawSearch.toLowerCase()));
  const stockColor = (cur, min) =>
    parseFloat(cur || 0) <= parseFloat(min || 0)       ? '#DC2626'
    : parseFloat(cur || 0) <= parseFloat(min || 0)*1.5 ? '#D97706'
    : '#1D9E75';

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Real-time stock across menu items and raw materials</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => { load(); if (tab === 'raw') loadRaw(); }}>
            <RefreshCw size={14}/> Refresh
          </button>
          {tab === 'finished' && (
            <button className="btn btn-secondary" onClick={exportCsv}>
              <Download size={14}/> Export
            </button>
          )}
          {tab === 'raw' && (
            <button className="btn btn-primary" onClick={() => { setMatForm(EMPTY_MAT); setMatModal(true); }}>
              <Plus size={14}/> Add material
            </button>
          )}
        </div>
      </div>

      {/* Alert banners */}
      {outCount > 0 && (
        <div style={{ display:'flex', gap:8, alignItems:'center', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#DC2626', marginBottom:10 }}>
          <AlertTriangle size={14}/>
          <strong>{outCount} item{outCount > 1 ? 's' : ''} out of stock</strong> — customers cannot order these right now
        </div>
      )}
      {(lowCount > 0 || rawLow.length > 0) && (
        <div style={{ display:'flex', gap:8, alignItems:'center', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#92400E', marginBottom:10 }}>
          <Bell size={14}/>
          {lowCount > 0 && <span><strong>{lowCount} menu item{lowCount > 1 ? 's' : ''}</strong> running low</span>}
          {lowCount > 0 && rawLow.length > 0 && ' · '}
          {rawLow.length > 0 && <span><strong>{rawLow.length} ingredient{rawLow.length > 1 ? 's' : ''}</strong> below reorder level ({rawLow.slice(0,3).map(m => m.name).join(', ')}{rawLow.length > 3 ? '…' : ''})</span>}
        </div>
      )}

      {/* Tabs */}
      <div className="filter-chips" style={{ marginBottom:16 }}>
        {TABS.map(t => (
          <button key={t.key} className={`chip${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── FINISHED GOODS ──────────────────────────────────────────────── */}
      {tab === 'finished' && (
        <>
          {/* KPI cards */}
          <div className="kpi-grid" style={{ marginBottom:16 }}>
            {[
              { label:'Total items',   value: items.length,                                  color:'#1D9E75' },
              { label:'Tracking',      value: tracked.length,                                color:'#7C3AED', onClick:() => setFilter('TRACKING') },
              { label:'Out of stock',  value: outCount,  color: outCount  > 0 ? '#DC2626' : '#1D9E75', onClick:() => setFilter('OUT') },
              { label:'Low stock',     value: lowCount,  color: lowCount  > 0 ? '#D97706' : '#1D9E75', onClick:() => setFilter('LOW') },
            ].map(({ label, value, color, onClick }) => (
              <div key={label} className="card" style={{ textAlign:'center', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
                <div style={{ fontSize:26, fontWeight:800, color }}>{loading ? '…' : value}</div>
                <div style={{ fontSize:12, color:'var(--gray-500)', marginTop:3 }}>{label}</div>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#92400E', marginBottom:14 }}>
              ⚠ {error}
            </div>
          )}

          {/* Filter + search */}
          <div style={{ display:'flex', gap:10, marginBottom:12, alignItems:'center', flexWrap:'wrap' }}>
            <div className="filter-chips" style={{ margin:0 }}>
              {[['ALL','All'],['TRACKING','Tracked'],['LOW','Low stock'],['OUT','Out of stock']].map(([k,l]) => (
                <button key={k} className={`chip${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>
            <div style={{ position:'relative', flex:1, minWidth:180 }}>
              <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)', pointerEvents:'none' }}/>
              <input className="field-input" style={{ paddingLeft:32, height:36, width:'100%' }}
                placeholder="Search items or category…" value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--gray-50)', fontSize:12, fontWeight:600, color:'var(--gray-500)' }}>
                  {['Menu Item','Category','Tracking','Stock Qty','Threshold','Status','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>
                    <div className="spinner" style={{ margin:'0 auto 8px' }}/>Loading…
                  </td></tr>
                ) : filtItems.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)', fontSize:13 }}>
                    <Package size={28} style={{ opacity:.3, display:'block', margin:'0 auto 8px' }}/>
                    {items.length === 0 ? 'No menu items found' : 'No items match this filter'}
                  </td></tr>
                ) : filtItems.map(item => {
                  const qty      = item.stockQty ?? 0;
                  const min      = item.lowStockThreshold;
                  const isOut    = item.trackStock && qty <= 0;
                  const isLow    = item.trackStock && qty > 0 && qty <= min;
                  const isEditing = editingId === String(item.menuItemId);
                  const isThresh  = editThreshId === String(item.menuItemId);

                  return (
                    <tr key={item.menuItemId}
                      style={{ borderTop:'1px solid var(--gray-100)', background: isOut ? '#FFF5F5' : isLow ? '#FFFBEB' : 'white' }}>

                      {/* Name + veg dot */}
                      <td style={{ padding:'11px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:9, fontWeight:700, color: item.veg !== false ? '#1D9E75' : '#DC2626', border:`1.5px solid ${item.veg !== false ? '#1D9E75' : '#DC2626'}`, borderRadius:2, padding:'1px 4px', flexShrink:0 }}>■</span>
                          <span style={{ fontWeight:600, fontSize:13 }}>{item.name}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding:'11px 14px', fontSize:12, color:'var(--gray-500)' }}>{item.categoryName || '—'}</td>

                      {/* Track toggle */}
                      <td style={{ padding:'11px 14px' }}>
                        <button onClick={() => toggleTracking(item)} title={item.trackStock ? 'Disable tracking' : 'Enable tracking'}
                          style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12, color: item.trackStock ? '#1D9E75' : '#9CA3AF', fontWeight:600, padding:0 }}>
                          {item.trackStock ? <ToggleRight size={22} color="#1D9E75"/> : <ToggleLeft size={22} color="#D1D5DB"/>}
                          {item.trackStock ? 'On' : 'Off'}
                        </button>
                      </td>

                      {/* Stock qty */}
                      <td style={{ padding:'11px 14px' }}>
                        {isEditing ? (
                          <input type="number" min="0" value={editQty} autoFocus
                            onChange={e => setEditQty(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveQty(item); if (e.key === 'Escape') setEditingId(null); }}
                            style={{ width:70, height:30, border:'1.5px solid var(--green)', borderRadius:6, textAlign:'center', fontSize:13, padding:'0 6px' }}/>
                        ) : (
                          <span style={{ fontSize:15, fontWeight:800, color: isOut ? '#DC2626' : isLow ? '#D97706' : '#1D9E75' }}>
                            {item.stockQty ?? '—'}
                          </span>
                        )}
                      </td>

                      {/* Threshold */}
                      <td style={{ padding:'11px 14px' }}>
                        {!item.trackStock ? (
                          <span style={{ fontSize:12, color:'var(--gray-400)' }}>—</span>
                        ) : isThresh ? (
                          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                            <input type="number" min="0" value={editThreshVal} autoFocus
                              onChange={e => setEditThreshV(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveThreshold(item); if (e.key === 'Escape') setEditThreshId(null); }}
                              style={{ width:60, height:28, border:'1.5px solid var(--green)', borderRadius:6, textAlign:'center', fontSize:13, padding:'0 4px' }}/>
                            <button onClick={() => saveThreshold(item)} style={{ background:'var(--green)', color:'#fff', border:'none', borderRadius:5, width:24, height:24, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Check size={11}/></button>
                            <button onClick={() => setEditThreshId(null)} style={{ background:'var(--gray-100)', border:'none', borderRadius:5, width:24, height:24, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={11}/></button>
                          </div>
                        ) : (
                          <span style={{ fontSize:13, color:'var(--gray-600)', cursor:'pointer', borderBottom:'1px dashed var(--gray-300)' }}
                            title="Click to edit" onClick={() => { setEditThreshId(String(item.menuItemId)); setEditThreshV(String(min)); }}>
                            {min}
                          </span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td style={{ padding:'11px 14px' }}>
                        {!item.trackStock ? (
                          <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:999, background:'var(--gray-100)', color:'var(--gray-500)' }}>Not tracked</span>
                        ) : (
                          <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:999,
                            background: isOut ? '#FEE2E2' : isLow ? '#FEF3C7' : '#E1F5EE',
                            color:      isOut ? '#DC2626' : isLow ? '#D97706' : '#1D9E75' }}>
                            {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding:'11px 14px' }}>
                        {isEditing ? (
                          <div style={{ display:'flex', gap:5 }}>
                            <button onClick={() => saveQty(item)} style={{ background:'var(--green)', color:'white', border:'none', borderRadius:6, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Check size={13}/></button>
                            <button onClick={() => setEditingId(null)} style={{ background:'var(--gray-100)', border:'none', borderRadius:6, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13}/></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingId(String(item.menuItemId)); setEditQty(String(item.stockQty ?? 0)); }}
                            style={{ background:'var(--gray-100)', border:'none', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:12, color:'var(--gray-700)', display:'flex', alignItems:'center', gap:4 }}>
                            <Edit2 size={12}/> {item.trackStock ? 'Update qty' : 'Set qty'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── RAW MATERIALS ───────────────────────────────────────────────── */}
      {tab === 'raw' && (
        <>
          <div style={{ position:'relative', marginBottom:14 }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)', pointerEvents:'none' }}/>
            <input className="field-input" style={{ paddingLeft:32, height:38 }}
              placeholder="Search ingredients…" value={rawSearch} onChange={e => setRawSearch(e.target.value)}/>
          </div>

          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--gray-50)', fontSize:12, fontWeight:600, color:'var(--gray-500)' }}>
                  {['Ingredient','Unit','Current Stock','Min Level','Cost/Unit','Stock Value','Supplier','Adjust'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawLoading ? (
                  <tr><td colSpan={8} style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)' }}>Loading…</td></tr>
                ) : filtRaw.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding:'48px 0', textAlign:'center', color:'var(--gray-400)', fontSize:13 }}>
                    No raw materials yet —{' '}
                    <button onClick={() => { setMatForm(EMPTY_MAT); setMatModal(true); }}
                      style={{ background:'none', border:'none', color:'var(--green)', fontWeight:600, cursor:'pointer', fontSize:13, textDecoration:'underline' }}>add the first one</button>
                  </td></tr>
                ) : filtRaw.map(m => {
                  const cur = parseFloat(m.currentStock || 0);
                  const min = parseFloat(m.minStockLevel || 0);
                  const col = stockColor(cur, min);
                  const val = cur * parseFloat(m.costPerUnit || 0);
                  return (
                    <tr key={m.id} style={{ borderTop:'1px solid var(--gray-100)', background: cur <= min ? '#FFFBEB' : 'white' }}>
                      <td style={{ padding:'11px 14px', fontWeight:600, fontSize:13 }}>{m.name}</td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:'var(--gray-500)' }}>{m.unit}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ fontSize:15, fontWeight:800, color:col }}>{cur.toFixed(2)}</span>
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:13, color:'var(--gray-600)' }}>{min.toFixed(2)}</td>
                      <td style={{ padding:'11px 14px', fontSize:13, fontWeight:600 }}>₹{parseFloat(m.costPerUnit || 0).toFixed(2)}</td>
                      <td style={{ padding:'11px 14px', fontSize:13, fontWeight:600, color:'#2563EB' }}>₹{val.toLocaleString('en-IN', { maximumFractionDigits:0 })}</td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:'var(--gray-500)' }}>{m.supplier || '—'}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <button onClick={() => setAdjust(m)}
                          style={{ background: cur <= min ? '#FEF3C7' : 'var(--green-light)', color: cur <= min ? '#92400E' : 'var(--green-darker)', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                          ± Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {filtRaw.length > 0 && (
                <tfoot>
                  <tr style={{ background:'var(--gray-50)', fontWeight:700, fontSize:13 }}>
                    <td colSpan={5} style={{ padding:'10px 14px' }}>Total raw material value</td>
                    <td style={{ padding:'10px 14px', color:'#2563EB' }}>
                      ₹{rawMats.reduce((s, m) => s + parseFloat(m.currentStock || 0) * parseFloat(m.costPerUnit || 0), 0)
                        .toLocaleString('en-IN', { maximumFractionDigits:0 })}
                    </td>
                    <td colSpan={2}/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {/* Stock adjust modal */}
      {adjustModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:380 }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Adjust Stock — {adjustModal.name}</h3>
            <p style={{ fontSize:13, color:'var(--gray-500)', marginBottom:20 }}>
              Current: {parseFloat(adjustModal.currentStock || 0).toFixed(2)} {adjustModal.unit}
            </p>
            <div className="field" style={{ marginBottom:14 }}>
              <label className="field-label">Amount (+ to add, − to subtract)</label>
              <input className="field-input" type="number" step="0.01" placeholder="+5 or -2.5"
                value={adjustDelta} onChange={e => setDelta(e.target.value)} autoFocus/>
            </div>
            <div className="field" style={{ marginBottom:20 }}>
              <label className="field-label">Reason</label>
              <select className="field-input" value={adjustReason} onChange={e => setReason(e.target.value)}>
                <option value="PURCHASE">Purchase / delivery received</option>
                <option value="WASTAGE">Wastage / spoilage</option>
                <option value="CORRECTION">Stock count correction</option>
                <option value="TRANSFER">Transfer to/from another store</option>
              </select>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => { setAdjust(null); setDelta(''); setReason('PURCHASE'); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={doAdjust} disabled={!adjustDelta}>Apply adjustment</button>
            </div>
          </div>
        </div>
      )}

      {/* Add raw material modal */}
      {matModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1001, padding:16 }}>
          <div style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:440 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:16, fontWeight:700 }}>Add raw material</h3>
              <button onClick={() => setMatModal(false)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={18}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="field">
                <label className="field-label">Material name *</label>
                <input className="field-input" value={matForm.name}
                  onChange={e => setMatForm(f => ({ ...f, name:e.target.value }))} placeholder="e.g. Tomatoes" autoFocus/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="field">
                  <label className="field-label">Unit</label>
                  <select className="field-input" value={matForm.unit} onChange={e => setMatForm(f => ({ ...f, unit:e.target.value }))}>
                    {['kg','g','L','mL','pieces','dozen','bag','box'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Current stock</label>
                  <input className="field-input" type="number" min="0" step="0.01" value={matForm.currentStock}
                    onChange={e => setMatForm(f => ({ ...f, currentStock:e.target.value }))}/>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="field">
                  <label className="field-label">Min stock level</label>
                  <input className="field-input" type="number" min="0" step="0.01" value={matForm.minStockLevel}
                    onChange={e => setMatForm(f => ({ ...f, minStockLevel:e.target.value }))}/>
                </div>
                <div className="field">
                  <label className="field-label">Cost per unit (₹)</label>
                  <input className="field-input" type="number" min="0" step="0.01" value={matForm.costPerUnit}
                    onChange={e => setMatForm(f => ({ ...f, costPerUnit:e.target.value }))}/>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Supplier (optional)</label>
                <input className="field-input" value={matForm.supplier}
                  onChange={e => setMatForm(f => ({ ...f, supplier:e.target.value }))} placeholder="e.g. Fresh Farms Co."/>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:4 }}>
                <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setMatModal(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex:1 }} onClick={saveMaterial} disabled={matSaving}>
                  {matSaving ? 'Saving…' : 'Add material'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinner{width:28px;height:28px;border:3px solid var(--green);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}`}</style>
    </div>
  );
}