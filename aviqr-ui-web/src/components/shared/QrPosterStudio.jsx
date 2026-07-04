import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { Printer, Download, Check, Search } from 'lucide-react';
import { shopApi, menuApi, shopPromotionApi } from '../../api/index.js';
import { Section, Toggle } from './QrTemplates.jsx';
import { POSTER_PALETTES, POSTER_LAYOUTS, PosterLayoutRenderer } from './PosterTemplates.jsx';
import './QrPosterStudio.css';

const BASE_URL = 'https://aviqr.in';

const STEPS = [
  { key: 'content', label: 'Content' },
  { key: 'design',  label: 'Design' },
  { key: 'preview', label: 'Preview' },
];

const DESTINATIONS = [
  { id: 'home',    title: 'Shop Home',    desc: 'Direct to your shop landing' },
  { id: 'product', title: 'Product Page', desc: 'Direct to a specific product' },
  { id: 'catalog', title: 'Shop Catalog', desc: 'Auto-filled A4 poster — offers, products, map & big QR' },
  { id: 'custom',  title: 'Custom URL',   desc: 'Any URL — offer, catalog, etc.' },
];

const ELEMENTS = [
  { key: 'showMap',      label: '📍 Map / Address' },
  { key: 'showOffers',   label: '🔥 Offers & Discounts' },
  { key: 'showFeatured', label: '⭐ Featured Products' },
  { key: 'showShopName', label: '🏪 Shop Name' },
  { key: 'showScanCta',  label: '📱 Scan CTA' },
];

export default function QrPosterStudio({ open, onClose, shopId, shopName: shopNameDefault = '' }) {
  const [step, setStep] = useState('content');
  const [destination, setDestination] = useState('catalog');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [posterTitle, setPosterTitle] = useState(shopNameDefault);
  const [tagline, setTagline] = useState('');

  const [layout, setLayout] = useState('portrait');
  const [palette, setPalette] = useState('walnut');
  const [elements, setElements] = useState({
    showMap: true, showOffers: true, showFeatured: true, showShopName: true, showScanCta: true,
  });

  const [shop, setShop] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [qrImg, setQrImg] = useState('');

  // Auto-fill from real shop data on open
  useEffect(() => {
    if (!open || !shopId) return;
    setLoadingData(true);
    Promise.all([
      shopApi.getById(shopId).catch(() => null),
      shopPromotionApi.listPublic(shopId).catch(() => ({ data: { data: [] } })),
      menuApi.getAllItems(shopId).catch(() => ({ data: { data: [] } })),
    ]).then(([shopRes, promoRes, itemsRes]) => {
      const s = shopRes?.data?.data || null;
      setShop(s);
      if (s) {
        setPosterTitle(prev => prev || s.name);
        setTagline(prev => prev || s.tagline || '');
      }
      setPromotions(promoRes?.data?.data || []);
      const items = itemsRes?.data?.data || [];
      setAllItems(Array.isArray(items) ? items : items.content || []);
    }).finally(() => setLoadingData(false));
  }, [open, shopId]);

  // Reset to a clean state each time the studio is (re)opened for a shop
  useEffect(() => {
    if (!open) return;
    setStep('content');
    setDestination('catalog');
    setSelectedItemId('');
    setCustomUrl('');
    setPosterTitle(shopNameDefault);
    setTagline('');
  }, [open, shopId, shopNameDefault]);

  const featuredItems = useMemo(
    () => allItems.filter(it => it.popular).slice(0, 8),
    [allItems]
  );

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return allItems;
    const q = itemSearch.toLowerCase();
    return allItems.filter(it => it.name?.toLowerCase().includes(q));
  }, [allItems, itemSearch]);

  const targetUrl = useMemo(() => {
    if (!shopId) return '';
    if (destination === 'product' && selectedItemId) return `${BASE_URL}/menu/${shopId}?item=${selectedItemId}`;
    if (destination === 'custom') return customUrl;
    return `${BASE_URL}/menu/${shopId}`;
  }, [destination, shopId, selectedItemId, customUrl]);

  const paletteColors = POSTER_PALETTES[palette];

  useEffect(() => {
    if (!open || !targetUrl) { setQrImg(''); return; }
    QRCode.toDataURL(targetUrl, { width: 512, margin: 2, color: { dark: paletteColors.qrDark, light: '#ffffff' } })
      .then(setQrImg).catch(() => {});
  }, [open, targetUrl, paletteColors.qrDark]);

  const setElement = (key, value) => setElements(p => ({ ...p, [key]: value }));

  const design = {
    layout, palette,
    posterTitle, tagline,
    shopAddress: shop ? [shop.address, shop.city].filter(Boolean).join(', ') : '',
    promotions,
    featuredItems,
    ...elements,
  };

  const handleDownload = () => {
    if (!qrImg) return;
    // Downloads just the raw QR — full poster export is via Print → Save as PDF.
    const a = document.createElement('a');
    a.href = qrImg;
    a.download = `${(posterTitle || 'qr').toLowerCase().replace(/\s+/g, '-')}-qr.png`;
    a.click();
  };
  const handlePrint = () => window.print();

  if (!open) return null;

  const canProceedFromContent = destination !== 'product' || !!selectedItemId;
  const canProceedFromContent2 = destination !== 'custom' || !!customUrl.trim();

  return (
    <>
      <div className="qps-overlay" onClick={onClose}>
        <div className="qps-modal" onClick={e => e.stopPropagation()}>
          <div className="qps-header">
            <h2>QR Poster Studio</h2>
            <button className="qps-close" onClick={onClose}>×</button>
          </div>

          <div className="qps-steps">
            {STEPS.map((s, i) => {
              const idx = STEPS.findIndex(x => x.key === step);
              return (
                <div key={s.key} className={`qps-step ${step === s.key ? 'active' : i < idx ? 'done' : ''}`}>
                  <span className="qps-step-num">{i < idx ? <Check size={11} /> : i + 1}</span>
                  {s.label}
                </div>
              );
            })}
          </div>

          <div className="qps-body">
            {step === 'content' && (
              <div>
                <Section title="What should this QR code link to?">
                  <div className="qps-dest-grid">
                    {DESTINATIONS.map(d => (
                      <button
                        key={d.id}
                        className={`qps-dest-card ${destination === d.id ? 'active' : ''}`}
                        onClick={() => setDestination(d.id)}
                      >
                        <div className="qps-dest-title">{d.title}</div>
                        <div className="qps-dest-desc">{d.desc}</div>
                      </button>
                    ))}
                  </div>
                </Section>

                {destination === 'catalog' && (
                  <div className="qps-autofill-note">
                    <strong>Auto-filled from your shop data</strong> — shop address & directions
                    {promotions.length > 0 ? `, ${promotions.length} active offer${promotions.length>1?'s':''}` : ''}
                    {featuredItems.length > 0 ? `, and ${featuredItems.length} featured / on-sale products` : ''} will
                    be pulled in automatically — just confirm the title below.
                  </div>
                )}

                {destination === 'product' && (
                  <Section title="Choose a product">
                    <div className="qps-field">
                      <div style={{ position: 'relative' }}>
                        <Search size={13} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--gray-400)' }} />
                        <input
                          style={{ paddingLeft: 30 }}
                          placeholder="Search products…"
                          value={itemSearch}
                          onChange={e => setItemSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="qps-item-picker">
                      {loadingData && <div style={{ padding: 14, fontSize: 13, color: 'var(--gray-500)' }}>Loading…</div>}
                      {!loadingData && filteredItems.map(it => (
                        <div
                          key={it.id}
                          className={`qps-item-row ${selectedItemId === it.id ? 'active' : ''}`}
                          onClick={() => { setSelectedItemId(it.id); setPosterTitle(it.name); }}
                        >
                          <span>{it.name}</span>
                          <span>₹{it.price}</span>
                        </div>
                      ))}
                      {!loadingData && filteredItems.length === 0 && (
                        <div style={{ padding: 14, fontSize: 13, color: 'var(--gray-500)' }}>No products found.</div>
                      )}
                    </div>
                  </Section>
                )}

                {destination === 'custom' && (
                  <div className="qps-field">
                    <label>Custom URL *</label>
                    <input placeholder="https://…" value={customUrl} onChange={e => setCustomUrl(e.target.value)} />
                  </div>
                )}

                <div className="qps-field">
                  <label>Poster Title *</label>
                  <input value={posterTitle} onChange={e => setPosterTitle(e.target.value)} />
                </div>
                <div className="qps-field">
                  <label>Tagline</label>
                  <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. New Arrivals · Special Offers · Visit Us Today" />
                </div>
              </div>
            )}

            {step === 'design' && (
              <div>
                <Section title="Poster Layout">
                  <div className="qps-layout-grid">
                    {POSTER_LAYOUTS.map(l => (
                      <button key={l.id} className={`qps-layout-card ${layout === l.id ? 'active' : ''}`} onClick={() => setLayout(l.id)}>
                        <span className="qps-layout-icon">{l.icon}</span>
                        <div className="qps-layout-label">{l.label}</div>
                        <div className="qps-layout-desc">{l.desc}</div>
                      </button>
                    ))}
                  </div>
                </Section>

                <Section title="Color Palette">
                  <div className="qps-palette-grid">
                    {Object.entries(POSTER_PALETTES).map(([key, p]) => (
                      <button
                        key={key}
                        className={`qps-palette-swatch ${palette === key ? 'active' : ''}`}
                        style={{ background: p.bg, color: p.fg }}
                        onClick={() => setPalette(key)}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                  <div className="qps-color-strip">
                    <div className="qps-color-chip"><span className="qps-color-dot" style={{ background: paletteColors.qrDark }} />QR & Text</div>
                    <div className="qps-color-chip"><span className="qps-color-dot" style={{ background: paletteColors.bg }} />Background</div>
                    <div className="qps-color-chip"><span className="qps-color-dot" style={{ background: paletteColors.accent }} />Accent</div>
                  </div>
                </Section>

                <Section title="Poster Elements">
                  <div className="qps-elements-list">
                    {ELEMENTS.map(el => (
                      <div key={el.key} className="qps-element-row">
                        <span>{el.label}</span>
                        <Toggle value={elements[el.key]} onChange={v => setElement(el.key, v)} />
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            )}

            {step === 'preview' && (
              <div className="qps-preview-wrap">
                <div className="qps-preview-hint">
                  Live Poster Preview — {POSTER_LAYOUTS.find(l => l.id === layout)?.label}
                </div>
                <PosterLayoutRenderer d={design} qrImg={qrImg} />
                <div className="qps-preview-hint">Actual QR will appear after generation · Colors are accurate</div>
              </div>
            )}
          </div>

          <div className="qps-footer">
            <button className="btn btn-secondary" onClick={() => {
              if (step === 'design') setStep('content');
              else if (step === 'preview') setStep('design');
              else onClose();
            }}>
              {step === 'content' ? 'Cancel' : '← Back'}
            </button>

            {step !== 'preview' ? (
              <button
                className="btn btn-primary"
                disabled={!posterTitle.trim() || !canProceedFromContent || !canProceedFromContent2}
                onClick={() => setStep(step === 'content' ? 'design' : 'preview')}
              >
                Next
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={handleDownload} disabled={!qrImg}>
                  <Download size={14} /> PNG
                </button>
                <button className="btn btn-primary" onClick={handlePrint} disabled={!qrImg}>
                  <Printer size={14} /> Generate Poster
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {createPortal(
        <div id="qps-print-zone">
          {qrImg && (
            <div className="qps-print-single">
              <PosterLayoutRenderer d={design} qrImg={qrImg} />
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
