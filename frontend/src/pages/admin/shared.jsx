import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
export const PAYMENT_STATUSES = ['UNPAID', 'PAID', 'REFUNDED'];

export const STATUS_LABEL = {
  PENDING: 'Pending', CONFIRMED: 'Confirmed', SHIPPED: 'Shipped', DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
  UNPAID: 'Unpaid', PAID: 'Paid', REFUNDED: 'Refunded',
};

/** ৳1,234 — whole Taka unless there are paisa. */
export function taka(value) {
  const n = Number(value ?? 0);
  const whole = Math.abs(n % 1) < 0.005;
  return '৳' + n.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
}

export function shortTaka(value) {
  const n = Number(value ?? 0);
  if (n >= 100000) return '৳' + (n / 100000).toFixed(n >= 1000000 ? 0 : 1) + 'L';
  if (n >= 1000) return '৳' + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k';
  return taka(n);
}

export function dateTime(s) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function dateOnly(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relative(s) {
  if (!s) return '—';
  const mins = Math.round((Date.now() - new Date(s).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  return days < 30 ? `${days} d ago` : dateOnly(s);
}

/** Status pill: text label + colour, never colour alone. */
export function Pill({ value }) {
  return <span className={`pill pill-${String(value).toLowerCase()}`}>{STATUS_LABEL[value] || value}</span>;
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function Pagination({ page, totalPages, totalElements, onChange, label = 'items' }) {
  if (!totalPages || totalPages <= 1) {
    return totalElements != null ? <p className="pager-info">{totalElements} {label}</p> : null;
  }
  return (
    <div className="pager">
      <p className="pager-info">{totalElements} {label} · page {page + 1} of {totalPages}</p>
      <div className="pager-buttons">
        <button className="btn-outline" disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
        <button className="btn-outline" disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

export function EmptyRow({ cols, children }) {
  return <tr><td colSpan={cols} className="admin-empty">{children}</td></tr>;
}

/** Small toast for "Saved" / errors without alert() popups. */
export function useToast() {
  const [toast, setToast] = useState(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); }, [toast]);
  const node = toast ? <div className={`admin-toast ${toast.type}`} role="status">{toast.text}</div> : null;
  return {
    node,
    ok: (text) => setToast({ type: 'ok', text }),
    error: (err) => setToast({ type: 'error', text: typeof err === 'string' ? err : (err?.response?.data?.message || err?.message || 'Something went wrong') }),
  };
}
