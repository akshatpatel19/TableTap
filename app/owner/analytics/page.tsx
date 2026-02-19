'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getCafeByEmail, getOrders, Order } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronLeft, TrendingUp, ShoppingCart, DollarSign, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface AnalyticsData {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  completedOrders: number;
  pendingOrders: number;
  cancellationRate: number;
  paymentSuccess: number;
  topItems: Array<{ name: string; count: number; revenue: number; margin?: number }>;
  dailyRevenue: Array<{ date: string; amount: number; orders: number }>;
  hourlyOrders: Array<{ hour: string; count: number; revenue: number }>;
  paymentMethods: Array<{ method: string; count: number; amount: number }>;
  orderStatus: Array<{ status: string; count: number }>;
  revenueTrend: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [cafe, setCafe] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'all'>('month');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.push('/owner/login');
        return;
      }

      try {
        const cafeData = await getCafeByEmail(currentUser.email || '');
        if (!cafeData) {
          router.push('/owner/login');
          return;
        }

        setCafe(cafeData);
        const ordersData = await getOrders(cafeData.id);
        setOrders(ordersData);
        calculateAnalytics(ordersData, dateRange);
      } catch (error) {
        console.error('Error loading analytics:', error);
        router.push('/owner/login');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const getDateFilter = () => {
    const now = Date.now();
    switch (dateRange) {
      case 'today':
        return now - 24 * 60 * 60 * 1000;
      case 'week':
        return now - 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return now - 30 * 24 * 60 * 60 * 1000;
      case 'quarter':
        return now - 90 * 24 * 60 * 60 * 1000;
      case 'all':
        return 0;
    }
  };

  const calculateAnalytics = (ordersData: Order[], range: string) => {
    const filterDate = getDateFilter();
    const filteredOrders = ordersData.filter(order => order.createdAt >= filterDate);

    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter(o => o.paymentStatus === 'paid').length;
    const pendingOrders = filteredOrders.filter(o => o.paymentStatus === 'pending').length;
    const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled').length;
    const totalRevenue = filteredOrders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;
    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
    const paymentSuccess = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // Top items calculation
    const itemMap = new Map<string, { count: number; revenue: number; quantity: number }>();
    filteredOrders.forEach(order => {
      order.items?.forEach((item: any) => {
        const existing = itemMap.get(item.name) || { count: 0, revenue: 0, quantity: 0 };
        itemMap.set(item.name, {
          count: existing.count + 1,
          revenue: existing.revenue + ((item.price || 0) * (item.quantity || 1)),
          quantity: existing.quantity + (item.quantity || 1),
        });
      });
    });

    const topItems = Array.from(itemMap.entries())
      .map(([name, data]) => ({ name, count: data.quantity, revenue: data.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Daily revenue
    const dailyMap = new Map<string, { amount: number; orders: number }>();
    filteredOrders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString();
      const existing = dailyMap.get(date) || { amount: 0, orders: 0 };
      dailyMap.set(date, {
        amount: existing.amount + (order.paymentStatus === 'paid' ? order.totalAmount : 0),
        orders: existing.orders + (order.paymentStatus === 'paid' ? 1 : 0),
      });
    });

    const dailyRevenue = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Hourly orders with revenue
    const hourlyMap = new Map<string, { count: number; revenue: number }>();
    filteredOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      const hourStr = `${hour}:00`;
      const existing = hourlyMap.get(hourStr) || { count: 0, revenue: 0 };
      hourlyMap.set(hourStr, {
        count: existing.count + 1,
        revenue: existing.revenue + (order.paymentStatus === 'paid' ? order.totalAmount : 0),
      });
    });

    const hourlyOrders = Array.from(hourlyMap.entries())
      .map(([hour, data]) => ({ hour, ...data }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

    // Payment methods breakdown
    const paymentMethodMap = new Map<string, { count: number; amount: number }>();
    filteredOrders.forEach(order => {
      const method = order.paymentMethod || 'unknown';
      const existing = paymentMethodMap.get(method) || { count: 0, amount: 0 };
      paymentMethodMap.set(method, {
        count: existing.count + 1,
        amount: existing.amount + (order.paymentStatus === 'paid' ? order.totalAmount : 0),
      });
    });

    const paymentMethods = Array.from(paymentMethodMap.entries())
      .map(([method, data]) => ({ method, ...data }));

    // Order status breakdown
    const statusMap = new Map<string, number>();
    filteredOrders.forEach(order => {
      statusMap.set(order.status, (statusMap.get(order.status) || 0) + 1);
    });

    const orderStatus = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }));

    // Calculate revenue trend
    const previousPeriodDate = filterDate - (Date.now() - filterDate);
    const previousOrders = ordersData.filter(o => o.createdAt >= previousPeriodDate && o.createdAt < filterDate);
    const previousRevenue = previousOrders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const revenueTrend = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    setAnalytics({
      totalOrders,
      totalRevenue,
      averageOrderValue,
      completedOrders,
      pendingOrders,
      cancellationRate,
      paymentSuccess,
      topItems,
      dailyRevenue,
      hourlyOrders,
      paymentMethods,
      orderStatus,
      revenueTrend,
    });
  };

  const handleDateRangeChange = (range: 'today' | 'week' | 'month' | 'quarter' | 'all') => {
    setDateRange(range);
    calculateAnalytics(orders, range);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/owner/dashboard">
              <Button size="sm" variant="ghost" className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Date Range Filter */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {(['today', 'week', 'month', 'quarter', 'all'] as const).map(range => (
            <Button
              key={range}
              onClick={() => handleDateRangeChange(range)}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              className={dateRange === range ? 'bg-primary' : 'bg-transparent'}
            >
              {range === 'quarter' ? 'Q' : range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>

        {/* Key Metrics */}
        {analytics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Revenue</p>
                    <p className="text-3xl font-bold text-foreground">₹{analytics.totalRevenue.toFixed(0)}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className={`h-3 w-3 ${analytics.revenueTrend >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                      <p className={`text-xs font-medium ${analytics.revenueTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analytics.revenueTrend >= 0 ? '+' : ''}{analytics.revenueTrend.toFixed(1)}% vs last period
                      </p>
                    </div>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Orders</p>
                    <p className="text-3xl font-bold text-foreground">{analytics.totalOrders}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {((analytics.completedOrders / analytics.totalOrders) * 100).toFixed(1)}% completed
                    </p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-accent opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Avg Order Value</p>
                    <p className="text-3xl font-bold text-foreground">
                      ₹{analytics.averageOrderValue.toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">Per completed order</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600 opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Payment Success Rate</p>
                    <p className="text-3xl font-bold text-foreground">{analytics.paymentSuccess.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-2">{analytics.pendingOrders} awaiting payment</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-600 opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Cancellation Rate</p>
                    <p className="text-3xl font-bold text-foreground text-red-600">{analytics.cancellationRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-2">Lower is better</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600 opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Online Orders</p>
                    <p className="text-3xl font-bold text-foreground">
                      {analytics.paymentMethods.find(m => m.method === 'online')?.count || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ₹{analytics.paymentMethods.find(m => m.method === 'online')?.amount.toFixed(0) || 0}
                    </p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-blue-600 opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Counter Orders</p>
                    <p className="text-3xl font-bold text-foreground">
                      {analytics.paymentMethods.find(m => m.method === 'counter')?.count || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ₹{analytics.paymentMethods.find(m => m.method === 'counter')?.amount.toFixed(0) || 0}
                    </p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-purple-600 opacity-20" />
                </div>
              </Card>
            </div>

            {/* Top Items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Top Selling Items</h3>
                <div className="space-y-3">
                  {analytics.topItems.length > 0 ? (
                    analytics.topItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => setSelectedItem(selectedItem === item.name ? null : item.name)}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.count} sold</p>
                        </div>
                        <p className="font-semibold text-primary">₹{item.revenue.toFixed(0)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No data available</p>
                  )}
                </div>
              </Card>

              {/* Hourly Distribution */}
              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Peak Hours Analysis</h3>
                <div className="space-y-2">
                  {analytics.hourlyOrders.length > 0 ? (
                    analytics.hourlyOrders.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <p className="text-sm text-muted-foreground w-12">{item.hour}</p>
                        <div className="flex-1 bg-muted rounded-full h-8 flex items-center relative">
                          <div
                            className="bg-primary rounded-full h-8 flex items-center justify-end pr-2 gap-2"
                            style={{
                              width: `${(item.count / Math.max(...analytics.hourlyOrders.map(o => o.count), 1)) * 100}%`,
                            }}
                          >
                            {item.count > 0 && (
                              <span className="text-xs font-semibold text-primary-foreground">{item.count}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground w-16 text-right">₹{item.revenue.toFixed(0)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No data available</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Daily Revenue Chart */}
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Daily Revenue & Orders</h3>
              <div className="space-y-2">
                {analytics.dailyRevenue.length > 0 ? (
                  analytics.dailyRevenue.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <p className="text-sm text-muted-foreground w-24">{item.date}</p>
                      <div className="flex-1 bg-muted rounded-full h-8 flex items-center relative">
                        <div
                          className="bg-accent rounded-full h-8 flex items-center justify-end pr-3 gap-2"
                          style={{
                            width: `${(item.amount / Math.max(...analytics.dailyRevenue.map(r => r.amount), 1)) * 100}%`,
                          }}
                        >
                          {item.amount > 0 && (
                            <span className="text-xs font-semibold text-accent-foreground">
                              ₹{item.amount.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground w-12 text-right">{item.orders} orders</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No data available</p>
                )}
              </div>
            </Card>

            {/* Payment Methods Breakdown */}
            <Card className="p-6 mt-8">
              <h3 className="font-semibold text-foreground mb-4">Payment Methods</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analytics.paymentMethods.length > 0 ? (
                  analytics.paymentMethods.map((method, idx) => (
                    <div key={idx} className="p-4 bg-muted rounded-lg">
                      <p className="font-medium text-foreground capitalize">{method.method}</p>
                      <p className="text-2xl font-bold text-primary mt-2">₹{method.amount.toFixed(0)}</p>
                      <p className="text-sm text-muted-foreground mt-1">{method.count} transactions</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center col-span-2 py-4">No payment data</p>
                )}
              </div>
            </Card>

            {/* Order Status Distribution */}
            <Card className="p-6 mt-8">
              <h3 className="font-semibold text-foreground mb-4">Order Status Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analytics.orderStatus.length > 0 ? (
                  analytics.orderStatus.map((status, idx) => (
                    <div key={idx} className="p-4 bg-muted rounded-lg">
                      <p className="font-medium text-foreground capitalize">{status.status}</p>
                      <p className="text-2xl font-bold text-primary mt-2">{status.count}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {((status.count / analytics.totalOrders) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center col-span-3 py-4">No status data</p>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
