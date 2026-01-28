'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOrder } from '@/lib/context/OrderContext';
import { Trash2, Plus, Minus } from 'lucide-react';
import Link from 'next/link';

interface OrderCartProps {
  cafeSlug: string;
}

export const OrderCart: React.FC<OrderCartProps> = ({ cafeSlug }) => {
  const { cart, removeFromCart, updateCartItemQuantity, getTotalPrice, getTotalItems, tableId, cafeId } =
    useOrder();

  if (cart.length === 0) {
    return (
      <Card className="p-6 text-center border-dashed">
        <p className="text-muted-foreground mb-4">Your cart is empty</p>
        <p className="text-sm text-muted-foreground">Start adding items from the menu above</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-foreground">Order Summary</h2>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {cart.map((item) => (
          <div key={item.menuItemId} className="flex items-center justify-between p-3 bg-card rounded-lg border">
            <div className="flex-1">
              <p className="font-medium text-foreground">{item.name}</p>
              <p className="text-sm text-muted-foreground">₹{item.price} each</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateCartItemQuantity(item.menuItemId, item.quantity - 1)}
                className="h-7 w-7 p-0"
              >
                <Minus className="h-3 w-3" />
              </Button>

              <span className="w-8 text-center font-semibold">{item.quantity}</span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => updateCartItemQuantity(item.menuItemId, item.quantity + 1)}
                className="h-7 w-7 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFromCart(item.menuItemId)}
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-4 border-t">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal:</span>
          <span className="font-semibold">₹{getTotalPrice().toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Items:</span>
          <span className="font-semibold">{getTotalItems()}</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t">
          <span>Total:</span>
          <span className="text-primary">₹{getTotalPrice().toFixed(2)}</span>
        </div>
      </div>

      <Link href={`/${cafeSlug}/checkout?table=${tableId}`} className="block">
        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 h-auto">
          Proceed to Checkout
        </Button>
      </Link>
    </Card>
  );
};
