'use client';

import { useEffect, useState, useMemo } from 'react';
import { subscribeToAllCafes, Cafe, verifyMonthlyPayment, verifySetupFeePayment, verifyTableUpgradePayment, subscribeToSystemPendingSubscriptionPayments, subscribeToSystemPendingUpgradePayments, SubscriptionPayment, TableUpgradePayment } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Store, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PendingPayment {
    cafe: Cafe;
    paymentData: SubscriptionPayment | TableUpgradePayment;
    typeOverride: 'setup' | 'monthly' | 'upgrade';
}

export default function AdminPaymentsDashboard() {
    const router = useRouter();
    const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'setup' | 'monthly' | 'upgrade'>('all');
    const [adminId, setAdminId] = useState<string>('');

    const [cafesMap, setCafesMap] = useState<Map<string, Cafe>>(new Map());
    const [subPayments, setSubPayments] = useState<SubscriptionPayment[]>([]);
    const [upPayments, setUpPayments] = useState<TableUpgradePayment[]>([]);

    useEffect(() => {
        const adminToken = localStorage.getItem('admin_token');
        if (!adminToken) {
            router.push('/admin/login');
            return;
        }

        setAdminId(adminToken);

        const unsubscribeCafes = subscribeToAllCafes((allCafes) => {
            setCafesMap(new Map(allCafes.map(c => [c.id, c])));
        });

        const unsubscribeSubs = subscribeToSystemPendingSubscriptionPayments((payments) => {
            setSubPayments(payments);
        });

        const unsubscribeUpgrades = subscribeToSystemPendingUpgradePayments((payments) => {
            setUpPayments(payments);
        });

        const timeoutId = setTimeout(() => {
            setLoading(false);
        }, 1500);

        return () => {
            if (unsubscribeCafes) unsubscribeCafes();
            if (unsubscribeSubs) unsubscribeSubs();
            if (unsubscribeUpgrades) unsubscribeUpgrades();
            clearTimeout(timeoutId);
        };
    }, [router]);

    useEffect(() => {
        if (cafesMap.size === 0) return;

        const allPending: PendingPayment[] = [];

        subPayments.forEach((payment) => {
            const cafe = cafesMap.get(payment.cafeId);
            if (cafe) {
                allPending.push({ cafe, paymentData: payment, typeOverride: payment.type });
            }
        });

        upPayments.forEach((payment) => {
            const cafe = cafesMap.get(payment.cafeId);
            if (cafe) {
                allPending.push({ cafe, paymentData: payment, typeOverride: 'upgrade' });
            }
        });

        setPendingPayments(allPending.sort((a, b) => {
            const dateA = 'dueDate' in a.paymentData ? a.paymentData.dueDate : parseInt(a.paymentData.id.split('-')[1] || '0');
            const dateB = 'dueDate' in b.paymentData ? b.paymentData.dueDate : parseInt(b.paymentData.id.split('-')[1] || '0');
            return dateB - dateA;
        }));
    }, [cafesMap, subPayments, upPayments]);

    const handleVerification = async (paymentId: string, cafeId: string, paymentType: 'setup' | 'monthly' | 'upgrade', approved: boolean) => {
        try {
            if (paymentType === 'setup') {
                await verifySetupFeePayment(cafeId, adminId, approved);
            } else if (paymentType === 'upgrade') {
                await verifyTableUpgradePayment(cafeId, paymentId, adminId, approved);
            } else {
                await verifyMonthlyPayment(cafeId, paymentId, adminId, approved);
            }

            // Remove from UI instantly (for snappy UX, listeners will catch up)
            setPendingPayments((prev) => prev.filter((p) => p.paymentData.id !== paymentId));
        } catch (error) {
            console.error('Error verifying payment:', error);
            alert('Failed to process verification. Please try again.');
        }
    };

    const filteredPayments = pendingPayments.filter((p) => {
        if (filter === 'all') return true;
        return p.typeOverride === filter;
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
                    <h1 className="text-3xl font-bold text-foreground">Payment Verification</h1>
                    <p className="text-muted-foreground mt-1">Review and action pending Setup and Subscription fees submitted by cafes.</p>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                <Button onClick={() => setFilter('all')} variant={filter === 'all' ? 'default' : 'outline'} size="sm" className="whitespace-nowrap">
                    All Pending ({pendingPayments.length})
                </Button>
                <Button onClick={() => setFilter('setup')} variant={filter === 'setup' ? 'default' : 'outline'} size="sm" className="whitespace-nowrap">
                    Setup Fees ({pendingPayments.filter(p => p.typeOverride === 'setup').length})
                </Button>
                <Button onClick={() => setFilter('monthly')} variant={filter === 'monthly' ? 'default' : 'outline'} size="sm" className="whitespace-nowrap">
                    Monthly Subs ({pendingPayments.filter(p => p.typeOverride === 'monthly').length})
                </Button>
                <Button onClick={() => setFilter('upgrade')} variant={filter === 'upgrade' ? 'default' : 'outline'} size="sm" className="whitespace-nowrap">
                    Table Upgrades ({pendingPayments.filter(p => p.typeOverride === 'upgrade').length})
                </Button>
            </div>

            {filteredPayments.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">You're all caught up!</h3>
                    <p className="text-muted-foreground">There are no pending payments requiring verification at this time.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPayments.map(({ cafe, paymentData, typeOverride }) => (
                        <Card key={paymentData.id} className="p-5 flex flex-col hover:border-primary/50 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <Badge variant="outline" className={typeOverride === 'setup' ? 'bg-amber-100 text-amber-800 border-none' : typeOverride === 'monthly' ? 'bg-blue-100 text-blue-800 border-none' : 'bg-purple-100 text-purple-800 border-none'}>
                                    {typeOverride.toUpperCase()} FEE
                                </Badge>
                                <span className="text-sm text-muted-foreground font-mono">
                                    {new Date(paymentData.id.split('-')[1] ? parseInt(paymentData.id.split('-')[1]) : Date.now()).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
                                <Store className="h-8 w-8 text-primary p-1.5 bg-primary/10 rounded-md shrink-0" />
                                <div className="min-w-0">
                                    <p className="font-semibold text-foreground truncate">{cafe.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{cafe.email}</p>
                                </div>
                            </div>

                            <div className="space-y-3 flex-1 mb-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Amount:</span>
                                    <span className="font-bold text-lg">₹{paymentData.amount}</span>
                                </div>
                                {'tablesAdded' in paymentData && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Extra Tables:</span>
                                        <span className="font-semibold text-purple-700">+{paymentData.tablesAdded} Tables</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Transaction ID:</span>
                                    <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs truncate max-w-[150px]">
                                        {paymentData.paymentId}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-auto pt-4 border-t">
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                                    onClick={() => handleVerification(paymentData.id, cafe.id, typeOverride, true)}
                                >
                                    <CheckCircle className="h-4 w-4" />
                                    Approve
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground gap-2"
                                    onClick={() => {
                                        if (window.confirm('Are you sure you want to REJECT this payment? The cafe owner will be notified to submit their payment again.')) {
                                            handleVerification(paymentData.id, cafe.id, typeOverride, false);
                                        }
                                    }}
                                >
                                    <XCircle className="h-4 w-4" />
                                    Reject
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
