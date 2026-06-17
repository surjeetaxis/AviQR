import { ArrowRight } from 'lucide-react';
import './OrderRow.css';

const STATUS_LABEL = { NEW:'New', ACCEPTED:'Accepted', PREPARING:'Preparing', READY:'Ready!', COMPLETED:'Done', CANCELLED:'Cancelled' };
const STATUS_NEXT  = { NEW:'ACCEPTED', ACCEPTED:'PREPARING', PREPARING:'READY', READY:'COMPLETED' };
const STATUS_CTA   = { NEW:'Accept', ACCEPTED:'Start cooking', PREPARING:'Mark ready', READY:'Mark done' };
const STATUS_COLOR = { NEW:'#2563EB', ACCEPTED:'#D97706', PREPARING:'#D97706', READY:'#1D9E75', COMPLETED:'#6B7280', CANCELLED:'#DC2626' };

function timeSince(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

export default function OrderRow({ order, onAdvance }) {
  const next = STATUS_NEXT[order.status];
  const color = STATUS_COLOR[order.status] || '#6B7280';

  return (
    <div className="order-row">
      <div className="order-row-left">
        <span className="order-row-num">{order.orderNumber}</span>
        <span className="order-row-sep">·</span>
        <span className="order-row-customer">{order.customerName}</span>
        {order.tableNumber && <span className="order-row-table">T{order.tableNumber}</span>}
        <span className="order-row-time">{timeSince(order.createdAt)}</span>
      </div>
      <div className="order-row-items">
        {(order.items || []).slice(0,2).map((it, i) => (
          <span key={i} className="order-row-item">{it.itemName || it.name}{it.quantity > 1 ? ` ×${it.quantity}` : ''}</span>
        ))}
        {(order.items || []).length > 2 && <span className="order-row-item">+{order.items.length - 2}</span>}
      </div>
      <div className="order-row-right">
        <span className="order-row-amount">₹{parseFloat(order.totalAmount || 0).toFixed(0)}</span>
        <span className="order-row-status" style={{ background: color + '18', color }}>{STATUS_LABEL[order.status]}</span>
        {next && onAdvance && (
          <button className="order-row-advance" onClick={() => onAdvance(order, next)}>
            {STATUS_CTA[order.status]} <ArrowRight size={11}/>
          </button>
        )}
      </div>
    </div>
  );
}
