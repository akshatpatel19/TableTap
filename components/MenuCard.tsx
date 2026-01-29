'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOrder } from '@/lib/context/OrderContext';
import { MenuItem, Discount } from '@/lib/db';
import { Tag } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  discounts?: Discount[];
}

export const MenuCard: React.FC<MenuCardProps> = ({ item, discounts = [] }) => {
  const { addToCart } = useOrder();
  const [isAdding, setIsAdding] = useState(false);

  // Calculate discounted price
  const { discountedPrice, discount, discountPercentage } = useMemo(() => {
    let finalPrice = item.price;
    let applicableDiscount: Discount | null = null;
    let percentage = 0;

    // Check for applicable discounts
    const itemDiscount = discounts.find((d) => d.type === 'item' && d.applicableTo === item.id);
    const categoryDiscount = discounts.find((d) => d.type === 'category' && d.applicableTo === item.category);
    const menuDiscount = discounts.find((d) => d.type === 'menu');

    // Priority: item discount > category discount > menu discount
    applicableDiscount = itemDiscount || categoryDiscount || menuDiscount;

    if (applicableDiscount) {
      if (applicableDiscount.discountType === 'percentage') {
        percentage = applicableDiscount.discountValue;
        finalPrice = item.price - (item.price * applicableDiscount.discountValue) / 100;
      } else if (applicableDiscount.discountType === 'fixed') {
        finalPrice = Math.max(0, item.price - applicableDiscount.discountValue);
        percentage = Math.round(((item.price - finalPrice) / item.price) * 100);
      }
    }

    return {
      discountedPrice: Math.round(finalPrice * 100) / 100,
      discount: applicableDiscount,
      discountPercentage: percentage,
    };
  }, [item, discounts]);

  const handleAddToCart = () => {
    setIsAdding(true);
    addToCart({
      menuItemId: item.id,
      name: item.name,
      price: discountedPrice,
      quantity: 1,
      description: item.description,
    });
    setTimeout(() => setIsAdding(false), 300);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
      {item.image && (
        <div className="w-full h-40 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
          <img
            src={item.image || "/placeholder.svg"}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 p-4 flex flex-col">
        <div className="mb-3">
          <h3 className="font-semibold text-foreground mb-1 line-clamp-2">{item.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
          <p className="text-xs text-muted-foreground mt-1">{item.category}</p>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            {discount ? (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-primary">₹{discountedPrice}</span>
                <span className="text-sm line-through text-muted-foreground">₹{item.price}</span>
              </div>
            ) : (
              <span className="text-lg font-bold text-primary">₹{item.price}</span>
            )}
            {discount && (
              <div className="flex items-center gap-1 mt-1 text-xs text-accent font-semibold">
                <Tag className="h-3 w-3" />
                Save {discountPercentage}%
              </div>
            )}
          </div>
          <Button
            onClick={handleAddToCart}
            disabled={!item.isAvailable || isAdding}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isAdding ? 'Added' : 'Add'}
          </Button>
        </div>
        {!item.isAvailable && (
          <p className="text-xs text-destructive mt-2">Currently unavailable</p>
        )}
      </div>
    </Card>
  );
};
