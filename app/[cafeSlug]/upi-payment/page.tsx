'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getCafeBySlug, getOrder, updateOrder, Cafe, Order } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, QrCode, Copy, Smartphone } from 'lucide-react';
import { generateUPILink } from '@/lib/upi';

export default function UPIPaymentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const cafeSlug = params.cafeSlug as string;
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!orderId) {
          setError('Order not found');
          setLoading(false);
          return;
        }

        const cafeData = await getCafeBySlug(cafeSlug);
        if (!cafeData) {
          setError('Cafe not found');
          setLoading(false);
          return;
        }

        const orderData = await getOrder(orderId);
        if (!orderData) {
          setError('Order not found');
          setLoading(false);
          return;
        }

        setCafe(cafeData);
        setOrder(orderData);
      } catch (err) {
        console.error('[v0] Error loading data:', err);
        setError('Failed to load payment details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [cafeSlug, orderId]);

  const handleInitiateUPI = () => {
    if (!cafe || !order || !cafe.upiId) {
      setError('UPI ID not configured for this cafe');
      return;
    }

    try {
      const upiLink = generateUPILink({
        upiId: cafe.upiId,
        payeeName: cafe.name,
        amount: parseFloat(amount || '0'),
        transactionRef: order.id,
        description: `Order ${order.id} at ${cafe.name}`,
      });

      window.location.href = upiLink;
    } catch (err) {
      console.error('[v0] Error generating UPI link:', err);
      setError('Failed to initiate UPI payment');
    }
  };

  const handlePaymentConfirmed = async () => {
    if (!order) return;

    setConfirming(true);
    try {
      // Update order status to confirmed (cafe will verify manually)
      await updateOrder(order.id, {
        paymentStatus: 'pending', // Pending manual verification
        status: 'confirmed',
      });

      router.push(`/${cafeSlug}/order-confirmation?orderId=${order.id}&paymentPending=true`);
    } catch (err) {
      console.error('[v0] Error confirming payment:', err);
      setError('Failed to confirm payment. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const copyUPIId = () => {
    if (cafe?.upiId) {
      navigator.clipboard.writeText(cafe.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cafe || !order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <p className="text-lg font-semibold text-foreground mb-4">
            {error || 'Unable to load payment details'}
          </p>
          <Button onClick={() => router.back()} className="bg-primary hover:bg-primary/90">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  if (!cafe.upiId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <p className="text-lg font-semibold text-foreground mb-2">Payment Setup Error</p>
          <p className="text-sm text-muted-foreground mb-4">
            This cafe has not configured UPI payment yet. Please contact the cafe owner or pay at the counter.
          </p>
          <Button
            onClick={() => router.push(`/${cafeSlug}/menu`)}
            className="bg-primary hover:bg-primary/90"
          >
            Back to Menu
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">Complete Payment</h1>
          <p className="text-sm text-muted-foreground">{cafe.name}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Payment Amount */}
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Amount to Pay</p>
              <p className="text-4xl font-bold text-primary">₹{amount}</p>
              <p className="text-sm text-muted-foreground mt-2">Order ID: {orderId}</p>
            </div>
          </Card>

          {/* Instructions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              How to Pay
            </h2>
            <ol className="space-y-3 text-sm text-foreground">
              <li className="flex gap-3">
                <span className="font-semibold text-primary min-w-6">1</span>
                <span>Click "Open UPI App" below to send payment</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-primary min-w-6">2</span>
                <span>Choose your preferred UPI app (Google Pay, PhonePe, Paytm, etc.)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-primary min-w-6">3</span>
                <span>Complete the payment transaction</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-primary min-w-6">4</span>
                <span>Return here and click "Payment Confirmed"</span>
              </li>
            </ol>
          </Card>

          {/* UPI Details */}
          <Card className="p-6 bg-accent/5 border-accent/20">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-accent" />
              Cafe UPI Details
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-background rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">UPI ID</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-mono font-semibold text-foreground">{cafe.upiId}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyUPIId}
                    className="gap-2 bg-transparent"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>

              {cafe.upiQrCode && (
                <div className="flex justify-center p-4 bg-background rounded-lg border">
                  <img
                    src={cafe.upiQrCode || "/placeholder.svg"}
                    alt="UPI QR Code"
                    className="w-48 h-48"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Order Details */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Order Summary</h2>
            <div className="space-y-3 mb-6 pb-6 border-b">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </Card>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleInitiateUPI}
              disabled={confirming}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 h-auto text-base"
            >
              {confirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Open UPI App'
              )}
            </Button>

            <Button
              onClick={handlePaymentConfirmed}
              disabled={confirming}
              variant="outline"
              className="py-3 h-auto text-base font-semibold bg-transparent"
            >
              {confirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  I Have Made the Payment
                </>
              )}
            </Button>

            <Button
              onClick={() => router.back()}
              disabled={confirming}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
          </div>

          {/* Info Box */}
          <Card className="p-4 bg-muted/30 border-muted/50">
            <p className="text-xs text-muted-foreground">
              <strong>Important:</strong> After clicking "I Have Made the Payment", your order will be sent to the cafe staff. They will verify the payment manually and confirm your order.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
