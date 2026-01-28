'use client';

import { useEffect, useState } from 'react';
import { getAllCafes, Cafe, Order, Subscription, getCafeOrders, getSubscription } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, Store, CreditCard, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CafeStats {
  cafe: Cafe;
  totalOrders: number;
  totalRevenue: number;
  subscription: Subscription | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [cafes, setCafes] = useState<CafeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Simple auth check - in production use proper admin auth
        const adminToken = localStorage.getItem('admin_token');
        if (!adminToken) {
          router.push('/admin/login');
          return;
        }

        const allCafes = await getAllCafes();
        const cafeStatsPromises = allCafes.map(async (cafe) => {
          const [orders, subscription] = await Promise.all([getCafeOrders(cafe.id), getSubscription(cafe.id)]);

          const totalRevenue = orders.reduce((sum, order) => {
            if (order.paymentStatus === 'paid') {
              return sum + order.totalAmount;
            }
            return sum;
          }, 0);

          return {
            cafe,
            totalOrders: orders.length,
            totalRevenue,
            subscription,
          };
        });

        const cafeStats = await Promise.all(cafeStatsPromises);
        setCafes(cafeStats.sort((a, b) => b.cafe.createdAt - a.cafe.createdAt));
      } catch (error) {
        console.error('[v0] Error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.push('/admin/login');
  };

  const filteredCafes = cafes.filter((stat) => {
    if (filter === 'active') return stat.cafe.isActive;
    if (filter === 'inactive') return !stat.cafe.isActive;
    return true;
  });

  const totalRevenue = cafes.reduce((sum, stat) => sum + stat.totalRevenue, 0);
  const totalOrders = cafes.reduce((sum, stat) => sum + stat.totalOrders, 0);
  const activeCafes = cafes.filter((stat) => stat.cafe.isActive).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">TableTap Admin</h1>
            <p className="text-sm text-muted-foreground">Platform Overview</p>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 border-l-4 border-l-primary">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Total Cafes</p>
                <p className="text-3xl font-bold text-foreground">{cafes.length}</p>
              </div>
              <Store className="h-8 w-8 text-primary/50" />
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-green-600">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Active Cafes</p>
                <p className="text-3xl font-bold text-green-600">{activeCafes}</p>
              </div>
              <Users className="h-8 w-8 text-green-600/50" />
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-blue-600">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-blue-600">{totalOrders}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600/50" />
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-orange-600">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-orange-600">₹{totalRevenue.toLocaleString()}</p>
              </div>
              <CreditCard className="h-8 w-8 text-orange-600/50" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              className="capitalize"
            >
              {f === 'all' ? 'All Cafes' : f === 'active' ? 'Active' : 'Inactive'}
            </Button>
          ))}
        </div>

        {/* Cafes Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-card border-b">
                <tr>
                  <th className="text-left p-4 font-semibold text-foreground">Cafe Name</th>
                  <th className="text-left p-4 font-semibold text-foreground">Email</th>
                  <th className="text-left p-4 font-semibold text-foreground">Tables</th>
                  <th className="text-left p-4 font-semibold text-foreground">Orders</th>
                  <th className="text-left p-4 font-semibold text-foreground">Revenue</th>
                  <th className="text-left p-4 font-semibold text-foreground">Subscription</th>
                  <th className="text-left p-4 font-semibold text-foreground">Status</th>
                  <th className="text-left p-4 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCafes.map((stat) => (
                  <tr key={stat.cafe.id} className="hover:bg-card/50 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-foreground">{stat.cafe.name}</p>
                        <p className="text-xs text-muted-foreground">{stat.cafe.slug}</p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-foreground">{stat.cafe.email}</td>
                    <td className="p-4 text-sm font-semibold text-foreground">{stat.cafe.tables}</td>
                    <td className="p-4 text-sm text-foreground">{stat.totalOrders}</td>
                    <td className="p-4 text-sm font-semibold text-foreground">₹{stat.totalRevenue.toLocaleString()}</td>
                    <td className="p-4 text-sm">
                      {stat.subscription ? (
                        <Badge className="capitalize bg-blue-100 text-blue-800">{stat.subscription.plan}</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">No Plan</Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge className={stat.cafe.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {stat.cafe.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Link href={`/${stat.cafe.slug}/menu`}>
                        <Button size="sm" variant="outline" className="text-xs bg-transparent">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCafes.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No cafes found</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
