'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCafeBySlug, getCafeOrders, getMenuItems, Order, MenuItem, Cafe, getCafeCategories, getAdminSettings, isPaymentOverdue } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, LogOut, Settings, RefreshCw, FileText, Download, ArrowLeft, Utensils, Maximize, Minimize, ShieldAlert, X } from 'lucide-react';
import { StaffOrdersView } from '@/components/StaffOrdersView';
import { MenuManagement } from '@/components/MenuManagement';
import Link from 'next/link';
import { auth } from '@/lib/firebase';

export default function StaffDashboard() {
  const params = useParams();
  const router = useRouter();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [refreshing, setRefreshing] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [manualOrderTable, setManualOrderTable] = useState('1');
  const [isOwner, setIsOwner] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [isOverdue, setIsOverdue] = useState(false);

  const cafeSlug = params.cafeSlug as string;

  const loadData = async () => {
    try {
      const cafeData = await getCafeBySlug(cafeSlug);
      if (!cafeData) {
        router.push('/owner/login');
        return;
      }

      setCafe(cafeData);
      const [ordersData, menuData, categoriesData, settings] = await Promise.all([
        getCafeOrders(cafeData.id),
        getMenuItems(cafeData.id),
        getCafeCategories(cafeData.id),
        getAdminSettings(),
      ]);

      setAdminSettings(settings);

      if (cafeData.setupFeeStatus === 'paid') {
        const overdue = await isPaymentOverdue(cafeData.id);
        setIsOverdue(overdue);
      } else if (cafeData.setupFeeStatus === 'pending' || cafeData.setupFeeStatus === 'rejected') {
        setIsOverdue(true);
      }

      setOrders(ordersData.sort((a, b) => b.createdAt - a.createdAt));
      setMenuItems(menuData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('[v0] Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setIsOwner(!!user);
    });

    // Auto-refresh orders every 5 seconds
    const interval = setInterval(loadData, 5000);

    // Listen for fullscreen chagnes via escape key etc
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      clearInterval(interval);
      unsubscribeAuth();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [cafeSlug]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(`current_cafe_id`);
    // Note: since staff_session is an HttpOnly cookie, ideally we should have a logout API route to clear it,
    // but the system was designed with a client-side route kick-out for now. Let's just redirect.
    router.replace('/owner/login');
  };

  const handleBack = () => {
    if (activeTab === 'menu') {
      setActiveTab('orders');
      return;
    }

    if (isOwner) {
      router.replace('/owner/dashboard');
    } else {
      handleLogout();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
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

  if (adminSettings?.maintenanceMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background border-t-8 border-amber-500">
        <div className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">System Maintenance</h1>
          <p className="text-muted-foreground text-lg">
            The platform is currently undergoing scheduled maintenance. Dashboard access is temporarily paused.
          </p>
          <Button onClick={handleLogout} variant="outline" className="w-full mt-4">
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </div>
    );
  }

  if (!cafe.isActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background border-t-8 border-red-600">
        <div className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Account Suspended</h1>
          <p className="text-muted-foreground text-lg">
            This cafe account has been blocked by the administration.
          </p>
          <Button onClick={handleLogout} variant="outline" className="w-full mt-4">
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </div>
    );
  }

  if (isOverdue) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background border-t-8 border-red-600">
        <div className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Payment Overdue</h1>
          <p className="text-muted-foreground text-lg">
            Dashboard access is temporarily restricted due to overdue cafe payments. Please contact the cafe owner.
          </p>
          <Button onClick={handleLogout} variant="outline" className="w-full mt-4">
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
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
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{cafe.name}</h1>
              <p className="text-sm text-muted-foreground">Staff Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowTableModal(true)}
              variant="default"
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              title="Create a manual order for a customer"
            >
              <Utensils className="h-4 w-4 mr-2" />
              Manual Order
            </Button>
            <Link href={`/${cafeSlug}/staff/bills`}>
              <Button
                variant="outline"
                size="sm"
                title="View bills and invoices"
              >
                <FileText className="h-4 w-4 mr-2" />
                Bills
              </Button>
            </Link>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-transparent"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
            <Button
              onClick={toggleFullscreen}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-transparent"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
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
            {/* <Button onClick={handleLogout} variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
              <LogOut className="h-4 w-4" />
              Logout
            </Button> */}
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

        {activeTab === 'menu' && <MenuManagement items={menuItems} categories={categories} onUpdate={handleRefresh} isStaff={true} />}
      </div>

      {showTableModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold mb-4 text-foreground">Manual Order</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-foreground">Select Table Number</label>
              <select
                value={manualOrderTable}
                onChange={(e) => setManualOrderTable(e.target.value)}
                className="w-full border rounded-lg p-2 bg-background text-foreground focus:ring-2 focus:ring-primary"
              >
                {Array.from({ length: cafe.tables }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Table {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowTableModal(false)}>Cancel</Button>
              <Button onClick={() => {
                setShowTableModal(false);
                router.push(`/${cafeSlug}/menu?table=${manualOrderTable}&staff=true`);
              }}>Continue</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
