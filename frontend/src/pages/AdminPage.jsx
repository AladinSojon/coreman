import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Users, Package, ShoppingCart, BarChart3 } from 'lucide-react';
import api from '../api/client';
import './AdminPage.css';

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/api/admin/dashboard').then(r => setStats(r.data)).catch(() => {});
  }, []);

  if (!isAdmin) return <Navigate to="/" />;

  return (
    <div className="page container">
      <h1 className="page-title">Admin Dashboard</h1>
      <div className="admin-stats">
        <div className="stat-card card">
          <div className="stat-icon"><Users size={24} /></div>
          <div><p className="stat-value">{stats?.totalUsers || 0}</p><p className="text-muted">Total Users</p></div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon"><Package size={24} /></div>
          <div><p className="stat-value">{stats?.totalProducts || 0}</p><p className="text-muted">Products</p></div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon"><ShoppingCart size={24} /></div>
          <div><p className="stat-value">{stats?.totalOrders || 0}</p><p className="text-muted">Orders</p></div>
        </div>
      </div>
    </div>
  );
}
