import { useState, useEffect, useRef } from 'react';
import { X, Video, Box, Image as ImageIcon } from 'lucide-react';

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

function readFileAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
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

// ── Constants ──────────────────────────────────────────────────────────────────

const MEDIA_TABS = [
  { id: 'NONE',     icon: '🚫', label: 'None'      },
  { id: 'IMAGE',    icon: '🖼️', label: 'Image'     },
  { id: 'VIDEO',    icon: '🎬', label: 'Video'     },
  { id: 'MODEL_3D', icon: '🧊', label: '3D Model'  },
];

export const EMPTY_MENU_ITEM = {
  name: '', desc: '', price: '', veg: true, spicy: false, popular: false,
  nameHi: '', nameTa: '', nameKn: '', nameTe: '', nameMl: '',
  stockQty: '', trackStock: false,
  imageUrl: '', videoUrl: '', modelUrl: '', mediaType: 'NONE',
};

// ── Add/Edit Item modal ─────────────────────────────────────────────────────────
// Shared by the normal Menu page (Menu.jsx) and the OCR scan-result review screens
// (MenuOcrScan.jsx / MenuOcrStep.jsx) so editing a scanned item looks and behaves
// exactly like editing a regular menu item. Callers own persistence — onSave just
// receives the finished payload (menuApi call, or a local array update for OCR).
export default function MenuItemModal({ title, submitLabel, initialForm, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_MENU_ITEM, ...initialForm });
  const [mediaTab, setMediaTab] = useState(initialForm?.mediaType || 'NONE');
  const [saving, setSaving] = useState(false);

  const imgInputRef   = useRef(null);
  const videoInputRef = useRef(null);
  const modelInputRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return;
    setSaving(true);
    try {
      await onSave({ ...form, mediaType: mediaTab });
    } finally {
      setSaving(false);
    }
  };

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2 MB for local preview. Use a CDN URL for production.'); return; }
    set('imageUrl', await readFileAsDataUrl(file));
  };

  const handleVideoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert('Video files > 20 MB should be hosted on YouTube or Vimeo. Paste the URL above instead.');
      return;
    }
    set('videoUrl', await readFileAsDataUrl(file));
  };

  const handleModelFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('3D model > 10 MB. Please host it on a CDN and paste the URL instead.');
      return;
    }
    set('modelUrl', await readFileAsDataUrl(file));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <button style={{ background: 'var(--gray-100)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 24px 24px' }}>

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

          <div className="media-section">
            <div className="media-section-title">
              <span>📽 Rich Media</span>
              <span className="media-section-sub">Add image, video, or 3D model to bring this item to life</span>
            </div>

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
                    <button type="button" className="media-upload-btn" onClick={() => imgInputRef.current?.click()} title="Upload from device">
                      <ImageIcon size={14} /> Upload
                    </button>
                    <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
                  </div>
                  <div className="media-tip">Tip: Use a CDN like Cloudinary or imgbb for hosted images</div>
                </div>
                <ImagePreview url={form.imageUrl} />
              </div>
            )}

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
                    <button type="button" className="media-upload-btn" onClick={() => videoInputRef.current?.click()} title="Upload from device (≤20 MB)">
                      <Video size={14} /> Upload
                    </button>
                    <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoFile} />
                  </div>
                  <div className="media-tip">💡 Best: upload to <strong>YouTube</strong> and paste the link here for fast loading</div>
                </div>
                {form.videoUrl && <VideoPreview url={form.videoUrl} />}
              </div>
            )}

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
                    <button type="button" className="media-upload-btn" onClick={() => modelInputRef.current?.click()} title="Upload from device (≤10 MB)">
                      <Box size={14} /> Upload
                    </button>
                    <input ref={modelInputRef} type="file" accept=".glb,.gltf" style={{ display: 'none' }} onChange={handleModelFile} />
                  </div>
                  <div className="media-tip">💡 Host your .glb file on Google Drive (public link) or a CDN, then paste the URL</div>
                </div>

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

          <div style={{ display: 'flex', gap: 12 }}>
            {[['spicy', '🌶 Spicy'], ['popular', '⭐ Popular']].map(([k, l]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} style={{ accentColor: '#1D9E75' }} />
                {l}
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Saving…' : submitLabel}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
