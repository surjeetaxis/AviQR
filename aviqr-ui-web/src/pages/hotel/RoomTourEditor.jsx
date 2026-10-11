import { useState } from 'react';
import { X, Upload, Trash2, Link2 } from 'lucide-react';
import { hotelApi, mediaApi } from '../../api/index.js';

// Booking-engine display for one room: which side/view it has, where it sits on the
// floor map, and the tour media guests see. Rooms without media get an illustrative
// 3D preview on the booking site, so every field here is optional.
const SIDES = ['East wing', 'West wing', 'North side', 'South side', 'East side', 'West side'];
const VIEWS = ['Sea view', 'City view', 'Garden view', 'Pool view', 'Mountain view', 'Valley view', 'River view', 'Courtyard view', 'Fort view'];

const SLOTS = [
  { key: 'panoramaUrl', kind: 'panorama', label: '360° photo', accept: 'image/jpeg,image/png,image/webp', hint: 'Equirectangular photo (2:1) from a 360° camera or phone panorama · up to 20 MB' },
  { key: 'tourVideoUrl', kind: 'video', label: 'Video tour', accept: 'video/*', hint: 'Walk-through video, MP4 recommended · up to 20 MB' },
  { key: 'model3dUrl', kind: 'model', label: '3D model', accept: '.glb,.gltf', hint: 'GLB/GLTF scan of the room · up to 10 MB' },
];

const isHttps = (v) => { try { return new URL(v).protocol === 'https:'; } catch { return false; } };

export const hasTourMedia = (room) => !!(room.panoramaUrl || room.tourVideoUrl || room.model3dUrl);

export default function RoomTourEditor({ room, hotelId, onClose, onSaved }) {
  const [form, setForm] = useState({
    roomSide: room.roomSide || '', viewType: room.viewType || '',
    mapX: room.mapX ?? null, mapY: room.mapY ?? null,
    panoramaUrl: room.panoramaUrl || '', tourVideoUrl: room.tourVideoUrl || '', model3dUrl: room.model3dUrl || '',
  });
  const [uploading, setUploading] = useState({});
  const [warnings, setWarnings] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const busy = saving || Object.values(uploading).some((p) => p != null);

  const checkPanorama = (file) => new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(Math.abs(img.naturalWidth / img.naturalHeight - 2) < 0.15); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(true); };
    img.src = url;
  });

  const upload = async (slot, file) => {
    if (!file) return;
    setError('');
    setWarnings((w) => ({ ...w, [slot.key]: '' }));
    if (slot.kind === 'panorama' && !(await checkPanorama(file)))
      setWarnings((w) => ({ ...w, [slot.key]: "This photo isn't 2:1, so it may look stretched. 360° photos are twice as wide as they are tall." }));
    setUploading((u) => ({ ...u, [slot.key]: 0 }));
    try {
      const res = await mediaApi.upload(file, `room-tours-${hotelId}`, slot.kind, {
        onUploadProgress: (e) => e.total && setUploading((u) => ({ ...u, [slot.key]: Math.round((e.loaded / e.total) * 100) })),
      });
      set(slot.key, res.data.data.url);
    } catch (e) {
      setError(e.response?.data?.message || `Could not upload the ${slot.label.toLowerCase()}`);
    } finally {
      setUploading((u) => ({ ...u, [slot.key]: null }));
    }
  };

  const pasteLink = (slot) => {
    const v = prompt(`HTTPS link to the ${slot.label.toLowerCase()}`, form[slot.key] || 'https://');
    if (v == null) return;
    if (v && !isHttps(v.trim())) { setError('Links must start with https://'); return; }
    set(slot.key, v.trim());
  };

  const placeOnMap = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    set('mapX', Math.round(((e.clientX - box.left) / box.width) * 100));
    set('mapY', Math.round(((e.clientY - box.top) / box.height) * 100));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const body = {
      floor: room.floor || null, // the endpoint replaces every display field, floor included
      roomSide: form.roomSide.trim() || null, viewType: form.viewType.trim() || null,
      mapX: form.mapX, mapY: form.mapY,
      panoramaUrl: form.panoramaUrl || null, tourVideoUrl: form.tourVideoUrl || null, model3dUrl: form.model3dUrl || null,
    };
    try {
      await hotelApi.updateRoomBookingDisplay(room.id, body);
      onSaved({ ...room, ...body, floor: room.floor });
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not save the room tour');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rte-overlay" onClick={() => !busy && onClose()}>
      <div className="rte-dialog" role="dialog" aria-modal="true" aria-label={`Room ${room.number} tour`} onClick={(e) => e.stopPropagation()}>
        <div className="rte-head">
          <div>
            <div className="rte-title">Room {room.number} · Booking site tour</div>
            <div className="rte-sub">{[room.type, room.floor].filter(Boolean).join(' · ')}</div>
          </div>
          <button className="rte-close" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="rte-body">
          <section>
            <div className="rte-section-title">Side and view</div>
            <div className="rte-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="rte-side">Side / wing</label>
                <input id="rte-side" className="form-input" list="rte-sides" value={form.roomSide} maxLength={255}
                  onChange={(e) => set('roomSide', e.target.value)} placeholder="e.g. East wing" />
                <datalist id="rte-sides">{SIDES.map((s) => <option key={s} value={s} />)}</datalist>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="rte-view">View</label>
                <input id="rte-view" className="form-input" list="rte-views" value={form.viewType} maxLength={255}
                  onChange={(e) => set('viewType', e.target.value)} placeholder="e.g. Sea view" />
                <datalist id="rte-views">{VIEWS.map((v) => <option key={v} value={v} />)}</datalist>
              </div>
            </div>
            <p className="rte-hint">Include north, south, east or west in the side so guests see which way the window faces.</p>
          </section>

          <section>
            <div className="rte-section-title">Position on the floor map</div>
            <div className="rte-map" onClick={placeOnMap} role="button" tabIndex={0} aria-label="Click to place this room on the floor map">
              <span className="rte-map-label">{room.floor || 'Floor'} · click to place</span>
              {form.mapX != null && form.mapY != null && <span className="rte-map-pin" style={{ left: `${form.mapX}%`, top: `${form.mapY}%` }}>{room.number}</span>}
            </div>
            {form.mapX != null && (
              <button type="button" className="rte-link" onClick={() => { set('mapX', null); set('mapY', null); }}>Clear position</button>
            )}
          </section>

          <section>
            <div className="rte-section-title">Tour media</div>
            <p className="rte-hint">Guests see the 360° photo first, then the video, then the 3D model. With no media, the booking site shows an illustrative 3D preview of this room.</p>
            {SLOTS.map((slot) => {
              const url = form[slot.key];
              const progress = uploading[slot.key];
              return (
                <div key={slot.key} className="rte-slot">
                  <div className="rte-slot-preview">
                    {url && slot.kind === 'panorama' ? <img src={url} alt="" />
                      : url && slot.kind === 'video' ? <video src={url} muted playsInline preload="metadata" />
                      : <span>{url ? 'GLB' : '—'}</span>}
                  </div>
                  <div className="rte-slot-info">
                    <b>{slot.label}</b>
                    <small>{progress != null ? `Uploading… ${progress}%` : url ? url.split('/').pop() : slot.hint}</small>
                    {warnings[slot.key] && <small className="rte-warn">{warnings[slot.key]}</small>}
                  </div>
                  <div className="rte-slot-actions">
                    <label className={`btn-room-action ${busy ? 'is-disabled' : ''}`}>
                      <Upload size={13} /> {url ? 'Replace' : 'Upload'}
                      <input type="file" accept={slot.accept} hidden disabled={busy}
                        onChange={(e) => { upload(slot, e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                    <button type="button" className="btn-room-action" onClick={() => pasteLink(slot)} disabled={busy} title="Use a link instead"><Link2 size={13} /></button>
                    {url && <button type="button" className="btn-room-action" onClick={() => set(slot.key, '')} disabled={busy} title="Remove"><Trash2 size={13} /></button>}
                  </div>
                </div>
              );
            })}
          </section>
          {error && <div className="rte-error">{error}</div>}
        </div>

        <div className="rte-foot">
          <button className="btn-room-action" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{saving ? 'Saving…' : 'Save tour'}</button>
        </div>
      </div>
    </div>
  );
}
