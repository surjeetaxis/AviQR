import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZES = [10, 20, 50, 100];

const navBtnStyle = (disabled) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 6, border: '1px solid var(--gray-200)',
  background: '#fff', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
});

// Accepts a Spring-style Page object: { content, number, size, totalElements, totalPages }
// `number` is the current page index (0-based) — Spring Data's Page uses `number`,
// our own raw-SQL endpoints (e.g. report-service history) mirror that same shape.
export default function Pagination({ page, onPageChange, onSizeChange }) {
  if (!page) return null;
  const { number = 0, size = 20, totalPages = 0, totalElements = 0 } = page;

  if (totalElements === 0) return null;

  const from = number * size + 1;
  const to = Math.min((number + 1) * size, totalElements);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 4px', flexWrap: 'wrap' }}>
      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
        Showing {from}–{to} of {totalElements}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onSizeChange && (
          <select
            value={size}
            onChange={e => onSizeChange(Number(e.target.value))}
            style={{ height: 30, fontSize: 12, border: '1px solid var(--gray-200)', borderRadius: 6, padding: '0 6px' }}
          >
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
          </select>
        )}
        <button
          disabled={number <= 0}
          onClick={() => onPageChange(number - 1)}
          style={navBtnStyle(number <= 0)}
        >
          <ChevronLeft size={13} />
        </button>
        <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
          Page {number + 1} of {Math.max(totalPages, 1)}
        </span>
        <button
          disabled={number + 1 >= totalPages}
          onClick={() => onPageChange(number + 1)}
          style={navBtnStyle(number + 1 >= totalPages)}
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
