import { useState, useEffect, useRef } from 'react';
import { Upload, CheckCircle2, Loader2, Edit2 } from 'lucide-react';
import { ocrApi } from '../../api/index.js';
import MenuItemModal, { EMPTY_MENU_ITEM } from './MenuItemModal.jsx';

// OcrJob.ExtractedItem (backend) <-> MenuItemModal's form shape.
function extractedItemToForm(item) {
  return {
    ...EMPTY_MENU_ITEM,
    name: item.name || '',
    desc: item.description || '',
    price: String(item.price ?? ''),
    veg: item.veg !== false,
    spicy: !!item.spicy,
    popular: !!item.popular,
    nameHi: item.nameHi || '', nameTa: item.nameTa || '', nameTe: item.nameTe || '',
    imageUrl: item.imageUrl || '', videoUrl: item.videoUrl || '', modelUrl: item.modelUrl || '',
    mediaType: item.mediaType || 'NONE',
  };
}

function formToExtractedItem(payload, original) {
  return {
    ...original,
    name: payload.name, description: payload.desc, price: String(payload.price),
    veg: payload.veg, spicy: !!payload.spicy, popular: !!payload.popular,
    nameHi: payload.nameHi, nameTa: payload.nameTa, nameTe: payload.nameTe,
    imageUrl: payload.imageUrl, videoUrl: payload.videoUrl, modelUrl: payload.modelUrl,
    mediaType: payload.mediaType,
  };
}

// Embeddable "scan menu with OCR" step, used inside the onboarding wizard.
// Deliberately a separate, simpler component from pages/MenuOcrScan.jsx
// (no recent-scans history, no page chrome) rather than a shared extraction,
// so the already-working standalone OCR page isn't touched by this change.
export default function MenuOcrStep({ shopId, onApproved }) {
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState(null);
  const [editedItems, setEditedItems] = useState([]);
  const [editIdx, setEditIdx] = useState(null);
  const [approving, setApproving] = useState(false);

  // Seed the editable copy once — polling stops right after COMPLETED, so this
  // won't re-fire and clobber in-progress edits on later ticks.
  useEffect(() => {
    if (job?.status === 'COMPLETED') setEditedItems(job.extractedItems || []);
  }, [job?.id, job?.status]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const startPolling = (jobId) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await ocrApi.getJob(jobId);
        const j = res.data.data;
        setJob(j);
        if (j.status === 'COMPLETED' || j.status === 'FAILED') stopPolling();
      } catch { stopPolling(); }
    }, 2000);
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setJob(null);
  };

  const handleScan = async () => {
    if (!file || !shopId) return;
    setUploading(true);
    try {
      const res = await ocrApi.upload(shopId, file);
      const startedJob = res.data.data;
      setJob(startedJob);
      startPolling(startedJob.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start OCR scan. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async () => {
    if (!job) return;
    setApproving(true);
    try {
      await ocrApi.approve(job.id, editedItems);
      onApproved?.(editedItems.length || 0);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add items to your menu.');
    } finally {
      setApproving(false);
    }
  };

  const saveEditedItem = (payload) => {
    setEditedItems(prev => prev.map((it, i) => (i === editIdx ? formToExtractedItem(payload, it) : it)));
    setEditIdx(null);
  };

  const groupedItems = editedItems.reduce((acc, item, idx) => {
    const cat = item.category || 'Uncategorised';
    (acc[cat] ||= []).push({ ...item, _idx: idx });
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 16 }}>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: 120, height: 120, borderRadius: 12, border: '2px dashed #E5E7EB',
            background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
          }}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Menu preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#9CA3AF', fontSize: 11, textAlign: 'center', padding: 8 }}>
              <Upload size={22} />
              <span>Choose a photo</span>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={onFileChange} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 10 }}>
            A clear photo of your printed menu (JPG, PNG or PDF, up to 20&nbsp;MB).
          </p>
          <button type="button" style={{ ...btnGhost, marginRight: 8 }} onClick={() => fileInputRef.current?.click()}>Choose photo</button>
          <button
            type="button"
            style={{ ...btnPrimarySm, opacity: (!file || uploading || job?.status === 'PROCESSING') ? 0.5 : 1 }}
            disabled={!file || uploading || job?.status === 'PROCESSING'}
            onClick={handleScan}
          >
            {uploading ? 'Uploading…' : 'Scan Menu'}
          </button>
        </div>
      </div>

      {job?.status === 'PROCESSING' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6B7280', fontSize: 13, padding: '12px 0' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          Extracting items from your menu photo…
        </div>
      )}

      {job?.status === 'FAILED' && (
        <p style={{ color: '#DC2626', fontSize: 13, background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 12px' }}>
          ⚠ {job.errorMessage || 'OCR extraction failed. Please try a clearer photo, or skip and add items manually.'}
        </p>
      )}

      {job?.status === 'COMPLETED' && (
        <>
          <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 14 }}>
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>{category}</div>
                {items.map((item) => (
                  <div key={item._idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, border: `2px solid ${item.veg !== false ? '#1D9E75' : '#DC2626'}`, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>₹{item.price}</div>
                    <button type="button" title="Edit item"
                      style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      onClick={() => setEditIdx(item._idx)}>
                      <Edit2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <button type="button" style={{ ...btnPrimarySm, opacity: approving ? 0.6 : 1 }} disabled={approving} onClick={handleApprove}>
            {approving ? 'Adding…' : <><CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Approve & add to menu</>}
          </button>
        </>
      )}

      {editIdx !== null && (
        <MenuItemModal
          title="Edit scanned item"
          submitLabel="Save changes"
          initialForm={extractedItemToForm(editedItems[editIdx])}
          onSave={saveEditedItem}
          onClose={() => setEditIdx(null)}
        />
      )}
    </div>
  );
}

const btnGhost = {
  padding: '10px 16px', background: 'transparent', color: '#6B7280',
  border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
const btnPrimarySm = {
  padding: '10px 18px', background: '#1D9E75', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
