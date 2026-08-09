import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { mallApi, reportApi, orderApi } from '../../api/index.js';
import QRCode from 'qrcode';
import { LangPicker, useLang } from '../../components/shared/LangPicker.jsx';
import { t } from '../../i18n/translations.js';
import SubscriptionPage from '../../components/shared/SubscriptionPage.jsx';
import ProfileMenu from '../../components/shared/ProfileMenu.jsx';
import QrPosterStudio from '../../components/shared/QrPosterStudio.jsx';
import {
  Building2, Store, ShoppingBag, CreditCard, BarChart2, Settings,
  LogOut, Menu as MenuIcon, TrendingUp, QrCode, CheckCircle2,
  XCircle, Plus, Edit2, Trash2, Eye,
  Phone, Save, Bell, Users, Star, Clock, Download, Printer, Sparkles, MapPin, Loader2
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
  {key:'overview',   labelKey:'overview',      icon:BarChart2},
  {key:'vendors',    labelKey:'vendors',       icon:Store,badge:VENDORS.length},
  {key:'orders',     labelKey:'navAllOrders',    icon:ShoppingBag},
  {key:'revenue',    labelKey:'navRevenueShare', icon:CreditCard},
  {key:'qr',         labelKey:'navMallQR',       icon:QrCode},
  {key:'reports',    labelKey:'reports',       icon:TrendingUp},
  {key:'subscription',labelKey:'subscription', icon:Star},
  {key:'settings',   labelKey:'settings',      icon:Settings},
];

export default function MallDashboard() {
  const { user, logout } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vendors, setVendors] = useState(VENDORS);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [mall, setMall] = useState(null);

  const mapVendor = vd => ({
    id: vd.id,
    name: vd.name || vd.shopName,
    cat: vd.category || vd.cat || '',
    floor: vd.floor || '',
    contact: vd.phone || vd.contact || '',
    shopId: vd.shopId || '',
    orders: vd.ordersToday || 0,
    revenue: vd.revenueToday || 0,
    commission: vd.commissionToday || 0,
    status: vd.active ? 'active' : 'inactive',
    linkStatus: vd.status || 'ACTIVE', // PENDING | ACTIVE | REJECTED — Restaurant Request Flow
    qrActive: !!vd.qrActive,
  });

  const loadVendors = (mallId) => {
    setLoadingVendors(true);
    mallApi.getVendors(mallId)
      .then(res => {
        const v = res.data.data || [];
        if (v.length) setVendors(v.map(mapVendor));
      })
      .catch(() => {})
      .finally(() => setLoadingVendors(false));
  };

  useEffect(() => {
    mallApi.getMyMalls()
      .then(res => {
        const malls = res.data.data || [];
        const m = malls[0];
        if (!m) { setLoadingVendors(false); return; }
        setMall(m);
        loadVendors(m.id);
      })
      .catch(() => setLoadingVendors(false));
  }, []);

  const toggleVendor = id => {
    const v = vendors.find(x=>x.id===id);
    if (!v) return;
    const next = v.status !== 'active';
    setVendors(prev=>prev.map(x=>x.id!==id?x:{...x,status:next?'active':'inactive'}));
    mallApi.toggleVendor(id, next).catch(() => {
      setVendors(prev=>prev.map(x=>x.id!==id?x:{...x,status:next?'inactive':'active'}));
      alert('Could not update vendor status');
    });
  };
  const addVendor = async (form) => {
    if (!mall) return;
    const res = await mallApi.addVendor({ mallId: mall.id, ...form });
    const created = res?.data?.data;
    if (created) setVendors(prev => [...prev, mapVendor(created)]);
    else loadVendors(mall.id);
  };

  const removeVendor = (id) => {
    if (!confirm('Remove this vendor from the mall?')) return;
    mallApi.deleteVendor(id)
      .then(() => setVendors(prev => prev.filter(v => v.id !== id)))
      .catch(() => alert('Could not remove vendor'));
  };

  // Restaurant Request Flow: mall admin enters a restaurant's shop id, mall-service looks
  // it up in shop-service and creates a PENDING vendor row for the owner to accept/reject.
  const inviteRestaurant = async (shopId) => {
    if (!mall) return;
    const res = await mallApi.requestVendor({ mallId: mall.id, shopId });
    const created = res?.data?.data;
    if (created) setVendors(prev => [...prev.filter(v => v.id !== created.id), mapVendor(created)]);
  };

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
            <div className="admin-user-name">{mall?.name||user?.mallName||'Mall'}</div>
            <div className="admin-user-role">Mall Admin · {vendors.length} vendors</div>
          </div>
        </div>
        <nav className="admin-nav">
          {NAV.map(n=>(
            <button key={n.key} className={`admin-nav-item ${tab===n.key?'active':''}`} onClick={()=>{setTab(n.key);setSidebarOpen(false);}}>
              <n.icon size={16}/> <span>{t(n.labelKey, lang)}</span>
              {n.badge&&<span className="support-nav-badge">{n.badge}</span>}
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
          <span style={{fontWeight:700,fontSize:15}}>{mall?.name||user?.mallName||'Mall'} — Food Court</span>
          <div style={{display:'flex',alignItems:'center',gap:10,marginLeft:'auto'}}>
            <LangPicker/>
            <ProfileMenu
              name={user?.name}
              email={user?.email}
              avatar={user?.avatar}
              avatarColor="var(--blue)"
              onLogout={() => { logout(); navigate('/'); }}
              items={[
                { label:t('profileAndSettings', lang), icon:Settings, onClick:() => setTab('settings') },
                ...(mall?.id ? [{ label:'Preview food court', icon:Eye, onClick:() => navigate(`/food-court/${mall.id}`) }] : []),
                { label:t('onboardingGuide', lang), icon:Sparkles, onClick:() => navigate('/onboarding') },
              ]}
            />
          </div>
        </header>
        <main className="admin-content">
          {tab==='overview'    && <MallOverview vendors={vendors} onNav={setTab} mall={mall}/>}
          {tab==='vendors'     && <VendorsFull vendors={vendors} onToggle={toggleVendor} onAdd={addVendor} onRemove={removeVendor} onInvite={inviteRestaurant}/>}
          {tab==='orders'      && <MallOrdersTab vendors={vendors}/>}
          {tab==='revenue'     && <RevenueShare vendors={vendors}/>}
          {tab==='qr'          && <MallQRPage mall={mall}/>}
          {tab==='reports'     && <MallReportsTab vendors={vendors}/>}
          {tab==='subscription'&& <SubscriptionPage userRole="mall" currentPlan="MALL_PRO"/>}
          {tab==='settings'    && <MallSettings mall={mall} lang={lang}/>}
          {!['overview','vendors','revenue','qr','reports','subscription','settings'].includes(tab)&&(
            <div className="admin-stub"><div className="admin-stub-icon"><BarChart2 size={28}/></div><h2>{NAV.find(n=>n.key===tab)?.label}</h2><p>Explore Vendors and Revenue Share tabs.</p></div>
          )}
        </main>
      </div>
    </div>
  );
}

function MallOverview({vendors,onNav,mall}) {
  const totalRev=vendors.reduce((a,v)=>a+v.revenue,0);
  const totalComm=vendors.reduce((a,v)=>a+v.commission,0);
  const totalOrders=vendors.reduce((a,v)=>a+v.orders,0);
  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div className="page-header"><div><h1 className="page-title">{mall?.name||'Mall'} — Food Court</h1><p className="page-subtitle">{mall?.city?`${mall.city} · `:''}{vendors.filter(v=>v.status==='active').length} vendors open</p></div></div>
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
      <VendorsFull vendors={vendors} onToggle={()=>{}} compact/>
    </div>
  );
}

const VENDOR_FORM_DEFAULT = {name:'',category:'',floor:'',contact:'',shopId:''};
const LINK_STATUS_CFG = {
  PENDING:  {label:'Pending',  cls:'st-suspended', icon:Clock},
  ACTIVE:   {label:'Active',   cls:'st-active',    icon:CheckCircle2},
  REJECTED: {label:'Rejected', cls:'st-suspended', icon:XCircle},
};

function VendorsFull({vendors,onToggle,onAdd,onRemove,onInvite,compact}) {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [showForm,setShowForm] = useState(false);
  const [form,setForm] = useState(VENDOR_FORM_DEFAULT);
  const [saving,setSaving] = useState(false);
  const [showInvite,setShowInvite] = useState(false);
  const [inviteId,setInviteId] = useState('');
  const [inviting,setInviting] = useState(false);
  const [inviteError,setInviteError] = useState('');
  const [filter,setFilter] = useState('all');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onAdd(form);
      setForm(VENDOR_FORM_DEFAULT);
      setShowForm(false);
    } catch { alert('Could not add vendor'); }
    finally { setSaving(false); }
  };

  const submitInvite = async (e) => {
    e.preventDefault();
    if (!inviteId.trim()) return;
    setInviting(true);
    setInviteError('');
    try {
      await onInvite(inviteId.trim());
      setInviteId('');
      setShowInvite(false);
    } catch (err) {
      setInviteError(err?.response?.data?.message || 'Could not send request');
    } finally { setInviting(false); }
  };

  const filtered = filter==='all' ? vendors : vendors.filter(v => (v.linkStatus||'ACTIVE').toLowerCase() === filter);

  return (
    <div>
      {!compact&&(
        <div className="page-header">
          <div><h1 className="page-title">{t('vendors',lang)}</h1></div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn-refresh" onClick={()=>{setShowInvite(f=>!f);setShowForm(false);}}><Bell size={13}/> Invite Restaurant</button>
            <button className="btn-refresh" onClick={()=>{setShowForm(f=>!f);setShowInvite(false);}}><Plus size={13}/> Add vendor</button>
          </div>
        </div>
      )}
      {!compact&&showInvite&&(
        <form onSubmit={submitInvite} className="admin-chart-card" style={{marginBottom:16,display:'grid',gridTemplateColumns:'1fr auto',gap:12,alignItems:'end'}}>
          <div className="form-field">
            <label className="form-label">Restaurant ID</label>
            <input className="form-input" value={inviteId} onChange={e=>setInviteId(e.target.value)} placeholder="Paste the restaurant's shop ID" required/>
            {inviteError && <div style={{color:'var(--red,#DC2626)',fontSize:12,marginTop:4}}>{inviteError}</div>}
          </div>
          <button className="btn btn-primary" type="submit" disabled={inviting}>{inviting?'Sending…':'Send Request'}</button>
        </form>
      )}
      {!compact&&showForm&&(
        <form onSubmit={submit} className="admin-chart-card" style={{marginBottom:16,display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr auto',gap:12,alignItems:'end'}}>
          <div className="form-field"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Spice Route" required/></div>
          <div className="form-field"><label className="form-label">Category</label><input className="form-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="e.g. North Indian"/></div>
          <div className="form-field"><label className="form-label">Floor</label><input className="form-input" value={form.floor} onChange={e=>setForm(f=>({...f,floor:e.target.value}))} placeholder="e.g. F1"/></div>
          <div className="form-field"><label className="form-label">Contact</label><input className="form-input" value={form.contact} onChange={e=>setForm(f=>({...f,contact:e.target.value}))} placeholder="Phone"/></div>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving?'Adding…':'Add'}</button>
        </form>
      )}
      {!compact&&(
        <div style={{display:'flex',gap:8,marginBottom:14}}>
          {/* Filters on linkStatus (onboarding approval state) — labeled distinctly
              from the separate open/closed "Status" column to avoid confusion. */}
          {[['all','All'],['active','Approved'],['pending','Pending'],['rejected','Rejected']].map(([f,label])=>(
            <button key={f} className={`support-filter-tab ${filter===f?'active':''}`} onClick={()=>setFilter(f)}>
              {label} <span className="support-filter-count">{f==='all'?vendors.length:vendors.filter(v=>(v.linkStatus||'ACTIVE').toLowerCase()===f).length}</span>
            </button>
          ))}
        </div>
      )}
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Vendor</th><th>Category</th><th>Floor</th><th>Phone</th><th>Orders</th><th>Revenue</th><th>Commission</th><th>QR</th><th>Status</th><th>Link Status</th>{!compact&&<th>Actions</th>}</tr></thead>
          <tbody>
            {filtered.map(v=>{
              const lcfg = LINK_STATUS_CFG[v.linkStatus] || LINK_STATUS_CFG.ACTIVE;
              return (
              <tr key={v.id}>
                <td style={{fontWeight:700}}>{v.name}</td>
                <td style={{color:'var(--gray-500)',fontSize:12.5}}>{v.cat}</td>
                <td>{v.floor}</td>
                <td style={{fontSize:12,color:'var(--gray-500)'}}>{v.contact}</td>
                <td>{v.orders}</td>
                <td style={{fontWeight:700}}>₹{v.revenue.toLocaleString('en-IN')}</td>
                <td style={{color:'var(--green-darker)',fontWeight:700}}>₹{v.commission.toLocaleString('en-IN')}</td>
                <td>
                  {v.shopId
                    ? <button className="admin-row-btn" onClick={()=>navigate(`/mall/vendors/${v.id}/qr-codes`)} title="Manage QR codes"><QrCode size={13}/></button>
                    : <span style={{fontSize:11,color:'var(--gray-400)'}} title="Vendor has no linked shop">—</span>}
                </td>
                <td><span className={`status-pill ${v.status==='active'?'st-active':'st-suspended'}`}>{v.status==='active'?<CheckCircle2 size={11}/>:<XCircle size={11}/>} {v.status}</span></td>
                <td><span className={`status-pill ${lcfg.cls}`}><lcfg.icon size={11}/> {lcfg.label}</span></td>
                {!compact&&<td><div style={{display:'flex',gap:5}}><button className="admin-row-btn"><Eye size={12}/></button><button className="admin-row-btn" onClick={()=>onToggle(v.id)}>{v.status==='active'?<XCircle size={12}/>:<CheckCircle2 size={12}/>}</button><button className="admin-row-btn admin-row-btn-danger" onClick={()=>onRemove(v.id)}><Trash2 size={12}/></button></div></td>}
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RevenueShare({vendors}) {
  const { lang } = useLang();
  const total=vendors.reduce((a,v)=>a+v.revenue,0);
  const comm=vendors.reduce((a,v)=>a+v.commission,0);
  return (
    <div>
      <div className="page-header"><h1 className="page-title">{t('navRevenueShare', lang)}</h1></div>
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

/* ─── All Orders tab — mirrors SupplierDashboard.jsx's AllOrdersTab pattern ──── */
function MallOrdersTab({vendors}) {
  const { lang } = useLang();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const withShop = vendors.filter(v => v.shopId);
    if (!withShop.length) { setLoading(false); return; }
    setLoading(true);
    Promise.all(
      withShop.map(v =>
        // The mall admin's own login token has no shopId, so order-service's
        // same-shop check 403s a direct call — mint a vendor-scoped token first.
        mallApi.enterVendor(v.id)
          .then(res => orderApi.getOrders(v.shopId, { page: 0, size: 20 }, { headers: { Authorization: `Bearer ${res.data.data.accessToken}` } }))
          .then(res => (res.data.data?.content || res.data.data || []).map(ord => ({ ...ord, vendorName: v.name })))
          .catch(() => [])
      )
    )
      .then(results => setOrders(results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
      .finally(() => setLoading(false));
  }, [vendors]);

  const statusColor = s => ({ NEW: '#3b82f6', PREPARING: '#f59e0b', READY: '#10b981', COMPLETED: '#6b7280', CANCELLED: '#ef4444' }[s] || '#6b7280');

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Loading orders…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('navAllOrders', lang)}</h1>
          <p className="page-subtitle">{orders.length} orders across {vendors.filter(v=>v.shopId).length} linked vendors</p>
        </div>
      </div>
      {orders.length === 0 ? (
        <div className="admin-stub">
          <div className="admin-stub-icon"><ShoppingBag size={28} /></div>
          <h2>No orders yet</h2>
          <p>Orders from your vendors' shops will appear here.</p>
        </div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Vendor</th>
                <th>Table</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>#{String(o.id).slice(-6)}</td>
                  <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{o.vendorName}</td>
                  <td>{o.tableNumber || '—'}</td>
                  <td style={{ fontWeight: 700 }}>₹{(o.totalAmount || 0).toLocaleString('en-IN')}</td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(o.status), background: statusColor(o.status) + '22', padding: '3px 9px', borderRadius: 99 }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 11.5, color: 'var(--gray-500)' }}>
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
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

function MallReportsTab({vendors}) {
  const { lang } = useLang();
  const [revenueData,setRevenueData] = useState([]);
  const [loading,setLoading] = useState(true);

  useEffect(() => {
    if (!vendors.length) { setLoading(false); return; }
    setLoading(true);
    // Every mall vendor is tracked, not just ones with a linked shop — a vendor
    // added via "Add vendor" (no shopId yet) still counts, just with ₹0 revenue
    // since there's no shop-service order data to query for it.
    Promise.all(
      vendors.map(v => {
        if (!v.shopId) return Promise.resolve({ name: v.name, total: 0 });
        // The mall admin's own login token has no shopId, so report-service's
        // same-shop check 403s a direct call — mint a vendor-scoped token first.
        return mallApi.enterVendor(v.id)
          .then(res => reportApi.getRevenue(v.shopId, 7, res.data.data.accessToken))
          .then(res => {
            const data = res.data.data || [];
            const total = Array.isArray(data) ? data.reduce((a,d)=>a+(d.revenue||d.totalRevenue||0),0) : 0;
            return { name: v.name, total };
          })
          .catch(() => ({ name: v.name, total: 0 }));
      })
    ).then(setRevenueData).finally(()=>setLoading(false));
  }, [vendors]);

  if (loading) return <div style={{textAlign:'center',padding:40,color:'var(--gray-400)'}}>Loading reports…</div>;

  const grandTotal = revenueData.reduce((a,r)=>a+r.total,0);

  return (
    <div>
      <div className="page-header"><h1 className="page-title">{t('reports', lang)}</h1><p className="page-subtitle">Outlet comparison · last 7 days</p></div>
      <div className="admin-kpi-grid" style={{marginBottom:20}}>
        <div className="admin-kpi-card"><div className="admin-kpi-icon icon-green"><TrendingUp size={18}/></div><div className="admin-kpi-value">₹{grandTotal.toLocaleString('en-IN')}</div><div className="admin-kpi-label">Total revenue (7 days)</div></div>
        <div className="admin-kpi-card"><div className="admin-kpi-icon icon-blue"><Store size={18}/></div><div className="admin-kpi-value">{revenueData.length}</div><div className="admin-kpi-label">Vendors tracked</div></div>
      </div>
      {revenueData.length===0 ? (
        <div style={{textAlign:'center',padding:32,color:'var(--gray-400)',fontSize:13}}>No vendors yet.</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead><tr><th>Vendor</th><th>Revenue (7 days)</th><th>Share</th></tr></thead>
            <tbody>
              {[...revenueData].sort((a,b)=>b.total-a.total).map(r=>(
                <tr key={r.name}>
                  <td style={{fontWeight:700}}>{r.name}</td>
                  <td style={{fontWeight:700}}>₹{r.total.toLocaleString('en-IN')}</td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{flex:1,height:6,background:'var(--gray-100)',borderRadius:99,overflow:'hidden'}}>
                        <div style={{width:`${grandTotal?(r.total/grandTotal)*100:0}%`,height:'100%',background:'var(--blue)',borderRadius:99}}/>
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

// Real, working Food Court QR: encodes the actual public /food-court/:mallId route
// (Food Court QR Flow) so scanning it takes a customer to the live restaurant list —
// unlike the old mocked entries here, Download/Print actually work.
function MallQRPage({mall}) {
  const { lang } = useLang();
  const [qrImg,setQrImg] = useState('');
  const [targetUrl,setTargetUrl] = useState('');
  const [designing,setDesigning] = useState(false);

  useEffect(() => {
    if (!mall?.id) return;
    mallApi.createMallQr(mall.id)
      .then(res => setTargetUrl(res.data.data?.targetUrl || `${window.location.origin}/food-court/${mall.id}`))
      .catch(() => setTargetUrl(`${window.location.origin}/food-court/${mall.id}`));
  }, [mall?.id]);

  useEffect(() => {
    if (!targetUrl) return;
    QRCode.toDataURL(targetUrl, {
      width: 512, margin: 2,
      color: { dark: '#0F172A', light: '#ffffff' },
    }).then(setQrImg).catch(() => {});
  }, [targetUrl]);

  const download = () => {
    if (!qrImg) return;
    const a = document.createElement('a');
    a.href = qrImg;
    a.download = `${mall?.name || 'food-court'}-qr.png`.replace(/\s+/g, '-');
    a.click();
  };

  if (!mall) return <div style={{textAlign:'center',padding:40,color:'var(--gray-400)'}}>Loading…</div>;

  return (
    <div>
      <div className="page-header"><h1 className="page-title">{t('foodCourtQR', lang)}</h1><p className="page-subtitle">One QR for the whole food court — scan lands on the restaurant list</p></div>
      <div className="admin-chart-card" style={{maxWidth:340,display:'flex',flexDirection:'column',gap:14,alignItems:'center',textAlign:'center'}}>
        {qrImg ? <img src={qrImg} alt="Food Court QR" style={{width:220,height:220,borderRadius:8}}/> : <div style={{width:220,height:220,background:'var(--gray-100)',borderRadius:8}}/>}
        <div style={{fontWeight:700,fontSize:14}}>{mall.name}</div>
        <div style={{fontSize:11.5,color:'var(--gray-400)',fontFamily:'monospace',wordBreak:'break-all'}}>{targetUrl}</div>
        <div style={{display:'flex',gap:8,width:'100%'}}>
          <button className="btn-refresh" style={{flex:1,justifyContent:'center'}} onClick={download}><Download size={14}/> Download</button>
          <button className="btn-refresh" style={{flex:1,justifyContent:'center'}} onClick={()=>window.print()}><Printer size={14}/> Print</button>
        </div>
        <button className="btn btn-secondary" style={{width:'100%',justifyContent:'center'}} onClick={()=>setDesigning(true)}>🎨 Design Banner & Print</button>
      </div>
      {designing && (
        <QrPosterStudio
          open={designing}
          onClose={()=>setDesigning(false)}
          targetUrlOverride={targetUrl}
          nameDefault={mall.name}
          taglineDefault="Scan for the full food court menu · Happy dining!"
        />
      )}
    </div>
  );
}

const MALL_SAVED_FIELDS = [
  {key:'name', label:'Mall name'},
  {key:'city', label:'City'},
  {key:'phone', label:'Contact phone'},
  {key:'commissionPercent', label:'Commission %'},
];
const MALL_LOCAL_ONLY_FIELDS = [
  {key:'contactEmail', label:'Contact email'},
  {key:'openingHours', label:'Opening hours'},
];

function MallSettings({mall,lang}) {
  const [form,setForm] = useState({
    name: mall?.name || '', city: mall?.city || '', phone: mall?.phone || '',
    commissionPercent: mall?.commissionPercent ?? '', contactEmail: '', openingHours: '',
    latitude: mall?.latitude ?? null, longitude: mall?.longitude ?? null,
  });
  const [saving,setSaving] = useState(false);
  const [saved,setSaved] = useState(false);
  const [locating,setLocating] = useState(false);
  const [locErr,setLocErr] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) { setLocErr('Location not available in this browser'); return; }
    setLocating(true); setLocErr('');
    navigator.geolocation.getCurrentPosition(
      pos => { setForm(f=>({...f,latitude:pos.coords.latitude,longitude:pos.coords.longitude})); setLocating(false); },
      () => { setLocErr('Could not get your location'); setLocating(false); },
      { timeout: 8000 }
    );
  };

  const save = () => {
    if (!mall?.id) return;
    setSaving(true);
    mallApi.update(mall.id, {
      name: form.name, city: form.city, phone: form.phone,
      latitude: form.latitude, longitude: form.longitude,
      commissionPercent: form.commissionPercent === '' ? null : Number(form.commissionPercent),
    })
      .then(() => { setSaved(true); setTimeout(()=>setSaved(false), 2000); })
      .catch(() => alert('Could not save settings'))
      .finally(() => setSaving(false));
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div className="page-header"><h1 className="page-title">{t('settings',lang)}</h1></div>
      <div className="admin-chart-card">
        <h3 style={{marginBottom:16}}>Mall profile</h3>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {MALL_SAVED_FIELDS.map(f=>(
            <div key={f.key} className="form-field"><label className="form-label">{f.label}</label><input className="form-input" value={form[f.key]} onChange={e=>set(f.key,e.target.value)} placeholder={f.label}/></div>
          ))}
          {MALL_LOCAL_ONLY_FIELDS.map(f=>(
            <div key={f.key} className="form-field"><label className="form-label">{f.label} <span style={{fontWeight:400,color:'var(--gray-400)'}}>(not saved yet)</span></label><input className="form-input" value={form[f.key]} onChange={e=>set(f.key,e.target.value)} placeholder={f.label}/></div>
          ))}
        </div>
        <div style={{marginTop:14,display:'flex',alignItems:'center',gap:10}}>
          <button className="btn btn-secondary" onClick={useCurrentLocation} disabled={locating} style={{display:'flex',alignItems:'center',gap:6,fontSize:12.5}}>
            {locating ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <MapPin size={14}/>}
            {locating ? 'Getting location…' : form.latitude != null ? 'Location captured ✓' : 'Use current location'}
          </button>
          {locErr && <span style={{color:'#DC2626',fontSize:12}}>{locErr}</span>}
        </div>
        <div style={{marginTop:14,display:'flex',alignItems:'center',gap:12,justifyContent:'flex-end'}}>
          {saved && <span style={{color:'var(--green-darker)',fontSize:13,fontWeight:600}}>Saved!</span>}
          <button className="btn btn-primary" onClick={save} disabled={saving || !mall?.id}><Save size={14}/> {saving?'Saving…':t('save',lang)}</button>
        </div>
      </div>
    </div>
  );
}
