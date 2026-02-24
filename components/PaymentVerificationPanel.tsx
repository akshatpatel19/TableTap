'use client';

import { useState, useEffect } from 'react';
import { Cafe, getCafe, verifySetupFeePayment, verifyMonthlyPayment, verifyTableUpgradePayment, getSubscriptionPayments, getTableUpgradePayments, SubscriptionPayment, TableUpgradePayment } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface PaymentVerificationPanelProps {
  cafeId: string;
  onVerificationComplete?: () => void;
}

export default function PaymentVerificationPanel({ cafeId, onVerificationComplete }: PaymentVerificationPanelProps) {
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject'>('approve');
  const [subscriptionPayments, setSubscriptionPayments] = useState<SubscriptionPayment[]>([]);
  const [upgradePayments, setUpgradePayments] = useState<TableUpgradePayment[]>([]);

  useEffect(() => {
    const loadCafe = async () => {
      try {
        const data = await getCafe(cafeId);
        setCafe(data);
        if (data) {
          const [sub, upg] = await Promise.all([
            getSubscriptionPayments(cafeId),
            getTableUpgradePayments(cafeId)
          ]);
          setSubscriptionPayments(sub);
          setUpgradePayments(upg);
        }
      } catch (err) {
        console.error('[v0] Error loading cafe:', err);
        setError('Failed to load cafe data');
      } finally {
        setLoading(false);
      }
    };

    loadCafe();
  }, [cafeId]);

  const handleVerifySetupFee = async (approve: boolean) => {
    setVerifying(`setup-${approve}`);
    setError(null);

    try {
      const adminId = localStorage.getItem('admin_token') || 'admin';
      await verifySetupFeePayment(cafeId, adminId, approve);

      const updatedCafe = await getCafe(cafeId);
      setCafe(updatedCafe);
      // Refresh payments
      getSubscriptionPayments(cafeId).then(setSubscriptionPayments);
      setShowDialog(false);
      onVerificationComplete?.();
    } catch (err) {
      console.error('[v0] Error verifying setup fee:', err);
      setError('Failed to verify payment');
    } finally {
      setVerifying(null);
    }
  };

  const handleVerifyMonthlyPayment = async (paymentId: string, approve: boolean) => {
    setVerifying(`monthly-${paymentId}`);
    setError(null);

    try {
      const adminId = localStorage.getItem('admin_token') || 'admin';
      await verifyMonthlyPayment(cafeId, paymentId, adminId, approve);

      const updatedCafe = await getCafe(cafeId);
      setCafe(updatedCafe);
      // Refresh payments
      getSubscriptionPayments(cafeId).then(setSubscriptionPayments);
      setShowDialog(false);
      onVerificationComplete?.();
    } catch (err) {
      console.error('[v0] Error verifying monthly payment:', err);
      setError('Failed to verify payment');
    } finally {
      setVerifying(null);
    }
  };

  const handleVerifyTableUpgradePayment = async (paymentId: string, approve: boolean) => {
    setVerifying(`upgrade-${paymentId}`);
    setError(null);

    try {
      const adminId = localStorage.getItem('admin_token') || 'admin';
      await verifyTableUpgradePayment(cafeId, paymentId, adminId, approve);

      const updatedCafe = await getCafe(cafeId);
      setCafe(updatedCafe);
      // Refresh payments
      getTableUpgradePayments(cafeId).then(setUpgradePayments);
      setShowDialog(false);
      onVerificationComplete?.();
    } catch (err) {
      console.error('[v0] Error verifying table upgrade payment:', err);
      setError('Failed to verify payment');
    } finally {
      setVerifying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cafe) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Cafe not found</p>
      </Card>
    );
  }

  const setupFeePayment = subscriptionPayments.find((p) => p.type === 'setup');
  const monthlyPayments = subscriptionPayments.filter((p) => p.type === 'monthly') || [];
  const pendingMonthlyPayments = monthlyPayments.filter((p) => p.status === 'pending');
  const pendingUpgradePayments = upgradePayments.filter((p) => p.status === 'pending');

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Setup Fee Payment Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Setup Fee Payment</h3>
            <p className="text-sm text-muted-foreground">One-time payment for cafe activation</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">₹4999</p>
            <p className="text-xs text-muted-foreground">One-time</p>
          </div>
        </div>

        {setupFeePayment ? (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <div className="flex items-center gap-2">
                  {setupFeePayment.status === 'paid' && (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <Badge className="bg-green-100 text-green-800">Verified</Badge>
                    </>
                  )}
                  {setupFeePayment.status === 'pending' && (
                    <>
                      <Clock className="h-4 w-4 text-amber-600" />
                      <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
                    </>
                  )}
                  {setupFeePayment.status === 'rejected' && (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" />
                      <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold text-foreground">₹{setupFeePayment.amount}</span>
              </div>

              {setupFeePayment.paidDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Paid on:</span>
                  <span className="font-semibold text-foreground">
                    {new Date(setupFeePayment.paidDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              {setupFeePayment.verifiedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Verified by:</span>
                  <span className="font-semibold text-foreground">{setupFeePayment.verifiedBy || 'Admin'}</span>
                </div>
              )}

              {setupFeePayment.notes && (
                <div className="border-t border-muted pt-3">
                  <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                  <p className="text-sm text-foreground">{setupFeePayment.notes}</p>
                </div>
              )}
            </div>

            {setupFeePayment.status === 'pending' && (
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setSelectedPayment(setupFeePayment);
                    setDialogAction('approve');
                    setShowDialog(true);
                  }}
                  disabled={verifying !== null}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {verifying === `setup-true` ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Payment
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setSelectedPayment(setupFeePayment);
                    setDialogAction('reject');
                    setShowDialog(true);
                  }}
                  disabled={verifying !== null}
                  variant="outline"
                  className="flex-1 bg-transparent"
                >
                  {verifying === `setup-false` ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Payment
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">No setup fee payment recorded yet</p>
          </div>
        )}
      </Card>

      {/* Monthly Subscription Payments Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Monthly Subscription Payments</h3>
            <p className="text-sm text-muted-foreground">₹{cafe.tables} x 199 = ₹{cafe.monthlySubscriptionAmount}/month</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-primary">{pendingMonthlyPayments.length} Pending</p>
          </div>
        </div>

        {monthlyPayments.length > 0 ? (
          <div className="space-y-3">
            {monthlyPayments.map((payment) => (
              <div key={payment.id} className="bg-muted/50 p-4 rounded-lg space-y-3 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(payment.dueDate).toLocaleDateString('en-IN', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">₹{payment.amount}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {payment.status === 'paid' && (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <Badge className="bg-green-100 text-green-800">Verified</Badge>
                      </>
                    )}
                    {payment.status === 'pending' && (
                      <>
                        <Clock className="h-4 w-4 text-amber-600" />
                        <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
                      </>
                    )}
                    {payment.status === 'rejected' && (
                      <>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                      </>
                    )}
                  </div>
                </div>

                {payment.paidDate && (
                  <p className="text-xs text-muted-foreground">
                    Paid on: {new Date(payment.paidDate).toLocaleDateString()}
                  </p>
                )}

                {payment.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => {
                        setSelectedPayment(payment);
                        setDialogAction('approve');
                        setShowDialog(true);
                      }}
                      disabled={verifying !== null}
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 h-auto text-xs py-1"
                    >
                      {verifying === `monthly-${payment.id}` ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        'Approve'
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedPayment(payment);
                        setDialogAction('reject');
                        setShowDialog(true);
                      }}
                      disabled={verifying !== null}
                      size="sm"
                      variant="outline"
                      className="flex-1 bg-transparent h-auto text-xs py-1"
                    >
                      {verifying === `monthly-${payment.id}` ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        'Reject'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">No monthly payments recorded yet</p>
          </div>
        )}
      </Card>

      {/* Table Upgrade Payments Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Table Upgrade Payments</h3>
            <p className="text-sm text-muted-foreground">Prorated upgrades to table count</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-primary">{pendingUpgradePayments.length} Pending</p>
          </div>
        </div>

        {upgradePayments.length > 0 ? (
          <div className="space-y-3">
            {upgradePayments.map((payment) => (
              <div key={payment.id} className="bg-muted/50 p-4 rounded-lg space-y-3 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {payment.oldTableCount} → {payment.newTableCount} tables ({payment.tablesAdded} added)
                    </p>
                    <p className="text-xs text-muted-foreground">₹{payment.amount} • {payment.daysRemaining} days remaining</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {payment.status === 'paid' && (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <Badge className="bg-green-100 text-green-800">Verified</Badge>
                      </>
                    )}
                    {payment.status === 'pending' && (
                      <>
                        <Clock className="h-4 w-4 text-amber-600" />
                        <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
                      </>
                    )}
                    {payment.status === 'rejected' && (
                      <>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                      </>
                    )}
                  </div>
                </div>

                {payment.paidDate && (
                  <p className="text-xs text-muted-foreground">
                    Paid on: {new Date(payment.paidDate).toLocaleDateString()}
                  </p>
                )}

                {payment.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => {
                        setSelectedPayment(payment);
                        setDialogAction('approve');
                        setShowDialog(true);
                      }}
                      disabled={verifying !== null}
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 h-auto text-xs py-1"
                    >
                      {verifying === `upgrade-${payment.paymentId}` ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        'Approve'
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedPayment(payment);
                        setDialogAction('reject');
                        setShowDialog(true);
                      }}
                      disabled={verifying !== null}
                      size="sm"
                      variant="outline"
                      className="flex-1 bg-transparent h-auto text-xs py-1"
                    >
                      {verifying === `upgrade-${payment.paymentId}` ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        'Reject'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">No table upgrade payments recorded yet</p>
          </div>
        )}
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'approve' ? 'Approve Payment?' : 'Reject Payment?'}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === 'approve'
                ? 'This payment will be marked as verified and confirmed.'
                : 'This payment will be marked as rejected. The cafe owner will need to resubmit.'}
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                {selectedPayment.type ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-semibold capitalize">{selectedPayment.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-semibold">₹{selectedPayment.amount}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-semibold">Table Upgrade</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tables:</span>
                      <span className="font-semibold">{selectedPayment.oldTableCount} → {selectedPayment.newTableCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-semibold">₹{selectedPayment.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Days Remaining:</span>
                      <span className="font-semibold">{selectedPayment.daysRemaining}</span>
                    </div>
                  </>
                )}
                {selectedPayment.paidDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid on:</span>
                    <span className="font-semibold">
                      {new Date(selectedPayment.paidDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowDialog(false)}
                  variant="outline"
                  className="flex-1 bg-transparent"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedPayment.type === 'setup') {
                      handleVerifySetupFee(dialogAction === 'approve');
                    } else if (selectedPayment.type === 'monthly') {
                      handleVerifyMonthlyPayment(selectedPayment.id, dialogAction === 'approve');
                    } else {
                      // Table upgrade payment
                      handleVerifyTableUpgradePayment(selectedPayment.paymentId, dialogAction === 'approve');
                    }
                  }}
                  className={`flex-1 ${dialogAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {dialogAction === 'approve' ? 'Approve' : 'Reject'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
