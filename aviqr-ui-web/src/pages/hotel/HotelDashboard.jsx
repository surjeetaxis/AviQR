import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { hotelApi, hotelOpsApi, hotelOutletApi, hotelAccessApi, reportApi, housekeepingApi, maintenanceApi, pmsApi, qrApi } from '../../api/index.js';
import { LangPicker, useLang } from '../../components/shared/LangPicker.jsx';
import { t } from '../../i18n/translations.js';
import SubscriptionPage from '../../components/shared/SubscriptionPage.jsx';
import ProfileMenu from '../../components/shared/ProfileMenu.jsx';
import QrPosterStudio from '../../components/shared/QrPosterStudio.jsx';
import { TentTemplate, THEMES } from '../../components/shared/QrTemplates.jsx';
import QRCode from 'qrcode';
import { createPortal } from 'react-dom';
import {
  Overview as PmsOverview, ReservationsTab, GroupsTab, FrontDeskTab, FolioTab,
  ChannelsTab, GuestsTab as PmsGuestsTab, ExtrasTab, AgentsTab, ReportsTab as PmsReportsTab,
  RoomTypesTab, WaitlistTab, ChainTemplatesTab, ImportTab, ReviewsTab,
  RateChangeLogTab, BookingCalendarTab, RatesCalendarTab,
} from '../pms/PmsDashboard.jsx';
import {
  Hotel, BedDouble, UtensilsCrossed, Shirt, Sparkles, Wrench,
  Bell, BarChart2, Settings, LogOut, Menu as MenuIcon, CheckCircle2,
  Clock, AlertCircle, Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
  Star, Phone, Save, X, Coffee, Car, RefreshCw, Store, UserCog, QrCode,
  Users, Flower2, TrendingUp, Eye, Download, Printer, MapPin, Loader2,
  CalendarCheck, DoorOpen, Receipt, UserCircle, Tag, Wifi, Briefcase, MessageSquare,
  Hourglass, Building2, Upload, Calendar, History, Grid3x3,
} from 'lucide-react';
import '../admin/Admin.css';
import './Hotel.css';
import './HotelExtra.css';

const ROOM_TYPES = ['Standard','Deluxe','Suite','Presidential'];
const FLOORS = ['Ground','1st Floor','2nd Floor','3rd Floor','4th Floor'];

const INITIAL_ROOMS = [
  {id:'r1',number:'101',type:'Standard',floor:'1st Floor',status:'occupied',guest:'Anjali Singh',checkIn:'Today',checkOut:'Jun 17',qrActive:true},
  {id:'r2',number:'102',type:'Standard',floor:'1st Floor',status:'vacant',guest:null,checkIn:null,checkOut:null,qrActive:true},
  {id:'r3',number:'201',type:'Deluxe',floor:'2nd Floor',status:'occupied',guest:'Ravi Kumar',checkIn:'Jun 13',checkOut:'Jun 18',qrActive:true},
  {id:'r4',number:'202',type:'Deluxe',floor:'2nd Floor',status:'maintenance',guest:null,checkIn:null,checkOut:null,qrActive:false},
  {id:'r5',number:'301',type:'Suite',floor:'3rd Floor',status:'occupied',guest:'Meena Pillai',checkIn:'Jun 14',checkOut:'Jun 20',qrActive:true},
  {id:'r6',number:'401',type:'Presidential',floor:'4th Floor',status:'vacant',guest:null,checkIn:null,checkOut:null,qrActive:true},
];

const INITIAL_REQUESTS = [
  {id:'q1',room:'101',service:'Room Service',item:'Club Sandwich + Fresh Lime Soda',time:'5 min ago',status:'new',priority:'high'},
  {id:'q2',room:'201',service:'Laundry',item:'2 shirts, 1 trouser (express)',time:'12 min ago',status:'preparing',priority:'normal'},
  {id:'q3',room:'301',service:'Maintenance',item:'AC not cooling — temperature stuck at 28°C',time:'20 min ago',status:'preparing',priority:'high'},
  {id:'q4',room:'101',service:'Spa',item:'60-min Swedish Massage at 3 PM for 2 guests',time:'35 min ago',status:'confirmed',priority:'normal'},
  {id:'q5',room:'201',service:'Room Service',item:'Breakfast for 2 — continental',time:'42 min ago',status:'done',priority:'normal'},
  {id:'q6',room:'301',service:'Housekeeping',item:'Extra towels and pillows',time:'1h ago',status:'done',priority:'normal'},
];

const ROOM_MENU = [
  {id:'m1',cat:'Breakfast',name:'Continental Breakfast',price:450,available:true},
  {id:'m2',cat:'Breakfast',name:'Full Indian Breakfast',price:380,available:true},
  {id:'m3',cat:'Mains',name:'Club Sandwich',price:320,available:true},
  {id:'m4',cat:'Mains',name:'Pasta Arrabiata',price:380,available:false},
  {id:'m5',cat:'Beverages',name:'Fresh Lime Soda',price:120,available:true},
  {id:'m6',cat:'Beverages',name:'Filter Coffee',price:80,available:true},
];

const NAV = [
  // ── Front Office (PMS core) ──────────────────────────────────────────────
  {key:'overview',     group:'Front Office', labelKey:'overview',       icon:BarChart2},
  {key:'reservations', group:'Front Office', label:'Reservations',      icon:CalendarCheck},
  {key:'bookingcalendar', group:'Front Office', label:'Booking Calendar', icon:Calendar},
  {key:'frontdesk',    group:'Front Office', label:'Front Desk',        icon:DoorOpen},
  {key:'groups',       group:'Front Office', label:'Group Bookings',    icon:Users},
  {key:'folio',        group:'Front Office', label:'Folio',             icon:Receipt},
  {key:'waitlist',     group:'Front Office', label:'Waitlist',          icon:Hourglass},
  {key:'guests',       group:'Front Office', label:'Guests',            icon:UserCircle},
  {key:'reviews',      group:'Front Office', label:'Reviews',           icon:Star},

  // ── Guest Services (QR-raised, in-stay) ──────────────────────────────────
  {key:'requests',     group:'Guest Services', labelKey:'navGuestRequests', icon:Bell, badge:3},
  {key:'roomservice',  group:'Guest Services', labelKey:'navRoomService',   icon:UtensilsCrossed},
  {key:'housekeeping', group:'Guest Services', labelKey:'housekeeping',     icon:Sparkles},
  {key:'laundry',      group:'Guest Services', labelKey:'laundry',          icon:Shirt},
  {key:'spa',          group:'Guest Services', labelKey:'spa',              icon:Flower2},
  {key:'maintenance',  group:'Guest Services', labelKey:'maintenance',      icon:Wrench},
  {key:'messages',     group:'Guest Services', label:'Messages',            icon:MessageSquare},

  // ── Inventory & Rates ─────────────────────────────────────────────────────
  {key:'rooms',        group:'Inventory & Rates', labelKey:'rooms',           icon:BedDouble},
  {key:'roomtypes',    group:'Inventory & Rates', label:'Room Types & Rates', icon:BedDouble},
  {key:'ratescalendar', group:'Inventory & Rates', label:'Inventory & Rates Calendar', icon:Grid3x3},
  {key:'ratelog',      group:'Inventory & Rates', label:'Rate & Inventory Log', icon:History},
  {key:'extras',       group:'Inventory & Rates', label:'Surcharges, Discounts & Add-ons', icon:Tag},
  {key:'import',       group:'Inventory & Rates', label:'Import Reservations', icon:Upload},

  // ── Distribution ──────────────────────────────────────────────────────────
  {key:'channels',     group:'Distribution', label:'Channel Manager',     icon:Wifi},
  {key:'agents',       group:'Distribution', label:'Agents & Commission', icon:Briefcase},
  {key:'chaintemplates', group:'Distribution', label:'Chain Rate Templates', icon:Building2},

  // ── Operations ────────────────────────────────────────────────────────────
  {key:'outlets',      group:'Operations', labelKey:'outlets',      icon:Store},
  {key:'bookings',     group:'Operations', label:'Outlet Bookings', icon:Star},
  {key:'qrmanagement', group:'Operations', labelKey:'groupQR',      icon:QrCode},
  {key:'hotelstaff',   group:'Operations', labelKey:'navHotelStaff',icon:UserCog},

  // ── Insights ──────────────────────────────────────────────────────────────
  {key:'nightaudit',   group:'Insights', label:'Night Audit & Reports', icon:TrendingUp},
  {key:'reports',      group:'Insights', labelKey:'reports',            icon:TrendingUp},

  // ── Account ───────────────────────────────────────────────────────────────
  {key:'subscription', group:'Account', labelKey:'subscription', icon:Star},
  {key:'settings',     group:'Account', labelKey:'settings',     icon:Settings},
];

const STATUS_CFG = {
  new:       {label:'New',         cls:'req-new',       next:'Accept'},
  preparing: {label:'In progress', cls:'req-preparing', next:'Mark done'},
  confirmed: {label:'Confirmed',   cls:'req-confirmed', next:'Mark done'},
  done:      {label:'Done',        cls:'req-done',      next:null},
};

const ROOM_STATUS_CFG = {
  occupied:    {cls:'rs-occupied',    label:'Occupied'},
  vacant:      {cls:'rs-vacant',      label:'Vacant'},
  maintenance: {cls:'rs-maintenance', label:'Maintenance'},
};

// Booking dates come from different sources (real ISO strings from the QR
// booking flow vs. pre-formatted seed data) — normalise so they always
// render the same way regardless of how they were stored.
const fmtBookingDate = (d) => {
  if (!d) return d;
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d);
  return isNaN(parsed) ? d : parsed.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
};

function today() { return new Date().toISOString().slice(0, 10); }

export default function HotelDashboard() {
  const { user, logout } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [roomFilter, setRoomFilter] = useState(null);
  const [hotelId, setHotelId] = useState(null);
  const [hotelName, setHotelName] = useState('');
  const [bookings, setBookings] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  // PMS-side state (reservations, rates, distribution) — same hotel, one dashboard
  const [roomTypes, setRoomTypes] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [agents, setAgents] = useState([]);
  const [chainId, setChainId] = useState(null);
  const [audit, setAudit] = useState(null);
  const [selectedReservationId, setSelectedReservationId] = useState(null);

  const loadRoomTypes = (hid) => pmsApi.listRoomTypes(hid).then(res => setRoomTypes(res.data.data || [])).catch(() => {});
  const loadReservations = (hid) => pmsApi.listReservations(hid).then(res => setReservations(res.data.data || [])).catch(() => {});
  const loadGroups = (hid) => pmsApi.listGroups(hid).then(res => setGroups(res.data.data || [])).catch(() => {});
  const loadAgents = (hid) => pmsApi.listAgents(hid).then(res => setAgents(res.data.data || [])).catch(() => {});
  const loadAudit = (hid) => pmsApi.nightAudit(hid, today()).then(res => setAudit(res.data.data)).catch(() => {});
  const refreshReservations = () => { if (hotelId) { loadReservations(hotelId); loadAudit(hotelId); } };

  // Normalise a backend room_requests row (legacy) into the shape this UI renders
  const mapRoomRequest = (r) => ({
    id: r.id,
    room: r.roomNumber,
    service: ({ROOM_SERVICE:'Room service', HOUSEKEEPING:'Housekeeping', AMENITIES:'Amenities',
               MAINTENANCE:'Maintenance', CONCIERGE:'Concierge', LAUNDRY:'Laundry',
               SPA:'Spa', WAKE_UP_CALL:'Wake-up call', LATE_CHECKOUT:'Late checkout',
               TRANSPORT:'Transport'}[r.serviceType] || r.serviceType || 'Request'),
    item: r.description || '',
    time: r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '',
    status: ({NEW:'new', ACCEPTED:'preparing', PREPARING:'preparing', CONFIRMED:'confirmed', DONE:'done'}[r.status] || 'new'),
    priority: (r.priority||'NORMAL').toLowerCase(),
    _source: 'room',
  });

  // Normalise a backend guest_service_request into the shape this UI renders
  const mapGuestReq = (g) => ({
    id: g.id,
    room: g.roomNumber,
    service: ({HOUSEKEEPING:'Housekeeping', AMENITIES:'Amenities', MAINTENANCE:'Maintenance',
               CONCIERGE:'Concierge', LAUNDRY:'Laundry', WAKE_UP_CALL:'Wake-up call',
               LATE_CHECKOUT:'Late checkout', TRANSPORT:'Transport'}[g.type] || g.type || 'Request'),
    item: g.details || '',
    time: g.createdAt ? new Date(g.createdAt).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '',
    // map backend status NEW/ACCEPTED/DONE -> UI new/preparing/done
    status: ({NEW:'new', ACCEPTED:'preparing', PREPARING:'preparing', CONFIRMED:'confirmed', DONE:'done'}[g.status] || 'new'),
    priority: (g.priority||'NORMAL').toLowerCase(),
    _source: 'guest',
  });

  // Normalise a backend Room into the shape this UI renders
  const mapRoom = (r) => ({
    id: r.id,
    number: r.roomNumber,
    type: r.roomType,
    floor: r.floor,
    status: (r.status || 'VACANT').toLowerCase(),
    guest: r.guestName,
    checkIn: r.checkInDate,
    checkOut: r.checkOutDate,
    qrActive: r.qrActive,
  });

  const loadData = () => {
    hotelApi.getMyHotels()
      .then(res => {
        const hotels = res.data.data || [];
        const h = hotels[0];
        if (!h) { setLoadingData(false); return; }
        const hid = h.id;
        setHotelId(hid);
        setHotelName(h.name);
        setChainId(h.chainId || null);
        loadRoomTypes(hid);
        loadReservations(hid);
        loadGroups(hid);
        loadAgents(hid);
        loadAudit(hid);
        return Promise.allSettled([
          hotelApi.getRooms(hid),
          hotelApi.getRequests(hid, { status: 'new,preparing,confirmed' }),
          hotelOpsApi.listRequests(hid),   // NEW: QR-raised guest service requests
          hotelOpsApi.listBookings(hid),   // NEW: spa/activity bookings
          hotelOutletApi.list(hid),        // NEW: outlets, for Reports/QR Management/Spa tabs
        ]).then(([rRes, reqRes, gsrRes, bkRes, outRes]) => {
          if (rRes.status === 'fulfilled') {
            const r = rRes.value.data.data || [];
            if (r.length) setRooms(r.map(mapRoom));
          }
          // Merge legacy room_requests + new guest_service_requests
          let merged = [];
          if (reqRes.status === 'fulfilled') merged = merged.concat((reqRes.value.data.data || []).map(mapRoomRequest));
          if (gsrRes.status === 'fulfilled') merged = merged.concat((gsrRes.value.data.data || []).map(mapGuestReq));
          if (merged.length) setRequests(merged);
          if (bkRes.status === 'fulfilled') setBookings(bkRes.value.data.data || []);
          if (outRes.status === 'fulfilled') setOutlets(outRes.value.data.data || []);
        });
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  };

  useEffect(() => { loadData(); }, []);

  // Persist status change to the backend, then reflect locally
  const advanceRequest = id => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    const uiNext = {new:'preparing', preparing:'done', confirmed:'done'};
    const nextUi = uiNext[req.status] || req.status;

    // reflect immediately (optimistic)
    setRequests(prev => prev.map(r => r.id===id ? {...r, status:nextUi} : r));

    // persist — guest-service requests go to hotelOpsApi, legacy ones to hotelApi
    const backendStatus = nextUi === 'preparing' ? 'ACCEPTED' : nextUi === 'done' ? 'DONE' : 'NEW';
    const call = req._source === 'guest'
      ? hotelOpsApi.updateRequest(id, backendStatus)
      : hotelApi.updateRequest(id, backendStatus);
    Promise.resolve(call).catch(() => {});
  };

  const updateBooking = (id, status) => {
    setBookings(prev => prev.map(b => b.id===id ? {...b, status} : b));
    Promise.resolve(hotelOpsApi.updateBooking(id, status)).catch(() => {});
  };

  let lastGroup = null;

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen?'open':''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <Hotel size={18} style={{color:'#C4B5FD'}}/>
            <span className="admin-brand-name">Avi<em>QR</em> PMS</span>
          </div>
        </div>
        <div className="admin-user-card">
          <div className="admin-avatar" style={{background:'var(--purple)'}}>{user?.avatar||'GP'}</div>
          <div>
            <div className="admin-user-name">{hotelName || user?.hotelName || 'Hotel'}</div>
            <div className="admin-user-role">Hotel &amp; Resort PMS · {rooms.length} rooms</div>
          </div>
        </div>
        <nav className="admin-nav">
          {NAV.map(n=>{
            const showHeader = n.group !== lastGroup;
            lastGroup = n.group;
            return (
              <div key={n.key}>
                {showHeader && <div className="admin-nav-group-header">{n.group}</div>}
                <button className={`admin-nav-item ${tab===n.key?'active':''}`} onClick={()=>{setTab(n.key);setSidebarOpen(false);}}>
                  <n.icon size={16}/> <span>{n.label || t(n.labelKey, lang)}</span>
                  {n.badge && <span className="support-nav-badge">{n.badge}</span>}
                </button>
              </div>
            );
          })}
        </nav>
        <div className="admin-sidebar-footer">
          <button className="admin-logout" onClick={()=>{logout();navigate('/')}}><LogOut size={14}/> {t('logout',lang)}</button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-mobile-menu" onClick={()=>setSidebarOpen(o=>!o)}><MenuIcon size={20}/></button>
          <span style={{fontWeight:700,fontSize:15}}>{hotelName || user?.hotelName || 'Hotel'}</span>
          <div style={{display:'flex',alignItems:'center',gap:10,marginLeft:'auto'}}>
            <LangPicker/>
            <ProfileMenu
              name={user?.name}
              email={user?.email}
              avatar={user?.avatar}
              avatarColor="var(--purple)"
              onLogout={() => { logout(); navigate('/'); }}
              items={[
                { label:t('profileAndSettings', lang), icon:Settings, onClick:() => setTab('settings') },
                ...(hotelId ? [{ label:'Preview guest page', icon:Eye, onClick:() => navigate(`/hotel-services/${hotelId}`) }] : []),
                ...(hotelId ? [{ label:'Copy direct booking link', icon:BedDouble, onClick:() => {
                  const url = `${window.location.origin}/book/${hotelId}`;
                  navigator.clipboard?.writeText(url);
                  alert('Direct booking page link copied — add it to your website:\n' + url);
                } }] : []),
                { label:t('onboardingGuide', lang), icon:Sparkles, onClick:() => navigate('/onboarding') },
              ]}
            />
          </div>
        </header>
        <main className="admin-content">
          {/* ── Front Office (PMS) ── */}
          {tab==='overview'     && <PmsOverview hotelName={hotelName} reservations={reservations} audit={audit} requests={requests} onNav={setTab}/>}
          {tab==='bookingcalendar' && <BookingCalendarTab hotelId={hotelId}/>}
          {tab==='reservations' && <ReservationsTab hotelId={hotelId} roomTypes={roomTypes} reservations={reservations} groups={groups} agents={agents}
                                      onCreated={refreshReservations} onOpenFolio={(id)=>{setSelectedReservationId(id);setTab('folio');}}/>}
          {tab==='frontdesk'    && <FrontDeskTab reservations={reservations} onChanged={refreshReservations}
                                      onOpenFolio={(id)=>{setSelectedReservationId(id);setTab('folio');}}/>}
          {tab==='groups'       && <GroupsTab hotelId={hotelId} groups={groups} onChange={()=>loadGroups(hotelId)} onReservationsChanged={refreshReservations}/>}
          {tab==='folio'        && <FolioTab hotelId={hotelId} reservations={reservations} selectedId={selectedReservationId} onSelect={setSelectedReservationId}/>}
          {tab==='waitlist'     && <WaitlistTab hotelId={hotelId} roomTypes={roomTypes}/>}
          {tab==='guests'       && <PmsGuestsTab hotelId={hotelId}/>}
          {tab==='reviews'      && <ReviewsTab hotelId={hotelId}/>}

          {/* ── Guest Services (QR, in-stay) ── */}
          {tab==='requests'     && <AllRequests requests={roomFilter ? requests.filter(r=>r.room===roomFilter) : requests} onAdvance={advanceRequest} roomFilter={roomFilter} onClearFilter={()=>setRoomFilter(null)}/>}
          {tab==='roomservice'  && <RoomServiceMenu menu={ROOM_MENU}/>}
          {tab==='housekeeping' && <HousekeepingPage requests={requests.filter(r=>r.service==='Housekeeping')} rooms={rooms} hotelId={hotelId}/>}
          {tab==='laundry'      && <ServicePage title="Laundry" requests={requests.filter(r=>r.service==='Laundry')} onAdvance={advanceRequest}/>}
          {tab==='spa'          && <SpaPage bookings={bookings} outlets={outlets} hotelId={hotelId} onUpdate={updateBooking}/>}
          {tab==='maintenance'  && <MaintenancePage requests={requests.filter(r=>r.service==='Maintenance')} rooms={rooms} hotelId={hotelId}/>}
          {tab==='messages'     && <MessagesPage hotelId={hotelId}/>}

          {/* ── Inventory & Rates ── */}
          {tab==='rooms'        && <RoomsPage rooms={rooms} setRooms={setRooms} hotelId={hotelId} onNav={setTab} onRequestsFilter={setRoomFilter}/>}
          {tab==='roomtypes'    && <RoomTypesTab hotelId={hotelId} roomTypes={roomTypes} onChange={()=>loadRoomTypes(hotelId)}/>}
          {tab==='ratescalendar' && <RatesCalendarTab hotelId={hotelId}/>}
          {tab==='ratelog'      && <RateChangeLogTab hotelId={hotelId} roomTypes={roomTypes}/>}
          {tab==='extras'       && <ExtrasTab hotelId={hotelId}/>}
          {tab==='import'       && <ImportTab hotelId={hotelId} onImported={refreshReservations}/>}

          {/* ── Distribution ── */}
          {tab==='channels'     && <ChannelsTab hotelId={hotelId} roomTypes={roomTypes}/>}
          {tab==='agents'       && <AgentsTab hotelId={hotelId} agents={agents} onChange={()=>loadAgents(hotelId)}/>}
          {tab==='chaintemplates' && <ChainTemplatesTab chainId={chainId}/>}

          {/* ── Operations ── */}
          {tab==='outlets'      && <OutletsPage hotelId={hotelId}/>}
          {tab==='bookings'     && <BookingsView bookings={bookings} onUpdate={updateBooking}/>}
          {tab==='qrmanagement' && <QRManagementPage rooms={rooms} setRooms={setRooms} outlets={outlets} hotelId={hotelId} hotelName={hotelName}/>}
          {tab==='hotelstaff'   && <HotelStaffPage hotelId={hotelId}/>}

          {/* ── Insights ── */}
          {tab==='nightaudit'   && <PmsReportsTab hotelId={hotelId} chainId={chainId}/>}
          {tab==='reports'      && <HotelReportsTab outlets={outlets} hotelId={hotelId}/>}

          {/* ── Account ── */}
          {tab==='subscription' && <SubscriptionPage userRole="hotel" currentPlan="HOTEL_PRO"/>}
          {tab==='settings'     && <HotelSettings user={user} lang={lang} hotelId={hotelId}/>}
        </main>
      </div>
    </div>
  );
}

// Parses the free-text dates this dashboard stores on rooms (e.g. "Jun 17, 2026")
// and checks whether they fall on today's calendar date.
function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d)) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function AllRequests({requests,onAdvance,compact,roomFilter,onClearFilter}) {
  const { lang } = useLang();
  return (
    <div>
      {!compact&&<div className="page-header"><h1 className="page-title">{t('navGuestRequests', lang)}</h1><span className="req-live-badge">● Live</span></div>}
      {roomFilter && (
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,fontSize:13}}>
          <span style={{background:'var(--gray-100)',padding:'4px 10px',borderRadius:99,fontWeight:600}}>Room {roomFilter}</span>
          <button className="btn-room-action" onClick={onClearFilter}>Clear filter ✕</button>
        </div>
      )}
      <div className="requests-list">
        {requests.map(r=>{
          const cfg=STATUS_CFG[r.status]||STATUS_CFG.new;
          return (
            <div key={r.id} className="request-row">
              <div className="req-room">Room {r.room}</div>
              <div className="req-info">
                <div className="req-service">{r.service}</div>
                <div className="req-item">{r.item}</div>
              </div>
              <div className="req-time">{r.time}</div>
              <div className={`req-status ${cfg.cls}`}>{cfg.label}</div>
              {r.priority==='high'&&<span style={{fontSize:10,fontWeight:700,color:'var(--red)',background:'var(--red-bg)',padding:'2px 7px',borderRadius:99}}>URGENT</span>}
              {cfg.next&&<button className="req-action-btn" onClick={()=>onAdvance(r.id)}>{cfg.next}</button>}
            </div>
          );
        })}
        {requests.length===0&&<div style={{textAlign:'center',padding:32,color:'var(--gray-400)',fontSize:13}}>No requests.</div>}
      </div>
    </div>
  );
}

export function BookingsView({bookings,onUpdate,compact}) {
  const { lang } = useLang();
  const badge = (s) => {
    const map = {
      REQUESTED: {bg:'var(--amber-bg,#FEF3C7)', c:'var(--amber,#B45309)', label:'Requested'},
      CONFIRMED: {bg:'var(--green-bg,#D1FAE5)', c:'var(--green,#047857)', label:'Confirmed'},
      COMPLETED: {bg:'var(--gray-100,#F3F4F6)', c:'var(--gray-500,#6B7280)', label:'Completed'},
      CANCELLED: {bg:'var(--red-bg,#FEE2E2)', c:'var(--red,#DC2626)', label:'Cancelled'},
    }[s] || {bg:'#F3F4F6', c:'#6B7280', label:s};
    return <span style={{fontSize:11,fontWeight:700,color:map.c,background:map.bg,padding:'3px 10px',borderRadius:99}}>{map.label}</span>;
  };
  return (
    <div>
      {!compact&&<div className="page-header"><h1 className="page-title">{t('outletBookings', lang)}</h1><span className="req-live-badge">● Live</span></div>}
      <div className="requests-list">
        {bookings.map(b=>(
          <div key={b.id} className="request-row">
            <div className="req-room">Room {b.roomNumber}</div>
            <div className="req-info">
              <div className="req-service">{b.outletName} · {b.serviceName}</div>
              <div className="req-item">
                {fmtBookingDate(b.bookingDate)} at {b.bookingTime} · {b.partySize} guest{b.partySize>1?'s':''}
                {b.price>0 ? ` · ₹${Number(b.price).toLocaleString('en-IN')}` : ''}
                {' · '}{b.paymentChoice==='PAY_DIRECT'?'Pay direct':'Charge to room'}
              </div>
            </div>
            {badge(b.status)}
            {b.status==='REQUESTED' && <button className="req-action-btn" onClick={()=>onUpdate(b.id,'CONFIRMED')}>Confirm</button>}
            {b.status==='CONFIRMED' && <button className="req-action-btn" onClick={()=>onUpdate(b.id,'COMPLETED')}>Complete</button>}
          </div>
        ))}
        {bookings.length===0 && <div style={{textAlign:'center',padding:32,color:'var(--gray-400)',fontSize:13}}>No bookings yet.</div>}
      </div>
    </div>
  );
}

const OUTLET_TYPES = ['RESTAURANT','BAR','SPA','GYM','POOL','SHOP','ACTIVITY','BANQUET','KIDS_CLUB','BUSINESS_CENTER','LAUNDRY','CONCIERGE','OTHER'];

export function OutletsPage({hotelId}) {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [outlets,setOutlets] = useState([]);
  const [loading,setLoading] = useState(true);
  const [showForm,setShowForm] = useState(false);
  const [form,setForm] = useState({name:'',outletType:'RESTAURANT',location:''});
  const [saving,setSaving] = useState(false);
  const [liveOrdersOutlet,setLiveOrdersOutlet] = useState(null);

  const load = () => {
    if (!hotelId) { setLoading(false); return; }
    setLoading(true);
    hotelOutletApi.list(hotelId)
      .then(res => setOutlets(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [hotelId]);

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await hotelOutletApi.create({ hotelId, name: form.name, outletType: form.outletType, location: form.location });
      setForm({name:'',outletType:'RESTAURANT',location:''});
      setShowForm(false);
      load();
    } catch { alert('Could not create outlet'); }
    finally { setSaving(false); }
  };

  const toggleActive = (o) => hotelOutletApi.toggleStatus(o.id, !o.active).then(load).catch(() => {});
  const toggleQr     = (o) => hotelOutletApi.toggleQr(o.id, !o.qrActive).then(load).catch(() => {});
  const remove        = (o) => { if (confirm(`Delete outlet "${o.name}"?`)) hotelOutletApi.delete(o.id).then(load).catch(() => {}); };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">{t('outlets', lang)}</h1><p className="page-subtitle">{outlets.length} outlet{outlets.length!==1?'s':''} · each gets its own menu, staff, billing &amp; loyalty</p></div>
        <button className="btn-refresh" onClick={()=>setShowForm(f=>!f)}><Plus size={13}/> Add outlet</button>
      </div>

      {showForm && (
        <form onSubmit={create} className="admin-chart-card" style={{marginBottom:16,display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:12,alignItems:'end'}}>
          <div className="form-field">
            <label className="form-label">Name</label>
            <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. The Garden Cafe" required/>
          </div>
          <div className="form-field">
            <label className="form-label">Type</label>
            <select className="form-input" value={form.outletType} onChange={e=>setForm(f=>({...f,outletType:e.target.value}))}>
              {OUTLET_TYPES.map(ot => <option key={ot} value={ot}>{ot.replace('_',' ')}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Location</label>
            <input className="form-input" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Ground floor"/>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving?'Creating…':'Create'}</button>
        </form>
      )}

      {loading ? (
        <p style={{textAlign:'center',color:'var(--gray-400)',padding:'20px 0'}}>Loading outlets…</p>
      ) : outlets.length === 0 ? (
        <div style={{textAlign:'center',padding:32,color:'var(--gray-400)',fontSize:13}}>No outlets yet. Add your first restaurant, spa or bar.</div>
      ) : (
        <div className="rooms-grid">
          {outlets.map(o => (
            <div key={o.id} className="room-card">
              <div className="room-card-header">
                <div className="room-number">{o.name}</div>
                <span className={`room-status-badge ${o.active?'rs-vacant':'rs-maintenance'}`}>{o.active?'Active':'Inactive'}</span>
              </div>
              <div className="room-type">{o.outletType?.replace('_',' ')}{o.location?` · ${o.location}`:''}</div>
              <div className="room-qr-row">
                <span style={{fontSize:12,color:'var(--gray-500)'}}>QR Active</span>
                <button className={`toggle-btn ${o.qrActive?'toggle-on':'toggle-off'}`} onClick={()=>toggleQr(o)}>
                  {o.qrActive?<ToggleRight size={20}/>:<ToggleLeft size={20}/>}
                </button>
              </div>
              <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                <button className="btn-room-action" onClick={()=>navigate(`/hotel/outlets/${o.id}/dashboard`)}>⚙️ Manage</button>
                <button className="btn-room-action" onClick={()=>toggleActive(o)}>{o.active?'Deactivate':'Activate'}</button>
                <button className="btn-room-action" onClick={()=>hotelOutletApi.createQr(o.id).then(()=>alert('QR created')).catch(()=>alert('Could not create QR'))}><QrCode size={12}/> QR</button>
                {o.shopId && <button className="btn-room-action" onClick={()=>setLiveOrdersOutlet(liveOrdersOutlet===o.id?null:o.id)}>🍽️ Live orders</button>}
                <button className="btn-room-action admin-row-btn-danger" onClick={()=>remove(o)}><Trash2 size={12}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {liveOrdersOutlet && <LiveOrdersPanel outletId={liveOrdersOutlet} outletName={outlets.find(o=>o.id===liveOrdersOutlet)?.name} onClose={()=>setLiveOrdersOutlet(null)}/>}
    </div>
  );
}

const KOT_STATUS_CFG = {
  NEW:        {label:'New',        cls:'req-new'},
  PREPARING:  {label:'Preparing',  cls:'req-preparing'},
  READY:      {label:'Ready',      cls:'req-confirmed'},
  COMPLETED:  {label:'Completed',  cls:'req-done'},
  CANCELLED:  {label:'Cancelled',  cls:'req-done'},
};

// Table assignment + KOT status, surfaced from order-qr-service via hotel-service's
// OutletShopProxyController — no separate POS domain, just visibility into the
// outlet's existing live order queue from the hotel side.
function LiveOrdersPanel({outletId,outletName,onClose}) {
  const [orders,setOrders] = useState([]);
  const [loading,setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    hotelOutletApi.liveOrders(outletId)
      .then(res => setOrders(res.data.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [outletId]);

  return (
    <div className="admin-table-card" style={{marginTop:16,padding:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <strong style={{fontSize:13}}>{outletName} — live kitchen queue</strong>
        <div style={{display:'flex',gap:8}}>
          <button className="btn-room-action" onClick={load}><RefreshCw size={12}/> Refresh</button>
          <button className="btn-room-action" onClick={onClose}>Close</button>
        </div>
      </div>
      {loading ? (
        <p style={{textAlign:'center',color:'var(--gray-400)',padding:12}}>Loading…</p>
      ) : (
        <table className="admin-table">
          <thead><tr><th>Order #</th><th>Table</th><th>Status</th><th>Items</th><th>Total</th></tr></thead>
          <tbody>
            {orders.map(o => {
              const cfg = KOT_STATUS_CFG[o.status] || {label:o.status,cls:''};
              return (
                <tr key={o.id}>
                  <td className="admin-td-shop">{o.orderNumber}</td>
                  <td>{o.tableNumber || (o.roomNumber ? `Room ${o.roomNumber}` : '—')}</td>
                  <td><span className={`req-status ${cfg.cls}`}>{cfg.label}</span></td>
                  <td>{(o.items||[]).length}</td>
                  <td>₹{Number(o.totalAmount).toLocaleString('en-IN')}</td>
                </tr>
              );
            })}
            {orders.length===0 && <tr><td colSpan={5} style={{textAlign:'center',color:'var(--gray-500)',padding:16}}>No live orders right now</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}

const HOTEL_ROLES = ['GENERAL_MANAGER','OUTLET_MANAGER','STAFF'];

export function HotelStaffPage({hotelId}) {
  const { lang } = useLang();
  const [access,setAccess] = useState([]);
  const [loading,setLoading] = useState(true);
  const [form,setForm] = useState({userId:'',role:'STAFF'});
  const [saving,setSaving] = useState(false);

  const load = () => {
    if (!hotelId) { setLoading(false); return; }
    setLoading(true);
    hotelAccessApi.list(hotelId)
      .then(res => setAccess(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [hotelId]);

  const grant = async (e) => {
    e.preventDefault();
    if (!form.userId.trim()) return;
    setSaving(true);
    try {
      await hotelAccessApi.grant(hotelId, { userId: form.userId, role: form.role });
      setForm({userId:'',role:'STAFF'});
      load();
    } catch { alert('Could not grant access'); }
    finally { setSaving(false); }
  };

  const revoke = (row) => { if (confirm('Revoke this access?')) hotelAccessApi.revoke(hotelId, row.id).then(load).catch(() => {}); };

  return (
    <div>
      <div className="page-header"><h1 className="page-title">{t('navHotelStaff', lang)}</h1><p className="page-subtitle">Hotel-wide roles — separate from an individual outlet's own staff</p></div>

      <form onSubmit={grant} className="admin-chart-card" style={{marginBottom:16,display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:12,alignItems:'end'}}>
        <div className="form-field">
          <label className="form-label">User ID</label>
          <input className="form-input" value={form.userId} onChange={e=>setForm(f=>({...f,userId:e.target.value}))} placeholder="user id to grant access" required/>
        </div>
        <div className="form-field">
          <label className="form-label">Role</label>
          <select className="form-input" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
            {HOTEL_ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>{saving?'Granting…':'Grant access'}</button>
      </form>

      {loading ? (
        <p style={{textAlign:'center',color:'var(--gray-400)',padding:'20px 0'}}>Loading staff…</p>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead><tr><th>User ID</th><th>Role</th><th>Outlet scope</th><th></th></tr></thead>
            <tbody>
              {access.map(row => (
                <tr key={row.id}>
                  <td style={{fontWeight:600}}>{row.userId}</td>
                  <td>{row.role?.replace('_',' ')}</td>
                  <td>{row.outletId ? row.outletId : 'Whole hotel'}</td>
                  <td><button className="admin-row-btn admin-row-btn-danger" onClick={()=>revoke(row)}><Trash2 size={12}/></button></td>
                </tr>
              ))}
              {access.length===0 && <tr><td colSpan={4} style={{textAlign:'center',color:'var(--gray-400)',padding:20}}>No staff granted access yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function RoomsPage({rooms,setRooms,hotelId,onNav,onRequestsFilter}) {
  const { lang } = useLang();
  const [filter,setFilter] = useState('all');
  const [billRoom,setBillRoom] = useState(null);
  const [showAdd,setShowAdd] = useState(false);
  const [form,setForm] = useState({number:'',type:'Standard',floor:''});
  const [saving,setSaving] = useState(false);

  const toggleQR = (room) => {
    const next = !room.qrActive;
    setRooms(prev=>prev.map(r=>r.id!==room.id?r:{...r,qrActive:next}));
    hotelApi.toggleRoomQr(room.id, next).catch(() => {
      setRooms(prev=>prev.map(r=>r.id!==room.id?r:{...r,qrActive:!next})); // revert on failure
      alert('Could not update QR status');
    });
  };

  const addRoom = async (e) => {
    e.preventDefault();
    if (!form.number.trim() || !hotelId) return;
    setSaving(true);
    try {
      const res = await hotelApi.createRoom({ hotelId, roomNumber: form.number, roomType: form.type, floor: form.floor, status: 'VACANT', qrActive: true });
      const r = res.data.data;
      setRooms(prev => [...prev, { id:r.id, number:r.roomNumber, type:r.roomType, floor:r.floor, status:(r.status||'vacant').toLowerCase(), guest:null, checkIn:null, checkOut:null, qrActive:r.qrActive }]);
      setForm({number:'',type:'Standard',floor:''});
      setShowAdd(false);
    } catch { alert('Could not add room'); }
    finally { setSaving(false); }
  };

  const [qrRoom, setQrRoom] = useState(null);

  const viewRequests = (room) => {
    onRequestsFilter?.(room.number);
    onNav?.('requests');
  };

  const filtered = filter==='all'?rooms:rooms.filter(r=>r.status===filter);
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">{t('rooms', lang)}</h1><p className="page-subtitle">{rooms.length} total · {rooms.filter(r=>r.status==='occupied').length} occupied</p></div>
        <button className="btn-refresh" onClick={()=>setShowAdd(f=>!f)}><Plus size={13}/> Add room</button>
      </div>
      {showAdd && (
        <form onSubmit={addRoom} className="admin-chart-card" style={{marginBottom:14,display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:12,alignItems:'end'}}>
          <div className="form-field">
            <label className="form-label">Room number</label>
            <input className="form-input" value={form.number} onChange={e=>setForm(f=>({...f,number:e.target.value}))} placeholder="e.g. 501" required/>
          </div>
          <div className="form-field">
            <label className="form-label">Type</label>
            <select className="form-input" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
              {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Floor</label>
            <select className="form-input" value={form.floor} onChange={e=>setForm(f=>({...f,floor:e.target.value}))}>
              <option value="">Select floor</option>
              {FLOORS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving?'Adding…':'Add'}</button>
        </form>
      )}
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        {['all','occupied','vacant','maintenance'].map(f=>(
          <button key={f} className={`support-filter-tab ${filter===f?'active':''}`} onClick={()=>setFilter(f)}>
            {f.charAt(0).toUpperCase()+f.slice(1)} <span className="support-filter-count">{f==='all'?rooms.length:rooms.filter(r=>r.status===f).length}</span>
          </button>
        ))}
      </div>
      <div className="rooms-grid">
        {filtered.map(room=>{
          const cfg=ROOM_STATUS_CFG[room.status]||ROOM_STATUS_CFG.vacant;
          return (
            <div key={room.id} className="room-card">
              <div className="room-card-header">
                <div className="room-number">Room {room.number}</div>
                <span className={`room-status-badge ${cfg.cls}`}>{cfg.label}</span>
              </div>
              <div className="room-type">{room.type} · {room.floor}</div>
              {room.guest&&(
                <div className="room-guest">
                  <div className="room-guest-name">👤 {room.guest}</div>
                  <div className="room-guest-dates">Check-in: {room.checkIn} · Out: {room.checkOut}</div>
                </div>
              )}
              <div className="room-qr-row">
                <span style={{fontSize:12,color:'var(--gray-500)'}}>QR Active</span>
                <button className={`toggle-btn ${room.qrActive?'toggle-on':'toggle-off'}`} onClick={()=>toggleQR(room)}>
                  {room.qrActive?<ToggleRight size={20}/>:<ToggleLeft size={20}/>}
                </button>
              </div>
              <div style={{display:'flex',gap:6,marginTop:8}}>
                <button className="btn-room-action" onClick={()=>viewRequests(room)}>📋 Requests</button>
                <button className="btn-room-action" onClick={()=>setQrRoom(room)}>📱 QR Code</button>
                {room.status==='occupied' &&
                  <button className="btn-room-action" onClick={()=>setBillRoom(room)}>💳 Bill</button>}
              </div>
            </div>
          );
        })}
      </div>
      {billRoom && <RoomBillModal room={billRoom} onClose={()=>setBillRoom(null)}/>}
      {qrRoom && <RoomQrModal room={qrRoom} onClose={()=>setQrRoom(null)}/>}
    </div>
  );
}

function RoomQrModal({room,onClose}) {
  const { user } = useAuth();
  const [qrImg,setQrImg] = useState('');
  const [qr,setQr] = useState(null); // { id, qrCode, targetUrl, scanCount }
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [designing,setDesigning] = useState(false);
  const [regenerating,setRegenerating] = useState(false);

  const load = () => {
    setLoading(true);
    hotelApi.createRoomQr(room.id)
      .then(res => setQr(res.data.data || null))
      .catch(() => setError('Could not generate QR code'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [room.id]);

  const scanUrl = qr?.qrCode ? qrApi.redirectUrl(qr.qrCode) : qr?.targetUrl;

  useEffect(() => {
    if (!scanUrl) return;
    QRCode.toDataURL(scanUrl, { width: 400, margin: 2, color: { dark: '#0F172A', light: '#ffffff' } })
      .then(setQrImg).catch(() => {});
  }, [scanUrl]);

  const download = () => {
    if (!qrImg) return;
    const a = document.createElement('a');
    a.href = qrImg;
    a.download = `room-${room.number}-qr.png`;
    a.click();
  };

  const copyLink = () => {
    if (!scanUrl) return;
    navigator.clipboard?.writeText(scanUrl).then(
      () => alert(`Guest QR link copied:\n${scanUrl}`),
      () => prompt('Copy this guest QR link:', scanUrl)
    );
  };

  const regenerate = () => {
    if (!confirm('This creates a new QR code and permanently deactivates the current one — any printed copies of the old QR will stop working. Continue?')) return;
    setRegenerating(true);
    hotelApi.regenerateRoomQr(room.id)
      .then(res => setQr(res.data.data || null))
      .catch(() => alert('Could not regenerate QR code'))
      .finally(() => setRegenerating(false));
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:16,padding:20,width:'92%',maxWidth:360,textAlign:'center'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:16}}>Room {room.number} · QR Code</div>
          <button onClick={onClose} style={{background:'var(--gray-100)',border:'none',borderRadius:8,padding:6,cursor:'pointer'}}><X size={18}/></button>
        </div>
        {loading ? (
          <p style={{fontSize:13,color:'var(--gray-400)',padding:'40px 0'}}>Generating…</p>
        ) : error ? (
          <p style={{fontSize:13,color:'#DC2626',padding:'40px 0'}}>{error}</p>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:14,alignItems:'center'}}>
            {qrImg ? <img src={qrImg} alt="Room QR" style={{width:220,height:220,borderRadius:8}}/> : <div style={{width:220,height:220,background:'var(--gray-100)',borderRadius:8}}/>}
            <div style={{fontSize:12,color:'var(--gray-500)',display:'flex',alignItems:'center',gap:5}}>
              <Eye size={13}/> {(qr?.scanCount || 0).toLocaleString('en-IN')} scans
            </div>
            <div style={{fontSize:11.5,color:'var(--gray-400)',fontFamily:'monospace',wordBreak:'break-all'}}>{scanUrl}</div>
            <div style={{display:'flex',gap:8,width:'100%'}}>
              <button className="btn-refresh" style={{flex:1,justifyContent:'center'}} onClick={download}><Download size={14}/> Download</button>
              <button className="btn-refresh" style={{flex:1,justifyContent:'center'}} onClick={()=>window.print()}><Printer size={14}/> Print</button>
            </div>
            <button className="btn-room-action" style={{width:'100%'}} onClick={copyLink}>🔗 Copy Link</button>
            <button className="btn-room-action" style={{width:'100%'}} onClick={()=>setDesigning(true)}>🎨 Design Banner & Print</button>
            <button className="btn-room-action" style={{width:'100%'}} onClick={regenerate} disabled={regenerating || !qr?.id}>
              <RefreshCw size={13}/> {regenerating ? 'Regenerating…' : 'Regenerate QR'}
            </button>
          </div>
        )}
      </div>
      {designing && (
        <QrPosterStudio
          open={designing}
          onClose={()=>setDesigning(false)}
          targetUrlOverride={scanUrl}
          nameDefault={`${user?.hotelName || 'Our Hotel'} — Room ${room.number}`}
          taglineDefault="Scan for Room Service · Enjoy your stay!"
        />
      )}
    </div>
  );
}

function RoomBillModal({room,onClose}) {
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(true);
  const [settling,setSettling] = useState(false);

  const loadBill = () => {
    setLoading(true);
    hotelOpsApi.roomCharges(room.id)
      .then(r => setData(r.data.data))
      .catch(() => setData({charges:[],pendingTotal:0}))
      .finally(() => setLoading(false));
  };

  useEffect(loadBill, [room.id]);

  const settle = () => {
    setSettling(true);
    hotelOpsApi.settleCharges(room.id)
      .then(loadBill)
      .catch(() => alert('Could not settle charges'))
      .finally(() => setSettling(false));
  };

  const pending = data?.charges?.filter(c => c.status === 'PENDING') || [];

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:16,padding:20,width:'92%',maxWidth:420,maxHeight:'85vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:16}}>Room {room.number} · Bill</div>
          <button onClick={onClose} style={{background:'var(--gray-100)',border:'none',borderRadius:8,padding:6,cursor:'pointer'}}><X size={18}/></button>
        </div>
        {loading ? (
          <p style={{textAlign:'center',color:'var(--gray-400)',padding:'20px 0'}}>Loading bill…</p>
        ) : (
          <>
            <div style={{background:'linear-gradient(135deg,#1D9E75,#178A65)',color:'#fff',borderRadius:12,padding:'14px 16px',marginBottom:14}}>
              <div style={{fontSize:11,opacity:0.85}}>PENDING</div>
              <div style={{fontSize:24,fontWeight:800}}>₹{Number(data?.pendingTotal||0).toLocaleString('en-IN')}</div>
            </div>
            {pending.length === 0 ? (
              <p style={{textAlign:'center',color:'var(--gray-400)',fontSize:13,padding:'10px 0 20px'}}>No pending charges</p>
            ) : (
              <div style={{marginBottom:16}}>
                {pending.map(c => (
                  <div key={c.id} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--gray-100)'}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{c.description}</div>
                      <div style={{fontSize:11,color:'var(--gray-400)'}}>{new Date(c.createdAt).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    <div style={{fontWeight:700,fontSize:13}}>₹{Number(c.amount).toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            )}
            <button className="btn-refresh" style={{width:'100%',justifyContent:'center',opacity:settling||pending.length===0?0.6:1}}
              onClick={settle} disabled={settling||pending.length===0}>
              {settling ? 'Settling…' : 'Settle & Checkout'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function RoomServiceMenu({menu:initialMenu}) {
  const { lang } = useLang();
  const [menu,setMenu] = useState(initialMenu);
  const [showAdd,setShowAdd] = useState(false);
  const [editing,setEditing] = useState(null);
  const [form,setForm] = useState({name:'',cat:'Breakfast',price:''});
  const toggleAvail = id => setMenu(prev=>prev.map(m=>m.id!==id?m:{...m,available:!m.available}));
  const cats = [...new Set(menu.map(m=>m.cat))];

  const openAdd = () => { setEditing(null); setForm({name:'',cat:cats[0]||'Breakfast',price:''}); setShowAdd(true); };
  const openEdit = (item) => { setEditing(item); setForm({name:item.name,cat:item.cat,price:item.price}); setShowAdd(true); };
  const remove = (item) => { if (confirm(`Remove "${item.name}" from the room service menu?`)) setMenu(prev=>prev.filter(m=>m.id!==item.id)); };

  const save = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return;
    if (editing) {
      setMenu(prev=>prev.map(m=>m.id!==editing.id?m:{...m,name:form.name,cat:form.cat,price:Number(form.price)}));
    } else {
      setMenu(prev=>[...prev,{id:`m${Date.now()}`,name:form.name,cat:form.cat,price:Number(form.price),available:true}]);
    }
    setShowAdd(false);
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">{t('navRoomService', lang)}</h1><p className="page-subtitle">{menu.filter(m=>m.available).length} available items</p></div>
        <button className="btn-refresh" onClick={openAdd}><Plus size={13}/> Add item</button>
      </div>
      {showAdd && (
        <form onSubmit={save} className="admin-chart-card" style={{marginBottom:16,display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:12,alignItems:'end'}}>
          <div className="form-field">
            <label className="form-label">Item name</label>
            <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Veg Sandwich" required/>
          </div>
          <div className="form-field">
            <label className="form-label">Category</label>
            <input className="form-input" list="rsm-cats" value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))} placeholder="e.g. Mains"/>
            <datalist id="rsm-cats">{cats.map(c=><option key={c} value={c}/>)}</datalist>
          </div>
          <div className="form-field">
            <label className="form-label">Price (₹)</label>
            <input className="form-input" type="number" min="0" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} required/>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-primary" type="submit">{editing?'Save':'Add'}</button>
            <button className="btn-room-action" type="button" onClick={()=>setShowAdd(false)}>Cancel</button>
          </div>
        </form>
      )}
      {cats.map(cat=>(
        <div key={cat} style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>{cat}</div>
          <div className="admin-table-card">
            <table className="admin-table">
              <thead><tr><th>Item</th><th>Price</th><th>Available</th><th></th></tr></thead>
              <tbody>
                {menu.filter(m=>m.cat===cat).map(item=>(
                  <tr key={item.id}>
                    <td style={{fontWeight:600}}>{item.name}</td>
                    <td>₹{item.price}</td>
                    <td>
                      <button className={`toggle-btn ${item.available?'toggle-on':'toggle-off'}`} onClick={()=>toggleAvail(item.id)}>
                        {item.available?<ToggleRight size={20}/>:<ToggleLeft size={20}/>}
                      </button>
                    </td>
                    <td>
                      <div style={{display:'flex',gap:5}}>
                        <button className="admin-row-btn" onClick={()=>openEdit(item)}><Edit2 size={12}/></button>
                        <button className="admin-row-btn admin-row-btn-danger" onClick={()=>remove(item)}><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HousekeepingPage({requests,rooms,hotelId}) {
  const { lang } = useLang();
  // Was previously 4 hardcoded literal numbers unconnected to any real data
  // (always summed to 30 regardless of the hotel's actual room count). Rooms
  // already carry a real status — including CLEANING — that was never plumbed
  // in here; use it instead of inventing state that doesn't exist in the model.
  const STATUS_META = {
    vacant:      { icon:'✅', label:'Vacant' },
    occupied:    { icon:'🛏️', label:'Occupied' },
    cleaning:    { icon:'🔄', label:'Cleaning' },
    maintenance: { icon:'🔧', label:'Maintenance' },
  };
  const counts = (rooms||[]).reduce((acc,r) => { acc[r.status] = (acc[r.status]||0)+1; return acc; }, {});
  return (
    <div>
      <div className="page-header"><h1 className="page-title">{t('housekeeping', lang)}</h1><p className="page-subtitle">{(rooms||[]).length} rooms</p></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:20}}>
        {Object.entries(STATUS_META).map(([key,m])=>(
          <div key={key} className="admin-kpi-card" style={{textAlign:'center'}}>
            <div style={{fontSize:28,marginBottom:8}}>{m.icon}</div>
            <div className="admin-kpi-value">{counts[key]||0}</div>
            <div className="admin-kpi-label">Rooms {m.label}</div>
          </div>
        ))}
      </div>
      <h2 style={{fontSize:15,fontWeight:700,margin:'8px 0 12px'}}>Room-turnover cleaning tasks</h2>
      <HousekeepingBoard hotelId={hotelId} rooms={rooms}/>
      <h2 style={{fontSize:15,fontWeight:700,margin:'24px 0 12px'}}>Guest-raised housekeeping requests</h2>
      <AllRequests requests={requests} onAdvance={()=>{}} compact/>
    </div>
  );
}

const HK_TASK_CFG = {
  PENDING:     { label:'Pending',      cls:'req-new' },
  IN_PROGRESS: { label:'In progress',  cls:'req-preparing' },
  DONE:        { label:'Cleaned',      cls:'req-confirmed' },
  INSPECTED:   { label:'Inspected',    cls:'req-done' },
};

function HousekeepingBoard({hotelId,rooms}) {
  const [tasks,setTasks] = useState([]);
  const [showForm,setShowForm] = useState(false);
  const [form,setForm] = useState({roomId:'',priority:'NORMAL',notes:''});

  const load = () => { if (hotelId) housekeepingApi.list(hotelId).then(res=>setTasks(res.data.data||[])).catch(()=>{}); };
  useEffect(load, [hotelId]);

  const act = (fn) => fn.then(load).catch(()=>alert('Action failed'));

  const raiseTask = async (e) => {
    e.preventDefault();
    if (!form.roomId) return;
    try {
      await housekeepingApi.markDirty(form.roomId, form.priority, form.notes);
      setForm({roomId:'',priority:'NORMAL',notes:''});
      setShowForm(false);
      load();
    } catch { alert('Could not create task'); }
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10}}>
        <button className="btn-room-action" onClick={()=>setShowForm(s=>!s)}><Plus size={12}/> Flag room dirty</button>
      </div>
      {showForm && (
        <form onSubmit={raiseTask} className="admin-table-card" style={{padding:14,display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end',marginBottom:14}}>
          <select value={form.roomId} onChange={e=>setForm({...form,roomId:e.target.value})} style={{height:34,padding:'0 10px',borderRadius:8,border:'1px solid var(--gray-200)'}}>
            <option value="">Room…</option>
            {(rooms||[]).map(r=><option key={r.id} value={r.id}>{r.number}</option>)}
          </select>
          <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} style={{height:34,padding:'0 10px',borderRadius:8,border:'1px solid var(--gray-200)'}}>
            <option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
          </select>
          <input placeholder="Notes (optional)" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={{height:34,padding:'0 10px',borderRadius:8,border:'1px solid var(--gray-200)',flex:1,minWidth:160}}/>
          <button type="submit" className="btn-room-action">Create task</button>
        </form>
      )}
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Room</th><th>Status</th><th>Priority</th><th>Assigned to</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {tasks.map(task=>{
              const cfg = HK_TASK_CFG[task.status] || {label:task.status,cls:''};
              return (
                <tr key={task.id}>
                  <td className="admin-td-shop">{task.roomNumber}</td>
                  <td><span className={`req-status ${cfg.cls}`}>{cfg.label}</span></td>
                  <td>{task.priority}</td>
                  <td>
                    {task.assignedTo || <em style={{color:'var(--gray-400)'}}>Unassigned</em>}
                    {task.status==='PENDING' && (
                      <button className="btn-room-action" style={{marginLeft:6}} onClick={()=>{
                        const name = prompt('Assign to:'); if (name) act(housekeepingApi.assign(task.id,name));
                      }}>Assign</button>
                    )}
                  </td>
                  <td style={{fontSize:12}}>{new Date(task.createdAt).toLocaleString()}</td>
                  <td style={{display:'flex',gap:6}}>
                    {task.status==='PENDING'    && <button className="btn-room-action" onClick={()=>act(housekeepingApi.start(task.id))}>Start</button>}
                    {task.status==='IN_PROGRESS'&& <button className="btn-room-action" onClick={()=>act(housekeepingApi.complete(task.id))}>Mark clean</button>}
                    {task.status==='DONE'       && <button className="btn-room-action" onClick={()=>{
                      const name = prompt('Inspected by:'); if (name) act(housekeepingApi.inspect(task.id,name));
                    }}>Inspect</button>}
                  </td>
                </tr>
              );
            })}
            {tasks.length===0 && <tr><td colSpan={6} style={{textAlign:'center',color:'var(--gray-500)',padding:20}}>No housekeeping tasks</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ServicePage({title,requests,onAdvance}) {
  return (
    <div>
      <div className="page-header"><h1 className="page-title">{title}</h1><p className="page-subtitle">{requests.filter(r=>r.status!=='done').length} active</p></div>
      <AllRequests requests={requests} onAdvance={onAdvance} compact/>
    </div>
  );
}

const MT_TASK_CFG = {
  OPEN:        { label:'Open',         cls:'req-new' },
  IN_PROGRESS: { label:'In progress',  cls:'req-preparing' },
  DONE:        { label:'Resolved',     cls:'req-confirmed' },
};

export function MaintenancePage({requests,rooms,hotelId}) {
  return (
    <div>
      <div className="page-header"><h1 className="page-title">Maintenance</h1><p className="page-subtitle">Staff-assignable work orders.</p></div>
      <MaintenanceBoard hotelId={hotelId} rooms={rooms}/>
      <h2 style={{fontSize:15,fontWeight:700,margin:'24px 0 12px'}}>Guest-raised maintenance requests</h2>
      <AllRequests requests={requests} onAdvance={()=>{}} compact/>
    </div>
  );
}

export function MessagesPage({hotelId}) {
  const [inbox,setInbox] = useState([]);
  const [openRoom,setOpenRoom] = useState(null);
  const [thread,setThread] = useState([]);
  const [reply,setReply] = useState('');
  const [sending,setSending] = useState(false);

  const loadInbox = () => { if (hotelId) hotelOpsApi.messageInbox(hotelId).then(res=>setInbox(res.data.data||[])).catch(()=>{}); };
  useEffect(loadInbox, [hotelId]);

  const openThread = (room) => {
    setOpenRoom(room);
    hotelOpsApi.messageThread(hotelId, room).then(res=>{ setThread(res.data.data||[]); loadInbox(); }).catch(()=>{});
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await hotelOpsApi.replyToRoom(hotelId, openRoom, { message: reply });
      setReply('');
      openThread(openRoom);
    } catch { alert('Could not send reply'); }
    finally { setSending(false); }
  };

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Messages</h1><p className="page-subtitle">Two-way messages with guests, by room.</p></div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Room</th><th>From</th><th>Last message</th><th>When</th><th></th></tr></thead>
          <tbody>
            {inbox.map(m=>(
              <tr key={m.id}>
                <td className="admin-td-shop">{m.roomNumber}</td>
                <td>{m.sender==='GUEST' ? (m.guestName||'Guest') : 'Front Desk'}</td>
                <td>{m.message}</td>
                <td style={{fontSize:12}}>{new Date(m.createdAt).toLocaleString()}</td>
                <td><button className="btn-room-action" onClick={()=>openThread(m.roomNumber)}>Open</button></td>
              </tr>
            ))}
            {inbox.length===0 && <tr><td colSpan={5} style={{textAlign:'center',color:'var(--gray-500)',padding:20}}>No messages yet</td></tr>}
          </tbody>
        </table>
      </div>

      {openRoom && (
        <div className="admin-table-card" style={{padding:16,marginTop:16}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
            <strong>Room {openRoom}</strong>
            <button className="btn-room-action" onClick={()=>setOpenRoom(null)}>Close</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:300,overflowY:'auto',marginBottom:12}}>
            {thread.map(m=>(
              <div key={m.id} style={{alignSelf: m.sender==='STAFF' ? 'flex-end' : 'flex-start', maxWidth:'70%'}}>
                <div style={{background: m.sender==='STAFF' ? 'var(--green-darker)' : 'var(--gray-100)', color: m.sender==='STAFF' ? '#fff' : '#111', padding:'8px 12px', borderRadius:10, fontSize:13}}>
                  {m.message}
                </div>
                <div style={{fontSize:10,color:'var(--gray-400)',marginTop:2,textAlign: m.sender==='STAFF' ? 'right' : 'left'}}>{new Date(m.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {thread.length===0 && <div style={{textAlign:'center',color:'var(--gray-400)',fontSize:13,padding:12}}>No messages in this thread yet</div>}
          </div>
          <form onSubmit={sendReply} style={{display:'flex',gap:8}}>
            <input placeholder="Type a reply…" value={reply} onChange={e=>setReply(e.target.value)} style={{height:34,padding:'0 10px',borderRadius:8,border:'1px solid var(--gray-200)',flex:1}}/>
            <button type="submit" className="btn-room-action" style={{background:'var(--blue)',color:'#fff',border:'none'}} disabled={sending}>{sending?'Sending…':'Send'}</button>
          </form>
        </div>
      )}
    </div>
  );
}

function MaintenanceBoard({hotelId,rooms}) {
  const [tasks,setTasks] = useState([]);
  const [showForm,setShowForm] = useState(false);
  const [form,setForm] = useState({roomId:'',title:'',priority:'NORMAL',notes:''});

  const load = () => { if (hotelId) maintenanceApi.list(hotelId).then(res=>setTasks(res.data.data||[])).catch(()=>{}); };
  useEffect(load, [hotelId]);

  const act = (fn) => fn.then(load).catch(()=>alert('Action failed'));

  const raiseTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      await maintenanceApi.raise(hotelId, form.roomId || null, form.title, form.notes, form.priority);
      setForm({roomId:'',title:'',priority:'NORMAL',notes:''});
      setShowForm(false);
      load();
    } catch { alert('Could not create task'); }
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10}}>
        <button className="btn-room-action" onClick={()=>setShowForm(s=>!s)}><Plus size={12}/> Raise work order</button>
      </div>
      {showForm && (
        <form onSubmit={raiseTask} className="admin-table-card" style={{padding:14,display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end',marginBottom:14}}>
          <select value={form.roomId} onChange={e=>setForm({...form,roomId:e.target.value})} style={{height:34,padding:'0 10px',borderRadius:8,border:'1px solid var(--gray-200)'}}>
            <option value="">Room (optional)…</option>
            {(rooms||[]).map(r=><option key={r.id} value={r.id}>{r.number}</option>)}
          </select>
          <input placeholder="Title (e.g. Lobby AC not cooling)" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={{height:34,padding:'0 10px',borderRadius:8,border:'1px solid var(--gray-200)',flex:1,minWidth:180}}/>
          <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} style={{height:34,padding:'0 10px',borderRadius:8,border:'1px solid var(--gray-200)'}}>
            <option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
          </select>
          <input placeholder="Notes (optional)" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={{height:34,padding:'0 10px',borderRadius:8,border:'1px solid var(--gray-200)',flex:1,minWidth:160}}/>
          <button type="submit" className="btn-room-action">Create work order</button>
        </form>
      )}
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Title</th><th>Room</th><th>Status</th><th>Priority</th><th>Assigned to</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {tasks.map(task=>{
              const cfg = MT_TASK_CFG[task.status] || {label:task.status,cls:''};
              return (
                <tr key={task.id}>
                  <td className="admin-td-shop">{task.title}</td>
                  <td>{task.roomNumber || <em style={{color:'var(--gray-400)'}}>—</em>}</td>
                  <td><span className={`req-status ${cfg.cls}`}>{cfg.label}</span></td>
                  <td>{task.priority}</td>
                  <td>
                    {task.assignedTo || <em style={{color:'var(--gray-400)'}}>Unassigned</em>}
                    {task.status==='OPEN' && (
                      <button className="btn-room-action" style={{marginLeft:6}} onClick={()=>{
                        const name = prompt('Assign to:'); if (name) act(maintenanceApi.assign(task.id,name));
                      }}>Assign</button>
                    )}
                  </td>
                  <td style={{fontSize:12}}>{new Date(task.createdAt).toLocaleString()}</td>
                  <td style={{display:'flex',gap:6}}>
                    {task.status==='OPEN'        && <button className="btn-room-action" onClick={()=>act(maintenanceApi.start(task.id))}>Start</button>}
                    {task.status==='IN_PROGRESS' && <button className="btn-room-action" onClick={()=>act(maintenanceApi.complete(task.id))}>Mark done</button>}
                  </td>
                </tr>
              );
            })}
            {tasks.length===0 && <tr><td colSpan={7} style={{textAlign:'center',color:'var(--gray-500)',padding:20}}>No maintenance work orders</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SpaPage({bookings,outlets,hotelId,onUpdate}) {
  const { lang } = useLang();
  // Don't rely solely on the parent's one-shot outlets fetch (loaded once on
  // dashboard mount, no retry) — refetch independently, same pattern as
  // OutletsPage, so a transient failure there doesn't permanently hide a real
  // spa outlet.
  const [ownOutlets,setOwnOutlets] = useState(outlets||[]);
  useEffect(() => {
    if (!hotelId) return;
    hotelOutletApi.list(hotelId).then(res => setOwnOutlets(res.data.data || [])).catch(() => {});
  }, [hotelId]);
  useEffect(() => { if (outlets?.length) setOwnOutlets(outlets); }, [outlets]);

  const spaOutletIds = new Set(ownOutlets.filter(o=>o.outletType==='SPA').map(o=>o.id));
  const spaBookings = (bookings||[]).filter(b=>spaOutletIds.has(b.outletId));
  return (
    <div>
      <div className="page-header"><h1 className="page-title">{t('spa', lang)}</h1><p className="page-subtitle">{spaBookings.filter(b=>b.status!=='COMPLETED'&&b.status!=='CANCELLED').length} active booking{spaBookings.filter(b=>b.status!=='COMPLETED'&&b.status!=='CANCELLED').length===1?'':'s'}</p></div>
      {spaOutletIds.size===0 ? (
        <div style={{textAlign:'center',padding:32,color:'var(--gray-400)',fontSize:13}}>No spa outlet set up yet. Add one from the Outlets tab (type "SPA").</div>
      ) : (
        <BookingsView bookings={spaBookings} onUpdate={onUpdate} compact/>
      )}
    </div>
  );
}

export function QRManagementPage({rooms,setRooms,outlets,hotelId,hotelName}) {
  const { lang } = useLang();
  const navigate = useNavigate();
  const toggleRoomQR = (room) => {
    const next = !room.qrActive;
    setRooms(prev=>prev.map(r=>r.id!==room.id?r:{...r,qrActive:next}));
    hotelApi.toggleRoomQr(room.id, next).catch(() => {
      setRooms(prev=>prev.map(r=>r.id!==room.id?r:{...r,qrActive:!next}));
      alert('Could not update QR status');
    });
  };

  // Same independent-refetch fix as SpaPage/HotelReportsTab — don't rely solely
  // on the parent's one-shot outlets fetch.
  const [outletList,setOutletList] = useState(outlets);
  useEffect(()=>{ if (outlets?.length) setOutletList(outlets); }, [outlets]);
  useEffect(() => {
    if (!hotelId) return;
    hotelOutletApi.list(hotelId).then(res => setOutletList(res.data.data || [])).catch(() => {});
  }, [hotelId]);
  const toggleOutletQr = (o) => hotelOutletApi.toggleQr(o.id, !o.qrActive)
    .then(()=>setOutletList(prev=>prev.map(x=>x.id!==o.id?x:{...x,qrActive:!o.qrActive})))
    .catch(() => alert('Could not update QR status'));

  return (
    <div>
      <div className="page-header"><h1 className="page-title">{t('groupQR', lang)}</h1><p className="page-subtitle">{rooms.filter(r=>r.qrActive).length}/{rooms.length} room QRs active · {outletList.filter(o=>o.qrActive).length}/{outletList.length} outlet QRs active</p></div>

      <div className="sub-section-header" style={{fontSize:13,fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Main Hotel QR</div>
      <HotelQR hotelId={hotelId} hotelName={hotelName}/>

      <RoomQrGrid rooms={rooms} outlets={outletList.filter(o=>o.shopId)} hotelId={hotelId} hotelName={hotelName} toggleRoomQR={toggleRoomQR}/>

      <QrScanAnalytics hotelId={hotelId}/>

      <div className="sub-section-header" style={{fontSize:13,fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Outlets</div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Outlet</th><th>Type</th><th>QR Active</th><th></th></tr></thead>
          <tbody>
            {outletList.map(o=>(
              <tr key={o.id}>
                <td style={{fontWeight:600}}>{o.name}</td>
                <td>{o.outletType?.replace('_',' ')}</td>
                <td><button className={`toggle-btn ${o.qrActive?'toggle-on':'toggle-off'}`} onClick={()=>toggleOutletQr(o)}>{o.qrActive?<ToggleRight size={18}/>:<ToggleLeft size={18}/>}</button></td>
                <td>
                  {o.shopId
                    ? <button className="btn-room-action" onClick={()=>navigate(`/hotel/outlets/${o.id}/qr-codes`)}><QrCode size={12}/> QR Codes</button>
                    : <span style={{fontSize:11,color:'var(--gray-400)'}}>No linked shop</span>}
                </td>
              </tr>
            ))}
            {outletList.length===0 && <tr><td colSpan={4} style={{textAlign:'center',color:'var(--gray-400)',padding:20}}>No outlets yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Card grid for every room's QR — one list call (getHotelQrCodes) instead of a
// find-or-create round trip per room, plus a "Generate missing" and a batch
// tent-card print flow so front-office isn't stuck opening RoomQrModal one
// room at a time for a whole floor/property.
function RoomQrGrid({ rooms, outlets, hotelId, hotelName, toggleRoomQR }) {
  const [qrMap, setQrMap] = useState({});       // roomNumber -> qr row from qr-service
  const [qrImgs, setQrImgs] = useState({});     // roomNumber -> thumbnail data-URL
  const [loadingList, setLoadingList] = useState(true);
  const [qrRoom, setQrRoom] = useState(null);
  const [serviceQrRoom, setServiceQrRoom] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);

  const loadList = () => {
    if (!hotelId) return;
    setLoadingList(true);
    hotelApi.getHotelQrCodes(hotelId)
      .then(res => {
        const map = {};
        // The list has no guaranteed order, and a regenerated room keeps its
        // deactivated old row (for scan history) alongside the new one — sort
        // by createdAt first so the newest row per room always wins the map.
        (res.data.data || [])
          .filter(q => q.type === 'HOTEL_ROOM')
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          .forEach(q => { map[q.groupParam] = q; });
        setQrMap(map);
        setQrImgs({});
      })
      .catch(() => {})
      .finally(() => setLoadingList(false));
  };
  useEffect(loadList, [hotelId]);

  useEffect(() => {
    Object.entries(qrMap).forEach(([roomNumber, qr]) => {
      if (qrImgs[roomNumber] || !qr.qrCode) return;
      QRCode.toDataURL(qrApi.redirectUrl(qr.qrCode), { width: 160, margin: 1, color: { dark: '#0F172A', light: '#ffffff' } })
        .then(img => setQrImgs(prev => ({ ...prev, [roomNumber]: img })))
        .catch(() => {});
    });
  }, [qrMap]);

  const missingRooms = rooms.filter(r => !qrMap[r.number]);
  const totalScans = Object.values(qrMap).reduce((n, q) => n + (q.scanCount || 0), 0);

  const generateAll = async () => {
    if (missingRooms.length === 0) return;
    setGeneratingAll(true);
    try {
      await Promise.all(missingRooms.map(r => hotelApi.createRoomQr(r.id)));
      loadList();
    } catch { alert('Some QR codes could not be generated'); }
    finally { setGeneratingAll(false); }
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,marginBottom:8}}>
        <div className="sub-section-header" style={{fontSize:13,fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'.06em'}}>
          Rooms {totalScans > 0 && `· ${totalScans.toLocaleString('en-IN')} total scans`}
        </div>
        <div style={{display:'flex',gap:8}}>
          {missingRooms.length > 0 && (
            <button className="btn btn-secondary" onClick={generateAll} disabled={generatingAll}>
              {generatingAll ? 'Generating…' : `Generate ${missingRooms.length} missing QR${missingRooms.length===1?'':'s'}`}
            </button>
          )}
          <button className="btn btn-primary" onClick={()=>setBatchOpen(true)} disabled={rooms.length===0}>
            <Printer size={13}/> Batch Print All Rooms
          </button>
        </div>
      </div>

      {loadingList ? (
        <div className="admin-table-card" style={{padding:24,textAlign:'center',color:'var(--gray-400)',fontSize:13,marginBottom:20}}>Loading room QR codes…</div>
      ) : rooms.length === 0 ? (
        <div className="admin-table-card" style={{padding:20,textAlign:'center',color:'var(--gray-400)',marginBottom:20}}>No rooms yet.</div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:12,marginBottom:20}}>
          {rooms.map(r => {
            const qr = qrMap[r.number];
            return (
              <div key={r.id} className="admin-chart-card" style={{padding:12,display:'flex',flexDirection:'column',gap:8,alignItems:'center',textAlign:'center'}}>
                <div style={{width:88,height:88,background:'var(--gray-100)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',cursor:'pointer'}} onClick={()=>setQrRoom(r)}>
                  {qrImgs[r.number]
                    ? <img src={qrImgs[r.number]} alt={`Room ${r.number} QR`} width={88} height={88}/>
                    : <QrCode size={28} color="var(--gray-400)"/>}
                </div>
                <div style={{fontWeight:700,fontSize:13}}>Room {r.number}</div>
                <div style={{fontSize:11,color:'var(--gray-400)'}}>{r.type}</div>
                {qr && (
                  <div style={{fontSize:11,color:'var(--gray-500)',display:'flex',alignItems:'center',gap:4}}>
                    <Eye size={11}/> {(qr.scanCount||0).toLocaleString('en-IN')} scans
                  </div>
                )}
                <button className={`toggle-btn ${r.qrActive?'toggle-on':'toggle-off'}`} onClick={()=>toggleRoomQR(r)}>
                  {r.qrActive?<ToggleRight size={16}/>:<ToggleLeft size={16}/>}
                </button>
                <button className="btn-room-action" style={{width:'100%'}} onClick={()=>setQrRoom(r)}>
                  {qr ? 'Manage QR' : 'Generate QR'}
                </button>
                {outlets?.length > 0 && (
                  <button className="btn-room-action" style={{width:'100%'}} onClick={()=>setServiceQrRoom(r)}>
                    🍽 Room Service QR
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {qrRoom && <RoomQrModal room={qrRoom} onClose={()=>{ setQrRoom(null); loadList(); }}/>}
      {serviceQrRoom && <RoomServiceQrModal room={serviceQrRoom} outlets={outlets} onClose={()=>setServiceQrRoom(null)}/>}
      {batchOpen && <BatchRoomQrPrint rooms={rooms} qrMap={qrMap} hotelName={hotelName} onClose={()=>{ setBatchOpen(false); loadList(); }}/>}
    </div>
  );
}

// Lets an admin pick which outlet a room's room-service QR should point to, then
// generates/reuses the QR — mirrors RoomQrModal's display/download/print/copy-link
// skeleton, with an outlet picker added before generation ("one QR, one linked target").
function RoomServiceQrModal({ room, outlets, onClose }) {
  const [outletId, setOutletId] = useState(outlets[0]?.id || '');
  const [qrImg, setQrImg] = useState('');
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = (id) => {
    if (!id) return;
    setLoading(true); setError(''); setQr(null); setQrImg('');
    hotelOutletApi.createRoomServiceQr(id, room.id)
      .then(res => setQr(res.data.data || null))
      .catch(() => setError('Could not generate QR code'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { generate(outletId); }, [outletId, room.id]);

  const scanUrl = qr?.qrCode ? qrApi.redirectUrl(qr.qrCode) : qr?.targetUrl;

  useEffect(() => {
    if (!scanUrl) return;
    QRCode.toDataURL(scanUrl, { width: 400, margin: 2, color: { dark: '#0F172A', light: '#ffffff' } })
      .then(setQrImg).catch(() => {});
  }, [scanUrl]);

  const download = () => {
    if (!qrImg) return;
    const a = document.createElement('a');
    a.href = qrImg;
    a.download = `room-${room.number}-service-qr.png`;
    a.click();
  };

  const copyLink = () => {
    if (!scanUrl) return;
    navigator.clipboard?.writeText(scanUrl).then(
      () => alert(`Room service QR link copied:\n${scanUrl}`),
      () => prompt('Copy this room service QR link:', scanUrl)
    );
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:16,padding:20,width:'92%',maxWidth:360,textAlign:'center'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:16}}>Room {room.number} · Room Service QR</div>
          <button onClick={onClose} style={{background:'var(--gray-100)',border:'none',borderRadius:8,padding:6,cursor:'pointer'}}><X size={18}/></button>
        </div>

        <select value={outletId} onChange={e=>setOutletId(e.target.value)} style={{width:'100%',padding:8,borderRadius:8,border:'1px solid var(--gray-200)',marginBottom:14}}>
          {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>

        {loading ? (
          <p style={{fontSize:13,color:'var(--gray-400)',padding:'40px 0'}}>Generating…</p>
        ) : error ? (
          <p style={{fontSize:13,color:'#DC2626',padding:'40px 0'}}>{error}</p>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:14,alignItems:'center'}}>
            {qrImg ? <img src={qrImg} alt="Room Service QR" style={{width:220,height:220,borderRadius:8}}/> : <div style={{width:220,height:220,background:'var(--gray-100)',borderRadius:8}}/>}
            <div style={{fontSize:12,color:'var(--gray-500)',display:'flex',alignItems:'center',gap:5}}>
              <Eye size={13}/> {(qr?.scanCount || 0).toLocaleString('en-IN')} scans
            </div>
            <div style={{fontSize:11.5,color:'var(--gray-400)',fontFamily:'monospace',wordBreak:'break-all'}}>{scanUrl}</div>
            <div style={{display:'flex',gap:8,width:'100%'}}>
              <button className="btn-refresh" style={{flex:1,justifyContent:'center'}} onClick={download}><Download size={14}/> Download</button>
              <button className="btn-refresh" style={{flex:1,justifyContent:'center'}} onClick={()=>window.print()}><Printer size={14}/> Print</button>
            </div>
            <button className="btn-room-action" style={{width:'100%'}} onClick={copyLink}>🔗 Copy Link</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Scans-over-time trend, most-scanned rooms, and a recent-activity log — reads
// the qr-service scan data that resolveAndTrack has been writing all along but
// nothing previously surfaced (only running totals per QR were shown before).
function QrScanAnalytics({ hotelId }) {
  const [trend, setTrend] = useState([]);
  const [byRoom, setByRoom] = useState([]);
  const [recent, setRecent] = useState([]);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!hotelId) return;
    setLoading(true);
    Promise.all([
      hotelApi.qrScanTrend(hotelId, days).then(r => r.data.data || []).catch(() => []),
      hotelApi.qrScansByRoom(hotelId).then(r => r.data.data || []).catch(() => []),
      hotelApi.qrRecentScans(hotelId, 20).then(r => r.data.data || []).catch(() => []),
    ]).then(([t, r, rec]) => { setTrend(t); setByRoom(r); setRecent(rec); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [hotelId, days]);

  const totalInPeriod = trend.reduce((n, d) => n + Number(d.count || 0), 0);
  const maxCount = Math.max(1, ...trend.map(d => Number(d.count || 0)));
  const hasRoomScans = byRoom.some(r => Number(r.total || 0) > 0);

  const deviceLabel = (ua) => {
    if (!ua) return 'Unknown device';
    if (/ipad/i.test(ua)) return '📱 iPad';
    if (/iphone/i.test(ua)) return '📱 iPhone';
    if (/android/i.test(ua)) return '📱 Android';
    if (/windows/i.test(ua)) return '💻 Windows';
    if (/macintosh/i.test(ua)) return '💻 Mac';
    return '🖥️ Other';
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <div className="sub-section-header" style={{fontSize:13,fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'.06em'}}>
          Scan Analytics
        </div>
        <select className="form-input" style={{width:150}} value={days} onChange={e=>setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {loading ? (
        <div className="admin-table-card" style={{padding:24,textAlign:'center',color:'var(--gray-400)',fontSize:13,marginBottom:20}}>Loading scan analytics…</div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:16,marginBottom:16}}>
          <div className="admin-chart-card">
            <div style={{fontSize:12,color:'var(--gray-500)',marginBottom:10}}>
              {totalInPeriod.toLocaleString('en-IN')} scans in the last {days} days
            </div>
            {trend.length === 0 ? (
              <div style={{fontSize:13,color:'var(--gray-400)',padding:'20px 0',textAlign:'center'}}>No scans in this period.</div>
            ) : (
              <div style={{display:'flex',alignItems:'flex-end',gap:4,height:110}}>
                {trend.map(d => (
                  <div key={d.day} title={`${d.day}: ${d.count} scans`} style={{flex:1,display:'flex',alignItems:'flex-end',justifyContent:'center',height:'100%'}}>
                    <div style={{width:'100%',maxWidth:24,background:'var(--blue)',borderRadius:'3px 3px 0 0',height:`${Math.max(4,(Number(d.count)/maxCount)*100)}%`}}/>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-table-card" style={{padding:0}}>
            <table className="admin-table">
              <thead><tr><th>Room</th><th>Total scans</th></tr></thead>
              <tbody>
                {hasRoomScans
                  ? byRoom.filter(r => Number(r.total || 0) > 0).map(r => (
                      <tr key={r.groupParam}>
                        <td style={{fontWeight:600}}>{r.label || `Room ${r.groupParam}`}</td>
                        <td>{Number(r.total).toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  : <tr><td colSpan={2} style={{textAlign:'center',color:'var(--gray-400)',padding:20}}>No room scans yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && recent.length > 0 && (
        <div className="admin-table-card" style={{marginBottom:20}}>
          <table className="admin-table">
            <thead><tr><th>When</th><th>QR</th><th>Device</th></tr></thead>
            <tbody>
              {recent.map((s, i) => (
                <tr key={i}>
                  <td>{new Date(s.scannedAt).toLocaleString('en-IN')}</td>
                  <td>{s.type === 'HOTEL' ? 'Main Hotel QR' : (s.label || `Room ${s.groupParam}`)}</td>
                  <td>{deviceLabel(s.userAgent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Generates (find-or-create for any room missing one) + prints a tent card for
// every room in one job — mirrors the shop side's Batch Print tab (QRCodes.jsx),
// reusing the same TentTemplate/THEMES and print portal/CSS.
function BatchRoomQrPrint({ rooms, qrMap, hotelName, onClose }) {
  const [theme, setTheme] = useState('green');
  const [tagline, setTagline] = useState('Scan for Room Service · Enjoy your stay!');
  const [wifiOn, setWifiOn] = useState(false);
  const [wifiName, setWifiName] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [contactOn, setContactOn] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [preparing, setPreparing] = useState(true);
  const [cards, setCards] = useState([]); // [{ number, img }]

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPreparing(true);
      let map = qrMap;
      const missing = rooms.filter(r => !map[r.number]);
      if (missing.length) {
        const created = await Promise.all(missing.map(r =>
          hotelApi.createRoomQr(r.id).then(res => [r.number, res.data.data]).catch(() => null)));
        map = { ...map };
        created.forEach(pair => { if (pair) map[pair[0]] = pair[1]; });
      }
      const imgs = await Promise.all(rooms.map(async r => {
        const qr = map[r.number];
        if (!qr?.qrCode) return null;
        const img = await QRCode.toDataURL(qrApi.redirectUrl(qr.qrCode), { width: 300, margin: 2, color: { dark: THEMES[theme].qrDark, light: '#ffffff' } });
        return { number: r.number, img };
      }));
      if (!cancelled) { setCards(imgs.filter(Boolean)); setPreparing(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const design = {
    theme, shopName: hotelName || 'Our Hotel', tagline, subLabel: 'Room',
    discountOn: false, newItemOn: false, wifiOn, wifiName, wifiPass,
    contactOn, contactPhone, contactAddress: '', contactWebsite: '',
    footerOn: true, footerText: 'Enjoy your stay!',
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div className="admin-chart-card" style={{maxWidth:760,width:'92%',maxHeight:'88vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:16}}>Batch Print — All Room QR Codes ({rooms.length})</div>
          <button onClick={onClose} style={{background:'var(--gray-100)',border:'none',borderRadius:8,padding:6,cursor:'pointer'}}><X size={18}/></button>
        </div>

        <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:12}}>
          <div className="form-field">
            <label className="form-label">Theme</label>
            <select className="form-input" value={theme} onChange={e=>setTheme(e.target.value)}>
              {Object.entries(THEMES).map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </div>
          <div className="form-field" style={{flex:1,minWidth:200}}>
            <label className="form-label">Tagline</label>
            <input className="form-input" value={tagline} onChange={e=>setTagline(e.target.value)}/>
          </div>
        </div>

        <div style={{display:'flex',gap:16,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13}}>
            <input type="checkbox" checked={wifiOn} onChange={e=>setWifiOn(e.target.checked)}/> 📶 WiFi details
          </label>
          {wifiOn && <>
            <input className="form-input" style={{width:140}} placeholder="Network name" value={wifiName} onChange={e=>setWifiName(e.target.value)}/>
            <input className="form-input" style={{width:140}} placeholder="Password" value={wifiPass} onChange={e=>setWifiPass(e.target.value)}/>
          </>}
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13}}>
            <input type="checkbox" checked={contactOn} onChange={e=>setContactOn(e.target.checked)}/> 📞 Room service number
          </label>
          {contactOn && <input className="form-input" style={{width:180}} placeholder="e.g. Dial 0 for reception" value={contactPhone} onChange={e=>setContactPhone(e.target.value)}/>}
        </div>

        {preparing ? (
          <div style={{padding:32,textAlign:'center',color:'var(--gray-400)'}}>Generating {rooms.length} QR codes…</div>
        ) : (
          <>
            <div className="qrd-batch-preview-grid">
              {cards.map(c => (
                <div key={c.number} className="qrd-batch-card-wrap">
                  <TentTemplate d={{ ...design, tableNum: c.number }} qrImg={c.img} compact/>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginTop:14}} onClick={()=>window.print()} disabled={cards.length===0}>
              <Printer size={14}/> Print All {cards.length} Room Cards
            </button>
          </>
        )}
      </div>

      {createPortal(
        <div id="qr-print-zone">
          {!preparing && (
            <div className="qr-print-batch-grid">
              {cards.map(c => (
                <TentTemplate key={c.number} d={{ ...design, tableNum: c.number }} qrImg={c.img}/>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// One QR for the whole hotel (lobby/front-desk) — mirrors Supplier's Main Brand QR
// and Mall's Food Court QR. Guests land on GuestServices.jsx with no room context.
function HotelQR({ hotelId, hotelName }) {
  const [qrImg, setQrImg] = useState('');
  const [qr, setQr] = useState(null); // { qrCode, targetUrl, scanCount, id }
  const [designing, setDesigning] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const load = () => {
    if (!hotelId) return;
    hotelApi.createHotelQr(hotelId)
      .then(res => setQr(res.data.data || null))
      .catch(() => setQr({ targetUrl: `${window.location.origin}/hotel-services/${hotelId}` }));
  };
  useEffect(load, [hotelId]);

  // Scannable link tracked by qr-service (/r/{code}) so scans actually increment
  // scanCount — falls back to the raw targetUrl if the QR row has no slug yet.
  const scanUrl = qr?.qrCode ? qrApi.redirectUrl(qr.qrCode) : qr?.targetUrl;

  useEffect(() => {
    if (!scanUrl) return;
    QRCode.toDataURL(scanUrl, { width: 512, margin: 2, color: { dark: '#0F172A', light: '#ffffff' } })
      .then(setQrImg).catch(err => console.error('Hotel QR generation failed:', err));
  }, [scanUrl]);

  const download = () => {
    if (!qrImg) return;
    const a = document.createElement('a');
    a.href = qrImg;
    a.download = `${(hotelName || 'hotel')}-qr.png`.replace(/\s+/g, '-');
    a.click();
  };

  const regenerate = () => {
    if (!confirm('This creates a new QR code and permanently deactivates the current one — any printed copies of the old QR will stop working. Continue?')) return;
    setRegenerating(true);
    hotelApi.regenerateHotelQr(hotelId)
      .then(res => setQr(res.data.data || null))
      .catch(() => alert('Could not regenerate QR code'))
      .finally(() => setRegenerating(false));
  };

  return (
    <div className="admin-chart-card" style={{ maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
      {qrImg ? <img src={qrImg} alt="Hotel QR" style={{ width: 200, height: 200, borderRadius: 8 }} /> : <div style={{ width: 200, height: 200, background: 'var(--gray-100)', borderRadius: 8 }} />}
      <div style={{ fontSize: 12, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 5 }}>
        <Eye size={13} /> {(qr?.scanCount || 0).toLocaleString('en-IN')} scans
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--gray-400)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{scanUrl}</div>
      <button className="btn-primary" style={{ width: '100%' }} onClick={download}>Download PNG</button>
      <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setDesigning(true)}>
        🎨 Design Banner & Print
      </button>
      <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={regenerate} disabled={regenerating || !qr?.id}>
        <RefreshCw size={13} /> {regenerating ? 'Regenerating…' : 'Regenerate QR'}
      </button>
      {designing && (
        <QrPosterStudio
          open={designing}
          onClose={() => setDesigning(false)}
          targetUrlOverride={scanUrl}
          nameDefault={hotelName || 'Our Hotel'}
          taglineDefault="Scan to explore our services · Enjoy your stay!"
        />
      )}
    </div>
  );
}

export function HotelReportsTab({outlets,hotelId}) {
  const { lang } = useLang();
  const [revenueData,setRevenueData] = useState([]);
  const [loading,setLoading] = useState(true);
  // Same independent-refetch fix as SpaPage/QRManagementPage.
  const [ownOutlets,setOwnOutlets] = useState(outlets||[]);
  useEffect(() => { if (outlets?.length) setOwnOutlets(outlets); }, [outlets]);
  useEffect(() => {
    if (!hotelId) return;
    hotelOutletApi.list(hotelId).then(res => setOwnOutlets(res.data.data || [])).catch(() => {});
  }, [hotelId]);

  useEffect(() => {
    if (!ownOutlets.length) { setLoading(false); return; }
    setLoading(true);
    // Every outlet is tracked, not just ones with a linked shop — an outlet with
    // no shopId still counts, just with ₹0 revenue since there's no shop-service
    // order data to query for it (was previously silently excluded, undercounting).
    Promise.all(
      ownOutlets.map(o => {
        if (!o.shopId) return Promise.resolve({ outletName: o.name, total: 0 });
        // The hotel owner's own login token has no shopId, so report-service's
        // same-shop check 403s a direct call — mint an outlet-scoped token first,
        // same mechanism used when "managing" an outlet from the Outlets tab.
        return hotelOutletApi.enter(o.id)
          .then(res => reportApi.getRevenue(o.shopId, 7, res.data.data.accessToken))
          .then(res => {
            const data = res.data.data || [];
            const total = Array.isArray(data) ? data.reduce((a,d)=>a+(d.revenue||d.totalRevenue||0),0) : 0;
            return { outletName: o.name, total };
          })
          .catch(() => ({ outletName: o.name, total: 0 }));
      })
    ).then(setRevenueData).finally(()=>setLoading(false));
  }, [ownOutlets]);

  if (loading) return <div style={{textAlign:'center',padding:40,color:'var(--gray-400)'}}>Loading reports…</div>;

  const grandTotal = revenueData.reduce((a,r)=>a+r.total,0);

  return (
    <div>
      <div className="page-header"><h1 className="page-title">{t('reports', lang)}</h1><p className="page-subtitle">Last 7 days · all outlets</p></div>
      <div className="admin-kpi-grid" style={{marginBottom:20}}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-icon icon-green"><TrendingUp size={18}/></div>
          <div className="admin-kpi-value">₹{grandTotal.toLocaleString('en-IN')}</div>
          <div className="admin-kpi-label">Total revenue (7 days)</div>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-icon icon-blue"><Store size={18}/></div>
          <div className="admin-kpi-value">{revenueData.length}</div>
          <div className="admin-kpi-label">Outlets tracked</div>
        </div>
      </div>
      {revenueData.length===0 ? (
        <div style={{textAlign:'center',padding:32,color:'var(--gray-400)',fontSize:13}}>No outlets yet.</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead><tr><th>Outlet</th><th>Revenue (7 days)</th><th>Share</th></tr></thead>
            <tbody>
              {revenueData.map(r=>(
                <tr key={r.outletName}>
                  <td style={{fontWeight:700}}>{r.outletName}</td>
                  <td style={{fontWeight:700}}>₹{r.total.toLocaleString('en-IN')}</td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{flex:1,height:6,background:'var(--gray-100)',borderRadius:99,overflow:'hidden'}}>
                        <div style={{width:`${grandTotal?(r.total/grandTotal)*100:0}%`,height:'100%',background:'var(--green)',borderRadius:99}}/>
                      </div>
                      <span style={{fontSize:12,fontWeight:700,minWidth:36}}>{grandTotal?((r.total/grandTotal)*100).toFixed(1):0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const SERVICE_OPTIONS = [
  {l:'Room Service',      v:'ROOM_SERVICE'},
  {l:'Laundry',           v:'LAUNDRY'},
  {l:'Spa',                v:'SPA'},
  {l:'Housekeeping',      v:'HOUSEKEEPING'},
  {l:'Maintenance',       v:'MAINTENANCE'},
  {l:'Airport Transport', v:'TRANSPORT'},
];

export function HotelSettings({user,lang,hotelId}) {
  const [form,setForm] = useState({hotelName:user?.hotelName||'',phone:'',email:'',address:'',checkinTime:'14:00',checkoutTime:'12:00',currency:'INR',taxPercent:'18',latitude:null,longitude:null});
  const [enabledServices,setEnabledServices] = useState([]);
  const [saving,setSaving] = useState(false);
  const [locating,setLocating] = useState(false);
  const [locErr,setLocErr] = useState('');
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  useEffect(() => {
    if (!hotelId) return;
    hotelApi.getMyHotels().then(res => {
      const hotel = (res.data.data||[]).find(h=>h.id===hotelId);
      if (!hotel) return;
      setForm(f=>({...f,hotelName:hotel.name||f.hotelName,phone:hotel.phone||'',email:hotel.email||'',address:hotel.address||'',checkinTime:hotel.checkInTime||f.checkinTime,checkoutTime:hotel.checkOutTime||f.checkoutTime,latitude:hotel.latitude??null,longitude:hotel.longitude??null}));
      setEnabledServices(hotel.enabledServices||[]);
    }).catch(()=>{});
  }, [hotelId]);

  const toggleService = (v) => setEnabledServices(prev => prev.includes(v) ? prev.filter(s=>s!==v) : [...prev, v]);

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) { setLocErr('Location not available in this browser'); return; }
    setLocating(true); setLocErr('');
    navigator.geolocation.getCurrentPosition(
      pos => { setForm(f=>({...f,latitude:pos.coords.latitude,longitude:pos.coords.longitude})); setLocating(false); },
      () => { setLocErr('Could not get your location'); setLocating(false); },
      { timeout: 8000 }
    );
  };

  const save = async () => {
    if (!hotelId) return;
    setSaving(true);
    try {
      await hotelApi.update(hotelId, {
        name: form.hotelName, phone: form.phone, email: form.email, address: form.address,
        latitude: form.latitude, longitude: form.longitude,
        checkInTime: form.checkinTime, checkOutTime: form.checkoutTime,
        enabledServices,
      });
      alert('Settings saved');
    } catch { alert('Could not save settings'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div className="page-header"><h1 className="page-title">{t('settings',lang)}</h1></div>
      <div className="admin-chart-card">
        <h3 style={{marginBottom:16}}>Hotel profile</h3>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[['hotelName','Hotel name'],['phone','Phone'],['email','Email'],['address','Address'],['checkinTime','Check-in time'],['checkoutTime','Check-out time'],['currency','Currency'],['taxPercent','Tax %']].map(([k,label])=>(
            <div key={k} className="form-field">
              <label className="form-label">{label}</label>
              <input className="form-input" value={form[k]} onChange={e=>set(k,e.target.value)}/>
            </div>
          ))}
        </div>
        <div style={{marginTop:14,display:'flex',alignItems:'center',gap:10}}>
          <button className="btn btn-secondary" onClick={useCurrentLocation} disabled={locating} style={{display:'flex',alignItems:'center',gap:6,fontSize:12.5}}>
            {locating ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <MapPin size={14}/>}
            {locating ? 'Getting location…' : form.latitude != null ? 'Location captured ✓' : 'Use current location'}
          </button>
          {locErr && <span style={{color:'#DC2626',fontSize:12}}>{locErr}</span>}
        </div>
        <div style={{marginTop:14,display:'flex',justifyContent:'flex-end'}}>
          <button className="btn btn-primary" onClick={save} disabled={saving}><Save size={14}/> {saving?'Saving…':t('save',lang)}</button>
        </div>
      </div>
      <div className="admin-chart-card">
        <h3 style={{marginBottom:12}}>Enabled services</h3>
        <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
          {SERVICE_OPTIONS.map(s=>{
            const on = enabledServices.includes(s.v);
            return (
              <div key={s.l} style={{display:'flex',alignItems:'center',gap:8,background:'var(--gray-50)',padding:'8px 14px',borderRadius:'var(--radius-md)',border:'1px solid var(--gray-200)'}}>
                <span style={{fontSize:13,fontWeight:600}}>{s.l}</span>
                <button className={`toggle-btn ${on?'toggle-on':'toggle-off'}`} onClick={()=>toggleService(s.v)}>{on?<ToggleRight size={18}/>:<ToggleLeft size={18}/>}</button>
              </div>
            );
          })}
        </div>
        <p style={{fontSize:12,color:'var(--gray-400)',marginTop:10}}>Changes here are saved together with the profile — click Save above.</p>
      </div>
    </div>
  );
}
