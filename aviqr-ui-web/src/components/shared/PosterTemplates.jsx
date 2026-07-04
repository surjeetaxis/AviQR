import { MapPin, ScanLine } from 'lucide-react';
import './QrPosterStudio.css';

// ─── Palettes ───────────────────────────────────────────────────────────────
// Same shape as QrTemplates.jsx's THEMES (bg/fg/accent/acFg/qrDark) so the same
// swatch-rendering approach works, but a distinct named set for the poster
// studio's retail/catalog aesthetic rather than the tent/counter QR banners.
export const POSTER_PALETTES = {
  walnut:   { name: 'Walnut',   bg: '#F7F3EE', fg: '#3D2B1F', accent: '#8B6914', acFg: '#FFFFFF', qrDark: '#3D2B1F' },
  teak:     { name: 'Teak',     bg: '#FBF3E7', fg: '#4A3728', accent: '#C9973D', acFg: '#FFFFFF', qrDark: '#4A3728' },
  midnight: { name: 'Midnight', bg: '#1B2437', fg: '#FFFFFF', accent: '#93A5C4', acFg: '#1B2437', qrDark: '#1B2437' },
  forest:   { name: 'Forest',   bg: '#F1F5EE', fg: '#263A26', accent: '#5B8C5A', acFg: '#FFFFFF', qrDark: '#263A26' },
  rust:     { name: 'Rust',     bg: '#FBEDE4', fg: '#6B2E1F', accent: '#C1502E', acFg: '#FFFFFF', qrDark: '#6B2E1F' },
  royal:    { name: 'Royal',    bg: '#F0EEFA', fg: '#2C2560', accent: '#6C5CE7', acFg: '#FFFFFF', qrDark: '#2C2560' },
  rose:     { name: 'Rose',     bg: '#FCEEF2', fg: '#5C1F32', accent: '#C2547A', acFg: '#FFFFFF', qrDark: '#5C1F32' },
  obsidian: { name: 'Obsidian', bg: '#16181D', fg: '#FFFFFF', accent: '#9CA3AF', acFg: '#16181D', qrDark: '#16181D' },
};

// ─── Layouts ────────────────────────────────────────────────────────────────
export const POSTER_LAYOUTS = [
  { id: 'portrait',  label: 'Portrait',  desc: 'A4 / Catalog card',        icon: '📄' },
  { id: 'landscape', label: 'Landscape', desc: 'Shelf tag / Counter card', icon: '🏷️' },
  { id: 'square',    label: 'Square',    desc: 'Display / Social media',   icon: '🖼️' },
  { id: 'strip',     label: 'Strip',     desc: 'Bookmark / Sticker',       icon: '🔖' },
];

// ─── Shared sub-sections (used across layouts) ─────────────────────────────
function AddressBlock({ d, palette, compact }) {
  if (!d.showMap || !d.shopAddress) return null;
  return (
    <div className="poster-address" style={{ color: palette.fg }}>
      <MapPin size={compact ? 10 : 12} />
      <span>{d.shopAddress}</span>
    </div>
  );
}

function OffersRow({ d, palette, compact }) {
  if (!d.showOffers || !d.promotions?.length) return null;
  return (
    <div className="poster-offers-row">
      {d.promotions.slice(0, compact ? 1 : 3).map(p => (
        <span key={p.code} className="poster-offer-pill" style={{ background: palette.accent, color: palette.acFg }}>
          {p.code} · {p.label}
        </span>
      ))}
    </div>
  );
}

function FeaturedGrid({ d, palette, max }) {
  if (!d.showFeatured || !d.featuredItems?.length) return null;
  return (
    <div className="poster-featured-grid">
      {d.featuredItems.slice(0, max).map(it => (
        <div key={it.id || it.name} className="poster-featured-item">
          <div className="poster-featured-name" style={{ color: palette.fg }}>{it.name}</div>
          <div className="poster-featured-price" style={{ color: palette.accent }}>₹{it.price}</div>
        </div>
      ))}
    </div>
  );
}

function ScanCta({ d, palette, compact }) {
  if (!d.showScanCta) return null;
  return (
    <div className="poster-cta" style={{ color: palette.fg }}>
      <ScanLine size={compact ? 12 : 14} /> Scan to explore
    </div>
  );
}

// ─── Portrait — A4 / catalog card ───────────────────────────────────────────
function PortraitPoster({ d, qrImg }) {
  const palette = POSTER_PALETTES[d.palette];
  return (
    <div className="poster poster-portrait" style={{ background: palette.bg }}>
      {d.showShopName && (
        <div className="poster-header" style={{ color: palette.fg }}>
          <div className="poster-shop-name">{d.posterTitle}</div>
          {d.tagline && <div className="poster-tagline">{d.tagline}</div>}
        </div>
      )}
      <AddressBlock d={d} palette={palette} />
      <OffersRow d={d} palette={palette} />
      <FeaturedGrid d={d} palette={palette} max={8} />
      <div className="poster-qr-block">
        <div className="poster-qr-frame" style={{ borderColor: palette.accent }}>
          {qrImg && <img src={qrImg} alt="QR" className="poster-qr-img" />}
        </div>
        <ScanCta d={d} palette={palette} />
      </div>
    </div>
  );
}

// ─── Landscape — shelf tag / counter card ───────────────────────────────────
function LandscapePoster({ d, qrImg }) {
  const palette = POSTER_PALETTES[d.palette];
  return (
    <div className="poster poster-landscape" style={{ background: palette.bg }}>
      <div className="poster-landscape-left">
        {d.showShopName && (
          <div className="poster-header" style={{ color: palette.fg }}>
            <div className="poster-shop-name poster-shop-name-sm">{d.posterTitle}</div>
            {d.tagline && <div className="poster-tagline">{d.tagline}</div>}
          </div>
        )}
        <AddressBlock d={d} palette={palette} compact />
        <OffersRow d={d} palette={palette} compact />
        <FeaturedGrid d={d} palette={palette} max={2} />
      </div>
      <div className="poster-landscape-right">
        <div className="poster-qr-frame poster-qr-frame-sm" style={{ borderColor: palette.accent }}>
          {qrImg && <img src={qrImg} alt="QR" className="poster-qr-img poster-qr-img-sm" />}
        </div>
        <ScanCta d={d} palette={palette} compact />
      </div>
    </div>
  );
}

// ─── Square — display / social media ────────────────────────────────────────
function SquarePoster({ d, qrImg }) {
  const palette = POSTER_PALETTES[d.palette];
  return (
    <div className="poster poster-square" style={{ background: palette.bg }}>
      {d.showShopName && (
        <div className="poster-header poster-header-center" style={{ color: palette.fg }}>
          <div className="poster-shop-name">{d.posterTitle}</div>
          {d.tagline && <div className="poster-tagline">{d.tagline}</div>}
        </div>
      )}
      <div className="poster-qr-block">
        <div className="poster-qr-frame" style={{ borderColor: palette.accent }}>
          {qrImg && <img src={qrImg} alt="QR" className="poster-qr-img" />}
        </div>
        <ScanCta d={d} palette={palette} />
      </div>
      <OffersRow d={d} palette={palette} />
      <FeaturedGrid d={d} palette={palette} max={4} />
      <AddressBlock d={d} palette={palette} compact />
    </div>
  );
}

// ─── Strip — bookmark / sticker ─────────────────────────────────────────────
function StripPoster({ d, qrImg }) {
  const palette = POSTER_PALETTES[d.palette];
  return (
    <div className="poster poster-strip" style={{ background: palette.bg }}>
      {d.showShopName && <div className="poster-shop-name poster-shop-name-strip" style={{ color: palette.fg }}>{d.posterTitle}</div>}
      <div className="poster-qr-frame poster-qr-frame-strip" style={{ borderColor: palette.accent }}>
        {qrImg && <img src={qrImg} alt="QR" className="poster-qr-img poster-qr-img-strip" />}
      </div>
      <ScanCta d={d} palette={palette} compact />
      {d.showOffers && d.promotions?.[0] && (
        <span className="poster-offer-pill poster-offer-pill-strip" style={{ background: palette.accent, color: palette.acFg }}>
          {d.promotions[0].code}
        </span>
      )}
    </div>
  );
}

export function PosterLayoutRenderer({ d, qrImg }) {
  if (d.layout === 'portrait')  return <PortraitPoster d={d} qrImg={qrImg} />;
  if (d.layout === 'landscape') return <LandscapePoster d={d} qrImg={qrImg} />;
  if (d.layout === 'square')    return <SquarePoster d={d} qrImg={qrImg} />;
  if (d.layout === 'strip')     return <StripPoster d={d} qrImg={qrImg} />;
  return null;
}
