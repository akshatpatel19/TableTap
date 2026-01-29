'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getCafeBySlug, getOrder, Order, Cafe } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function OrderConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cafeSlug = params.cafeSlug as string;
  const orderId = searchParams.get('orderId');
  const paymentPending = searchParams.get('paymentPending') === 'true';

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        if (!orderId) {
          setError('Order ID not found');
          return;
        }

        const orderData = await getOrder(orderId);
        if (!orderData) {
          setError('Order not found');
          return;
        }

        const cafeData = await getCafeBySlug(cafeSlug);
        if (!cafeData) {
          setError('Cafe not found');
          return;
        }

        setOrder(orderData);
        setCafe(cafeData);
      } catch (err) {
        console.error('[v0] Error loading order:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [orderId, cafeSlug]);

  // Real-time updates listener
  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (doc) => {
      if (doc.exists()) {
        setOrder(doc.data() as Order);
      }
    });

    return () => unsubscribe();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order || !cafe) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <p className="text-lg font-semibold text-destructive mb-4">{error || 'Something went wrong'}</p>
          <Link href="/">
            <Button className="bg-primary hover:bg-primary/90">Go to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const getPaymentStatusDisplay = () => {
    // Show payment pending only if it's UPI, payment is still pending, and paymentPending flag is true
    if (order?.paymentMethod === 'online' && order?.paymentStatus === 'pending' && paymentPending) {
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
          <p className="text-sm text-yellow-800 font-medium">
            ⏳ Payment Verification Pending
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            Your UPI payment is awaiting manual verification from the cafe staff. Your order has been sent to the kitchen and will be prepared once payment is confirmed.
          </p>
        </div>
      );
    }

    if (order?.paymentMethod === 'counter') {
      return (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
          <p className="text-sm text-blue-800 font-medium">
            💳 Pay at Counter
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Please pay the amount when the staff brings your order. Thank you for ordering!</p>
        </div>
      );
    }

    if (order?.paymentStatus === 'paid') {
      return (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
          <p className="text-sm text-green-800 font-medium">
            ✓ Payment Confirmed
          </p>
          <p className="text-xs text-green-700 mt-1">
            Payment received successfully. Your order is being prepared.
          </p>
        </div>
      );
    }

    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'confirmed':
        return 'text-blue-600';
      case 'preparing':
        return 'text-orange-600';
      case 'ready':
        return 'text-green-600';
      case 'served':
        return 'text-green-700';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">Order Confirmed</h1>
          <p className="text-sm text-muted-foreground">{cafe.name} - Table {order.tableId}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Payment Status Alert */}
        {getPaymentStatusDisplay()}
        {/* Success Message */}
        <Card className="p-8 text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Order Placed Successfully!</h2>
          <p className="text-muted-foreground mb-4">
            Your order has been sent to the kitchen. You&apos;ll be notified when it&apos;s ready.
          </p>
          <p className="text-sm text-muted-foreground">
            Order ID: <span className="font-mono font-semibold text-foreground">{order.id}</span>
          </p>
        </Card>

        {/* Order Details */}
        <Card className="p-6 mb-8">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Cafe</p>
              <p className="font-semibold text-foreground">{cafe.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Table</p>
              <p className="font-semibold text-foreground">Table {order.tableId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Order Status</p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className={`h-4 w-4 ${getStatusColor(order.status)}`} />
                <p className={`font-semibold capitalize ${getStatusColor(order.status)}`}>{order.status}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Payment Status</p>
              <p className={`font-semibold capitalize ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                {order.paymentStatus}
              </p>
            </div>
          </div>
        </Card>

        {/* Order Items */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Order Items</h3>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between py-3 border-b last:border-b-0">
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <span className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="text-primary">₹{order.totalAmount.toFixed(2)}</span>
          </div>
        </Card>

        {/* Notes */}
        {order.notes && (
          <Card className="p-6 mb-8 bg-card/50">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Special Notes</h3>
            <p className="text-foreground">{order.notes}</p>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Link href={`/${cafeSlug}/menu?table=${order.tableId}`} className="flex-1">
            <Button variant="outline" className="w-full bg-transparent">
              Add More Items
            </Button>
          </Link>
          <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 h-auto">
            Back to Menu
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-8 p-6 bg-card/50 rounded-lg border text-center">
          <p className="text-sm text-muted-foreground">
            Your order will be prepared shortly. You can place additional orders from the same table.
          </p>
        </div>
      </div>
    </div>
  );
}
