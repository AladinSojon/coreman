import { useEffect, useState } from 'react';
import api from '../api/client';

// One request shared by the top bar, home banner and product pages; refreshed every minute.
let cached = null;
let cachedAt = 0;

export function fetchLiveCampaigns(force = false) {
  if (!force && cached && Date.now() - cachedAt < 60_000) return cached;
  cachedAt = Date.now();
  cached = api.get('/api/campaigns/live').then(r => r.data).catch(() => { cachedAt = 0; return []; });
  return cached;
}

/** Live campaigns (biggest discount first). Re-checks when the first one ends. */
export function useLiveCampaigns() {
  const [list, setList] = useState([]);
  useEffect(() => {
    let alive = true;
    let timer;
    const load = (force) => fetchLiveCampaigns(force).then(l => {
      if (!alive) return;
      setList(l);
      const next = Math.min(...l.map(c => new Date(c.endsAt).getTime()), Date.now() + 10 * 60_000);
      timer = setTimeout(() => load(true), Math.max(next - Date.now() + 1500, 5000));
    });
    load(false);
    return () => { alive = false; clearTimeout(timer); };
  }, []);
  return list;
}

/** Time left until `to`, ticking every second. */
export function useCountdown(to) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!to) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [to]);
  const ms = Math.max(0, new Date(to).getTime() - now);
  const s = Math.floor(ms / 1000);
  return { done: ms <= 0, days: Math.floor(s / 86400), hours: Math.floor(s / 3600) % 24, minutes: Math.floor(s / 60) % 60, seconds: s % 60 };
}

/** "2d 4h", "3h 12m", "12m 5s" */
export function shortLeft({ days, hours, minutes, seconds }) {
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}
