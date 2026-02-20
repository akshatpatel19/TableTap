'use client';

import { useEffect, useState } from 'react';
import { getAllCafes, Cafe, Order, Subscription, getCafeOrders, getSubscription, updateCafe, enforceOverdueSuspensions } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Store, Search, ShieldAlert, CheckCircle, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CafeStats {
    cafe: Cafe;
    totalOrders: number;
    totalRevenue: number;
    subscription: Subscription | null;
}

export default function AdminCafesList() {
    const router = useRouter();
    const [cafes, setCafes] = useState<CafeStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'pending_setup' | 'overdue'>('all');

    useEffect(() => {
        const loadData = async () => {
            try {
                const adminToken = localStorage.getItem('admin_token');
                if (!adminToken) {
                    router.push('/admin/login');
                    return;
                }

                await enforceOverdueSuspensions();

                const allCafes = await getAllCafes();
                const cafeStatsPromises = allCafes.map(async (cafe) => {
                    const [orders, subscription] = await Promise.all([getCafeOrders(cafe.id), getSubscription(cafe.id)]);
                    const totalRevenue = orders.reduce((sum, order) => {
                        return order.paymentStatus === 'paid' ? sum + order.totalAmount : sum;
                    }, 0);

                    return {
                        cafe,
                        totalOrders: orders.length,
                        totalRevenue,
                        subscription,
                    };
                });

                const stats = await Promise.all(cafeStatsPromises);
                setCafes(stats.sort((a, b) => b.cafe.createdAt - a.cafe.createdAt));
            } catch (error) {
                console.error('Error loading cafes:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [router]);

    const toggleCafeStatus = async (cafeId: string, currentStatus: boolean) => {
        try {
            await updateCafe(cafeId, { isActive: !currentStatus });
            setCafes((prev) =>
                prev.map((stat) =>
                    stat.cafe.id === cafeId ? { ...stat, cafe: { ...stat.cafe, isActive: !currentStatus } } : stat
                )
            );
        } catch (error) {
            console.error('Error updating cafe status:', error);
        }
    };

    const handleDownloadCSV = () => {
        window.open('/api/admin/export-cafes', '_blank');
    };

    const filteredCafes = cafes.filter((stat) => {
        const matchesSearch = stat.cafe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            stat.cafe.email.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filter === 'active') return stat.cafe.isActive;
        if (filter === 'inactive') return !stat.cafe.isActive;
        if (filter === 'pending_setup') return stat.cafe.setupFeeStatus !== 'paid';
        if (filter === 'overdue') return stat.cafe.nextMonthlyPaymentDueDate !== undefined && Date.now() > stat.cafe.nextMonthlyPaymentDueDate;
        return true;
    });

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
                    <h1 className="text-3xl font-bold text-foreground">Cafes Database</h1>
                    <p className="text-muted-foreground mt-1">Manage and monitor all registered cafes on the platform.</p>
                </div>
                <Button onClick={handleDownloadCSV} className="gap-2 shadow-sm whitespace-nowrap hidden sm:flex">
                    <Download className="h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            <Card className="p-6 border-primary/10 shadow-sm bg-card/80 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                        {(['all', 'active', 'inactive', 'pending_setup', 'overdue'] as const).map((f) => (
                            <Button
                                key={f}
                                onClick={() => setFilter(f)}
                                variant={filter === f ? 'default' : 'outline'}
                                size="sm"
                                className={`whitespace-nowrap ${filter === f ? 'shadow-sm' : 'bg-transparent hover:bg-muted'}`}
                            >
                                {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'inactive' ? 'Blocked' : f === 'overdue' ? 'Overdue' : 'Setup Pending'}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b text-sm font-medium text-muted-foreground">
                                <th className="pb-3 px-4">Cafe Details</th>
                                <th className="pb-3 px-4">Owner Info</th>
                                <th className="pb-3 px-4 hidden md:table-cell">Payment Status</th>
                                <th className="pb-3 px-4 hidden lg:table-cell">Registration Date</th>
                                <th className="pb-3 px-4">Permissions</th>
                                <th className="pb-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredCafes.map(({ cafe, subscription }) => (
                                <tr key={cafe.id} className="hover:bg-muted/30 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                <Store className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground text-sm">{cafe.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">/{cafe.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm font-medium text-foreground">{cafe.email}</p>
                                        <p className="text-xs text-muted-foreground">{cafe.phone}</p>
                                    </td>
                                    <td className="p-4 hidden md:table-cell">
                                        {cafe.setupFeeStatus !== 'paid' ? (
                                            <Badge variant="outline" className={`px-2 py-0.5 border-none ${cafe.setupFeeStatus === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                                {cafe.setupFeeStatus.toUpperCase()} SETUP
                                            </Badge>
                                        ) : cafe.nextMonthlyPaymentDueDate && Date.now() > cafe.nextMonthlyPaymentDueDate ? (
                                            <Badge variant="outline" className="px-2 py-0.5 border-none bg-red-100 text-red-800">
                                                OVERDUE
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="px-2 py-0.5 border-none bg-green-100/80 text-green-800">
                                                ACTIVE
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-foreground hidden lg:table-cell">
                                        {new Date(cafe.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <Badge className={`px-2 py-0.5 border-none ${cafe.isActive ? 'bg-green-100/80 text-green-800 hover:bg-green-200/80' : 'bg-red-100/80 text-red-800 hover:bg-red-200/80'}`}>
                                            {cafe.isActive ? 'Active' : 'Blocked'}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant={cafe.isActive ? "outline" : "default"}
                                                onClick={() => toggleCafeStatus(cafe.id, cafe.isActive)}
                                                className={`h-8 w-8 p-0 rounded-full flex-shrink-0 ${cafe.isActive ? 'hover:bg-destructive hover:text-destructive-foreground hover:border-destructive' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                                title={cafe.isActive ? "Block Cafe" : "Unblock Cafe"}
                                            >
                                                {cafe.isActive ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                            </Button>
                                            <Link href={`/${cafe.slug}/menu`}>
                                                <Button size="sm" variant="ghost" className="h-8 text-xs hover:bg-primary/5">
                                                    View Store
                                                </Button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredCafes.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center">
                                            <Store className="h-10 w-10 text-muted-foreground/50 mb-3" />
                                            <p>No cafes found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
