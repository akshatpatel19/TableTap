'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getCafeByEmail, getSubscription, Cafe, Subscription, createSubscription, createMenuItem, getOrders, updateOrder, Order, isMonthlyPaymentDue, getPendingPayments, isPaymentReminderDue, isPaymentOverdue, getDaysRemainingUntilDue, getAdminSettings, AdminSettings, subscribeToAdminSettings, subscribeToCafeByEmail, getSubscriptionPayments, getTableUpgradePayments, SubscriptionPayment, TableUpgradePayment } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogOut, QrCode, Menu, Users, Settings, Tag, FileText, TrendingUp, X, Megaphone, ShieldAlert, Maximize, FileCheck } from 'lucide-react';
import { SubscriptionPlansComponent, SubscriptionPlan } from '@/components/SubscriptionPlans';
import SetupFeePaymentModal from '@/components/SetupFeePaymentModal';
import MonthlySubscriptionModal from '@/components/MonthlySubscriptionModal';
import PaymentReminderModal from '@/components/PaymentReminderModal';
import Link from 'next/link';
import PopupRenderer from '@/components/PopupRenderer';

export default function OwnerDashboard() {
  const router = useRouter();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlans, setShowPlans] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [showSetupFeeModal, setShowSetupFeeModal] = useState(false);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [showPaymentReminder, setShowPaymentReminder] = useState(false);
  const [isPaymentOverdueStatus, setIsPaymentOverdueStatus] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [pendingPayments, setPendingPayments] = useState<any>(null);
  const [showTableUpgrades, setShowTableUpgrades] = useState(true);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [lastConfirmedTableCount, setLastConfirmedTableCount] = useState<number | null>(null);

  const [subscriptionPayments, setSubscriptionPayments] = useState<SubscriptionPayment[]>([]);
  const [tableUpgradePayments, setTableUpgradePayments] = useState<TableUpgradePayment[]>([]);

  useEffect(() => {
    // Use onAuthStateChanged so we wait for Firebase to restore the auth
    // session asynchronously on page refresh (auth.currentUser is null
    // synchronously until Firebase finishes restoring the persisted token).
    let unsubscribeCafe: (() => void) | undefined;
    let unsubscribeSettings: (() => void) | undefined;

    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
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
        localStorage.setItem('current_cafe_id', cafeData.id);

        // Check if popup was previously dismissed
        const dismissedKey = `table_upgrade_dismissed_${cafeData.id}`;
        const dismissedState = localStorage.getItem(dismissedKey);
        const savedTableCount = dismissedState ? parseInt(dismissedState) : null;

        setLastConfirmedTableCount(savedTableCount || cafeData.tables);

        const [subPayments, upgradePayments] = await Promise.all([
          getSubscriptionPayments(cafeData.id),
          getTableUpgradePayments(cafeData.id),
        ]);
        setSubscriptionPayments(subPayments);
        setTableUpgradePayments(upgradePayments);

        // Show popup initially only if there are upgrades AND either:
        // 1. It's never been dismissed, OR
        // 2. The table count has changed since dismissal
        const shouldShowInitially = !!(upgradePayments &&
          upgradePayments.length > 0 &&
          (!dismissedState || cafeData.tables !== savedTableCount));
        setShowTableUpgrades(shouldShowInitially);

        unsubscribeCafe = subscribeToCafeByEmail(currentUser.email || '', (updatedCafe) => {
          if (updatedCafe) {
            setCafe(updatedCafe);
            // Check if table count actually changed from the dismissed count
            const dismissedKey = `table_upgrade_dismissed_${updatedCafe.id}`;
            const dismissedState = localStorage.getItem(dismissedKey);
            const savedTableCount = dismissedState ? parseInt(dismissedState) : null;

            // Only show popup if table count differs from saved count
            // Note: In real-time update we aren't heavily tracking sub-updates, 
            // but fetching dynamically if table counts change.
            getTableUpgradePayments(updatedCafe.id).then(upPayments => {
              setTableUpgradePayments(upPayments);
              if (upPayments &&
                upPayments.length > 0 &&
                (!dismissedState || updatedCafe.tables !== savedTableCount)) {
                setShowTableUpgrades(true);
              }
            });
            getSubscriptionPayments(updatedCafe.id).then(setSubscriptionPayments);
          }
        });

        unsubscribeSettings = subscribeToAdminSettings((updatedSettings) => {
          setAdminSettings(updatedSettings);
        });

        const subscriptionData = await getSubscription(cafeData.id);
        setSubscription(subscriptionData);

        const ordersData = await getOrders(cafeData.id);
        setAllOrders(ordersData);
        setOrders(ordersData.slice(0, 5));



        // Check subscription payment status
        const pending = await getPendingPayments(cafeData.id);
        setPendingPayments(pending);

        // Show setup fee modal if not paid
        if (cafeData.setupFeeStatus === 'pending' || cafeData.setupFeeStatus === 'rejected') {
          setShowSetupFeeModal(true);
        }
        // Check monthly payment status - ONLY after setup fee is paid
        else if (cafeData.setupFeeStatus === 'paid') {
          // Get days remaining for banner display
          const days = await getDaysRemainingUntilDue(cafeData.id);
          setDaysRemaining(days);

          // Check if payment is overdue (mandatory)
          const isOverdue = await isPaymentOverdue(cafeData.id);
          if (isOverdue) {
            setIsPaymentOverdueStatus(true);
            setShowMonthlyModal(true);
          } else {
            // Check if payment reminder should be shown (3 days before due)
            const isReminder = await isPaymentReminderDue(cafeData.id);
            if (isReminder) {
              setShowPaymentReminder(true);
            }
          }
        }
      } catch (error) {
        console.error('[v0] Error loading dashboard:', error);
        router.push('/owner/login');
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeCafe) unsubscribeCafe();
      if (unsubscribeSettings) unsubscribeSettings();
    };
  }, []);

  const handleSelectPlan = async (plan: SubscriptionPlan, duration: 'monthly' | 'quarterly' | 'yearly') => {
    if (!cafe) return;

    setProcessingPayment(true);

    try {
      // In production, you would initiate Razorpay payment here
      // For now, we'll create a subscription directly

      const prices: Record<string, Record<string, number>> = {
        basic: { monthly: 499, quarterly: 1399, yearly: 4999 },
        standard: { monthly: 999, quarterly: 2799, yearly: 9999 },
        premium: { monthly: 1999, quarterly: 5599, yearly: 19999 },
      };

      const price = prices[plan.id][duration];
      const durationDays = duration === 'monthly' ? 30 : duration === 'quarterly' ? 90 : 365;

      // If subscription exists, update it; otherwise create new
      if (subscription) {
        // Update existing subscription logic would go here
        console.log('[v0] Update subscription:', { plan: plan.id, duration, price });
      } else {
        const newSubscription = await createSubscription({
          cafeId: cafe.id,
          plan: plan.id,
          tablesIncluded: plan.tablesIncluded,
          monthlyCost: plan.monthlyPrice,
          startDate: Date.now(),
          endDate: Date.now() + durationDays * 24 * 60 * 60 * 1000,
          isActive: true,
          autoRenew: true,
        });

        setSubscription(newSubscription);
      }

      // Create some sample menu items if none exist
      // This would normally be done in a setup wizard

      setShowPlans(false);
    } catch (error) {
      console.error('[v0] Error selecting plan:', error);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/owner/login');
  };

  const handleCancelOrder = async (orderId: string) => {
    // Logic to cancel the order would go here
    console.log('[v0] Cancel order:', orderId);
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cafe) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Failed to load cafe information</p>
      </div>
    );
  }

  if (adminSettings?.maintenanceMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background border-t-8 border-amber-500">
        <div className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">System Maintenance</h1>
          <p className="text-muted-foreground text-lg">
            The platform is currently undergoing scheduled maintenance.
          </p>
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-left border">
            <p className="font-semibold text-foreground mb-1">What does this mean?</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Dashboard access is temporarily paused.</li>
              <li>Customer ordering is temporarily disabled.</li>
              <li>No data is lost; everything will resume shortly.</li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            Thank you for your patience while we upgrade our systems.
          </p>
          <Button onClick={handleLogout} variant="outline" className="w-full mt-4">
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </div>
    );
  }

  if (cafe && !cafe.isActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background border-t-8 border-red-600">
        <div className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Account Suspended</h1>
          <p className="text-muted-foreground text-lg">
            Your cafe account has been blocked by the administration.
          </p>
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-left border">
            <p className="font-semibold text-foreground mb-1">What does this mean?</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>You cannot access your dashboard, menu, or settings.</li>
              <li>Customers cannot place new orders for your cafe.</li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            Please contact support or the administrator to resolve this issue and restore your access.
          </p>
          <Button onClick={handleLogout} variant="outline" className="w-full mt-4">
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </div>
    );
  }

  const isSubscriptionActive = subscription && new Date(subscription.endDate) > new Date();

  const handlePaymentRecorded = async () => {
    // Refresh cafe data
    if (cafe) {
      const cafeData = await getCafeByEmail(cafe.email);
      if (cafeData) {
        setCafe(cafeData);
        const [pending, subPayments, upgradePayments] = await Promise.all([
          getPendingPayments(cafeData.id),
          getSubscriptionPayments(cafeData.id),
          getTableUpgradePayments(cafeData.id)
        ]);
        setPendingPayments(pending);
        setSubscriptionPayments(subPayments);
        setTableUpgradePayments(upgradePayments);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Payment Modals */}
      {cafe && (
        <>
          <SetupFeePaymentModal
            open={showSetupFeeModal}
            cafe={cafe}
            onClose={() => setShowSetupFeeModal(false)}
            onPaymentRecorded={handlePaymentRecorded}
          />
          <PaymentReminderModal
            open={showPaymentReminder}
            cafe={cafe}
            onClose={() => setShowPaymentReminder(false)}
            onPayNow={() => {
              setShowPaymentReminder(false);
              setShowMonthlyModal(true);
            }}
          />
          <MonthlySubscriptionModal
            open={showMonthlyModal}
            cafe={cafe}
            onClose={() => setShowMonthlyModal(false)}
            onPaymentRecorded={handlePaymentRecorded}
            isOverdue={isPaymentOverdueStatus}
          />
        </>
      )}

      {cafe && <PopupRenderer cafeId={cafe.id} />}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{cafe.name}</h1>
            <p className="text-sm text-muted-foreground">Owner Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch((err) => console.error(err));
                } else {
                  document.exitFullscreen();
                }
              }}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-transparent"
            >
              <Maximize className="h-4 w-4" />
              <span className="hidden sm:inline">Fullscreen</span>
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Global Announcement Banner */}
        {adminSettings?.noticeActive && adminSettings?.globalNotice && (
          <div className="mb-8 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-4">
            <div className="p-2 bg-primary/20 rounded-lg text-primary mt-0.5 flex-shrink-0">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider mb-1">Platform Notice</h3>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {adminSettings.globalNotice}
              </p>
            </div>
          </div>
        )}

        {/* Subscription Payment Status */}
        {cafe && (
          <>
            {cafe.setupFeeStatus === 'pending' && (
              <Card className="p-6 mb-8 border-l-4 border-l-amber-600 bg-amber-50">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-amber-900 mb-1">Setup Fee Payment Pending</h3>
                    <p className="text-sm text-amber-800 mb-3">
                      Complete your one-time setup fee of ₹4,999 to activate your cafe
                    </p>
                  </div>
                  <Button onClick={() => setShowSetupFeeModal(true)} className="bg-amber-600 hover:bg-amber-700">
                    Pay Now
                  </Button>
                </div>
              </Card>
            )}

            {cafe.setupFeeStatus === 'rejected' && (
              <Card className="p-6 mb-8 border-l-4 border-l-red-600 bg-red-50">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-red-900 mb-1">Setup Fee Payment Rejected</h3>
                    <p className="text-sm text-red-800 mb-3">
                      Your previous payment was rejected. Please try again with the correct amount.
                    </p>
                  </div>
                  <Button onClick={() => setShowSetupFeeModal(true)} className="bg-red-600 hover:bg-red-700">
                    Retry Payment
                  </Button>
                </div>
              </Card>
            )}

            {cafe.setupFeeStatus === 'paid' && cafe.nextMonthlyPaymentDueDate && Date.now() >= cafe.nextMonthlyPaymentDueDate && (
              <Card className="p-6 mb-8 border-l-4 border-l-blue-600 bg-blue-50">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-1">Monthly Subscription Due</h3>
                    <p className="text-sm text-blue-800 mb-3">
                      Your monthly subscription of ₹{cafe.monthlySubscriptionAmount} is due. Pay now to maintain uninterrupted service.
                    </p>
                  </div>
                  <Button onClick={() => setShowMonthlyModal(true)} className="bg-blue-600 hover:bg-blue-700">
                    Pay Now
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Welcome Card */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-primary/10 to-accent/10">
          <h2 className="text-xl font-bold text-foreground mb-2">Welcome to TableTap!</h2>
          <p className="text-muted-foreground">Manage your cafe, menu, and orders all in one place.</p>
        </Card>

        {/* Subscription Expiry Banner */}
        {cafe && cafe.setupFeeStatus === 'paid' && daysRemaining !== null && daysRemaining <= 3 && (
          <Card className="p-4 mb-8 bg-red-50 border-2 border-red-400 rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></div>
                  <p className="text-lg font-bold text-red-900">
                    Subscription Expires in {daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'}
                  </p>
                </div>
                <p className="text-sm text-red-800">
                  Pay your monthly subscription of ₹{cafe.monthlySubscriptionAmount} now to continue uninterrupted service.
                </p>
              </div>
              <Button
                onClick={() => {
                  setShowPaymentReminder(false);
                  setShowMonthlyModal(true);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 whitespace-nowrap"
              >
                Pay Now
              </Button>
            </div>
          </Card>
        )}



        {/* Table Upgrade Status */}
        {showTableUpgrades && cafe && tableUpgradePayments && tableUpgradePayments.length > 0 && (
          <Card className="p-6 mb-8 border-l-4 border-l-blue-600 bg-blue-50 relative">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => {
                  // Save current table count to localStorage when closing
                  if (cafe) {
                    localStorage.setItem(`table_upgrade_dismissed_${cafe.id}`, cafe.tables.toString());
                  }
                  setShowTableUpgrades(false);
                }}
                className="p-1 hover:bg-blue-100 rounded-lg transition-colors"
                aria-label="Close table upgrades"
              >
                <X className="h-5 w-5 text-blue-900" />
              </button>
            </div>
            <div className="space-y-4 pr-6">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Table Upgrades (Latest 3)</h3>
                <p className="text-sm text-blue-800">
                  Track your most recent table upgrade requests and payments below.
                </p>
              </div>

              <div className="space-y-3">
                {tableUpgradePayments
                  .sort((a, b) => (b.paidDate || 0) - (a.paidDate || 0))
                  .slice(0, 3)
                  .map((upgrade) => (
                    <div key={upgrade.id} className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {upgrade.oldTableCount} → {upgrade.newTableCount} tables
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Amount: ₹{upgrade.amount}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {upgrade.status === 'pending' && (
                            <>
                              <div className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></div>
                              <span className="text-xs font-medium text-amber-600">Pending</span>
                            </>
                          )}
                          {upgrade.status === 'paid' && (
                            <>
                              <div className="w-2 h-2 rounded-full bg-green-600"></div>
                              <span className="text-xs font-medium text-green-600">Approved</span>
                            </>
                          )}
                          {upgrade.status === 'rejected' && (
                            <>
                              <div className="w-2 h-2 rounded-full bg-red-600"></div>
                              <span className="text-xs font-medium text-red-600">Rejected</span>
                            </>
                          )}
                        </div>
                      </div>

                      {upgrade.status === 'pending' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Awaiting admin verification (up to 24 hours)
                        </p>
                      )}

                      {upgrade.status === 'paid' && (
                        <p className="text-xs text-green-700 mt-2">
                          Your new tables have been added! Check QR Codes for new table codes.
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </Card>
        )}

        {/* Subscription Status */}
        {subscription && (
          <Card className={`p-6 mb-8 ${isSubscriptionActive ? 'border-l-4 border-l-green-600' : 'border-l-4 border-l-yellow-600'}`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2 capitalize">{subscription.plan} Plan</h3>
                <p className="text-sm text-muted-foreground mb-2">{subscription.tablesIncluded} tables included</p>
                {isSubscriptionActive ? (
                  <p className="text-sm text-green-600 font-medium">{daysRemaining} days remaining</p>
                ) : (
                  <p className="text-sm text-yellow-600 font-medium">Subscription expired</p>
                )}
              </div>
              <Button onClick={() => setShowPlans(!showPlans)} variant="outline">
                {isSubscriptionActive ? 'Upgrade Plan' : 'Renew Subscription'}
              </Button>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Link href={`/${cafe.slug}/menu`} className="block">
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow h-full">
              <QrCode className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Customer Menu</h3>
              <p className="text-sm text-muted-foreground">View as customer</p>
            </Card>
          </Link>

          <Link href={`/${cafe.slug}/staff/dashboard`} className="block">
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow h-full">
              <Users className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Staff Dashboard</h3>
              <p className="text-sm text-muted-foreground">Manage orders</p>
            </Card>
          </Link>

          <Link href={`/${cafe.slug}/owner/menu-setup`} className="block">
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow h-full">
              <Menu className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Menu Setup</h3>
              <p className="text-sm text-muted-foreground">Add items</p>
            </Card>
          </Link>

          <Link href={`/${cafe.slug}/owner/offers`} className="block">
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow h-full">
              <Tag className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Offers</h3>
              <p className="text-sm text-muted-foreground">Create discounts</p>
            </Card>
          </Link>

          <Link href={`/${cafe.slug}/owner/qr-codes`} className="block">
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow h-full">
              <QrCode className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Table QR Codes</h3>
              <p className="text-sm text-muted-foreground">Download QR codes</p>
            </Card>
          </Link>

          <Link href="/owner/orders" className="block">
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow h-full">
              <FileText className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Orders</h3>
              <p className="text-sm text-muted-foreground">Order history</p>
            </Card>
          </Link>

          <Link href="/owner/bills" className="block">
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow h-full">
              <FileText className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Bills & Invoices</h3>
              <p className="text-sm text-muted-foreground">Generate bills & printouts</p>
            </Card>
          </Link>

          <Link href="/owner/analytics" className="block">
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow h-full">
              <TrendingUp className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Analytics</h3>
              <p className="text-sm text-muted-foreground">Sales & performance data</p>
            </Card>
          </Link>

          <Link href={`/${cafe.slug}/owner/settings`} className="block">
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow h-full">
              <Settings className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Settings</h3>
              <p className="text-sm text-muted-foreground">Cafe settings</p>
            </Card>
          </Link>

          <Link href="/owner/tax-compliance" className="block">
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow h-full">
              <FileCheck className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Tax Compliance</h3>
              <p className="text-sm text-muted-foreground">Coming very soon</p>
            </Card>
          </Link>
        </div>

        {/* Recent Orders */}
        {orders.length > 0 && (
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Orders</h3>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-card/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-medium text-foreground">Order #{order.id.slice(0, 8)}</p>
                      <Badge
                        className={
                          order.status === 'served'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                        }
                      >
                        {order.status}
                      </Badge>
                      <Badge
                        className={
                          order.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Table {order.tableId} • {order.items.length} item(s) • ₹{order.totalAmount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}



        {/* Subscription Details Section */}
        {cafe && (
          <Card className="p-6 mb-8 border border-primary/20">
            <h3 className="text-lg font-semibold text-foreground mb-6">Subscription Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Setup Fee Status */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-2">Setup Fee</p>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-foreground">₹4,999</p>
                  <div className="flex items-center gap-2">
                    {cafe.setupFeeStatus === 'paid' ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-green-600"></div>
                        <span className="text-sm font-medium text-green-600">Verified</span>
                      </>
                    ) : cafe.setupFeeStatus === 'pending' ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></div>
                        <span className="text-sm font-medium text-amber-600">Awaiting Verification</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 rounded-full bg-red-600"></div>
                        <span className="text-sm font-medium text-red-600">Rejected</span>
                      </>
                    )}
                  </div>
                  {cafe.setupFeeVerifiedAt && (
                    <p className="text-xs text-muted-foreground">
                      Verified on {new Date(cafe.setupFeeVerifiedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Monthly Subscription Status */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-2">Monthly Subscription</p>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-foreground">₹{cafe.monthlySubscriptionAmount}</p>
                  {cafe.lastMonthlyPaymentDate ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-600"></div>
                        <span className="text-sm font-medium text-green-600">Active</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last paid: {new Date(cafe.lastMonthlyPaymentDate).toLocaleDateString()}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
                        <span className="text-sm font-medium text-yellow-600">Pending</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Complete setup fee first
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Next Payment Due */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-2">Next Payment Due</p>
                <div className="space-y-2">
                  {cafe.nextMonthlyPaymentDueDate ? (
                    <>
                      <p className="text-lg font-bold text-foreground">
                        {new Date(cafe.nextMonthlyPaymentDueDate).toLocaleDateString()}
                      </p>
                      {new Date() >= new Date(cafe.nextMonthlyPaymentDueDate) && cafe.setupFeeStatus === 'paid' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                          <span className="text-sm font-medium text-red-600">Due Now</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-600"></div>
                          <span className="text-sm font-medium text-green-600">On Track</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Complete setup fee to see due date</p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment History */}
            {subscriptionPayments && subscriptionPayments.length > 0 && (
              <div className="mt-6 pt-6 border-t border-muted">
                <p className="text-sm font-medium text-muted-foreground mb-4">Payment History</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {[
                    ...subscriptionPayments,
                    ...(tableUpgradePayments || [])
                  ]
                    .sort((a: any, b: any) => (b.paidDate || b.dueDate || 0) - (a.paidDate || a.dueDate || 0))
                    .slice(0, 5)
                    .map((payment: any) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground capitalize">
                            {payment.type ? `${payment.type} Fee` : `Table Upgrade ${payment.oldTableCount}→${payment.newTableCount}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payment.paidDate || payment.dueDate || 0).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">₹{payment.amount}</p>
                          <span className={`text-xs font-medium ${payment.status === 'paid'
                            ? 'text-green-600'
                            : payment.status === 'pending'
                              ? 'text-amber-600'
                              : 'text-red-600'
                            }`}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Cafe Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Cafe Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Name</p>
              <p className="font-semibold text-foreground">{cafe.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="font-semibold text-foreground">{cafe.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Phone</p>
              <p className="font-semibold text-foreground">{cafe.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Address</p>
              <p className="font-semibold text-foreground">{cafe.address}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Number of Tables</p>
              <p className="font-semibold text-foreground">{cafe.tables}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Menu URL</p>
              <p className="font-semibold text-foreground break-all">
                {process.env.NEXT_PUBLIC_MAIN_DOMAIN}/{cafe.slug}/menu
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Subscription Plans Modal */}
      {showPlans && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Choose Your Plan</h2>
              <Button onClick={() => setShowPlans(false)} variant="outline" size="sm">
                Close
              </Button>
            </div>
            <SubscriptionPlansComponent
              onSelectPlan={handleSelectPlan}
              loading={processingPayment}
              selectedPlan={subscription?.plan}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
