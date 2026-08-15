import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { Sparkles, X, ChevronRight, Search, Download, Printer, Eye, Package } from 'lucide-react';
import { shopApi, menuApi, shopPromotionApi, qrApi } from '../../api/index.js';
import { PALETTES, LAYOUTS, DESTINATIONS, PosterPreview, CatalogPosterPreview, PosterDoc, CatalogPosterDoc } from './PosterTemplates.jsx';
import './QrPosterStudio.css';

const BASE_URL = 'https://aviqr.com';

// Marketing/landing-page destinations for Admin's no-shop "Poster Studio" mode —
// same presets the old standalone Marketing QR Generator offered.
const MARKETING_PRESETS = [
  { label: 'AviQR Website',      url: 'https://aviqr.com',                    campaign: 'website',  emoji: '🌐' },
  { label: 'Pricing Page',       url: 'https://aviqr.com/pricing',            campaign: 'pricing',  emoji: '💰' },
  { label: 'Demo / Free Trial',  url: 'https://aviqr.com/demo',               campaign: 'demo',     emoji: '🎯' },
  { label: 'Contact Sales',      url: 'https://aviqr.com/contact',            campaign: 'sales',    emoji: '📞' },
  { label: 'Play Store App',     url: 'https://play.google.com/store/apps/details?id=in.aviqr.app', campaign: 'playstore', emoji: '📱' },
  { label: 'Partner Program',    url: 'https://aviqr.com/partners',           campaign: 'partners', emoji: '🤝' },
  { label: 'Blog / Guides',      url: 'https://aviqr.com/blog',               campaign: 'blog',     emoji: '📖' },
  { label: 'Custom URL',         url: '',                                    campaign: 'custom',   emoji: '✏️' },
];

const ELEMENTS = [
  { key: 'showItemName', label: '🏷️ Product Name',       show: t => t === 'product' },
  { key: 'showPrice',    label: '💰 Price',               show: t => t === 'product' },
  { key: 'showTag',      label: '⭐ Bestseller Tag',       show: t => t === 'product' },
  { key: 'showMap',      label: '📍 Map / Address',        show: t => t === 'catalog' },
  { key: 'showOffers',   label: '🔥 Offers & Discounts',   show: t => t === 'catalog' },
  { key: 'showFeatured', label: '⭐ Featured Products',    show: t => t === 'catalog' },
  { key: 'showShopName', label: '🏪 Shop Name',            show: () => true },
  { key: 'showCTA',      label: '📱 Scan CTA',             show: () => true },
];

const DEFAULT_FORM = {
  type: 'catalog', label: '', tagline: '', itemId: '', customUrl: '', marketingPreset: MARKETING_PRESETS[0].campaign,
  layout: 'portrait', preset: 0, color: PALETTES[0].color, bgColor: PALETTES[0].bg, accentColor: PALETTES[0].accent,
  showItemName: true, showPrice: true, showTag: true,
  showMap: true, showOffers: true, showFeatured: true, showShopName: true, showCTA: true,
};

// Three modes:
//  - Full mode (shopId given): 4 destinations, real shop/menu/promotions
//    auto-fill — used by Owner, mall vendors, supplier outlets, admin.
//  - Simple mode (no shopId, targetUrlOverride given instead): the caller
//    already knows the exact URL to encode (a room's service hub, a hotel's
//    hub, a mall food-court page, a supplier brand page) — these aren't
//    "shops" with a menu/promotions, so the destination picker and
//    catalog/product auto-fill are skipped; only title/tagline/design/preview
//    remain. This is what replaces the old QrDesignerModal everywhere.
//  - Marketing mode (no shopId, no targetUrlOverride, marketing=true): Admin's
//    "landing page" QR — pick an AviQR marketing preset or a custom URL, then
//    design it with the same palettes/layouts as every other mode. Unlike the
//    other two, generating here also persists a CAMPAIGN QrCode row via
//    qrApi.createMarketing/updateMarketing (replaces the old standalone
//    AdminMarketingQRGenerator modal, which had its own ad-hoc colour picker).
export default function QrPosterStudio({
  open, onClose, shopId, shopName: shopNameDefault = '',
  targetUrlOverride = '', nameDefault = '', taglineDefault = '',
  marketing = false, editTarget = null, onSaved,
}) {
  const simpleMode = !shopId && !!targetUrlOverride;
  const marketingMode = !shopId && !targetUrlOverride && marketing;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [itemSearch, setItemSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [finalPoster, setFinalPoster] = useState(null); // { qrImg, mapQrImg, savedQr }
  const [editId, setEditId] = useState(null);
  const [saveErr, setSaveErr] = useState('');
  const [previewQrImg, setPreviewQrImg] = useState('');

  const [shop, setShop] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [items, setItems] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!open) return;
    setFinalPoster(null); setItemSearch(''); setSaveErr('');
    if (marketingMode) {
      setStep(1);
      const match = editTarget && MARKETING_PRESETS.find(p => p.url && p.url === editTarget.targetUrl);
      setEditId(editTarget?.id || null);
      setForm({
        ...DEFAULT_FORM,
        type: 'custom',
        marketingPreset: editTarget ? (match ? match.campaign : 'custom') : MARKETING_PRESETS[0].campaign,
        customUrl: editTarget ? (match ? '' : (editTarget.targetUrl || '')) : MARKETING_PRESETS[0].url,
        label: editTarget?.label || '',
      });
    } else if (simpleMode) {
      setStep(1);
      setForm({ ...DEFAULT_FORM, type: 'custom', label: nameDefault, tagline: taglineDefault });
    } else {
      setStep(1);
      setForm(DEFAULT_FORM);
    }
  }, [open, shopId, simpleMode, marketingMode, nameDefault, taglineDefault, editTarget]);

  useEffect(() => {
    if (!open || !shopId) { setLoadingData(false); return; }
    setLoadingData(true);
    Promise.all([
      shopApi.getById(shopId).catch(() => null),
      shopPromotionApi.listPublic(shopId).catch(() => ({ data: { data: [] } })),
      menuApi.getAllItems(shopId).catch(() => ({ data: { data: [] } })),
    ]).then(([shopRes, promoRes, itemsRes]) => {
      setShop(shopRes?.data?.data || null);
      setPromotions(promoRes?.data?.data || []);
      const d = itemsRes?.data?.data || [];
      setItems(Array.isArray(d) ? d : d.content || []);
    }).finally(() => setLoadingData(false));
  }, [open, shopId]);

  const shopName = shop?.name || shopNameDefault || 'Our Shop';
  // Auto-fill title/tagline once shop data loads for whatever destination is
  // currently selected (covers the default 'catalog' type too, not just an
  // explicit click on the destination card).
  useEffect(() => {
    if (!shop || simpleMode) return;
    setForm(f => (f.type === 'catalog' && !f.label)
      ? { ...f, label: shopName, tagline: f.tagline || 'New Arrivals · Special Offers · Visit Us Today' }
      : f);
  }, [shop, shopName, simpleMode]);

  const featuredItems = useMemo(() => items.filter(it => it.popular).slice(0, 8), [items]);
  const selectedItem = items.find(it => it.id === form.itemId);
  const layout = LAYOUTS.find(l => l.value === form.layout);

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return items;
    const q = itemSearch.toLowerCase();
    return items.filter(it => it.name?.toLowerCase().includes(q));
  }, [items, itemSearch]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectType = (t) => {
    set('type', t);
    if (t === 'catalog' && !form.label) set('label', shopName);
    if (t === 'catalog' && !form.tagline) set('tagline', 'New Arrivals · Special Offers · Visit Us Today');
  };

  const applyPreset = (i) => {
    const p = PALETTES[i];
    setForm(f => ({ ...f, preset: i, color: p.color, bgColor: p.bg, accentColor: p.accent }));
  };

  const selectMarketingPreset = (p) => {
    setForm(f => {
      const prev = MARKETING_PRESETS.find(x => x.campaign === f.marketingPreset);
      const labelWasDefault = !f.label || f.label === prev?.label;
      return {
        ...f,
        marketingPreset: p.campaign,
        customUrl: p.campaign === 'custom' ? f.customUrl : p.url,
        label: labelWasDefault ? p.label : f.label,
      };
    });
  };

  const selectItem = (id) => {
    set('itemId', id);
    const it = items.find(x => x.id === id);
    if (it) {
      if (!form.label || form.label === items.find(x => x.id === form.itemId)?.name) set('label', it.name);
      if (!form.tagline && it.tag) set('tagline', it.tag);
    }
  };

  const targetUrl = useMemo(() => {
    if (simpleMode) return targetUrlOverride;
    if (marketingMode) {
      return form.marketingPreset === 'custom'
        ? form.customUrl
        : (MARKETING_PRESETS.find(p => p.campaign === form.marketingPreset)?.url || '');
    }
    if (!shopId) return '';
    if (form.type === 'product' && form.itemId) return `${BASE_URL}/menu/${shopId}?item=${form.itemId}`;
    if (form.type === 'custom') return form.customUrl;
    return `${BASE_URL}/menu/${shopId}`;
  }, [simpleMode, targetUrlOverride, marketingMode, form.marketingPreset, form.customUrl, form.type, form.itemId, shopId]);

  // Real, scannable live preview (step 3) — regenerates whenever the destination
  // or QR color changes, so what you see before hitting Generate is the actual code.
  useEffect(() => {
    if (!open || !targetUrl) { setPreviewQrImg(''); return; }
    let cancelled = false;
    QRCode.toDataURL(targetUrl, { width: 300, margin: 2, color: { dark: form.color, light: '#ffffff' } })
      .then(img => { if (!cancelled) setPreviewQrImg(img); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, targetUrl, form.color]);

  const canNext1 = marketingMode
    ? form.label.trim() && targetUrl.trim()
    : simpleMode
      ? form.label.trim()
      : form.label.trim()
        && (form.type !== 'product' || form.itemId)
        && (form.type !== 'custom' || form.customUrl.trim());

  const mapUrl = shop
    ? (shop.latitude && shop.longitude
        ? `https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([shop.address, shop.city].filter(Boolean).join(', '))}`)
    : '';

  const generate = async () => {
    setGenerating(true); setSaveErr('');
    try {
      let savedQr = null;
      if (marketingMode) {
        const preset = MARKETING_PRESETS.find(p => p.campaign === form.marketingPreset);
        const payload = { label: form.label.trim() || preset?.label || 'Marketing QR', targetUrl, campaign: form.marketingPreset };
        const res = editId
          ? await qrApi.updateMarketing(editId, payload)
          : await qrApi.createMarketing(payload);
        savedQr = res.data?.data;
        onSaved?.(savedQr);
      }
      const qrImg = await QRCode.toDataURL(targetUrl, { width: 512, margin: 2, color: { dark: form.color, light: '#ffffff' } });
      let mapQrImg = null;
      if (form.type === 'catalog' && form.showMap && mapUrl) {
        mapQrImg = await QRCode.toDataURL(mapUrl, { width: 200, margin: 1, color: { dark: form.color, light: '#ffffff' } });
      }
      setFinalPoster({ qrImg, mapQrImg, savedQr });
    } catch (e) {
      if (marketingMode) setSaveErr(e.response?.data?.message || `Failed to ${editId ? 'update' : 'create'} marketing QR`);
      // Otherwise QR generation is local/offline — failure here is exceptional; just let the user retry.
    } finally {
      setGenerating(false);
    }
  };

  const downloadQr = () => {
    if (!finalPoster?.qrImg) return;
    const a = document.createElement('a');
    a.href = finalPoster.qrImg;
    a.download = `qr-${(form.label || 'poster').toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  };
  const handlePrint = () => window.print();

  if (!open) return null;

  return (
    <>
      <div className="qps-overlay" onClick={onClose}>
        <div className="qps-modal" onClick={e => e.stopPropagation()}>
          {!finalPoster ? (
            <>
              <div className="qps-header">
                <div className="qps-header-left">
                  <div className="qps-header-icon"><Sparkles size={18} /></div>
                  <div>
                    <h2>QR Poster Studio</h2>
                    <div className="qps-step-dots">
                      {[1, 2, 3].map(s => <span key={s} className={`qps-dot ${s <= step ? 'active' : ''}`} />)}
                      <span className="qps-step-label">{step === 1 ? 'Content' : step === 2 ? 'Design' : 'Preview'}</span>
                    </div>
                  </div>
                </div>
                <button className="qps-close" onClick={onClose}><X size={18} /></button>
              </div>

              <div className="qps-body">
                {step === 1 && (
                  <div className="qps-step-pad">
                    {marketingMode && (
                      <>
                        <p className="qps-q-title">Where should this QR code lead?</p>
                        <p className="qps-q-sub">Pick an AviQR destination or enter your own landing page</p>
                        <div className="qps-dest-grid">
                          {MARKETING_PRESETS.map(p => (
                            <button key={p.campaign} className={`qps-dest-card ${form.marketingPreset === p.campaign ? 'active' : ''}`} onClick={() => selectMarketingPreset(p)}>
                              <div className="qps-dest-title">{p.emoji} {p.label}</div>
                              {p.campaign !== 'custom' && <div className="qps-dest-desc">{p.url.replace(/^https?:\/\//, '')}</div>}
                            </button>
                          ))}
                        </div>
                        {form.marketingPreset === 'custom' && (
                          <div className="qps-field">
                            <label>Destination URL *</label>
                            <input value={form.customUrl} onChange={e => set('customUrl', e.target.value)} placeholder="https://aviqr.com/your-page" />
                          </div>
                        )}
                      </>
                    )}

                    {!simpleMode && !marketingMode && (
                      <>
                        <p className="qps-q-title">What should this QR code link to?</p>
                        <p className="qps-q-sub">Choose the destination</p>
                        <div className="qps-dest-grid">
                          {DESTINATIONS.map(d => (
                            <button key={d.value} className={`qps-dest-card ${form.type === d.value ? 'active' : ''}`} onClick={() => selectType(d.value)}>
                              <div className="qps-dest-title">{d.label}</div>
                              <div className="qps-dest-desc">{d.desc}</div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {!simpleMode && !marketingMode && form.type === 'catalog' && (
                      <div className="qps-autofill-note">
                        <strong>📐 Auto-filled from your shop data</strong>
                        <p>Shop address & directions, {promotions.length} active offer{promotions.length === 1 ? '' : 's'}, and {featuredItems.length} featured / on-sale product{featuredItems.length === 1 ? '' : 's'} will be pulled in automatically — just confirm the title below.</p>
                      </div>
                    )}

                    {!simpleMode && !marketingMode && form.type === 'product' && (
                      <div className="qps-field">
                        <label>Select Product *</label>
                        {items.length === 0 && !loadingData ? (
                          <div className="qps-empty-box">
                            <Package size={22} />
                            <p>No products found</p>
                          </div>
                        ) : (
                          <>
                            <div style={{ position: 'relative', marginBottom: 8 }}>
                              <Search size={13} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--gray-400)' }} />
                              <input style={{ paddingLeft: 30 }} placeholder="Search products…" value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                            </div>
                            <div className="qps-item-picker">
                              {loadingData && <div className="qps-empty-box">Loading…</div>}
                              {!loadingData && filteredItems.map(it => (
                                <div key={it.id} className={`qps-item-row ${form.itemId === it.id ? 'active' : ''}`} onClick={() => selectItem(it.id)}>
                                  <span>{it.name}</span>
                                  <span>₹{it.price}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        {!form.itemId && <p className="qps-warn">⚠ Please select a product to continue</p>}
                      </div>
                    )}

                    {!simpleMode && !marketingMode && form.type === 'custom' && (
                      <div className="qps-field">
                        <label>Destination URL *</label>
                        <input value={form.customUrl} onChange={e => set('customUrl', e.target.value)} placeholder="https://your-shop.com/offers/diwali-sale" />
                      </div>
                    )}

                    <div className="qps-field-row">
                      <div className="qps-field">
                        <label>Poster Title *</label>
                        <input value={form.label} onChange={e => set('label', e.target.value)}
                          placeholder={marketingMode ? (MARKETING_PRESETS.find(p => p.campaign === form.marketingPreset)?.label || 'e.g. AviQR Website') : form.type === 'product' ? (selectedItem?.name || 'e.g. Paneer Tikka') : shopName} />
                      </div>
                      <div className="qps-field">
                        <label>Tagline</label>
                        <input value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="e.g. Chef's special" />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="qps-step-pad">
                    <p className="qps-preview-title"><Eye size={14} /> Live Preview — {layout.label}</p>
                    <div className="qps-preview-center" style={{ marginBottom: 20 }}>
                      {form.type === 'catalog'
                        ? <CatalogPosterPreview form={form} shop={shop} shopName={shopName} featuredItems={featuredItems} promotions={promotions} qrImg={previewQrImg} />
                        : <PosterPreview form={form} item={selectedItem} shopName={shopName} qrImg={previewQrImg} />}
                    </div>

                    <label className="qps-section-label">Poster Layout</label>
                    <div className="qps-layout-grid">
                      {LAYOUTS.map(l => (
                        <button key={l.value} className={`qps-layout-card ${form.layout === l.value ? 'active' : ''}`} onClick={() => set('layout', l.value)}>
                          <div className="qps-layout-label">{l.label}</div>
                          <div className="qps-layout-desc">{l.desc}</div>
                        </button>
                      ))}
                    </div>

                    <label className="qps-section-label">Color Palette</label>
                    <div className="qps-palette-grid">
                      {PALETTES.map((p, i) => (
                        <button key={p.label} className={`qps-palette-card ${form.preset === i ? 'active' : ''}`} onClick={() => applyPreset(i)}>
                          <span className="qps-palette-dots">
                            <span className="qps-dotc" style={{ background: p.color }} />
                            <span className="qps-dotc" style={{ background: p.bg, border: '1px solid rgba(0,0,0,.1)' }} />
                            <span className="qps-dotc" style={{ background: p.accent }} />
                          </span>
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div className="qps-color-grid">
                      {[{ k: 'color', label: 'QR & Text' }, { k: 'bgColor', label: 'Background' }, { k: 'accentColor', label: 'Accent' }].map(({ k, label }) => (
                        <div key={k} className="qps-color-field">
                          <label>{label}</label>
                          <div className="qps-color-row">
                            <input type="color" value={form[k]} onChange={e => set(k, e.target.value)} />
                            <input value={form[k]} onChange={e => set(k, e.target.value)} className="qps-color-hex" />
                          </div>
                        </div>
                      ))}
                    </div>

                    <label className="qps-section-label">Poster Elements</label>
                    <div className="qps-elements-grid">
                      {ELEMENTS.filter(e => e.show(form.type)).map(e => (
                        <label key={e.key} className={`qps-element-row ${form[e.key] ? 'active' : ''}`}>
                          <input type="checkbox" checked={form[e.key]} onChange={ev => set(e.key, ev.target.checked)} />
                          <span>{e.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="qps-step-pad">
                    <p className="qps-preview-title"><Eye size={14} /> Live Poster Preview — {layout.label}</p>
                    <div className="qps-preview-center">
                      {form.type === 'catalog'
                        ? <CatalogPosterPreview form={form} shop={shop} shopName={shopName} featuredItems={featuredItems} promotions={promotions} qrImg={previewQrImg} />
                        : <PosterPreview form={form} item={selectedItem} shopName={shopName} qrImg={previewQrImg} />}
                    </div>
                    <p className="qps-preview-hint">{previewQrImg ? 'Live preview — this QR is already scannable' : 'Generating live QR preview…'}</p>
                    {marketingMode && saveErr && <p className="qps-warn" style={{ textAlign: 'center' }}>{saveErr}</p>}
                  </div>
                )}
              </div>

              <div className="qps-footer">
                {step > 1 && <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>← Back</button>}
                <div style={{ flex: 1 }} />
                {step < 3 && (
                  <button className="btn btn-primary" disabled={step === 1 && !canNext1} onClick={() => setStep(s => s + 1)}>
                    Next <ChevronRight size={14} />
                  </button>
                )}
                {step === 3 && (
                  <button className="btn btn-primary" disabled={generating} onClick={generate}>
                    {generating
                      ? (marketingMode ? (editId ? 'Saving…' : 'Creating…') : 'Generating…')
                      : <><Sparkles size={14} /> {marketingMode ? (editId ? 'Save & Generate' : 'Create & Generate Poster') : 'Generate Poster'}</>}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="qps-header">
                <div>
                  <h2>Print-Ready Poster</h2>
                  <p className="qps-header-sub">{form.label}</p>
                </div>
                <button className="qps-close" onClick={onClose}><X size={18} /></button>
              </div>
              <div className="qps-body qps-preview-bg">
                {marketingMode && finalPoster.savedQr && (
                  <div className="qps-autofill-note" style={{ maxWidth: 420, margin: '0 auto 16px' }}>
                    <strong>{editId ? '✏️ Marketing QR updated' : '✅ Marketing QR created'}</strong>
                    <p>Code <b>{finalPoster.savedQr.qrCode}</b> — trackable in the QR Codes list, scan link: {qrApi.redirectUrl(finalPoster.savedQr.qrCode)}</p>
                  </div>
                )}
                <div className="qps-preview-center">
                  {form.type === 'catalog'
                    ? <CatalogPosterDoc form={form} shop={shop} shopName={shopName} qrImg={finalPoster.qrImg} mapQrImg={finalPoster.mapQrImg} promotions={promotions} featuredItems={featuredItems} />
                    : <PosterDoc form={form} item={selectedItem} shopName={shopName} qrImg={finalPoster.qrImg} />}
                </div>
              </div>
              <div className="qps-footer qps-footer-actions">
                <button className="btn btn-secondary" onClick={downloadQr}><Download size={14} /> Download QR</button>
                <button className="btn btn-primary" onClick={handlePrint}><Printer size={14} /> Print / Save PDF</button>
              </div>
              <p className="qps-print-hint">Print opens the browser dialog → choose <strong>Save as PDF</strong> for a digital file.</p>
            </>
          )}
        </div>
      </div>

      {createPortal(
        <div id="qps-print-zone">
          {finalPoster && (
            <div className="qps-print-single">
              {form.type === 'catalog'
                ? <CatalogPosterDoc form={form} shop={shop} shopName={shopName} qrImg={finalPoster.qrImg} mapQrImg={finalPoster.mapQrImg} promotions={promotions} featuredItems={featuredItems} />
                : <PosterDoc form={form} item={selectedItem} shopName={shopName} qrImg={finalPoster.qrImg} />}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
