'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getCafeBySlug, createOrder, updateOrder, Cafe, getAdminSettings } from '@/lib/db';
import { useOrder } from '@/lib/context/OrderContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ShieldAlert } from 'lucide-react';
import { formatAmountForUPI } from '@/lib/upi';

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { cart, getTotalPrice, tableId, clearCart } = useOrder();

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'counter'>('counter');
  const [loading, setLoading] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cafeSlug = params.cafeSlug as string;

  useEffect(() => {
    const loadCafe = async () => {
      try {
        const globalSettings = await getAdminSettings();
        if (globalSettings?.maintenanceMode) {
          setMaintenance(true);
          return;
        }

        const cafeData = await getCafeBySlug(cafeSlug);
        if (!cafeData) {
          setError('Cafe not found');
          return;
        }
        setCafe(cafeData);
      } catch (err) {
        console.error('[v0] Error loading cafe:', err);
        setError('Failed to load cafe information');
      }
    };

    loadCafe();
  }, [cafeSlug]);

  if (maintenance) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background border-t-8 border-amber-500">
        <div className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Under Maintenance</h1>
          <p className="text-muted-foreground text-lg">
            We are currently upgrading our systems.
          </p>
          <p className="text-sm text-muted-foreground">
            Checkout is temporarily paused. Please check back in a few minutes.
          </p>
          <Button onClick={() => router.back()} variant="outline" className="mt-4">
            Return
          </Button>
        </div>
      </div>
    );
  }

  if (!cafe) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          {error ? (
            <p className="text-destructive font-semibold">{error}</p>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          )}
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <p className="text-lg font-semibold text-foreground mb-4">Your cart is empty</p>
          <Button onClick={() => router.back()} className="bg-primary hover:bg-primary/90">
            Back to Menu
          </Button>
        </Card>
      </div>
    );
  }

  const totalAmount = getTotalPrice();

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!email || !phone) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const orderData = {
        cafeId: cafe.id,
        tableId: tableId || 1,
        customerEmail: email,
        customerPhone: phone,
        items: cart.map((item) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount,
        status: 'pending' as const,
        paymentStatus: (paymentMethod === 'online' ? 'pending' : 'paid') as 'pending' | 'paid' | 'failed',
        paymentMethod,
        notes,
      };

      const order = await createOrder(orderData);

      // Trigger order confirmation email (don't let email failure block the user)
      try {
        fetch('/api/send-order-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            customerEmail: email,
            cafeName: cafe.name,
            cafeSlug,
            items: orderData.items,
            totalAmount,
          }),
        }).catch((err) => console.error('[Checkout] Failed to trigger email:', err));
      } catch (e) {
        console.error('[Checkout] Email trigger error:', e);
      }

      if (paymentMethod === 'online') {
        // UPI Payment - redirect to payment confirmation page
        clearCart();
        router.push(
          `/${cafeSlug}/upi-payment?orderId=${order.id}&amount=${formatAmountForUPI(totalAmount)}`
        );
      } else {
        // Pay at counter
        clearCart();
        router.push(`/${cafeSlug}/order-confirmation?orderId=${order.id}`);
      }
    } catch (err) {
      console.error('[v0] Error placing order:', err);
      setError('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">Checkout</h1>
          <p className="text-sm text-muted-foreground">{cafe.name} - Table {tableId}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handlePlaceOrder} className="space-y-8">
          {/* Order Summary */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Order Summary</h2>
            <div className="space-y-3 mb-6 pb-6 border-b">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex justify-between">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total Amount:</span>
              <span className="text-primary">₹{totalAmount.toFixed(2)}</span>
            </div>
          </Card>

          {/* Customer Details */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Your Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Phone Number <span className="text-destructive">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit phone number"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Special Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or dietary preferences?"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground resize-none"
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* Payment Method */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Payment Method</h2>
            <div className="space-y-3">
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-card/50 transition-colors">
                <input
                  type="radio"
                  name="payment"
                  value="counter"
                  checked={paymentMethod === 'counter'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'counter' | 'online')}
                  className="w-4 h-4"
                />
                <div className="ml-3">
                  <p className="font-medium text-foreground">Pay at Counter</p>
                  <p className="text-sm text-muted-foreground">Pay when your order is ready</p>
                </div>
              </label>

              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-card/50 transition-colors">
                <input
                  type="radio"
                  name="payment"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'counter' | 'online')}
                  className="w-4 h-4"
                />
                <div className="ml-3">
                  <p className="font-medium text-foreground">Pay via UPI</p>
                  <p className="text-sm text-muted-foreground">Pay using your UPI app (Google Pay, PhonePe, etc.)</p>
                </div>
              </label>
            </div>
          </Card>

          {error && <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
              disabled={loading}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 h-auto"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Place Order (₹${totalAmount.toFixed(2)})`
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
