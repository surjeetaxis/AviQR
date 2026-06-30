import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Video, Box, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { menuApi } from '../api/index.js';
import './Menu.css';

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseVideoUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (yt) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${yt[1]}?rel=0` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { type: 'direct', embedUrl: url };
  return null;
}

function loadModelViewerScript() {
  if (document.querySelector('[data-mv-loader]')) return;
  const s = document.createElement('script');
  s.type = 'module';
  s.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js';
  s.setAttribute('data-mv-loader', '1');
  document.head.appendChild(s);
}

// ── Media preview components ───────────────────────────────────────────────────

function VideoPreview({ url }) {
  const parsed = parseVideoUrl(url);
  if (!parsed) return (
    <div className="media-hint-box">
      ⚠ Paste a YouTube, Vimeo, or direct .mp4 URL to preview
    </div>
  );
  if (parsed.type === 'youtube' || parsed.type === 'vimeo') {
    return (
      <div className="video-embed-wrap">
        <iframe
          src={parsed.embedUrl}
          title="Video preview"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    );
  }
  return <video src={url} controls className="video-direct-preview" />;
}

function ModelViewer3D({ url }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!wrapRef.current || !url) return;
    loadModelViewerScript();
    const el = document.createElement('model-viewer');
    el.src = url;
    el.alt = '3D menu item';
    el.setAttribute('auto-rotate', '');
    el.setAttribute('camera-controls', '');
    el.setAttribute('environment-image', 'neutral');
    el.setAttribute('shadow-intensity', '1');
    el.style.cssText = 'width:100%;height:100%;';
    wrapRef.current.innerHTML = '';
    wrapRef.current.appendChild(el);
    return () => { if (wrapRef.current) wrapRef.current.innerHTML = ''; };
  }, [url]);

  return (
    <div ref={wrapRef} className="model-viewer-wrap">
      <div className="model-viewer-loading">Loading 3D model…</div>
    </div>
  );
}

function ImagePreview({ url }) {
  const [err, setErr] = useState(false);
  if (!url) return null;
  if (err) return <div className="media-hint-box">⚠ Could not load image from that URL</div>;
  return <img src={url} alt="Item preview" className="img-preview" onError={() => setErr(true)} />;
}

// ── Media file upload helper (converts to data URL for demo) ──────────────────

function readFileAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TAG_CFG = {
  bestseller: { label: '⭐ Bestseller', cls: 'tag-bestseller' },
  spicy:      { label: '🌶 Spicy',      cls: 'tag-spicy' },
  veg:        { label: '🌿 Veg',        cls: 'tag-veg' },
};

const MEDIA_TABS = [
  { id: 'NONE',     icon: '🚫', label: 'None'      },
  { id: 'IMAGE',    icon: '🖼️', label: 'Image'     },
  { id: 'VIDEO',    icon: '🎬', label: 'Video'     },
  { id: 'MODEL_3D', icon: '🧊', label: '3D Model'  },
];

const EMPTY_ITEM = {
  name: '', desc: '', price: '', veg: true, spicy: false, popular: false,
  nameHi: '', nameTa: '', nameKn: '', nameTe: '', nameMl: '',
  stockQty: '', trackStock: false,
  imageUrl: '', videoUrl: '', modelUrl: '', mediaType: 'NONE',
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
  const shopId = user?.shopId || '00000000-0000-0000-0000-000000000101';

  const [categories, setCats]   = useState([]);
  const [expanded, setExpanded] = useState({});
  const [search, setSearch]     = useState('');
  const [selCat, setSelCat]     = useState(null);
  const [error, setError]       = useState(null);

  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);
  const [mediaTab, setMediaTab] = useState('NONE');

  const imgInputRef   = useRef(null);
  const videoInputRef = useRef(null);
  const modelInputRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { loadMenu(); }, [shopId]);

  const loadMenu = async () => {
    try {
      const [cRes, iRes] = await Promise.all([
        menuApi.getCategories(shopId),
        menuApi.getItems(shopId),
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
    setForm({ ...EMPTY_ITEM, categoryId: catId, shopId });
    setMediaTab('NONE');
    setModal({ mode: 'add', catId });
  };

  const openEdit = (catId, item) => {
    const mType = item.mediaType || (item.videoUrl ? 'VIDEO' : item.modelUrl ? 'MODEL_3D' : item.imageUrl ? 'IMAGE' : 'NONE');
    setForm({
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
    });
    setMediaTab(mType);
    setModal({ mode: 'edit', catId, item });
  };

  const saveItem = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return;
    setSaving(true);
    const payload = { ...form, price: parseFloat(form.price), mediaType: mediaTab };
    try {
      if (modal.mode === 'edit') {
        await menuApi.updateItem(modal.item.id, payload);
        setCats(p => p.map(c => c.id !== modal.catId ? c : {
          ...c, items: c.items.map(i => i.id !== modal.item.id ? i : { ...i, ...payload })
        }));
      } else {
        const res = await menuApi.createItem(payload);
        const newItem = res.data.data || { ...payload, id: `local_${Date.now()}` };
        setCats(p => p.map(c => c.id !== modal.catId ? c : { ...c, items: [...c.items, newItem] }));
      }
    } catch {
      if (modal.mode === 'edit') {
        setCats(p => p.map(c => c.id !== modal.catId ? c : {
          ...c, items: c.items.map(i => i.id !== modal.item.id ? i : { ...i, ...payload })
        }));
      } else {
        setCats(p => p.map(c => c.id !== modal.catId ? c : {
          ...c, items: [...c.items, { ...payload, id: `local_${Date.now()}` }]
        }));
      }
    }
    setSaving(false);
    setModal(null);
  };

  // File → data URL handlers
  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2 MB for local preview. Use a CDN URL for production.'); return; }
    const dataUrl = await readFileAsDataUrl(file);
    set('imageUrl', dataUrl);
  };

  const handleVideoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert('Video files > 20 MB should be hosted on YouTube or Vimeo. Paste the URL above instead.');
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    set('videoUrl', dataUrl);
  };

  const handleModelFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('3D model > 10 MB. Please host it on a CDN and paste the URL instead.');
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    set('modelUrl', dataUrl);
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
        </div>
      </div>

      {/* Category filter pills */}
      <div className="seg-control" style={{ flexWrap: 'wrap', gap: 4 }}>
        <button className={`seg-btn${!selCat ? ' is-active' : ''}`} onClick={() => setSelCat(null)}>All</button>
        {categories.map(c => (
          <button key={c.id} className={`seg-btn${selCat === c.id ? ' is-active' : ''}`} onClick={() => setSelCat(c.id)}>
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

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

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{modal.mode === 'edit' ? 'Edit item' : 'Add new item'}</h2>
              <button style={{ background: 'var(--gray-100)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }} onClick={() => setModal(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={saveItem} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 24px 24px' }}>

              {/* Basic fields */}
              <div className="field">
                <label className="field-label">Item name *</label>
                <input className="field-input" placeholder="e.g. Paneer Tikka" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="field">
                <label className="field-label">Description</label>
                <textarea className="field-input" style={{ height: 68, resize: 'vertical', paddingTop: 10 }}
                  placeholder="Brief description of the dish"
                  value={form.desc} onChange={e => set('desc', e.target.value)} />
              </div>

              {/* ── Rich Media Section ── */}
              <div className="media-section">
                <div className="media-section-title">
                  <span>📽 Rich Media</span>
                  <span className="media-section-sub">Add image, video, or 3D model to bring this item to life</span>
                </div>

                {/* Media type selector */}
                <div className="media-type-row">
                  {MEDIA_TABS.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      className={`media-type-btn${mediaTab === t.id ? ' active' : ''}`}
                      onClick={() => { setMediaTab(t.id); set('mediaType', t.id); }}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* ── IMAGE tab ── */}
                {mediaTab === 'IMAGE' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                    <div className="field">
                      <label className="field-label">Image URL</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="field-input"
                          placeholder="https://... .jpg / .png / .webp"
                          value={form.imageUrl}
                          onChange={e => set('imageUrl', e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="media-upload-btn"
                          onClick={() => imgInputRef.current?.click()}
                          title="Upload from device"
                        >
                          <ImageIcon size={14} /> Upload
                        </button>
                        <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
                      </div>
                      <div className="media-tip">Tip: Use a CDN like Cloudinary or imgbb for hosted images</div>
                    </div>
                    <ImagePreview url={form.imageUrl} />
                  </div>
                )}

                {/* ── VIDEO tab ── */}
                {mediaTab === 'VIDEO' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                    <div className="field">
                      <label className="field-label">Video URL</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="field-input"
                          placeholder="YouTube, Vimeo, or direct .mp4 URL"
                          value={form.videoUrl}
                          onChange={e => set('videoUrl', e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="media-upload-btn"
                          onClick={() => videoInputRef.current?.click()}
                          title="Upload from device (≤20 MB)"
                        >
                          <Video size={14} /> Upload
                        </button>
                        <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoFile} />
                      </div>
                      <div className="media-tip">💡 Best: upload to <strong>YouTube</strong> and paste the link here for fast loading</div>
                    </div>
                    {form.videoUrl && <VideoPreview url={form.videoUrl} />}
                  </div>
                )}

                {/* ── 3D MODEL tab ── */}
                {mediaTab === 'MODEL_3D' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                    <div className="field">
                      <label className="field-label">3D Model URL (.glb / .gltf)</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="field-input"
                          placeholder="https://your-cdn.com/model.glb"
                          value={form.modelUrl}
                          onChange={e => set('modelUrl', e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="media-upload-btn"
                          onClick={() => modelInputRef.current?.click()}
                          title="Upload from device (≤10 MB)"
                        >
                          <Box size={14} /> Upload
                        </button>
                        <input ref={modelInputRef} type="file" accept=".glb,.gltf" style={{ display: 'none' }} onChange={handleModelFile} />
                      </div>
                      <div className="media-tip">💡 Host your .glb file on Google Drive (public link) or a CDN, then paste the URL</div>
                    </div>

                    {/* Demo model button */}
                    {!form.modelUrl && (
                      <button
                        type="button"
                        className="demo-model-btn"
                        onClick={() => set('modelUrl', 'https://modelviewer.dev/shared-assets/models/Astronaut.glb')}
                      >
                        🎮 Load demo 3D model to see how it works
                      </button>
                    )}

                    {form.modelUrl && (
                      <>
                        <ModelViewer3D url={form.modelUrl} />
                        <div className="media-hint-box" style={{ marginTop: 0 }}>
                          👆 Drag to rotate · scroll to zoom — exactly how customers will see it
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Multilingual names */}
              <details style={{ marginBottom: 4 }}>
                <summary style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)', cursor: 'pointer', padding: '6px 0' }}>
                  🌐 Translated names (optional)
                </summary>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                  {[['nameHi', 'Hindi (हिंदी)'], ['nameTa', 'Tamil (தமிழ்)'], ['nameKn', 'Kannada (ಕನ್ನಡ)'], ['nameTe', 'Telugu (తెలుగు)'], ['nameMl', 'Malayalam (മലയാളം)']].map(([k, l]) => (
                    <div key={k} className="field">
                      <label className="field-label" style={{ fontSize: 11 }}>{l}</label>
                      <input className="field-input" placeholder={`Name in ${l.split(' ')[0]}`} value={form[k] || ''} onChange={e => set(k, e.target.value)} />
                    </div>
                  ))}
                </div>
              </details>

              {/* Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Stock qty <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>(blank = unlimited)</span></label>
                  <input className="field-input" type="number" min="0" placeholder="e.g. 50" value={form.stockQty || ''} onChange={e => set('stockQty', e.target.value)} />
                </div>
                <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                  <input type="checkbox" id="trackStock" checked={!!form.trackStock} onChange={e => set('trackStock', e.target.checked)} style={{ accentColor: '#1D9E75', width: 16, height: 16 }} />
                  <label htmlFor="trackStock" style={{ fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Auto-disable when 0</label>
                </div>
              </div>

              {/* Price + Veg */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Price (₹) *</label>
                  <input className="field-input" type="number" min="1" placeholder="280" value={form.price} onChange={e => set('price', e.target.value)} required />
                </div>
                <div className="field">
                  <label className="field-label">Type</label>
                  <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
                    {[{ v: true, l: '🟢 Veg' }, { v: false, l: '🔴 Non-veg' }].map(({ v, l }) => (
                      <button key={l} type="button"
                        style={{ flex: 1, height: 36, borderRadius: 8, border: `1.5px solid ${form.veg === v ? '#1D9E75' : '#E5E7EB'}`, background: form.veg === v ? '#E1F5EE' : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: form.veg === v ? '#0F6E56' : '#6B7280' }}
                        onClick={() => set('veg', v)}>{l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Spicy + Popular */}
              <div style={{ display: 'flex', gap: 12 }}>
                {[['spicy', '🌶 Spicy'], ['popular', '⭐ Popular']].map(([k, l]) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                    <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} style={{ accentColor: '#1D9E75' }} />
                    {l}
                  </label>
                ))}
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Saving…' : modal.mode === 'edit' ? 'Save changes' : 'Add item'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}