import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { BarChart2, ClipboardList, Package, FolderTree, Users, Star, Boxes } from 'lucide-react';
import InventoryTab from './admin/InventoryTab';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import DashboardTab from './admin/DashboardTab';
import OrdersTab from './admin/OrdersTab';
import ProductsTab from './admin/ProductsTab';
import CategoriesTab from './admin/CategoriesTab';
import CustomersTab from './admin/CustomersTab';
import ReviewsTab from './admin/ReviewsTab';
import './AdminPage.css';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'categories', label: 'Categories', icon: FolderTree },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'reviews', label: 'Reviews', icon: Star },
];

export default function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pending, setPending] = useState(null);

  const tab = TABS.some(t => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'dashboard';
  const params = Object.fromEntries([...searchParams.entries()].filter(([k]) => k !== 'tab'));

  // Badge on the Orders tab: orders still waiting to be processed.
  useEffect(() => {
    if (!isAdmin) return;
    api.get('/api/admin/orders', { params: { status: 'PENDING', size: 1 } })
      .then(r => setPending(r.data.totalElements)).catch(() => {});
  }, [isAdmin, tab]);

  // Wait for the saved session to load before deciding; otherwise a page reload redirects admins away.
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" />;

  /** Switch tab, replacing its filters. */
  const go = (id, next = {}) => {
    const sp = new URLSearchParams({ tab: id });
    Object.entries(next).forEach(([k, v]) => v != null && v !== '' && sp.set(k, String(v)));
    setSearchParams(sp);
    window.scrollTo({ top: 0 });
  };

  /** Merge changes into the current tab's filters (null removes a key). */
  const setParams = (changes) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('tab', tab);
    Object.entries(changes).forEach(([k, v]) => (v == null || v === '' ? sp.delete(k) : sp.set(k, String(v))));
    setSearchParams(sp, { replace: true });
  };

  const props = { params, setParams, go };

  return (
    <div className="page container admin-page">
      <div className="admin-head">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="panel-sub">Signed in as {user?.firstName} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      <nav className="admin-tabs" aria-label="Admin sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
            <Icon size={16} /> {label}
            {id === 'orders' && pending > 0 && <span className="tab-badge" aria-label={`${pending} pending`}>{pending}</span>}
          </button>
        ))}
      </nav>

      {tab === 'dashboard' && <DashboardTab {...props} />}
      {tab === 'orders' && <OrdersTab key="orders" {...props} />}
      {tab === 'products' && <ProductsTab key="products" {...props} />}
      {tab === 'inventory' && <InventoryTab {...props} />}
      {tab === 'categories' && <CategoriesTab {...props} />}
      {tab === 'customers' && <CustomersTab key="customers" {...props} />}
      {tab === 'reviews' && <ReviewsTab {...props} />}
    </div>
  );
}
