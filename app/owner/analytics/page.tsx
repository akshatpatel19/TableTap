'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getCafeByEmail, getOrders, Order } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronLeft, TrendingUp, ShoppingCart, DollarSign, Clock } from 'lucide-react';
import Link from 'next/link';

interface AnalyticsData {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  completedOrders: number;
  pendingOrders: number;
  topItems: Array<{ name: string; count: number; revenue: number }>;
  dailyRevenue: Array<{ date: string; amount: number }>;
  hourlyOrders: Array<{ hour: string; count: number }>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [cafe, setCafe] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

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
        const ordersData = await getOrders(cafeData.id);
        setOrders(ordersData);
        calculateAnalytics(ordersData, dateRange);
      } catch (error) {
        console.error('Error loading analytics:', error);
        router.push('/owner/login');
      } finally {
        setLoading(false);
      }
    };

    loadData();
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
    const totalRevenue = filteredOrders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / completedOrders : 0;

    // Top items calculation
    const itemMap = new Map<string, { count: number; revenue: number }>();
    filteredOrders.forEach(order => {
      order.items?.forEach((item: any) => {
        const existing = itemMap.get(item.name) || { count: 0, revenue: 0 };
        itemMap.set(item.name, {
          count: existing.count + 1,
          revenue: existing.revenue + (item.price || 0),
        });
      });
    });

    const topItems = Array.from(itemMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Daily revenue
    const dailyMap = new Map<string, number>();
    filteredOrders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString();
      dailyMap.set(date, (dailyMap.get(date) || 0) + (order.paymentStatus === 'paid' ? order.totalAmount : 0));
    });

    const dailyRevenue = Array.from(dailyMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Hourly orders
    const hourlyMap = new Map<string, number>();
    filteredOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      const hourStr = `${hour}:00`;
      hourlyMap.set(hourStr, (hourlyMap.get(hourStr) || 0) + 1);
    });

    const hourlyOrders = Array.from(hourlyMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

    setAnalytics({
      totalOrders,
      totalRevenue,
      averageOrderValue,
      completedOrders,
      pendingOrders,
      topItems,
      dailyRevenue,
      hourlyOrders,
    });
  };

  const handleDateRangeChange = (range: 'today' | 'week' | 'month' | 'all') => {
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
        <div className="flex gap-2 mb-8">
          {(['today', 'week', 'month', 'all'] as const).map(range => (
            <Button
              key={range}
              onClick={() => handleDateRangeChange(range)}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              className={dateRange === range ? 'bg-primary' : 'bg-transparent'}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
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
                    <p className="text-xs text-muted-foreground mt-2">From {analytics.completedOrders} orders</p>
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
                      {analytics.completedOrders} completed
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
                    <p className="text-sm font-medium text-muted-foreground mb-1">Pending Orders</p>
                    <p className="text-3xl font-bold text-foreground">{analytics.pendingOrders}</p>
                    <p className="text-xs text-muted-foreground mt-2">Awaiting payment</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-600 opacity-20" />
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
                <h3 className="font-semibold text-foreground mb-4">Orders by Hour</h3>
                <div className="space-y-2">
                  {analytics.hourlyOrders.length > 0 ? (
                    analytics.hourlyOrders.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <p className="text-sm text-muted-foreground w-12">{item.hour}</p>
                        <div className="flex-1 bg-muted rounded-full h-6 flex items-center relative">
                          <div
                            className="bg-primary rounded-full h-6 flex items-center justify-end pr-2"
                            style={{
                              width: `${(item.count / Math.max(...analytics.hourlyOrders.map(o => o.count), 1)) * 100}%`,
                            }}
                          >
                            {item.count > 0 && (
                              <span className="text-xs font-semibold text-primary-foreground">{item.count}</span>
                            )}
                          </div>
                        </div>
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
              <h3 className="font-semibold text-foreground mb-4">Daily Revenue</h3>
              <div className="space-y-2">
                {analytics.dailyRevenue.length > 0 ? (
                  analytics.dailyRevenue.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <p className="text-sm text-muted-foreground w-24">{item.date}</p>
                      <div className="flex-1 bg-muted rounded-full h-8 flex items-center relative">
                        <div
                          className="bg-accent rounded-full h-8 flex items-center justify-end pr-3"
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
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No data available</p>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
