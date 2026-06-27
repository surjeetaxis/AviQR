import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { shopApi, reportApi } from '../../api/index.js';
import { Store, BarChart2, ShoppingBag, Tag, QrCode, Settings, LogOut, Menu as MenuIcon, TrendingUp, Users, CreditCard } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import '../admin/Admin.css';
import './Supplier.css';
const NAV = [
  {key:'overview',label:'Overview',icon:BarChart2},
  {key:'outlets',label:'Outlets',icon:Store},
  {key:'menu',label:'Menu Sync',icon:Tag},
  {key:'orders',label:'All Orders',icon:ShoppingBag},
  {key:'qr',label:'QR Codes',icon:QrCode},
  {key:'reports',label:'Reports',icon:TrendingUp},
  {key:'settings',label:'Settings',icon:Settings},
];

const WEEKLY_FALLBACK = [
  {day:'Mon',revenue:0},{day:'Tue',revenue:0},{day:'Wed',revenue:0},
  {day:'Thu',revenue:0},{day:'Fri',revenue:0},{day:'Sat',revenue:0},{day:'Sun',revenue:0},
];

export default function SupplierDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [outlets, setOutlets] = useState([]);
  const [weekly, setWeekly]   = useState(WEEKLY_FALLBACK);
  const [loadingOutlets, setLoadingOutlets] = useState(true);

  useEffect(() => {
    shopApi.getMyShops()
      .then(res => {
        const shops = res.data.data || [];
        setOutlets(shops.map(s => ({
          id: s.id,
          name: s.name,
          orders: s.ordersToday || 0,
          revenue: s.revenueToday || 0,
          status: s.isOpen ? 'open' : 'closed',
        })));
      })
      .catch(() => {})
      .finally(() => setLoadingOutlets(false));
  }, []);

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen?'open':''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <QrCode size={18} style={{color:'#5DCAA5'}}/>
            <span className="admin-brand-name">Avi<em>QR</em></span>
            <span className="admin-role-tag supplier-tag">SUPPLIER</span>
          </div>
        </div>
        <div className="admin-user-card">
          <div className="admin-avatar" style={{background:'var(--blue)'}}>{user?.avatar||'RE'}</div>
          <div>
            <div className="admin-user-name">{user?.brandName||'Ramesh Enterprises'}</div>
            <div className="admin-user-role">Supplier · {outlets.length} outlets</div>
          </div>
        </div>
        <nav className="admin-nav">
          {NAV.map(n=>(
            <button key={n.key} className={`admin-nav-item ${tab===n.key?'active':''}`} onClick={()=>{setTab(n.key);setSidebarOpen(false);}}>
              <n.icon size={16}/> {n.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button className="admin-logout" onClick={()=>{logout();navigate('/')}}><LogOut size={14}/> Sign out</button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-mobile-menu" onClick={()=>setSidebarOpen(o=>!o)}><MenuIcon size={20}/></button>
          <span style={{fontSize:15,fontWeight:700,color:'var(--gray-900)'}}>Supplier Dashboard</span>
          <div className="admin-avatar sm" style={{marginLeft:'auto',background:'var(--blue)'}}>{user?.avatar}</div>
        </header>
        <main className="admin-content">
          {tab==='overview' && <SupplierOverview outlets={outlets} weekly={weekly} loading={loadingOutlets}/>}
          {tab==='outlets' && <OutletsList outlets={outlets} loading={loadingOutlets}/>}
          {tab!=='overview' && tab!=='outlets' && (
            <div className="admin-stub">
              <div className="admin-stub-icon"><Store size={28}/></div>
              <h2>{NAV.find(n=>n.key===tab)?.label}</h2>
              <p>Available in the full multi-outlet build. Check Overview and Outlets to explore.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SupplierOverview({outlets, weekly, loading}) {
  if (loading) return <div style={{textAlign:'center',padding:40,color:'var(--gray-400)'}}>Loading outlets…</div>;
  const totalRevenue = outlets.reduce((a,o)=>a+o.revenue,0);
  const totalOrders  = outlets.reduce((a,o)=>a+o.orders,0);
  return (
    <div className="admin-overview">
      <div className="page-header">
        <div><h1 className="page-title">Brand Overview</h1><p className="page-subtitle">All outlets · today</p></div>
        <button className="btn-outline">+ Add outlet</button>
      </div>
      <div className="admin-kpi-grid">
        {[
          {label:'Total outlets',value:outlets.length,icon:Store,color:'green'},
          {label:'Open now',value:outlets.filter(o=>o.status==='open').length,icon:TrendingUp,color:'blue'},
          {label:'Orders today',value:totalOrders,icon:ShoppingBag,color:'purple'},
          {label:'Revenue today',value:`₹${totalRevenue.toLocaleString('en-IN')}`,icon:CreditCard,color:'amber'},
        ].map(k=>(
          <div key={k.label} className="admin-kpi-card">
            <div className={`admin-kpi-icon icon-${k.color}`}><k.icon size={18}/></div>
            <div className="admin-kpi-value">{k.value}</div>
            <div className="admin-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>
      <div className="admin-chart-card">
        <h3>Combined revenue — last 7 days</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weekly} margin={{top:4,right:4,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
            <XAxis dataKey="day" tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
            <Tooltip formatter={v=>[`₹${v.toLocaleString('en-IN')}`,'Revenue']} contentStyle={{borderRadius:10,border:'1px solid #E5E7EB',fontSize:12}}/>
            <Bar dataKey="revenue" fill="#2563EB" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <OutletsList outlets={outlets}/>
    </div>
  );
}

function OutletsList({outlets, loading}) {
  if (loading) return <div style={{textAlign:'center',padding:40,color:'var(--gray-400)'}}>Loading outlets…</div>;
  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Outlets</h1><p className="page-subtitle">{outlets.length} registered</p></div>
        <button className="btn-outline">+ Add outlet</button>
      </div>
      <div className="outlets-grid">
        {outlets.map(o=>(
          <div key={o.id} className="outlet-card">
            <div className="outlet-name">{o.name}</div>
            <div className={`outlet-status ${o.status==='open'?'st-active':'st-suspended'}`}>
              {o.status==='open'?'Open':'Closed'}
            </div>
            <div className="outlet-stats">
              <div><div className="outlet-stat-val">{o.orders}</div><div className="outlet-stat-lbl">Orders</div></div>
              <div><div className="outlet-stat-val">₹{o.revenue.toLocaleString('en-IN')}</div><div className="outlet-stat-lbl">Revenue</div></div>
            </div>
            <button className="btn-outline btn-sm" style={{marginTop:10,width:'100%'}}>Manage outlet</button>
          </div>
        ))}
      </div>
    </div>
  );
}
