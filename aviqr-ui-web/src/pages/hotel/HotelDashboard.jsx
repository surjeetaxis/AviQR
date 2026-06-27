import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { hotelApi } from '../../api/index.js';
import { LangPicker, useLang } from '../../components/shared/LangPicker.jsx';
import { t } from '../../i18n/translations.js';
import SubscriptionPage from '../../components/shared/SubscriptionPage.jsx';
import {
  Hotel, BedDouble, UtensilsCrossed, Shirt, Sparkles, Wrench,
  Bell, BarChart2, Settings, LogOut, Menu as MenuIcon, CheckCircle2,
  Clock, AlertCircle, Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
  Star, Phone, Save, X, Coffee, Car, RefreshCw
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
  {key:'rooms',       label:'Rooms',            icon:BedDouble},
  {key:'roomservice', label:'Room Service Menu',icon:UtensilsCrossed},
  {key:'housekeeping',label:'Housekeeping',     icon:Sparkles},
  {key:'laundry',     label:'Laundry',          icon:Shirt},
  {key:'maintenance', label:'Maintenance',      icon:Wrench},
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

export default function HotelDashboard() {
  const { user, logout } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    hotelApi.getMyHotels()
      .then(res => {
        const hotels = res.data.data || [];
        const hotelId = hotels[0]?.id;
        if (!hotelId) { setLoadingData(false); return; }
        return Promise.allSettled([
          hotelApi.getRooms(hotelId),
          hotelApi.getRequests(hotelId, { status: 'new,preparing,confirmed' }),
        ]).then(([rRes, reqRes]) => {
          if (rRes.status === 'fulfilled') {
            const r = rRes.value.data.data || [];
            if (r.length) setRooms(r);
          }
          if (reqRes.status === 'fulfilled') {
            const req = reqRes.value.data.data || [];
            if (req.length) setRequests(req);
          }
        });
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, []);

  const advanceRequest = id => {
    setRequests(prev=>prev.map(r=>{
      if(r.id!==id) return r;
      const next = {new:'preparing',preparing:'done',confirmed:'done'};
      return {...r, status:next[r.status]||r.status};
    }));
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
              <n.icon size={16}/> <span>{t(n.key,lang)||n.label}</span>
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
            <div className="admin-avatar sm" style={{background:'var(--purple)'}}>{user?.avatar}</div>
          </div>
        </header>
        <main className="admin-content">
          {tab==='overview'     && <HotelOverview rooms={rooms} requests={requests} onAdvance={advanceRequest} onNav={setTab}/>}
          {tab==='requests'     && <AllRequests requests={requests} onAdvance={advanceRequest}/>}
          {tab==='rooms'        && <RoomsPage rooms={rooms} setRooms={setRooms}/>}
          {tab==='roomservice'  && <RoomServiceMenu menu={ROOM_MENU}/>}
          {tab==='housekeeping' && <HousekeepingPage requests={requests.filter(r=>r.service==='Housekeeping')}/>}
          {tab==='laundry'      && <ServicePage title="Laundry" requests={requests.filter(r=>r.service==='Laundry')} onAdvance={advanceRequest}/>}
          {tab==='maintenance'  && <ServicePage title="Maintenance" requests={requests.filter(r=>r.service==='Maintenance')} onAdvance={advanceRequest}/>}
          {tab==='subscription' && <SubscriptionPage userRole="hotel" currentPlan="pro"/>}
          {tab==='settings'     && <HotelSettings user={user} lang={lang}/>}
        </main>
      </div>
    </div>
  );
}

function HotelOverview({rooms,requests,onAdvance,onNav}) {
  const occupied = rooms.filter(r=>r.status==='occupied').length;
  const activeReqs = requests.filter(r=>r.status!=='done').length;
  const urgentReqs = requests.filter(r=>r.priority==='high'&&r.status!=='done').length;
  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div className="page-header">
        <div><h1 className="page-title">Hotel Overview</h1><p className="page-subtitle">{occupied}/{rooms.length} rooms occupied · live</p></div>
        <button className="btn-refresh" onClick={()=>onNav('requests')}><Bell size={13}/> {activeReqs} active requests</button>
      </div>
      {urgentReqs>0&&<div className="support-alert-banner"><AlertCircle size={16}/><span><strong>{urgentReqs} urgent request{urgentReqs>1?'s':''}</strong> need immediate attention.</span><button className="support-alert-action" onClick={()=>onNav('requests')}>View all →</button></div>}
      <div className="hotel-services-grid">
        {[
          {label:'Rooms occupied',value:`${occupied}/${rooms.length}`,icon:BedDouble,color:'green'},
          {label:'Active requests',value:activeReqs,icon:Bell,color:'amber'},
          {label:'Room service orders',value:requests.filter(r=>r.service==='Room Service').length,icon:UtensilsCrossed,color:'blue'},
          {label:'Maintenance open',value:requests.filter(r=>r.service==='Maintenance'&&r.status!=='done').length,icon:Wrench,color:'red'},
        ].map(k=>(
          <div key={k.label} className="admin-kpi-card">
            <div className={`admin-kpi-icon icon-${k.color}`}><k.icon size={18}/></div>
            <div className="admin-kpi-value">{k.value}</div>
            <div className="admin-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>
      <AllRequests requests={requests.slice(0,4)} onAdvance={onAdvance} compact/>
    </div>
  );
}

function AllRequests({requests,onAdvance,compact}) {
  return (
    <div>
      {!compact&&<div className="page-header"><h1 className="page-title">Guest Requests</h1><span className="req-live-badge">● Live</span></div>}
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

function RoomsPage({rooms,setRooms}) {
  const [filter,setFilter] = useState('all');
  const toggleQR = id => setRooms(prev=>prev.map(r=>r.id!==id?r:{...r,qrActive:!r.qrActive}));
  const filtered = filter==='all'?rooms:rooms.filter(r=>r.status===filter);
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Rooms</h1><p className="page-subtitle">{rooms.length} total · {rooms.filter(r=>r.status==='occupied').length} occupied</p></div>
        <button className="btn-refresh"><Plus size={13}/> Add room</button>
      </div>
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
                <button className={`toggle-btn ${room.qrActive?'toggle-on':'toggle-off'}`} onClick={()=>toggleQR(room.id)}>
                  {room.qrActive?<ToggleRight size={20}/>:<ToggleLeft size={20}/>}
                </button>
              </div>
              <div style={{display:'flex',gap:6,marginTop:8}}>
                <button className="btn-room-action">📋 Requests</button>
                <button className="btn-room-action">🔗 QR Link</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoomServiceMenu({menu:initialMenu}) {
  const [menu,setMenu] = useState(initialMenu);
  const toggleAvail = id => setMenu(prev=>prev.map(m=>m.id!==id?m:{...m,available:!m.available}));
  const cats = [...new Set(menu.map(m=>m.cat))];
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Room Service Menu</h1><p className="page-subtitle">{menu.filter(m=>m.available).length} available items</p></div>
        <button className="btn-refresh"><Plus size={13}/> Add item</button>
      </div>
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
                        <button className="admin-row-btn"><Edit2 size={12}/></button>
                        <button className="admin-row-btn admin-row-btn-danger"><Trash2 size={12}/></button>
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

function HousekeepingPage({requests}) {
  return (
    <div>
      <div className="page-header"><h1 className="page-title">Housekeeping</h1></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:20}}>
        {['Clean','Dirty','In Progress','Inspected'].map(s=>(
          <div key={s} className="admin-kpi-card" style={{textAlign:'center'}}>
            <div style={{fontSize:28,marginBottom:8}}>{s==='Clean'?'✅':s==='Dirty'?'🔴':s==='In Progress'?'🔄':'🔍'}</div>
            <div className="admin-kpi-value">{s==='Clean'?'18':s==='Dirty'?'8':s==='In Progress'?'4':'6'}</div>
            <div className="admin-kpi-label">Rooms {s}</div>
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
      <AllRequests requests={requests} onAdvance={onAdvance}/>
    </div>
  );
}

function HotelSettings({user,lang}) {
  const [form,setForm] = useState({hotelName:user?.hotelName||'Grand Palace Hotel',phone:user?.phone||'',email:user?.email||'',address:'Chennai, Tamil Nadu',checkinTime:'14:00',checkoutTime:'12:00',currency:'INR',taxPercent:'18'});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
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
          <button className="btn btn-primary"><Save size={14}/> {t('save',lang)}</button>
        </div>
      </div>
      <div className="admin-chart-card">
        <h3 style={{marginBottom:12}}>Enabled services</h3>
        <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
          {[{l:'Room Service',on:true},{l:'Laundry',on:true},{l:'Spa',on:true},{l:'Housekeeping',on:true},{l:'Maintenance',on:true},{l:'Airport Transport',on:false}].map(s=>(
            <div key={s.l} style={{display:'flex',alignItems:'center',gap:8,background:'var(--gray-50)',padding:'8px 14px',borderRadius:'var(--radius-md)',border:'1px solid var(--gray-200)'}}>
              <span style={{fontSize:13,fontWeight:600}}>{s.l}</span>
              <button className={`toggle-btn ${s.on?'toggle-on':'toggle-off'}`}>{s.on?<ToggleRight size={18}/>:<ToggleLeft size={18}/>}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
