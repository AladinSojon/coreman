import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scroll to the top when the page path changes (not when only filters in the query string change). */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
