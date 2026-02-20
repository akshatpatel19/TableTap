'use client';

import { useEffect, useState } from 'react';
import { getAllCafes, Cafe, Order, Subscription, getCafeOrders, getSubscription } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, Store, CreditCard, X, ShieldAlert, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PaymentVerificationPanel from '@/components/PaymentVerificationPanel';
import { updateCafe } from '@/lib/db';

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
  const [selectedCafeForPayment, setSelectedCafeForPayment] = useState<string | null>(null);

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
  const handleVerificationComplete = async () => {
    // Refresh the data after verification
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
  };

  const toggleCafeStatus = async (cafeId: string, currentStatus: boolean) => {
    try {
      await updateCafe(cafeId, { isActive: !currentStatus });
      // Update local state
      setCafes((prevCafes) =>
        prevCafes.map((stat) =>
          stat.cafe.id === cafeId
            ? { ...stat, cafe: { ...stat.cafe, isActive: !currentStatus } }
            : stat
        )
      );
    } catch (error) {
      console.error('[v0] Error updating cafe status:', error);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-12">
      {/* Payment Verification Modal */}
      {selectedCafeForPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-end p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl border border-primary/10 animate-in slide-in-from-right-4">
            <div className="sticky top-0 bg-card/80 backdrop-blur-md border-b p-5 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Payment Verification</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedCafeForPayment(null)}
                className="h-auto p-2 hover:bg-destructive/10 hover:text-destructive transition-colors rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6">
              <PaymentVerificationPanel
                cafeId={selectedCafeForPayment}
                onVerificationComplete={() => {
                  handleVerificationComplete();
                  setSelectedCafeForPayment(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 border-primary/10 hover:border-primary/30 hover:shadow-lg transition-all shadow-sm bg-card/50 backdrop-blur overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">Total Cafes</p>
                <p className="text-4xl font-bold text-foreground tracking-tight">{cafes.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Store className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-green-500/10 hover:border-green-500/30 hover:shadow-lg transition-all shadow-sm bg-card/50 backdrop-blur overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">Active Cafes</p>
                <p className="text-4xl font-bold text-green-600 tracking-tight">{activeCafes}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-blue-500/10 hover:border-blue-500/30 hover:shadow-lg transition-all shadow-sm bg-card/50 backdrop-blur overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">Total Orders</p>
                <p className="text-4xl font-bold text-blue-600 tracking-tight">{totalOrders}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-orange-500/10 hover:border-orange-500/30 hover:shadow-lg transition-all shadow-sm bg-card/50 backdrop-blur overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">Total Revenue</p>
                <p className="text-4xl font-bold text-orange-600 tracking-tight">₹{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 bg-card/50 backdrop-blur p-2 rounded-xl inline-flex shadow-sm border border-primary/10">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              variant={filter === f ? 'default' : 'ghost'}
              size="sm"
              className={`capitalize rounded-lg px-6 ${filter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-primary/5'}`}
            >
              {f === 'all' ? 'All Cafes' : f === 'active' ? 'Active' : 'Inactive'}
            </Button>
          ))}
        </div>

        {/* Cafes Table */}
        <Card className="overflow-hidden shadow-sm border-primary/10 bg-card/80 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-5 font-semibold text-foreground text-sm">Cafe Details</th>
                  <th className="text-left p-5 font-semibold text-foreground text-sm">Contact</th>
                  <th className="text-center p-5 font-semibold text-foreground text-sm">Stats</th>
                  <th className="text-left p-5 font-semibold text-foreground text-sm">Next Payment</th>
                  <th className="text-left p-5 font-semibold text-foreground text-sm">Status</th>
                  <th className="text-right p-5 font-semibold text-foreground text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredCafes.map((stat) => (
                  <tr key={stat.cafe.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/10">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{stat.cafe.name}</p>
                          <p className="text-xs font-mono text-muted-foreground bg-muted inline-block px-1.5 py-0.5 rounded mt-0.5">/{stat.cafe.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <p className="text-sm font-medium text-foreground">{stat.cafe.email}</p>
                      <p className="text-xs text-muted-foreground">{stat.cafe.phone}</p>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex gap-4 w-full justify-center">
                          <div className="text-center"><p className="text-xs text-muted-foreground mb-0.5">Tables</p><p className="text-sm font-semibold">{stat.cafe.tables}</p></div>
                          <div className="text-center"><p className="text-xs text-muted-foreground mb-0.5">Orders</p><p className="text-sm font-semibold">{stat.totalOrders}</p></div>
                        </div>
                        <div className="text-center mt-1 w-full"><p className="text-xs text-muted-foreground mb-0.5">Revenue</p><p className="text-sm font-bold text-orange-600">₹{stat.totalRevenue.toLocaleString()}</p></div>
                      </div>
                    </td>
                    <td className="p-5 text-sm">
                      {stat.cafe.setupFeeStatus === 'paid' ? (
                        stat.cafe.nextMonthlyPaymentDueDate ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">
                              {new Date(stat.cafe.nextMonthlyPaymentDueDate).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {stat.subscription?.plan || 'No plan'}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground bg-muted border-none px-2.5 py-0.5">Pending Date</Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-amber-700 bg-amber-100 border-none px-2.5 py-0.5">Setup Pending</Badge>
                      )}
                    </td>
                    <td className="p-5">
                      <Badge className={`px-2.5 py-0.5 border-none ${stat.cafe.isActive ? 'bg-green-100/80 text-green-800 hover:bg-green-200/80' : 'bg-red-100/80 text-red-800 hover:bg-red-200/80'}`}>
                        {stat.cafe.isActive ? 'Active' : 'Blocked'}
                      </Badge>
                    </td>
                    <td className="p-5">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant={stat.cafe.isActive ? "outline" : "default"}
                          onClick={() => toggleCafeStatus(stat.cafe.id, stat.cafe.isActive)}
                          className={`h-8 w-8 p-0 rounded-full flex-shrink-0 ${stat.cafe.isActive ? 'hover:bg-destructive hover:text-destructive-foreground hover:border-destructive' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                          title={stat.cafe.isActive ? "Block Cafe" : "Unblock Cafe"}
                        >
                          {stat.cafe.isActive ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          className="text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                          onClick={() => setSelectedCafeForPayment(stat.cafe.id)}
                        >
                          Verify Payment
                        </Button>
                        <Link href={`/${stat.cafe.slug}/menu`}>
                          <Button size="sm" variant="outline" className="text-xs h-8 hover:bg-primary/5">
                            View Menu
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCafes.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Store className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">No cafes found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">Try adjusting your filters or wait for new cafe registrations to appear here.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
