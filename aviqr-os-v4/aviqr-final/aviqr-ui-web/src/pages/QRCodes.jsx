import { useState, useEffect, useRef } from 'react';
import { Plus, Download, Share2, Eye, Trash2, RefreshCw, Link } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { qrApi } from '../api/index.js';
import './QRCodes.css';

export default function QRCodes() {
  const { user } = useAuth();
  const shopId = user?.shopId || '00000000-0000-0000-0000-000000000101';

  const [codes, setCodes]     = useState([]);
  const [preview, setPreview] = useState(null);
  const [creating, setCreating] = useState(false);
    const [copied, setCopied]   = useState(null);

  useEffect(() => {
    qrApi.getByShop(shopId)
      .then(res => { setCodes(res.data.data || []); })
      .catch(e => setError(e.response?.data?.message || 'Failed to load QR codes'));
  }, [shopId]);

  const create = async (type, label) => {
    setCreating(true);
    try {
      await qrApi.create(shopId, { type, label });
      const res = await qrApi.getByShop(shopId);
      const d = res.data.data || []; if (d.length) setCodes(d);
    } catch {
      // Demo: add locally
      setCodes(prev => [...prev, { id:`local_${Date.now()}`, qrCode:`shop_${type.toLowerCase()}_${Date.now()}`, targetUrl:`https://aviqr.in/menu/${shopId}`, label, type, scanCount:0, active:true }]);
    }
    setCreating(false);
  };

  const copyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const share = async (code) => {
    if (navigator.share) {
      try { await navigator.share({ title: code.label, url: code.targetUrl }); } catch {}
    } else {
      copyUrl(code.targetUrl, code.id);
    }
  };

  const QrBox = ({ url, size = 120 }) => {
    // Simple QR placeholder using the backend's QR image endpoint
    return (
      <div style={{ width:size, height:size, background:'#fff', border:'1px solid var(--gray-200)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
        {/* Corner markers */}
        {[[0,'00%','00%'],[1,'auto','00%'],[2,'00%','auto']].map(([i,b,r])=>(
          <div key={i} style={{position:'absolute',top:b==='auto'?'auto':8,bottom:b==='auto'?8:'auto',left:r==='auto'?'auto':8,right:r==='auto'?8:'auto',width:size*0.22,height:size*0.22,border:'3px solid var(--gray-900)',borderRadius:4}}/>
        ))}
        <div style={{width:size*0.28,height:size*0.28,background:'var(--gray-900)',borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{width:size*0.14,height:size*0.14,background:'white',borderRadius:2}}/>
        </div>
        <div style={{position:'absolute',bottom:4,right:6,fontSize:8,fontWeight:700,color:'var(--gray-400)'}}>aviqr</div>
      </div>
    );
  };

  return (
    <div className="page-content">
      {error && <div className="demo-notice" style={{background:'var(--red-bg)',borderColor:'#FCA5A5',color:'var(--red)'}}>⚠ {error}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title">QR Codes</h1>
          <p className="page-subtitle">{codes.length} codes · {codes.reduce((n,c)=>n+(c.scanCount||0),0).toLocaleString('en-IN')} total scans</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => create('TABLE', `Table ${codes.filter(c=>c.type==='TABLE').length+1}`)} disabled={creating}>
            <Plus size={14}/> {creating?'Creating…':'Table QR'}
          </button>
          <button className="btn btn-primary" onClick={() => create('SHOP', 'Shop QR')} disabled={creating}>
            <Plus size={14}/> {creating?'Creating…':'Shop QR'}
          </button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
        {codes.map(code => (
          <div key={code.id} className="card" style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
              <div style={{background:'var(--gray-50)',borderRadius:8,padding:6,flexShrink:0,cursor:'pointer'}} onClick={()=>setPreview(code)}>
                <QrBox url={code.targetUrl} size={72}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14}}>{code.label || 'QR Code'}</div>
                <div style={{display:'flex',gap:6,marginTop:4}}>
                  <span style={{fontSize:11,fontWeight:700,background:code.type==='SHOP'?'var(--green-light)':'var(--blue-bg)',color:code.type==='SHOP'?'var(--green-darker)':'var(--blue)',padding:'2px 8px',borderRadius:999}}>{code.type}</span>
                  {!code.active && <span style={{fontSize:11,background:'var(--red-bg)',color:'var(--red)',padding:'2px 8px',borderRadius:999,fontWeight:600}}>Inactive</span>}
                </div>
                <div style={{fontSize:12,color:'var(--gray-500)',marginTop:4}}>👁 {(code.scanCount||0).toLocaleString('en-IN')} scans</div>
                <div style={{fontSize:11,color:'var(--gray-400)',marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:'monospace'}}>{code.targetUrl}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:8,paddingTop:8,borderTop:'1px solid var(--gray-100)'}}>
              <button className="btn btn-secondary" style={{flex:1,height:32,fontSize:12}} onClick={()=>setPreview(code)}><Eye size={12}/> Preview</button>
              <button className="btn btn-secondary" style={{flex:1,height:32,fontSize:12}} onClick={()=>share(code)}>
                {copied===code.id?<>✓ Copied!</>:<><Share2 size={12}/> Share</>}
              </button>
              <button className="btn btn-secondary" style={{flex:1,height:32,fontSize:12}} onClick={()=>copyUrl(code.targetUrl,`link_${code.id}`)}>
                {copied===`link_${code.id}`?<>✓</>:<><Link size={12}/> Copy URL</>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {preview && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}} onClick={()=>setPreview(null)}>
          <div style={{background:'#fff',borderRadius:20,padding:32,maxWidth:380,width:'100%',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <h2 style={{fontSize:20,fontWeight:700,marginBottom:4}}>{preview.label}</h2>
            <p style={{fontSize:13,color:'var(--gray-500)',marginBottom:20}}>{preview.type}</p>
            <div style={{display:'flex',justifyContent:'center',padding:20,background:'var(--gray-50)',borderRadius:12,marginBottom:16}}>
              <QrBox url={preview.targetUrl} size={200}/>
            </div>
            <p style={{fontSize:11,fontFamily:'monospace',color:'var(--gray-400)',marginBottom:20,wordBreak:'break-all'}}>{preview.targetUrl}</p>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-secondary" style={{flex:1}} onClick={()=>copyUrl(preview.targetUrl,'modal')}>
                {copied==='modal'?'✓ Copied!':'Copy URL'}
              </button>
              <button className="btn btn-primary" style={{flex:1}} onClick={()=>share(preview)}>
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
