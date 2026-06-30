import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { shopApi } from '../api/index.js';
import './Staff.css';

const ROLES = [
  { key:'MANAGER',      label:'Manager',       color:'purple', desc:'Full access except billing' },
  { key:'CASHIER',      label:'Cashier',        color:'blue',   desc:'Update payment status' },
  { key:'KITCHEN',      label:'Kitchen Staff',  color:'green',  desc:'Update order prep status' },
  { key:'MENU_EDITOR',  label:'Menu Editor',    color:'amber',  desc:'Add and edit menu items' },
  { key:'ORDER_VIEWER', label:'Order Viewer',   color:'gray',   desc:'View orders only' },
];

const COLOR = { purple:'#7C3AED', blue:'#2563EB', green:'#1D9E75', amber:'#D97706', gray:'#6B7280' };
const EMPTY = { name:'', phone:'', email:'', role:'CASHIER' };

export default function Staff() {
  const { user } = useAuth();
  const shopId = user?.shopId;

  const [staff, setStaff]   = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setStaffLoad] = useState(true);
  const [error, setError]       = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!shopId) { setStaffLoad(false); return; }
    shopApi.getStaff(shopId)
      .then(res => { setStaff(res.data.data || []); })
      .catch(e => setError(e.response?.data?.message || 'Failed to load staff'))
      .finally(() => setStaffLoad(false));
  }, [shopId]);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    try {
      if (modal.mode === 'edit') {
        await shopApi.updateStaff(modal.item.id, form);
        setStaff(prev => prev.map(s => s.id === modal.item.id ? { ...s, ...form } : s));
      } else {
        const res = await shopApi.addStaff(shopId, form);
        setStaff(prev => [...prev, res.data.data || { ...form, id:`local_${Date.now()}`, active:true }]);
      }
    } catch {
      if (modal.mode === 'edit') setStaff(prev => prev.map(s => s.id === modal.item.id ? { ...s, ...form } : s));
      else setStaff(prev => [...prev, { ...form, id:`local_${Date.now()}`, active:true, lastActive:'just now' }]);
    }
    setSaving(false);
    setModal(null);
  };

  const remove = async (member) => {
    if (!confirm(`Remove ${member.name} from your team?`)) return;
    setStaff(prev => prev.filter(s => s.id !== member.id));
    try { await shopApi.removeStaff(member.id); } catch {}
  };

  const filtered = staff.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-content">
      {error && <div className="demo-notice" style={{background:'var(--red-bg)',borderColor:'#FCA5A5',color:'var(--red)'}}>⚠ {error}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="page-subtitle">{staff.length} team members · {staff.filter(s=>s.active).length} active</p>
        </div>
        <div className="page-header-actions">
          <div style={{position:'relative'}}>
            <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--gray-400)',pointerEvents:'none'}}/>
            <input style={{paddingLeft:32,paddingRight:12,height:36,border:'1px solid var(--gray-200)',borderRadius:8,fontSize:13,width:200,outline:'none'}}
              placeholder="Search staff…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal({ mode:'add' }); }}>
            <Plus size={15}/> Add staff
          </button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
        {filtered.map(member => {
          const roleCfg = ROLES.find(r => r.key === member.role?.toUpperCase()) || ROLES[0];
          const col = COLOR[roleCfg.color] || '#6B7280';
          return (
            <div key={member.id} className="card" style={{display:'flex',alignItems:'flex-start',gap:14,opacity:member.active?1:0.6}}>
              <div style={{width:44,height:44,borderRadius:12,background:col+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:col,flexShrink:0}}>
                {member.avatar || member.name?.[0]}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                  <span style={{fontWeight:700,fontSize:14}}>{member.name}</span>
                  <div style={{display:'flex',gap:6}}>
                    <button style={{background:'var(--gray-100)',border:'none',borderRadius:6,padding:'4px 8px',cursor:'pointer'}}
                      onClick={() => { setForm({name:member.name,phone:member.phone||'',email:member.email||'',role:member.role}); setModal({mode:'edit',item:member}); }}>
                      <Edit2 size={12}/>
                    </button>
                    <button style={{background:'var(--red-bg)',border:'none',borderRadius:6,padding:'4px 8px',cursor:'pointer',color:'var(--red)'}} onClick={()=>remove(member)}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
                <div style={{fontSize:12,color:'var(--gray-500)',marginTop:2}}>{member.phone || member.email}</div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:6}}>
                  <span style={{fontSize:11,fontWeight:700,background:col+'18',color:col,padding:'2px 8px',borderRadius:999}}>{member.role?.replace('_',' ')}</span>
                  <span style={{fontSize:11,color:member.active?'#1D9E75':'var(--gray-400)',background:member.active?'#E1F5EE':'var(--gray-100)',padding:'2px 8px',borderRadius:999,fontWeight:600}}>
                    {member.active ? '● Active' : '○ Inactive'}
                  </span>
                </div>
                {member.lastActive && <div style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>Last active: {member.lastActive}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
          <div style={{background:'#fff',borderRadius:16,padding:28,width:'100%',maxWidth:440}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:700}}>{modal.mode==='edit'?'Edit staff':'Add staff member'}</h2>
              <button style={{background:'var(--gray-100)',border:'none',borderRadius:8,padding:'6px 8px',cursor:'pointer'}} onClick={()=>setModal(null)}><X size={16}/></button>
            </div>
            <form onSubmit={save} style={{display:'flex',flexDirection:'column',gap:14}}>
              <div className="field"><label className="field-label">Full Name *</label><input className="field-input" placeholder="Vikram Sharma" value={form.name} onChange={e=>set('name',e.target.value)} required/></div>
              <div className="field"><label className="field-label">Phone</label><input className="field-input" type="tel" placeholder="9900112233" value={form.phone} onChange={e=>set('phone',e.target.value)}/></div>
              <div className="field"><label className="field-label">Email</label><input className="field-input" type="email" placeholder="vikram@spiceroute.in" value={form.email} onChange={e=>set('email',e.target.value)}/></div>
              <div className="field">
                <label className="field-label">Role</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:4}}>
                  {ROLES.map(r => (
                    <button key={r.key} type="button"
                      style={{padding:'6px 14px',borderRadius:999,border:`1.5px solid ${form.role===r.key?COLOR[r.color]:'#E5E7EB'}`,background:form.role===r.key?COLOR[r.color]+'18':'#fff',fontSize:12,fontWeight:600,cursor:'pointer',color:form.role===r.key?COLOR[r.color]:'var(--gray-600)'}}
                      onClick={()=>set('role',r.key)}>{r.label}</button>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button type="button" className="btn btn-secondary" style={{flex:1}} onClick={()=>setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{flex:1}} disabled={saving}>{saving?'Saving…':modal.mode==='edit'?'Save changes':'Add staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
