'use client';

import { useEffect, useState } from 'react';
import { getAllCafes, Cafe, verifyMonthlyPayment, updateCafe } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Store, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PendingPayment {
    cafe: Cafe;
    paymentData: NonNullable<Cafe['subscriptionPayments']>[0] | NonNullable<Cafe['tableUpgradePayments']>[0];
    typeOverride: 'setup' | 'monthly' | 'upgrade';
}

export default function AdminPaymentsDashboard() {
    const router = useRouter();
    const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'setup' | 'monthly' | 'upgrade'>('all');
    const [adminId, setAdminId] = useState<string>('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const adminToken = localStorage.getItem('admin_token');
                if (!adminToken) {
                    router.push('/admin/login');
                    return;
                }
                setAdminId(adminToken); // In a real app, this would be a proper UUID from the auth session

                const allCafes = await getAllCafes();
                const allPending: PendingPayment[] = [];

                allCafes.forEach((cafe) => {
                    // Extract Subscription Payments
                    const payments = cafe.subscriptionPayments || [];
                    payments.forEach((payment) => {
                        if (payment.status === 'pending') {
                            allPending.push({
                                cafe,
                                paymentData: payment,
                                typeOverride: payment.type,
                            });
                        }
                    });

                    // Extract Table Upgrade Payments
                    const upgradePayments = cafe.tableUpgradePayments || [];
                    upgradePayments.forEach((payment) => {
                        if (payment.status === 'pending') {
                            allPending.push({
                                cafe,
                                paymentData: payment as any,
                                typeOverride: 'upgrade'
                            });
                        }
                    });
                });

                // Sort by date submitted (descending, assuming ID contains timestamp info implicitly via generation, or falling back to dueDate)
                setPendingPayments(allPending.sort((a, b) => {
                    const dateA = 'dueDate' in a.paymentData ? a.paymentData.dueDate : parseInt(a.paymentData.id.split('-')[1] || '0');
                    const dateB = 'dueDate' in b.paymentData ? b.paymentData.dueDate : parseInt(b.paymentData.id.split('-')[1] || '0');
                    return dateB - dateA;
                }));
            } catch (error) {
                console.error('Error loading payments:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [router]);

    const handleVerification = async (paymentId: string, cafeId: string, paymentType: 'setup' | 'monthly' | 'upgrade', approved: boolean) => {
        try {
            if (paymentType === 'setup') {
                const cafe = pendingPayments.find(p => p.cafe.id === cafeId)?.cafe;
                if (!cafe) return;

                const updatedPayments = (cafe.subscriptionPayments || []).map(p => {
                    if (p.id === paymentId) {
                        return { ...p, status: approved ? 'paid' : ('rejected' as any), verifiedBy: adminId, verifiedAt: Date.now() };
                    }
                    return p;
                });

                await updateCafe(cafeId, {
                    setupFeeStatus: approved ? 'paid' : 'rejected',
                    setupFeeVerifiedAt: Date.now(),
                    subscriptionPayments: updatedPayments
                });
            } else if (paymentType === 'upgrade') {
                const cafe = pendingPayments.find(p => p.cafe.id === cafeId)?.cafe;
                if (!cafe) return;

                const updatedUpgradePayments = (cafe.tableUpgradePayments || []).map(p => {
                    if (p.id === paymentId) {
                        return { ...p, status: approved ? 'paid' : ('rejected' as any), verifiedBy: adminId, verifiedAt: Date.now() };
                    }
                    return p;
                });

                // If approved, strictly apply the new table count from the verified payment object
                const tableCountToSet = approved ? cafe.tableUpgradePayments?.find(p => p.id === paymentId)?.newTableCount || cafe.tables : cafe.tables;

                await updateCafe(cafeId, {
                    tableUpgradePayments: updatedUpgradePayments,
                    tables: tableCountToSet
                });
            } else {
                await verifyMonthlyPayment(cafeId, paymentId, adminId, approved);
            }

            // Remove from UI instantly
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
