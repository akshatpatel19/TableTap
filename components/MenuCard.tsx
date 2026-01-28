'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOrder } from '@/lib/context/OrderContext';
import { MenuItem } from '@/lib/db';

interface MenuCardProps {
  item: MenuItem;
}

export const MenuCard: React.FC<MenuCardProps> = ({ item }) => {
  const { addToCart } = useOrder();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = () => {
    setIsAdding(true);
    addToCart({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
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
          <span className="text-lg font-bold text-primary">₹{item.price}</span>
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
