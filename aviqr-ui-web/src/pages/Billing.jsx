import { useState, useEffect, useCallback } from 'react';
import { Plus, Minus, Printer, CreditCard, Wallet, Banknote, X, Search, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { menuApi, posApi, paymentApi, addonApi, variantApi, invoiceApi } from '../api/index.js';

const PAY_METHODS = [
  { key:'CASH',   label:'Cash',    icon:Banknote,    color:'#1D9E75' },
  { key:'UPI',    label:'UPI',     icon:Wallet,      color:'#7C3AED' },
  { key:'CARD',   label:'Card',    icon:CreditCard,  color:'#2563EB' },
];

export default function Billing() {
  const { user } = useAuth();
  const shopId = user?.shopId;

  const [categories, setCats]   = useState([]);
  const [allAddons,  setAddons] = useState([]);
  const [cart,       setCart]   = useState([]);  // { menuItemId, name, price, qty, variantName, addons[], note }
  const [tableNo,    setTable]  = useState('');
  const [custName,   setCust]   = useState('Walk-in');
  const [custPhone,  setPhone]  = useState('');
  const [payMethod,  setPay]    = useState('CASH');
  const [search,     setSearch] = useState('');
  const [selCat,     setSelCat] = useState(null);
  const [loading,    setLoad]   = useState(true);
  const [placing,    setPlace]  = useState(false);
  const [success,    setSuccess]= useState(null);
  const [taxPct,     setTax]    = useState(5);
  const [addonModal, setAddonMod]= useState(null); // item being customised
  const [variants,   setVariants]= useState({});   // itemId → [variants]

  const load = useCallback(async () => {
    if (!shopId) return;
    try {
      const [cRes, iRes, aRes] = await Promise.all([
        menuApi.getCategories(shopId),
        menuApi.getItems(shopId),
        addonApi.getByShop(shopId),
      ]);
      const cats  = cRes.data.data || [];
      const items = iRes.data.data || [];
      setCats(cats.map(c => ({ ...c, items: items.filter(i => i.categoryId === c.id && i.available !== false) })));
      setAddons(aRes.data.data || []);
    } catch (e) { console.error('POS load error', e); }
    finally { setLoad(false); }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const loadVariants = async (itemId) => {
    if (variants[itemId]) return; // cached
    try {
      const res = await variantApi.getVariants(itemId);
      const v = res.data.data || [];
      setVariants(prev => ({ ...prev, [itemId]: v }));
    } catch {}
  };

  // Add item to cart (with optional variant + addons via modal)
  const addToCart = (item, variant = null, selectedAddons = []) => {
    const price = variant ? parseFloat(variant.price) : parseFloat(item.price);
    const addonPrice = selectedAddons.reduce((s, a) => s + parseFloat(a.price), 0);
    const cartItem = {
      id:          `${item.id}_${Date.now()}`,
      menuItemId:  item.id,
      name:        item.name,
      price:       price + addonPrice,
      basePrice:   price,
      addonPrice,
      qty:         1,
      variantName: variant?.variantName || '',
      addons:      selectedAddons,
      note:        '',
    };
    setCart(prev => {
      // Try to merge if same item+variant+addons combo
      const key = `${item.id}_${variant?.id || ''}_${selectedAddons.map(a=>a.id).join(',')}`;
      const existing = prev.find(c => c._key === key);
      if (existing) return prev.map(c => c._key === key ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...cartItem, _key: key }];
    });
    setAddonMod(null);
  };

  const changeQty = (id, delta) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const removeItem = (id) => setCart(prev => prev.filter(c => c.id !== id));

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const taxAmt   = +(subtotal * taxPct / 100).toFixed(2);
  const total    = +(subtotal + taxAmt).toFixed(2);

  const placeBill = async () => {
    if (!cart.length) return;
    setPlace(true);
    try {
      const payload = {
        customerName:  custName || 'Walk-in',
        customerPhone: custPhone || null,
        tableNumber:   tableNo || null,
        paymentMethod: payMethod,
        type:          'DINE_IN',
        items: cart.map(c => ({
          menuItemId: c.menuItemId,
          itemName:   c.name + (c.variantName ? ` (${c.variantName})` : '') + (c.addons.length ? ` + ${c.addons.map(a=>a.name).join(', ')}` : ''),
          quantity:   c.qty,
          unitPrice:  c.price,
          totalPrice: c.price * c.qty,
          notes:      c.note || null,
        })),
        subtotal: subtotal.toFixed(2),
        tax:      taxAmt.toFixed(2),
        totalAmount: total.toFixed(2),
      };
      const res = await posApi.createBill(shopId, payload);
      const order = res.data.data;
      setSuccess(order);
      setCart([]);
      setTable('');
      setCust('Walk-in');
      setPhone('');
    } catch (e) {
      alert('Failed to create bill: ' + (e.response?.data?.message || e.message));
    } finally { setPlace(false); }
  };

  const filteredCats = categories
    .map(c => ({ ...c, items: c.items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())) }))
    .filter(c => (!selCat || c.id === selCat) && c.items.length > 0);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:300, flexDirection:'column', gap:10 }}>
      <div className="spinner" />
      <p style={{ color:'var(--gray-500)', fontSize:13 }}>Loading POS…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinner{width:28px;height:28px;border:3px solid var(--green);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}`}</style>
    </div>
  );

  return (
    <div style={{ display:'flex', gap:0, height:'calc(100vh - 64px)', overflow:'hidden' }}>

      {/* ── Left: Menu browser ────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 12px', borderRight:'1px solid var(--gray-100)', background:'#FAFAFA' }}>
        <h2 style={{ fontSize:16, fontWeight:700, marginBottom:12 }}>🧾 POS — Select Items</h2>

        {/* Search + category filter */}
        <div style={{ position:'relative', marginBottom:10 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)', pointerEvents:'none' }} />
          <input className="field-input" style={{ paddingLeft:32, height:36 }}
            placeholder="Search menu…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          <button className={`chip${!selCat ? ' active' : ''}`} onClick={() => setSelCat(null)}>All</button>
          {categories.map(c => <button key={c.id} className={`chip${selCat===c.id ? ' active' : ''}`} onClick={() => setSelCat(c.id)}>{c.emoji} {c.name}</button>)}
        </div>

        {filteredCats.map(cat => (
          <div key={cat.id} style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-500)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>{cat.emoji} {cat.name}</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8 }}>
              {cat.items.map(item => (
                <button key={item.id} onClick={async () => {
                  await loadVariants(item.id);
                  const itemVariants = variants[item.id] || [];
                  if (itemVariants.length > 0 || allAddons.length > 0) {
                    setAddonMod({ item, itemVariants });
                  } else {
                    addToCart(item);
                  }
                }} style={{ background:'white', border:'1.5px solid var(--gray-200)', borderRadius:10, padding:'10px 12px', cursor:'pointer', textAlign:'left', transition:'all .15s', ':hover':{ borderColor:'var(--green)' } }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='#1D9E75'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--gray-200)'}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <span style={{ fontSize:9, fontWeight:700, color: item.veg !== false ? '#1D9E75' : '#DC2626', border:`1.5px solid ${item.veg !== false ? '#1D9E75' : '#DC2626'}`, borderRadius:2, padding:'1px 4px' }}>
                      {item.veg !== false ? '■' : '■'}
                    </span>
                    <span style={{ fontSize:13, fontWeight:600, color:'#111', lineHeight:1.3 }}>{item.name}</span>
                  </div>
                  {item.description && <p style={{ fontSize:11, color:'var(--gray-400)', margin:'0 0 6px', lineHeight:1.3, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.description}</p>}
                  <div style={{ fontWeight:800, color:'var(--green-dark)', fontSize:14 }}>₹{item.price}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Right: Bill / Cart ────────────────────────────────────────────── */}
      <div style={{ width:360, display:'flex', flexDirection:'column', background:'white' }}>
        {/* Table + customer */}
        <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--gray-100)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div className="field" style={{ margin:0 }}>
            <label className="field-label" style={{ fontSize:11 }}>Table #</label>
            <input className="field-input" style={{ height:34 }} placeholder="e.g. 7" value={tableNo} onChange={e => setTable(e.target.value)} />
          </div>
          <div className="field" style={{ margin:0 }}>
            <label className="field-label" style={{ fontSize:11 }}>Customer</label>
            <input className="field-input" style={{ height:34 }} placeholder="Walk-in" value={custName} onChange={e => setCust(e.target.value)} />
          </div>
          <div className="field" style={{ margin:0, gridColumn:'1/-1' }}>
            <label className="field-label" style={{ fontSize:11 }}>Phone (optional)</label>
            <input className="field-input" style={{ height:34 }} type="tel" placeholder="9900112233" value={custPhone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>

        {/* Cart items */}
        <div style={{ flex:1, overflowY:'auto', padding:'10px 16px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--gray-400)' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🍽️</div>
              <p style={{ fontSize:13 }}>Click items on the left to add to bill</p>
            </div>
          ) : cart.map(item => (
            <div key={item.id} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 0', borderBottom:'1px solid var(--gray-100)' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{item.name}</div>
                {item.variantName && <div style={{ fontSize:11, color:'var(--gray-400)' }}>Variant: {item.variantName}</div>}
                {item.addons.length > 0 && <div style={{ fontSize:11, color:'var(--gray-400)' }}>+ {item.addons.map(a=>a.name).join(', ')}</div>}
                <input placeholder="Note (no onion, extra spicy…)" value={item.note}
                  onChange={e => setCart(prev => prev.map(c => c.id === item.id ? { ...c, note:e.target.value } : c))}
                  style={{ marginTop:4, width:'100%', fontSize:11, border:'1px solid var(--gray-200)', borderRadius:4, padding:'2px 6px', color:'#6B7280' }} />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                <button onClick={() => changeQty(item.id, -1)} style={{ width:24, height:24, borderRadius:6, background:'var(--gray-100)', border:'none', cursor:'pointer', fontSize:14, fontWeight:700 }}>−</button>
                <span style={{ fontSize:13, fontWeight:700, minWidth:20, textAlign:'center' }}>{item.qty}</span>
                <button onClick={() => changeQty(item.id, +1)} style={{ width:24, height:24, borderRadius:6, background:'var(--green)', color:'white', border:'none', cursor:'pointer', fontSize:14, fontWeight:700 }}>+</button>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:13, fontWeight:700 }}>₹{(item.price * item.qty).toFixed(0)}</div>
                <button onClick={() => removeItem(item.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gray-400)', padding:0 }}><X size={12} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Totals + payment */}
        {cart.length > 0 && (
          <div style={{ padding:'14px 16px', borderTop:'1px solid var(--gray-100)' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:12, fontSize:13 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'var(--gray-500)' }}>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ color:'var(--gray-500)' }}>GST ({taxPct}%)</span>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <input type="number" value={taxPct} min={0} max={28} step={0.5}
                    onChange={e => setTax(Number(e.target.value))}
                    style={{ width:44, height:24, border:'1px solid var(--gray-200)', borderRadius:4, textAlign:'center', fontSize:12 }} />
                  <span>₹{taxAmt.toFixed(0)}</span>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:16, paddingTop:6, borderTop:'1.5px solid var(--gray-200)' }}>
                <span>Total</span><span style={{ color:'var(--green-dark)' }}>₹{total.toFixed(0)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div style={{ display:'flex', gap:6, marginBottom:12 }}>
              {PAY_METHODS.map(m => (
                <button key={m.key} onClick={() => setPay(m.key)}
                  style={{ flex:1, height:36, borderRadius:8, border:`1.5px solid ${payMethod===m.key ? m.color : 'var(--gray-200)'}`, background: payMethod===m.key ? m.color+'18' : 'white', fontSize:12, fontWeight:600, cursor:'pointer', color: payMethod===m.key ? m.color : 'var(--gray-600)', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                  <m.icon size={13} /> {m.label}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-secondary" style={{ flex:1, height:40 }}
                onClick={() => success && window.open(invoiceApi.kotUrl(success.id || ''), 'kot', 'width=440,height=640')}>
                <Printer size={14} /> Print KOT
              </button>
              <button className="btn btn-primary" style={{ flex:2, height:40, fontSize:14 }}
                onClick={placeBill} disabled={placing || !cart.length}>
                {placing ? 'Billing…' : `Bill ₹${total.toFixed(0)}`}
              </button>
            </div>
          </div>
        )}

        {/* Success banner */}
        {success && (
          <div style={{ padding:'12px 16px', background:'#E1F5EE', borderTop:'1px solid #A7F3D0', display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#065F46' }}>
            <CheckCircle size={16} />
            <div style={{ flex:1 }}>
              <strong>{success.orderNumber}</strong> billed ✓
              <div style={{ fontSize:11, marginTop:2 }}>Print receipt or KOT</div>
            </div>
            <button className="btn btn-secondary" style={{ height:28, fontSize:11, flexShrink:0 }}
              onClick={() => window.open(invoiceApi.downloadUrl(success.id, {}), '_blank')}>
              Receipt
            </button>
            <button onClick={() => setSuccess(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#065F46' }}><X size={14} /></button>
          </div>
        )}
      </div>

      {/* ── Variant + Addon modal ─────────────────────────────────────────── */}
      {addonModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <AddonModal
            item={addonModal.item}
            variants={addonModal.itemVariants}
            allAddons={allAddons}
            onConfirm={(variant, selectedAddons) => addToCart(addonModal.item, variant, selectedAddons)}
            onClose={() => setAddonMod(null)}
          />
        </div>
      )}
    </div>
  );
}

function AddonModal({ item, variants, allAddons, onConfirm, onClose }) {
  const [selVariant, setSel]    = useState(variants.find(v => v.isDefault) || variants[0] || null);
  const [selAddons,  setSelAdd] = useState([]);

  const toggleAddon = (addon) => {
    setSelAdd(prev => prev.find(a => a.id === addon.id)
      ? prev.filter(a => a.id !== addon.id)
      : [...prev, addon]);
  };

  const basePrice  = selVariant ? parseFloat(selVariant.price) : parseFloat(item.price);
  const addonPrice = selAddons.reduce((s, a) => s + parseFloat(a.price), 0);
  const total      = basePrice + addonPrice;

  return (
    <div style={{ background:'white', borderRadius:16, padding:24, width:'100%', maxWidth:400, maxHeight:'80vh', overflowY:'auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h3 style={{ fontSize:16, fontWeight:700 }}>{item.name}</h3>
        <button onClick={onClose} style={{ background:'var(--gray-100)', border:'none', borderRadius:8, padding:'5px 7px', cursor:'pointer' }}><X size={15} /></button>
      </div>

      {variants.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-500)', marginBottom:8, textTransform:'uppercase' }}>Choose size / variant</div>
          {variants.map(v => (
            <label key={v.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--gray-100)', cursor:'pointer' }}>
              <input type="radio" name="variant" checked={selVariant?.id === v.id} onChange={() => setSel(v)} style={{ accentColor:'#1D9E75' }} />
              <span style={{ flex:1, fontSize:14, fontWeight:500 }}>{v.variantName}</span>
              <span style={{ fontWeight:700, color:'var(--green-dark)' }}>₹{parseFloat(v.price).toFixed(0)}</span>
            </label>
          ))}
        </div>
      )}

      {allAddons.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-500)', marginBottom:8, textTransform:'uppercase' }}>Add-ons (optional)</div>
          {allAddons.map(a => (
            <label key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--gray-100)', cursor:'pointer' }}>
              <input type="checkbox" checked={!!selAddons.find(s => s.id === a.id)} onChange={() => toggleAddon(a)} style={{ accentColor:'#1D9E75' }} />
              <span style={{ flex:1, fontSize:14, fontWeight:500 }}>{a.name}</span>
              <span style={{ fontWeight:700, color:'var(--gray-600)' }}>+₹{parseFloat(a.price).toFixed(0)}</span>
            </label>
          ))}
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:12, borderTop:'1.5px solid var(--gray-200)' }}>
        <div style={{ fontSize:16, fontWeight:800, color:'var(--green-dark)' }}>₹{total.toFixed(0)}</div>
        <button className="btn btn-primary" onClick={() => onConfirm(selVariant, selAddons)}>
          Add to bill
        </button>
      </div>
    </div>
  );
}
