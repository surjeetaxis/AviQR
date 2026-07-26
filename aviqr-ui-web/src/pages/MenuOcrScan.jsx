import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Upload, CheckCircle2, XCircle } from 'lucide-react';
import { useActiveShopId } from '../hooks/useActiveShopId.js';
import { ocrApi } from '../api/index.js';
import './MenuOcrScan.css';

const STATUS_CFG = {
  PENDING:    { cls: 'ocr-processing', label: 'Pending' },
  PROCESSING: { cls: 'ocr-processing', label: 'Processing' },
  COMPLETED:  { cls: 'ocr-done',       label: 'Completed' },
  FAILED:     { cls: 'ocr-failed',     label: 'Failed' },
};

function StatusPill({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.PENDING;
  return <span className={`ocr-status-pill ${cfg.cls}`}>{cfg.label}</span>;
}

export default function MenuOcrScan() {
  const shopId = useActiveShopId();
  const nav = useNavigate();
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const [file, setFile]         = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [job, setJob]               = useState(null);
  const [approving, setApproving]   = useState(false);
  const [approved, setApproved]     = useState(false);
  const [recentJobs, setRecentJobs] = useState([]);

  const loadRecentJobs = useCallback(async () => {
    if (!shopId) return;
    try {
      const res = await ocrApi.getByShop(shopId);
      setRecentJobs(res.data.data || []);
    } catch { /* non-critical */ }
  }, [shopId]);

  useEffect(() => { loadRecentJobs(); }, [loadRecentJobs]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const startPolling = (jobId) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await ocrApi.getJob(jobId);
        const j = res.data.data;
        setJob(j);
        if (j.status === 'COMPLETED' || j.status === 'FAILED') {
          stopPolling();
          loadRecentJobs();
        }
      } catch {
        stopPolling();
      }
    }, 2000);
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setJob(null);
    setApproved(false);
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
      await ocrApi.approve(job.id);
      setApproved(true);
      loadRecentJobs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve items.');
    } finally {
      setApproving(false);
    }
  };

  const groupedItems = (job?.extractedItems || []).reduce((acc, item) => {
    const cat = item.category || 'Uncategorised';
    (acc[cat] ||= []).push(item);
    return acc;
  }, {});

  if (!shopId) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', color: '#6B7280' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>No restaurant yet</h2>
        <p style={{ fontSize: 14 }}>Complete the setup before scanning a menu.</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title"><ScanLine size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Scan Menu (OCR)</h1>
          <p className="page-subtitle">Upload a photo of your printed menu and let AviQR extract the items automatically</p>
        </div>
      </div>

      {/* Upload card */}
      <div className="card">
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div className="ocr-upload-box" onClick={() => fileInputRef.current?.click()}>
            {previewUrl ? (
              <img src={previewUrl} alt="Menu preview" className="ocr-upload-preview" />
            ) : (
              <div className="ocr-upload-placeholder">
                <Upload size={28} />
                <span>Click to choose a photo or PDF</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={onFileChange}
          />

          <div style={{ flex: 1, minWidth: 220 }}>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 14 }}>
              Works best with a clear, well-lit photo of a printed menu (JPG, PNG, or PDF, up to 20&nbsp;MB).
            </p>
            <button
              className="btn btn-secondary"
              style={{ marginRight: 10 }}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose photo
            </button>
            <button
              className="btn btn-primary"
              disabled={!file || uploading || (job && job.status === 'PROCESSING')}
              onClick={handleScan}
            >
              {uploading ? 'Uploading…' : 'Scan Menu'}
            </button>
          </div>
        </div>
      </div>

      {/* Job status / results */}
      {job && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="card-title">Scan result</div>
            <StatusPill status={job.status} />
          </div>

          {job.status === 'PROCESSING' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-500)', fontSize: 13, padding: '20px 0' }}>
              <div className="ocr-spinner" />
              Extracting items from your menu photo…
            </div>
          )}

          {job.status === 'FAILED' && (
            <div className="demo-notice" style={{ background: 'var(--red-bg)', borderColor: '#FCA5A5', color: 'var(--red)' }}>
              ⚠ {job.errorMessage || 'OCR extraction failed. Please try a clearer photo.'}
            </div>
          )}

          {job.status === 'COMPLETED' && (
            <>
              {approved ? (
                <div className="demo-notice" style={{ background: 'var(--green-light)', borderColor: 'var(--green-mid)', color: 'var(--green-darker)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={16} /> Items added to your menu.{' '}
                  <button className="btn-link" onClick={() => nav('/menu')}>Go to Menu →</button>
                </div>
              ) : (
                <>
                  {Object.entries(groupedItems).map(([category, items]) => (
                    <div key={category} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{category}</div>
                      {items.map((item, idx) => (
                        <div key={idx} className="ocr-item-row">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                            {item.description && (
                              <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{item.description}</div>
                            )}
                          </div>
                          <span className="ocr-confidence-pill">{Math.round((item.confidence || 0) * 100)}% confident</span>
                          <span style={{ fontSize: 14, fontWeight: 700, minWidth: 60, textAlign: 'right' }}>₹{item.price}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  <button className="btn btn-primary" disabled={approving} onClick={handleApprove} style={{ marginTop: 8 }}>
                    {approving ? 'Adding to menu…' : 'Approve & Add to Menu'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Recent scans */}
      {recentJobs.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 10 }}>Recent scans</div>
          {recentJobs.map(j => (
            <div key={j.id} className="ocr-job-row">
              <div className="ocr-job-icon">
                {j.status === 'FAILED' ? <XCircle size={16} style={{ color: 'var(--red)' }} /> : <ScanLine size={16} style={{ color: 'var(--gray-500)' }} />}
              </div>
              <div className="ocr-job-info">
                <div className="ocr-job-shop">{j.fileType}</div>
                <div className="ocr-job-file">
                  {j.status === 'COMPLETED' ? `${j.extractedItems?.length || 0} items extracted` : STATUS_CFG[j.status]?.label || j.status}
                  {j.ownerApproved ? ' · added to menu' : ''}
                </div>
              </div>
              <div className="ocr-job-time">{j.createdAt ? new Date(j.createdAt).toLocaleString('en-IN') : ''}</div>
              <StatusPill status={j.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
