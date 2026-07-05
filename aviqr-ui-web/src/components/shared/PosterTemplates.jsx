import { QrCode, Smartphone, MapPin } from 'lucide-react';

// ─── Palettes — anchored on AviQR's own brand colors (same hex values used in
// QrTemplates.jsx's THEMES: Brand Green/Dark Luxury/Warm Sunset/Ocean Blue/
// Elegant Cream), extended with 3 complementary options for variety. Not the
// FurnishHub furniture-store wood-tone palette this was first ported from.
export const PALETTES = [
  { label: 'Emerald',  color: '#0a5c3e', bg: '#F0FDF9', accent: '#1D9E75' }, // AviQR primary brand green
  { label: 'Midnight', color: '#18181b', bg: '#FAFAFA', accent: '#fbbf24' },
  { label: 'Sunset',   color: '#7c2d12', bg: '#FFF7ED', accent: '#ea580c' },
  { label: 'Ocean',    color: '#1e3a8a', bg: '#F0F7FF', accent: '#1d4ed8' },
  { label: 'Cream',    color: '#78350f', bg: '#FEF9C3', accent: '#d97706' },
  { label: 'Forest',   color: '#14532d', bg: '#F0FDF4', accent: '#16a34a' },
  { label: 'Royal',    color: '#312e81', bg: '#EEF2FF', accent: '#4f46e5' },
  { label: 'Charcoal', color: '#0f172a', bg: '#F8FAFC', accent: '#64748b' },
];

export const LAYOUTS = [
  { value: 'portrait',  label: 'Portrait',  w: 420, h: 594, desc: 'A4 / Catalog card' },
  { value: 'landscape', label: 'Landscape', w: 594, h: 420, desc: 'Shelf tag / Counter card' },
  { value: 'square',    label: 'Square',    w: 420, h: 420, desc: 'Display / Social media' },
  { value: 'strip',     label: 'Strip',     w: 600, h: 200, desc: 'Bookmark / Sticker' },
];

export const DESTINATIONS = [
  { value: 'shop',    label: 'Shop Home',    desc: 'Direct to your shop landing' },
  { value: 'product', label: 'Product Page', desc: 'Direct to a specific product' },
  { value: 'catalog', label: 'Shop Catalog', desc: 'Auto-filled A4 poster — offers, products, map & big QR' },
  { value: 'custom',  label: 'Custom URL',   desc: 'Any URL — offer, catalog, etc.' },
];

const money = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// ─── Live scaled preview — shop / product / custom (all 4 layouts) ──────────
export function PosterPreview({ form, item, shopName, qrImg }) {
  const layout = LAYOUTS.find(l => l.value === form.layout) || LAYOUTS[0];
  const scale = Math.min(300 / layout.w, 430 / layout.h);
  const W = layout.w * scale, H = layout.h * scale;
  const isStrip = form.layout === 'strip';
  const qrSize = isStrip ? H * 0.6 : Math.min(W * 0.5, H * 0.38);
  const price = item?.price;

  return (
    <div className="pt-doc" style={{ width: W, height: H, background: form.bgColor, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: isStrip ? 5 : 8, background: `linear-gradient(90deg, ${form.accentColor}, ${form.color})`, zIndex: 2 }} />

      {isStrip ? (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '5px 14px 0', gap: 12 }}>
          <div style={{ width: qrSize, height: qrSize, flexShrink: 0, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${form.color}22`, overflow: 'hidden' }}>
            {qrImg
              ? <img src={qrImg} alt="QR Code" style={{ width: '100%', height: '100%' }} />
              : <QrCode style={{ width: qrSize * 0.72, height: qrSize * 0.72, color: form.color, opacity: 0.25 }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {form.showShopName && <p style={{ fontSize: H * 0.08, color: form.accentColor, fontWeight: 700, margin: 0, opacity: 0.8, letterSpacing: 1 }}>{shopName}</p>}
            <p style={{ fontSize: H * 0.13, color: form.color, fontWeight: 800, margin: '1px 0', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{form.label}</p>
            {form.showPrice && price != null && <p style={{ fontSize: H * 0.11, color: form.accentColor, fontWeight: 900, margin: 0 }}>{money(price)}</p>}
          </div>
          {form.showCTA && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <Smartphone style={{ width: H * 0.18, height: H * 0.18, color: form.color, opacity: 0.35 }} />
            <p style={{ fontSize: H * 0.065, color: form.color, opacity: 0.45, margin: 0, whiteSpace: 'nowrap' }}>Scan Me</p>
          </div>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: form.layout === 'landscape' ? 'row' : 'column', alignItems: 'center', height: '100%', padding: form.layout === 'landscape' ? '24px 28px' : '20px 22px 16px', gap: form.layout === 'landscape' ? 24 : 0, paddingTop: form.layout === 'landscape' ? 28 : 26 }}>

          {form.layout !== 'landscape' && (
            <>
              {form.showShopName && <p style={{ fontSize: Math.max(8, W * 0.032), color: form.accentColor, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', margin: '0 0 10px', opacity: 0.85 }}>{shopName}</p>}
              <p style={{ fontSize: Math.max(14, W * 0.07), color: form.color, fontWeight: 800, lineHeight: 1.15, textAlign: 'center', margin: '0 0 4px', maxWidth: '88%' }}>{form.label}</p>
              {form.tagline && <p style={{ fontSize: Math.max(8, W * 0.026), color: form.color, opacity: 0.5, margin: '0 0 6px', textAlign: 'center' }}>{form.tagline}</p>}
              {form.showTag && item?.tag && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span style={{ fontSize: Math.max(7, W * 0.023), color: form.color, opacity: 0.6, background: form.accentColor + '14', padding: '2px 8px', borderRadius: 20 }}>
                    🏷️ {item.tag}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: form.layout === 'square' ? 14 : 16, width: '100%' }}>
                <div style={{ flex: 1, height: 1, background: form.accentColor + '28' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: form.accentColor, opacity: 0.5 }} />
                <div style={{ flex: 1, height: 1, background: form.accentColor + '28' }} />
              </div>
            </>
          )}

          {form.layout === 'landscape' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              {form.showShopName && <p style={{ fontSize: 10, color: form.accentColor, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', margin: 0, opacity: 0.85 }}>{shopName}</p>}
              <p style={{ fontSize: W * 0.048, color: form.color, fontWeight: 800, lineHeight: 1.2, margin: 0 }}>{form.label}</p>
              {form.tagline && <p style={{ fontSize: W * 0.022, color: form.color, opacity: 0.5, margin: 0 }}>{form.tagline}</p>}
              {form.showTag && item?.tag && <p style={{ fontSize: W * 0.02, color: form.color, opacity: 0.55, margin: 0 }}>🏷️ {item.tag}</p>}
              {form.showPrice && price != null && (
                <div style={{ background: form.accentColor + '18', borderRadius: 8, padding: '6px 14px', display: 'inline-block', marginTop: 4 }}>
                  <p style={{ fontSize: W * 0.045, color: form.accentColor, fontWeight: 900, margin: 0 }}>{money(price)}</p>
                </div>
              )}
              {form.showCTA && <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                <Smartphone style={{ width: 12, height: 12, color: form.color, opacity: 0.35 }} />
                <p style={{ fontSize: 9, color: form.color, opacity: 0.45, margin: 0 }}>Scan QR to explore</p>
              </div>}
            </div>
          )}

          <div style={{ width: qrSize, height: qrSize, background: form.bgColor, borderRadius: form.layout === 'landscape' ? 14 : 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid ${form.color}10`, boxShadow: `0 8px 32px ${form.color}18`, marginBottom: form.layout !== 'landscape' ? 12 : 0, flexShrink: 0, overflow: 'hidden' }}>
            {qrImg
              ? <img src={qrImg} alt="QR Code" style={{ width: '100%', height: '100%' }} />
              : <QrCode style={{ width: qrSize * 0.78, height: qrSize * 0.78, color: form.color, opacity: 0.2 }} />}
          </div>

          {form.layout !== 'landscape' && (
            <>
              {form.showPrice && price != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: form.accentColor + '16', border: `2px solid ${form.accentColor}28`, borderRadius: 12, padding: '6px 18px', marginBottom: 8 }}>
                  <p style={{ fontSize: Math.max(14, W * 0.064), color: form.accentColor, fontWeight: 900, margin: 0 }}>{money(price)}</p>
                </div>
              )}
              {form.showCTA && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                  <Smartphone style={{ width: 11, height: 11, color: form.color, opacity: 0.3 }} />
                  <p style={{ fontSize: Math.max(7, W * 0.024), color: form.color, opacity: 0.4, margin: 0, letterSpacing: 0.3 }}>
                    Scan to explore · {shopName}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${form.color}40, ${form.accentColor})` }} />
    </div>
  );
}

// ─── Live scaled preview — shop catalog poster ──────────────────────────────
export function CatalogPosterPreview({ form, shop, shopName, featuredItems, promotions, qrImg }) {
  const W = 300, scale = W / 420;
  const addrText = shop ? [shop.address, shop.city].filter(Boolean).join(', ') : '';

  return (
    <div className="pt-doc" style={{ width: W, background: form.bgColor }}>
      <div style={{ background: `linear-gradient(135deg, ${form.color} 0%, ${form.accentColor} 100%)`, padding: 20 * scale * 4 }}>
        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 6px' }}>{shopName}</p>
        <p style={{ fontSize: 18, fontWeight: 900, color: 'white', lineHeight: 1.1, margin: 0 }}>{form.label || 'Our Shop'}</p>
        {form.tagline && <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>{form.tagline}</p>}
      </div>
      <div style={{ padding: 16 }}>
        {form.showMap && addrText && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 10, fontSize: 9, color: form.color, opacity: 0.7 }}>
            <MapPin style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1 }} />
            <span>{addrText}</span>
          </div>
        )}
        {form.showOffers && promotions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {promotions.slice(0, 3).map(p => (
              <span key={p.id} style={{ fontSize: 8, fontWeight: 700, color: 'white', background: '#C4622D', padding: '2px 7px', borderRadius: 10 }}>
                {p.code} · {p.label}
              </span>
            ))}
          </div>
        )}
        <div style={{ width: '100%', aspectRatio: '1', background: '#fff', borderRadius: 12, border: `2px solid ${form.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, overflow: 'hidden' }}>
          {qrImg
            ? <img src={qrImg} alt="QR Code" style={{ width: '100%', height: '100%' }} />
            : <QrCode style={{ width: '55%', height: '55%', color: form.color, opacity: 0.2 }} />}
        </div>
        {form.showFeatured && featuredItems.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {featuredItems.slice(0, 4).map(it => (
              <div key={it.id} style={{ background: form.accentColor + '0f', borderRadius: 8, padding: '5px 7px' }}>
                <p style={{ fontSize: 8, color: form.color, fontWeight: 600, margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{it.name}</p>
                <p style={{ fontSize: 9, color: form.accentColor, fontWeight: 800, margin: 0 }}>{money(it.price)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ height: 4, background: `linear-gradient(90deg, ${form.color}40, ${form.accentColor})` }} />
    </div>
  );
}

// ─── Full-size printable document — shop / product / custom ─────────────────
export function PosterDoc({ form, item, shopName, qrImg }) {
  const price = item?.price;
  return (
    <div className="pt-doc" style={{ width: 420, background: form.bgColor, overflow: 'hidden' }}>
      <div style={{ background: `linear-gradient(135deg, ${form.color} 0%, ${form.accentColor} 100%)`, padding: '28px 32px 24px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', top: 10, right: 20, width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>{shopName}</p>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: form.tagline ? 8 : 0 }}>{form.label}</h1>
        {form.tagline && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>{form.tagline}</p>}
      </div>

      {item?.imageUrl && (
        <div style={{ height: 160, overflow: 'hidden', position: 'relative' }}>
          <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 50%, ${form.bgColor})` }} />
        </div>
      )}

      <div style={{ padding: item?.imageUrl ? '8px 32px 28px' : '28px 32px' }}>
        {item?.tag && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 11, color: form.color, background: form.accentColor + '14', border: `1px solid ${form.accentColor}25`, padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
              🏷️ {item.tag}
            </span>
          </div>
        )}

        <div style={{ height: 1, background: `linear-gradient(to right, ${form.accentColor}40, transparent)`, marginBottom: 22 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{ width: 160, height: 160, flexShrink: 0, background: form.bgColor, borderRadius: 16, padding: 10, boxShadow: `0 4px 24px ${form.color}18`, border: `2px solid ${form.color}10` }}>
            {qrImg && <img src={qrImg} alt="QR Code" style={{ width: '100%', height: '100%', borderRadius: 8 }} />}
          </div>
          <div style={{ flex: 1 }}>
            {price != null && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 34, fontWeight: 900, color: form.accentColor, margin: 0, lineHeight: 1 }}>{money(price)}</p>
              </div>
            )}
            <div style={{ background: form.color + '0c', border: `1px solid ${form.color}15`, borderRadius: 12, padding: '10px 14px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: form.color, margin: '0 0 3px' }}>📱 Scan to explore</p>
              <p style={{ fontSize: 11, color: form.color, opacity: 0.55, margin: 0, lineHeight: 1.4 }}>
                Point your phone camera at the QR code to view full details & order online
              </p>
            </div>
          </div>
        </div>

        {item?.description && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: form.color, opacity: 0.65, lineHeight: 1.6, margin: 0 }}>
              {item.description.slice(0, 120)}{item.description.length > 120 ? '...' : ''}
            </p>
          </div>
        )}

        <div style={{ height: 1, background: `linear-gradient(to right, ${form.accentColor}40, transparent)`, marginBottom: 18 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: form.color, margin: 0 }}>{shopName}</p>
          <div style={{ display: 'flex', gap: 5 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: form.accentColor, opacity: 0.3 + i * 0.25 }} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 6, background: `linear-gradient(90deg, ${form.accentColor}, ${form.color})` }} />
    </div>
  );
}

// ─── Full-size printable document — shop catalog (matches the reference poster) ──
export function CatalogPosterDoc({ form, shop, shopName, qrImg, mapQrImg, promotions, featuredItems }) {
  const addrText = shop ? [shop.address, shop.city, shop.state, shop.pincode].filter(Boolean).join(', ') : '';

  return (
    <div className="pt-doc" style={{ width: 420, background: form.bgColor, overflow: 'hidden' }}>
      <div style={{ background: `linear-gradient(135deg, ${form.color} 0%, ${form.accentColor} 100%)`, padding: '28px 32px 22px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', top: 10, right: 20, width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>Visit Us Today</p>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: form.tagline ? 6 : 0 }}>{form.label || shopName}</h1>
        {form.tagline && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{form.tagline}</p>}
      </div>

      <div style={{ padding: '24px 32px 28px' }}>
        {form.showMap && addrText && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, background: form.color + '0a', border: `1px solid ${form.color}12`, borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: form.color, margin: '0 0 3px' }}>📍 Shop Address</p>
              <p style={{ fontSize: 11, color: form.color, opacity: 0.65, margin: 0, lineHeight: 1.5 }}>{addrText}</p>
              {shop?.phone && <p style={{ fontSize: 11, color: form.color, opacity: 0.65, margin: '3px 0 0' }}>📞 {shop.phone}</p>}
            </div>
            {mapQrImg && (
              <div style={{ width: 64, height: 64, flexShrink: 0, background: form.bgColor, borderRadius: 8, padding: 4, border: `1px solid ${form.color}15` }}>
                <img src={mapQrImg} alt="Get Directions" style={{ width: '100%', height: '100%' }} />
                <p style={{ fontSize: 6, color: form.color, opacity: 0.5, textAlign: 'center', margin: '2px 0 0' }}>Directions</p>
              </div>
            )}
          </div>
        )}

        {form.showOffers && promotions.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: form.color, margin: '0 0 8px' }}>🔥 Special Offers</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {promotions.slice(0, 4).map(p => (
                <div key={p.id} style={{ background: '#C4622D', borderRadius: 8, padding: '6px 12px' }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: 'white', margin: 0 }}>{p.code}</p>
                  <p style={{ fontSize: 9, color: 'white', margin: 0 }}>{p.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: 1, background: `linear-gradient(to right, ${form.accentColor}40, transparent)`, marginBottom: 22 }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ width: 220, height: 220, background: form.bgColor, borderRadius: 18, padding: 12, boxShadow: `0 6px 28px ${form.color}20`, border: `2px solid ${form.color}10` }}>
            {qrImg && <img src={qrImg} alt="QR Code" style={{ width: '100%', height: '100%', borderRadius: 10 }} />}
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: form.color, margin: '12px 0 2px' }}>📱 Scan to Shop Now</p>
          <p style={{ fontSize: 10, color: form.color, opacity: 0.5, margin: 0 }}>Browse the full menu & place your order online</p>
        </div>

        {form.showFeatured && featuredItems.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: form.color, margin: '0 0 10px' }}>⭐ Featured & On Sale</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {featuredItems.slice(0, 6).map(it => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: form.accentColor + '0c', border: `1px solid ${form.accentColor}1c`, borderRadius: 10, padding: '7px 9px' }}>
                  {it.imageUrl && <img src={it.imageUrl} alt={it.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: form.color, margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{it.name}</p>
                    <p style={{ fontSize: 11, fontWeight: 800, color: form.accentColor, margin: 0 }}>{money(it.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: 1, background: `linear-gradient(to right, ${form.accentColor}40, transparent)`, margin: '20px 0 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: form.color, margin: 0 }}>{shopName}</p>
          <div style={{ display: 'flex', gap: 5 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: form.accentColor, opacity: 0.3 + i * 0.25 }} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 6, background: `linear-gradient(90deg, ${form.accentColor}, ${form.color})` }} />
    </div>
  );
}
