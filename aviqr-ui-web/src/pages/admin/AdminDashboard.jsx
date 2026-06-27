import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { LangPicker, useLang } from '../../components/shared/LangPicker.jsx';
import { t } from '../../i18n/translations.js';
import SubscriptionPage from '../../components/shared/SubscriptionPage.jsx';
import TierBadge from '../../components/shared/TierBadge.jsx';
import Pagination from '../../components/shared/Pagination.jsx';
import { shopApi } from '../../api/index.js';
import {
  Users, Store, ShoppingBag, CreditCard, QrCode, BarChart2,
  AlertCircle, Shield, LogOut, Settings, Search, Bell, Hotel,
  Building2, Package, TrendingUp, Eye, Trash2, CheckCircle2,
  XCircle, Edit2, UserCheck, Menu as MenuIcon, Plus, Filter,
  Download, RefreshCw, ChevronDown, ToggleLeft, ToggleRight,
  Lock, Unlock, Mail, Phone, Calendar, Globe, Star
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import '../admin/Admin.css';
import './AdminExtra.css';

const REVENUE_DATA = [
  {day:'Mon',gmv:184000},{day:'Tue',gmv:212000},{day:'Wed',gmv:178000},
  {day:'Thu',gmv:245000},{day:'Fri',gmv:312000},{day:'Sat',gmv:398000},{day:'Sun',gmv:356000},
];
const SIGNUP_DATA = [
  {day:'Mon',shops:12},{day:'Tue',shops:18},{day:'Wed',shops:9},
  {day:'Thu',shops:22},{day:'Fri',shops:31},{day:'Sat',shops:14},{day:'Sun',shops:11},
];

const ALL_USERS = [
  {id:'u1',name:'Sujeet Narayanan',email:'sujeet@spiceroute.in',phone:'9845012345',role:'owner',plan:'Growth',status:'active',shops:1,joined:'Jan 2025',lastLogin:'2 min ago',verified:true},
  {id:'u2',name:'Meena Pillai',email:'meena@coconut.in',phone:'9876500001',role:'owner',plan:'Business',status:'active',shops:2,joined:'Feb 2025',lastLogin:'1h ago',verified:true},
  {id:'u3',name:'Farhan Khan',email:'farhan@biryani.in',phone:'9988776600',role:'owner',plan:'Growth',status:'suspended',shops:1,joined:'Mar 2025',lastLogin:'3d ago',verified:true},
  {id:'u4',name:'Anjali Singh',email:'anjali@gmail.com',phone:'9876543210',role:'customer',plan:'-',status:'active',shops:0,joined:'Apr 2025',lastLogin:'10 min ago',verified:true},
  {id:'u5',name:'Vikram Sharma',email:'vikram@gmail.com',phone:'9900112233',role:'manager',plan:'-',status:'active',shops:0,joined:'Jan 2025',lastLogin:'5 min ago',verified:true},
  {id:'u6',name:'Ramesh Enterprises',email:'ramesh@teas.in',phone:'9988776655',role:'supplier',plan:'Growth',status:'active',shops:4,joined:'Dec 2024',lastLogin:'30 min ago',verified:true},
  {id:'u7',name:'Grand Palace Hotel',email:'gm@grandpalace.in',phone:'8011223344',role:'hotel',plan:'Pro',status:'active',shops:1,joined:'Nov 2024',lastLogin:'2h ago',verified:true},
  {id:'u8',name:'Forum Mall Admin',email:'admin@forum.in',phone:'7700112233',role:'mall',plan:'Pro',status:'active',shops:0,joined:'Oct 2024',lastLogin:'1d ago',verified:false},
  {id:'u9',name:'Priya Desai',email:'priya@gmail.com',phone:'9123456780',role:'customer',plan:'-',status:'inactive',shops:0,joined:'May 2025',lastLogin:'10d ago',verified:false},
  {id:'u10',name:'Arjun Nair',email:'arjun@aviqr.in',phone:'9111222333',role:'support',plan:'-',status:'active',shops:0,joined:'Jan 2025',lastLogin:'just now',verified:true},
];

const ALL_SHOPS = [
  {id:'s1',name:'Spice Route',owner:'Sujeet N',ownerEmail:'sujeet@spiceroute.in',plan:'Growth',orders:73,revenue:24680,items:42,qrs:3,status:'active',city:'Bengaluru',joined:'Jan 2025'},
  {id:'s2',name:'Chai & Chaat',owner:'Ankit J',ownerEmail:'ankit@chai.in',plan:'Starter',orders:28,revenue:7200,items:18,qrs:1,status:'active',city:'Pune',joined:'Feb 2025'},
  {id:'s3',name:'The Coconut Grove',owner:'Meena P',ownerEmail:'meena@coconut.in',plan:'Business',orders:142,revenue:86400,items:86,qrs:6,status:'active',city:'Kochi',joined:'Feb 2025'},
  {id:'s4',name:'Biryani House',owner:'Farhan K',ownerEmail:'farhan@biryani.in',plan:'Growth',orders:51,revenue:31200,items:31,qrs:2,status:'suspended',city:'Mumbai',joined:'Mar 2025'},
  {id:'s5',name:'Cake Studio',owner:'Priya M',ownerEmail:'priya@cake.in',plan:'Starter',orders:14,revenue:4800,items:24,qrs:1,status:'active',city:'Delhi',joined:'Apr 2025'},
];

const ALL_HOTELS = [
  {id:'h1',name:'Grand Palace Hotel',owner:'GP Admin',rooms:120,plan:'Pro',requests:24,status:'active',city:'Chennai'},
  {id:'h2',name:'The Leela Resort',owner:'Leela Admin',rooms:280,plan:'Resort Suite',requests:67,status:'active',city:'Goa'},
  {id:'h3',name:'Budget Inn',owner:'BI Admin',rooms:40,plan:'Hotel Basic',requests:8,status:'inactive',city:'Jaipur'},
];

const ALL_MALLS = [
  {id:'m1',name:'Forum Mall Bengaluru',admin:'Forum Admin',vendors:28,plan:'Mall Pro',orders:412,status:'active',city:'Bengaluru'},
  {id:'m2',name:'Phoenix Market City',admin:'Phoenix Admin',vendors:52,plan:'Enterprise',orders:891,status:'active',city:'Mumbai'},
];

const ROLES_ALL = ['owner','manager','cashier','kitchen','admin','support','supplier','hotel','mall','customer'];

const NAV = [
  {key:'overview',  label:'Overview',     icon:BarChart2},
  {key:'users',     label:'Users',        icon:Users,      badge:ALL_USERS.length},
  {key:'shops',     label:'Shops',        icon:Store},
  {key:'hotels',    label:'Hotels',       icon:Hotel},
  {key:'malls',     label:'Malls',        icon:Building2},
  {key:'suppliers', label:'Suppliers',    icon:Package},
  {key:'orders',    label:'Orders',       icon:ShoppingBag},
  {key:'payments',  label:'Payments',     icon:CreditCard},
  {key:'qrcodes',   label:'QR Codes',     icon:QrCode},
  {key:'reports',   label:'Reports',      icon:TrendingUp},
  {key:'subscription',label:'Subscription',icon:Star},
  {key:'settings',  label:'Settings',     icon:Settings},
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen?'open':''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <QrCode size={18} style={{color:'#5DCAA5'}}/>
            <span className="admin-brand-name">Avi<em>QR</em></span>
            <span className="admin-role-tag">ADMIN</span>
          </div>
        </div>
        <div className="admin-user-card">
          <div className="admin-avatar">{user?.avatar||'PM'}</div>
          <div>
            <div className="admin-user-name">{user?.name||'Super Admin'}</div>
            <div className="admin-user-role">Super Administrator</div>
          </div>
        </div>
        <nav className="admin-nav">
          {NAV.map(n=>(
            <button key={n.key} className={`admin-nav-item ${tab===n.key?'active':''}`}
              onClick={()=>{setTab(n.key);setSidebarOpen(false);}}>
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
          <div className="admin-topbar-search" style={{position:'relative'}}>
            <Search size={14} style={{position:'absolute',left:10,color:'var(--gray-400)'}}/>
            <input style={{paddingLeft:32}} placeholder={t('search',lang)}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginLeft:'auto'}}>
            <LangPicker/>
            <button className="admin-icon-btn"><Bell size={18}/></button>
            <div className="admin-avatar sm">{user?.avatar||'PM'}</div>
          </div>
        </header>

        <main className="admin-content">
          {tab==='overview'    && <AdminOverview data={REVENUE_DATA} signups={SIGNUP_DATA} onNav={setTab}/>}
          {tab==='users'       && <FullUsersPage users={ALL_USERS}/>}
          {tab==='shops'       && <FullShopsPage shops={ALL_SHOPS}/>}
          {tab==='hotels'      && <FullHotelsPage hotels={ALL_HOTELS}/>}
          {tab==='malls'       && <FullMallsPage malls={ALL_MALLS}/>}
          {tab==='subscription'&& <SubscriptionPage userRole="owner" currentPlan="growth"/>}
          {tab==='reports'     && <AdminReports/>}
          {tab==='settings'    && <AdminSettings/>}
          {!['overview','users','shops','hotels','malls','subscription','reports','settings'].includes(tab) && (
            <AdminStub label={NAV.find(n=>n.key===tab)?.label} icon={NAV.find(n=>n.key===tab)?.icon}/>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function AdminOverview({data,signups,onNav}) {
  return (
    <div className="admin-overview">
      <div className="page-header">
        <div><h1 className="page-title">Platform Overview</h1><p className="page-subtitle">All entities · real-time</p></div>
        <button className="btn-refresh"><RefreshCw size={13}/> Refresh</button>
      </div>
      <div className="admin-kpi-grid">
        {[
          {label:'Total shops',   value:'12,487', icon:Store,    color:'green', change:'+142 this week', onClick:()=>onNav('shops')},
          {label:'Total users',   value:'38,920', icon:Users,    color:'blue',  change:'+8.2%', onClick:()=>onNav('users')},
          {label:'Orders today',  value:'14,208', icon:ShoppingBag,color:'purple',change:'+12.4%', onClick:()=>onNav('orders')},
          {label:'GMV today',     value:'₹48.2L', icon:CreditCard,color:'amber', change:'+18.3%', onClick:()=>onNav('payments')},
          {label:'Hotels',        value:'284',    icon:Hotel,    color:'green', change:'+12 this week', onClick:()=>onNav('hotels')},
          {label:'Malls',         value:'47',     icon:Building2,color:'blue',  change:'+3 this week', onClick:()=>onNav('malls')},
          {label:'Suppliers',     value:'892',    icon:Package,  color:'purple',change:'+24 this week', onClick:()=>onNav('suppliers')},
          {label:'Active QR codes',value:'31,204',icon:QrCode,  color:'amber', change:'+580 this week', onClick:()=>onNav('qrcodes')},
        ].map(k=>(
          <button key={k.label} className="admin-kpi-card" style={{textAlign:'left',cursor:'pointer'}} onClick={k.onClick}>
            <div className={`admin-kpi-icon icon-${k.color}`}><k.icon size={18}/></div>
            <div className="admin-kpi-value">{k.value}</div>
            <div className="admin-kpi-label">{k.label}</div>
            <div className="admin-kpi-change">{k.change}</div>
          </button>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div className="admin-chart-card">
          <h3>Platform GMV — last 7 days</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data} margin={{top:4,right:4,left:-16,bottom:0}}>
              <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1D9E75" stopOpacity={0.28}/><stop offset="100%" stopColor="#1D9E75" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
              <XAxis dataKey="day" tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/100000).toFixed(1)}L`}/>
              <Tooltip contentStyle={{borderRadius:10,border:'1px solid #E5E7EB',fontSize:12}} formatter={v=>[`₹${v.toLocaleString('en-IN')}`,'GMV']}/>
              <Area type="monotone" dataKey="gmv" stroke="#1D9E75" strokeWidth={2.5} fill="url(#ag)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="admin-chart-card">
          <h3>New shop signups — last 7 days</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={signups} margin={{top:4,right:4,left:-16,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
              <XAxis dataKey="day" tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:10,border:'1px solid #E5E7EB',fontSize:12}}/>
              <Bar dataKey="shops" fill="#2563EB" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Full Users Page ──────────────────────────────────────────────────────────
function FullUsersPage({users: initialUsers}) {
  const [users,setUsers] = useState(initialUsers);
  const [search,setSearch] = useState('');
  const [roleFilter,setRoleFilter] = useState('all');
  const [statusFilter,setStatusFilter] = useState('all');
  const [editUser,setEditUser] = useState(null);
  const [showAdd,setShowAdd] = useState(false);

  const toggleStatus = id => setUsers(prev=>prev.map(u=>u.id!==id?u:{...u,status:u.status==='active'?'suspended':'active'}));
  const toggleVerify = id => setUsers(prev=>prev.map(u=>u.id!==id?u:{...u,verified:!u.verified}));
  const deleteUser = id => setUsers(prev=>prev.filter(u=>u.id!==id));
  const saveEdit = updated => { setUsers(prev=>prev.map(u=>u.id!==updated.id?u:updated)); setEditUser(null); };

  const filtered = users.filter(u=>{
    if(roleFilter!=='all' && u.role!==roleFilter) return false;
    if(statusFilter!=='all' && u.status!==statusFilter) return false;
    if(search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.includes(search) && !u.phone.includes(search)) return false;
    return true;
  });

  const ROLE_COLORS = {owner:'green',manager:'blue',cashier:'blue',kitchen:'green',admin:'purple',support:'amber',supplier:'blue',hotel:'purple',mall:'blue',customer:'gray'};

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Users</h1><p className="page-subtitle">{filtered.length} of {users.length} users</p></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn-refresh" onClick={()=>setShowAdd(true)}><Plus size={13}/> Add user</button>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-filter-bar">
        <div style={{position:'relative',flex:1,maxWidth:280}}>
          <Search size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--gray-400)'}}/>
          <input className="admin-filter-input" style={{paddingLeft:32}} placeholder="Search name, email, phone…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="admin-filter-select" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}>
          <option value="all">All roles</option>
          {ROLES_ALL.map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
        </select>
        <select className="admin-filter-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="btn-refresh"><Download size={13}/> Export</button>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>User</th><th>Role</th><th>Plan</th><th>Shops</th><th>Last login</th><th>Verified</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(u=>(
              <tr key={u.id}>
                <td>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div className={`admin-avatar sm`} style={{background:u.role==='admin'?'var(--purple)':u.role==='support'?'#D97706':'var(--green)'}}>{u.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:13.5}}>{u.name}</div>
                      <div style={{fontSize:11.5,color:'var(--gray-400)'}}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className={`role-badge-sm role-${ROLE_COLORS[u.role]||'gray'}`}>{u.role}</span></td>
                <td>{u.plan!=='-'?<span className="plan-pill">{u.plan}</span>:'-'}</td>
                <td style={{color:'var(--gray-500)'}}>{u.shops||'-'}</td>
                <td style={{fontSize:12,color:'var(--gray-400)'}}>{u.lastLogin}</td>
                <td>
                  <button onClick={()=>toggleVerify(u.id)}>
                    {u.verified
                      ? <CheckCircle2 size={16} style={{color:'var(--green)'}}/>
                      : <XCircle size={16} style={{color:'var(--gray-300)'}}/>}
                  </button>
                </td>
                <td>
                  <button className={`toggle-status-btn ${u.status==='active'?'tog-active':'tog-suspended'}`} onClick={()=>toggleStatus(u.id)}>
                    {u.status==='active'?<ToggleRight size={18}/>:<ToggleLeft size={18}/>} {u.status}
                  </button>
                </td>
                <td>
                  <div style={{display:'flex',gap:5}}>
                    <button className="admin-row-btn" title="Edit" onClick={()=>setEditUser(u)}><Edit2 size={12}/></button>
                    <button className="admin-row-btn" title="Impersonate"><UserCheck size={12}/></button>
                    <button className="admin-row-btn admin-row-btn-danger" title="Delete" onClick={()=>deleteUser(u.id)}><Trash2 size={12}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editUser && (
        <UserEditModal user={editUser} onSave={saveEdit} onClose={()=>setEditUser(null)}/>
      )}
    </div>
  );
}

function UserEditModal({user,onSave,onClose}) {
  const [form,setForm] = useState({...user});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h2 className="modal-title">Edit User — {user.name}</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="form-row-2">
            <div className="form-field"><label className="form-label">Full name</label><input className="form-input" value={form.name} onChange={e=>set('name',e.target.value)}/></div>
            <div className="form-field"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={e=>set('email',e.target.value)}/></div>
          </div>
          <div className="form-row-2">
            <div className="form-field"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e=>set('phone',e.target.value)}/></div>
            <div className="form-field">
              <label className="form-label">Role</label>
              <select className="form-input" value={form.role} onChange={e=>set('role',e.target.value)}>
                {ROLES_ALL.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-field">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e=>set('status',e.target.value)}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Plan</label>
              <select className="form-input" value={form.plan} onChange={e=>set('plan',e.target.value)}>
                {['Starter','Growth','Business','Hotel Basic','Hotel Pro','Resort Suite','Mall Basic','Mall Pro','Enterprise','-'].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Verified</label>
            <button className={`toggle-btn ${form.verified?'toggle-on':'toggle-off'}`} onClick={()=>set('verified',!form.verified)}>
              {form.verified?<ToggleRight size={22}/>:<ToggleLeft size={22}/>}
            </button>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={()=>onSave(form)}>Save changes</button>
        </div>
      </div>
    </div>
  );
}

// ─── Full Shops Page (Seller Tier System) ─────────────────────────────────────
function FullShopsPage({shops:fallback}) {
  const [page,setPage] = useState(null);   // Page<ShopResponse> from the API, or null while loading/on error
  const [pageNum,setPageNum] = useState(0);
  const [size,setSize] = useState(20);
  const [search,setSearch] = useState('');
  const [sort,setSort] = useState('tier'); // 'tier' (default, higher tiers first) | 'recent'
  const [usingFallback,setUsingFallback] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      shopApi.list({ search: search || undefined, page: pageNum, size, sort })
        .then(res => { setPage(res.data.data); setUsingFallback(false); })
        .catch(() => {
          // Backend unreachable — paginate the local fallback list client-side
          const filtered = fallback.filter(s=>!search||s.name.toLowerCase().includes(search.toLowerCase())||s.owner.toLowerCase().includes(search.toLowerCase())||s.city.toLowerCase().includes(search.toLowerCase()));
          setPage({
            content: filtered.slice(pageNum*size, pageNum*size+size),
            number: pageNum, size, totalElements: filtered.length, totalPages: Math.ceil(filtered.length/size) || 1,
          });
          setUsingFallback(true);
        });
    }, 250);
    return () => clearTimeout(id);
  }, [search, pageNum, size, sort]);

  useEffect(() => { setPageNum(0); }, [search, sort]);

  const rows = page?.content || [];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">All Shops</h1><p className="page-subtitle">{page?.totalElements ?? fallback.length} registered{usingFallback ? ' (demo data)' : ''}</p></div>
        <div style={{display:'flex',gap:8}}>
          <select className="admin-filter-input" value={sort} onChange={e=>setSort(e.target.value)} style={{width:160}}>
            <option value="tier">Sort: Tier (default)</option>
            <option value="recent">Sort: Newest</option>
          </select>
          <div style={{position:'relative'}}>
            <Search size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--gray-400)'}}/>
            <input className="admin-filter-input" style={{paddingLeft:32,width:220}} placeholder="Search shops…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Shop</th><th>Owner / City</th><th>Plan</th><th>Tier</th><th>Rating</th><th>Sales volume</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map(s=>(
              <tr key={s.id}>
                <td style={{fontWeight:700}}>{s.name}</td>
                <td><div style={{fontSize:13}}>{s.owner || s.ownerId || '-'}</div><div style={{fontSize:11,color:'var(--gray-400)'}}>{s.city}</div></td>
                <td><span className="plan-pill">{s.plan || s.subscriptionPlan || '-'}</span></td>
                <td><TierBadge tier={s.tier}/></td>
                <td>{s.rating ? <span><Star size={11} fill="#F59E0B" color="#F59E0B" style={{verticalAlign:-1}}/> {Number(s.rating).toFixed(1)} ({s.ratingCount||0})</span> : '—'}</td>
                <td style={{fontWeight:700}}>₹{Number(s.salesVolume ?? s.revenue ?? 0).toLocaleString('en-IN')}</td>
                <td>
                  <span className={`status-pill ${(s.status||'').toLowerCase()==='active'?'st-active':'st-suspended'}`}>
                    {(s.status||'').toLowerCase()==='active'?<CheckCircle2 size={11}/>:<XCircle size={11}/>} {s.status}
                  </span>
                </td>
                <td>
                  <div style={{display:'flex',gap:5}}>
                    <button className="admin-row-btn"><Eye size={12}/></button>
                    <button className="admin-row-btn admin-row-btn-danger"><Trash2 size={12}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} onPageChange={setPageNum} onSizeChange={s=>{setSize(s);setPageNum(0);}}/>
      </div>
    </div>
  );
}

// ─── Hotels Page ──────────────────────────────────────────────────────────────
function FullHotelsPage({hotels:init}) {
  const [hotels,setHotels] = useState(init);
  const toggleStatus = id => setHotels(prev=>prev.map(h=>h.id!==id?h:{...h,status:h.status==='active'?'inactive':'active'}));
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Hotels & Resorts</h1><p className="page-subtitle">{hotels.length} registered</p></div>
        <button className="btn-refresh"><Plus size={13}/> Add hotel</button>
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Hotel</th><th>Owner</th><th>City</th><th>Rooms</th><th>Plan</th><th>Active requests</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {hotels.map(h=>(
              <tr key={h.id}>
                <td style={{fontWeight:700}}>{h.name}</td>
                <td>{h.owner}</td>
                <td style={{color:'var(--gray-500)'}}>{h.city}</td>
                <td>{h.rooms}</td>
                <td><span className="plan-pill">{h.plan}</span></td>
                <td>{h.requests}</td>
                <td><span className={`status-pill ${h.status==='active'?'st-active':'st-suspended'}`}>{h.status==='active'?<CheckCircle2 size={11}/>:<XCircle size={11}/>} {h.status}</span></td>
                <td>
                  <div style={{display:'flex',gap:5}}>
                    <button className="admin-row-btn"><Eye size={12}/></button>
                    <button className="admin-row-btn" onClick={()=>toggleStatus(h.id)}>{h.status==='active'?<Lock size={12}/>:<Unlock size={12}/>}</button>
                    <button className="admin-row-btn"><Edit2 size={12}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Malls Page ───────────────────────────────────────────────────────────────
function FullMallsPage({malls:init}) {
  const [malls,setMalls] = useState(init);
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Malls & Food Courts</h1><p className="page-subtitle">{malls.length} registered</p></div>
        <button className="btn-refresh"><Plus size={13}/> Add mall</button>
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Mall</th><th>Admin</th><th>City</th><th>Vendors</th><th>Plan</th><th>Orders today</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {malls.map(m=>(
              <tr key={m.id}>
                <td style={{fontWeight:700}}>{m.name}</td>
                <td>{m.admin}</td>
                <td style={{color:'var(--gray-500)'}}>{m.city}</td>
                <td>{m.vendors}</td>
                <td><span className="plan-pill">{m.plan}</span></td>
                <td style={{fontWeight:600}}>{m.orders}</td>
                <td><span className={`status-pill ${m.status==='active'?'st-active':'st-suspended'}`}>{m.status==='active'?<CheckCircle2 size={11}/>:<XCircle size={11}/>} {m.status}</span></td>
                <td><div style={{display:'flex',gap:5}}><button className="admin-row-btn"><Eye size={12}/></button><button className="admin-row-btn"><Edit2 size={12}/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────
function AdminReports() {
  return (
    <div>
      <div className="page-header"><h1 className="page-title">Platform Reports</h1></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
        {['Revenue by city','Top shops by GMV','Signups trend','Plan distribution','QR scan heatmap','Churn analysis'].map(r=>(
          <div key={r} className="admin-chart-card" style={{minHeight:120,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10}}>
            <BarChart2 size={24} style={{color:'var(--gray-300)'}}/>
            <div style={{fontSize:13,fontWeight:600,color:'var(--gray-600)'}}>{r}</div>
            <button className="btn-refresh" style={{fontSize:12}}><Download size={12}/> Export CSV</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Admin Settings ───────────────────────────────────────────────────────────
function AdminSettings() {
  const { lang } = useLang();
  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div className="page-header"><h1 className="page-title">{t('settings',lang)}</h1></div>
      {[
        {title:'Platform settings', fields:['Platform name','Support email','Default currency','Time zone']},
        {title:'Payment gateway',   fields:['Razorpay Key ID','Razorpay Secret','PhonePe Merchant ID']},
        {title:'Notification',      fields:['SMTP host','SMTP user','Twilio SID','WhatsApp API key']},
      ].map(section=>(
        <div key={section.title} className="admin-chart-card">
          <h3 style={{marginBottom:16}}>{section.title}</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {section.fields.map(f=>(
              <div key={f} className="form-field">
                <label className="form-label">{f}</label>
                <input className="form-input" placeholder={f}/>
              </div>
            ))}
          </div>
          <div style={{marginTop:14,display:'flex',justifyContent:'flex-end'}}>
            <button className="btn btn-primary">{t('save',lang)}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminStub({label,icon:Icon}) {
  return (
    <div className="admin-stub">
      <div className="admin-stub-icon">{Icon&&<Icon size={28}/>}</div>
      <h2>{label}</h2>
      <p>Full implementation ready — explore Users, Shops, Hotels and Malls tabs.</p>
    </div>
  );
}
