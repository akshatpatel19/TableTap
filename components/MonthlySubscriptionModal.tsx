'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, QrCode, Copy, Check, AlertCircle } from 'lucide-react';
import { Cafe, recordMonthlyPayment, getAdminSettings, AdminSettings, getCafe } from '@/lib/db';
import { generateQRCode } from '@/lib/upi';

interface MonthlySubscriptionModalProps {
  open: boolean;
  cafe: Cafe;
  onClose: () => void;
  onPaymentRecorded: () => void;
  isOverdue?: boolean; // If true, modal cannot be closed until payment is verified
}

export default function MonthlySubscriptionModal({
  open,
  cafe,
  onClose,
  onPaymentRecorded,
  isOverdue = false,
}: MonthlySubscriptionModalProps) {
  const [step, setStep] = useState<'instructions' | 'payment' | 'verification' | 'confirmed'>('instructions');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);

  useEffect(() => {
    const loadAdminSettings = async () => {
      try {
        const settings = await getAdminSettings();
        setAdminSettings(settings);
      } catch (err) {
        console.error('[v0] Error loading admin settings:', err);
      }
    };

    if (open) {
      loadAdminSettings();
      setStep('instructions');
    }
  }, [open]);

  // Poll for payment verification
  useEffect(() => {
    if (step !== 'verification') return;

    const pollInterval = setInterval(async () => {
      try {
        const updatedCafe = await getCafe(cafe.id);
        if (updatedCafe) {
          // Check if latest monthly payment is verified
          const latestMonthlyPayment = updatedCafe.subscriptionPayments
            ?.filter((p) => p.type === 'monthly')
            .sort((a, b) => (b.paidDate || 0) - (a.paidDate || 0))[0];

          if (latestMonthlyPayment && latestMonthlyPayment.status === 'paid') {
            clearInterval(pollInterval);
            setStep('confirmed');
            setTimeout(() => {
              onPaymentRecorded();
            }, 2000);
          }
        }
      } catch (err) {
        console.error('[v0] Error polling for verification:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [step, cafe.id, onPaymentRecorded]);

  const monthlyFeePerTable = adminSettings?.monthlyFeePerTable || 199;
  const monthlyAmount = cafe.tables * monthlyFeePerTable;
  const adminUpiId = adminSettings?.upiId;
  const nextDueDate = cafe.nextMonthlyPaymentDueDate ? new Date(cafe.nextMonthlyPaymentDueDate) : new Date();

  const handleGenerateQR = async () => {
    if (!adminUpiId) {
      setError('Admin UPI ID not configured. Please contact admin to configure payment settings.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const qr = await generateQRCode(
        `upi://pay?pa=${adminUpiId}&pn=TableTap&am=${monthlyAmount}&tn=Monthly%20${cafe.id}`
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
      await recordMonthlyPayment(cafe.id);
      setStep('verification');
    } catch (err) {
      console.error('[v0] Error recording payment:', err);
      setError('Failed to record payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Don't allow closing the modal until payment is verified (if overdue)
  const handleClose = (newOpen: boolean) => {
    // If payment is overdue, prevent closing until confirmed
    if (isOverdue) {
      // Only allow closing if modal is being closed and we're in confirmed step
      if (!newOpen && step !== 'confirmed') {
        return; // Prevent closing
      }
    }
    // If not overdue, allow normal closing
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-md max-h-[90vh] overflow-y-auto" 
        onPointerDownOutside={(e) => {
          // If overdue, prevent closing by clicking outside
          if (isOverdue && step !== 'confirmed') {
            e.preventDefault();
          }
        }} 
        onEscapeKeyDown={(e) => {
          // If overdue, prevent closing with ESC key
          if (isOverdue && step !== 'confirmed') {
            e.preventDefault();
          }
        }}
        // Hide the close button if overdue until payment is verified
        showCloseButton={!isOverdue || step === 'confirmed'}
      >
        {step === 'instructions' && (
          <>
            <DialogHeader>
              <DialogTitle>Monthly Subscription Payment</DialogTitle>
              <DialogDescription>Renew your subscription to keep TableTap active</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Your monthly subscription is due. Pay now to maintain uninterrupted service.
                </p>
              </div>

              <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="text-center space-y-2">
                  <p className="text-sm text-blue-700">Monthly Subscription for {cafe.tables} tables</p>
                  <p className="text-4xl font-bold text-blue-900">₹{monthlyAmount}</p>
                  <p className="text-xs text-blue-600">Due: {nextDueDate.toLocaleDateString()}</p>
                </div>
              </Card>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Breakdown:</h3>
                <div className="space-y-2 text-sm bg-muted/50 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate per table:</span>
                    <span className="font-semibold">₹199/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Number of tables:</span>
                    <span className="font-semibold">{cafe.tables}</span>
                  </div>
                  <div className="border-t border-muted pt-2 mt-2 flex justify-between">
                    <span className="text-foreground font-semibold">Total Amount:</span>
                    <span className="font-bold text-blue-600">₹{monthlyAmount}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">How to Pay:</h3>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      1
                    </span>
                    <span className="text-foreground">
                      Pay <span className="font-mono font-semibold text-primary">{adminUpiId}</span> via UPI
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      2
                    </span>
                    <span className="text-foreground">Amount: ₹{monthlyAmount}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      3
                    </span>
                    <span className="text-foreground">Click "I have paid the subscription fee"</span>
                  </li>
                </ol>
              </div>

              {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">{error}</div>}

              <Button onClick={handleGenerateQR} disabled={loading || !adminUpiId} className="w-full bg-primary hover:bg-primary/90">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate QR Code
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {step === 'payment' && (
          <>
            <DialogHeader>
              <DialogTitle>Scan & Pay</DialogTitle>
              <DialogDescription>₹{monthlyAmount} for {cafe.tables} tables</DialogDescription>
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
                <p className="font-semibold">Amount to Pay: ₹{monthlyAmount}</p>
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
                  'I have paid the subscription fee'
                )}
              </Button>

              <Button onClick={() => setStep('instructions')} variant="outline" className="w-full bg-transparent">
                Back
              </Button>
            </div>
          </>
        )}

        {step === 'verification' && (
          <>
            <DialogHeader>
              <DialogTitle>Payment Under Review</DialogTitle>
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
                  Your monthly payment has been recorded and is awaiting admin verification. This can take up to 24 hours.
                </p>
              </div>

              <Card className="p-4 bg-blue-50 border border-blue-200">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-semibold text-foreground">₹{monthlyAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">For Tables:</span>
                    <span className="font-semibold text-foreground">{cafe.tables}</span>
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
                      Once verified by admin, your subscription will be active and you can continue using TableTap.
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
                  <p className="text-sm text-muted-foreground">Monthly payment recorded in our system</p>
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
                Do not close this window. You'll be notified automatically when verification is complete.
              </p>
            </div>
          </>
        )}

        {step === 'confirmed' && (
          <>
            <DialogHeader>
              <DialogTitle>Payment Verified!</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="font-semibold text-foreground">Payment Verified Successfully!</p>
                <p className="text-sm text-muted-foreground">
                  Your monthly subscription has been confirmed. Your service is now active.
                </p>
              </div>

              <Card className="p-4 bg-green-50 border border-green-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-semibold text-foreground">₹{monthlyAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">For Tables:</span>
                    <span className="font-semibold text-foreground">{cafe.tables}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-green-600 font-semibold flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Verified
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Due:</span>
                    <span className="font-semibold text-foreground">
                      {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Card>

              <p className="text-xs text-center text-muted-foreground">
                Redirecting to dashboard...
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
