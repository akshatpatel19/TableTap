'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, QrCode, Copy, Check, X } from 'lucide-react';
import {
  Cafe,
  recordTableUpgradePayment,
  getAdminSettings,
  AdminSettings,
  getCafe,
  calculateUpgradeCost,
  getDaysRemainingUntilDue,
  getTableUpgradePayments,
} from '@/lib/db';
import { generateQRCode } from '@/lib/upi';

interface TableUpgradeModalProps {
  open: boolean;
  cafe: Cafe;
  newTableCount: number;
  onClose: () => void;
  onPaymentRecorded: () => void;
}

export default function TableUpgradeModal({
  open,
  cafe,
  newTableCount,
  onClose,
  onPaymentRecorded,
}: TableUpgradeModalProps) {
  const [step, setStep] = useState<'confirmation' | 'payment' | 'verification'>('confirmation');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [upgradeCost, setUpgradeCost] = useState<number>(0);

  const tablesAdded = newTableCount - cafe.tables;
  const isDowngrade = tablesAdded < 0;
  const isUpgrade = tablesAdded > 0;

  useEffect(() => {
    const loadData = async () => {
      try {
        const settings = await getAdminSettings();
        setAdminSettings(settings);

        // For downgrades, no cost - skip API calls
        if (isDowngrade) {
          setUpgradeCost(0);
          setDaysRemaining(0);
          return;
        }

        const days = await getDaysRemainingUntilDue(cafe.id);
        if (days) {
          setDaysRemaining(days);
          const monthlyFeePerTable = settings?.monthlyFeePerTable || 199;
          const cost = calculateUpgradeCost(tablesAdded, days, monthlyFeePerTable);
          setUpgradeCost(cost);
        }
      } catch (err) {
        console.error('[v0] Error loading upgrade data:', err);
        setError('Failed to load upgrade details');
      }
    };

    if (open) {
      loadData();
      setStep('confirmation');
    }
  }, [open, cafe.id, tablesAdded, isDowngrade]);

  // Poll for payment verification
  useEffect(() => {
    if (step !== 'verification') return;

    const pollInterval = setInterval(async () => {
      try {
        const payments = await getTableUpgradePayments(cafe.id);
        if (payments && payments.length > 0) {
          const latestUpgradePayment = payments
            .sort((a, b) => (b.paidDate || 0) - (a.paidDate || 0))[0];

          if (latestUpgradePayment && latestUpgradePayment.status === 'paid') {
            clearInterval(pollInterval);
            setTimeout(() => {
              onPaymentRecorded();
              onClose();
            }, 2000);
          }
        }
      } catch (err) {
        console.error('[v0] Error polling for verification:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [step, cafe.id, onPaymentRecorded, onClose]);

  const adminUpiId = adminSettings?.upiId;

  const handleGenerateQR = async () => {
    if (!adminUpiId) {
      setError('Admin UPI ID not configured. Please contact admin.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const qr = await generateQRCode(
        `upi://pay?pa=${adminUpiId}&pn=TableTap&am=${upgradeCost}&tn=Table%20Upgrade%20${cafe.id}`
      );
      setQrCode(qr);
      setStep('payment');
    } catch (err) {
      console.error('[v0] Error generating QR code:', err);
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUPI = () => {
    if (adminUpiId) {
      navigator.clipboard.writeText(adminUpiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePaymentDone = async () => {
    setLoading(true);
    setError(null);

    try {
      await recordTableUpgradePayment(cafe.id, cafe.tables, newTableCount, daysRemaining, adminSettings?.monthlyFeePerTable || 199);
      setStep('verification');
    } catch (err) {
      console.error('[v0] Error recording payment:', err);
      setError('Failed to record payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Save current table count to localStorage when closing (dismissing)
    if (step === 'confirmation') {
      localStorage.setItem(`table_upgrade_dismissed_${cafe.id}`, cafe.tables.toString());
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (newOpen === false && step !== 'verification') {
        handleClose();
      }
    }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {step === 'confirmation' && (
          <>
            <DialogHeader>
              <DialogTitle>{isDowngrade ? 'Downgrade Tables' : 'Upgrade Tables'}</DialogTitle>
              <DialogDescription>{isDowngrade ? 'Reduce your table count at no cost' : 'Increase your table count with a prorated payment'}</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Current Tables</p>
                    <p className="text-2xl font-bold text-foreground">{cafe.tables}</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="text-2xl text-muted-foreground">→</div>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">New Tables</p>
                    <p className="text-2xl font-bold text-primary">{newTableCount}</p>
                  </div>
                </div>

                <Card className={`p-4 ${isDowngrade ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isDowngrade ? 'Tables to Remove:' : 'Tables to Add:'}</span>
                      <span className="font-semibold text-foreground">{Math.abs(tablesAdded)}</span>
                    </div>

                    {isUpgrade && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rate per Table:</span>
                          <span className="font-semibold text-foreground">₹{adminSettings?.monthlyFeePerTable || 199}/month</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Days Remaining:</span>
                          <span className="font-semibold text-foreground">{daysRemaining} days</span>
                        </div>
                        <div className="border-t border-blue-200 pt-3 mt-3">
                          <p className="text-xs text-blue-700 leading-relaxed mb-2">
                            <span className="font-semibold">Prorated Price:</span> Based on {daysRemaining} days remaining in your subscription
                          </p>
                        </div>
                      </>
                    )}

                    <div className={`border-t ${isDowngrade ? 'border-green-200' : 'border-blue-200'} pt-3 mt-3 flex justify-between`}>
                      <span className="text-foreground font-semibold">Total Amount:</span>
                      <span className={`font-bold ${isDowngrade ? 'text-green-600' : 'text-blue-600'}`}>₹{upgradeCost}</span>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <p className="font-semibold">Note:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Upgrade payment does NOT extend your subscription</li>
                  <li>Tables will be added once payment is verified</li>
                  <li>Verification may take up to 24 hours</li>
                </ul>
              </div>

              {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">{error}</div>}

              <div className="flex gap-3">
                <Button onClick={handleClose} variant="outline" className="flex-1">
                  Cancel
                </Button>
                {isDowngrade ? (
                  <Button onClick={handlePaymentDone} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Confirm Downgrade'
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleGenerateQR} disabled={loading || !adminUpiId} className="flex-1 bg-primary hover:bg-primary/90">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Proceed to Payment'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {step === 'payment' && (
          <>
            <DialogHeader>
              <DialogTitle>Scan & Pay</DialogTitle>
              <DialogDescription>₹{upgradeCost} for {tablesAdded} additional table(s)</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {qrCode && (
                <div className="flex justify-center p-6 bg-background rounded-lg border">
                  <img src={qrCode} alt="UPI QR Code" className="w-48 h-48 rounded-lg" />
                </div>
              )}

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Or manually enter this UPI ID:</p>
                <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
                  <code className="flex-1 text-sm font-mono text-foreground text-center">{adminUpiId}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyUPI}
                    className="flex-shrink-0 h-auto p-1"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 space-y-1">
                <p className="font-semibold">Amount to Pay: ₹{upgradeCost}</p>
                <p>Make sure to pay the exact amount for proper verification.</p>
              </div>

              {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">{error}</div>}

              <Button onClick={handlePaymentDone} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  'I have made the payment'
                )}
              </Button>

              <Button onClick={() => setStep('confirmation')} variant="outline" className="w-full">
                Back
              </Button>
            </div>
          </>
        )}

        {step === 'verification' && (
          <>
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => onClose()}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <DialogHeader>
              <DialogTitle>Payment Under Verification</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-8">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
                </div>
              </div>

              <div className="text-center space-y-3">
                <p className="font-semibold text-lg text-foreground">Payment Under Review</p>
                <p className="text-sm text-muted-foreground">
                  Your upgrade payment has been recorded and is awaiting admin verification.
                </p>
                <div className="inline-block px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-semibold text-amber-900">⏱️ Verification can take up to 24 hours</p>
                </div>
              </div>

              <Card className="p-4 bg-blue-50 border border-blue-200">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-semibold text-foreground">₹{upgradeCost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tables to Add:</span>
                    <span className="font-semibold text-foreground">{tablesAdded}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">New Total:</span>
                    <span className="font-semibold text-foreground">{newTableCount} tables</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-blue-600 font-semibold flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                      Awaiting Verification
                    </span>
                  </div>
                  <div className="border-t border-blue-200 pt-3 mt-3">
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Once verified by admin, your table count will be updated and new QR codes will be displayed.
                    </p>
                  </div>
                </div>
              </Card>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/20">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Upgrade payment recorded in our system</p>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex items-center justify-center h-5 w-5 rounded-full bg-muted-foreground/20">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse"></div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Waiting for admin verification (up to 24 hours)</p>
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground p-3 bg-muted rounded-lg">
                You can close this modal and check back later. Progress will continue in the background.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
