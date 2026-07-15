import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { hotelApi, hotelOpsApi, hotelOutletApi, hotelAccessApi, reportApi } from '../../api/index.js';
import { LangPicker, useLang } from '../../components/shared/LangPicker.jsx';
import { t } from '../../i18n/translations.js';
import SubscriptionPage from '../../components/shared/SubscriptionPage.jsx';
import ProfileMenu from '../../components/shared/ProfileMenu.jsx';
import QrPosterStudio from '../../components/shared/QrPosterStudio.jsx';
import QRCode from 'qrcode';
import {
  Hotel, BedDouble, UtensilsCrossed, Shirt, Sparkles, Wrench,
  Bell, BarChart2, Settings, LogOut, Menu as MenuIcon, CheckCircle2,
  Clock, AlertCircle, Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
  Star, Phone, Save, X, Coffee, Car, RefreshCw, Store, UserCog, QrCode,
  Users, Flower2, TrendingUp, Eye, Download, Printer
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
  {key:'overview',    label:'Overview',         icon:BarChart2},
  {key:'requests',    label:'Guest Requests',   icon:Bell, badge:3},
  {key:'bookings',    label:'Bookings',         icon:Star},
  {key:'guests',      label:'Guests',           icon:Users},
  {key:'outlets',     label:'Outlets',          icon:Store},
  {key:'hotelstaff',  label:'Hotel Staff',      icon:UserCog},
  {key:'rooms',       label:'Rooms',            icon:BedDouble},
  {key:'roomservice', label:'Room Service Menu',icon:UtensilsCrossed},
  {key:'housekeeping',label:'Housekeeping',     icon:Sparkles},
  {key:'laundry',     label:'Laundry',          icon:Shirt},
  {key:'spa',         label:'Spa',              icon:Flower2},
  {key:'maintenance', label:'Maintenance',      icon:Wrench},
  {key:'qrmanagement',label:'QR Management',    icon:QrCode},
  {key:'reports',     label:'Reports',          icon:TrendingUp},
  {key:'subscription',label:'Subscription',     icon:Star},
  {key:'settings',    label:'Settings',         icon:Settings},
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
  const [bookings, setBookings] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

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
        const hid = hotels[0]?.id;
        if (!hid) { setLoadingData(false); return; }
        setHotelId(hid);
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

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen?'open':''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <Hotel size={18} style={{color:'#C4B5FD'}}/>
            <span className="admin-brand-name">Avi<em>QR</em></span>
            <span className="admin-role-tag hotel-tag">HOTEL</span>
          </div>
        </div>
        <div className="admin-user-card">
          <div className="admin-avatar" style={{background:'var(--purple)'}}>{user?.avatar||'GP'}</div>
          <div>
            <div className="admin-user-name">{user?.hotelName||'Grand Palace Hotel'}</div>
            <div className="admin-user-role">Hotel Owner · {rooms.length} rooms</div>
          </div>
        </div>
        <nav className="admin-nav">
          {NAV.map(n=>(
            <button key={n.key} className={`admin-nav-item ${tab===n.key?'active':''}`} onClick={()=>{setTab(n.key);setSidebarOpen(false);}}>
              <n.icon size={16}/> <span>{n.label}</span>
              {n.badge && <span className="support-nav-badge">{n.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button className="admin-logout" onClick={()=>{logout();navigate('/')}}><LogOut size={14}/> {t('logout',lang)}</button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-mobile-menu" onClick={()=>setSidebarOpen(o=>!o)}><MenuIcon size={20}/></button>
          <span style={{fontWeight:700,fontSize:15}}>{user?.hotelName||'Grand Palace Hotel'}</span>
          <div style={{display:'flex',alignItems:'center',gap:10,marginLeft:'auto'}}>
            <LangPicker/>
            <ProfileMenu
              name={user?.name}
              email={user?.email}
              avatar={user?.avatar}
              avatarColor="var(--purple)"
              onLogout={() => { logout(); navigate('/'); }}
              items={[
                { label:'Profile & Settings', icon:Settings, onClick:() => setTab('settings') },
                ...(hotelId ? [{ label:'Preview guest page', icon:Eye, onClick:() => navigate(`/hotel-services/${hotelId}`) }] : []),
                { label:'Onboarding guide', icon:Sparkles, onClick:() => navigate('/onboarding') },
              ]}
            />
          </div>
        </header>
        <main className="admin-content">
          {tab==='overview'     && <HotelOverview rooms={rooms} requests={requests} bookings={bookings} onAdvance={advanceRequest} onNav={setTab}/>}
          {tab==='requests'     && <AllRequests requests={roomFilter ? requests.filter(r=>r.room===roomFilter) : requests} onAdvance={advanceRequest} roomFilter={roomFilter} onClearFilter={()=>setRoomFilter(null)}/>}
          {tab==='bookings'     && <BookingsView bookings={bookings} onUpdate={updateBooking}/>}
          {tab==='guests'       && <GuestsPage rooms={rooms} bookings={bookings}/>}
          {tab==='outlets'      && <OutletsPage hotelId={hotelId}/>}
          {tab==='hotelstaff'   && <HotelStaffPage hotelId={hotelId}/>}
          {tab==='rooms'        && <RoomsPage rooms={rooms} setRooms={setRooms} hotelId={hotelId} onNav={setTab} onRequestsFilter={setRoomFilter}/>}
          {tab==='roomservice'  && <RoomServiceMenu menu={ROOM_MENU}/>}
          {tab==='housekeeping' && <HousekeepingPage requests={requests.filter(r=>r.service==='Housekeeping')} rooms={rooms}/>}
          {tab==='laundry'      && <ServicePage title="Laundry" requests={requests.filter(r=>r.service==='Laundry')} onAdvance={advanceRequest}/>}
          {tab==='spa'          && <SpaPage bookings={bookings} outlets={outlets} hotelId={hotelId} onUpdate={updateBooking}/>}
          {tab==='maintenance'  && <ServicePage title="Maintenance" requests={requests.filter(r=>r.service==='Maintenance')} onAdvance={advanceRequest}/>}
          {tab==='qrmanagement' && <QRManagementPage rooms={rooms} setRooms={setRooms} outlets={outlets} hotelId={hotelId} hotelName={user?.hotelName}/>}
          {tab==='reports'      && <HotelReportsTab outlets={outlets} hotelId={hotelId}/>}
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

function HotelOverview({rooms,requests,bookings,onAdvance,onNav}) {
  const [billRoom, setBillRoom] = useState(null);
  const occupied = rooms.filter(r=>r.status==='occupied');
  const activeReqs = requests.filter(r=>r.status!=='done').length;
  const urgentReqs = requests.filter(r=>r.priority==='high'&&r.status!=='done').length;
  const inHouseGuests = occupied.filter(r=>r.guest);
  const checkingOutToday = inHouseGuests.filter(r=>isToday(r.checkOut));
  const checkingInToday = inHouseGuests.filter(r=>isToday(r.checkIn));
  const upcomingBookingsToday = (bookings||[]).filter(b=>b.status!=='COMPLETED'&&b.status!=='CANCELLED');

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div className="page-header">
        <div><h1 className="page-title">Hotel Overview</h1><p className="page-subtitle">{occupied.length}/{rooms.length} rooms occupied · live</p></div>
        <button className="btn-refresh" onClick={()=>onNav('requests')}><Bell size={13}/> {activeReqs} active requests</button>
      </div>
      {urgentReqs>0&&<div className="support-alert-banner"><AlertCircle size={16}/><span><strong>{urgentReqs} urgent request{urgentReqs>1?'s':''}</strong> need immediate attention.</span><button className="support-alert-action" onClick={()=>onNav('requests')}>View all →</button></div>}
      <div className="hotel-services-grid">
        {[
          {label:'Rooms occupied',value:`${occupied.length}/${rooms.length}`,icon:BedDouble,color:'green'},
          {label:'Guests in-house',value:inHouseGuests.length,icon:Phone,color:'blue'},
          {label:'Checking out today',value:checkingOutToday.length,icon:Clock,color:'amber'},
          {label:'Active requests',value:activeReqs,icon:Bell,color:'amber'},
          {label:'Maintenance open',value:requests.filter(r=>r.service==='Maintenance'&&r.status!=='done').length,icon:Wrench,color:'red'},
        ].map(k=>(
          <div key={k.label} className="admin-kpi-card">
            <div className={`admin-kpi-icon icon-${k.color}`}><k.icon size={18}/></div>
            <div className="admin-kpi-value">{k.value}</div>
            <div className="admin-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {checkingOutToday.length>0 && (
        <div>
          <div className="sub-section-header" style={{fontSize:13,fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Checking out today</div>
          <div className="requests-list">
            {checkingOutToday.map(r=>(
              <div key={r.id} className="request-row">
                <div className="req-room">Room {r.number}</div>
                <div className="req-info">
                  <div className="req-service">{r.guest}</div>
                  <div className="req-item">{r.type} · {r.floor} · Out: {r.checkOut}</div>
                </div>
                <button className="req-action-btn" onClick={()=>setBillRoom(r)}>View bill</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="sub-section-header" style={{fontSize:13,fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Guests in-house ({inHouseGuests.length})</div>
        {inHouseGuests.length===0 ? (
          <div style={{textAlign:'center',padding:24,color:'var(--gray-400)',fontSize:13}}>No guests currently checked in.</div>
        ) : (
          <div className="admin-table-card">
            <table className="admin-table">
              <thead><tr><th>Guest</th><th>Room</th><th>Check-in</th><th>Check-out</th><th></th></tr></thead>
              <tbody>
                {inHouseGuests.map(r=>(
                  <tr key={r.id}>
                    <td style={{fontWeight:600}}>{r.guest}</td>
                    <td>{r.number} · {r.type}</td>
                    <td>{r.checkIn}</td>
                    <td>{isToday(r.checkOut) ? <strong style={{color:'var(--amber,#B45309)'}}>{r.checkOut} · Today</strong> : r.checkOut}</td>
                    <td><button className="btn-room-action" onClick={()=>setBillRoom(r)}>💳 Bill</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(checkingInToday.length>0 || upcomingBookingsToday.length>0) && (
        <div className="hotel-services-grid">
          {checkingInToday.length>0 && (
            <div className="admin-kpi-card">
              <div className="admin-kpi-icon icon-green"><CheckCircle2 size={18}/></div>
              <div className="admin-kpi-value">{checkingInToday.length}</div>
              <div className="admin-kpi-label">Checking in today</div>
            </div>
          )}
          {upcomingBookingsToday.length>0 && (
            <div className="admin-kpi-card">
              <div className="admin-kpi-icon icon-blue"><Star size={18}/></div>
              <div className="admin-kpi-value">{upcomingBookingsToday.length}</div>
              <div className="admin-kpi-label">Active outlet bookings</div>
            </div>
          )}
        </div>
      )}

      <AllRequests requests={requests.slice(0,4)} onAdvance={onAdvance} compact/>
      {billRoom && <RoomBillModal room={billRoom} onClose={()=>setBillRoom(null)}/>}
    </div>
  );
}

function AllRequests({requests,onAdvance,compact,roomFilter,onClearFilter}) {
  return (
    <div>
      {!compact&&<div className="page-header"><h1 className="page-title">Guest Requests</h1><span className="req-live-badge">● Live</span></div>}
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

function BookingsView({bookings,onUpdate,compact}) {
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
      {!compact&&<div className="page-header"><h1 className="page-title">Outlet Bookings</h1><span className="req-live-badge">● Live</span></div>}
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

function GuestsPage({rooms,bookings}) {
  const occupied = rooms.filter(r=>r.status==='occupied' && r.guest);
  const checkingIn = occupied.filter(r=>isToday(r.checkIn));
  const checkingOut = occupied.filter(r=>isToday(r.checkOut));
  const activeBookings = (bookings||[]).filter(b=>b.status!=='COMPLETED'&&b.status!=='CANCELLED');

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Guests</h1><p className="page-subtitle">{occupied.length} in-house · {checkingIn.length} checking in today · {checkingOut.length} checking out today</p></div></div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Guest</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Status</th></tr></thead>
          <tbody>
            {occupied.map(r=>(
              <tr key={r.id}>
                <td style={{fontWeight:600}}>{r.guest}</td>
                <td>{r.number} · {r.type}</td>
                <td>{isToday(r.checkIn) ? <strong style={{color:'var(--green-darker)'}}>{r.checkIn} · Today</strong> : r.checkIn}</td>
                <td>{isToday(r.checkOut) ? <strong style={{color:'var(--amber,#B45309)'}}>{r.checkOut} · Today</strong> : r.checkOut}</td>
                <td><span className="status-pill st-active"><CheckCircle2 size={11}/> In-house</span></td>
              </tr>
            ))}
            {occupied.length===0 && <tr><td colSpan={5} style={{textAlign:'center',color:'var(--gray-400)',padding:24}}>No guests currently checked in.</td></tr>}
          </tbody>
        </table>
      </div>
      {activeBookings.length>0 && (
        <div style={{marginTop:20}}>
          <div className="sub-section-header" style={{fontSize:13,fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Active outlet bookings</div>
          <div className="requests-list">
            {activeBookings.map(b=>(
              <div key={b.id} className="request-row">
                <div className="req-room">Room {b.roomNumber}</div>
                <div className="req-info">
                  <div className="req-service">{b.guestName || 'Guest'} · {b.outletName}</div>
                  <div className="req-item">{b.serviceName} · {fmtBookingDate(b.bookingDate)} at {b.bookingTime}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const OUTLET_TYPES = ['RESTAURANT','BAR','SPA','GYM','POOL','SHOP','ACTIVITY','BANQUET','KIDS_CLUB','BUSINESS_CENTER','LAUNDRY','CONCIERGE','OTHER'];

function OutletsPage({hotelId}) {
  const navigate = useNavigate();
  const [outlets,setOutlets] = useState([]);
  const [loading,setLoading] = useState(true);
  const [showForm,setShowForm] = useState(false);
  const [form,setForm] = useState({name:'',outletType:'RESTAURANT',location:''});
  const [saving,setSaving] = useState(false);

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
        <div><h1 className="page-title">Outlets</h1><p className="page-subtitle">{outlets.length} outlet{outlets.length!==1?'s':''} · each gets its own menu, staff, billing &amp; loyalty</p></div>
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
                <button className="btn-room-action admin-row-btn-danger" onClick={()=>remove(o)}><Trash2 size={12}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const HOTEL_ROLES = ['GENERAL_MANAGER','OUTLET_MANAGER','STAFF'];

function HotelStaffPage({hotelId}) {
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
      <div className="page-header"><h1 className="page-title">Hotel Staff</h1><p className="page-subtitle">Hotel-wide roles — separate from an individual outlet's own staff</p></div>

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

function RoomsPage({rooms,setRooms,hotelId,onNav,onRequestsFilter}) {
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
        <div><h1 className="page-title">Rooms</h1><p className="page-subtitle">{rooms.length} total · {rooms.filter(r=>r.status==='occupied').length} occupied</p></div>
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
  const [targetUrl,setTargetUrl] = useState('');
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [designing,setDesigning] = useState(false);

  useEffect(() => {
    hotelApi.createRoomQr(room.id)
      .then(res => setTargetUrl(res.data.data?.targetUrl || ''))
      .catch(() => setError('Could not generate QR code'))
      .finally(() => setLoading(false));
  }, [room.id]);

  useEffect(() => {
    if (!targetUrl) return;
    QRCode.toDataURL(targetUrl, { width: 400, margin: 2, color: { dark: '#0F172A', light: '#ffffff' } })
      .then(setQrImg).catch(() => {});
  }, [targetUrl]);

  const download = () => {
    if (!qrImg) return;
    const a = document.createElement('a');
    a.href = qrImg;
    a.download = `room-${room.number}-qr.png`;
    a.click();
  };

  const copyLink = () => {
    if (!targetUrl) return;
    navigator.clipboard?.writeText(targetUrl).then(
      () => alert(`Guest QR link copied:\n${targetUrl}`),
      () => prompt('Copy this guest QR link:', targetUrl)
    );
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
            <div style={{fontSize:11.5,color:'var(--gray-400)',fontFamily:'monospace',wordBreak:'break-all'}}>{targetUrl}</div>
            <div style={{display:'flex',gap:8,width:'100%'}}>
              <button className="btn-refresh" style={{flex:1,justifyContent:'center'}} onClick={download}><Download size={14}/> Download</button>
              <button className="btn-refresh" style={{flex:1,justifyContent:'center'}} onClick={()=>window.print()}><Printer size={14}/> Print</button>
            </div>
            <button className="btn-room-action" style={{width:'100%'}} onClick={copyLink}>🔗 Copy Link</button>
            <button className="btn-room-action" style={{width:'100%'}} onClick={()=>setDesigning(true)}>🎨 Design Banner & Print</button>
          </div>
        )}
      </div>
      {designing && (
        <QrPosterStudio
          open={designing}
          onClose={()=>setDesigning(false)}
          targetUrlOverride={targetUrl}
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

function RoomServiceMenu({menu:initialMenu}) {
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
        <div><h1 className="page-title">Room Service Menu</h1><p className="page-subtitle">{menu.filter(m=>m.available).length} available items</p></div>
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

function HousekeepingPage({requests,rooms}) {
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
      <div className="page-header"><h1 className="page-title">Housekeeping</h1><p className="page-subtitle">{(rooms||[]).length} rooms</p></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:20}}>
        {Object.entries(STATUS_META).map(([key,m])=>(
          <div key={key} className="admin-kpi-card" style={{textAlign:'center'}}>
            <div style={{fontSize:28,marginBottom:8}}>{m.icon}</div>
            <div className="admin-kpi-value">{counts[key]||0}</div>
            <div className="admin-kpi-label">Rooms {m.label}</div>
          </div>
        ))}
      </div>
      <AllRequests requests={requests} onAdvance={()=>{}} compact/>
    </div>
  );
}

function ServicePage({title,requests,onAdvance}) {
  return (
    <div>
      <div className="page-header"><h1 className="page-title">{title}</h1><p className="page-subtitle">{requests.filter(r=>r.status!=='done').length} active</p></div>
      <AllRequests requests={requests} onAdvance={onAdvance} compact/>
    </div>
  );
}

function SpaPage({bookings,outlets,hotelId,onUpdate}) {
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
      <div className="page-header"><h1 className="page-title">Spa</h1><p className="page-subtitle">{spaBookings.filter(b=>b.status!=='COMPLETED'&&b.status!=='CANCELLED').length} active booking{spaBookings.filter(b=>b.status!=='COMPLETED'&&b.status!=='CANCELLED').length===1?'':'s'}</p></div>
      {spaOutletIds.size===0 ? (
        <div style={{textAlign:'center',padding:32,color:'var(--gray-400)',fontSize:13}}>No spa outlet set up yet. Add one from the Outlets tab (type "SPA").</div>
      ) : (
        <BookingsView bookings={spaBookings} onUpdate={onUpdate} compact/>
      )}
    </div>
  );
}

function QRManagementPage({rooms,setRooms,outlets,hotelId,hotelName}) {
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
      <div className="page-header"><h1 className="page-title">QR Management</h1><p className="page-subtitle">{rooms.filter(r=>r.qrActive).length}/{rooms.length} room QRs active · {outletList.filter(o=>o.qrActive).length}/{outletList.length} outlet QRs active</p></div>

      <div className="sub-section-header" style={{fontSize:13,fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Main Hotel QR</div>
      <HotelQR hotelId={hotelId} hotelName={hotelName}/>

      <div className="sub-section-header" style={{fontSize:13,fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Rooms</div>
      <div className="admin-table-card" style={{marginBottom:20}}>
        <table className="admin-table">
          <thead><tr><th>Room</th><th>Type</th><th>Floor</th><th>QR Active</th></tr></thead>
          <tbody>
            {rooms.map(r=>(
              <tr key={r.id}>
                <td style={{fontWeight:600}}>Room {r.number}</td>
                <td>{r.type}</td>
                <td>{r.floor}</td>
                <td><button className={`toggle-btn ${r.qrActive?'toggle-on':'toggle-off'}`} onClick={()=>toggleRoomQR(r)}>{r.qrActive?<ToggleRight size={18}/>:<ToggleLeft size={18}/>}</button></td>
              </tr>
            ))}
            {rooms.length===0 && <tr><td colSpan={4} style={{textAlign:'center',color:'var(--gray-400)',padding:20}}>No rooms yet.</td></tr>}
          </tbody>
        </table>
      </div>

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

// One QR for the whole hotel (lobby/front-desk) — mirrors Supplier's Main Brand QR
// and Mall's Food Court QR. Guests land on GuestServices.jsx with no room context.
function HotelQR({ hotelId, hotelName }) {
  const [qrImg, setQrImg] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [designing, setDesigning] = useState(false);

  useEffect(() => {
    if (!hotelId) return;
    hotelApi.createHotelQr(hotelId)
      .then(res => setTargetUrl(res.data.data?.targetUrl || `${window.location.origin}/hotel-services/${hotelId}`))
      .catch(() => setTargetUrl(`${window.location.origin}/hotel-services/${hotelId}`));
  }, [hotelId]);

  useEffect(() => {
    if (!targetUrl) return;
    QRCode.toDataURL(targetUrl, { width: 512, margin: 2, color: { dark: '#0F172A', light: '#ffffff' } })
      .then(setQrImg).catch(err => console.error('Hotel QR generation failed:', err));
  }, [targetUrl]);

  const download = () => {
    if (!qrImg) return;
    const a = document.createElement('a');
    a.href = qrImg;
    a.download = `${(hotelName || 'hotel')}-qr.png`.replace(/\s+/g, '-');
    a.click();
  };

  return (
    <div className="admin-chart-card" style={{ maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
      {qrImg ? <img src={qrImg} alt="Hotel QR" style={{ width: 200, height: 200, borderRadius: 8 }} /> : <div style={{ width: 200, height: 200, background: 'var(--gray-100)', borderRadius: 8 }} />}
      <div style={{ fontSize: 11.5, color: 'var(--gray-400)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{targetUrl}</div>
      <button className="btn-primary" style={{ width: '100%' }} onClick={download}>Download PNG</button>
      <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setDesigning(true)}>
        🎨 Design Banner & Print
      </button>
      {designing && (
        <QrPosterStudio
          open={designing}
          onClose={() => setDesigning(false)}
          targetUrlOverride={targetUrl}
          nameDefault={hotelName || 'Our Hotel'}
          taglineDefault="Scan to explore our services · Enjoy your stay!"
        />
      )}
    </div>
  );
}

function HotelReportsTab({outlets,hotelId}) {
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
      <div className="page-header"><h1 className="page-title">Reports</h1><p className="page-subtitle">Last 7 days · all outlets</p></div>
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

function HotelSettings({user,lang,hotelId}) {
  const [form,setForm] = useState({hotelName:user?.hotelName||'',phone:'',email:'',address:'',checkinTime:'14:00',checkoutTime:'12:00',currency:'INR',taxPercent:'18'});
  const [enabledServices,setEnabledServices] = useState([]);
  const [saving,setSaving] = useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  useEffect(() => {
    if (!hotelId) return;
    hotelApi.getMyHotels().then(res => {
      const hotel = (res.data.data||[]).find(h=>h.id===hotelId);
      if (!hotel) return;
      setForm(f=>({...f,hotelName:hotel.name||f.hotelName,phone:hotel.phone||'',email:hotel.email||'',address:hotel.address||'',checkinTime:hotel.checkInTime||f.checkinTime,checkoutTime:hotel.checkOutTime||f.checkoutTime}));
      setEnabledServices(hotel.enabledServices||[]);
    }).catch(()=>{});
  }, [hotelId]);

  const toggleService = (v) => setEnabledServices(prev => prev.includes(v) ? prev.filter(s=>s!==v) : [...prev, v]);

  const save = async () => {
    if (!hotelId) return;
    setSaving(true);
    try {
      await hotelApi.update(hotelId, {
        name: form.hotelName, phone: form.phone, email: form.email, address: form.address,
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
