// This module is now a library of PMS tab components, imported by the unified
// hotel/resort dashboard shell in ../hotel/HotelDashboard.jsx — there is no
// standalone PMS page or route any more (the login is one dashboard, and PMS
// sections live alongside QR guest-services under the same sidebar).
import { useState, useEffect, useCallback } from 'react';
import {
  BedDouble, CalendarCheck, Receipt,
  Plus, LogIn, DoorOpen, Ban, UserX, Search, Wifi, RefreshCw, Copy, Users, Briefcase, IndianRupee, TrendingUp, UserCircle, Tag, CalendarClock,
  AlertCircle, Clock, CheckCircle2, Bell, PenTool, X, CreditCard, Hourglass, Building2, Upload, Send, Star, ChevronDown, ChevronRight,
} from 'lucide-react';
import { pmsApi, reviewApi } from '../../api/index.js';
import '../admin/Admin.css';

const STATUS_CLS = {
  BOOKED: 'plan-pill', CHECKED_IN: 'status-pill st-active',
  CHECKED_OUT: 'status-pill', CANCELLED: 'status-pill st-suspended', NO_SHOW: 'status-pill st-suspended',
};

// See addDays() below for why toISOString() is avoided: it converts to UTC first,
// which returns yesterday's date for part of the day in any positive-UTC-offset
// timezone (e.g. IST, roughly midnight-5:30am local).
function localDateStr(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function today() { return localDateStr(new Date()); }
function tomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); return localDateStr(d); }

// Same lazy-load-once pattern as CustomerMenu.jsx's checkout flow — Razorpay's
// widget is only needed on the handful of screens that actually collect a card.
function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ── Overview — front-office KPIs (occupancy, ADR, RevPAR, arrivals/departures) ──
export function Overview({ hotelName, reservations, audit, requests, onNav }) {
  const todayStr = today();
  const arrivalsToday = reservations.filter(r => r.checkInDate === todayStr && r.status === 'BOOKED');
  const departuresToday = reservations.filter(r => r.checkOutDate === todayStr && r.status === 'CHECKED_IN');
  const inHouse = reservations.filter(r => r.status === 'CHECKED_IN');
  const activeReqs = (requests || []).filter(r => r.status !== 'done');
  const urgentReqs = activeReqs.filter(r => r.priority === 'high');

  const kpis = audit ? [
    { label: 'Occupancy', value: `${audit.occupancyPercent}%`, icon: BedDouble, color: 'green' },
    { label: 'Rooms sold', value: `${audit.roomsSold}/${audit.totalRooms}`, icon: CheckCircle2, color: 'blue' },
    { label: 'ADR', value: `₹${Number(audit.adr).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'amber' },
    { label: 'RevPAR', value: `₹${Number(audit.revPar).toLocaleString('en-IN')}`, icon: TrendingUp, color: 'blue' },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div><h1 className="page-title">{hotelName || 'Hotel'} Overview</h1><p className="page-subtitle">{audit ? `${audit.roomsSold}/${audit.totalRooms} rooms occupied` : 'Loading…'} · live</p></div>
        <button className="btn-refresh" onClick={() => onNav('reservations')}><CalendarCheck size={13} /> Reservations</button>
      </div>

      {urgentReqs.length > 0 && (
        <div className="support-alert-banner"><AlertCircle size={16} /><span><strong>{urgentReqs.length} urgent request{urgentReqs.length > 1 ? 's' : ''}</strong> need immediate attention.</span><button className="support-alert-action" onClick={() => onNav('requests')}>View all →</button></div>
      )}

      <div className="admin-kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {kpis.map(k => (
          <div key={k.label} className="admin-kpi-card">
            <div className={`admin-kpi-icon icon-${k.color}`}><k.icon size={18} /></div>
            <div className="admin-kpi-value">{k.value}</div>
            <div className="admin-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>
      <div className="admin-kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="admin-kpi-card"><div className="admin-kpi-icon icon-green"><LogIn size={18} /></div><div className="admin-kpi-value">{arrivalsToday.length}</div><div className="admin-kpi-label">Arrivals today</div></div>
        <div className="admin-kpi-card"><div className="admin-kpi-icon icon-amber"><DoorOpen size={18} /></div><div className="admin-kpi-value">{departuresToday.length}</div><div className="admin-kpi-label">Departures today</div></div>
        <div className="admin-kpi-card"><div className="admin-kpi-icon icon-blue"><Users size={18} /></div><div className="admin-kpi-value">{inHouse.length}</div><div className="admin-kpi-label">Guests in-house</div></div>
        <div className="admin-kpi-card"><div className="admin-kpi-icon icon-amber"><Bell size={18} /></div><div className="admin-kpi-value">{activeReqs.length}</div><div className="admin-kpi-label">Active guest requests</div></div>
      </div>

      {arrivalsToday.length > 0 && (
        <div>
          <div className="sub-section-header" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Arrivals today</div>
          <div className="admin-table-card">
            <table className="admin-table">
              <thead><tr><th>Guest</th><th>Check-in</th><th>Check-out</th><th></th></tr></thead>
              <tbody>{arrivalsToday.map(r => (
                <tr key={r.id}><td className="admin-td-shop">{r.guestName}</td><td>{r.checkInDate}</td><td>{r.checkOutDate}</td>
                  <td><button className="admin-row-btn" style={btnSecondary} onClick={() => onNav('frontdesk')}><LogIn size={12} /> Front desk</button></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {departuresToday.length > 0 && (
        <div>
          <div className="sub-section-header" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Departures today</div>
          <div className="admin-table-card">
            <table className="admin-table">
              <thead><tr><th>Guest</th><th>Check-in</th><th>Check-out</th><th></th></tr></thead>
              <tbody>{departuresToday.map(r => (
                <tr key={r.id}><td className="admin-td-shop">{r.guestName}</td><td>{r.checkInDate}</td><td>{r.checkOutDate}</td>
                  <td><button className="admin-row-btn" style={btnSecondary} onClick={() => onNav('frontdesk')}><DoorOpen size={12} /> Front desk</button></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <div className="sub-section-header" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Guests in-house ({inHouse.length})</div>
        {inHouse.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)', fontSize: 13 }}>No guests currently checked in.</div>
        ) : (
          <div className="admin-table-card">
            <table className="admin-table">
              <thead><tr><th>Guest</th><th>Check-in</th><th>Check-out</th></tr></thead>
              <tbody>{inHouse.map(r => (
                <tr key={r.id}><td className="admin-td-shop">{r.guestName}</td><td>{r.checkInDate}</td><td>{r.checkOutDate}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {activeReqs.length > 0 && (
        <div>
          <div className="sub-section-header" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Recent guest requests</div>
          <div className="requests-list">
            {activeReqs.slice(0, 4).map(r => (
              <div key={r.id} className="request-row">
                <div className="req-room">Room {r.room}</div>
                <div className="req-info"><div className="req-service">{r.service}</div><div className="req-item">{r.item}</div></div>
                <button className="req-action-btn" onClick={() => onNav('requests')}><Clock size={12} /> {r.time}</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Room Types & Rate Plans ────────────────────────────────────────────────────
export function RoomTypesTab({ hotelId, roomTypes, onChange }) {
  const [form, setForm] = useState({ name: '', maxOccupancy: 2, description: '' });
  const [ratePlansByType, setRatePlansByType] = useState({});
  const [rpForm, setRpForm] = useState({});
  const [pricingConfig, setPricingConfig] = useState(null);
  const [savingPricing, setSavingPricing] = useState(false);
  const [showPricingConfig, setShowPricingConfig] = useState(false);

  const loadRatePlans = (roomTypeId) => {
    pmsApi.listRatePlans(roomTypeId).then(res =>
      setRatePlansByType(prev => ({ ...prev, [roomTypeId]: res.data.data || [] }))).catch(() => {});
  };
  useEffect(() => { roomTypes.forEach(rt => loadRatePlans(rt.id)); }, [roomTypes]);
  useEffect(() => { if (hotelId) pmsApi.getPricingConfig(hotelId).then(res => setPricingConfig(res.data.data)).catch(() => {}); }, [hotelId]);

  const savePricingConfig = async (e) => {
    e.preventDefault();
    setSavingPricing(true);
    try { const res = await pmsApi.updatePricingConfig(hotelId, pricingConfig); setPricingConfig(res.data.data); }
    catch { alert('Could not save dynamic pricing settings'); }
    finally { setSavingPricing(false); }
  };

  const addRoomType = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await pmsApi.createRoomType({ hotelId, name: form.name, maxOccupancy: Number(form.maxOccupancy) || 2, description: form.description });
      setForm({ name: '', maxOccupancy: 2, description: '' });
      onChange();
    } catch { alert('Could not create room type'); }
  };

  const addRatePlan = async (e, roomTypeId) => {
    e.preventDefault();
    const rp = rpForm[roomTypeId] || {};
    if (!rp.name || !rp.baseRate) return;
    try {
      await pmsApi.createRatePlan({ hotelId, roomTypeId, name: rp.name, baseRate: Number(rp.baseRate), cancellationPolicy: rp.cancellationPolicy || '', mealPlan: rp.mealPlan || 'ROOM_ONLY', occupancy: rp.occupancy ? Number(rp.occupancy) : null });
      setRpForm(prev => ({ ...prev, [roomTypeId]: { name: '', baseRate: '', cancellationPolicy: '', mealPlan: 'ROOM_ONLY', occupancy: '' } }));
      loadRatePlans(roomTypeId);
    } catch { alert('Could not create rate plan'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div><h1 className="page-title">Room Types &amp; Rates</h1><p className="page-subtitle">Define room categories and their pricing.</p></div>
        <button className="admin-row-btn" style={btnSecondary} onClick={() => setShowPricingConfig(s => !s)}>Dynamic pricing settings</button>
      </div>

      {showPricingConfig && pricingConfig && (
        <form onSubmit={savePricingConfig} className="admin-table-card" style={{ padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: 'var(--gray-600)' }}>If occupancy ≥</span>
          <input type="number" value={pricingConfig.highOccupancyThreshold} onChange={e => setPricingConfig({ ...pricingConfig, highOccupancyThreshold: e.target.value })} style={{ ...inputStyle, width: 70 }} />
          <span style={{ fontSize: 12.5 }}>%, suggest +</span>
          <input type="number" value={pricingConfig.highOccupancySurchargePercent} onChange={e => setPricingConfig({ ...pricingConfig, highOccupancySurchargePercent: e.target.value })} style={{ ...inputStyle, width: 70 }} />
          <span style={{ fontSize: 12.5 }}>% surge.</span>
          <span style={{ fontSize: 12.5, color: 'var(--gray-600)', marginLeft: 12 }}>If occupancy ≤</span>
          <input type="number" value={pricingConfig.lowOccupancyThreshold} onChange={e => setPricingConfig({ ...pricingConfig, lowOccupancyThreshold: e.target.value })} style={{ ...inputStyle, width: 70 }} />
          <span style={{ fontSize: 12.5 }}>%, suggest −</span>
          <input type="number" value={pricingConfig.lowOccupancyDiscountPercent} onChange={e => setPricingConfig({ ...pricingConfig, lowOccupancyDiscountPercent: e.target.value })} style={{ ...inputStyle, width: 70 }} />
          <span style={{ fontSize: 12.5 }}>% discount.</span>
          <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}>
            <input type="checkbox" checked={!!pricingConfig.active} onChange={e => setPricingConfig({ ...pricingConfig, active: e.target.checked })} /> Active
          </label>
          <button type="submit" className="admin-row-btn" style={btnPrimary} disabled={savingPricing}>{savingPricing ? 'Saving…' : 'Save'}</button>
        </form>
      )}

      <form onSubmit={addRoomType} className="admin-table-card" style={{ padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div><label style={{ fontSize: 11, color: 'var(--gray-500)' }}>Name</label><br />
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Deluxe" style={inputStyle} /></div>
        <div><label style={{ fontSize: 11, color: 'var(--gray-500)' }}>Max occupancy</label><br />
          <input type="number" min="1" value={form.maxOccupancy} onChange={e => setForm({ ...form, maxOccupancy: e.target.value })} style={{ ...inputStyle, width: 90 }} /></div>
        <div style={{ flex: 1, minWidth: 160 }}><label style={{ fontSize: 11, color: 'var(--gray-500)' }}>Description</label><br />
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inputStyle} /></div>
        <button type="submit" className="admin-row-btn" style={btnPrimary}><Plus size={14} /> Add room type</button>
      </form>

      {roomTypes.map(rt => (
        <div key={rt.id} className="admin-table-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div><strong>{rt.name}</strong> <span style={{ color: 'var(--gray-500)', fontSize: 12.5 }}>· up to {rt.maxOccupancy} guests</span></div>
          </div>
          <table className="admin-table">
            <thead><tr><th>Rate plan</th><th>Occupancy</th><th>Base rate / night</th><th>Meal plan</th><th>Cancellation</th></tr></thead>
            <tbody>
              {(ratePlansByType[rt.id] || []).map(rp => (
                <tr key={rp.id}><td>{rp.name}</td><td>{rp.occupancy ? `${rp.occupancy} guest${rp.occupancy > 1 ? 's' : ''}` : '—'}</td><td>₹{Number(rp.baseRate).toLocaleString('en-IN')}</td><td>{(rp.mealPlan || 'ROOM_ONLY').replace('_', ' ')}</td><td>{rp.cancellationPolicy}</td></tr>
              ))}
            </tbody>
          </table>
          {(ratePlansByType[rt.id] || []).map(rp => <RatePlanRestrictions key={rp.id} ratePlan={rp} hotelId={hotelId} roomTypeId={rt.id} />)}
          <form onSubmit={(e) => addRatePlan(e, rt.id)} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <input placeholder="Plan name" value={rpForm[rt.id]?.name || ''}
              onChange={e => setRpForm(prev => ({ ...prev, [rt.id]: { ...prev[rt.id], name: e.target.value } }))} style={inputStyle} />
            <input placeholder="Occupancy (optional)" type="number" min="1" title="Set only if this plan is priced for a specific guest count (Single/Double/Triple etc.)" value={rpForm[rt.id]?.occupancy || ''}
              onChange={e => setRpForm(prev => ({ ...prev, [rt.id]: { ...prev[rt.id], occupancy: e.target.value } }))} style={{ ...inputStyle, width: 140 }} />
            <input placeholder="Base rate" type="number" value={rpForm[rt.id]?.baseRate || ''}
              onChange={e => setRpForm(prev => ({ ...prev, [rt.id]: { ...prev[rt.id], baseRate: e.target.value } }))} style={{ ...inputStyle, width: 110 }} />
            <select value={rpForm[rt.id]?.mealPlan || 'ROOM_ONLY'}
              onChange={e => setRpForm(prev => ({ ...prev, [rt.id]: { ...prev[rt.id], mealPlan: e.target.value } }))} style={inputStyle}>
              <option value="ROOM_ONLY">Room only</option><option value="BREAKFAST">Breakfast included</option>
              <option value="HALF_BOARD">Half board</option><option value="FULL_BOARD">Full board</option>
            </select>
            <input placeholder="Cancellation policy" value={rpForm[rt.id]?.cancellationPolicy || ''}
              onChange={e => setRpForm(prev => ({ ...prev, [rt.id]: { ...prev[rt.id], cancellationPolicy: e.target.value } }))} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
            <button type="submit" className="admin-row-btn" style={btnPrimary}><Plus size={14} /> Add rate plan</button>
          </form>
        </div>
      ))}
    </div>
  );
}

// ── Per-date rate overrides + restrictions (min/max stay, CTA/CTD) ──────────────
function RatePlanRestrictions({ ratePlan, hotelId, roomTypeId }) {
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState([]);
  const emptyForm = { date: today(), price: '', minStay: '', maxStay: '', closedToArrival: false, closedToDeparture: false, stopSell: false, allotment: '' };
  const [form, setForm] = useState(emptyForm);
  const [suggestion, setSuggestion] = useState(null);
  const [suggesting, setSuggesting] = useState(false);
  const [inventoryRows, setInventoryRows] = useState([]);

  const suggestPrice = async () => {
    setSuggesting(true);
    try { const res = await pmsApi.suggestPrice(hotelId, roomTypeId, ratePlan.id, form.date); setSuggestion(res.data.data); }
    catch (err) { alert(err?.response?.data?.message || 'Could not compute a pricing suggestion'); }
    finally { setSuggesting(false); }
  };
  const applySuggestion = () => { if (suggestion) { setForm({ ...form, price: suggestion.suggestedPrice }); setSuggestion(null); } };

  const load = () => {
    const to = new Date(); to.setDate(to.getDate() + 30);
    const toStr = localDateStr(to);
    pmsApi.listDayPrices(ratePlan.id, today(), toStr).then(res => setRows(res.data.data || [])).catch(() => {});
    pmsApi.listRoomTypeInventory(roomTypeId, today(), toStr).then(res => setInventoryRows(res.data.data || [])).catch(() => {});
  };
  useEffect(() => { if (expanded) load(); }, [expanded]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await pmsApi.setDayPrice(ratePlan.id, {
        date: form.date,
        price: form.price ? Number(form.price) : null,
        minStay: form.minStay ? Number(form.minStay) : null,
        maxStay: form.maxStay ? Number(form.maxStay) : null,
        closedToArrival: form.closedToArrival,
        closedToDeparture: form.closedToDeparture,
        stopSell: form.stopSell,
      });
      if (form.allotment !== '') {
        await pmsApi.setRoomTypeInventory(roomTypeId, { date: form.date, allotment: Number(form.allotment) });
      }
      setForm({ ...emptyForm, date: form.date });
      load();
    } catch { alert('Could not save date rule'); }
  };

  const allotmentForDate = (date) => inventoryRows.find(r => r.date === date)?.allotment;

  if (!expanded) {
    return <button type="button" className="admin-row-btn" style={{ ...btnSecondary, marginTop: 6, marginRight: 6 }} onClick={() => setExpanded(true)}>Manage dates — {ratePlan.name}</button>;
  }

  return (
    <div style={{ marginTop: 8, marginBottom: 8, padding: 12, border: '1px dashed var(--gray-200)', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong style={{ fontSize: 12.5 }}>{ratePlan.name} — date rules (next 30 days)</strong>
        <button type="button" className="admin-row-btn" style={btnSecondary} onClick={() => setExpanded(false)}>Close</button>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
        <input type="number" placeholder="Price override" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={{ ...inputStyle, width: 120 }} />
        <button type="button" className="admin-row-btn" style={btnSecondary} onClick={suggestPrice} disabled={suggesting}>{suggesting ? 'Checking…' : 'Suggest price'}</button>
        <input type="number" min="1" placeholder="Min stay" value={form.minStay} onChange={e => setForm({ ...form, minStay: e.target.value })} style={{ ...inputStyle, width: 90 }} />
        <input type="number" min="1" placeholder="Max stay" value={form.maxStay} onChange={e => setForm({ ...form, maxStay: e.target.value })} style={{ ...inputStyle, width: 90 }} />
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={form.closedToArrival} onChange={e => setForm({ ...form, closedToArrival: e.target.checked })} /> Closed to arrival
        </label>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={form.closedToDeparture} onChange={e => setForm({ ...form, closedToDeparture: e.target.checked })} /> Closed to departure
        </label>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={form.stopSell} onChange={e => setForm({ ...form, stopSell: e.target.checked })} /> Stop sell
        </label>
        <input type="number" min="0" placeholder="Allotment (rooms)" title="Cap on sellable rooms of this type on this date, independent of physical room count"
          value={form.allotment} onChange={e => setForm({ ...form, allotment: e.target.value })} style={{ ...inputStyle, width: 130 }} />
        <button type="submit" className="admin-row-btn" style={btnPrimary}>Save</button>
      </form>
      {suggestion && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: 8, background: '#F0FDF4', borderRadius: 6, fontSize: 12.5 }}>
          <span>Base ₹{Number(suggestion.baseRate).toLocaleString('en-IN')} · {suggestion.occupancyPercent}% occupied on {form.date} · <strong>Suggested ₹{Number(suggestion.suggestedPrice).toLocaleString('en-IN')}</strong> — {suggestion.reason}</span>
          <button type="button" className="admin-row-btn" style={btnPrimary} onClick={applySuggestion}>Use this price</button>
        </div>
      )}
      <table className="admin-table">
        <thead><tr><th>Date</th><th>Price</th><th>Min stay</th><th>Max stay</th><th>CTA</th><th>CTD</th><th>Stop sell</th><th>Allotment</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{r.date}</td>
              <td>{r.price != null ? `₹${Number(r.price).toLocaleString('en-IN')}` : '—'}</td>
              <td>{r.minStay ?? '—'}</td>
              <td>{r.maxStay ?? '—'}</td>
              <td>{r.closedToArrival ? 'Yes' : ''}</td>
              <td>{r.closedToDeparture ? 'Yes' : ''}</td>
              <td>{r.stopSell ? 'Yes' : ''}</td>
              <td>{allotmentForDate(r.date) ?? '—'}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 12 }}>No date rules set</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ── Reservations (availability + booking + list) ───────────────────────────────
export function ReservationsTab({ hotelId, roomTypes, reservations, groups, agents, onCreated, onOpenFolio }) {
  const [avail, setAvail] = useState({ roomTypeId: '', checkIn: today(), checkOut: today(), count: null });
  const [form, setForm] = useState({ guestName: '', guestPhone: '', checkInDate: today(), checkOutDate: today(), adults: 1, children: 0, rooms: [], groupId: '', agentId: '' });
  const [ratePlansByType, setRatePlansByType] = useState({});
  const [saving, setSaving] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({ guestName: '', guestPhone: '' });
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

  useEffect(() => { roomTypes.forEach(rt => pmsApi.listRatePlans(rt.id).then(res => setRatePlansByType(p => ({ ...p, [rt.id]: res.data.data || [] }))).catch(() => {})); }, [roomTypes]);

  const checkAvailability = async () => {
    if (!avail.roomTypeId) return;
    try {
      const res = await pmsApi.availability({ hotelId, roomTypeId: avail.roomTypeId, checkIn: avail.checkIn, checkOut: avail.checkOut });
      setAvail(a => ({ ...a, count: res.data.data.availableRooms }));
    } catch { setAvail(a => ({ ...a, count: null })); }
  };

  const joinWaitlist = async (e) => {
    e.preventDefault();
    if (!waitlistForm.guestName.trim()) return;
    setJoiningWaitlist(true);
    try {
      await pmsApi.joinWaitlist(hotelId, {
        roomTypeId: avail.roomTypeId, guestName: waitlistForm.guestName, guestPhone: waitlistForm.guestPhone,
        checkInDate: avail.checkIn, checkOutDate: avail.checkOut,
      });
      setWaitlistForm({ guestName: '', guestPhone: '' });
      alert('Added to the waitlist — they\'ll be notified automatically if a room frees up for these dates.');
    } catch (err) { alert(err?.response?.data?.message || 'Could not join the waitlist'); }
    finally { setJoiningWaitlist(false); }
  };

  const addRoomRow = () => setForm(f => ({ ...f, rooms: [...f.rooms, { roomTypeId: '', ratePlanId: '' }] }));
  const updateRoomRow = (i, field, val) => setForm(f => ({ ...f, rooms: f.rooms.map((r, idx) => idx === i ? { ...r, [field]: val } : r) }));
  const removeRoomRow = (i) => setForm(f => ({ ...f, rooms: f.rooms.filter((_, idx) => idx !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.guestName.trim() || form.rooms.length === 0) { alert('Add guest name and at least one room'); return; }
    setSaving(true);
    try {
      await pmsApi.createReservation({ hotelId, ...form, groupId: form.groupId || null, agentId: form.agentId || null, adults: Number(form.adults), children: Number(form.children) });
      setForm({ guestName: '', guestPhone: '', checkInDate: today(), checkOutDate: today(), adults: 1, children: 0, rooms: [], groupId: '', agentId: '' });
      onCreated();
    } catch (err) { alert(err?.response?.data?.message || 'Could not create reservation'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><div><h1 className="page-title">Reservations</h1><p className="page-subtitle">Check availability and create bookings.</p></div></div>

      <div className="admin-table-card" style={{ padding: 16 }}>
        <strong>Check availability</strong>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <select value={avail.roomTypeId} onChange={e => setAvail(a => ({ ...a, roomTypeId: e.target.value, count: null }))} style={inputStyle}>
            <option value="">Room type…</option>
            {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
          </select>
          <input type="date" value={avail.checkIn} onChange={e => setAvail(a => ({ ...a, checkIn: e.target.value, count: null }))} style={inputStyle} />
          <input type="date" value={avail.checkOut} onChange={e => setAvail(a => ({ ...a, checkOut: e.target.value, count: null }))} style={inputStyle} />
          <button className="admin-row-btn" style={btnPrimary} onClick={checkAvailability}><Search size={14} /> Check</button>
          {avail.count !== null && <span style={{ fontWeight: 700 }}>{avail.count} room(s) available</span>}
        </div>
        {avail.count === 0 && (
          <form onSubmit={joinWaitlist} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center', padding: 10, background: '#FFFBEB', borderRadius: 8 }}>
            <span style={{ fontSize: 12.5, color: 'var(--gray-600)' }}>No rooms free for these dates — join the waitlist:</span>
            <input placeholder="Guest name" value={waitlistForm.guestName} onChange={e => setWaitlistForm({ ...waitlistForm, guestName: e.target.value })} style={inputStyle} />
            <input placeholder="Phone" value={waitlistForm.guestPhone} onChange={e => setWaitlistForm({ ...waitlistForm, guestPhone: e.target.value })} style={inputStyle} />
            <button type="submit" className="admin-row-btn" style={btnPrimary} disabled={joiningWaitlist}><Plus size={14} /> {joiningWaitlist ? 'Adding…' : 'Join waitlist'}</button>
          </form>
        )}
      </div>

      <form onSubmit={submit} className="admin-table-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <strong>New reservation</strong>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Guest name" value={form.guestName} onChange={e => setForm({ ...form, guestName: e.target.value })} style={inputStyle} />
          <input placeholder="Phone" value={form.guestPhone} onChange={e => setForm({ ...form, guestPhone: e.target.value })} style={inputStyle} />
          <input type="date" value={form.checkInDate} onChange={e => setForm({ ...form, checkInDate: e.target.value })} style={inputStyle} />
          <input type="date" value={form.checkOutDate} onChange={e => setForm({ ...form, checkOutDate: e.target.value })} style={inputStyle} />
          <input type="number" min="1" placeholder="Adults" value={form.adults} onChange={e => setForm({ ...form, adults: e.target.value })} style={{ ...inputStyle, width: 90 }} />
          <input type="number" min="0" placeholder="Children" value={form.children} onChange={e => setForm({ ...form, children: e.target.value })} style={{ ...inputStyle, width: 90 }} />
          <select value={form.groupId} onChange={e => setForm({ ...form, groupId: e.target.value })} style={inputStyle}>
            <option value="">No group (standalone booking)</option>
            {(groups || []).map(g => <option key={g.id} value={g.id}>Group: {g.name}</option>)}
          </select>
          <select value={form.agentId} onChange={e => setForm({ ...form, agentId: e.target.value })} style={inputStyle}>
            <option value="">No agent</option>
            {(agents || []).map(a => <option key={a.id} value={a.id}>Agent: {a.name} ({a.commissionPercent}%)</option>)}
          </select>
        </div>
        {form.rooms.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 8 }}>
            <select value={r.roomTypeId} onChange={e => updateRoomRow(i, 'roomTypeId', e.target.value)} style={inputStyle}>
              <option value="">Room type…</option>
              {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
            <select value={r.ratePlanId} onChange={e => updateRoomRow(i, 'ratePlanId', e.target.value)} style={inputStyle}>
              <option value="">Rate plan…</option>
              {(ratePlansByType[r.roomTypeId] || []).map(rp => <option key={rp.id} value={rp.id}>{rp.name} (₹{rp.baseRate})</option>)}
            </select>
            <button type="button" className="admin-row-btn" onClick={() => removeRoomRow(i)}><Ban size={14} /></button>
          </div>
        ))}
        <div>
          <button type="button" className="admin-row-btn" style={btnSecondary} onClick={addRoomRow}><Plus size={14} /> Add room</button>
          {' '}
          <button type="submit" className="admin-row-btn" style={btnPrimary} disabled={saving}><Plus size={14} /> Create reservation</button>
        </div>
      </form>

      <ReservationsTable reservations={reservations} onOpenFolio={onOpenFolio} />
    </div>
  );
}

function ReservationsTable({ reservations, onOpenFolio, actions }) {
  const copyCheckinLink = (r) => {
    const url = `${window.location.origin}/pms/contactless-checkin/${r.id}`;
    navigator.clipboard?.writeText(url);
    alert('Pre-check-in link copied — share it with the guest:\n' + url);
  };

  return (
    <div className="admin-table-card">
      <table className="admin-table">
        <thead><tr><th>Guest</th><th>Check-in</th><th>Check-out</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {reservations.map(r => (
            <tr key={r.id}>
              <td className="admin-td-shop">{r.guestName}</td>
              <td>{r.checkInDate}</td>
              <td>{r.checkOutDate}</td>
              <td>
                <span className={STATUS_CLS[r.status] || 'status-pill'}>{r.status}</span>
                {r.preCheckedIn && <span className="status-pill st-active" style={{ marginLeft: 6 }}>Pre-checked-in</span>}
              </td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="admin-row-btn" title="Folio" onClick={() => onOpenFolio(r.id)}><Receipt size={14} /></button>
                {r.status === 'BOOKED' && <button className="admin-row-btn" title="Copy pre-check-in link" onClick={() => copyCheckinLink(r)}><Copy size={14} /></button>}
                {actions && actions(r)}
              </td>
            </tr>
          ))}
          {reservations.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 20 }}>No reservations yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ── Group Bookings (bulk check-in/out, shared/aggregate folio) ─────────────────
export function GroupsTab({ hotelId, groups, onChange, onReservationsChanged }) {
  const emptyForm = { name: '', organizerName: '', organizerPhone: '', organizerEmail: '', checkInDate: today(), checkOutDate: today(), notes: '' };
  const [form, setForm] = useState(emptyForm);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [folio, setFolio] = useState(null);
  const [payment, setPayment] = useState({ method: 'CASH', amount: '', reference: '' });
  const [acting, setActing] = useState(false);

  const createGroup = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await pmsApi.createGroup({ hotelId, ...form });
      setForm(emptyForm);
      onChange();
    } catch { alert('Could not create group'); }
  };

  const loadDetail = (id) => {
    setSelectedGroupId(id);
    pmsApi.getGroup(id).then(res => setDetail(res.data.data)).catch(() => setDetail(null));
    pmsApi.getGroupFolio(id).then(res => setFolio(res.data.data)).catch(() => setFolio(null));
  };
  const refreshDetail = () => { if (selectedGroupId) loadDetail(selectedGroupId); onReservationsChanged(); };

  const bulkAction = async (apiCall) => {
    setActing(true);
    try {
      const res = await apiCall(selectedGroupId);
      const { succeeded, failed } = res.data.data;
      if (failed.length) alert(`${succeeded.length} succeeded, ${failed.length} failed:\n` + failed.map(f => f.error).join('\n'));
      refreshDetail();
    } catch { alert('Bulk action failed'); }
    finally { setActing(false); }
  };

  const addPayment = async (e) => {
    e.preventDefault();
    if (!payment.amount) return;
    try {
      await pmsApi.addGroupPayment(selectedGroupId, { ...payment, amount: Number(payment.amount) });
      setPayment({ method: 'CASH', amount: '', reference: '' });
      loadDetail(selectedGroupId);
    } catch { alert('Could not record payment'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><div><h1 className="page-title">Group Bookings</h1><p className="page-subtitle">Book many rooms under one group, with shared billing and bulk check-in/out.</p></div></div>

      <form onSubmit={createGroup} className="admin-table-card" style={{ padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <input placeholder="Group name (e.g. Sharma-Verma Wedding)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ ...inputStyle, minWidth: 220 }} />
        <input placeholder="Organizer name" value={form.organizerName} onChange={e => setForm({ ...form, organizerName: e.target.value })} style={inputStyle} />
        <input placeholder="Organizer phone" value={form.organizerPhone} onChange={e => setForm({ ...form, organizerPhone: e.target.value })} style={inputStyle} />
        <input type="date" value={form.checkInDate} onChange={e => setForm({ ...form, checkInDate: e.target.value })} style={inputStyle} />
        <input type="date" value={form.checkOutDate} onChange={e => setForm({ ...form, checkOutDate: e.target.value })} style={inputStyle} />
        <button type="submit" className="admin-row-btn" style={btnPrimary}><Plus size={14} /> Create group</button>
      </form>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Organizer</th><th>Dates</th><th></th></tr></thead>
          <tbody>
            {groups.map(g => (
              <tr key={g.id}>
                <td className="admin-td-shop">{g.name}</td>
                <td>{g.organizerName}{g.organizerPhone ? ` · ${g.organizerPhone}` : ''}</td>
                <td>{g.checkInDate} → {g.checkOutDate}</td>
                <td><button className="admin-row-btn" style={btnSecondary} onClick={() => loadDetail(g.id)}>View</button></td>
              </tr>
            ))}
            {groups.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 20 }}>No groups yet — create one above, then attach room bookings to it from the Reservations tab.</td></tr>}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="admin-table-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <strong>{detail.group.name} — {detail.members.length} room(s)</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="admin-row-btn" style={btnSecondary} onClick={() => bulkAction(pmsApi.groupCheckIn)} disabled={acting}><LogIn size={14} /> Check in all</button>
              <button className="admin-row-btn" style={btnSecondary} onClick={() => bulkAction(pmsApi.groupCheckOut)} disabled={acting}><DoorOpen size={14} /> Check out all</button>
            </div>
          </div>
          <table className="admin-table">
            <thead><tr><th>Guest</th><th>Check-in</th><th>Check-out</th><th>Status</th></tr></thead>
            <tbody>
              {detail.members.map(m => (
                <tr key={m.id}>
                  <td>{m.guestName}</td><td>{m.checkInDate}</td><td>{m.checkOutDate}</td>
                  <td><span className={STATUS_CLS[m.status] || 'status-pill'}>{m.status}</span></td>
                </tr>
              ))}
              {detail.members.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 20 }}>No rooms attached yet — book one from the Reservations tab and pick this group.</td></tr>}
            </tbody>
          </table>

          {folio && (
            <>
              <div className="admin-kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                <div className="admin-kpi-card"><div className="admin-kpi-value">₹{Number(folio.totalCharges).toLocaleString('en-IN')}</div><div className="admin-kpi-label">Total charges (all rooms)</div></div>
                <div className="admin-kpi-card"><div className="admin-kpi-value">₹{Number(folio.totalPayments).toLocaleString('en-IN')}</div><div className="admin-kpi-label">Total payments</div></div>
                <div className="admin-kpi-card"><div className="admin-kpi-value">₹{Number(folio.balance).toLocaleString('en-IN')}</div><div className="admin-kpi-label">Balance due</div></div>
              </div>
              <form onSubmit={addPayment} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={payment.method} onChange={e => setPayment({ ...payment, method: e.target.value })} style={inputStyle}>
                  <option value="CASH">Cash</option><option value="CARD">Card</option><option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank transfer</option><option value="WALLET">Wallet</option>
                </select>
                <input type="number" placeholder="Amount" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} style={{ ...inputStyle, width: 110 }} />
                <input placeholder="Reference" value={payment.reference} onChange={e => setPayment({ ...payment, reference: e.target.value })} style={inputStyle} />
                <button type="submit" className="admin-row-btn" style={btnPrimary}><Plus size={14} /> Record group payment</button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Front Desk (check-in / check-out) ───────────────────────────────────────────
export function FrontDeskTab({ reservations, onChanged, onOpenFolio }) {
  const live = reservations.filter(r => r.status === 'BOOKED' || r.status === 'CHECKED_IN');
  const [extendId, setExtendId] = useState(null);
  const [extendDate, setExtendDate] = useState('');
  const [card, setCard] = useState(null);

  const act = async (fn, id, okMsg) => {
    try { await fn(id); onChanged(); } catch (err) { alert(err?.response?.data?.message || 'Action failed'); }
  };

  const submitExtend = async (id) => {
    if (!extendDate) return;
    try { await pmsApi.extendStay(id, extendDate); setExtendId(null); setExtendDate(''); onChanged(); }
    catch (err) { alert(err?.response?.data?.message || 'Could not extend stay'); }
  };

  const viewCard = async (id) => {
    try { const res = await pmsApi.getRegistrationCard(id); setCard(res.data.data); }
    catch (err) { alert(err?.response?.data?.message || 'No registration card on file'); }
  };

  const holdCard = async (r) => {
    const amountStr = prompt("Amount to hold on the guest's card (₹):", '2000');
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (!amount || amount <= 0) return;
    try {
      const res = await pmsApi.createPreAuth(r.id, amount);
      const pay = res.data.data;
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) { alert('Could not load the payment widget.'); return; }
      const rzp = new window.Razorpay({
        key: pay.key, amount: pay.amount, currency: pay.currency, order_id: pay.razorpayOrderId,
        name: 'Card authorization', description: `Hold for ${r.guestName}`,
        prefill: { name: r.guestName, contact: r.guestPhone },
        handler: async (resp) => {
          try {
            await pmsApi.verifyPreAuth(r.id, {
              razorpayOrderId: resp.razorpay_order_id, razorpayPaymentId: resp.razorpay_payment_id, razorpaySignature: resp.razorpay_signature,
            });
            alert('Card authorized — hold placed. Capture it from the Folio tab at checkout.');
            onChanged();
          } catch { alert('Could not verify the authorization.'); }
        },
      });
      rzp.open();
    } catch (err) { alert(err?.response?.data?.message || 'Could not start the card authorization.'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><div><h1 className="page-title">Front Desk</h1><p className="page-subtitle">Check guests in and out.</p></div></div>
      <ReservationsTable reservations={live} onOpenFolio={onOpenFolio} actions={(r) => (
        <>
          {r.preCheckedIn && <button className="admin-row-btn" title="View registration card" onClick={() => viewCard(r.id)}><PenTool size={14} /></button>}
          <button className="admin-row-btn" title="Hold a card (pre-authorization)" onClick={() => holdCard(r)}><CreditCard size={14} /></button>
          {r.status === 'BOOKED' && <>
            <button className="admin-row-btn" title="Check in" onClick={() => act(pmsApi.checkIn, r.id)}><LogIn size={14} /></button>
            <button className="admin-row-btn" title="Cancel" onClick={() => act(pmsApi.cancel, r.id)}><Ban size={14} /></button>
            <button className="admin-row-btn" title="No-show" onClick={() => act(pmsApi.noShow, r.id)}><UserX size={14} /></button>
          </>}
          {r.status === 'CHECKED_IN' && (
            <>
              <button className="admin-row-btn" title="Check out" onClick={() => act(pmsApi.checkOut, r.id)}><DoorOpen size={14} /></button>
              {extendId === r.id ? (
                <>
                  <input type="date" value={extendDate} min={r.checkOutDate} onChange={e => setExtendDate(e.target.value)} style={{ ...inputStyle, height: 28, width: 130 }} />
                  <button className="admin-row-btn" style={btnPrimary} onClick={() => submitExtend(r.id)}>Save</button>
                  <button className="admin-row-btn" style={btnSecondary} onClick={() => { setExtendId(null); setExtendDate(''); }}>Cancel</button>
                </>
              ) : (
                <button className="admin-row-btn" title="Extend stay" onClick={() => { setExtendId(r.id); setExtendDate(r.checkOutDate); }}><CalendarClock size={14} /></button>
              )}
            </>
          )}
        </>
      )} />
      {card && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setCard(null)}>
          <div className="admin-table-card" style={{ padding: 20, width: 380, maxWidth: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong>Registration Card</strong>
              <button className="admin-row-btn" onClick={() => setCard(null)}><X size={14} /></button>
            </div>
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div><strong>Guest:</strong> {card.guestName}</div>
              <div><strong>ID proof:</strong> {card.idProofType || '—'} {card.idProofNumber || ''}</div>
              <div><strong>Address:</strong> {card.address || '—'}</div>
              <div><strong>Signed:</strong> {new Date(card.signedAt).toLocaleString()}</div>
            </div>
            {card.signatureData && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>Signature</div>
                <img src={card.signatureData} alt="Guest signature" style={{ width: '100%', border: '1px solid var(--gray-200)', borderRadius: 8, background: '#fff' }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Folio (charges, payments, balance) ──────────────────────────────────────────
export function FolioTab({ hotelId, reservations, selectedId, onSelect }) {
  const [folio, setFolio] = useState(null);
  const [charge, setCharge] = useState({ type: 'ADDON', description: '', amount: '' });
  const [payment, setPayment] = useState({ method: 'CASH', amount: '', reference: '' });
  const [discounts, setDiscounts] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [selectedDiscount, setSelectedDiscount] = useState('');
  const [selectedAddOn, setSelectedAddOn] = useState('');
  const [addOnQty, setAddOnQty] = useState(1);
  const [invoice, setInvoice] = useState(null);
  const [preAuth, setPreAuth] = useState(null);
  const [capturing, setCapturing] = useState(false);

  const load = useCallback(() => {
    if (!selectedId) return;
    pmsApi.getFolio(selectedId).then(res => setFolio(res.data.data)).catch(() => setFolio(null));
    pmsApi.getInvoice(selectedId).then(res => setInvoice(res.data.data)).catch(() => setInvoice(null));
    pmsApi.getPreAuth(selectedId).then(res => setPreAuth(res.data.data)).catch(() => setPreAuth(null));
  }, [selectedId]);
  useEffect(() => { load(); }, [load]);

  const captureHold = async () => {
    setCapturing(true);
    try { await pmsApi.capturePreAuth(selectedId); load(); }
    catch (err) { alert(err?.response?.data?.message || 'Could not capture the held card.'); }
    finally { setCapturing(false); }
  };

  useEffect(() => {
    if (!hotelId) return;
    pmsApi.listDiscounts(hotelId).then(res => setDiscounts((res.data.data || []).filter(d => d.active))).catch(() => {});
    pmsApi.listAddOns(hotelId).then(res => setAddOns(res.data.data || [])).catch(() => {});
  }, [hotelId]);

  const applyDiscount = async () => {
    if (!selectedDiscount) return;
    try { await pmsApi.applyDiscount(selectedId, selectedDiscount); setSelectedDiscount(''); load(); }
    catch { alert('Could not apply discount'); }
  };
  const applyAddOn = async () => {
    if (!selectedAddOn) return;
    try { await pmsApi.applyAddOn(selectedId, selectedAddOn, addOnQty); setSelectedAddOn(''); setAddOnQty(1); load(); }
    catch { alert('Could not apply add-on'); }
  };

  const addCharge = async (e) => {
    e.preventDefault();
    if (!charge.description || !charge.amount) return;
    try { await pmsApi.addFolioCharge(selectedId, { ...charge, amount: Number(charge.amount) }); setCharge({ type: 'ADDON', description: '', amount: '' }); load(); }
    catch { alert('Could not add charge'); }
  };
  const addPayment = async (e) => {
    e.preventDefault();
    if (!payment.amount) return;
    try { await pmsApi.addFolioPayment(selectedId, { ...payment, amount: Number(payment.amount) }); setPayment({ method: 'CASH', amount: '', reference: '' }); load(); }
    catch (err) { alert(err?.response?.data?.message || 'Could not record payment'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><div><h1 className="page-title">Folio</h1><p className="page-subtitle">Charges, payments and balance per reservation.</p></div></div>

      <select value={selectedId || ''} onChange={e => onSelect(e.target.value)} style={inputStyle}>
        <option value="">Select a reservation…</option>
        {reservations.map(r => <option key={r.id} value={r.id}>{r.guestName} — {r.checkInDate} to {r.checkOutDate}</option>)}
      </select>

      {folio && (
        <>
          {invoice && (
            <div className="admin-table-card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><strong>Invoice {invoice.invoiceNumber}</strong> <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>issued {new Date(invoice.issuedAt).toLocaleString()}</span></div>
              <div style={{ fontSize: 13 }}>Charges ₹{Number(invoice.totalCharges).toLocaleString('en-IN')} · Paid ₹{Number(invoice.totalPayments).toLocaleString('en-IN')} · Balance ₹{Number(invoice.balance).toLocaleString('en-IN')}</div>
            </div>
          )}
          {preAuth && preAuth.status === 'AUTHORIZED' && (
            <div className="admin-table-card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFBEB' }}>
              <div><CreditCard size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /><strong>Card held</strong> — ₹{Number(preAuth.amount).toLocaleString('en-IN')} authorized, not yet charged</div>
              <button className="admin-row-btn" style={btnPrimary} disabled={capturing} onClick={captureHold}>{capturing ? 'Capturing…' : 'Capture to folio'}</button>
            </div>
          )}
          {preAuth && preAuth.status === 'CAPTURED' && (
            <div className="admin-table-card" style={{ padding: 14, fontSize: 13 }}>
              <CreditCard size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /><strong>Card charged</strong> — ₹{Number(preAuth.amount).toLocaleString('en-IN')} captured and posted below
            </div>
          )}
          <div className="admin-kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div className="admin-kpi-card"><div className="admin-kpi-value">₹{Number(folio.totalCharges).toLocaleString('en-IN')}</div><div className="admin-kpi-label">Total charges</div></div>
            <div className="admin-kpi-card"><div className="admin-kpi-value">₹{Number(folio.totalPayments).toLocaleString('en-IN')}</div><div className="admin-kpi-label">Total payments</div></div>
            <div className="admin-kpi-card"><div className="admin-kpi-value">₹{Number(folio.balance).toLocaleString('en-IN')}</div><div className="admin-kpi-label">Balance due</div></div>
          </div>

          <div className="admin-table-card">
            <table className="admin-table">
              <thead><tr><th>Type</th><th>Description</th><th>Amount</th></tr></thead>
              <tbody>{folio.charges.map(c => <tr key={c.id}><td>{c.type}</td><td>{c.description}</td><td>₹{Number(c.amount).toLocaleString('en-IN')}</td></tr>)}</tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={selectedDiscount} onChange={e => setSelectedDiscount(e.target.value)} style={inputStyle}>
              <option value="">Apply a discount package…</option>
              {discounts.map(d => <option key={d.id} value={d.id}>{d.name} ({d.valueType === 'FIXED' ? `₹${d.value}` : `${d.value}%`})</option>)}
            </select>
            <button type="button" className="admin-row-btn" style={btnSecondary} onClick={applyDiscount} disabled={!selectedDiscount}>Apply discount</button>
            <select value={selectedAddOn} onChange={e => setSelectedAddOn(e.target.value)} style={inputStyle}>
              <option value="">Add from catalog…</option>
              {addOns.map(a => <option key={a.id} value={a.id}>{a.name} (₹{a.price})</option>)}
            </select>
            <input type="number" min="1" value={addOnQty} onChange={e => setAddOnQty(Number(e.target.value) || 1)} style={{ ...inputStyle, width: 70 }} />
            <button type="button" className="admin-row-btn" style={btnSecondary} onClick={applyAddOn} disabled={!selectedAddOn}>Apply add-on</button>
          </div>

          <form onSubmit={addCharge} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={charge.type} onChange={e => setCharge({ ...charge, type: e.target.value })} style={inputStyle}>
              <option value="ADDON">Add-on</option><option value="TAX">Tax</option><option value="OTHER">Other</option>
            </select>
            <input placeholder="Description" value={charge.description} onChange={e => setCharge({ ...charge, description: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Amount" value={charge.amount} onChange={e => setCharge({ ...charge, amount: e.target.value })} style={{ ...inputStyle, width: 110 }} />
            <button type="submit" className="admin-row-btn" style={btnPrimary}><Plus size={14} /> Add charge</button>
          </form>

          <div className="admin-table-card">
            <table className="admin-table">
              <thead><tr><th>Method</th><th>Amount</th><th>Reference</th></tr></thead>
              <tbody>{folio.payments.map(p => <tr key={p.id}><td>{p.method}</td><td>₹{Number(p.amount).toLocaleString('en-IN')}</td><td>{p.reference}</td></tr>)}</tbody>
            </table>
          </div>
          <form onSubmit={addPayment} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={payment.method} onChange={e => setPayment({ ...payment, method: e.target.value })} style={inputStyle}>
              <option value="CASH">Cash</option><option value="CARD">Card</option><option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank transfer</option><option value="WALLET">Wallet</option>
              <option value="VOUCHER">Voucher</option>
              <option value="LOYALTY_POINTS">Loyalty points</option>
            </select>
            <input type="number" placeholder="Amount" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} style={{ ...inputStyle, width: 110 }} />
            <input placeholder={payment.method === 'VOUCHER' ? 'Voucher code' : 'Reference'} value={payment.reference} onChange={e => setPayment({ ...payment, reference: e.target.value })} style={inputStyle} disabled={payment.method === 'LOYALTY_POINTS'} />
            <button type="submit" className="admin-row-btn" style={btnPrimary}><Plus size={14} /> Record payment</button>
          </form>
        </>
      )}
    </div>
  );
}

// ── Channel Manager (OTA mappings, ARI push, sync log) ──────────────────────────
const CHANNEL_OPTIONS = ['BOOKING_COM', 'MMT', 'AGODA', 'EXPEDIA', 'GENERIC'];

export function ChannelsTab({ hotelId, roomTypes }) {
  const [mappings, setMappings] = useState([]);
  const [log, setLog] = useState([]);
  const emptyForm = { channel: 'BOOKING_COM', roomTypeId: '', externalPropertyId: '', externalRoomTypeId: '', externalRatePlanId: '', accessKey: '', channelId: '', cmBaseUrl: '' };
  const [form, setForm] = useState(emptyForm);
  const [pushing, setPushing] = useState(false);

  const roomTypeName = (id) => roomTypes.find(rt => rt.id === id)?.name || id;

  const load = useCallback(() => {
    pmsApi.listChannelMappings(hotelId).then(res => setMappings(res.data.data || [])).catch(() => {});
    pmsApi.getChannelSyncLog(hotelId).then(res => setLog(res.data.data || [])).catch(() => {});
  }, [hotelId]);
  useEffect(() => { load(); }, [load]);

  const addMapping = async (e) => {
    e.preventDefault();
    if (!form.roomTypeId || !form.externalPropertyId || !form.externalRoomTypeId) return;
    try {
      await pmsApi.createChannelMapping({ hotelId, ...form });
      setForm(emptyForm);
      load();
    } catch { alert('Could not create mapping'); }
  };

  const toggleActive = async (m) => {
    try { await pmsApi.updateChannelMapping(m.id, { ...m, active: !m.active }); load(); }
    catch { alert('Could not update mapping'); }
  };

  const pushNow = async () => {
    setPushing(true);
    try { await pmsApi.pushChannelSync(hotelId); load(); }
    catch { alert('Push failed'); }
    finally { setPushing(false); }
  };

  const copySecret = (secret) => {
    navigator.clipboard?.writeText(secret).then(() => alert('Webhook secret copied')).catch(() => {});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div><h1 className="page-title">Channel Manager</h1><p className="page-subtitle">Map room types to OTA channels and monitor sync.</p></div>
        <button className="admin-row-btn" style={btnPrimary} onClick={pushNow} disabled={pushing}><RefreshCw size={14} /> Push availability &amp; rates now</button>
      </div>

      <form onSubmit={addMapping} className="admin-table-card" style={{ padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} style={inputStyle}>
          {CHANNEL_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={form.roomTypeId} onChange={e => setForm({ ...form, roomTypeId: e.target.value })} style={inputStyle}>
          <option value="">Room type…</option>
          {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
        </select>
        <input placeholder="External property ID" value={form.externalPropertyId} onChange={e => setForm({ ...form, externalPropertyId: e.target.value })} style={inputStyle} />
        <input placeholder="External room type ID" value={form.externalRoomTypeId} onChange={e => setForm({ ...form, externalRoomTypeId: e.target.value })} style={inputStyle} />
        <input placeholder="External rate plan ID (optional)" value={form.externalRatePlanId} onChange={e => setForm({ ...form, externalRatePlanId: e.target.value })} style={inputStyle} />
        <button type="submit" className="admin-row-btn" style={btnPrimary}><Plus size={14} /> Add mapping</button>
        <div style={{ width: '100%', display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4, borderTop: '1px dashed var(--gray-200)', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--gray-500)', alignSelf: 'center' }}>Live connection (optional — leave blank to just simulate pushes):</span>
          <input placeholder="Access key" value={form.accessKey} onChange={e => setForm({ ...form, accessKey: e.target.value })} style={inputStyle} />
          <input placeholder="Channel ID" value={form.channelId} onChange={e => setForm({ ...form, channelId: e.target.value })} style={inputStyle} />
          <input placeholder="Channel manager base URL" value={form.cmBaseUrl} onChange={e => setForm({ ...form, cmBaseUrl: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 220 }} />
        </div>
      </form>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Channel</th><th>Room type</th><th>External IDs</th><th>Webhook secret</th><th>Connection</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {mappings.map(m => (
              <tr key={m.id}>
                <td>{m.channel}</td>
                <td>{roomTypeName(m.roomTypeId)}</td>
                <td style={{ fontSize: 12 }}>{m.externalPropertyId} / {m.externalRoomTypeId}{m.externalRatePlanId ? ` / ${m.externalRatePlanId}` : ''}</td>
                <td>
                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{m.webhookSecret.slice(0, 10)}…</span>{' '}
                  <button className="admin-row-btn" title="Copy secret" onClick={() => copySecret(m.webhookSecret)}><Copy size={12} /></button>
                </td>
                <td><span className={m.cmBaseUrl ? 'status-pill st-active' : 'plan-pill'}>{m.cmBaseUrl ? 'Live' : 'Simulated'}</span></td>
                <td><span className={m.active ? 'status-pill st-active' : 'status-pill st-suspended'}>{m.active ? 'Active' : 'Paused'}</span></td>
                <td><button className="admin-row-btn" style={btnSecondary} onClick={() => toggleActive(m)}>{m.active ? 'Pause' : 'Resume'}</button></td>
              </tr>
            ))}
            {mappings.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 20 }}>No channel mappings yet</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>When</th><th>Channel</th><th>Direction</th><th>Status</th><th>Message</th></tr></thead>
          <tbody>
            {log.map(l => (
              <tr key={l.id}>
                <td style={{ fontSize: 12 }}>{new Date(l.createdAt).toLocaleString()}</td>
                <td>{l.channel}</td>
                <td>{l.direction}</td>
                <td><span className={l.status === 'SUCCESS' ? 'status-pill st-active' : 'status-pill st-suspended'}>{l.status}</span></td>
                <td style={{ fontSize: 12.5 }}>{l.message}</td>
              </tr>
            ))}
            {log.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 20 }}>No sync activity yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Agents & Commission ──────────────────────────────────────────────────────
export function AgentsTab({ hotelId, agents, onChange }) {
  const emptyForm = { name: '', contactPerson: '', phone: '', email: '', commissionPercent: '10', tdsPercent: '0', notes: '' };
  const [form, setForm] = useState(emptyForm);
  const [commissions, setCommissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');

  const agentName = (id) => agents.find(a => a.id === id)?.name || id;

  const loadCommissions = useCallback(() => {
    pmsApi.listCommissions(hotelId, statusFilter || undefined).then(res => setCommissions(res.data.data || [])).catch(() => {});
  }, [hotelId, statusFilter]);
  useEffect(() => { loadCommissions(); }, [loadCommissions]);

  const createAgent = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.commissionPercent) return;
    try {
      await pmsApi.createAgent({ hotelId, ...form, commissionPercent: Number(form.commissionPercent), tdsPercent: Number(form.tdsPercent) || 0 });
      setForm(emptyForm);
      onChange();
    } catch { alert('Could not create agent'); }
  };

  const toggleActive = async (a) => {
    try { await pmsApi.updateAgent(a.id, { ...a, active: !a.active }); onChange(); }
    catch { alert('Could not update agent'); }
  };

  const payCommission = async (c) => {
    const reference = prompt('Payment reference (optional):') || '';
    try { await pmsApi.payCommission(c.id, reference); loadCommissions(); }
    catch { alert('Could not mark commission paid'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><div><h1 className="page-title">Agents &amp; Commission</h1><p className="page-subtitle">Travel-agent bookings and payable commission tracking.</p></div></div>

      <form onSubmit={createAgent} className="admin-table-card" style={{ padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <input placeholder="Agent / agency name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
        <input placeholder="Contact person" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} style={inputStyle} />
        <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
        <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
        <input type="number" step="0.01" placeholder="Commission %" value={form.commissionPercent} onChange={e => setForm({ ...form, commissionPercent: e.target.value })} style={{ ...inputStyle, width: 110 }} />
        <input type="number" step="0.01" placeholder="TDS %" value={form.tdsPercent} onChange={e => setForm({ ...form, tdsPercent: e.target.value })} style={{ ...inputStyle, width: 90 }} />
        <button type="submit" className="admin-row-btn" style={btnPrimary}><Plus size={14} /> Add agent</button>
      </form>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Agent</th><th>Contact</th><th>Commission</th><th>TDS</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {agents.map(a => (
              <tr key={a.id}>
                <td className="admin-td-shop">{a.name}</td>
                <td>{a.contactPerson}{a.phone ? ` · ${a.phone}` : ''}</td>
                <td>{a.commissionPercent}%</td>
                <td>{a.tdsPercent || 0}%</td>
                <td><span className={a.active ? 'status-pill st-active' : 'status-pill st-suspended'}>{a.active ? 'Active' : 'Paused'}</span></td>
                <td><button className="admin-row-btn" style={btnSecondary} onClick={() => toggleActive(a)}>{a.active ? 'Pause' : 'Resume'}</button></td>
              </tr>
            ))}
            {agents.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 20 }}>No agents yet</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="page-header" style={{ marginBottom: 0 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Commission payable</h2>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
          <option value="">All</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="VOID">Void</option>
        </select>
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Agent</th><th>Room revenue</th><th>Rate</th><th>Commission</th><th>TDS</th><th>Net payable</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {commissions.map(c => (
              <tr key={c.id}>
                <td className="admin-td-shop">{agentName(c.agentId)}</td>
                <td>₹{Number(c.roomRevenue).toLocaleString('en-IN')}</td>
                <td>{c.commissionPercent}%</td>
                <td>₹{Number(c.commissionAmount).toLocaleString('en-IN')}</td>
                <td>₹{Number(c.tdsAmount || 0).toLocaleString('en-IN')}</td>
                <td>₹{Number(c.netPayable ?? c.commissionAmount).toLocaleString('en-IN')}</td>
                <td><span className={c.status === 'PAID' ? 'status-pill st-active' : c.status === 'VOID' ? 'status-pill st-suspended' : 'plan-pill'}>{c.status}</span></td>
                <td>{c.status === 'PENDING' && <button className="admin-row-btn" style={btnPrimary} onClick={() => payCommission(c)}><IndianRupee size={12} /> Mark paid</button>}</td>
              </tr>
            ))}
            {commissions.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 20 }}>No commission records yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Night Audit & Reporting ──────────────────────────────────────────────────
export function ReportsTab({ hotelId, chainId }) {
  const [date, setDate] = useState(today());
  const [report, setReport] = useState(null);
  const [range, setRange] = useState([]);
  const [chainReport, setChainReport] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(false);

  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return localDateStr(d); };

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      pmsApi.nightAudit(hotelId, date).then(res => setReport(res.data.data)).catch(() => setReport(null)),
      pmsApi.nightAuditRange(hotelId, daysAgo(6), date).then(res => setRange(res.data.data || [])).catch(() => setRange([])),
      pmsApi.revenueReport(hotelId, daysAgo(29), date).then(res => setRevenue(res.data.data)).catch(() => setRevenue(null)),
      chainId ? pmsApi.chainNightAudit(chainId, date).then(res => setChainReport(res.data.data)).catch(() => setChainReport(null)) : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [hotelId, chainId, date]);
  useEffect(() => { load(); }, [load]);

  const revenueTable = (rows, labelHeader) => (
    <table className="admin-table">
      <thead><tr><th>{labelHeader}</th><th>Revenue</th></tr></thead>
      <tbody>
        {(rows || []).map(r => <tr key={r.label}><td className="admin-td-shop">{r.label}</td><td>₹{Number(r.amount).toLocaleString('en-IN')}</td></tr>)}
        {(!rows || rows.length === 0) && <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 16 }}>No data</td></tr>}
      </tbody>
    </table>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div><h1 className="page-title">Night Audit &amp; Reports</h1><p className="page-subtitle">Occupancy, ADR/RevPAR, and arrivals/departures for a given night.</p></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          <button className="admin-row-btn" style={btnPrimary} onClick={load} disabled={loading}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      {report && (
        <>
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card"><div className="admin-kpi-value">{report.occupancyPercent}%</div><div className="admin-kpi-label">Occupancy ({report.roomsSold}/{report.totalRooms} rooms)</div></div>
            <div className="admin-kpi-card"><div className="admin-kpi-value">₹{Number(report.adr).toLocaleString('en-IN')}</div><div className="admin-kpi-label">ADR (avg. daily rate)</div></div>
            <div className="admin-kpi-card"><div className="admin-kpi-value">₹{Number(report.revPar).toLocaleString('en-IN')}</div><div className="admin-kpi-label">RevPAR</div></div>
            <div className="admin-kpi-card"><div className="admin-kpi-value">₹{Number(report.roomRevenue).toLocaleString('en-IN')}</div><div className="admin-kpi-label">Room revenue</div></div>
          </div>
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card"><div className="admin-kpi-value">{report.arrivals}</div><div className="admin-kpi-label">Arrivals</div></div>
            <div className="admin-kpi-card"><div className="admin-kpi-value">{report.departures}</div><div className="admin-kpi-label">Departures</div></div>
            <div className="admin-kpi-card"><div className="admin-kpi-value">{report.noShows}</div><div className="admin-kpi-label">No-shows</div></div>
            <div className="admin-kpi-card"><div className="admin-kpi-value">{report.cancellations}</div><div className="admin-kpi-label">Cancellations</div></div>
          </div>
        </>
      )}

      {chainReport && (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: '4px 0 0' }}>Chain-wide (all properties combined)</h2>
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card"><div className="admin-kpi-value">{chainReport.occupancyPercent}%</div><div className="admin-kpi-label">Occupancy ({chainReport.roomsSold}/{chainReport.totalRooms} rooms)</div></div>
            <div className="admin-kpi-card"><div className="admin-kpi-value">₹{Number(chainReport.adr).toLocaleString('en-IN')}</div><div className="admin-kpi-label">ADR</div></div>
            <div className="admin-kpi-card"><div className="admin-kpi-value">₹{Number(chainReport.revPar).toLocaleString('en-IN')}</div><div className="admin-kpi-label">RevPAR</div></div>
            <div className="admin-kpi-card"><div className="admin-kpi-value">₹{Number(chainReport.roomRevenue).toLocaleString('en-IN')}</div><div className="admin-kpi-label">Room revenue</div></div>
          </div>
          <div className="admin-table-card">
            <table className="admin-table">
              <thead><tr><th>Property</th><th>Occupancy</th><th>Revenue</th></tr></thead>
              <tbody>
                {chainReport.hotels.map(h => (
                  <tr key={h.hotelId}>
                    <td className="admin-td-shop">{h.hotelName}</td>
                    <td>{h.report.occupancyPercent}% ({h.report.roomsSold}/{h.report.totalRooms})</td>
                    <td>₹{Number(h.report.roomRevenue).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '4px 0 0' }}>Last 7 nights</h2>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Date</th><th>Occupancy</th><th>ADR</th><th>RevPAR</th><th>Revenue</th><th>Arrivals</th><th>Departures</th><th>No-shows</th></tr></thead>
          <tbody>
            {range.map(r => (
              <tr key={r.date}>
                <td className="admin-td-shop">{r.date}</td>
                <td>{r.occupancyPercent}%</td>
                <td>₹{Number(r.adr).toLocaleString('en-IN')}</td>
                <td>₹{Number(r.revPar).toLocaleString('en-IN')}</td>
                <td>₹{Number(r.roomRevenue).toLocaleString('en-IN')}</td>
                <td>{r.arrivals}</td>
                <td>{r.departures}</td>
                <td>{r.noShows}</td>
              </tr>
            ))}
            {range.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 20 }}>No data</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '4px 0 0' }}>Revenue breakdown — last 30 days (by check-in date)</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 6 }}>By room type</div>
          <div className="admin-table-card">{revenueTable(revenue?.byRoomType, 'Room type')}</div>
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 6 }}>By source</div>
          <div className="admin-table-card">{revenueTable(revenue?.bySource, 'Source')}</div>
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 6 }}>By payment method</div>
          <div className="admin-table-card">{revenueTable(revenue?.byPaymentMethod, 'Method')}</div>
        </div>
      </div>
    </div>
  );
}

// ── Guest profile & stay history ─────────────────────────────────────────────
export function GuestsTab({ hotelId }) {
  const [query, setQuery] = useState('');
  const [guests, setGuests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);
  const [history, setHistory] = useState([]);

  const load = useCallback(() => {
    pmsApi.listGuests(hotelId, query || undefined).then(res => setGuests(res.data.data || [])).catch(() => {});
  }, [hotelId, query]);
  useEffect(() => { load(); }, [load]);

  const select = (guest) => {
    setSelected(guest.id);
    setForm({ ...guest });
    pmsApi.guestStayHistory(guest.id).then(res => setHistory(res.data.data || [])).catch(() => setHistory([]));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try { await pmsApi.updateGuest(selected, form); load(); }
    catch { alert('Could not save guest profile'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><div><h1 className="page-title">Guests</h1><p className="page-subtitle">Every booking with a phone number is auto-linked to a guest profile — search stay history here.</p></div></div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input placeholder="Search by name or phone…" value={query} onChange={e => setQuery(e.target.value)} style={{ ...inputStyle, flex: 1, maxWidth: 320 }} />
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>ID proof</th><th>Loyalty pts</th><th></th></tr></thead>
          <tbody>
            {guests.map(g => (
              <tr key={g.id}>
                <td className="admin-td-shop">{g.name}</td>
                <td>{g.phone}</td>
                <td>{g.email}</td>
                <td>{g.idProofType ? `${g.idProofType} ${g.idProofNumber || ''}` : '—'}</td>
                <td>{g.loyaltyPoints || 0}</td>
                <td><button className="admin-row-btn" style={btnSecondary} onClick={() => select(g)}>View</button></td>
              </tr>
            ))}
            {guests.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 20 }}>No guests yet</td></tr>}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="admin-table-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <strong>{form.name} — profile</strong>
          <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>Loyalty balance: <strong>{form.loyaltyPoints || 0} points</strong></div>
          <form onSubmit={saveProfile} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input placeholder="Name" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            <input placeholder="Phone" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
            <input placeholder="Email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
            <input placeholder="ID proof type (e.g. Passport)" value={form.idProofType || ''} onChange={e => setForm({ ...form, idProofType: e.target.value })} style={inputStyle} />
            <input placeholder="ID proof number" value={form.idProofNumber || ''} onChange={e => setForm({ ...form, idProofNumber: e.target.value })} style={inputStyle} />
            <input placeholder="Address" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
            <button type="submit" className="admin-row-btn" style={btnPrimary}>Save profile</button>
          </form>

          <strong style={{ fontSize: 13 }}>Stay history ({history.length})</strong>
          <table className="admin-table">
            <thead><tr><th>Check-in</th><th>Check-out</th><th>Status</th><th>Source</th></tr></thead>
            <tbody>
              {history.map(r => (
                <tr key={r.id}>
                  <td>{r.checkInDate}</td><td>{r.checkOutDate}</td>
                  <td><span className={STATUS_CLS[r.status] || 'status-pill'}>{r.status}</span></td>
                  <td>{r.source}</td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 20 }}>No past stays</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Surcharges, Discounts & Add-ons ─────────────────────────────────────────────
export function ExtrasTab({ hotelId }) {
  const [surcharges, setSurcharges] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [sForm, setSForm] = useState({ name: '', valueType: 'FIXED', value: '' });
  const [dForm, setDForm] = useState({ name: '', valueType: 'PERCENT', value: '' });
  const [aForm, setAForm] = useState({ name: '', description: '', price: '' });
  const [vouchers, setVouchers] = useState([]);
  const [vForm, setVForm] = useState({ code: '', initialValue: '' });
  const [loyalty, setLoyalty] = useState(null);
  const [savingLoyalty, setSavingLoyalty] = useState(false);

  const load = useCallback(() => {
    pmsApi.listSurcharges(hotelId).then(res => setSurcharges(res.data.data || [])).catch(() => {});
    pmsApi.listDiscounts(hotelId).then(res => setDiscounts(res.data.data || [])).catch(() => {});
    pmsApi.listAddOns(hotelId).then(res => setAddOns(res.data.data || [])).catch(() => {});
    pmsApi.listVouchers(hotelId).then(res => setVouchers(res.data.data || [])).catch(() => {});
    pmsApi.getLoyaltyConfig(hotelId).then(res => setLoyalty(res.data.data)).catch(() => {});
  }, [hotelId]);
  useEffect(() => { load(); }, [load]);

  const saveLoyalty = async (e) => {
    e.preventDefault();
    setSavingLoyalty(true);
    try { const res = await pmsApi.updateLoyaltyConfig(hotelId, loyalty); setLoyalty(res.data.data); }
    catch { alert('Could not save loyalty program settings'); }
    finally { setSavingLoyalty(false); }
  };

  const addSurcharge = async (e) => {
    e.preventDefault();
    if (!sForm.name || !sForm.value) return;
    try { await pmsApi.createSurcharge({ hotelId, ...sForm, value: Number(sForm.value) }); setSForm({ name: '', valueType: 'FIXED', value: '' }); load(); }
    catch { alert('Could not create surcharge'); }
  };
  const toggleSurcharge = (s) => pmsApi.updateSurcharge(s.id, { ...s, active: !s.active }).then(load).catch(() => {});

  const addDiscount = async (e) => {
    e.preventDefault();
    if (!dForm.name || !dForm.value) return;
    try { await pmsApi.createDiscount({ hotelId, ...dForm, value: Number(dForm.value) }); setDForm({ name: '', valueType: 'PERCENT', value: '' }); load(); }
    catch { alert('Could not create discount'); }
  };
  const toggleDiscount = (d) => pmsApi.updateDiscount(d.id, { ...d, active: !d.active }).then(load).catch(() => {});

  const addAddOn = async (e) => {
    e.preventDefault();
    if (!aForm.name || !aForm.price) return;
    try { await pmsApi.createAddOn({ hotelId, ...aForm, price: Number(aForm.price) }); setAForm({ name: '', description: '', price: '' }); load(); }
    catch { alert('Could not create add-on'); }
  };
  const toggleAddOn = (a) => pmsApi.updateAddOn(a.id, { ...a, active: !a.active }).then(load).catch(() => {});

  const issueVoucher = async (e) => {
    e.preventDefault();
    if (!vForm.code || !vForm.initialValue) return;
    try { await pmsApi.issueVoucher({ hotelId, code: vForm.code.toUpperCase(), initialValue: Number(vForm.initialValue) }); setVForm({ code: '', initialValue: '' }); load(); }
    catch (err) { alert(err?.response?.data?.message || 'Could not issue voucher'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><div><h1 className="page-title">Surcharges, Discounts &amp; Add-ons</h1><p className="page-subtitle">Surcharges apply automatically at check-in. Discounts and add-ons are applied per reservation from the Folio tab.</p></div></div>

      <div className="admin-table-card" style={{ padding: 16 }}>
        <strong>Surcharges</strong> <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>(city tax, resort fee — auto-applied to every stay)</span>
        <table className="admin-table" style={{ marginTop: 10 }}>
          <thead><tr><th>Name</th><th>Type</th><th>Value</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {surcharges.map(s => (
              <tr key={s.id}>
                <td className="admin-td-shop">{s.name}</td><td>{s.valueType}</td>
                <td>{s.valueType === 'FIXED' ? `₹${s.value}/night` : `${s.value}%`}</td>
                <td><span className={s.active ? 'status-pill st-active' : 'status-pill st-suspended'}>{s.active ? 'Active' : 'Paused'}</span></td>
                <td><button className="admin-row-btn" style={btnSecondary} onClick={() => toggleSurcharge(s)}>{s.active ? 'Pause' : 'Resume'}</button></td>
              </tr>
            ))}
            {surcharges.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 16 }}>No surcharges yet</td></tr>}
          </tbody>
        </table>
        <form onSubmit={addSurcharge} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <input placeholder="Name (e.g. City Tax)" value={sForm.name} onChange={e => setSForm({ ...sForm, name: e.target.value })} style={inputStyle} />
          <select value={sForm.valueType} onChange={e => setSForm({ ...sForm, valueType: e.target.value })} style={inputStyle}>
            <option value="FIXED">Fixed (per night)</option><option value="PERCENT">Percent (of room revenue)</option>
          </select>
          <input type="number" placeholder="Value" value={sForm.value} onChange={e => setSForm({ ...sForm, value: e.target.value })} style={{ ...inputStyle, width: 110 }} />
          <button type="submit" className="admin-row-btn" style={btnPrimary}><Plus size={14} /> Add surcharge</button>
        </form>
      </div>

      <div className="admin-table-card" style={{ padding: 16 }}>
        <strong>Discount packages</strong>
        <table className="admin-table" style={{ marginTop: 10 }}>
          <thead><tr><th>Name</th><th>Type</th><th>Value</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {discounts.map(d => (
              <tr key={d.id}>
                <td className="admin-td-shop">{d.name}</td><td>{d.valueType}</td>
                <td>{d.valueType === 'FIXED' ? `₹${d.value}` : `${d.value}%`}</td>
                <td><span className={d.active ? 'status-pill st-active' : 'status-pill st-suspended'}>{d.active ? 'Active' : 'Paused'}</span></td>
                <td><button className="admin-row-btn" style={btnSecondary} onClick={() => toggleDiscount(d)}>{d.active ? 'Pause' : 'Resume'}</button></td>
              </tr>
            ))}
            {discounts.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 16 }}>No discount packages yet</td></tr>}
          </tbody>
        </table>
        <form onSubmit={addDiscount} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <input placeholder="Name (e.g. Early Bird 10%)" value={dForm.name} onChange={e => setDForm({ ...dForm, name: e.target.value })} style={inputStyle} />
          <select value={dForm.valueType} onChange={e => setDForm({ ...dForm, valueType: e.target.value })} style={inputStyle}>
            <option value="PERCENT">Percent (of room revenue)</option><option value="FIXED">Fixed amount</option>
          </select>
          <input type="number" placeholder="Value" value={dForm.value} onChange={e => setDForm({ ...dForm, value: e.target.value })} style={{ ...inputStyle, width: 110 }} />
          <button type="submit" className="admin-row-btn" style={btnPrimary}><Plus size={14} /> Add discount</button>
        </form>
      </div>

      <div className="admin-table-card" style={{ padding: 16 }}>
        <strong>Add-on catalog</strong>
        <table className="admin-table" style={{ marginTop: 10 }}>
          <thead><tr><th>Name</th><th>Description</th><th>Price</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {addOns.map(a => (
              <tr key={a.id}>
                <td className="admin-td-shop">{a.name}</td><td>{a.description}</td><td>₹{Number(a.price).toLocaleString('en-IN')}</td>
                <td><span className={a.active ? 'status-pill st-active' : 'status-pill st-suspended'}>{a.active ? 'Active' : 'Paused'}</span></td>
                <td><button className="admin-row-btn" style={btnSecondary} onClick={() => toggleAddOn(a)}>{a.active ? 'Pause' : 'Resume'}</button></td>
              </tr>
            ))}
            {addOns.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 16 }}>No add-ons yet</td></tr>}
          </tbody>
        </table>
        <form onSubmit={addAddOn} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <input placeholder="Name (e.g. Airport Pickup)" value={aForm.name} onChange={e => setAForm({ ...aForm, name: e.target.value })} style={inputStyle} />
          <input placeholder="Description" value={aForm.description} onChange={e => setAForm({ ...aForm, description: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
          <input type="number" placeholder="Price" value={aForm.price} onChange={e => setAForm({ ...aForm, price: e.target.value })} style={{ ...inputStyle, width: 110 }} />
          <button type="submit" className="admin-row-btn" style={btnPrimary}><Plus size={14} /> Add item</button>
        </form>
      </div>

      <div className="admin-table-card" style={{ padding: 16 }}>
        <strong>Vouchers</strong> <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>(prepaid gift cards — redeemable as a folio payment method)</span>
        <table className="admin-table" style={{ marginTop: 10 }}>
          <thead><tr><th>Code</th><th>Initial value</th><th>Balance</th><th>Status</th></tr></thead>
          <tbody>
            {vouchers.map(v => (
              <tr key={v.id}>
                <td className="admin-td-shop">{v.code}</td>
                <td>₹{Number(v.initialValue).toLocaleString('en-IN')}</td>
                <td>₹{Number(v.balance).toLocaleString('en-IN')}</td>
                <td><span className={v.active ? 'status-pill st-active' : 'status-pill st-suspended'}>{v.active ? 'Active' : 'Inactive'}</span></td>
              </tr>
            ))}
            {vouchers.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 16 }}>No vouchers issued yet</td></tr>}
          </tbody>
        </table>
        <form onSubmit={issueVoucher} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <input placeholder="Code (e.g. WELCOME500)" value={vForm.code} onChange={e => setVForm({ ...vForm, code: e.target.value })} style={inputStyle} />
          <input type="number" placeholder="Value" value={vForm.initialValue} onChange={e => setVForm({ ...vForm, initialValue: e.target.value })} style={{ ...inputStyle, width: 110 }} />
          <button type="submit" className="admin-row-btn" style={btnPrimary}><Plus size={14} /> Issue voucher</button>
        </form>
      </div>

      {loyalty && (
        <div className="admin-table-card" style={{ padding: 16 }}>
          <strong>Loyalty program</strong> <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>(guests earn points on checkout, redeemable as a folio payment method)</span>
          <form onSubmit={saveLoyalty} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: 'var(--gray-600)' }}>Earn rate</label>
            <input type="number" step="0.1" value={loyalty.earnRatePercent} onChange={e => setLoyalty({ ...loyalty, earnRatePercent: e.target.value })} style={{ ...inputStyle, width: 90 }} />
            <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>% of room revenue</span>
            <label style={{ fontSize: 13, color: 'var(--gray-600)', marginLeft: 12 }}>1 point =</label>
            <span style={{ fontSize: 13 }}>₹</span>
            <input type="number" step="0.1" value={loyalty.redemptionValue} onChange={e => setLoyalty({ ...loyalty, redemptionValue: e.target.value })} style={{ ...inputStyle, width: 80 }} />
            <label style={{ fontSize: 13, color: 'var(--gray-600)', marginLeft: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={!!loyalty.active} onChange={e => setLoyalty({ ...loyalty, active: e.target.checked })} /> Active
            </label>
            <button type="submit" className="admin-row-btn" style={btnPrimary} disabled={savingLoyalty}>{savingLoyalty ? 'Saving…' : 'Save'}</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Waitlist — guests waiting for a room type/dates that's currently full ──────
export function WaitlistTab({ hotelId, roomTypes }) {
  const [entries, setEntries] = useState([]);
  const emptyForm = { roomTypeId: '', guestName: '', guestPhone: '', checkInDate: today(), checkOutDate: tomorrow() };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const roomTypeName = (id) => roomTypes.find(rt => rt.id === id)?.name || id;

  const load = useCallback(() => {
    if (!hotelId) return;
    pmsApi.listWaitlist(hotelId).then(res => setEntries(res.data.data || [])).catch(() => {});
  }, [hotelId]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.roomTypeId || !form.guestName.trim()) return;
    setSaving(true);
    try {
      await pmsApi.joinWaitlist(hotelId, form);
      setForm(emptyForm);
      load();
    } catch (err) { alert(err?.response?.data?.message || 'Could not add to the waitlist'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><div><h1 className="page-title">Waitlist</h1><p className="page-subtitle">Guests waiting for a room type/dates that's currently full — notified automatically when a cancellation or no-show frees one up.</p></div></div>

      <form onSubmit={submit} className="admin-table-card" style={{ padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <select value={form.roomTypeId} onChange={e => setForm({ ...form, roomTypeId: e.target.value })} style={inputStyle}>
          <option value="">Room type…</option>
          {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
        </select>
        <input placeholder="Guest name" value={form.guestName} onChange={e => setForm({ ...form, guestName: e.target.value })} style={inputStyle} />
        <input placeholder="Phone" value={form.guestPhone} onChange={e => setForm({ ...form, guestPhone: e.target.value })} style={inputStyle} />
        <input type="date" value={form.checkInDate} onChange={e => setForm({ ...form, checkInDate: e.target.value })} style={inputStyle} />
        <input type="date" value={form.checkOutDate} onChange={e => setForm({ ...form, checkOutDate: e.target.value })} style={inputStyle} />
        <button type="submit" className="admin-row-btn" style={btnPrimary} disabled={saving}><Plus size={14} /> Add to waitlist</button>
      </form>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Guest</th><th>Room type</th><th>Dates</th><th>Status</th><th>Joined</th></tr></thead>
          <tbody>
            {entries.map(w => (
              <tr key={w.id}>
                <td className="admin-td-shop">{w.guestName}{w.guestPhone ? ` · ${w.guestPhone}` : ''}</td>
                <td>{roomTypeName(w.roomTypeId)}</td>
                <td>{w.checkInDate} → {w.checkOutDate}</td>
                <td>
                  <span className={w.status === 'NOTIFIED' ? 'status-pill st-active' : 'plan-pill'}>
                    {w.status === 'NOTIFIED' ? <><Bell size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Notified</> : <><Hourglass size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Waiting</>}
                  </span>
                  {w.notifiedAt && <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>{new Date(w.notifiedAt).toLocaleString()}</div>}
                </td>
                <td style={{ fontSize: 12 }}>{new Date(w.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 20 }}>No one is on the waitlist right now</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Guest-stay reviews — pms-service invites guests to review via WhatsApp the
// day after checkout (ReservationLifecycleScheduler.sendReviewInvites); this is
// the read-only owner-facing view of what comes back. Public endpoints, called
// here from the authenticated dashboard just to scope by the current hotel.
export function ReviewsTab({ hotelId }) {
  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hotelId) return;
    setLoading(true);
    Promise.all([
      reviewApi.getHotelSummary(hotelId),
      reviewApi.getHotelReviews(hotelId, { size: 50 }),
    ]).then(([s, r]) => {
      setSummary(s.data.data);
      setReviews(r.data.data?.content || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [hotelId]);

  const stars = (n) => Array.from({ length: 5 }, (_, i) => (
    <Star key={i} size={14} fill={i < n ? '#F59E0B' : 'none'} color={i < n ? '#F59E0B' : '#D1D5DB'} />
  ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><div><h1 className="page-title">Reviews</h1><p className="page-subtitle">What guests said after their stay — collected via a WhatsApp review-invite sent the day after checkout.</p></div></div>

      {summary && (
        <div className="admin-table-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{Number(summary.averageRating || 0).toFixed(1)}</div>
          <div>
            <div style={{ display: 'flex', gap: 2 }}>{stars(Math.round(summary.averageRating || 0))}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{summary.ratingCount} review{summary.ratingCount === 1 ? '' : 's'}</div>
          </div>
        </div>
      )}

      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Guest</th><th>Rating</th><th>Comment</th><th>Date</th></tr></thead>
          <tbody>
            {reviews.map(r => (
              <tr key={r.id}>
                <td className="admin-td-shop">{r.customerName || 'Guest'}</td>
                <td><div style={{ display: 'flex', gap: 1 }}>{stars(r.rating)}</div></td>
                <td style={{ maxWidth: 400 }}>{r.comment || <span style={{ color: 'var(--gray-500)' }}>No comment</span>}</td>
                <td style={{ fontSize: 12 }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</td>
              </tr>
            ))}
            {!loading && reviews.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 20 }}>No reviews yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Rate/inventory change log — audit trail written by RateChangeLogService
// whenever a day-price field, stop-sell flag or inventory allotment actually
// changes value. Filterable by room type, server-paginated (Spring Page).
const RATE_LOG_FIELD_LABELS = {
  price: 'Price', minStay: 'Min stay', maxStay: 'Max stay',
  closedToArrival: 'Closed to arrival', closedToDeparture: 'Closed to departure',
  stopSell: 'Stop sell', allotment: 'Allotment',
};
// Same 'inventory / prices / restrictions' split as the Inventory & Rates Calendar
// and Booking Calendar's view filters — filtered server-side by RateChangeLogController
// (its own field->category mapping mirrors this list of tabs).
const RATE_LOG_TABS = [
  { key: 'all',          label: 'All' },
  { key: 'inventory',    label: 'Inventory only' },
  { key: 'prices',       label: 'Prices only' },
  { key: 'restrictions', label: 'Restrictions only' },
];

export function RateChangeLogTab({ hotelId, roomTypes }) {
  const [roomTypeId, setRoomTypeId] = useState('');
  const [category, setCategory] = useState('all');
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const roomTypeName = (id) => roomTypes.find(rt => rt.id === id)?.name || id;
  const formatValue = (v) => (v === null || v === undefined || v === '') ? '—' : String(v);

  const load = useCallback(() => {
    if (!hotelId) return;
    setLoading(true);
    const params = { page, size: 20 };
    if (roomTypeId) params.roomTypeId = roomTypeId;
    if (category !== 'all') params.category = category;
    pmsApi.listRateChangeLogs(hotelId, params).then(res => {
      const data = res.data.data || {};
      setLogs(data.content || []);
      setTotalPages(data.totalPages || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [hotelId, roomTypeId, category, page]);
  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><div><h1 className="page-title">Rate & Inventory Change Log</h1><p className="page-subtitle">Every edit to a date's price, stay restrictions, stop-sell or allotment — who changed what and when.</p></div></div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {RATE_LOG_TABS.map(t => (
          <button key={t.key} className="admin-row-btn" style={category === t.key ? btnPrimary : btnSecondary} onClick={() => { setPage(0); setCategory(t.key); }}>{t.label}</button>
        ))}
      </div>

      <div className="admin-table-card" style={{ padding: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <select value={roomTypeId} onChange={e => { setPage(0); setRoomTypeId(e.target.value); }} style={inputStyle}>
          <option value="">All room types</option>
          {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
        </select>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Date</th><th>Room type</th><th>Field</th><th>Old value</th><th>New value</th><th>Changed by</th><th>Changed at</th></tr></thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={l.id || i}>
                <td>{l.date}</td>
                <td>{roomTypeName(l.roomTypeId)}</td>
                <td>{RATE_LOG_FIELD_LABELS[l.field] || l.field}</td>
                <td>{formatValue(l.oldValue)}</td>
                <td>{formatValue(l.newValue)}</td>
                <td style={{ fontSize: 12 }}>{l.changedBy}</td>
                <td style={{ fontSize: 12 }}>{l.changedAt ? new Date(l.changedAt).toLocaleString() : ''}</td>
              </tr>
            ))}
            {!loading && logs.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 20 }}>No rate or inventory changes recorded yet</td></tr>}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 12, borderTop: '1px solid var(--gray-100)' }}>
            <button className="admin-row-btn" style={btnSecondary} disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</button>
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>Page {page + 1} of {totalPages}</span>
            <button className="admin-row-btn" style={btnSecondary} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Booking calendar (tape chart) — physical rooms as rows, each stay a
// colored bar spanning check-in..check-out, grouped by room type. v1 scope:
// read-only (no drag-and-drop, no room-type roll-up availability counts —
// see CRS's reservationCalendar for that fuller design), prev/next week
// navigation, and a click-to-view detail popup for each bar.
const CALENDAR_STATUS_CFG = {
  BOOKED:      { label: 'Booked',      color: 'var(--blue)' },
  CHECKED_IN:  { label: 'Checked in',  color: 'var(--green-dark)' },
  CHECKED_OUT: { label: 'Checked out', color: 'var(--gray-400)' },
  NO_SHOW:     { label: 'No-show',     color: 'var(--red)' },
};
const CAL_DAY_WIDTH = 64;
const CAL_ROW_HEIGHT = 36;
const CAL_NUM_DAYS = 7;

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}
// A native <input type="date"> reports value="" while a keystroke leaves it mid-entry
// (e.g. only the day typed so far) — setting that straight into `from` state makes
// every subsequent addDays(from, i) collapse to the same "NaN-NaN-NaN" string for
// every i, which then hands React a list of DUPLICATE keys and corrupts that render
// tree's reconciliation even once the input finishes settling on a valid date. Only
// accept a value once it actually parses.
function isValidDateStr(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00:00').getTime()); }
function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
}

// View filter shared with the Inventory & Rates Calendar — same five modes, same
// meaning, so a user who's learned one page already knows the other: 'all' shows
// everything, and each specific mode isolates one layer. Here "Bookings count
// only" isolates the tape-chart's actual room bars (the literal booking records)
// rather than the aggregate number, since that IS this page's booking view.
const BC_VIEWS = [
  { key: 'all',          label: 'All' },
  { key: 'inventory',    label: 'Inventory only' },
  { key: 'prices',       label: 'Prices only' },
  { key: 'restrictions', label: 'Restrictions only' },
  { key: 'bookings',     label: 'Bookings count only' },
];

export function BookingCalendarTab({ hotelId }) {
  const [windowDays, setWindowDays] = useState(7);
  const [from, setFrom] = useState(today());
  const [rooms, setRooms] = useState([]);
  const [stays, setStays] = useState([]);
  const [roomTypesRC, setRoomTypesRC] = useState([]); // rates-calendar data: inventory + price/restrictions
  const [selected, setSelected] = useState(null);
  const [collapsed, setCollapsed] = useState({}); // roomTypeId -> true when collapsed
  const [view, setView] = useState('all');
  const [editRate, setEditRate] = useState(null);
  const [editInv, setEditInv] = useState(null);
  const [saving, setSaving] = useState(false);

  const dayWidth = rcDayWidth(windowDays);
  const to = addDays(from, windowDays);
  const days = Array.from({ length: windowDays }, (_, i) => addDays(from, i));
  const minJump = addDays(today(), -365 * 3);
  const maxJump = addDays(today(), 365 * 3);

  const load = useCallback(() => {
    if (!hotelId) return;
    pmsApi.getBookingCalendar(hotelId, from, to).then(res => {
      const data = res.data.data || {};
      setRooms(data.rooms || []);
      setStays(data.stays || []);
    }).catch(() => {});
    pmsApi.getRatesCalendar(hotelId, from, to).then(res => setRoomTypesRC(res.data.data?.roomTypes || [])).catch(() => {});
  }, [hotelId, from, to]);
  useEffect(() => { load(); }, [load]);

  const staysByRoom = {};
  stays.forEach(s => { (staysByRoom[s.roomId] ||= []).push(s); });

  const rcByType = {};
  roomTypesRC.forEach(rt => { rcByType[rt.roomTypeId] = rt; });

  const roomTypeGroups = [];
  rooms.forEach(r => {
    let group = roomTypeGroups.find(x => x.roomTypeId === r.roomTypeId);
    if (!group) { group = { roomTypeId: r.roomTypeId, roomType: r.roomType, rooms: [] }; roomTypeGroups.push(group); }
    group.rooms.push(r);
  });
  const toggleGroup = (roomTypeId) => setCollapsed(p => ({ ...p, [roomTypeId]: !p[roomTypeId] }));

  const saveInventory = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await pmsApi.setRoomTypeInventory(editInv.roomTypeId, { date: editInv.date, allotment: Number(editInv.allotment) });
      setEditInv(null);
      load();
    } catch { alert('Could not save allotment'); }
    finally { setSaving(false); }
  };

  const saveRate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await pmsApi.setDayPrice(editRate.ratePlanId, {
        date: editRate.date,
        price: editRate.price === '' ? null : Number(editRate.price),
        minStay: editRate.minStay === '' ? null : Number(editRate.minStay),
        maxStay: editRate.maxStay === '' ? null : Number(editRate.maxStay),
        closedToArrival: !!editRate.closedToArrival,
        closedToDeparture: !!editRate.closedToDeparture,
        stopSell: !!editRate.stopSell,
      });
      setEditRate(null);
      load();
    } catch { alert('Could not save rate'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><div><h1 className="page-title">Booking Calendar</h1><p className="page-subtitle">Inventory, prices, restrictions and the room-by-room tape chart — one view, filterable.</p></div></div>

      <div className="admin-table-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {RC_WINDOWS.map(w => (
            <button key={w.days} className="admin-row-btn" style={windowDays === w.days ? btnPrimary : btnSecondary} onClick={() => setWindowDays(w.days)}>{w.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="admin-row-btn" style={btnSecondary} onClick={() => setFrom(f => addDays(f, -windowDays))}>← Back</button>
          <input type="date" value={from} min={minJump} max={maxJump} onChange={e => isValidDateStr(e.target.value) && setFrom(e.target.value)} style={inputStyle} />
          <button className="admin-row-btn" style={btnSecondary} onClick={() => setFrom(today())}>Today</button>
          <button className="admin-row-btn" style={btnSecondary} onClick={() => setFrom(f => addDays(f, windowDays))}>Next →</button>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {Object.entries(CALENDAR_STATUS_CFG).map(([k, cfg]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gray-500)' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: cfg.color, display: 'inline-block' }} /> {cfg.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {BC_VIEWS.map(v => (
          <button key={v.key} className="admin-row-btn" style={view === v.key ? btnPrimary : btnSecondary} onClick={() => setView(v.key)}>{v.label}</button>
        ))}
      </div>

      <div className="admin-table-card" style={{ overflowX: 'auto', padding: 0 }}>
        <div style={{ minWidth: 200 + windowDays * dayWidth }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ width: 200, flexShrink: 0, padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase' }}>Room type / room</div>
            {days.map(d => (
              <div key={d} style={{ width: dayWidth, flexShrink: 0, textAlign: 'center', padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', borderLeft: '1px solid var(--gray-100)' }}>
                {new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: windowDays > 7 ? 'short' : undefined })}
              </div>
            ))}
          </div>

          {roomTypeGroups.map(g => {
            const rc = rcByType[g.roomTypeId];
            const invByDate = {};
            (rc?.byDate || []).forEach(d => { invByDate[d.date] = d; });
            const isCollapsed = !!collapsed[g.roomTypeId];
            return (
            <div key={g.roomTypeId || g.roomType}>
              <div onClick={() => toggleGroup(g.roomTypeId)} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)', cursor: 'pointer' }}>
                <div style={{ width: 200, flexShrink: 0, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  {g.roomType}
                  <span style={{ fontWeight: 500, color: 'var(--gray-400)' }}>({g.rooms.length}{rc?.maxOccupancy ? ` · up to ${rc.maxOccupancy} guests` : ''})</span>
                </div>
                <div style={{ width: windowDays * dayWidth }} />
              </div>

              {!isCollapsed && <>
                {(view === 'all' || view === 'inventory') && (
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={{ width: 200, flexShrink: 0, padding: '4px 12px', fontSize: 11, color: 'var(--gray-500)', display: 'flex', alignItems: 'center' }}>Allotted · Booked · Available</div>
                    {days.map(d => {
                      const inv = invByDate[d];
                      return (
                        <div key={d} onClick={() => inv && setEditInv({ roomTypeId: g.roomTypeId, roomTypeName: g.roomType, date: d, allotment: String(inv.allotted) })}
                          style={{ width: dayWidth, flexShrink: 0, height: RC_ROW_HEIGHT, borderLeft: '1px solid var(--gray-100)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: inv ? 'pointer' : 'default' }}>
                          {inv ? <>
                            <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{inv.booked}/{inv.allotted}</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: inv.available > 0 ? '#16a34a' : '#dc2626' }}>{inv.available}</div>
                          </> : <div style={{ fontSize: 12, color: 'var(--gray-300)' }}>—</div>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {(view === 'all' || view === 'prices' || view === 'restrictions') && (rc?.ratePlans || []).map(rp => {
                  const rateByDate = {};
                  (rp.byDate || []).forEach(d => { rateByDate[d.date] = d; });
                  return (
                    <div key={rp.ratePlanId} style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
                      <div style={{ width: 200, flexShrink: 0, padding: '4px 12px', fontSize: 12, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {rp.ratePlanName}
                          {rp.occupancy && <span title={`Priced for ${rp.occupancy} guest(s)`} style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue)', background: 'var(--blue-light, #EAF2FF)', borderRadius: 4, padding: '1px 5px' }}>👤 {rp.occupancy}</span>}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>{rp.mealPlan}</span>
                      </div>
                      {days.map(d => {
                        const day = rateByDate[d];
                        const badges = day ? [
                          day.minStay ? `min ${day.minStay}n` : null,
                          day.maxStay ? `max ${day.maxStay}n` : null,
                          day.closedToArrival ? 'CTA' : null,
                          day.closedToDeparture ? 'CTD' : null,
                          day.stopSell ? 'STOP' : null,
                        ].filter(Boolean) : [];
                        const showPrice = view === 'all' || view === 'prices';
                        const showBadges = view === 'all' || view === 'restrictions';
                        return (
                          <div key={d} onClick={() => day && setEditRate({ ratePlanId: rp.ratePlanId, ratePlanName: rp.ratePlanName, date: d, price: String(day.price ?? ''), minStay: day.minStay ?? '', maxStay: day.maxStay ?? '', closedToArrival: day.closedToArrival, closedToDeparture: day.closedToDeparture, stopSell: day.stopSell })}
                            style={{ width: dayWidth, flexShrink: 0, height: RC_ROW_HEIGHT, borderLeft: '1px solid var(--gray-100)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: day ? 'pointer' : 'default', padding: '2px 0' }}>
                            {day ? <>
                              {showPrice && (
                                <div style={{ fontSize: 12, fontWeight: 700, color: day.stopSell ? '#dc2626' : 'var(--gray-900)' }}>
                                  ₹{Number(day.price).toLocaleString('en-IN')}{day.priceOverridden && <span title="Overridden for this date" style={{ color: 'var(--blue)' }}>*</span>}
                                </div>
                              )}
                              {showBadges && (badges.length > 0
                                ? <div style={{ fontSize: view === 'restrictions' ? 11 : 8, color: '#dc2626', textAlign: 'center', lineHeight: view === 'restrictions' ? '13px' : '9px', fontWeight: view === 'restrictions' ? 700 : 400 }}>{badges.join(' · ')}</div>
                                : view === 'restrictions' && <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>OK</div>)}
                            </> : <div style={{ fontSize: 12, color: 'var(--gray-300)' }}>—</div>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {(view === 'all' || view === 'bookings') && g.rooms.map(r => (
                  <div key={r.roomId} style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={{ width: 200, flexShrink: 0, padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: 13 }}>{r.roomNumber}</div>
                    <div style={{ position: 'relative', width: windowDays * dayWidth, height: CAL_ROW_HEIGHT }}>
                      {days.map((d, i) => <div key={d} style={{ position: 'absolute', left: i * dayWidth, top: 0, bottom: 0, width: dayWidth, borderLeft: '1px solid var(--gray-100)' }} />)}
                      {(staysByRoom[r.roomId] || []).map(s => {
                        const startIdx = daysBetween(from, s.checkInDate);
                        const endIdx = daysBetween(from, s.checkOutDate);
                        const clippedStart = Math.max(0, startIdx);
                        const clippedEnd = Math.min(windowDays, endIdx);
                        if (clippedEnd <= clippedStart) return null;
                        const cfg = CALENDAR_STATUS_CFG[s.status] || { color: 'var(--gray-400)' };
                        return (
                          <div key={s.reservationId} onClick={() => setSelected(s)}
                            title={`${s.guestName} · ${s.checkInDate} → ${s.checkOutDate}`}
                            style={{
                              position: 'absolute', left: clippedStart * dayWidth + 2, top: 4,
                              width: (clippedEnd - clippedStart) * dayWidth - 4, height: CAL_ROW_HEIGHT - 8,
                              background: cfg.color, color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 600,
                              display: 'flex', alignItems: 'center', padding: '0 8px', overflow: 'hidden', whiteSpace: 'nowrap',
                              cursor: 'pointer',
                            }}>
                            {s.guestName}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>}
            </div>
            );
          })}
          {rooms.length === 0 && <div style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 30 }}>No rooms configured yet</div>}
        </div>
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setSelected(null)}>
          <div className="admin-table-card" style={{ padding: 20, width: 340, maxWidth: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong>Reservation</strong>
              <button className="admin-row-btn" onClick={() => setSelected(null)}><X size={14} /></button>
            </div>
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div><strong>Guest:</strong> {selected.guestName}</div>
              <div><strong>Dates:</strong> {selected.checkInDate} → {selected.checkOutDate}</div>
              <div><strong>Status:</strong> <span className={STATUS_CLS[selected.status] || 'status-pill'}>{selected.status}</span></div>
            </div>
          </div>
        </div>
      )}

      {editInv && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditInv(null)}>
          <form onSubmit={saveInventory} className="admin-table-card" style={{ padding: 20, width: 300, maxWidth: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong>{editInv.roomTypeName} · {editInv.date}</strong>
              <button type="button" className="admin-row-btn" onClick={() => setEditInv(null)}><X size={14} /></button>
            </div>
            <label style={{ fontSize: 11, color: 'var(--gray-500)' }}>Allotment (sellable-room cap for this date)</label>
            <input type="number" min="0" value={editInv.allotment} onChange={e => setEditInv({ ...editInv, allotment: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} autoFocus />
            <button type="submit" className="admin-row-btn" style={{ ...btnPrimary, width: '100%', marginTop: 14, justifyContent: 'center' }} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </form>
        </div>
      )}

      {editRate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditRate(null)}>
          <form onSubmit={saveRate} className="admin-table-card" style={{ padding: 20, width: 340, maxWidth: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong>{editRate.ratePlanName} · {editRate.date}</strong>
              <button type="button" className="admin-row-btn" onClick={() => setEditRate(null)}><X size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={{ fontSize: 11, color: 'var(--gray-500)' }}>Price override</label><br />
                <input type="number" min="0" value={editRate.price} onChange={e => setEditRate({ ...editRate, price: e.target.value })} style={{ ...inputStyle, width: '100%' }} placeholder="Leave blank to clear override" /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: 'var(--gray-500)' }}>Min stay</label><br />
                  <input type="number" min="0" value={editRate.minStay} onChange={e => setEditRate({ ...editRate, minStay: e.target.value })} style={{ ...inputStyle, width: '100%' }} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: 'var(--gray-500)' }}>Max stay</label><br />
                  <input type="number" min="0" value={editRate.maxStay} onChange={e => setEditRate({ ...editRate, maxStay: e.target.value })} style={{ ...inputStyle, width: '100%' }} /></div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><input type="checkbox" checked={!!editRate.closedToArrival} onChange={e => setEditRate({ ...editRate, closedToArrival: e.target.checked })} /> Closed to arrival</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><input type="checkbox" checked={!!editRate.closedToDeparture} onChange={e => setEditRate({ ...editRate, closedToDeparture: e.target.checked })} /> Closed to departure</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><input type="checkbox" checked={!!editRate.stopSell} onChange={e => setEditRate({ ...editRate, stopSell: e.target.checked })} /> Stop sell</label>
            </div>
            <button type="submit" className="admin-row-btn" style={{ ...btnPrimary, width: '100%', marginTop: 14, justifyContent: 'center' }} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Combined inventory + rates operational calendar ─────────────────────────────
// One grid: allotted/booked/available per room type, price + restrictions per rate
// plan, for a filterable date window (1 week / 15 days / 1 month) with prev/next
// paging and a direct date jump spanning ±3 years — replaces switching between the
// Room Types & Rates date manager, the Rate & Inventory Log, and the booking
// calendar's availability row to answer "what can I sell, at what price, on this
// date" for every room type at once. Reference: legacy CRS's price calendar
// (crs_ui/.../prices/prices.tpl.html) combined with its reservation-calendar
// inventory row — reimplemented against AviQR's room-type→rate-plan pricing model
// rather than CRS's separate per-occupancy rate rows.
const RC_WINDOWS = [{ label: '1 week', days: 7 }, { label: '15 days', days: 15 }, { label: '1 month', days: 30 }];
const RC_ROW_HEIGHT = 46;
const rcDayWidth = (days) => (days <= 7 ? 92 : days <= 15 ? 62 : 42);

const RC_VIEWS = [
  { key: 'all',          label: 'All' },
  { key: 'inventory',    label: 'Inventory only' },
  { key: 'prices',       label: 'Prices only' },
  { key: 'restrictions', label: 'Restrictions only' },
  { key: 'bookings',     label: 'Bookings count only' },
];

export function RatesCalendarTab({ hotelId }) {
  const [windowDays, setWindowDays] = useState(7);
  const [from, setFrom] = useState(today());
  const [roomTypes, setRoomTypes] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [view, setView] = useState('all');
  const [editRate, setEditRate] = useState(null); // { ratePlanId, ratePlanName, date, day }
  const [editInv, setEditInv] = useState(null);   // { roomTypeId, roomTypeName, date, day }
  const [saving, setSaving] = useState(false);

  const dayWidth = rcDayWidth(windowDays);
  const to = addDays(from, windowDays);
  const days = Array.from({ length: windowDays }, (_, i) => addDays(from, i));
  const minJump = addDays(today(), -365 * 3);
  const maxJump = addDays(today(), 365 * 3);

  const load = useCallback(() => {
    if (!hotelId) return;
    pmsApi.getRatesCalendar(hotelId, from, to).then(res => setRoomTypes(res.data.data?.roomTypes || [])).catch(() => {});
  }, [hotelId, from, to]);
  useEffect(() => { load(); }, [load]);

  const toggleGroup = (id) => setCollapsed(p => ({ ...p, [id]: !p[id] }));

  const saveInventory = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await pmsApi.setRoomTypeInventory(editInv.roomTypeId, { date: editInv.date, allotment: Number(editInv.allotment) });
      setEditInv(null);
      load();
    } catch { alert('Could not save allotment'); }
    finally { setSaving(false); }
  };

  const saveRate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await pmsApi.setDayPrice(editRate.ratePlanId, {
        date: editRate.date,
        price: editRate.price === '' ? null : Number(editRate.price),
        minStay: editRate.minStay === '' ? null : Number(editRate.minStay),
        maxStay: editRate.maxStay === '' ? null : Number(editRate.maxStay),
        closedToArrival: !!editRate.closedToArrival,
        closedToDeparture: !!editRate.closedToDeparture,
        stopSell: !!editRate.stopSell,
      });
      setEditRate(null);
      load();
    } catch { alert('Could not save rate'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><div><h1 className="page-title">Inventory &amp; Rates Calendar</h1><p className="page-subtitle">Allotted, booked, available, price and restrictions — every room type and rate plan, one grid.</p></div></div>

      <div className="admin-table-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {RC_WINDOWS.map(w => (
            <button key={w.days} className="admin-row-btn" style={windowDays === w.days ? btnPrimary : btnSecondary} onClick={() => setWindowDays(w.days)}>{w.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="admin-row-btn" style={btnSecondary} onClick={() => setFrom(f => addDays(f, -windowDays))}>← Back</button>
          <input type="date" value={from} min={minJump} max={maxJump} onChange={e => isValidDateStr(e.target.value) && setFrom(e.target.value)} style={inputStyle} />
          <button className="admin-row-btn" style={btnSecondary} onClick={() => setFrom(today())}>Today</button>
          <button className="admin-row-btn" style={btnSecondary} onClick={() => setFrom(f => addDays(f, windowDays))}>Next →</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--gray-400)', marginLeft: 'auto' }}>Jump to any date up to 3 years back or ahead</div>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {RC_VIEWS.map(v => (
          <button key={v.key} className="admin-row-btn" style={view === v.key ? btnPrimary : btnSecondary} onClick={() => setView(v.key)}>{v.label}</button>
        ))}
      </div>

      <div className="admin-table-card" style={{ overflowX: 'auto', padding: 0 }}>
        <div style={{ minWidth: 200 + windowDays * dayWidth }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ width: 200, flexShrink: 0, padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase' }}>Room type / rate plan</div>
            {days.map(d => (
              <div key={d} style={{ width: dayWidth, flexShrink: 0, textAlign: 'center', padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', borderLeft: '1px solid var(--gray-100)' }}>
                {new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: windowDays > 7 ? 'short' : undefined })}
              </div>
            ))}
          </div>

          {roomTypes.map(rt => {
            const invByDate = {};
            (rt.byDate || []).forEach(d => { invByDate[d.date] = d; });
            const isCollapsed = !!collapsed[rt.roomTypeId];
            return (
              <div key={rt.roomTypeId}>
                <div onClick={() => toggleGroup(rt.roomTypeId)} style={{ display: 'flex', alignItems: 'center', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}>
                  <div style={{ width: 200, flexShrink: 0, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    {rt.roomTypeName}
                    <span style={{ fontWeight: 500, color: 'var(--gray-400)' }}>· {rt.physicalRoomCount} rooms{rt.maxOccupancy ? ` · up to ${rt.maxOccupancy} guests` : ''}</span>
                  </div>
                  <div style={{ width: windowDays * dayWidth }} />
                </div>

                {!isCollapsed && <>
                  {(view === 'all' || view === 'inventory' || view === 'bookings') && (
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
                      <div style={{ width: 200, flexShrink: 0, padding: '4px 12px', fontSize: 11, color: 'var(--gray-500)', display: 'flex', alignItems: 'center' }}>
                        {view === 'bookings' ? 'Booked' : 'Allotted · Booked · Available'}
                      </div>
                      {days.map(d => {
                        const inv = invByDate[d];
                        return (
                          <div key={d} onClick={() => inv && view !== 'bookings' && setEditInv({ roomTypeId: rt.roomTypeId, roomTypeName: rt.roomTypeName, date: d, allotment: String(inv.allotted) })}
                            style={{ width: dayWidth, flexShrink: 0, height: RC_ROW_HEIGHT, borderLeft: '1px solid var(--gray-100)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: inv && view !== 'bookings' ? 'pointer' : 'default' }}>
                            {inv ? (
                              view === 'bookings'
                                ? <div style={{ fontSize: 16, fontWeight: 800, color: inv.booked > 0 ? 'var(--blue)' : 'var(--gray-400)' }}>{inv.booked}</div>
                                : <>
                                    <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{inv.booked}/{inv.allotted}</div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: inv.available > 0 ? '#16a34a' : '#dc2626' }}>{inv.available}</div>
                                  </>
                            ) : <div style={{ fontSize: 12, color: 'var(--gray-300)' }}>—</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(view === 'all' || view === 'prices' || view === 'restrictions') && (rt.ratePlans || []).map(rp => {
                    const rateByDate = {};
                    (rp.byDate || []).forEach(d => { rateByDate[d.date] = d; });
                    return (
                      <div key={rp.ratePlanId} style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
                        <div style={{ width: 200, flexShrink: 0, padding: '4px 12px', fontSize: 12, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {rp.ratePlanName}
                            {rp.occupancy && <span title={`Priced for ${rp.occupancy} guest(s)`} style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue)', background: 'var(--blue-light, #EAF2FF)', borderRadius: 4, padding: '1px 5px' }}>👤 {rp.occupancy}</span>}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>{rp.mealPlan}</span>
                        </div>
                        {days.map(d => {
                          const day = rateByDate[d];
                          const badges = day ? [
                            day.minStay ? `min ${day.minStay}n` : null,
                            day.maxStay ? `max ${day.maxStay}n` : null,
                            day.closedToArrival ? 'CTA' : null,
                            day.closedToDeparture ? 'CTD' : null,
                            day.stopSell ? 'STOP' : null,
                          ].filter(Boolean) : [];
                          const showPrice = view === 'all' || view === 'prices';
                          const showBadges = view === 'all' || view === 'restrictions';
                          return (
                            <div key={d} onClick={() => day && setEditRate({ ratePlanId: rp.ratePlanId, ratePlanName: rp.ratePlanName, date: d, price: String(day.price ?? ''), minStay: day.minStay ?? '', maxStay: day.maxStay ?? '', closedToArrival: day.closedToArrival, closedToDeparture: day.closedToDeparture, stopSell: day.stopSell })}
                              style={{ width: dayWidth, flexShrink: 0, height: RC_ROW_HEIGHT, borderLeft: '1px solid var(--gray-100)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: day ? 'pointer' : 'default', padding: '2px 0' }}>
                              {day ? <>
                                {showPrice && (
                                  <div style={{ fontSize: 12, fontWeight: 700, color: day.stopSell ? '#dc2626' : 'var(--gray-900)' }}>
                                    ₹{Number(day.price).toLocaleString('en-IN')}{day.priceOverridden && <span title="Overridden for this date" style={{ color: 'var(--blue)' }}>*</span>}
                                  </div>
                                )}
                                {showBadges && (badges.length > 0
                                  ? <div style={{ fontSize: view === 'restrictions' ? 11 : 8, color: '#dc2626', textAlign: 'center', lineHeight: view === 'restrictions' ? '13px' : '9px', fontWeight: view === 'restrictions' ? 700 : 400 }}>{badges.join(' · ')}</div>
                                  : view === 'restrictions' && <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>OK</div>)}
                              </> : <div style={{ fontSize: 12, color: 'var(--gray-300)' }}>—</div>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  {(view === 'all' || view === 'prices' || view === 'restrictions') && (rt.ratePlans || []).length === 0 && (
                    <div style={{ display: 'flex' }}>
                      <div style={{ width: 200 + windowDays * dayWidth, padding: '8px 12px', fontSize: 12, color: 'var(--gray-400)' }}>No rate plans for this room type yet.</div>
                    </div>
                  )}
                </>}
              </div>
            );
          })}
          {roomTypes.length === 0 && <div style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 30 }}>No room types configured yet</div>}
        </div>
      </div>

      {editInv && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditInv(null)}>
          <form onSubmit={saveInventory} className="admin-table-card" style={{ padding: 20, width: 300, maxWidth: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong>{editInv.roomTypeName} · {editInv.date}</strong>
              <button type="button" className="admin-row-btn" onClick={() => setEditInv(null)}><X size={14} /></button>
            </div>
            <label style={{ fontSize: 11, color: 'var(--gray-500)' }}>Allotment (sellable-room cap for this date)</label>
            <input type="number" min="0" value={editInv.allotment} onChange={e => setEditInv({ ...editInv, allotment: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} autoFocus />
            <button type="submit" className="admin-row-btn" style={{ ...btnPrimary, width: '100%', marginTop: 14, justifyContent: 'center' }} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </form>
        </div>
      )}

      {editRate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditRate(null)}>
          <form onSubmit={saveRate} className="admin-table-card" style={{ padding: 20, width: 340, maxWidth: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong>{editRate.ratePlanName} · {editRate.date}</strong>
              <button type="button" className="admin-row-btn" onClick={() => setEditRate(null)}><X size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={{ fontSize: 11, color: 'var(--gray-500)' }}>Price override</label><br />
                <input type="number" min="0" value={editRate.price} onChange={e => setEditRate({ ...editRate, price: e.target.value })} style={{ ...inputStyle, width: '100%' }} placeholder="Leave blank to clear override" /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: 'var(--gray-500)' }}>Min stay</label><br />
                  <input type="number" min="0" value={editRate.minStay} onChange={e => setEditRate({ ...editRate, minStay: e.target.value })} style={{ ...inputStyle, width: '100%' }} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: 'var(--gray-500)' }}>Max stay</label><br />
                  <input type="number" min="0" value={editRate.maxStay} onChange={e => setEditRate({ ...editRate, maxStay: e.target.value })} style={{ ...inputStyle, width: '100%' }} /></div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><input type="checkbox" checked={!!editRate.closedToArrival} onChange={e => setEditRate({ ...editRate, closedToArrival: e.target.checked })} /> Closed to arrival</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><input type="checkbox" checked={!!editRate.closedToDeparture} onChange={e => setEditRate({ ...editRate, closedToDeparture: e.target.checked })} /> Closed to departure</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><input type="checkbox" checked={!!editRate.stopSell} onChange={e => setEditRate({ ...editRate, stopSell: e.target.checked })} /> Stop sell</label>
            </div>
            <button type="submit" className="admin-row-btn" style={{ ...btnPrimary, width: '100%', marginTop: 14, justifyContent: 'center' }} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Chain-level rate templates — define once, push to every member property ────
export function ChainTemplatesTab({ chainId }) {
  const [roomTypeTemplates, setRoomTypeTemplates] = useState([]);
  const [ratePlanTemplates, setRatePlanTemplates] = useState([]);
  const rtEmpty = { name: '', description: '', maxOccupancy: 2 };
  const [rtForm, setRtForm] = useState(rtEmpty);
  const rpEmpty = {};
  const [rpForm, setRpForm] = useState(rpEmpty);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState(null);

  const load = useCallback(() => {
    if (!chainId) return;
    pmsApi.listChainRoomTypeTemplates(chainId).then(res => setRoomTypeTemplates(res.data.data || [])).catch(() => {});
    pmsApi.listChainRatePlanTemplates(chainId).then(res => setRatePlanTemplates(res.data.data || [])).catch(() => {});
  }, [chainId]);
  useEffect(() => { load(); }, [load]);

  if (!chainId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="page-header"><div><h1 className="page-title">Chain Rate Templates</h1><p className="page-subtitle">Define a room type or rate plan once and push it to every property in the chain.</p></div></div>
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)', fontSize: 13 }}>This hotel isn't part of a chain, so there's nothing to push templates to.</div>
      </div>
    );
  }

  const addRoomTypeTemplate = async (e) => {
    e.preventDefault();
    if (!rtForm.name.trim()) return;
    try {
      await pmsApi.createChainRoomTypeTemplate(chainId, { ...rtForm, maxOccupancy: Number(rtForm.maxOccupancy) || 2 });
      setRtForm(rtEmpty);
      load();
    } catch { alert('Could not create room type template'); }
  };

  const addRatePlanTemplate = async (e, roomTypeTemplateId) => {
    e.preventDefault();
    const rp = rpForm[roomTypeTemplateId] || {};
    if (!rp.name || !rp.baseRate) return;
    try {
      await pmsApi.createChainRatePlanTemplate(chainId, { roomTypeTemplateId, name: rp.name, baseRate: Number(rp.baseRate), mealPlan: rp.mealPlan || 'ROOM_ONLY' });
      setRpForm(prev => ({ ...prev, [roomTypeTemplateId]: { name: '', baseRate: '', mealPlan: 'ROOM_ONLY' } }));
      load();
    } catch { alert('Could not create rate plan template'); }
  };

  const pushToProperties = async () => {
    setPushing(true);
    setPushResult(null);
    try {
      const res = await pmsApi.pushChainTemplates(chainId);
      setPushResult(res.data.data);
    } catch (err) { alert(err?.response?.data?.message || 'Push failed'); }
    finally { setPushing(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div><h1 className="page-title">Chain Rate Templates</h1><p className="page-subtitle">Define a room type or rate plan once and push it to every property in the chain.</p></div>
        <button className="admin-row-btn" style={btnPrimary} onClick={pushToProperties} disabled={pushing || roomTypeTemplates.length === 0}><Send size={14} /> {pushing ? 'Pushing…' : 'Push to all properties'}</button>
      </div>

      {pushResult && (
        <div className="admin-kpi-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
          <div className="admin-kpi-card"><div className="admin-kpi-value">{pushResult.hotelsProcessed}</div><div className="admin-kpi-label">Properties updated</div></div>
          <div className="admin-kpi-card"><div className="admin-kpi-value">{pushResult.roomTypesCreated}</div><div className="admin-kpi-label">Room types created</div></div>
          <div className="admin-kpi-card"><div className="admin-kpi-value">{pushResult.roomTypesUpdated}</div><div className="admin-kpi-label">Room types updated</div></div>
          <div className="admin-kpi-card"><div className="admin-kpi-value">{pushResult.ratePlansCreated}</div><div className="admin-kpi-label">Rate plans created</div></div>
          <div className="admin-kpi-card"><div className="admin-kpi-value">{pushResult.ratePlansUpdated}</div><div className="admin-kpi-label">Rate plans updated</div></div>
        </div>
      )}

      <form onSubmit={addRoomTypeTemplate} className="admin-table-card" style={{ padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div><label style={{ fontSize: 11, color: 'var(--gray-500)' }}>Name</label><br />
          <input value={rtForm.name} onChange={e => setRtForm({ ...rtForm, name: e.target.value })} placeholder="e.g. Deluxe" style={inputStyle} /></div>
        <div><label style={{ fontSize: 11, color: 'var(--gray-500)' }}>Max occupancy</label><br />
          <input type="number" min="1" value={rtForm.maxOccupancy} onChange={e => setRtForm({ ...rtForm, maxOccupancy: e.target.value })} style={{ ...inputStyle, width: 90 }} /></div>
        <div style={{ flex: 1, minWidth: 160 }}><label style={{ fontSize: 11, color: 'var(--gray-500)' }}>Description</label><br />
          <input value={rtForm.description} onChange={e => setRtForm({ ...rtForm, description: e.target.value })} style={inputStyle} /></div>
        <button type="submit" className="admin-row-btn" style={btnPrimary}><Plus size={14} /> Add room type template</button>
      </form>

      {roomTypeTemplates.map(rtt => (
        <div key={rtt.id} className="admin-table-card" style={{ padding: 16 }}>
          <div style={{ marginBottom: 10 }}>
            <strong>{rtt.name}</strong> <span style={{ color: 'var(--gray-500)', fontSize: 12.5 }}>· up to {rtt.maxOccupancy} guests</span>
            {rtt.description && <span style={{ color: 'var(--gray-500)', fontSize: 12.5 }}> · {rtt.description}</span>}
          </div>
          <table className="admin-table">
            <thead><tr><th>Rate plan</th><th>Base rate / night</th><th>Meal plan</th></tr></thead>
            <tbody>
              {ratePlanTemplates.filter(rp => rp.roomTypeTemplateId === rtt.id).map(rp => (
                <tr key={rp.id}><td>{rp.name}</td><td>₹{Number(rp.baseRate).toLocaleString('en-IN')}</td><td>{(rp.mealPlan || 'ROOM_ONLY').replace('_', ' ')}</td></tr>
              ))}
            </tbody>
          </table>
          <form onSubmit={(e) => addRatePlanTemplate(e, rtt.id)} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <input placeholder="Plan name" value={rpForm[rtt.id]?.name || ''}
              onChange={e => setRpForm(prev => ({ ...prev, [rtt.id]: { ...prev[rtt.id], name: e.target.value } }))} style={inputStyle} />
            <input placeholder="Base rate" type="number" value={rpForm[rtt.id]?.baseRate || ''}
              onChange={e => setRpForm(prev => ({ ...prev, [rtt.id]: { ...prev[rtt.id], baseRate: e.target.value } }))} style={{ ...inputStyle, width: 110 }} />
            <select value={rpForm[rtt.id]?.mealPlan || 'ROOM_ONLY'}
              onChange={e => setRpForm(prev => ({ ...prev, [rtt.id]: { ...prev[rtt.id], mealPlan: e.target.value } }))} style={inputStyle}>
              <option value="ROOM_ONLY">Room only</option><option value="BREAKFAST">Breakfast included</option>
              <option value="HALF_BOARD">Half board</option><option value="FULL_BOARD">Full board</option>
            </select>
            <button type="submit" className="admin-row-btn" style={btnPrimary}><Plus size={14} /> Add rate plan template</button>
          </form>
        </div>
      ))}
      {roomTypeTemplates.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: 'var(--gray-500)', fontSize: 13 }}>No chain templates yet — add a room type template above, then push it to every property.</div>}
    </div>
  );
}

// ── Bulk CSV reservation import ──────────────────────────────────────────────
const IMPORT_CSV_HEADER = 'guestName,guestPhone,checkInDate,checkOutDate,roomTypeName,ratePlanName,adults,children,status,notes';

export function ImportTab({ hotelId, onImported }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const copyTemplate = () => {
    navigator.clipboard?.writeText(IMPORT_CSV_HEADER).then(() => alert('CSV header copied — paste it as the first line of your file.')).catch(() => {});
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const res = await pmsApi.importReservationsCsv(hotelId, file);
      setResult(res.data.data);
      onImported?.();
    } catch (err) { alert(err?.response?.data?.message || 'Import failed'); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><div><h1 className="page-title">Import Reservations</h1><p className="page-subtitle">Bulk-load historical reservations from a CSV — each row books real inventory the same way a live reservation would.</p></div></div>

      <div className="admin-table-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <strong>Expected CSV header</strong>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <code style={{ fontSize: 12, background: 'var(--gray-100)', padding: '6px 10px', borderRadius: 6, overflowX: 'auto' }}>{IMPORT_CSV_HEADER}</code>
          <button className="admin-row-btn" style={btnSecondary} onClick={copyTemplate}><Copy size={12} /> Copy</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: 0 }}>
          Comma-separated, no embedded commas in a field. <code>roomTypeName</code> must match an existing room type exactly.
          <code>ratePlanName</code>, <code>adults</code>, <code>children</code>, <code>status</code> (defaults to BOOKED) and <code>notes</code> are optional.
        </p>
      </div>

      <div className="admin-table-card" style={{ padding: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="file" accept=".csv,text/csv" onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); }} />
        <button className="admin-row-btn" style={btnPrimary} onClick={upload} disabled={!file || uploading}><Upload size={14} /> {uploading ? 'Importing…' : 'Import'}</button>
      </div>

      {result && (
        <>
          <div className="admin-kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div className="admin-kpi-card"><div className="admin-kpi-value">{result.totalRows}</div><div className="admin-kpi-label">Rows processed</div></div>
            <div className="admin-kpi-card"><div className="admin-kpi-value">{result.succeeded}</div><div className="admin-kpi-label">Imported</div></div>
            <div className="admin-kpi-card"><div className="admin-kpi-value">{result.failed}</div><div className="admin-kpi-label">Failed</div></div>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="admin-table-card">
              <table className="admin-table">
                <thead><tr><th>Row</th><th>Error</th></tr></thead>
                <tbody>{result.errors.map((e, i) => <tr key={i}><td>{e.rowNumber}</td><td>{e.message}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const inputStyle = { height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 13 };
const btnPrimary = { width: 'auto', height: 34, padding: '0 12px', background: 'var(--blue)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none' };
const btnSecondary = { width: 'auto', height: 34, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 6 };
