// Per-device conveniences for shoppers without an account (stored only in this browser).
const DETAILS_KEY = 'coreman-guest-details';
const ORDERS_KEY = 'coreman-guest-orders';

const read = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

/** Name, phone and address from this device's last guest order, to prefill checkout. */
export const loadGuestDetails = () => read(DETAILS_KEY, null);
export const saveGuestDetails = ({ recipientName, phone, street, city, zipCode }) =>
  write(DETAILS_KEY, { recipientName, phone, street, city, zipCode });

/** Recent guest orders placed on this device: [{ orderNumber, phone, at }], newest first. */
export const recentGuestOrders = () => read(ORDERS_KEY, []);
export const rememberGuestOrder = (orderNumber, phone) =>
  write(ORDERS_KEY, [{ orderNumber, phone, at: Date.now() }, ...recentGuestOrders().filter(o => o.orderNumber !== orderNumber)].slice(0, 10));
