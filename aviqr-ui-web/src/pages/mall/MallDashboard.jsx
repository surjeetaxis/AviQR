import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { mallApi, reportApi } from '../../api/index.js';
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
  const toggleQR = id => setVendors(prev=>prev.map(v=>v.id!==id?v:{...v,qrActive:!v.qrActive}));

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
          {tab==='vendors'     && <VendorsFull vendors={vendors} onToggle={toggleVendor} onToggleQR={toggleQR} onAdd={addVendor} onRemove={removeVendor}/>}
          {tab==='revenue'     && <RevenueShare vendors={vendors}/>}
          {tab==='qr'          && <MallQRPage/>}
          {tab==='reports'     && <MallReportsTab vendors={vendors}/>}
          {tab==='subscription'&& <SubscriptionPage userRole="mall" currentPlan="pro"/>}
          {tab==='settings'    && <MallSettings mall={mall} lang={lang}/>}
          {!['overview','vendors','revenue','qr','reports','subscription','settings'].includes(tab)&&(
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

const VENDOR_FORM_DEFAULT = {name:'',category:'',floor:'',contact:'',shopId:''};

function VendorsFull({vendors,onToggle,onToggleQR,onAdd,onRemove,compact}) {
  const [showForm,setShowForm] = useState(false);
  const [form,setForm] = useState(VENDOR_FORM_DEFAULT);
  const [saving,setSaving] = useState(false);

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

  return (
    <div>
      {!compact&&<div className="page-header"><div><h1 className="page-title">{t('vendors','en')}</h1></div><button className="btn-refresh" onClick={()=>setShowForm(f=>!f)}><Plus size={13}/> Add vendor</button></div>}
      {!compact&&showForm&&(
        <form onSubmit={submit} className="admin-chart-card" style={{marginBottom:16,display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr auto',gap:12,alignItems:'end'}}>
          <div className="form-field"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Spice Route" required/></div>
          <div className="form-field"><label className="form-label">Category</label><input className="form-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="e.g. North Indian"/></div>
          <div className="form-field"><label className="form-label">Floor</label><input className="form-input" value={form.floor} onChange={e=>setForm(f=>({...f,floor:e.target.value}))} placeholder="e.g. F1"/></div>
          <div className="form-field"><label className="form-label">Contact</label><input className="form-input" value={form.contact} onChange={e=>setForm(f=>({...f,contact:e.target.value}))} placeholder="Phone"/></div>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving?'Adding…':'Add'}</button>
        </form>
      )}
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
                {!compact&&<td><div style={{display:'flex',gap:5}}><button className="admin-row-btn"><Eye size={12}/></button><button className="admin-row-btn" onClick={()=>onToggle(v.id)}>{v.status==='active'?<XCircle size={12}/>:<CheckCircle2 size={12}/>}</button><button className="admin-row-btn admin-row-btn-danger" onClick={()=>onRemove(v.id)}><Trash2 size={12}/></button></div></td>}
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

function MallReportsTab({vendors}) {
  const [revenueData,setRevenueData] = useState([]);
  const [loading,setLoading] = useState(true);

  useEffect(() => {
    const withShop = vendors.filter(v=>v.shopId);
    if (!withShop.length) { setLoading(false); return; }
    setLoading(true);
    Promise.all(
      withShop.map(v =>
        // The mall admin's own login token has no shopId, so report-service's
        // same-shop check 403s a direct call — mint a vendor-scoped token first.
        mallApi.enterVendor(v.id)
          .then(res => reportApi.getRevenue(v.shopId, 7, res.data.data.accessToken))
          .then(res => {
            const data = res.data.data || [];
            const total = Array.isArray(data) ? data.reduce((a,d)=>a+(d.revenue||d.totalRevenue||0),0) : 0;
            return { name: v.name, total };
          })
          .catch(() => ({ name: v.name, total: 0 }))
      )
    ).then(setRevenueData).finally(()=>setLoading(false));
  }, [vendors]);

  if (loading) return <div style={{textAlign:'center',padding:40,color:'var(--gray-400)'}}>Loading reports…</div>;

  const grandTotal = revenueData.reduce((a,r)=>a+r.total,0);

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Reports</h1><p className="page-subtitle">Outlet comparison · last 7 days</p></div>
      <div className="admin-kpi-grid" style={{marginBottom:20}}>
        <div className="admin-kpi-card"><div className="admin-kpi-icon icon-green"><TrendingUp size={18}/></div><div className="admin-kpi-value">₹{grandTotal.toLocaleString('en-IN')}</div><div className="admin-kpi-label">Total revenue (7 days)</div></div>
        <div className="admin-kpi-card"><div className="admin-kpi-icon icon-blue"><Store size={18}/></div><div className="admin-kpi-value">{revenueData.length}</div><div className="admin-kpi-label">Vendors tracked</div></div>
      </div>
      {revenueData.length===0 ? (
        <div style={{textAlign:'center',padding:32,color:'var(--gray-400)',fontSize:13}}>No vendors with a linked shop yet.</div>
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
  });
  const [saving,setSaving] = useState(false);
  const [saved,setSaved] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const save = () => {
    if (!mall?.id) return;
    setSaving(true);
    mallApi.update(mall.id, {
      name: form.name, city: form.city, phone: form.phone,
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
        <div style={{marginTop:14,display:'flex',alignItems:'center',gap:12,justifyContent:'flex-end'}}>
          {saved && <span style={{color:'var(--green-darker)',fontSize:13,fontWeight:600}}>Saved!</span>}
          <button className="btn btn-primary" onClick={save} disabled={saving || !mall?.id}><Save size={14}/> {saving?'Saving…':t('save',lang)}</button>
        </div>
      </div>
    </div>
  );
}
