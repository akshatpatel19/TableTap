'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getCafeByEmail, getSubscription, Cafe, Subscription, createSubscription, createMenuItem, getOrders, updateOrder, Order } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogOut, QrCode, Menu, Users, Settings } from 'lucide-react';
import { SubscriptionPlansComponent, SubscriptionPlan } from '@/components/SubscriptionPlans';
import Link from 'next/link';

export default function OwnerDashboard() {
  const router = useRouter();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlans, setShowPlans] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          router.push('/owner/login');
          return;
        }

        const cafeData = await getCafeByEmail(currentUser.email || '');
        if (!cafeData) {
          router.push('/owner/login');
          return;
        }

        setCafe(cafeData);
        localStorage.setItem('current_cafe_id', cafeData.id);

        const subscriptionData = await getSubscription(cafeData.id);
        setSubscription(subscriptionData);

        const ordersData = await getOrders(cafeData.id);
        setAllOrders(ordersData);
        setOrders(ordersData.slice(0, 10));
      } catch (error) {
        console.error('[v0] Error loading dashboard:', error);
        router.push('/owner/login');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSelectPlan = async (plan: SubscriptionPlan, duration: 'monthly' | 'quarterly' | 'yearly') => {
    if (!cafe) return;

    setProcessingPayment(true);

    try {
      // In production, you would initiate Razorpay payment here
      // For now, we'll create a subscription directly

      const prices: Record<string, Record<string, number>> = {
        basic: { monthly: 499, quarterly: 1399, yearly: 4999 },
        standard: { monthly: 999, quarterly: 2799, yearly: 9999 },
        premium: { monthly: 1999, quarterly: 5599, yearly: 19999 },
      };

      const price = prices[plan.id][duration];
      const durationDays = duration === 'monthly' ? 30 : duration === 'quarterly' ? 90 : 365;

      // If subscription exists, update it; otherwise create new
      if (subscription) {
        // Update existing subscription logic would go here
        console.log('[v0] Update subscription:', { plan: plan.id, duration, price });
      } else {
        const newSubscription = await createSubscription({
          cafeId: cafe.id,
          plan: plan.id,
          tablesIncluded: plan.tablesIncluded,
          monthlyCost: plan.monthlyPrice,
          startDate: Date.now(),
          endDate: Date.now() + durationDays * 24 * 60 * 60 * 1000,
          isActive: true,
          autoRenew: true,
        });

        setSubscription(newSubscription);
      }

      // Create some sample menu items if none exist
      // This would normally be done in a setup wizard

      setShowPlans(false);
    } catch (error) {
      console.error('[v0] Error selecting plan:', error);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/owner/login');
  };

  const handleCancelOrder = async (orderId: string) => {
    // Logic to cancel the order would go here
    console.log('[v0] Cancel order:', orderId);
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

  const isSubscriptionActive = subscription && new Date(subscription.endDate) > new Date();
  const daysRemaining = subscription ? Math.ceil((subscription.endDate - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{cafe.name}</h1>
            <p className="text-sm text-muted-foreground">Owner Dashboard</p>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Card */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-primary/10 to-accent/10">
          <h2 className="text-xl font-bold text-foreground mb-2">Welcome to TableTap!</h2>
          <p className="text-muted-foreground">Manage your cafe, menu, and orders all in one place.</p>
        </Card>

        {/* Subscription Status */}
        {subscription && (
          <Card className={`p-6 mb-8 ${isSubscriptionActive ? 'border-l-4 border-l-green-600' : 'border-l-4 border-l-yellow-600'}`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2 capitalize">{subscription.plan} Plan</h3>
                <p className="text-sm text-muted-foreground mb-2">{subscription.tablesIncluded} tables included</p>
                {isSubscriptionActive ? (
                  <p className="text-sm text-green-600 font-medium">{daysRemaining} days remaining</p>
                ) : (
                  <p className="text-sm text-yellow-600 font-medium">Subscription expired</p>
                )}
              </div>
              <Button onClick={() => setShowPlans(!showPlans)} variant="outline">
                {isSubscriptionActive ? 'Upgrade Plan' : 'Renew Subscription'}
              </Button>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href={`/${cafe.slug}/menu`} className="block">
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow h-full">
              <QrCode className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Customer Menu</h3>
              <p className="text-sm text-muted-foreground">View as customer</p>
            </Card>
          </Link>

          <Link href={`/${cafe.slug}/staff/dashboard`} className="block">
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow h-full">
              <Users className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Staff Dashboard</h3>
              <p className="text-sm text-muted-foreground">Manage orders</p>
            </Card>
          </Link>

          <Link href={`/${cafe.slug}/owner/menu-setup`} className="block">
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow h-full">
              <Menu className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Menu Setup</h3>
              <p className="text-sm text-muted-foreground">Add items</p>
            </Card>
          </Link>

          <Link href={`/${cafe.slug}/owner/qr-codes`} className="block">
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow h-full">
              <QrCode className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Table QR Codes</h3>
              <p className="text-sm text-muted-foreground">Download QR codes</p>
            </Card>
          </Link>

          <Link href={`/${cafe.slug}/owner/settings`} className="block">
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow h-full">
              <Settings className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Settings</h3>
              <p className="text-sm text-muted-foreground">Cafe settings</p>
            </Card>
          </Link>
        </div>

        {/* Recent Orders */}
        {orders.length > 0 && (
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Orders</h3>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-card/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-medium text-foreground">Order #{order.id.slice(0, 8)}</p>
                      <Badge
                        className={
                          order.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                        }
                      >
                        {order.status}
                      </Badge>
                      <Badge
                        className={
                          order.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Table {order.tableId} • {order.items.length} item(s) • ₹{order.totalAmount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Past Orders with Date Filter */}
        {allOrders.length > 0 && (
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Order History</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">Filter by Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-input rounded-lg bg-background text-foreground w-full max-w-xs"
              />
            </div>
            <div className="space-y-3">
              {allOrders
                .filter((order) => {
                  const orderDate = new Date(order.createdAt).toISOString().slice(0, 7);
                  return orderDate === selectedMonth;
                })
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((order) => (
                  <div key={order.id} className="flex items-start justify-between p-3 border rounded-lg text-sm hover:bg-card/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground">Order #{order.id.slice(0, 8)}</p>
                        <Badge
                          className={
                            order.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                          }
                          variant="outline"
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Table {order.tableId} • {order.items.length} items • ₹{order.totalAmount} • {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
                .slice(0, 20)}
            </div>
            {allOrders.filter((o) => new Date(o.createdAt).toISOString().slice(0, 7) === selectedMonth).length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">No orders in this month</p>
            )}
          </Card>
        )}

        {/* Cafe Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Cafe Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Name</p>
              <p className="font-semibold text-foreground">{cafe.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="font-semibold text-foreground">{cafe.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Phone</p>
              <p className="font-semibold text-foreground">{cafe.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Address</p>
              <p className="font-semibold text-foreground">{cafe.address}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Number of Tables</p>
              <p className="font-semibold text-foreground">{cafe.tables}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Menu URL</p>
              <p className="font-semibold text-foreground break-all">
                {process.env.NEXT_PUBLIC_MAIN_DOMAIN}/{cafe.slug}/menu
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Subscription Plans Modal */}
      {showPlans && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Choose Your Plan</h2>
              <Button onClick={() => setShowPlans(false)} variant="outline" size="sm">
                Close
              </Button>
            </div>
            <SubscriptionPlansComponent
              onSelectPlan={handleSelectPlan}
              loading={processingPayment}
              selectedPlan={subscription?.plan}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
