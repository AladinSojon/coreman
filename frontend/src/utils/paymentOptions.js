import { useEffect, useState } from 'react';
import api from '../api/client';

// Whether online payment (SSLCommerz) is switched on — decided by the backend's credentials.
// Fetched once per page load and shared, so text across the site matches what checkout offers.
let cached = null;
export function getOnlinePayments() {
  if (!cached) {
    cached = api.get('/api/payments/sslcommerz/status')
      .then(r => !!r.data.enabled)
      .catch(() => false);
  }
  return cached;
}

export function useOnlinePayments() {
  const [online, setOnline] = useState(false);
  useEffect(() => { let alive = true; getOnlinePayments().then(v => alive && setOnline(v)); return () => { alive = false; }; }, []);
  return online;
}
