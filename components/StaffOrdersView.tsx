'use client';

import React, { useState, useEffect } from 'react';
import { Order, updateOrder } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertCircle, Utensils } from 'lucide-react';

interface StaffOrdersViewProps {
  orders: Order[];
  onRefresh: () => Promise<void>;
}

export const StaffOrdersView: React.FC<StaffOrdersViewProps> = ({ orders, onRefresh }) => {
  const [localOrders, setLocalOrders] = useState(orders);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'confirmed':
      case 'preparing':
        return <Utensils className="h-5 w-5 text-orange-600" />;
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-orange-100 text-orange-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'served':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setLoading(true);
    try {
      await updateOrder(orderId, { status: newStatus as any });
      setLocalOrders(
        localOrders.map((order) => (order.id === orderId ? { ...order, status: newStatus as any } : order))
      );
      await onRefresh();
    } catch (error) {
      console.error('[v0] Error updating order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaymentReceived = async (orderId: string) => {
    setLoading(true);
    try {
      await updateOrder(orderId, { paymentStatus: 'paid' });
      setLocalOrders(
        localOrders.map((order) => (order.id === orderId ? { ...order, paymentStatus: 'paid' } : order))
      );
      await onRefresh();
    } catch (error) {
      console.error('[v0] Error marking payment received:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setLoading(true);
    try {
      await updateOrder(orderId, { status: 'cancelled' });
      setLocalOrders(
        localOrders.map((order) => (order.id === orderId ? { ...order, status: 'cancelled' } : order))
      );
      await onRefresh();
    } catch (error) {
      console.error('[v0] Error cancelling order:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingOrders = localOrders.filter((o) => o.status === 'pending');
  const preparingOrders = localOrders.filter((o) => o.status === 'confirmed' || o.status === 'preparing');
  const readyOrders = localOrders.filter((o) => o.status === 'ready');
  const servedOrders = localOrders.filter((o) => o.status === 'served' && o.paymentStatus === 'pending');

  const renderOrderCard = (order: Order) => (
    <Card key={order.id} className="p-4 space-y-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-lg text-foreground">Table {order.tableId}</h3>
          <p className="text-xs text-muted-foreground mt-1">Order ID: {order.id.substring(0, 8)}</p>
        </div>
        <Badge className={getStatusColor(order.status)}>
          <div className="flex items-center gap-2">
            {getStatusIcon(order.status)}
            <span className="capitalize">{order.status}</span>
          </div>
        </Badge>
      </div>

      <div className="bg-card/50 rounded p-3 space-y-2">
        <p className="text-sm font-semibold text-foreground">Items:</p>
        {order.items.map((item, idx) => (
          <div key={idx} className="text-sm space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>
                {item.quantity}x {item.name}
              </span>
              <span className="text-foreground font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
            {item.addOns && item.addOns.length > 0 && (
              <div className="ml-4 text-xs space-y-1 text-muted-foreground border-l-2 border-primary/30 pl-2">
                <div className="font-medium text-foreground">Base: ₹{(item.basePrice).toFixed(2)}</div>
                {item.addOns.map((addon) => (
                  <div key={addon.id} className="text-muted-foreground">
                    + {addon.name}: ₹{addon.price.toFixed(2)}
                  </div>
                ))}
                {item.addOnsTotal && <div className="font-medium text-foreground">Add-ons Total: ₹{item.addOnsTotal.toFixed(2)}</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-sm flex justify-between py-2 border-t">
        <span className="text-muted-foreground">Total Amount:</span>
        <span className="font-bold text-primary">₹{order.totalAmount.toFixed(2)}</span>
      </div>

      <div className="space-y-2 py-2 border-t">
        <div className="text-xs flex justify-between text-muted-foreground">
          <span>Payment ({order.paymentMethod}): </span>
          <span className={order.paymentStatus === 'paid' ? 'text-green-600 font-semibold' : 'text-yellow-600 font-semibold'}>
            {order.paymentStatus === 'paid' ? '✓ Received' : '⏳ Pending'}
          </span>
        </div>
        {order.paymentStatus === 'pending' && (
          <Button
            onClick={() => handleMarkPaymentReceived(order.id)}
            disabled={loading}
            size="sm"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {order.paymentMethod === 'counter' ? 'Confirm Counter Payment' : 'Mark Payment Received'}
          </Button>
        )}
      </div>

      {order.notes && (
        <div className="text-sm p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-900">
          <p className="font-semibold mb-1">Notes:</p>
          <p>{order.notes}</p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {order.status === 'pending' && (
          <>
            <Button
              onClick={() => handleStatusUpdate(order.id, 'confirmed')}
              disabled={loading}
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirm
            </Button>
            <Button
              onClick={() => handleCancelOrder(order.id)}
              disabled={loading}
              size="sm"
              variant="destructive"
              className="flex-1"
            >
              Cancel
            </Button>
          </>
        )}

        {(order.status === 'confirmed' || order.status === 'preparing') && (
          <Button
            onClick={() => handleStatusUpdate(order.id, order.status === 'confirmed' ? 'preparing' : 'ready')}
            disabled={loading}
            size="sm"
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            {order.status === 'confirmed' ? 'Start Preparing' : 'Mark Ready'}
          </Button>
        )}

        {order.status === 'ready' && (
          <Button
            onClick={() => handleStatusUpdate(order.id, 'served')}
            disabled={loading}
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            Mark Served
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-6 w-6 text-yellow-600" />
            New Orders ({pendingOrders.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingOrders.map(renderOrderCard)}
          </div>
        </div>
      )}

      {/* Preparing Orders */}
      {preparingOrders.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Utensils className="h-6 w-6 text-orange-600" />
            Being Prepared ({preparingOrders.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {preparingOrders.map(renderOrderCard)}
          </div>
        </div>
      )}

      {/* Ready Orders */}
      {readyOrders.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Ready for Pickup ({readyOrders.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {readyOrders.map(renderOrderCard)}
          </div>
        </div>
      )}

      {/* Served Orders with Pending Payment */}
      {servedOrders.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            Served - Payment Pending ({servedOrders.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servedOrders.map(renderOrderCard)}
          </div>
        </div>
      )}

      {localOrders.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-lg">No orders yet</p>
          <p className="text-sm text-muted-foreground mt-2">New orders will appear here</p>
        </Card>
      )}
    </div>
  );
};
