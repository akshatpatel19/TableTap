'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getCafeByEmail, getOrders, Order } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronLeft, TrendingUp, ShoppingCart, DollarSign, Clock, AlertCircle, TrendingDown, Users, Coffee, Zap, Award, Frown } from 'lucide-react';
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
  hourlyOrders: Array<{ hour: string; count: number; revenue: number; avgOrderValue: number }>;
  paymentMethods: Array<{ method: string; count: number; amount: number }>;
  orderStatus: Array<{ status: string; count: number }>;
  revenueTrend: number;
  tableStats: Array<{ tableId: number; orders: number; revenue: number; avgOrderValue: number }>;
  categoryPerformance: Array<{ category: string; orders: number; revenue: number }>;
  peakHours: Array<{ hour: string; score: number; recommendation: string }>;
  avgPreparationTime: number;
  customerRetention: number;
  lowInventoryItems: Array<{ name: string; soldQuantity: number; lastRestockDate?: string }>;
  failedPayments: number;
  avgCompletionTime: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [cafe, setCafe] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'all'>('month');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'online' | 'counter'>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled'>('all');
  const [showComparison, setShowComparison] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [useCustomDates, setUseCustomDates] = useState(false);

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
        calculateAnalytics(ordersData, dateRange, paymentMethodFilter, orderStatusFilter, useCustomDates, customStartDate, customEndDate);
      } catch (error) {
        console.error('Error loading analytics:', error);
        router.push('/owner/login');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Recalculate analytics when filters change
  useEffect(() => {
    if (orders.length > 0) {
      calculateAnalytics(orders, dateRange, paymentMethodFilter, orderStatusFilter, useCustomDates, customStartDate, customEndDate);
    }
  }, [dateRange, paymentMethodFilter, orderStatusFilter, useCustomDates, customStartDate, customEndDate]);

  const getDateFilter = (range: string, useCustom: boolean, startDate: string, endDate: string) => {
    if (useCustom && startDate && endDate) {
      const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
      const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
      if (!isNaN(sYear) && !isNaN(eYear)) {
        return {
          start: new Date(sYear, sMonth - 1, sDay).getTime(),
          end: new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999).getTime(),
        };
      }
    }

    const current = Date.now();
    const d = new Date();
    // Start of today in local time
    const startOfToday = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    let start = 0;
    if (range === 'today') {
      start = startOfToday;
    } else if (range === 'week') {
      start = startOfToday - 6 * 24 * 60 * 60 * 1000;
    } else if (range === 'month') {
      // Start of current month
      start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    } else if (range === 'quarter') {
      // Start of current quarter
      start = new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).getTime();
    }

    return { start, end: current };
  };

  const calculateAnalytics = (
    ordersData: Order[],
    range: string,
    paymentMethodParam: string,
    orderStatusParam: string,
    useCustom: boolean,
    startDate: string,
    endDate: string
  ) => {
    const dateFilter = getDateFilter(range, useCustom, startDate, endDate);

    let filteredOrders = ordersData.filter(
      order => order.createdAt >= dateFilter.start && order.createdAt <= dateFilter.end
    );

    // Apply payment method filter
    if (paymentMethodParam !== 'all') {
      filteredOrders = filteredOrders.filter(o => o.paymentMethod === paymentMethodParam);
    }

    // Apply order status filter
    if (orderStatusParam !== 'all') {
      filteredOrders = filteredOrders.filter(o => o.status === orderStatusParam);
    }

    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter(o => o.paymentStatus === 'paid').length;
    const pendingOrders = filteredOrders.filter(o => o.paymentStatus === 'pending').length;
    const failedPayments = filteredOrders.filter(o => o.paymentStatus === 'failed').length;
    const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled').length;
    const servedOrders = filteredOrders.filter(o => o.status === 'served').length;

    const totalRevenue = filteredOrders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;
    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
    const paymentSuccess = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    const avgCompletionTime = servedOrders > 0
      ? filteredOrders
        .filter(o => o.status === 'served')
        .reduce((sum, o) => sum + (o.updatedAt - o.createdAt), 0) / servedOrders / (60 * 1000)
      : 0;

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
      const orderDate = new Date(order.createdAt);
      // Use YYYY-MM-DD for stable grouping and sorting independent of browser locale
      const dateStr = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;

      const existing = dailyMap.get(dateStr) || { amount: 0, orders: 0 };
      dailyMap.set(dateStr, {
        amount: existing.amount + (order.paymentStatus === 'paid' ? order.totalAmount : 0),
        orders: existing.orders + (order.paymentStatus === 'paid' ? 1 : 0),
      });
    });

    const dailyRevenue = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Hourly orders with revenue and AVG
    const hourlyMap = new Map<string, { count: number; revenue: number; totalAmount: number }>();
    filteredOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      const hourStr = `${hour}:00`;
      const existing = hourlyMap.get(hourStr) || { count: 0, revenue: 0, totalAmount: 0 };
      hourlyMap.set(hourStr, {
        count: existing.count + 1,
        revenue: existing.revenue + (order.paymentStatus === 'paid' ? order.totalAmount : 0),
        totalAmount: existing.totalAmount + order.totalAmount,
      });
    });

    const hourlyOrders = Array.from(hourlyMap.entries())
      .map(([hour, data]) => ({
        hour,
        count: data.count,
        revenue: data.revenue,
        avgOrderValue: data.count > 0 ? data.revenue / data.count : 0
      }))
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

    // Table stats
    const tableMap = new Map<number, { orders: number; revenue: number; totalAmount: number }>();
    filteredOrders.forEach(order => {
      const tableId = order.tableId;
      const existing = tableMap.get(tableId) || { orders: 0, revenue: 0, totalAmount: 0 };
      tableMap.set(tableId, {
        orders: existing.orders + 1,
        revenue: existing.revenue + (order.paymentStatus === 'paid' ? order.totalAmount : 0),
        totalAmount: existing.totalAmount + order.totalAmount,
      });
    });

    const tableStats = Array.from(tableMap.entries())
      .map(([tableId, data]) => ({
        tableId,
        orders: data.orders,
        revenue: data.revenue,
        avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Category performance (basic - from item names)
    const categoryMap = new Map<string, { orders: number; revenue: number }>();
    topItems.forEach(item => {
      const category = 'General'; // Could be enhanced if menu has categories
      const existing = categoryMap.get(category) || { orders: 0, revenue: 0 };
      categoryMap.set(category, {
        orders: existing.orders + item.count,
        revenue: existing.revenue + item.revenue,
      });
    });

    const categoryPerformance = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }));

    // Peak hours analysis
    const peakHours = hourlyOrders
      .map((hour, idx) => {
        const avg = hourlyOrders.reduce((sum, h) => sum + h.count, 0) / hourlyOrders.length;
        const score = hour.count / (avg || 1);
        let recommendation = 'Normal';
        if (score > 1.5) {
          recommendation = 'Staff increase needed';
        } else if (score < 0.5) {
          recommendation = 'Consider promotions';
        }
        return {
          hour: hour.hour,
          score: Math.round(score * 100) / 100,
          recommendation,
        };
      });

    // Average preparation time (basic calculation)
    const avgPreparationTime = filteredOrders.length > 0
      ? filteredOrders.reduce((sum, o) => sum + (o.updatedAt - o.createdAt), 0) / filteredOrders.length / (60 * 1000)
      : 0;

    // Customer retention (repeat customers)
    const customerMap = new Map<string, number>();
    ordersData.forEach(order => {
      const email = order.customerEmail;
      customerMap.set(email, (customerMap.get(email) || 0) + 1);
    });
    const repeatCustomers = Array.from(customerMap.values()).filter(count => count > 1).length;
    const customerRetention = customerMap.size > 0 ? (repeatCustomers / customerMap.size) * 100 : 0;

    // Low inventory items (items sold frequently)
    const lowInventoryItems = topItems
      .filter(item => item.count > 10)
      .map(item => ({
        name: item.name,
        soldQuantity: item.count,
        lastRestockDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      }));

    // Calculate revenue trend
    const previousPeriodStart = dateFilter.start - (dateFilter.end - dateFilter.start);
    const previousPeriodEnd = dateFilter.start;
    const previousOrders = ordersData.filter(
      o => o.createdAt >= previousPeriodStart && o.createdAt < previousPeriodEnd
    );
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
      tableStats,
      categoryPerformance,
      peakHours,
      avgPreparationTime,
      customerRetention,
      lowInventoryItems,
      failedPayments,
      avgCompletionTime,
    });
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
        {/* Filters Section */}
        <Card className="p-6 mb-8">
          <h3 className="font-semibold text-foreground mb-4">Filters</h3>

          {/* Date Range Filter */}
          <div className="mb-4">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Date Range</label>
            <div className="flex gap-2 flex-wrap mb-3">
              {(['today', 'week', 'month', 'quarter', 'all'] as const).map(range => (
                <Button
                  key={range}
                  onClick={() => {
                    setDateRange(range);
                    setUseCustomDates(false);
                  }}
                  variant={!useCustomDates && dateRange === range ? 'default' : 'outline'}
                  size="sm"
                >
                  {range === 'quarter' ? '3 Months' : range.charAt(0).toUpperCase() + range.slice(1)}
                </Button>
              ))}
              <Button
                onClick={() => setUseCustomDates(!useCustomDates)}
                variant={useCustomDates ? 'default' : 'outline'}
                size="sm"
              >
                Custom
              </Button>
            </div>

            {/* Custom Date Range */}
            {useCustomDates && (
              <div className="flex gap-3 flex-wrap">
                <div>
                  <label className="text-xs text-muted-foreground">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Filter */}
          <div className="mb-4">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Payment Method</label>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'online', 'counter'] as const).map(method => (
                <Button
                  key={method}
                  onClick={() => setPaymentMethodFilter(method)}
                  variant={paymentMethodFilter === method ? 'default' : 'outline'}
                  size="sm"
                >
                  {method === 'all' ? 'All Methods' : method.charAt(0).toUpperCase() + method.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Order Status Filter */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Order Status</label>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'] as const).map(status => (
                <Button
                  key={status}
                  onClick={() => setOrderStatusFilter(status)}
                  variant={orderStatusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  className="capitalize"
                >
                  {status === 'all' ? 'All Status' : status}
                </Button>
              ))}
            </div>
          </div>
        </Card>

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
                      {analytics.revenueTrend >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
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
                      {analytics.totalOrders > 0 ? ((analytics.completedOrders / analytics.totalOrders) * 100).toFixed(1) : 0}% completed
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
                    <p className="text-sm font-medium text-muted-foreground mb-1">Payment Success</p>
                    <p className="text-3xl font-bold text-foreground">{analytics.paymentSuccess.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-2">{analytics.failedPayments} failed</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-600 opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Cancellation Rate</p>
                    <p className="text-3xl font-bold text-red-600">{analytics.cancellationRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-2">Lower is better</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600 opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Avg Prep Time</p>
                    <p className="text-3xl font-bold text-foreground">{analytics.avgPreparationTime.toFixed(1)} min</p>
                    <p className="text-xs text-muted-foreground mt-2">Order to completion</p>
                  </div>
                  <Zap className="h-8 w-8 text-yellow-600 opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Customer Retention</p>
                    <p className="text-3xl font-bold text-foreground">{analytics.customerRetention.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-2">Repeat customers</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600 opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Peak Hour Score</p>
                    <p className="text-3xl font-bold text-foreground">
                      {analytics.peakHours.length > 0 ? Math.max(...analytics.peakHours.map(h => h.score)).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">Highest activity level</p>
                  </div>
                  <Coffee className="h-8 w-8 text-orange-600 opacity-20" />
                </div>
              </Card>
            </div>

            {/* Top Items & Table Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Top Selling Items
                </h3>
                <div className="space-y-3">
                  {analytics.topItems.length > 0 ? (
                    analytics.topItems.map((item, idx) => (
                      <div key={idx} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{idx + 1}. {item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.count} sold</p>
                          </div>
                          <p className="font-semibold text-primary">₹{item.revenue.toFixed(0)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No data available</p>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Table Performance
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {analytics.tableStats.length > 0 ? (
                    analytics.tableStats.slice(0, 8).map((table, idx) => (
                      <div key={idx} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-foreground">Table {table.tableId}</p>
                            <p className="text-sm text-muted-foreground">{table.orders} orders · Avg: ₹{table.avgOrderValue.toFixed(0)}</p>
                          </div>
                          <p className="font-semibold text-primary">₹{table.revenue.toFixed(0)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No data available</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Peak Hours & Hourly Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Coffee className="h-4 w-4" />
                  Peak Hours Analysis
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {analytics.peakHours.length > 0 ? (
                    analytics.peakHours.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2">
                        <p className="text-sm font-medium text-muted-foreground w-12">{item.hour}</p>
                        <div className="flex-1 bg-muted rounded-full h-6 relative">
                          <div
                            className={`rounded-full h-6 flex items-center justify-end pr-2 transition-all ${item.score > 1.5 ? 'bg-red-500' : item.score > 1 ? 'bg-orange-500' : 'bg-green-500'
                              }`}
                            style={{ width: `${Math.min(item.score * 33, 100)}%` }}
                          >
                            {item.score > 0 && (
                              <span className="text-xs font-semibold text-white">{item.score.toFixed(1)}x</span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground w-24 text-right">{item.recommendation}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No data available</p>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Order Distribution
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
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
            <Card className="p-6 mb-8">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Daily Revenue & Orders
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {analytics.dailyRevenue.length > 0 ? (
                  analytics.dailyRevenue.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <p className="text-sm text-muted-foreground w-24">{item.date}</p>
                      <div className="flex-1 bg-muted rounded-full h-6 flex items-center relative">
                        <div
                          className="bg-accent rounded-full h-6 flex items-center justify-end pr-3"
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
                      <p className="text-xs text-muted-foreground w-14 text-right">{item.orders} orders</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No data available</p>
                )}
              </div>
            </Card>

            {/* Payment Methods & Order Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Payment Methods</h3>
                <div className="space-y-3">
                  {analytics.paymentMethods.length > 0 ? (
                    analytics.paymentMethods.map((method, idx) => (
                      <div key={idx} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground capitalize">{method.method}</p>
                            <p className="text-sm text-muted-foreground">{method.count} transactions</p>
                          </div>
                          <p className="font-semibold text-primary">₹{method.amount.toFixed(0)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No payment data</p>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Order Status Distribution</h3>
                <div className="space-y-3">
                  {analytics.orderStatus.length > 0 ? (
                    analytics.orderStatus.map((status, idx) => (
                      <div key={idx} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground capitalize">{status.status}</p>
                            <p className="text-sm text-muted-foreground">
                              {analytics.totalOrders > 0 ? ((status.count / analytics.totalOrders) * 100).toFixed(1) : 0}% of total
                            </p>
                          </div>
                          <p className="font-semibold text-primary">{status.count}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No status data</p>
                  )}
                </div>
              </Card>
            </div>

            {/* High Inventory Items Alert */}
            {analytics.lowInventoryItems.length > 0 && (
              <Card className="p-6 mb-8 border-orange-200 bg-orange-50 dark:bg-orange-950">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Frown className="h-4 w-4 text-orange-600" />
                  High Demand Items (Consider Restocking)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analytics.lowInventoryItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-background rounded-lg border border-orange-200">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.soldQuantity} sold in period</p>
                      <p className="text-xs text-muted-foreground mt-1">Last restocked: {item.lastRestockDate}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
