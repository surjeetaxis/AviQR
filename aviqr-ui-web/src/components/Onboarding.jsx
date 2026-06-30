import { useState } from 'react';
import { CheckCircle, ArrowRight, Store, UtensilsCrossed, QrCode, Rocket, Loader2 } from 'lucide-react';
import { shopApi, menuApi, qrApi, api } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';

const STEPS = [
  { id: 1, icon: Store,           label: 'Create shop',    desc: 'Set up your restaurant profile' },
  { id: 2, icon: UtensilsCrossed, label: 'Add a dish',     desc: 'Add your first menu item'       },
  { id: 3, icon: QrCode,          label: 'Get QR code',    desc: 'Generate your table QR'         },
  { id: 4, icon: Rocket,          label: 'Go live!',       desc: 'Your restaurant is ready'       },
];

export default function Onboarding({ onComplete }) {
  const { user, linkShop } = useAuth();
  const [step, setStep]     = useState(1);
  const [busy, setBusy]     = useState(false);
  const [err,  setErr]      = useState('');
  const [shopId, setShopId] = useState(null);

  // Step 1 — shop form
  const [shop, setShop] = useState({ name: '', phone: '', city: '', address: '' });

  // Step 2 — menu item form
  const [item, setItem] = useState({ categoryName: '', name: '', price: '' });

  // Step 3 — QR result
  const [qrDone, setQrDone] = useState(false);

  const go = (n) => { setErr(''); setStep(n); };

  /* ── Step 1: create shop ─────────────────────────────────────────────────── */
  async function handleCreateShop(e) {
    e.preventDefault();
    if (!shop.name.trim()) { setErr('Restaurant name is required'); return; }
    setBusy(true); setErr('');
    try {
      const res = await shopApi.create({
        name: shop.name.trim(),
        phone: shop.phone.trim(),
        city: shop.city.trim(),
        address: shop.address.trim(),
      });
      const newShopId = res.data?.data?.id;
      if (!newShopId) throw new Error('Shop created but no ID returned');
      setShopId(newShopId);
      // Link shop in auth service → returns fresh JWT with shopId baked in
      await linkShop(newShopId);
      // Patch axios default header so subsequent calls in this wizard use the new shopId
      api.defaults.headers.common['X-Shop-Id'] = newShopId;
      go(2);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to create shop');
    } finally { setBusy(false); }
  }

  /* ── Step 2: add first menu item ─────────────────────────────────────────── */
  async function handleAddItem(e) {
    e.preventDefault();
    if (!item.name.trim() || !item.price) { setErr('Item name and price are required'); return; }
    setBusy(true); setErr('');
    try {
      let catId;
      if (item.categoryName.trim()) {
        const catRes = await menuApi.createCategory({ shopId, name: item.categoryName.trim() });
        catId = catRes.data?.data?.id;
      }
      await menuApi.createItem({
        shopId,
        categoryId: catId || null,
        name: item.name.trim(),
        price: Number(item.price),
        available: true,
      });
      go(3);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to add item');
    } finally { setBusy(false); }
  }

  /* ── Step 3: generate QR ─────────────────────────────────────────────────── */
  async function handleGenerateQR() {
    setBusy(true); setErr('');
    try {
      await qrApi.create(shopId, { type: 'TABLE', label: 'Table 1' });
      setQrDone(true);
      go(4);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to generate QR code');
    } finally { setBusy(false); }
  }

  /* ── Step 4: done ────────────────────────────────────────────────────────── */
  function handleFinish() {
    onComplete?.();
  }

  return (
    <div style={styles.wrap}>
      {/* Progress bar */}
      <div style={styles.progressBar}>
        {STEPS.map((s, i) => {
          const done    = step > s.id;
          const active  = step === s.id;
          const Icon    = s.icon;
          return (
            <div key={s.id} style={styles.progressItem}>
              <div style={{ ...styles.stepCircle, ...(done ? styles.stepDone : active ? styles.stepActive : styles.stepFuture) }}>
                {done ? <CheckCircle size={16} /> : <Icon size={16} />}
              </div>
              <div style={styles.stepLabel(active)}>{s.label}</div>
              {i < STEPS.length - 1 && <div style={{ ...styles.connector, background: done ? '#1D9E75' : '#E5E7EB' }} />}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div style={styles.card}>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <form onSubmit={handleCreateShop}>
            <div style={styles.cardHead}>
              <div style={styles.iconBadge('🏪')}>🏪</div>
              <h2 style={styles.h2}>Set up your restaurant</h2>
              <p style={styles.sub}>This takes 30 seconds. You can always update details later.</p>
            </div>
            <div style={styles.fields}>
              <Field label="Restaurant name *" value={shop.name} onChange={v => setShop(s => ({ ...s, name: v }))} placeholder="e.g. Spice Garden" />
              <Field label="Phone number"      value={shop.phone} onChange={v => setShop(s => ({ ...s, phone: v }))} placeholder="9900112233" type="tel" />
              <div style={styles.row}>
                <Field label="City" value={shop.city} onChange={v => setShop(s => ({ ...s, city: v }))} placeholder="Bengaluru" />
                <Field label="Address" value={shop.address} onChange={v => setShop(s => ({ ...s, address: v }))} placeholder="123 MG Road" />
              </div>
            </div>
            {err && <p style={styles.errMsg}>{err}</p>}
            <button type="submit" style={styles.btnPrimary} disabled={busy}>
              {busy ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {busy ? 'Creating…' : 'Create my restaurant'} <ArrowRight size={15} />
            </button>
          </form>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <form onSubmit={handleAddItem}>
            <div style={styles.cardHead}>
              <div style={styles.iconBadge('🍽️')}>🍽️</div>
              <h2 style={styles.h2}>Add your first dish</h2>
              <p style={styles.sub}>Customers see your menu when they scan your QR code.</p>
            </div>
            <div style={styles.fields}>
              <Field label="Category (optional)" value={item.categoryName} onChange={v => setItem(i => ({ ...i, categoryName: v }))} placeholder="e.g. Starters, Main Course" />
              <div style={styles.row}>
                <Field label="Dish name *"  value={item.name}  onChange={v => setItem(i => ({ ...i, name: v }))}  placeholder="e.g. Butter Chicken" />
                <Field label="Price (₹) *" value={item.price} onChange={v => setItem(i => ({ ...i, price: v }))} placeholder="280" type="number" />
              </div>
            </div>
            {err && <p style={styles.errMsg}>{err}</p>}
            <div style={styles.btnRow}>
              <button type="button" style={styles.btnGhost} onClick={() => go(3)}>Skip for now</button>
              <button type="submit" style={styles.btnPrimary} disabled={busy}>
                {busy ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {busy ? 'Adding…' : 'Add dish'} <ArrowRight size={15} />
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div>
            <div style={styles.cardHead}>
              <div style={styles.iconBadge('📱')}>📱</div>
              <h2 style={styles.h2}>Generate your QR code</h2>
              <p style={styles.sub}>Customers scan this at their table to view your menu and order.</p>
            </div>
            <div style={styles.qrPreview}>
              <div style={styles.qrBox}>
                <QrCode size={64} color="#1D9E75" />
              </div>
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 12 }}>
                Your QR menu link: <strong>aviqr.in/menu/{shopId?.slice(0,8)}…</strong>
              </p>
            </div>
            {err && <p style={styles.errMsg}>{err}</p>}
            <div style={styles.btnRow}>
              <button type="button" style={styles.btnGhost} onClick={() => go(4)}>Skip for now</button>
              <button style={styles.btnPrimary} onClick={handleGenerateQR} disabled={busy}>
                {busy ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {busy ? 'Generating…' : 'Generate QR'} <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4 ── */}
        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ ...styles.h2, marginBottom: 8 }}>You're all set!</h2>
            <p style={{ ...styles.sub, marginBottom: 24 }}>
              Your restaurant <strong>{shop.name || user?.businessName}</strong> is live on AviQR.
              Customers can now scan your QR code to browse your menu and place orders.
            </p>
            <div style={styles.checklist}>
              <CheckItem label="Restaurant profile created" done />
              <CheckItem label="Menu item added" done={!!item.name.trim()} />
              <CheckItem label="QR code generated" done={qrDone} />
            </div>
            <button style={{ ...styles.btnPrimary, marginTop: 28, width: '100%', justifyContent: 'center' }} onClick={handleFinish}>
              Open Dashboard <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={styles.input}
      />
    </div>
  );
}

function CheckItem({ label, done }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 14, color: done ? '#1D9E75' : '#9CA3AF' }}>
      <CheckCircle size={16} color={done ? '#1D9E75' : '#D1D5DB'} />
      <span style={{ textDecoration: done ? 'none' : 'line-through' }}>{label}</span>
    </div>
  );
}

const styles = {
  wrap: {
    maxWidth: 600,
    margin: '40px auto',
    padding: '0 16px',
  },
  progressBar: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 0,
    marginBottom: 32,
    position: 'relative',
  },
  progressItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    flex: 1,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    transition: 'all .2s',
  },
  stepDone:   { background: '#1D9E75', color: '#fff' },
  stepActive: { background: '#111827', color: '#fff', boxShadow: '0 0 0 4px rgba(29,158,117,.2)' },
  stepFuture: { background: '#F3F4F6', color: '#9CA3AF', border: '2px solid #E5E7EB' },
  stepLabel: (active) => ({
    fontSize: 11,
    fontWeight: active ? 600 : 400,
    color: active ? '#111827' : '#9CA3AF',
    marginTop: 6,
    textAlign: 'center',
    whiteSpace: 'nowrap',
  }),
  connector: {
    position: 'absolute',
    top: 18,
    left: '50%',
    width: '100%',
    height: 2,
    zIndex: 0,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #E5E7EB',
    padding: 32,
    boxShadow: '0 4px 24px rgba(0,0,0,.06)',
  },
  cardHead: {
    textAlign: 'center',
    marginBottom: 28,
  },
  iconBadge: () => ({
    fontSize: 40,
    marginBottom: 12,
    display: 'block',
  }),
  h2: {
    fontSize: 22,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 1.5,
  },
  fields: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  input: {
    padding: '10px 12px',
    fontSize: 14,
    borderRadius: 8,
    border: '1px solid #D1D5DB',
    outline: 'none',
    transition: 'border-color .15s',
    width: '100%',
    boxSizing: 'border-box',
  },
  errMsg: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 12,
    padding: '8px 12px',
    background: '#FEF2F2',
    borderRadius: 6,
    border: '1px solid #FCA5A5',
  },
  btnPrimary: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 24px',
    background: '#1D9E75',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background .15s',
    width: '100%',
    justifyContent: 'center',
  },
  btnGhost: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '12px 20px',
    background: 'transparent',
    color: '#6B7280',
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  btnRow: {
    display: 'flex',
    gap: 12,
    marginTop: 8,
  },
  qrPreview: {
    textAlign: 'center',
    padding: '24px 0',
  },
  qrBox: {
    width: 120,
    height: 120,
    margin: '0 auto',
    background: '#F0FDF4',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed #1D9E75',
  },
  checklist: {
    textAlign: 'left',
    display: 'inline-block',
    borderTop: '1px solid #F3F4F6',
    paddingTop: 16,
    width: '100%',
  },
};