import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { LangPicker, useLang } from '../../components/shared/LangPicker.jsx';
import { t } from '../../i18n/translations.js';
import SubscriptionPage from '../../components/shared/SubscriptionPage.jsx';
import {
  Building2, Store, ShoppingBag, CreditCard, BarChart2, Settings,
  LogOut, Menu as MenuIcon, TrendingUp, QrCode, CheckCircle2,
  XCircle, Plus, Edit2, Trash2, Eye, ToggleLeft, ToggleRight,
  Phone, Save, Bell, Users, Star
} from 'lucide-react';
import '../admin/Admin.css';

const VENDORS = [
  {id:'v1',name:'Spice Route',cat:'North Indian',floor:'F1',contact:'9845012345',orders:73,revenue:24680,commission:2468,status:'active',qrActive:true},
  {id:'v2',name:'Wok to Walk',cat:'Chinese',floor:'F1',contact:'9876543210',orders:58,revenue:18200,commission:1820,status:'active',qrActive:true},
  {id:'v3',name:'Burger Republic',cat:'Fast Food',floor:'F2',contact:'9112345678',orders:91,revenue:27300,commission:2730,status:'active',qrActive:true},
  {id:'v4',name:'Rolls Corner',cat:'Kathi Rolls',floor:'F1',contact:'9988000001',orders:34,revenue:8500,commission:850,status:'inactive',qrActive:false},
  {id:'v5',name:'Ice Cream Palace',cat:'Desserts',floor:'F2',contact:'9000112233',orders:48,revenue:9600,commission:960,status:'active',qrActive:true},
];

const NAV = [
  {key:'overview',   label:'Overview',      icon:BarChart2},
  {key:'vendors',    label:'Vendors',       icon:Store,badge:VENDORS.length},
  {key:'orders',     label:'All Orders',    icon:ShoppingBag},
  {key:'revenue',    label:'Revenue Share', icon:CreditCard},
  {key:'qr',         label:'Mall QR',       icon:QrCode},
  {key:'reports',    label:'Reports',       icon:TrendingUp},
  {key:'subscription',label:'Subscription', icon:Star},
  {key:'settings',   label:'Settings',      icon:Settings},
];

export default function MallDashboard() {
  const { user, logout, switchRole } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vendors, setVendors] = useState(VENDORS);

  const toggleVendor = id => setVendors(prev=>prev.map(v=>v.id!==id?v:{...v,status:v.status==='active'?'inactive':'active'}));
  const toggleQR = id => setVendors(prev=>prev.map(v=>v.id!==id?v:{...v,qrActive:!v.qrActive}));

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen?'open':''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <Building2 size={18} style={{color:'#93C5FD'}}/>
            <span className="admin-brand-name">Avi<em>QR</em></span>
            <span className="admin-role-tag mall-tag">MALL</span>
          </div>
        </div>
        <div className="admin-user-card">
          <div className="admin-avatar" style={{background:'var(--blue)'}}>{user?.avatar||'FM'}</div>
          <div>
            <div className="admin-user-name">{user?.mallName||'Forum Mall'}</div>
            <div className="admin-user-role">Mall Admin · {vendors.length} vendors</div>
          </div>
        </div>
        <nav className="admin-nav">
          {NAV.map(n=>(
            <button key={n.key} className={`admin-nav-item ${tab===n.key?'active':''}`} onClick={()=>{setTab(n.key);setSidebarOpen(false);}}>
              <n.icon size={16}/> <span>{n.label}</span>
              {n.badge&&<span className="support-nav-badge">{n.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-switch-label">Switch role</div>
          <div className="admin-switch-btns">
            <button className="admin-switch-btn" onClick={()=>{switchRole('owner');navigate('/dashboard');}}>Owner</button>
            <button className="admin-switch-btn" onClick={()=>{switchRole('admin');navigate('/admin');}}>Admin</button>
          </div>
          <button className="admin-logout" onClick={()=>{logout();navigate('/')}}><LogOut size={14}/> {t('logout',lang)}</button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-mobile-menu" onClick={()=>setSidebarOpen(o=>!o)}><MenuIcon size={20}/></button>
          <span style={{fontWeight:700,fontSize:15}}>{user?.mallName||'Forum Mall'} — Food Court</span>
          <div style={{display:'flex',alignItems:'center',gap:10,marginLeft:'auto'}}>
            <LangPicker/>
            <div className="admin-avatar sm" style={{background:'var(--blue)'}}>{user?.avatar}</div>
          </div>
        </header>
        <main className="admin-content">
          {tab==='overview'    && <MallOverview vendors={vendors} onNav={setTab}/>}
          {tab==='vendors'     && <VendorsFull vendors={vendors} onToggle={toggleVendor} onToggleQR={toggleQR}/>}
          {tab==='revenue'     && <RevenueShare vendors={vendors}/>}
          {tab==='qr'          && <MallQRPage/>}
          {tab==='subscription'&& <SubscriptionPage userRole="mall" currentPlan="pro"/>}
          {tab==='settings'    && <MallSettings user={user} lang={lang}/>}
          {!['overview','vendors','revenue','qr','subscription','settings'].includes(tab)&&(
            <div className="admin-stub"><div className="admin-stub-icon"><BarChart2 size={28}/></div><h2>{NAV.find(n=>n.key===tab)?.label}</h2><p>Explore Vendors and Revenue Share tabs.</p></div>
          )}
        </main>
      </div>
    </div>
  );
}

function MallOverview({vendors,onNav}) {
  const totalRev=vendors.reduce((a,v)=>a+v.revenue,0);
  const totalComm=vendors.reduce((a,v)=>a+v.commission,0);
  const totalOrders=vendors.reduce((a,v)=>a+v.orders,0);
  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div className="page-header"><div><h1 className="page-title">Forum Mall — Food Court</h1><p className="page-subtitle">Bengaluru · {vendors.filter(v=>v.status==='active').length} vendors open</p></div></div>
      <div className="admin-kpi-grid">
        {[
          {label:'Active vendors',value:vendors.filter(v=>v.status==='active').length,icon:Store,color:'green'},
          {label:'Orders today',value:totalOrders,icon:ShoppingBag,color:'blue'},
          {label:'GMV today',value:`₹${totalRev.toLocaleString('en-IN')}`,icon:CreditCard,color:'purple'},
          {label:'Commission earned',value:`₹${totalComm.toLocaleString('en-IN')}`,icon:TrendingUp,color:'amber'},
        ].map(k=>(
          <div key={k.label} className="admin-kpi-card"><div className={`admin-kpi-icon icon-${k.color}`}><k.icon size={18}/></div><div className="admin-kpi-value">{k.value}</div><div className="admin-kpi-label">{k.label}</div></div>
        ))}
      </div>
      <VendorsFull vendors={vendors} onToggle={()=>{}} onToggleQR={()=>{}} compact/>
    </div>
  );
}

function VendorsFull({vendors,onToggle,onToggleQR,compact}) {
  return (
    <div>
      {!compact&&<div className="page-header"><div><h1 className="page-title">{t('vendors','en')}</h1></div><button className="btn-refresh"><Plus size={13}/> Add vendor</button></div>}
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Vendor</th><th>Category</th><th>Floor</th><th>Phone</th><th>Orders</th><th>Revenue</th><th>Commission</th><th>QR</th><th>Status</th>{!compact&&<th>Actions</th>}</tr></thead>
          <tbody>
            {vendors.map(v=>(
              <tr key={v.id}>
                <td style={{fontWeight:700}}>{v.name}</td>
                <td style={{color:'var(--gray-500)',fontSize:12.5}}>{v.cat}</td>
                <td>{v.floor}</td>
                <td style={{fontSize:12,color:'var(--gray-500)'}}>{v.contact}</td>
                <td>{v.orders}</td>
                <td style={{fontWeight:700}}>₹{v.revenue.toLocaleString('en-IN')}</td>
                <td style={{color:'var(--green-darker)',fontWeight:700}}>₹{v.commission.toLocaleString('en-IN')}</td>
                <td><button className={`toggle-btn ${v.qrActive?'toggle-on':'toggle-off'}`} onClick={()=>onToggleQR(v.id)}>{v.qrActive?<ToggleRight size={18}/>:<ToggleLeft size={18}/>}</button></td>
                <td><span className={`status-pill ${v.status==='active'?'st-active':'st-suspended'}`}>{v.status==='active'?<CheckCircle2 size={11}/>:<XCircle size={11}/>} {v.status}</span></td>
                {!compact&&<td><div style={{display:'flex',gap:5}}><button className="admin-row-btn"><Eye size={12}/></button><button className="admin-row-btn" onClick={()=>onToggle(v.id)}>{v.status==='active'?<XCircle size={12}/>:<CheckCircle2 size={12}/>}</button><button className="admin-row-btn"><Edit2 size={12}/></button></div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RevenueShare({vendors}) {
  const total=vendors.reduce((a,v)=>a+v.revenue,0);
  const comm=vendors.reduce((a,v)=>a+v.commission,0);
  return (
    <div>
      <div className="page-header"><h1 className="page-title">Revenue Share</h1></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
        {[{l:'Total GMV',v:`₹${total.toLocaleString('en-IN')}`,c:'green'},{l:'Commission (10%)',v:`₹${comm.toLocaleString('en-IN')}`,c:'blue'},{l:'Vendors',v:vendors.length,c:'purple'}].map(k=>(
          <div key={k.l} className="admin-kpi-card"><div className={`admin-kpi-value`} style={{fontSize:24,fontWeight:800,color:`var(--${k.c})`}}>{k.v}</div><div className="admin-kpi-label">{k.l}</div></div>
        ))}
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Vendor</th><th>Revenue</th><th>Commission %</th><th>Commission ₹</th><th>Settlement</th></tr></thead>
          <tbody>
            {vendors.map(v=>(
              <tr key={v.id}>
                <td style={{fontWeight:700}}>{v.name}</td>
                <td>₹{v.revenue.toLocaleString('en-IN')}</td>
                <td>10%</td>
                <td style={{color:'var(--green-darker)',fontWeight:700}}>₹{v.commission.toLocaleString('en-IN')}</td>
                <td><span style={{fontSize:11,background:'var(--green-light)',color:'var(--green-darker)',padding:'3px 9px',borderRadius:99,fontWeight:700}}>Pending</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MallQRPage() {
  return (
    <div>
      <div className="page-header"><h1 className="page-title">Mall QR Codes</h1></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
        {[{label:'Main Entrance QR',type:'Mall QR',scans:2841,url:'aviqr.in/menu/forummall'},{label:'Food Court F1',type:'Group QR',scans:1284,url:'aviqr.in/menu/forummall?floor=f1'},{label:'Food Court F2',type:'Group QR',scans:987,url:'aviqr.in/menu/forummall?floor=f2'}].map(q=>(
          <div key={q.label} className="admin-chart-card" style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{fontWeight:700,fontSize:14}}>{q.label}</div>
            <div style={{fontSize:11.5,color:'var(--gray-400)',fontFamily:'monospace'}}>{q.url}</div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
              <span style={{color:'var(--gray-500)'}}>Type: {q.type}</span>
              <span style={{fontWeight:700}}>{q.scans.toLocaleString()} scans</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-refresh" style={{flex:1,justifyContent:'center'}}>⬇ Download</button>
              <button className="btn-refresh" style={{flex:1,justifyContent:'center'}}>🖨 Print</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MallSettings({user,lang}) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div className="page-header"><h1 className="page-title">{t('settings',lang)}</h1></div>
      <div className="admin-chart-card">
        <h3 style={{marginBottom:16}}>Mall profile</h3>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {['Mall name','City','Contact email','Contact phone','Commission %','Opening hours'].map(f=>(
            <div key={f} className="form-field"><label className="form-label">{f}</label><input className="form-input" placeholder={f}/></div>
          ))}
        </div>
        <div style={{marginTop:14,display:'flex',justifyContent:'flex-end'}}>
          <button className="btn btn-primary"><Save size={14}/> {t('save',lang)}</button>
        </div>
      </div>
    </div>
  );
}
