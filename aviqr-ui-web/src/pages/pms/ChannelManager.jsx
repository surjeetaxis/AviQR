// Channel Manager page: connections overview, channel-manager and direct-OTA
// mappings on separate tabs, a channel calendar (what each mapped room type and
// rate plan sends, bookings per night, pending-sync dates), filterable sync logs
// and channel bookings. Every sync can be narrowed to inventory / rates /
// restrictions, to chosen room types, a connection and a date range.
import { useState, useEffect, useCallback, Fragment } from 'react';
import { RefreshCw, Plus, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, X, Trash2, Pencil } from 'lucide-react';
import { pmsApi } from '../../api/index.js';
import '../admin/Admin.css';

const inputStyle = { height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 13 };
const btnPrimary = { width: 'auto', height: 34, padding: '0 12px', background: 'var(--green)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none' };
// .admin-row-btn is styled for small grey icon buttons, so text buttons set their own colours.
const btnSecondary = { width: 'auto', height: 34, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: 'var(--gray-700)', fontWeight: 500 };
const btnSmall = { width: 'auto', height: 28, padding: '0 8px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', color: 'var(--gray-700)', fontWeight: 500 };
const disabledStyle = (disabled) => disabled ? { opacity: 0.45, cursor: 'not-allowed' } : null;
const btnDanger = { ...btnSmall, color: 'var(--red)' };
const preStyle = { fontSize: 11.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 6, padding: 8, margin: 0, maxHeight: 260, overflow: 'auto' };
const muted = { fontSize: 12, color: 'var(--gray-500)' };

const CM_CHANNELS = ['AXISROOMS', 'GENERIC'];
const OTA_CHANNELS = ['BOOKING_COM', 'MMT', 'AGODA', 'EXPEDIA'];
const SYNC_TYPES = [
  { key: 'INVENTORY', label: 'Inventory' },
  { key: 'RATES', label: 'Rates' },
  { key: 'RESTRICTIONS', label: 'Restrictions' },
];
const TYPE_LABEL = { INVENTORY: 'Inventory', RATES: 'Rates', RESTRICTIONS: 'Restrictions', BOOKING: 'Booking' };
const TRIGGER_LABEL = { MANUAL: 'Manual', AUTO: 'Auto (on save)', SCHEDULED: 'Scheduled', RESERVATION: 'Reservation change', CHANNEL: 'From channel' };
// Each view is its own entry in the hotel dashboard's sidebar (Distribution group):
// sidebar tab key → view, and the page title/subtitle each view shows.
export const CHANNEL_NAV_VIEWS = {
  channels: 'overview', channelmappings: 'cm', otamappings: 'ota',
  channelcalendar: 'calendar', channellogs: 'logs', channelbookings: 'bookings',
};
const VIEW_TO_NAV = Object.fromEntries(Object.entries(CHANNEL_NAV_VIEWS).map(([k, v]) => [v, k]));
const VIEW_META = {
  overview: { title: 'Channel Manager', subtitle: 'Every channel connection, its mappings and last sync — sync all or just inventory, rates or restrictions.' },
  cm: { title: 'Channel Manager Mappings', subtitle: 'AxisRooms / channel-manager connections: which AviQR room type and rate plan feeds which channel room and rate plan.' },
  ota: { title: 'OTA Mappings', subtitle: 'Direct connections to a single OTA (Booking.com, MakeMyTrip, Agoda, Expedia).' },
  calendar: { title: 'Channel Calendar', subtitle: 'What each mapped room type and rate plan sends per night, bookings from channels, and dates not yet synced.' },
  logs: { title: 'Channel Sync Logs', subtitle: 'Every push to and notification from a channel, with the exact request and response.' },
  bookings: { title: 'Channel Bookings', subtitle: 'Bookings received from channels and their latest status.' },
};

function localDateStr(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function today() { return localDateStr(new Date()); }
function addDays(dateStr, n) { const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return localDateStr(d); }
function fmtTime(s) { if (!s) return '—'; const d = new Date(s); return isNaN(d) ? s : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
function errMsg(err, fallback) { return err?.response?.data?.message || fallback; }

function StatusPill({ status }) {
  if (!status) return <span className="plan-pill" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }}>Never</span>;
  if (status === 'SUCCESS') return <span className="status-pill st-active">Success</span>;
  if (status === 'SKIPPED') return <span className="status-pill" style={{ background: '#fff7e6', color: '#b26a00' }}>Skipped</span>;
  return <span className="status-pill st-suspended">Failed</span>;
}

// One chip per sync type: last status + when — the at-a-glance health of a room/connection.
function LastSyncChips({ lastSync, types = SYNC_TYPES }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {types.map(t => {
        const s = lastSync?.[t.key];
        return (
          <span key={t.key} title={s ? `${s.message || ''}\n${TRIGGER_LABEL[s.trigger] || s.trigger || ''}` : 'Never synced'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, border: '1px solid var(--gray-200)', borderRadius: 999, padding: '2px 8px', background: '#fff' }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: !s ? 'var(--gray-300)' : s.status === 'SUCCESS' ? 'var(--green)' : s.status === 'SKIPPED' ? '#f0a020' : 'var(--red)' }} />
            {t.label}{s ? ` · ${fmtTime(s.at)}` : ' · never'}
          </span>
        );
      })}
    </div>
  );
}

function Banner({ banner, onClose }) {
  if (!banner) return null;
  const ok = banner.kind === 'ok';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 8, fontSize: 13,
      background: ok ? 'var(--green-light)' : 'var(--red-bg)', color: ok ? 'var(--green-darker)' : 'var(--red)' }}>
      {ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      <div style={{ flex: 1 }}>{banner.text}</div>
      <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={14} /></button>
    </div>
  );
}

// ── Sync dialog: pick types, room types, connection and dates, then run ─────────
function SyncDialog({ hotelId, roomTypes, connections, preset, onClose, onDone }) {
  const [types, setTypes] = useState(preset?.types || SYNC_TYPES.map(t => t.key));
  const [roomTypeIds, setRoomTypeIds] = useState(preset?.roomTypeIds || []);
  const [conn, setConn] = useState(preset?.connection || '');
  const [from, setFrom] = useState(preset?.from || '');
  const [to, setTo] = useState(preset?.to || '');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  const run = async () => {
    if (types.length === 0) { setError('Pick at least one of inventory, rates or restrictions'); return; }
    if (from && to && to < from) { setError("'To' date is before 'from'"); return; }
    const [channel, externalPropertyId] = conn ? conn.split('|') : [null, null];
    setRunning(true); setError(''); setResults(null);
    try {
      const res = await pmsApi.syncChannels(hotelId, {
        types, roomTypeIds: roomTypeIds.length ? roomTypeIds : null,
        channel: channel || null, externalPropertyId: externalPropertyId || null,
        from: from || null, to: to || null,
      });
      setResults(res.data.data || []);
      onDone?.();
    } catch (err) { setError(errMsg(err, 'Sync failed')); }
    finally { setRunning(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="admin-table-card" style={{ width: 'min(620px, 100%)', maxHeight: '90vh', overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <strong style={{ flex: 1, fontSize: 15 }}>Sync to channels</strong>
          <button type="button" className="admin-row-btn" style={btnSmall} onClick={onClose}><X size={14} /></button>
        </div>

        <div>
          <div style={{ ...muted, fontWeight: 700, marginBottom: 6 }}>WHAT TO SEND</div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {SYNC_TYPES.map(t => (
              <label key={t.key} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={types.includes(t.key)} onChange={() => toggle(types, setTypes, t.key)} /> {t.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div style={{ ...muted, fontWeight: 700, marginBottom: 6 }}>CONNECTION</div>
          <select value={conn} onChange={e => setConn(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
            <option value="">All live connections</option>
            {connections.filter(c => c.live).map(c => (
              <option key={`${c.channel}|${c.externalPropertyId}`} value={`${c.channel}|${c.externalPropertyId}`}>{c.channel} · property {c.externalPropertyId}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ ...muted, fontWeight: 700, marginBottom: 6 }}>ROOM TYPES <span style={{ fontWeight: 400 }}>(none ticked = all mapped)</span></div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {roomTypes.map(rt => (
              <label key={rt.id} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={roomTypeIds.includes(rt.id)} onChange={() => toggle(roomTypeIds, setRoomTypeIds, rt.id)} /> {rt.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div style={{ ...muted, fontWeight: 700, marginBottom: 6 }}>DATES <span style={{ fontWeight: 400 }}>(blank = today to one year ahead; at most 450 days out)</span></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" value={from} min={today()} onChange={e => setFrom(e.target.value)} style={inputStyle} />
            <span style={muted}>to</span>
            <input type="date" value={to} min={from || today()} onChange={e => setTo(e.target.value)} style={inputStyle} />
            {(from || to) && <button type="button" className="admin-row-btn" style={btnSmall} onClick={() => { setFrom(''); setTo(''); }}>Clear</button>}
          </div>
        </div>

        {error && <Banner banner={{ kind: 'err', text: error }} onClose={() => setError('')} />}

        {results && (
          <div style={{ border: '1px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden' }}>
            {results.length === 0 && <div style={{ padding: 10, ...muted }}>Nothing was sent.</div>}
            {results.map(r => (
              <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', borderTop: '1px solid var(--gray-100)', fontSize: 12.5 }}>
                <StatusPill status={r.status} />
                <span style={{ fontWeight: 600, minWidth: 82 }}>{TYPE_LABEL[r.syncType] || r.syncType}</span>
                <span style={{ flex: 1 }}>{r.message}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="admin-row-btn" style={btnSecondary} onClick={onClose}>{results ? 'Close' : 'Cancel'}</button>
          <button type="button" className="admin-row-btn" style={btnPrimary} onClick={run} disabled={running}>
            <RefreshCw size={14} /> {running ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewView({ overview, onSync, onGo }) {
  if (!overview) return <div style={muted}>Loading…</div>;
  const { connections, unmappedRoomTypes, syncCountsLast24h: counts } = overview;
  const activeMappings = connections.reduce((n, c) => n + c.activeCount, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card"><div className="admin-kpi-value">{connections.length}</div><div className="admin-kpi-label">Connections ({connections.filter(c => c.live).length} live)</div></div>
        <div className="admin-kpi-card"><div className="admin-kpi-value">{activeMappings}</div><div className="admin-kpi-label">Active mappings</div></div>
        <div className="admin-kpi-card"><div className="admin-kpi-value">{counts?.SUCCESS || 0}</div><div className="admin-kpi-label">Successful syncs (24h)</div></div>
        <div className="admin-kpi-card"><div className="admin-kpi-value" style={{ color: counts?.FAILED ? 'var(--red)' : undefined }}>{counts?.FAILED || 0}</div><div className="admin-kpi-label">Failed syncs (24h) · {counts?.SKIPPED || 0} skipped</div></div>
      </div>

      {unmappedRoomTypes.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: '#fff7e6', color: '#8a5300', fontSize: 13 }}>
          <AlertCircle size={16} />
          <span style={{ flex: 1 }}>Not on any channel: <strong>{unmappedRoomTypes.map(r => r.roomTypeName).join(', ')}</strong> — these room types get no inventory, rates or bookings from channels.</span>
          <button type="button" className="admin-row-btn" style={btnSmall} onClick={() => onGo('cm')}>Map now</button>
        </div>
      )}

      {connections.length === 0 && (
        <div className="admin-table-card" style={{ padding: 24, textAlign: 'center', ...muted }}>
          No channel connections yet. Add one under <a href="#" onClick={e => { e.preventDefault(); onGo('cm'); }}>Channel Manager Mappings</a>.
        </div>
      )}

      {connections.map(c => (
        <div key={`${c.channel}|${c.externalPropertyId}|${c.cmBaseUrl}`} className="admin-table-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 15 }}>{c.channel}</strong>
            <span style={muted}>property {c.externalPropertyId}</span>
            <span className={c.live ? 'status-pill st-active' : 'plan-pill'}>{c.live ? 'Live' : 'Simulated'}</span>
            <span className="plan-pill">{c.kind === 'CHANNEL_MANAGER' ? 'Channel manager' : 'Direct OTA'}</span>
            <span style={muted}>{c.activeCount}/{c.mappingCount} mappings active · {c.bookingsLast30Days} bookings in 30 days</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="admin-row-btn" style={btnPrimary} onClick={() => onSync({ connection: `${c.channel}|${c.externalPropertyId}` })}><RefreshCw size={14} /> Sync all</button>
              {SYNC_TYPES.map(t => (
                <button key={t.key} type="button" className="admin-row-btn" style={btnSecondary}
                  onClick={() => onSync({ connection: `${c.channel}|${c.externalPropertyId}`, types: [t.key] })}>{t.label}</button>
              ))}
            </div>
          </div>
          <LastSyncChips lastSync={c.lastSync} />
          <table className="admin-table">
            <thead><tr><th>AviQR room type</th><th>Channel room</th><th>Rate plans (AviQR → channel)</th><th>Last sync</th></tr></thead>
            <tbody>
              {c.roomTypes.map(rt => (
                <tr key={`${rt.roomTypeId}|${rt.externalRoomTypeId}`}>
                  <td className="admin-td-shop">{rt.roomTypeName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{rt.externalRoomTypeId}</td>
                  <td style={{ fontSize: 12 }}>
                    {rt.ratePlans.map(p => (
                      <div key={p.mappingId} style={{ opacity: p.active ? 1 : 0.5 }}>
                        {p.internalRatePlanName} → <span style={{ fontFamily: 'monospace' }}>{p.externalRatePlanId || '(inventory only)'}</span>{!p.active && ' · paused'}
                      </div>
                    ))}
                  </td>
                  <td><LastSyncChips lastSync={rt.lastSync} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ── Mappings (one component for both the channel-manager and direct-OTA tabs) ──
const emptyMapping = (channel) => ({ channel, roomTypeId: '', internalRatePlanId: '', externalPropertyId: '', externalRoomTypeId: '', externalRatePlanId: '', accessKey: '', channelId: '', cmBaseUrl: '' });

function MappingsView({ hotelId, roomTypes, channels, kindLabel, mappings, overview, onChanged, onSync }) {
  const [form, setForm] = useState(emptyMapping(channels[0]));
  const [formPlans, setFormPlans] = useState([]);
  const [plansByRoomType, setPlansByRoomType] = useState({});
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selected, setSelected] = useState([]);
  const [banner, setBanner] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const mine = mappings.filter(m => channels.includes(m.channel));
  const rtName = (id) => roomTypes.find(r => r.id === id)?.name || '(inactive room type)';
  const planName = (rtId, planId) => planId ? (plansByRoomType[rtId]?.find(p => p.id === planId)?.name || '(inactive rate plan)') : 'First active rate plan';
  const lastSyncFor = (m) => overview?.connections
    ?.find(c => c.channel === m.channel && c.externalPropertyId === m.externalPropertyId)
    ?.roomTypes?.find(r => r.roomTypeId === m.roomTypeId && r.externalRoomTypeId === m.externalRoomTypeId)?.lastSync;

  useEffect(() => {
    const ids = [...new Set(roomTypes.map(r => r.id))];
    Promise.all(ids.map(id => pmsApi.listRatePlans(id).then(r => [id, r.data.data || []]).catch(() => [id, []])))
      .then(entries => setPlansByRoomType(Object.fromEntries(entries)));
  }, [roomTypes]);
  useEffect(() => { setFormPlans(form.roomTypeId ? (plansByRoomType[form.roomTypeId] || []) : []); }, [form.roomTypeId, plansByRoomType]);

  // Existing connections of this kind, so a new room/rate-plan mapping can reuse one
  // instead of re-typing the access key, channel id and URL.
  const connections = [...new Map(mine.map(m => [`${m.channel}|${m.externalPropertyId}|${m.cmBaseUrl || ''}`, m])).values()];
  const applyConnection = (key) => {
    const m = connections.find(c => `${c.channel}|${c.externalPropertyId}|${c.cmBaseUrl || ''}` === key);
    if (m) setForm(f => ({ ...f, channel: m.channel, externalPropertyId: m.externalPropertyId, accessKey: '', channelId: m.channelId || '', cmBaseUrl: m.cmBaseUrl || '' }));
  };

  const add = async (e) => {
    e.preventDefault();
    if (!form.roomTypeId || !form.externalPropertyId || !form.externalRoomTypeId) { setBanner({ kind: 'err', text: 'Room type, external property ID and external room ID are required' }); return; }
    try {
      await pmsApi.createChannelMapping({ hotelId, ...form, internalRatePlanId: form.internalRatePlanId || null });
      setBanner({ kind: 'ok', text: `Mapped ${rtName(form.roomTypeId)} to ${form.channel} room ${form.externalRoomTypeId}` });
      setForm(f => ({ ...emptyMapping(f.channel), channel: f.channel, externalPropertyId: f.externalPropertyId, accessKey: f.accessKey, channelId: f.channelId, cmBaseUrl: f.cmBaseUrl }));
      onChanged();
    } catch (err) { setBanner({ kind: 'err', text: errMsg(err, 'Could not create mapping') }); }
  };

  const saveEdit = async () => {
    try {
      await pmsApi.updateChannelMapping(editing.id, { ...editing, internalRatePlanId: editing.internalRatePlanId || null });
      setEditing(null); setBanner({ kind: 'ok', text: 'Mapping updated' }); onChanged();
    } catch (err) { setBanner({ kind: 'err', text: errMsg(err, 'Could not update mapping') }); }
  };

  const toggleActive = async (m) => {
    try { await pmsApi.updateChannelMapping(m.id, { ...m, active: !m.active }); onChanged(); }
    catch (err) { setBanner({ kind: 'err', text: errMsg(err, 'Could not update mapping') }); }
  };

  const remove = async (m) => {
    try { await pmsApi.deleteChannelMapping(m.id); setConfirmDelete(null); setBanner({ kind: 'ok', text: 'Mapping removed' }); onChanged(); }
    catch (err) { setBanner({ kind: 'err', text: errMsg(err, 'Could not remove mapping') }); }
  };

  const toggleSel = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const selectedRoomTypes = [...new Set(mine.filter(m => selected.includes(m.id)).map(m => m.roomTypeId))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Banner banner={banner} onClose={() => setBanner(null)} />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="admin-row-btn" style={btnPrimary} onClick={() => setShowForm(s => !s)}><Plus size={14} /> Add {kindLabel} mapping</button>
        <span style={{ ...muted, marginLeft: 'auto' }}>{selected.length ? `${selected.length} selected →` : 'Tick rows to sync just those room types'}</span>
        {SYNC_TYPES.map(t => (
          <button key={t.key} type="button" className="admin-row-btn" style={{ ...btnSecondary, ...disabledStyle(!selected.length) }} disabled={!selected.length}
            onClick={() => onSync({ roomTypeIds: selectedRoomTypes, types: [t.key] })}>{t.label}</button>
        ))}
        <button type="button" className="admin-row-btn" style={{ ...btnPrimary, ...disabledStyle(!selected.length) }} disabled={!selected.length}
          onClick={() => onSync({ roomTypeIds: selectedRoomTypes })}><RefreshCw size={14} /> Sync selected</button>
      </div>

      {showForm && (
        <form onSubmit={add} className="admin-table-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {connections.length > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={muted}>Add to an existing connection:</span>
              <select defaultValue="" onChange={e => applyConnection(e.target.value)} style={inputStyle}>
                <option value="">— new connection —</option>
                {connections.map(c => <option key={`${c.channel}|${c.externalPropertyId}|${c.cmBaseUrl || ''}`} value={`${c.channel}|${c.externalPropertyId}|${c.cmBaseUrl || ''}`}>{c.channel} · property {c.externalPropertyId}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} style={inputStyle}>
              {channels.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.roomTypeId} onChange={e => setForm({ ...form, roomTypeId: e.target.value, internalRatePlanId: '' })} style={inputStyle}>
              <option value="">AviQR room type…</option>
              {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
            <select value={form.internalRatePlanId} onChange={e => setForm({ ...form, internalRatePlanId: e.target.value })} style={inputStyle} disabled={!form.roomTypeId}>
              <option value="">AviQR rate plan (first active)</option>
              {formPlans.map(rp => <option key={rp.id} value={rp.id}>{rp.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input placeholder="External property / hotel ID" value={form.externalPropertyId} onChange={e => setForm({ ...form, externalPropertyId: e.target.value })} style={inputStyle} />
            <input placeholder="External room ID" value={form.externalRoomTypeId} onChange={e => setForm({ ...form, externalRoomTypeId: e.target.value })} style={inputStyle} />
            <input placeholder="External rate plan ID (blank = inventory only)" value={form.externalRatePlanId} onChange={e => setForm({ ...form, externalRatePlanId: e.target.value })} style={{ ...inputStyle, minWidth: 260 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px dashed var(--gray-200)' }}>
            <span style={{ ...muted, width: '100%' }}>Live connection (leave blank to only simulate pushes). For AxisRooms: the access key and PMS channel ID AxisRooms issued, and its API base URL.</span>
            <input placeholder="Access key" value={form.accessKey} onChange={e => setForm({ ...form, accessKey: e.target.value })} style={inputStyle} />
            <input placeholder="Channel ID" value={form.channelId} onChange={e => setForm({ ...form, channelId: e.target.value })} style={inputStyle} />
            <input placeholder="Base URL, e.g. https://sandbox.axisrooms.com" value={form.cmBaseUrl} onChange={e => setForm({ ...form, cmBaseUrl: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 240 }} />
          </div>
          <div><button type="submit" className="admin-row-btn" style={btnPrimary}><Plus size={14} /> Save mapping</button></div>
        </form>
      )}

      <div className="admin-table-card" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead><tr><th></th><th>Channel · property</th><th>AviQR room type</th><th>AviQR rate plan</th><th>Channel room / rate plan</th><th>Connection</th><th>Last sync</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {mine.map(m => editing?.id === m.id ? (
              <tr key={m.id} style={{ background: 'var(--gray-50)' }}>
                <td></td>
                <td>{m.channel}<br /><input value={editing.externalPropertyId} onChange={e => setEditing({ ...editing, externalPropertyId: e.target.value })} style={{ ...inputStyle, width: 110 }} /></td>
                <td>{rtName(m.roomTypeId)}</td>
                <td>
                  <select value={editing.internalRatePlanId || ''} onChange={e => setEditing({ ...editing, internalRatePlanId: e.target.value })} style={inputStyle}>
                    <option value="">First active</option>
                    {(plansByRoomType[m.roomTypeId] || []).map(rp => <option key={rp.id} value={rp.id}>{rp.name}</option>)}
                  </select>
                </td>
                <td>
                  <input value={editing.externalRoomTypeId} onChange={e => setEditing({ ...editing, externalRoomTypeId: e.target.value })} style={{ ...inputStyle, width: 90 }} />{' '}
                  <input value={editing.externalRatePlanId || ''} placeholder="rate plan" onChange={e => setEditing({ ...editing, externalRatePlanId: e.target.value })} style={{ ...inputStyle, width: 90 }} />
                </td>
                <td colSpan={3}>
                  <input placeholder={editing.hasAccessKey ? "Access key saved (blank keeps it)" : "Access key"} value={editing.accessKey || ''} onChange={e => setEditing({ ...editing, accessKey: e.target.value })} style={{ ...inputStyle, width: 120 }} />{' '}
                  <input placeholder="Channel ID" value={editing.channelId || ''} onChange={e => setEditing({ ...editing, channelId: e.target.value })} style={{ ...inputStyle, width: 80 }} />{' '}
                  <input placeholder="Base URL" value={editing.cmBaseUrl || ''} onChange={e => setEditing({ ...editing, cmBaseUrl: e.target.value })} style={{ ...inputStyle, width: 200 }} />
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button type="button" className="admin-row-btn" style={{ ...btnSmall, ...btnPrimary, height: 28 }} onClick={saveEdit}>Save</button>{' '}
                  <button type="button" className="admin-row-btn" style={btnSmall} onClick={() => setEditing(null)}>Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={m.id} style={{ opacity: m.active ? 1 : 0.6 }}>
                <td><input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggleSel(m.id)} /></td>
                <td><strong>{m.channel}</strong><div style={muted}>{m.externalPropertyId}</div></td>
                <td className="admin-td-shop">{rtName(m.roomTypeId)}</td>
                <td style={{ fontSize: 12.5 }}>{planName(m.roomTypeId, m.internalRatePlanId)}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{m.externalRoomTypeId} / {m.externalRatePlanId || <span style={muted}>inventory only</span>}</td>
                <td><span className={(m.cmBaseUrl && m.channelId && m.hasAccessKey) ? 'status-pill st-active' : 'plan-pill'}>{(m.cmBaseUrl && m.channelId && m.hasAccessKey) ? 'Live' : 'Simulated'}</span></td>
                <td><LastSyncChips lastSync={lastSyncFor(m)} /></td>
                <td><span className={m.active ? 'status-pill st-active' : 'status-pill st-suspended'}>{m.active ? 'Active' : 'Paused'}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button type="button" className="admin-row-btn" style={btnSmall} title="Sync this room type" onClick={() => onSync({ roomTypeIds: [m.roomTypeId], connection: `${m.channel}|${m.externalPropertyId}` })}><RefreshCw size={12} /></button>{' '}
                  <button type="button" className="admin-row-btn" style={btnSmall} title="Edit" onClick={() => setEditing({ ...m })}><Pencil size={12} /></button>{' '}
                  <button type="button" className="admin-row-btn" style={btnSmall} onClick={() => toggleActive(m)}>{m.active ? 'Pause' : 'Resume'}</button>{' '}
                  {confirmDelete === m.id
                    ? <><button type="button" className="admin-row-btn" style={btnDanger} onClick={() => remove(m)}>Confirm remove</button>{' '}<button type="button" className="admin-row-btn" style={btnSmall} onClick={() => setConfirmDelete(null)}>Keep</button></>
                    : <button type="button" className="admin-row-btn" style={btnDanger} title="Remove mapping" onClick={() => setConfirmDelete(m.id)}><Trash2 size={12} /></button>}
                </td>
              </tr>
            ))}
            {mine.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', ...muted, padding: 20 }}>No {kindLabel} mappings yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Channel calendar ──────────────────────────────────────────────────────────
const CAL_WINDOWS = [7, 14, 30];
const DAY_W = { 7: 96, 14: 72, 30: 56 };
const LABEL_W = 210;

function CalendarView({ hotelId, connections, onSync, refreshKey }) {
  const [from, setFrom] = useState(today());
  const [days, setDays] = useState(14);
  const [conn, setConn] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const dayW = DAY_W[days];
  const dates = Array.from({ length: days }, (_, i) => addDays(from, i));

  const load = useCallback(() => {
    const [channel, propertyId] = conn ? conn.split('|') : [];
    pmsApi.getChannelCalendar(hotelId, { from, to: addDays(from, days), channel: channel || undefined, propertyId: propertyId || undefined })
      .then(res => { setData(res.data.data); setError(''); })
      .catch(err => setError(errMsg(err, 'Could not load the channel calendar')));
  }, [hotelId, from, days, conn, refreshKey]);
  useEffect(() => { load(); }, [load]);

  const todayStr = today();
  const cellStyle = (d) => {
    const dow = new Date(d + 'T00:00:00').getDay();
    return { width: dayW, flexShrink: 0, borderLeft: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, height: 30, position: 'relative',
      background: d === todayStr ? 'rgba(37, 99, 235, 0.06)' : (dow === 0 || dow === 6) ? 'var(--gray-50)' : undefined };
  };
  const label = { width: LABEL_W, flexShrink: 0, padding: '0 12px', fontSize: 11.5, color: 'var(--gray-600)', display: 'flex', alignItems: 'center' };
  const pendingDot = (on, title) => on ? <span title={title} style={{ position: 'absolute', top: 3, right: 4, width: 6, height: 6, borderRadius: 999, background: '#f0a020' }} /> : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="admin-table-card" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {CAL_WINDOWS.map(w => <button key={w} type="button" className="admin-row-btn" style={days === w ? btnPrimary : btnSecondary} onClick={() => setDays(w)}>{w} days</button>)}
        </div>
        <button type="button" className="admin-row-btn" style={btnSecondary} onClick={() => setFrom(f => addDays(f, -days))}>← Back</button>
        <input type="date" value={from} onChange={e => e.target.value && setFrom(e.target.value)} style={inputStyle} />
        <button type="button" className="admin-row-btn" style={btnSecondary} onClick={() => setFrom(today())}>Today</button>
        <button type="button" className="admin-row-btn" style={btnSecondary} onClick={() => setFrom(f => addDays(f, days))}>Next →</button>
        <select value={conn} onChange={e => setConn(e.target.value)} style={inputStyle}>
          <option value="">All connections</option>
          {connections.map(c => <option key={`${c.channel}|${c.externalPropertyId}`} value={`${c.channel}|${c.externalPropertyId}`}>{c.channel} · {c.externalPropertyId}</option>)}
        </select>
        <button type="button" className="admin-row-btn" style={btnPrimary}
          onClick={() => onSync({ connection: conn, from: from < today() ? today() : from, to: addDays(from, days - 1) })}>
          <RefreshCw size={14} /> Sync these dates
        </button>
        <span style={{ ...muted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: '#f0a020' }} /> changed since last sync
        </span>
      </div>

      {error && <Banner banner={{ kind: 'err', text: error }} onClose={() => setError('')} />}

      <div className="admin-table-card" style={{ overflowX: 'auto', padding: 0 }}>
        <div style={{ minWidth: LABEL_W + days * dayW }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ ...label, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', height: 36 }}>Room type / rate plan</div>
            {dates.map(d => (
              <div key={d} style={{ ...cellStyle(d), height: 36, fontWeight: 600, color: d === today() ? 'var(--blue)' : 'var(--gray-400)', fontSize: 11 }}>
                {new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: days > 7 ? 'short' : undefined })}
              </div>
            ))}
          </div>

          {(data?.roomTypes || []).map(rt => {
            const isCollapsed = !!collapsed[rt.roomTypeId];
            const byDate = Object.fromEntries((rt.days || []).map(d => [d.date, d]));
            return (
              <div key={rt.roomTypeId} style={{ opacity: rt.mapped ? 1 : 0.55 }}>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)', minHeight: 40 }}>
                  <div style={{ ...label, gap: 6, fontWeight: 700, fontSize: 12.5, color: 'var(--gray-800)', cursor: 'pointer' }} onClick={() => setCollapsed(p => ({ ...p, [rt.roomTypeId]: !p[rt.roomTypeId] }))}>
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    {rt.roomTypeName}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '4px 8px' }}>
                    {rt.mapped
                      ? <span style={muted}>channel room {rt.externalRoomTypeIds.join(', ')}</span>
                      : <span className="plan-pill" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }}>Not mapped — not sent to channels</span>}
                    {rt.mapped && <LastSyncChips lastSync={rt.lastSync} />}
                    {rt.mapped && SYNC_TYPES.map(t => (
                      <button key={t.key} type="button" className="admin-row-btn" style={btnSmall}
                        onClick={() => onSync({ roomTypeIds: [rt.roomTypeId], types: [t.key], connection: conn, from: from < today() ? today() : from, to: addDays(from, days - 1) })}>
                        <RefreshCw size={11} /> {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                {!isCollapsed && <>
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={label} title="Sellable rooms AviQR sends to the channel (after allotment caps and today's room status)">Sent to channel</div>
                    {dates.map(d => { const x = byDate[d]; return (
                      <div key={d} style={{ ...cellStyle(d), fontWeight: 700, color: !x ? 'var(--gray-300)' : x.sellable === 0 ? 'var(--red)' : 'var(--green-darker)' }}>
                        {x ? x.sellable : '—'}{pendingDot(x?.pending, 'Availability changed since the last inventory sync')}
                      </div>); })}
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={label}>Booked (all sources)</div>
                    {dates.map(d => <div key={d} style={cellStyle(d)}>{byDate[d]?.booked ?? '—'}</div>)}
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={label} title="Rooms booked through channels staying that night; + arrivals that day">Channel stays (+arrivals)</div>
                    {dates.map(d => { const x = byDate[d]; return (
                      <div key={d} style={{ ...cellStyle(d), color: x?.channelStays ? 'var(--blue)' : 'var(--gray-300)' }}>
                        {x ? (x.channelStays ? `${x.channelStays}${x.channelArrivals ? ` (+${x.channelArrivals})` : ''}` : '0') : '—'}
                      </div>); })}
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={label}>Allotment cap</div>
                    {dates.map(d => <div key={d} style={{ ...cellStyle(d), color: 'var(--gray-500)' }}>{byDate[d]?.allotment ?? '—'}</div>)}
                  </div>
                  {(rt.ratePlans || []).map(rp => {
                    const rByDate = Object.fromEntries((rp.days || []).map(d => [d.date, d]));
                    const mappedPlan = rp.externalRatePlanIds.length > 0;
                    return (
                      <Fragment key={rp.ratePlanId}>
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
                          <div style={{ ...label, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', height: 30 }}>
                            <span style={{ fontWeight: 600 }}>{rp.ratePlanName} · price</span>
                            <span style={{ fontSize: 10.5, color: 'var(--gray-400)' }}>{mappedPlan ? `→ ${rp.externalRatePlanIds.join(', ')}` : 'not mapped'}</span>
                          </div>
                          {dates.map(d => { const x = rByDate[d]; return (
                            <div key={d} style={{ ...cellStyle(d), color: !mappedPlan ? 'var(--gray-400)' : x?.priceOverridden ? 'var(--blue)' : undefined }}>
                              {x ? `₹${Number(x.price).toLocaleString('en-IN')}` : '—'}{pendingDot(x?.pricePending, 'Price changed since the last rates sync')}
                            </div>); })}
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
                          <div style={label}>{rp.ratePlanName} · restrictions</div>
                          {dates.map(d => { const x = rByDate[d]; const tags = [];
                            if (x?.stopSell) tags.push(['Closed', 'var(--red)']);
                            if (x?.closedToArrival) tags.push(['CTA', '#b26a00']);
                            if (x?.closedToDeparture) tags.push(['CTD', '#b26a00']);
                            if (x?.minStay) tags.push([`min ${x.minStay}`, 'var(--gray-600)']);
                            if (x?.maxStay) tags.push([`max ${x.maxStay}`, 'var(--gray-600)']);
                            return (
                              <div key={d} style={{ ...cellStyle(d), flexWrap: 'wrap', gap: 2, fontSize: 10, height: 'auto', minHeight: 30, padding: '2px 0' }}>
                                {tags.length ? tags.map(([t, c]) => <span key={t} style={{ color: c, fontWeight: 600 }}>{t}</span>) : <span style={{ color: 'var(--gray-300)' }}>open</span>}
                                {pendingDot(x?.restrictionPending, 'Restrictions changed since the last restrictions sync')}
                              </div>); })}
                        </div>
                      </Fragment>
                    );
                  })}
                </>}
              </div>
            );
          })}
          {data && data.roomTypes.length === 0 && <div style={{ padding: 20, ...muted, textAlign: 'center' }}>No active room types</div>}
        </div>
      </div>
    </div>
  );
}

// ── Sync logs ─────────────────────────────────────────────────────────────────
const EMPTY_LOG_FILTERS = { channel: '', type: '', status: '', direction: '', roomTypeId: '', from: '', to: '', q: '' };

function LogsView({ hotelId, roomTypes, refreshKey }) {
  const [filters, setFilters] = useState(EMPTY_LOG_FILTERS);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [data, setData] = useState({ items: [], total: 0 });
  const [open, setOpen] = useState(null);
  const rtNames = (ids) => (ids || '').split(',').filter(Boolean).map(id => roomTypes.find(r => r.id === id)?.name || '?').join(', ');

  const load = useCallback(() => {
    const params = { page, size };
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    pmsApi.getChannelLogs(hotelId, params).then(res => setData(res.data.data || { items: [], total: 0 })).catch(() => {});
  }, [hotelId, filters, page, size, refreshKey]);
  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(0); };
  const hasFilters = Object.values(filters).some(Boolean);
  const pager = <Pager page={page} size={size} total={data.total} onPage={setPage} onSize={n => { setSize(n); setPage(0); }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="admin-table-card" style={{ padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filters.channel} onChange={e => setF('channel', e.target.value)} style={inputStyle}>
          <option value="">All channels</option>{[...CM_CHANNELS, ...OTA_CHANNELS].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.type} onChange={e => setF('type', e.target.value)} style={inputStyle}>
          <option value="">All types</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filters.status} onChange={e => setF('status', e.target.value)} style={inputStyle}>
          <option value="">Any status</option><option value="SUCCESS">Success</option><option value="FAILED">Failed</option><option value="SKIPPED">Skipped</option>
        </select>
        <select value={filters.direction} onChange={e => setF('direction', e.target.value)} style={inputStyle}>
          <option value="">Both directions</option><option value="PUSH">Sent to channel</option><option value="PULL">Received from channel</option>
        </select>
        <select value={filters.roomTypeId} onChange={e => setF('roomTypeId', e.target.value)} style={inputStyle}>
          <option value="">All room types</option>{roomTypes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <input type="date" value={filters.from} onChange={e => setF('from', e.target.value)} style={inputStyle} title="From date" />
        <span style={muted}>to</span>
        <input type="date" value={filters.to} min={filters.from || undefined} onChange={e => setF('to', e.target.value)} style={inputStyle} title="To date" />
        <input placeholder="Search message…" value={filters.q} onChange={e => setF('q', e.target.value)} style={{ ...inputStyle, minWidth: 180 }} />
        <button type="button" className="admin-row-btn" style={btnSecondary} onClick={load}><RefreshCw size={14} /> Refresh</button>
        {hasFilters && <button type="button" className="admin-row-btn" style={btnSecondary} onClick={() => { setFilters(EMPTY_LOG_FILTERS); setPage(0); }}>Clear filters</button>}
      </div>
      {pager}

      <div className="admin-table-card" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead><tr><th>When</th><th>Channel</th><th>Type</th><th>Direction</th><th>Status</th><th>Room types</th><th>Dates</th><th>Trigger</th><th>Message</th><th></th></tr></thead>
          <tbody>
            {data.items.map(l => (
              <Fragment key={l.id}>
                <tr>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtTime(l.createdAt)}</td>
                  <td>{l.channel}{l.externalPropertyId && <div style={muted}>{l.externalPropertyId}</div>}</td>
                  <td>{TYPE_LABEL[l.syncType] || '—'}</td>
                  <td style={{ fontSize: 12 }}>{l.direction === 'PUSH' ? 'Sent' : 'Received'}</td>
                  <td><StatusPill status={l.status} /></td>
                  <td style={{ fontSize: 12 }}>{rtNames(l.roomTypeIds) || '—'}</td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{l.dateFrom ? `${l.dateFrom} → ${l.dateTo}` : '—'}</td>
                  <td style={{ fontSize: 12 }}>{TRIGGER_LABEL[l.triggerSource] || l.triggerSource || '—'}</td>
                  <td style={{ fontSize: 12.5, maxWidth: 420 }}>{l.message}</td>
                  <td>{(l.requestBody || l.responseBody) && (
                    <button type="button" className="admin-row-btn" style={btnSmall} onClick={() => setOpen(open === l.id ? null : l.id)}>{open === l.id ? 'Hide' : 'Details'}</button>)}</td>
                </tr>
                {open === l.id && (
                  <tr><td colSpan={10} style={{ background: 'var(--gray-50)', padding: 12 }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 260 }}><div style={{ ...muted, fontWeight: 700, marginBottom: 4 }}>REQUEST</div><pre style={preStyle}>{l.requestBody || '—'}</pre></div>
                      <div style={{ flex: 1, minWidth: 260 }}><div style={{ ...muted, fontWeight: 700, marginBottom: 4 }}>RESPONSE</div><pre style={preStyle}>{l.responseBody || '—'}</pre></div>
                    </div>
                  </td></tr>
                )}
              </Fragment>
            ))}
            {data.items.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', ...muted, padding: 20 }}>No sync activity matches these filters</td></tr>}
          </tbody>
        </table>
      </div>
      {pager}
    </div>
  );
}

const PAGE_SIZES = [25, 50, 100, 200];

/** Numbered pagination with rows-per-page; shown whenever there are any rows. */
function Pager({ page, size, total, onPage, onSize }) {
  if (!total) return null;
  const pages = Math.max(1, Math.ceil(total / size));
  const first = page * size + 1, last = Math.min(total, (page + 1) * size);
  const nums = [];
  const lo = Math.max(0, Math.min(page - 2, pages - 5)), hi = Math.min(pages - 1, lo + 4);
  for (let i = lo; i <= hi; i++) nums.push(i);
  const btn = (label, target, disabled, active, key) => (
    <button key={key} type="button" className="admin-row-btn" disabled={disabled} onClick={() => onPage(target)}
      style={{ ...btnSmall, minWidth: 32, justifyContent: 'center', ...(active ? { background: 'var(--blue)', color: '#fff', borderColor: 'var(--blue)' } : null), ...disabledStyle(disabled) }}>
      {label}
    </button>
  );
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <span style={muted}>Showing <strong>{first.toLocaleString()}–{last.toLocaleString()}</strong> of <strong>{total.toLocaleString()}</strong></span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        {btn('« First', 0, page === 0, false, 'first')}
        {btn('‹ Prev', page - 1, page === 0, false, 'prev')}
        {lo > 0 && <span style={muted}>…</span>}
        {nums.map(i => btn(String(i + 1), i, false, i === page, `p${i}`))}
        {hi < pages - 1 && <span style={muted}>…</span>}
        {btn('Next ›', page + 1, page + 1 >= pages, false, 'next')}
        {btn('Last »', pages - 1, page + 1 >= pages, false, 'last')}
        <select value={size} onChange={e => onSize(Number(e.target.value))} style={{ ...inputStyle, height: 28, marginLeft: 8 }}>
          {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Channel bookings ──────────────────────────────────────────────────────────
const BOOKING_STATUS_CLS = { confirmed: 'status-pill st-active', modified: 'plan-pill', cancelled: 'status-pill st-suspended' };

function BookingsView({ hotelId, refreshKey }) {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [data, setData] = useState({ items: [], total: 0 });
  useEffect(() => {
    pmsApi.getChannelBookings(hotelId, { page, size }).then(res => setData(res.data.data || { items: [], total: 0 })).catch(() => {});
  }, [hotelId, page, size, refreshKey]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="admin-table-card" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead><tr><th>Received</th><th>Channel / OTA</th><th>Booking no.</th><th>Channel status</th><th>Guest</th><th>Stay</th><th>Rooms</th><th>Reservation</th><th>Last update</th></tr></thead>
          <tbody>
            {data.items.map(b => (
              <tr key={b.id}>
                <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtTime(b.receivedAt)}</td>
                <td>{b.channel}{b.ota && <div style={muted}>{b.ota}</div>}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.externalBookingId}</td>
                <td><span className={BOOKING_STATUS_CLS[b.lastStatus] || 'plan-pill'}>{b.lastStatus || '—'}</span></td>
                <td className="admin-td-shop">{b.guestName || '—'}</td>
                <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{b.checkIn ? `${b.checkIn} → ${b.checkOut}` : '—'}</td>
                <td style={{ fontSize: 12 }}>{b.rooms} {b.roomTypes?.length ? `· ${b.roomTypes.join(', ')}` : ''}</td>
                <td style={{ fontSize: 12 }}>{b.reservationStatus || '—'}</td>
                <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtTime(b.updatedAt)}</td>
              </tr>
            ))}
            {data.items.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', ...muted, padding: 20 }}>No bookings received from channels yet</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager page={page} size={size} total={data.total} onPage={setPage} onSize={n => { setSize(n); setPage(0); }} />
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────
export function ChannelManagerTab({ hotelId, roomTypes, view = 'overview', onNavigate }) {
  const [overview, setOverview] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [syncPreset, setSyncPreset] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    if (!hotelId) return;
    pmsApi.getChannelOverview(hotelId).then(res => setOverview(res.data.data)).catch(() => {});
    pmsApi.listChannelMappings(hotelId).then(res => setMappings(res.data.data || [])).catch(() => {});
  }, [hotelId]);
  useEffect(() => { load(); }, [load]);

  const connections = overview?.connections || [];
  const afterSync = () => { load(); setRefreshKey(k => k + 1); };
  const goTo = (v) => onNavigate?.(VIEW_TO_NAV[v]);
  const meta = VIEW_META[view] || VIEW_META.overview;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <div><h1 className="page-title">{meta.title}</h1><p className="page-subtitle">{meta.subtitle}</p></div>
        <button type="button" className="admin-row-btn" style={btnPrimary} onClick={() => setSyncPreset({})}><RefreshCw size={14} /> Sync…</button>
      </div>

      {view === 'overview' && <OverviewView overview={overview} onSync={setSyncPreset} onGo={goTo} />}
      {view === 'cm' && <MappingsView key="cm" hotelId={hotelId} roomTypes={roomTypes} channels={CM_CHANNELS} kindLabel="channel manager" mappings={mappings} overview={overview} onChanged={load} onSync={setSyncPreset} />}
      {view === 'ota' && <MappingsView key="ota" hotelId={hotelId} roomTypes={roomTypes} channels={OTA_CHANNELS} kindLabel="direct OTA" mappings={mappings} overview={overview} onChanged={load} onSync={setSyncPreset} />}
      {view === 'calendar' && <CalendarView hotelId={hotelId} connections={connections} onSync={setSyncPreset} refreshKey={refreshKey} />}
      {view === 'logs' && <LogsView hotelId={hotelId} roomTypes={roomTypes} refreshKey={refreshKey} />}
      {view === 'bookings' && <BookingsView hotelId={hotelId} refreshKey={refreshKey} />}

      {syncPreset && (
        <SyncDialog hotelId={hotelId} roomTypes={roomTypes} connections={connections} preset={syncPreset}
          onClose={() => setSyncPreset(null)} onDone={afterSync} />
      )}
    </div>
  );
}
