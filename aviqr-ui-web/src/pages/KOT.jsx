import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { RefreshCw, ChefHat, Bell, Clock, UtensilsCrossed, ShoppingBag, Bike, Maximize2, Minimize2, Volume2, VolumeX, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useActiveShopId } from '../hooks/useActiveShopId.js';
import { orderApi } from '../api/index.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const COLS = [
  { status: 'NEW',       label: 'New Orders',   next: 'ACCEPTED',  color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: '🆕' },
  { status: 'ACCEPTED',  label: 'Cooking',      next: 'PREPARING', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: '👨‍🍳' },
  { status: 'PREPARING', label: 'Finishing',    next: 'READY',     color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: '⏳' },
  { status: 'READY',     label: 'Ready to Serve', next: null,      color: '#1D9E75', bg: '#ECFDF5', border: '#6EE7B7', icon: '🔔' },
];

const TYPE_LABEL = { DINE_IN: 'Dine-in', TAKEAWAY: 'Takeaway', DELIVERY: 'Delivery' };
const TYPE_ICON  = { DINE_IN: UtensilsCrossed, TAKEAWAY: ShoppingBag, DELIVERY: Bike };

function elapsed(ts) {
  if (!ts) return '0m';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function elapsedMin(ts) {
  if (!ts) return 0;
  return Math.floor((Date.now() - new Date(ts)) / 60000);
}

// ── KOT Card ──────────────────────────────────────────────────────────────────
function KotCard({ order, col, onAdvance, onComplete, onCancel }) {
  const wait = elapsedMin(order.createdAt);
  const urgent = wait > 15 && col.status !== 'READY';
  const critical = wait > 25 && col.status !== 'READY';
  const TypeIcon = TYPE_ICON[order.type] || UtensilsCrossed;

  return (
    <div style={{
      background: critical ? '#FFF5F5' : col.bg,
      border: `2px solid ${critical ? '#DC2626' : col.border}`,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      boxShadow: col.status === 'NEW' ? '0 2px 12px rgba(37,99,235,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
      animation: col.status === 'NEW' && wait < 1 ? 'newPulse 2s ease-in-out 3' : 'none',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: col.color, letterSpacing: 1 }}>
            #{order.orderNumber}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, background: 'white', border: `1px solid ${col.border}`, color: col.color, padding: '2px 7px', borderRadius: 999 }}>
              <TypeIcon size={10} /> {TYPE_LABEL[order.type] || order.type}
            </span>
            {order.tableNumber && (
              <span style={{ fontSize: 12, fontWeight: 800, background: col.color, color: 'white', padding: '2px 8px', borderRadius: 6 }}>
                T-{order.tableNumber}
              </span>
            )}
            {order.customerName && order.customerName !== 'Walk-in' && (
              <span style={{ fontSize: 11, color: '#6B7280' }}>{order.customerName}</span>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: critical ? '#DC2626' : urgent ? '#D97706' : '#6B7280',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <Clock size={12} /> {elapsed(order.createdAt)}
            {critical && ' 🚨'}
            {urgent && !critical && ' ⚠️'}
          </div>
        </div>
      </div>

      {/* Items */}
      <div style={{ borderTop: `1px dashed ${col.border}`, paddingTop: 8, marginBottom: 8 }}>
        {(order.items || []).map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '4px 0' }}>
            <span style={{ fontWeight: 900, fontSize: 20, color: col.color, minWidth: 28, lineHeight: 1 }}>{it.quantity}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{it.itemName || it.name}</div>
              {it.notes && (
                <div style={{ fontSize: 11, color: '#D97706', fontStyle: 'italic', marginTop: 2 }}>⚠ {it.notes}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Special notes */}
      {order.notes && (
        <div style={{ fontSize: 12, fontWeight: 700, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '5px 9px', marginBottom: 8, color: '#92400E' }}>
          📝 {order.notes}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display:'flex', gap:6, marginTop:4 }}>
        {(col.status === 'NEW' || col.status === 'ACCEPTED') && (
          <button
            onClick={() => onCancel && onCancel(order)}
            style={{
              flex:'0 0 auto', padding:'9px 10px', borderRadius:8, border:'1.5px solid #FCA5A5',
              background:'#FEF2F2', color:'#DC2626', fontWeight:700, fontSize:12,
              cursor:'pointer',
            }}>
            ✕ Reject
          </button>
        )}
        {col.next ? (
          <button
            onClick={() => onAdvance(order, col.next)}
            style={{
              flex:1, padding: '9px 0', borderRadius: 8, border: 'none',
              background: col.color, color: 'white', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            {col.status === 'NEW' && '✓ Accept & Start Cooking'}
            {col.status === 'ACCEPTED' && '👨‍🍳 Mark Finishing'}
            {col.status === 'PREPARING' && '🔔 Mark Ready'}
          </button>
        ) : (
          <button
            onClick={() => onComplete(order)}
            style={{
              flex:1, padding: '9px 0', borderRadius: 8, border: 'none',
              background: '#1D9E75', color: 'white', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            ✅ Mark Delivered / Done
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main KOT component ────────────────────────────────────────────────────────
export default function KOT() {
  const { user } = useAuth();
  const shopId = useActiveShopId();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);  // sidebar/topbar visible until the user clicks Maximize
  const [fullscreen, setFullscreen] = useState(false); // browser native fullscreen
  const [muted, setMuted] = useState(false);
  const [tick, setTick] = useState(0);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 860);
  const [mobileCol, setMobileCol] = useState('NEW');
  const prevNewCount = useRef(0);
  const audioCtx = useRef(null);

  // Below ~860px the 4-column kitchen-display grid has no room to breathe —
  // each column collapses to a sliver with unreadable, clipped text. Switch
  // to one column at a time (picked via tabs) instead of trying to squeeze
  // all 4 into a narrow screen.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Manage sidebar/topbar visibility via body class. useLayoutEffect (not
  // useEffect) — this must apply before the browser paints, otherwise the
  // sidebar/topbar flash visible for a frame on load before snapping to
  // full screen.
  useLayoutEffect(() => {
    if (expanded) {
      document.body.classList.add('kot-expanded');
    } else {
      document.body.classList.remove('kot-expanded');
    }
    return () => document.body.classList.remove('kot-expanded');
  }, [expanded]);

  // Sync fullscreen state when user presses Escape
  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const playBeep = useCallback(() => {
    if (muted) return;
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
      setTimeout(() => {
        const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.type = 'sine'; o2.frequency.value = 1100;
        g2.gain.setValueAtTime(0.3, ctx.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        o2.start(); o2.stop(ctx.currentTime + 0.3);
      }, 300);
    } catch {}
  }, [muted]);

  const load = useCallback(async (silent = false) => {
    if (!shopId) { setError('No shop linked to account'); setLoading(false); return; }
    try {
      const res = await orderApi.getLiveOrders(shopId);
      const data = res.data.data || [];
      const active = data.filter(o => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(o.status));
      const newCount = active.filter(o => o.status === 'NEW').length;
      if (!silent && newCount > prevNewCount.current) playBeep();
      prevNewCount.current = newCount;
      setOrders(active);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.message || 'Cannot connect to backend');
    } finally {
      setLoading(false);
    }
  }, [shopId, playBeep]);

  useEffect(() => {
    load();
    const poll = setInterval(load, 8000);
    const tickTimer = setInterval(() => setTick(t => t + 1), 30000);
    return () => { clearInterval(poll); clearInterval(tickTimer); };
  }, [load]);

  const advance = async (order, next) => {
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o));
    try { await orderApi.updateStatus(order.id, next); }
    catch { await load(true); }
  };

  const complete = async (order) => {
    setOrders(prev => prev.filter(o => o.id !== order.id));
    try { await orderApi.updateStatus(order.id, 'COMPLETED'); }
    catch { await load(true); }
  };

  const cancel = async (order) => {
    if (!confirm(`Reject order #${order.orderNumber || order.id?.slice(-4)}?`)) return;
    setOrders(prev => prev.filter(o => o.id !== order.id));
    try { await orderApi.updateStatus(order.id, 'CANCELLED'); }
    catch { await load(true); }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const totalActive = orders.length;
  const urgentCount = orders.filter(o => elapsedMin(o.createdAt) > 15 && o.status !== 'READY').length;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, flexDirection: 'column', gap: 12 }}>
      <div className="spinner" />
      <p style={{ color: '#6B7280', fontSize: 14 }}>Loading KOT display…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinner{width:32px;height:32px;border:3px solid #1D9E75;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', padding: 0, fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1E293B', borderBottom: '1px solid #334155', padding: isMobile ? '10px 14px' : '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ChefHat size={isMobile ? 20 : 24} color="#1D9E75" />
          <div>
            <div style={{ fontWeight: 800, fontSize: isMobile ? 15 : 18, color: 'white', letterSpacing: 0.5 }}>
              {isMobile ? 'Kitchen Display' : 'Kitchen Display — KOT'}
            </div>
            <div style={{ fontSize: isMobile ? 11 : 12, color: '#94A3B8' }}>
              {user?.shopName || user?.name || 'Kitchen'}{!isMobile && ' · Auto-refreshes every 8s'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16, flexWrap: 'wrap', rowGap: 8 }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ textAlign: 'center', background: '#334155', padding: isMobile ? '4px 10px' : '6px 14px', borderRadius: 8 }}>
              <div style={{ fontWeight: 800, fontSize: isMobile ? 17 : 22, color: 'white' }}>{totalActive}</div>
              <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase' }}>Active</div>
            </div>
            {urgentCount > 0 && (
              <div style={{ textAlign: 'center', background: '#7F1D1D', padding: isMobile ? '4px 10px' : '6px 14px', borderRadius: 8, animation: 'blink 1.5s step-end infinite' }}>
                <div style={{ fontWeight: 800, fontSize: isMobile ? 17 : 22, color: '#FCA5A5' }}>{urgentCount}</div>
                <div style={{ fontSize: 10, color: '#FCA5A5', textTransform: 'uppercase' }}>Urgent</div>
              </div>
            )}
          </div>

          {/* Time — dropped on mobile, not worth the header space next to a phone's own clock */}
          {!isMobile && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: 24, color: 'white', fontFamily: 'monospace' }}>{timeStr}</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>{dateStr}</div>
            </div>
          )}

          {/* Controls */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMuted(m => !m)}
              style={{ background: '#334155', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: muted ? '#6B7280' : '#1D9E75' }}
              title={muted ? 'Unmute alerts' : 'Mute alerts'}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button onClick={() => load(false)}
              style={{ background: '#334155', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: '#94A3B8' }}
              title="Refresh">
              <RefreshCw size={16} />
            </button>

            {/* Sidebar toggle: expand / minimize — icon-only on mobile, no room for the label */}
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                background: expanded ? '#1D9E75' : '#334155',
                border: 'none', borderRadius: 8, padding: isMobile ? '8px 10px' : '8px 12px',
                cursor: 'pointer', color: 'white',
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 700,
              }}
              title={expanded ? 'Show sidebar (minimize)' : 'Hide sidebar (maximize)'}>
              {expanded
                ? <><PanelLeftOpen size={15} /> {!isMobile && <span>Minimize</span>}</>
                : <><PanelLeftClose size={15} /> {!isMobile && <span>Maximize</span>}</>}
            </button>

            {/* Browser native fullscreen */}
            <button onClick={toggleFullscreen}
              style={{ background: '#334155', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: '#94A3B8' }}
              title={fullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}>
              {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#7F1D1D', borderBottom: '1px solid #991B1B', padding: '10px 20px', color: '#FCA5A5', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚠ {error} —
          <button onClick={() => load()} style={{ background: 'none', border: 'none', color: '#FCA5A5', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* Alert banner for new orders */}
      {orders.filter(o => o.status === 'NEW').length > 0 && (
        <div style={{ background: '#1D3557', borderBottom: '1px solid #2563EB', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8, animation: 'newPulse 2s ease-in-out infinite' }}>
          <Bell size={16} color="#60A5FA" />
          <span style={{ color: '#BFDBFE', fontSize: 13, fontWeight: 700 }}>
            {orders.filter(o => o.status === 'NEW').length} new order{orders.filter(o => o.status === 'NEW').length > 1 ? 's' : ''} waiting for acceptance!
          </span>
        </div>
      )}

      {/* KOT Columns */}
      {totalActive === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 140px)', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 60 }}>🍽️</div>
          <div style={{ color: '#94A3B8', fontSize: 18, fontWeight: 600 }}>Kitchen is clear!</div>
          <div style={{ color: '#64748B', fontSize: 13 }}>New orders will appear here as customers place them</div>
        </div>
      ) : isMobile ? (
        <>
          {/* Mobile: one column at a time, picked via tabs — the 4-across
              grid has no room to breathe under ~860px (columns collapsed to
              unreadable slivers with clipped text). A 2x2 GRID (not a
              horizontally-scrolling row) so all 4 tabs are simultaneously
              visible on any phone width — a scrollable row always hid at
              least one tab off-screen with no reliable way to signal that
              more existed, which read as "the other tabs are missing"
              rather than "swipe to see them". */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, padding: '10px 14px', background: '#0F172A', borderBottom: '1px solid #334155' }}>
            {COLS.map(col => {
              const count = orders.filter(o => o.status === col.status).length;
              const active = mobileCol === col.status;
              return (
                <button key={col.status} onClick={() => setMobileCol(col.status)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '9px 8px', borderRadius: 10,
                    background: active ? col.color : '#1E293B',
                    border: `1.5px solid ${active ? col.color : '#334155'}`,
                    color: 'white', fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                  }}>
                  <span>{col.icon}</span>
                  <span>{col.status === 'READY' ? 'Ready' : col.label}</span>
                  <span style={{ background: 'rgba(255,255,255,0.25)', padding: '1px 6px', borderRadius: 999, fontSize: 11, fontWeight: 900 }}>{count}</span>
                </button>
              );
            })}
          </div>

          {(() => {
            const col = COLS.find(c => c.status === mobileCol);
            const colOrders = orders.filter(o => o.status === col.status).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            return (
              <div style={{ padding: 12, minHeight: 'calc(100vh - 220px)' }}>
                {colOrders.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: '#475569', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 28 }}>—</span>
                    <span style={{ fontSize: 12 }}>No orders in {col.label}</span>
                  </div>
                ) : (
                  colOrders.map(order => (
                    <KotCard key={order.id} order={order} col={col} onAdvance={advance} onComplete={complete} onCancel={cancel} />
                  ))
                )}
              </div>
            );
          })()}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: 14, height: 'calc(100vh - 120px)', boxSizing: 'border-box' }}>
          {COLS.map(col => {
            const colOrders = orders.filter(o => o.status === col.status);
            return (
              <div key={col.status} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Column header */}
                <div style={{
                  background: col.color, borderRadius: '10px 10px 0 0', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 0, flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 18 }}>{col.icon}</span>
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'white', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {col.label}
                    </span>
                  </div>
                  <span style={{ background: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 900, fontSize: 16, padding: '2px 10px', borderRadius: 999 }}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{
                  flex: 1, overflowY: 'auto', background: '#1E293B',
                  borderRadius: '0 0 10px 10px', border: `2px solid ${col.color}`, borderTop: 'none',
                  padding: colOrders.length > 0 ? 10 : 0,
                }}>
                  {colOrders.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: '#475569', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 28 }}>—</span>
                      <span style={{ fontSize: 12 }}>No orders</span>
                    </div>
                  ) : (
                    colOrders
                      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                      .map(order => (
                        <KotCard
                          key={order.id}
                          order={order}
                          col={col}
                          onAdvance={advance}
                          onComplete={complete}
                          onCancel={cancel}
                        />
                      ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes newPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin { to{transform:rotate(360deg)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #1E293B; }
        ::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
      `}</style>
    </div>
  );
}