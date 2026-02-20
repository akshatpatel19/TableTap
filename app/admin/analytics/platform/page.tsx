'use client';

import { useEffect, useState } from 'react';
import { getAllCafes, getCafeOrders, Order } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Loader2, TrendingUp, IndianRupee, CreditCard, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PlatformAnalytics() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSetupFees: 0,
        totalMonthlySubscriptions: 0,
        mrr: 0,
        totalGrossVolume: 0, // money passing through orders
    });

    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                const adminToken = localStorage.getItem('admin_token');
                if (!adminToken) {
                    router.push('/admin/login');
                    return;
                }

                const allCafes = await getAllCafes();
                let setupFees = 0;
                let monthlySubs = 0;
                let mrr = 0;
                let grossVolume = 0;

                for (const cafe of allCafes) {
                    // Setup Fees calculation
                    if (cafe.setupFeeStatus === 'paid') {
                        setupFees += 4999;
                    }

                    // Historical subscription matching (rough estimate from active status and amount)
                    // In a real DB we would query the `payments` collection directly
                    if (cafe.isActive && cafe.setupFeeStatus === 'paid') {
                        mrr += cafe.monthlySubscriptionAmount || 0;
                        // Extrapolating historical monthly payments based on `createdAt` vs today
                        const monthsActive = Math.max(1, Math.floor((Date.now() - cafe.createdAt) / (1000 * 60 * 60 * 24 * 30)));
                        monthlySubs += (cafe.monthlySubscriptionAmount || 0) * monthsActive;
                    }

                    // Gross Volume parsing
                    const orders = await getCafeOrders(cafe.id);
                    for (const order of orders) {
                        if (order.paymentStatus === 'paid') {
                            grossVolume += order.totalAmount;
                        }
                    }
                }

                setStats({
                    totalSetupFees: setupFees,
                    totalMonthlySubscriptions: monthlySubs,
                    mrr,
                    totalGrossVolume: grossVolume,
                });
            } catch (error) {
                console.error('Error loading analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        loadAnalytics();
    }, [router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const platformTotal = stats.totalSetupFees + stats.totalMonthlySubscriptions;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Platform Revenue Analysis</h1>
                    <p className="text-muted-foreground mt-1">Breakdown of TableTap earnings and overall transaction volumes.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 border-l-4 border-l-primary/60 bg-card/80 backdrop-blur-sm shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <IndianRupee className="h-16 w-16" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1 relative z-10">Total Platform Earnings</p>
                    <p className="text-4xl font-bold text-foreground relative z-10">₹{platformTotal.toLocaleString()}</p>
                </Card>

                <Card className="p-6 border-l-4 border-l-blue-500 bg-card/80 backdrop-blur-sm shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="h-16 w-16" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1 relative z-10">Estimated MRR</p>
                    <p className="text-4xl font-bold text-blue-600 relative z-10">₹{stats.mrr.toLocaleString()}</p>
                </Card>

                <Card className="p-6 border-border bg-card/80 backdrop-blur-sm shadow-sm relative overflow-hidden group">
                    <p className="text-sm font-medium text-muted-foreground mb-1 relative z-10">From Setup Fees</p>
                    <p className="text-3xl font-semibold text-foreground relative z-10">₹{stats.totalSetupFees.toLocaleString()}</p>
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                        <CreditCard className="h-3 w-3" /> One-time onboarding
                    </div>
                </Card>

                <Card className="p-6 border-border bg-card/80 backdrop-blur-sm shadow-sm relative overflow-hidden group">
                    <p className="text-sm font-medium text-muted-foreground mb-1 relative z-10">From Subscriptions (Est.)</p>
                    <p className="text-3xl font-semibold text-foreground relative z-10">₹{stats.totalMonthlySubscriptions.toLocaleString()}</p>
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                        <Activity className="h-3 w-3" /> Recurring billing
                    </div>
                </Card>
            </div>

            <Card className="p-8 border-primary/10 shadow-sm bg-card/80 backdrop-blur mt-8">
                <h3 className="text-lg font-bold text-foreground mb-4">Gross Transaction Volume</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-2xl">
                    This represents the total amount of money processed by cafes through the platform.
                    TableTap does not take a percentage cut of these transactions; this metric indicates overall platform engagement.
                </p>

                <div className="flex items-end gap-3">
                    <span className="text-5xl font-black bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                        ₹{stats.totalGrossVolume.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground mb-1 font-medium tracking-wide uppercase">Volume</span>
                </div>
            </Card>
        </div>
    );
}
