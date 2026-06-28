import { useState, useEffect } from 'react';
import {
  TrendingUp, BarChart3, DollarSign, Package,
  RefreshCw, Download, Bike, UtensilsCrossed, ShoppingBag
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell, PieChart, Pie, Legend
} from 'recharts';
import { useAuth } from '../context/AuthContext.jsx';
import { reportApi, rawMaterialApi } from '../api/index.js';

const PALETTE  = ['#1D9E75','#2563EB','#7C3AED','#D97706','#DC2626','#0891B2'];
const AGG_COLORS= { ZOMATO:'#E32', SWIGGY:'#FC8019', DUNZO:'#00D67F', DIRECT:'#1D9E75' };
const AGG_LABEL = { ZOMATO:'Zomato', SWIGGY:'Swiggy', DUNZO:'Dunzo', DIRECT:'Direct (QR/Walk-in)' };

function StatCard({ icon:Icon, label, value, sub, color }) {
  return (
    <div className="card" style={{ position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:12, right:12, width:36, height:36, borderRadius:10, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ fontSize:11, fontWeight:600, color:'var(--gray-500)', textTransform:'uppercase', letterSpacing:.4, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:800, color:'var(--gray-900)', marginBottom:4 }}>{value || '—'}</div>
      {sub && <div style={{ fontSize:11, color:'var(--gray-400)' }}>{sub}</div>}
    </div>
  );
}

const fmtRupee = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;

export default function Analytics() {
  const { user } = useAuth();
  const shopId = user?.shopId;

  const [range,   setRange]  = useState(30);
  const [tab,     setTab]    = useState('overview');
  const [loading, setLoad]   = useState(true);

  const [stats,   setStats]  = useState(null);
  const [revenue, setRev]    = useState([]);
  const [topItems,setTop]    = useState([]);
  const [peakHrs, setPeak]   = useState([]);
  const [catData, setCat]    = useState([]);
  const [rawMats, setRaw]    = useState([]);
  const [orderTypes,setTypes]= useState([]);
  const [aggBreak,setAgg]    = useState([]);

  const load = async () => {
    if (!shopId) return;
    setLoad(true);
    try {
      const [sR, rR, tR, pR, mR, oR, aR] = await Promise.allSettled([
        reportApi.getDaily(shopId),
        reportApi.getRevenue(shopId, range),
        reportApi.getTopItems(shopId),
        reportApi.getPeakHours(shopId),
        rawMaterialApi.getByShop(shopId),
        fetch(`${import.meta.env.VITE_API_URL||'http://localhost:8080'}/api/v1/reports/shop/${shopId}/order-types?days=${range}`, {
          headers:{ Authorization:`Bearer ${localStorage.getItem('aviqr_token')}` }
        }).then(r=>r.json()),
        fetch(`${import.meta.env.VITE_API_URL||'http://localhost:8080'}/api/v1/reports/shop/${shopId}/aggregator-breakdown?days=${range}`, {
          headers:{ Authorization:`Bearer ${localStorage.getItem('aviqr_token')}` }
        }).then(r=>r.json()),
      ]);
      if (sR.status === 'fulfilled') setStats(sR.value.data.data);
      if (rR.status === 'fulfilled') setRev((rR.value.data.data||[]).map(x=>({ date:String(x.date||'').slice(5), revenue:Number(x.revenue||0), orders:Number(x.orders||0), delivery:Number(x.delivery_count||0), takeaway:Number(x.takeaway_count||0), dine_in:Number(x.dine_in_count||0) })));
      if (tR.status === 'fulfilled') {
        const d = tR.value.data.data || [];
        setTop(d);
        const cm = {};
        d.forEach(i=>{ const c=i.category||'Other'; cm[c]=(cm[c]||0)+Number(i.revenue||0); });
        setCat(Object.entries(cm).map(([name,value])=>({name,value})));
      }
      if (pR.status === 'fulfilled') setPeak((pR.value.data.data||[]).map(x=>({ hour:x.hour, orders:Number(x.order_count||x.orders||0), revenue:Number(x.revenue||0) })));
      if (mR.status === 'fulfilled') setRaw(mR.value.data.data||[]);
      if (oR.status === 'fulfilled') setTypes(oR.value.data?.data || oR.value.data || []);
      if (aR.status === 'fulfilled') setAgg(aR.value.data?.data || aR.value.data || []);
    } catch (e) { console.error(e); }
    finally { setLoad(false); }
  };

  useEffect(() => { load(); }, [range, shopId]);

  // Derived
  const totalRevenue  = revenue.reduce((s,r)=>s+r.revenue,0);
  const totalOrders   = revenue.reduce((s,r)=>s+r.orders,0);
  const avgOrder      = totalOrders ? totalRevenue/totalOrders : 0;
  const invValue      = rawMats.reduce((s,m)=>s+parseFloat(m.currentStock||0)*parseFloat(m.costPerUnit||0),0);
  const lowStockCount = rawMats.filter(m=>parseFloat(m.currentStock||0)<=parseFloat(m.minStockLevel||0)).length;
  const estFoodCostPct= totalRevenue > 0 ? Math.min((invValue*0.3/totalRevenue)*100,45) : 0;
  const grossMargin   = 100 - estFoodCostPct;

  const exportCsv = () => {
    const rows = [
      ['Date','Revenue','Orders'],
      ...revenue.map(r=>[r.date,r.revenue,r.orders]),
      [],
      ['Top Items'],
      ['Name','Sold','Revenue'],
      ...topItems.map(i=>[i.name,i.qty_sold||i.qty||0,i.revenue||0]),
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'}));
    a.download = `analytics_${range}d_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const TABS = [
    { key:'overview',    label:'📊 Overview' },
    { key:'orders',      label:'📦 Orders by Type' },
    { key:'aggregators', label:'🛵 Aggregators' },
    { key:'items',       label:'🏆 Items' },
    { key:'food-cost',   label:'🍽️ Food Cost' },
    { key:'peak',        label:'⏰ Peak Hours' },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1 className="page-title">Analytics & Reporting</h1><p className="page-subtitle">Daily sales, peak hours, top items, aggregators — at a glance</p></div>
        <div className="page-header-actions">
          <div className="seg-control">
            {[7,14,30,90].map(d=><button key={d} className={`seg-btn${range===d?' is-active':''}`} onClick={()=>setRange(d)}>{d}D</button>)}
          </div>
          <button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={13} style={{ animation:loading?'spin 1s linear infinite':'none' }} /></button>
          <button className="btn btn-secondary" onClick={exportCsv}><Download size={13} /> CSV</button>
        </div>
      </div>

      <div className="filter-chips" style={{ marginBottom:20 }}>
        {TABS.map(t=><button key={t.key} className={`chip${tab===t.key?' active':''}`} onClick={()=>setTab(t.key)}>{t.label}</button>)}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
      {tab === 'overview' && (<>
        <div className="kpi-grid" style={{ marginBottom:20 }}>
          <StatCard icon={DollarSign} label={`Revenue (${range}D)`}  value={fmtRupee(totalRevenue)} sub={`${totalOrders.toLocaleString('en-IN')} orders`}      color="#1D9E75"/>
          <StatCard icon={BarChart3}  label="Avg Order Value"         value={fmtRupee(Math.round(avgOrder))}                                                      color="#2563EB"/>
          <StatCard icon={TrendingUp} label="Est. Gross Margin"       value={`${grossMargin.toFixed(1)}%`} sub={`Food cost ~${estFoodCostPct.toFixed(1)}%`}      color="#7C3AED"/>
          <StatCard icon={Package}    label="Raw Material Value"      value={fmtRupee(Math.round(invValue))} sub={lowStockCount>0?`⚠ ${lowStockCount} low stock`:'All stocked'} color="#D97706"/>
        </div>
        <div className="grid-2col">
          <div className="card chart-card">
            <div className="card-header"><div className="card-title">Revenue trend</div><div className="card-subtitle">Last {range} days</div></div>
            <div className="chart-wrap">
              {revenue.length===0 ? <div className="chart-empty">Place orders to see revenue trends</div>
                : <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={revenue} margin={{top:4,right:4,bottom:0,left:-16}}>
                      <defs>
                        <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                      <XAxis dataKey="date" tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v>=1000?Math.round(v/1000)+'k':v}`}/>
                      <Tooltip formatter={v=>[fmtRupee(v),'Revenue']} contentStyle={{borderRadius:8,fontSize:12}}/>
                      <Area type="monotone" dataKey="revenue" stroke="#1D9E75" strokeWidth={2.5} fill="url(#gr)" dot={false} activeDot={{r:4}}/>
                    </AreaChart>
                  </ResponsiveContainer>
              }
            </div>
          </div>
          <div className="card chart-card">
            <div className="card-header"><div className="card-title">Daily orders</div><div className="card-subtitle">Volume trend</div></div>
            <div className="chart-wrap">
              {revenue.length===0 ? <div className="chart-empty">No data yet</div>
                : <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={revenue} margin={{top:4,right:4,bottom:0,left:-16}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                      <XAxis dataKey="date" tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                      <Tooltip formatter={v=>[v,'Orders']} contentStyle={{borderRadius:8,fontSize:12}}/>
                      <Bar dataKey="orders" radius={[3,3,0,0]}>
                        {revenue.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </div>
          </div>
        </div>
      </>)}

      {/* ── ORDERS BY TYPE ────────────────────────────────────────────────── */}
      {tab === 'orders' && (<>
        <div className="grid-2col" style={{ marginBottom:16 }}>
          {/* Type breakdown cards */}
          <div className="card">
            <div className="card-title" style={{ marginBottom:16 }}>Order type breakdown</div>
            {orderTypes.length === 0
              ? <div style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)', fontSize:13 }}>No order type data yet</div>
              : orderTypes.map((t,i)=>{
                  const typeInfo = { DINE_IN:{label:'Dine-in',icon:UtensilsCrossed,color:'#1D9E75'}, TAKEAWAY:{label:'Takeaway',icon:ShoppingBag,color:'#7C3AED'}, DELIVERY:{label:'Delivery',icon:Bike,color:'#D97706'} }[t.type] || {label:t.type,icon:Package,color:'#6B7280'};
                  const totalOrd = orderTypes.reduce((s,x)=>s+Number(x.orders||0),0);
                  const pct = totalOrd > 0 ? ((Number(t.orders||0)/totalOrd)*100).toFixed(0) : 0;
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid var(--gray-100)' }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:typeInfo.color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <typeInfo.icon size={18} color={typeInfo.color}/>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:600 }}>{typeInfo.label}</div>
                        <div style={{ height:6, borderRadius:3, background:'#f3f4f6', marginTop:6, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:typeInfo.color, borderRadius:3 }}/>
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:16, fontWeight:800 }}>{Number(t.orders||0).toLocaleString('en-IN')}</div>
                        <div style={{ fontSize:12, color:'var(--gray-400)' }}>{pct}% · {fmtRupee(t.revenue)}</div>
                      </div>
                    </div>
                  );
                })
            }
          </div>

          {/* Stacked area chart by order type */}
          <div className="card chart-card">
            <div className="card-header"><div className="card-title">Orders by type — trend</div></div>
            <div className="chart-wrap">
              {revenue.length === 0 ? <div className="chart-empty">No data</div>
                : <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={revenue} margin={{top:4,right:4,bottom:0,left:-16}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                      <XAxis dataKey="date" tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={{borderRadius:8,fontSize:12}}/>
                      <Legend iconType="circle" iconSize={8} formatter={v=><span style={{fontSize:11}}>{v}</span>}/>
                      <Area type="monotone" dataKey="dine_in"  stackId="1" stroke="#1D9E75" fill="#1D9E7533" name="Dine-in"/>
                      <Area type="monotone" dataKey="takeaway" stackId="1" stroke="#7C3AED" fill="#7C3AED33" name="Takeaway"/>
                      <Area type="monotone" dataKey="delivery" stackId="1" stroke="#D97706" fill="#D9770633" name="Delivery"/>
                    </AreaChart>
                  </ResponsiveContainer>
              }
            </div>
          </div>
        </div>
      </>)}

      {/* ── AGGREGATORS ───────────────────────────────────────────────────── */}
      {tab === 'aggregators' && (<>
        <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:8, padding:'12px 16px', fontSize:13, color:'#1D4ED8', marginBottom:16 }}>
          <strong>Aggregator Integration</strong> — Orders from Zomato and Swiggy appear here when you configure the webhook URL in your aggregator partner portal. All orders flow into the same queue as dine-in and takeaway orders.
          <div style={{ marginTop:6, fontSize:12 }}>
            Zomato webhook URL: <code style={{ background:'#DBEAFE', padding:'1px 6px', borderRadius:4 }}>https://api.aviqr.in/api/v1/aggregator/zomato/webhook</code><br/>
            Swiggy webhook URL: <code style={{ background:'#DBEAFE', padding:'1px 6px', borderRadius:4 }}>https://api.aviqr.in/api/v1/aggregator/swiggy/webhook</code>
          </div>
        </div>

        <div className="grid-2col">
          <div className="card">
            <div className="card-title" style={{ marginBottom:16 }}>Revenue by source</div>
            {aggBreak.length === 0
              ? <div style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)', fontSize:13 }}>
                  No aggregator orders yet. Configure the webhook URL in Zomato or Swiggy partner portal.
                </div>
              : aggBreak.map((a,i)=>{
                  const src = String(a.source||'DIRECT').toUpperCase();
                  const col = AGG_COLORS[src] || '#6B7280';
                  const lbl = AGG_LABEL[src] || src;
                  const total = aggBreak.reduce((s,x)=>s+Number(x.revenue||0),0);
                  const pct = total > 0 ? ((Number(a.revenue||0)/total)*100).toFixed(0) : 0;
                  return (
                    <div key={i} style={{ padding:'12px 0', borderBottom:'1px solid var(--gray-100)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ width:10, height:10, borderRadius:2, background:col, display:'inline-block' }}/>
                          <span style={{ fontWeight:600 }}>{lbl}</span>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <span style={{ fontWeight:700 }}>{fmtRupee(a.revenue)}</span>
                          <span style={{ fontSize:11, color:'var(--gray-400)', marginLeft:6 }}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{ height:6, borderRadius:3, background:'#f3f4f6', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:col, borderRadius:3 }}/>
                      </div>
                      <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:3 }}>{Number(a.orders||0).toLocaleString('en-IN')} orders</div>
                    </div>
                  );
                })
            }
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom:16 }}>Setup guide</div>
            {[
              { step:'1', title:'Zomato Partner Portal', detail:'Go to Integrations → POS Webhook → enter your AviQR webhook URL', action:'Open Zomato Portal →', link:'https://partner.zomato.com' },
              { step:'2', title:'Swiggy Restaurant Hub', detail:'Go to Settings → Order Push URL → enter your AviQR webhook URL', action:'Open Swiggy Hub →', link:'https://partner.swiggy.com' },
              { step:'3', title:'Map your restaurant IDs', detail:'In AviQR Settings → Integrations, enter your Zomato/Swiggy restaurant ID to link incoming orders to your shop', action:'Go to Settings →', link:'/settings' },
              { step:'4', title:'Test with a live order', detail:'Place a test order on Zomato/Swiggy. It should appear in your AviQR order list within 30 seconds.', action:null },
            ].map(s=>(
              <div key={s.step} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid var(--gray-100)' }}>
                <div style={{ width:28, height:28, borderRadius:8, background:'#EFF6FF', color:'#2563EB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>{s.step}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{s.title}</div>
                  <div style={{ fontSize:12, color:'var(--gray-500)', marginTop:2, lineHeight:1.4 }}>{s.detail}</div>
                  {s.action && <a href={s.link} target={s.link.startsWith('http')?'_blank':'_self'} style={{ fontSize:12, color:'#2563EB', textDecoration:'none', display:'inline-block', marginTop:4, fontWeight:600 }}>{s.action}</a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </>)}

      {/* ── ITEMS ─────────────────────────────────────────────────────────── */}
      {tab === 'items' && (
        <div className="grid-2col">
          <div className="card">
            <div className="card-title" style={{ marginBottom:16 }}>Top items by revenue</div>
            {topItems.length === 0
              ? <div style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)', fontSize:13 }}>No sales data yet</div>
              : topItems.slice(0,10).map((item,i)=>{
                  const maxRev = topItems[0]?.revenue || 1;
                  const pct = (Number(item.revenue||0)/Number(maxRev))*100;
                  return (
                    <div key={i} style={{ marginBottom:12 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                          <span style={{ fontSize:11, fontWeight:700, color:'white', background:i<3?'#1D9E75':'#9CA3AF', width:20, height:20, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center' }}>#{i+1}</span>
                          <span style={{ fontWeight:500 }}>{item.name}</span>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontWeight:700, color:'var(--green-dark)' }}>{fmtRupee(item.revenue)}</div>
                          <div style={{ fontSize:11, color:'var(--gray-400)' }}>{item.qty_sold||item.qty||0} sold</div>
                        </div>
                      </div>
                      <div style={{ height:5, borderRadius:3, background:'#f3f4f6' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:i<3?'#1D9E75':'#93C5FD', borderRadius:3 }}/>
                      </div>
                    </div>
                  );
                })
            }
          </div>
          <div className="card chart-card">
            <div className="card-header"><div className="card-title">Revenue by category</div></div>
            {catData.length === 0 ? <div className="chart-empty">No category data</div>
              : <><ResponsiveContainer width="100%" height={200}>
                    <BarChart data={catData} layout="vertical" margin={{left:70,right:20}}>
                      <XAxis type="number" tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false} tickFormatter={v=>fmtRupee(v)}/>
                      <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:'#374151'}} axisLine={false} tickLine={false} width={70}/>
                      <Tooltip formatter={v=>[fmtRupee(v),'Revenue']} contentStyle={{borderRadius:8,fontSize:12}}/>
                      <Bar dataKey="value" radius={[0,4,4,0]}>{catData.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10 }}>
                    {catData.map((c,i)=>(<div key={i} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
                      <div style={{ width:10, height:10, borderRadius:2, background:PALETTE[i%PALETTE.length] }}/><span>{c.name}: {((c.value/catData.reduce((s,x)=>s+x.value,0))*100).toFixed(0)}%</span>
                    </div>))}
                  </div>
                </>
            }
          </div>
        </div>
      )}

      {/* ── FOOD COST ─────────────────────────────────────────────────────── */}
      {tab === 'food-cost' && (
        <div className="grid-2col">
          <div className="card">
            <div className="card-title" style={{ marginBottom:16 }}>Gross Margin Breakdown</div>
            {[
              { label:'Selling Price (Revenue)', value:'100%',                          color:'#1D9E75', bar:100 },
              { label:'Estimated Food Cost',     value:`${estFoodCostPct.toFixed(1)}%`, color:'#DC2626', bar:estFoodCostPct },
              { label:'Gross Margin',            value:`${grossMargin.toFixed(1)}%`,    color:'#7C3AED', bar:grossMargin },
            ].map(({ label, value, color, bar })=>(
              <div key={label} style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:13 }}>
                  <span style={{ fontWeight:500 }}>{label}</span>
                  <span style={{ fontWeight:700, color }}>{value}</span>
                </div>
                <div style={{ height:10, borderRadius:5, background:'#f3f4f6', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${bar}%`, background:color, borderRadius:5, transition:'width .6s' }}/>
                </div>
              </div>
            ))}
            <div style={{ background:estFoodCostPct<35?'#F0FDF4':'#FFFBEB', border:`1px solid ${estFoodCostPct<35?'#BBF7D0':'#FDE68A'}`, borderRadius:8, padding:'10px 14px', fontSize:12, color:estFoodCostPct<35?'#065F46':'#92400E', marginTop:8 }}>
              <strong>Industry benchmark:</strong> Food cost 28–35% | Gross margin 65–72%<br/>
              {estFoodCostPct < 28 ? '✓ Your food cost is excellent — well below average.' :
               estFoodCostPct < 35 ? '✓ Your food cost is within industry norms.' :
               '⚠ Food cost above average — review recipes and supplier rates.'}
            </div>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom:16 }}>Raw Material Stock Levels</div>
            {rawMats.length === 0
              ? <div style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)', fontSize:13 }}>No ingredients tracked — add them in Raw Materials page</div>
              : rawMats.slice(0,10).map(m=>{
                  const cur = parseFloat(m.currentStock||0);
                  const min = parseFloat(m.minStockLevel||0);
                  const pct = min > 0 ? Math.min((cur/min)*100,100) : 100;
                  const isLow = cur <= min;
                  return (
                    <div key={m.id} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                        <span style={{ fontWeight:500 }}>{m.name}</span>
                        <span style={{ color:isLow?'#D97706':'#1D9E75', fontWeight:600 }}>{cur.toFixed(2)} {m.unit}</span>
                      </div>
                      <div style={{ height:6, borderRadius:3, background:'#f3f4f6', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:isLow?'#FCD34D':'#1D9E75', borderRadius:3 }}/>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}

      {/* ── PEAK HOURS ────────────────────────────────────────────────────── */}
      {tab === 'peak' && (
        <div className="grid-2col">
          <div className="card chart-card">
            <div className="card-header"><div className="card-title">Orders by hour</div><div className="card-subtitle">Which hours are busiest</div></div>
            {peakHrs.length === 0 ? <div className="chart-empty">No peak hour data yet</div>
              : <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={peakHrs} margin={{top:4,right:4,bottom:0,left:-16}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                    <XAxis dataKey="hour" tick={{fontSize:9,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v=>[v,'Orders']} contentStyle={{borderRadius:8,fontSize:12}}/>
                    <Bar dataKey="orders" radius={[4,4,0,0]}>
                      {peakHrs.map((h,i)=>{
                        const maxO = Math.max(...peakHrs.map(x=>x.orders));
                        const pct = maxO > 0 ? h.orders/maxO : 0;
                        return <Cell key={i} fill={pct>0.8?'#DC2626':pct>0.6?'#D97706':'#1D9E75'}/>;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
            }
            <div style={{ display:'flex', gap:16, marginTop:10, fontSize:12 }}>
              {[['#DC2626','Peak (>80%)'],['#D97706','Busy (>60%)'],['#1D9E75','Normal']].map(([c,l])=>(
                <div key={l} style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:c }}/>{l}</div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom:16 }}>Staffing Recommendations</div>
            {peakHrs.length === 0
              ? <div style={{ color:'var(--gray-400)', fontSize:13 }}>Place orders to generate peak hour insights</div>
              : (()=>{
                  const maxO = Math.max(...peakHrs.map(h=>h.orders));
                  const peaks = peakHrs.filter(h=>h.orders/maxO>0.7);
                  const slow  = peakHrs.filter(h=>h.orders/maxO<0.3&&h.orders>0);
                  return (
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'12px 14px', fontSize:13, color:'#991B1B' }}>
                        <div style={{ fontWeight:700, marginBottom:4 }}>🔴 Peak hours — full staff needed</div>
                        <div style={{ fontSize:13 }}>{peaks.length > 0 ? peaks.map(h=>h.hour).join(' · ') : 'Not yet identified'}</div>
                        <div style={{ fontSize:12, marginTop:4, color:'#B91C1C' }}>All stations active, manager on floor, prep done before rush</div>
                      </div>
                      <div style={{ background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:8, padding:'12px 14px', fontSize:13, color:'#065F46' }}>
                        <div style={{ fontWeight:700, marginBottom:4 }}>🟢 Slow hours — ideal for prep & cleaning</div>
                        <div style={{ fontSize:13 }}>{slow.length > 0 ? slow.map(h=>h.hour).join(' · ') : 'Not yet identified'}</div>
                        <div style={{ fontSize:12, marginTop:4 }}>Reduce floor staff, focus on mise en place and stock-take</div>
                      </div>
                      <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, padding:'12px 14px', fontSize:13, color:'#92400E' }}>
                        <div style={{ fontWeight:700, marginBottom:4 }}>💡 Scheduling tip</div>
                        <div style={{ fontSize:12 }}>Schedule 1 extra cashier and 1 extra kitchen staff for each peak hour window. This reduces average wait time from 18 min to under 10 min during rush.</div>
                      </div>
                    </div>
                  );
                })()
            }
          </div>
        </div>
      )}
    </div>
  );
}
