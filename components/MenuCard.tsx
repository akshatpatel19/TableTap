'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOrder, SelectedAddOn } from '@/lib/context/OrderContext';
import { MenuItem, Discount, AddOn } from '@/lib/db';
import { Tag, Plus, Minus, X } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  discounts?: Discount[];
}

export const MenuCard: React.FC<MenuCardProps> = ({ item, discounts = [] }) => {
  const { addToCart, cart, updateCartItemQuantity } = useOrder();
  const [isAdding, setIsAdding] = useState(false);
  const [showAddOnsModal, setShowAddOnsModal] = useState(false);
  const [selectedAddOns, setSelectedAddOns] = useState<SelectedAddOn[]>([]);

  // Get available add-ons
  const availableAddOns = item.addOns?.filter(a => a.isAvailable !== false) || [];

  // Get quantity of this item in cart
  const cartItem = cart.find(c => c.menuItemId === item.id);
  const quantityInCart = cartItem?.quantity || 0;

  const handleAddToCartNew = () => {
    // If item has add-ons, show the modal
    if (availableAddOns.length > 0) {
      setShowAddOnsModal(true);
      return;
    }

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

  const toggleAddOn = (addOn: AddOn) => {
    setSelectedAddOns((prev) => {
      const exists = prev.find((a) => a.id === addOn.id);
      if (exists) {
        return prev.filter((a) => a.id !== addOn.id);
      }
      return [...prev, { id: addOn.id, name: addOn.name, price: addOn.price }];
    });
  };

  const calculateAddOnsTotal = () => {
    return selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);
  };

  const handleAddToCartWithAddOns = () => {
    setIsAdding(true);
    const addOnsPrice = calculateAddOnsTotal();
    addToCart({
      menuItemId: item.id,
      name: item.name,
      price: discountedPrice + addOnsPrice,
      quantity: 1,
      description: item.description,
      selectedAddOns: selectedAddOns.length > 0 ? selectedAddOns : undefined,
    });
    setSelectedAddOns([]);
    setShowAddOnsModal(false);
    setTimeout(() => setIsAdding(false), 300);
  };

  const handleIncrement = () => {
    updateCartItemQuantity(item.id, quantityInCart + 1);
  };

  const handleDecrement = () => {
    if (quantityInCart > 0) {
      updateCartItemQuantity(item.id, quantityInCart - 1);
    }
  };

  // Calculate discounted price
  const { discountedPrice, discount, discountPercentage } = useMemo(() => {
    let finalPrice = item.price;
    let applicableDiscount: Discount | null;
    let percentage = 0;

    // Check for applicable discounts
    const itemDiscount = discounts.find((d) => d.type === 'item' && d.applicableTo === item.id);
    const categoryDiscount = discounts.find((d) => d.type === 'category' && d.applicableTo === item.category);
    const menuDiscount = discounts.find((d) => d.type === 'menu');

    // Priority: item discount > category discount > menu discount
    applicableDiscount = itemDiscount || categoryDiscount || menuDiscount || null;

    if (applicableDiscount) {
      if (applicableDiscount.discountType === 'percentage') {
        percentage = applicableDiscount.discountValue;
        finalPrice = item.price - (item.price * applicableDiscount.discountValue) / 100;
      } else if (applicableDiscount.discountType === 'fixed') {
        finalPrice = Math.max(0, item.price - applicableDiscount.discountValue);
        percentage = Math.round(((item.price - finalPrice) / item.price) * 100);
      } else if (applicableDiscount.discountType === 'bogo') {
        // For BOGO: 50% off on this item (buy 1 get 1, so effectively 50% each)
        percentage = 50;
        finalPrice = item.price / 2;
      }
    }

    return {
      discountedPrice: Math.round(finalPrice * 100) / 100,
      discount: applicableDiscount,
      discountPercentage: percentage,
    };
  }, [item, discounts]);



  // Add-ons Modal
  if (showAddOnsModal && availableAddOns.length > 0) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center md:p-4 p-0">
          <Card className="w-full md:max-w-md p-6 rounded-b-none md:rounded-lg max-h-96 overflow-y-auto">
            <h3 className="text-xl font-semibold text-foreground mb-2">Add-ons for {item.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">Select add-ons you want with this item</p>

            <div className="space-y-3 mb-6">
              {availableAddOns.map((addOn) => (
                <div
                  key={addOn.id}
                  onClick={() => toggleAddOn(addOn)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedAddOns.find((a) => a.id === addOn.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-input hover:border-primary'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${selectedAddOns.find((a) => a.id === addOn.id)
                          ? 'bg-primary border-primary'
                          : 'border-input'
                          }`}
                      >
                        {selectedAddOns.find((a) => a.id === addOn.id) && (
                          <span className="text-white text-sm">✓</span>
                        )}
                      </div>
                      <span className="font-medium text-foreground">{addOn.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-primary">+₹{addOn.price}</span>
                  </div>
                </div>
              ))}
            </div>

            {selectedAddOns.length > 0 && (
              <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Add-ons Total:</p>
                <p className="text-lg font-bold text-primary">₹{calculateAddOnsTotal()}</p>
              </div>
            )}

            <div className="space-y-2">
              <Button
                onClick={handleAddToCartWithAddOns}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                Add to Cart - ₹{(discountedPrice + calculateAddOnsTotal()).toFixed(2)}
              </Button>
              <Button
                onClick={() => {
                  setShowAddOnsModal(false);
                  setSelectedAddOns([]);
                }}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
        <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col relative" />
      </>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col relative">

      {item.image && (
        <div className="w-full h-40 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
          <img
            src={item.image || "/placeholder.svg"}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 px-4 py-0 flex flex-col justify-center">
        <div className="mb-2">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-foreground line-clamp-2">{item.name}</h3>
            {(!item.foodType || item.foodType === 'vegetarian') && (
              <div className="w-4 h-4 rounded-sm border-2 border-green-600 flex items-center justify-center flex-shrink-0 mt-0.5" title="Vegetarian">
                <div className="w-2 h-2 rounded-full bg-green-600"></div>
              </div>
            )}
            {item.foodType === 'non-vegetarian' && (
              <div className="w-4 h-4 rounded-sm border-2 border-red-600 flex items-center justify-center flex-shrink-0 mt-0.5" title="Non-Vegetarian">
                <div className="w-2 h-2 rounded-full bg-red-600"></div>
              </div>
            )}
            {item.foodType === 'eggitarian' && (
              <div className="w-4 h-4 rounded-sm border-2 border-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5" title="Eggitarian">
                <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-orange-500 mt-[1px]"></div>
              </div>
            )}
          </div>
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
                {discount.discountType === 'bogo' ? 'Buy 1 Get 1' : `Save ${discountPercentage}%`}
              </div>
            )}
          </div>
          {quantityInCart > 0 ? (
            <div className="flex items-center gap-2 bg-foreground text-background rounded-full px-3 py-2">
              <button
                onClick={handleDecrement}
                disabled={!item.isAvailable}
                className="flex items-center justify-center w-6 h-6 hover:opacity-70 transition-opacity disabled:opacity-50"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="font-semibold w-6 text-center">{quantityInCart}</span>
              <button
                onClick={handleIncrement}
                disabled={!item.isAvailable}
                className="flex items-center justify-center w-6 h-6 hover:opacity-70 transition-opacity disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Button
              onClick={handleAddToCartNew}
              disabled={!item.isAvailable || isAdding}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isAdding ? 'Added' : availableAddOns.length > 0 ? 'Options' : 'Add'}
            </Button>
          )}
        </div>
        {!item.isAvailable && (
          <p className="text-xs text-destructive mt-2">Currently unavailable</p>
        )}
      </div>
    </Card>
  );
};
