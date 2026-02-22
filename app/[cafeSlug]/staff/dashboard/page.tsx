'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCafeBySlug, getCafeOrders, getMenuItems, Order, MenuItem, Cafe } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, LogOut, Settings, RefreshCw, FileText, Download } from 'lucide-react';
import { StaffOrdersView } from '@/components/StaffOrdersView';
import { MenuManagement } from '@/components/MenuManagement';

export default function StaffDashboard() {
  const params = useParams();
  const router = useRouter();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [refreshing, setRefreshing] = useState(false);

  const cafeSlug = params.cafeSlug as string;

  const loadData = async () => {
    try {
      const cafeData = await getCafeBySlug(cafeSlug);
      if (!cafeData) {
        router.push(`/${cafeSlug}/staff/login`);
        return;
      }

      setCafe(cafeData);
      const [ordersData, menuData] = await Promise.all([
        getCafeOrders(cafeData.id),
        getMenuItems(cafeData.id),
      ]);

      setOrders(ordersData.sort((a, b) => b.createdAt - a.createdAt));
      setMenuItems(menuData);
    } catch (error) {
      console.error('[v0] Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto-refresh orders every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [cafeSlug]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(`current_cafe_id`);
    router.push(`/${cafeSlug}/staff/login`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cafe) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Failed to load cafe information</p>
      </div>
    );
  }

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const preparingCount = orders.filter((o) => o.status === 'confirmed' || o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{cafe.name}</h1>
            <p className="text-sm text-muted-foreground">Staff Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <a href={`/owner/bills`} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="sm"
                title="View bills and invoices"
              >
                <FileText className="h-4 w-4 mr-2" />
                Bills
              </Button>
            </a>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-transparent"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              onClick={() => setActiveTab('menu')}
              variant={activeTab === 'menu' ? 'default' : 'outline'}
              size="sm"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Menu Settings
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Order Stats */}
        {activeTab === 'orders' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-6 border-l-4 border-l-yellow-600">
              <p className="text-muted-foreground text-sm mb-1">New Orders</p>
              <p className="text-4xl font-bold text-yellow-600">{pendingCount}</p>
              <p className="text-xs text-muted-foreground mt-2">Waiting for confirmation</p>
            </Card>
            <Card className="p-6 border-l-4 border-l-orange-600">
              <p className="text-muted-foreground text-sm mb-1">Being Prepared</p>
              <p className="text-4xl font-bold text-orange-600">{preparingCount}</p>
              <p className="text-xs text-muted-foreground mt-2">In kitchen</p>
            </Card>
            <Card className="p-6 border-l-4 border-l-green-600">
              <p className="text-muted-foreground text-sm mb-1">Ready for Pickup</p>
              <p className="text-4xl font-bold text-green-600">{readyCount}</p>
              <p className="text-xs text-muted-foreground mt-2">Waiting for customer</p>
            </Card>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'orders' && <StaffOrdersView orders={orders} onRefresh={handleRefresh} />}

        {activeTab === 'menu' && <MenuManagement items={menuItems} onUpdate={handleRefresh} />}
      </div>
    </div>
  );
}
