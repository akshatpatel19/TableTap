'use client';

import { useEffect, useState } from 'react';
import { getAllCafes, getCafeOrders, Cafe, Order } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Store, Search, TrendingUp, Filter, IndianRupee, PieChart } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CafeAnalytics {
    cafe: Cafe;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByMonth: Record<string, number>;
}

export default function CafeAnalyticsPage() {
    const router = useRouter();
    const [cafes, setCafes] = useState<CafeAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCafe, setSelectedCafe] = useState<CafeAnalytics | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const adminToken = localStorage.getItem('admin_token');
                if (!adminToken) {
                    router.push('/admin/login');
                    return;
                }

                const allCafes = await getAllCafes();

                const cafeStatsPromises = allCafes.map(async (cafe) => {
                    const orders = await getCafeOrders(cafe.id);

                    let totalRevenue = 0;
                    let totalCompletedOrders = 0;
                    const ordersByMonth: Record<string, number> = {};

                    orders.forEach((order) => {
                        if (order.paymentStatus === 'paid') {
                            totalRevenue += order.totalAmount;
                            totalCompletedOrders++;

                            const d = new Date(order.createdAt);
                            const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
                            ordersByMonth[month] = (ordersByMonth[month] || 0) + order.totalAmount;
                        }
                    });

                    return {
                        cafe,
                        totalOrders: totalCompletedOrders,
                        totalRevenue,
                        averageOrderValue: totalCompletedOrders > 0 ? totalRevenue / totalCompletedOrders : 0,
                        ordersByMonth,
                    };
                });

                const stats = await Promise.all(cafeStatsPromises);
                setCafes(stats.sort((a, b) => b.totalRevenue - a.totalRevenue)); // Sort by revenue descending
            } catch (error) {
                console.error('Error loading cafe analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [router]);

    const filteredCafes = cafes.filter(
        (stat) =>
            stat.cafe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            stat.cafe.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Cafe Revenue Analysis</h1>
                    <p className="text-muted-foreground mt-1">Deep dive into individual cafe performance and order volumes.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Cafe Selection */}
                <Card className="col-span-1 p-6 border-primary/10 shadow-sm bg-card/80 backdrop-blur-sm h-[80vh] flex flex-col">
                    <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <Store className="h-5 w-5 text-primary" /> Select Cafe
                    </h2>
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search cafes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 hide-scrollbar pr-2">
                        {filteredCafes.map((stat) => (
                            <div
                                key={stat.cafe.id}
                                onClick={() => setSelectedCafe(stat)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedCafe?.cafe.id === stat.cafe.id
                                    ? 'border-primary bg-primary/10 shadow-sm'
                                    : 'border-transparent hover:border-primary/20 hover:bg-muted/50'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <p className="font-semibold text-sm text-foreground">{stat.cafe.name}</p>
                                    <span className="text-xs font-medium text-orange-600">₹{(stat.totalRevenue / 1000).toFixed(1)}k</span>
                                </div>
                                <p className="text-xs text-muted-foreground">/{stat.cafe.slug} • {stat.totalOrders} orders</p>
                            </div>
                        ))}
                        {filteredCafes.length === 0 && (
                            <p className="text-center text-xs text-muted-foreground py-8">No cafes found</p>
                        )}
                    </div>
                </Card>

                {/* Right Column: Detailed Analytics */}
                <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
                    {!selectedCafe ? (
                        <Card className="flex-1 p-12 flex flex-col items-center justify-center border-dashed border-2 border-muted bg-background/50 text-center space-y-4">
                            <PieChart className="h-16 w-16 text-muted-foreground/30" />
                            <h3 className="text-xl font-semibold text-muted-foreground">No Cafe Selected</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                Select a cafe from the list on the left to view detailed revenue insights, order volume, and historical performance.
                            </p>
                        </Card>
                    ) : (
                        <>
                            <Card className="p-6 border-primary/20 border-t-4 bg-card/80 backdrop-blur-sm shadow-sm">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-foreground">{selectedCafe.cafe.name}</h2>
                                        <p className="text-sm text-muted-foreground font-mono">/{selectedCafe.cafe.slug}</p>
                                    </div>
                                    <Badge variant={selectedCafe.cafe.isActive ? "default" : "destructive"} className="px-3 py-1">
                                        {selectedCafe.cafe.isActive ? 'Active Operator' : 'Blocked'}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                        <p className="text-xs font-medium text-orange-800 dark:text-orange-400 mb-1 flex items-center gap-1 uppercase tracking-wider">
                                            <IndianRupee className="h-3 w-3" /> Gross Revenue
                                        </p>
                                        <p className="text-2xl font-bold text-orange-600">₹{selectedCafe.totalRevenue.toLocaleString()}</p>
                                    </div>

                                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                        <p className="text-xs font-medium text-blue-800 dark:text-blue-400 mb-1 flex items-center gap-1 uppercase tracking-wider">
                                            <TrendingUp className="h-3 w-3" /> Total Orders
                                        </p>
                                        <p className="text-2xl font-bold text-blue-600">{selectedCafe.totalOrders}</p>
                                    </div>

                                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                        <p className="text-xs font-medium text-emerald-800 dark:text-emerald-400 mb-1 flex items-center gap-1 uppercase tracking-wider">
                                            <Filter className="h-3 w-3" /> Avg. Order Value
                                        </p>
                                        <p className="text-2xl font-bold text-emerald-600">₹{Math.round(selectedCafe.averageOrderValue).toLocaleString()}</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-6 border-border shadow-sm flex-1 bg-card/80 backdrop-blur-sm">
                                <h3 className="font-semibold text-foreground mb-4">Monthly Revenue History</h3>

                                {Object.keys(selectedCafe.ordersByMonth).length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground text-sm">
                                        No paid orders recorded for this cafe yet.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {Object.entries(selectedCafe.ordersByMonth)
                                            .sort((a, b) => b[0].localeCompare(a[0])) // Sort by date descending
                                            .map(([month, amount]) => {
                                                // Find max amount to calculate relative bar width
                                                const maxAmount = Math.max(...Object.values(selectedCafe.ordersByMonth));
                                                const widthPercentage = Math.max(10, (amount / maxAmount) * 100);

                                                return (
                                                    <div key={month} className="flex items-center gap-4">
                                                        <div className="w-20 text-xs font-medium text-muted-foreground whitespace-nowrap">
                                                            {new Date(month + '-01').toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                                        </div>
                                                        <div className="flex-1 h-8 bg-muted rounded-md relative overflow-hidden group">
                                                            <div
                                                                className="absolute top-0 left-0 h-full bg-primary/60 rounded-md transition-all group-hover:bg-primary"
                                                                style={{ width: `${widthPercentage}%` }}
                                                            />
                                                        </div>
                                                        <div className="w-24 text-right text-sm font-semibold text-foreground">
                                                            ₹{amount.toLocaleString()}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                    </div>
                                )}
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
