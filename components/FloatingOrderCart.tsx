'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOrder } from '@/lib/context/OrderContext';
import { Trash2, Plus, Minus, ChevronUp, ChevronDown, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

interface FloatingOrderCartProps {
  cafeSlug: string;
}

export const FloatingOrderCart: React.FC<FloatingOrderCartProps> = ({ cafeSlug }) => {
  const { cart, removeFromCart, updateCartItemQuantity, getTotalPrice, getTotalItems, tableId } =
    useOrder();
  const [isExpanded, setIsExpanded] = useState(false);

  if (cart.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]">
      {/* Floating Button */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 h-auto rounded-full shadow-lg flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <span>{getTotalItems()} items</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">₹{getTotalPrice().toFixed(2)}</span>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronUp className="h-5 w-5" />
          )}
        </div>
      </Button>

      {/* Expanded Panel */}
      {isExpanded && (
        <Card className="mt-3 p-4 space-y-4 shadow-xl border-primary/20">
          <h2 className="text-lg font-bold text-foreground">Order Summary</h2>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.menuItemId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">₹{item.price} each</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateCartItemQuantity(item.menuItemId, item.quantity - 1)}
                    className="h-6 w-6 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>

                  <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateCartItemQuantity(item.menuItemId, item.quantity + 1)}
                    className="h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromCart(item.menuItemId)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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
      )}
    </div>
  );
};
