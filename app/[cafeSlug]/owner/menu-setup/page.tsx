'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getCafeBySlug, getMenuItems, createMenuItem, MenuItem, addCategory, getCafeCategories, Cafe } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Plus, ChevronLeft, AlertCircle, X } from 'lucide-react';
import { MenuManagement } from '@/components/MenuManagement';
import SetupFeePaymentModal from '@/components/SetupFeePaymentModal';
import Link from 'next/link';

export default function MenuSetupPage() {
  const params = useParams();
  const router = useRouter();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    isAvailable: true,
  });
  const [addOns, setAddOns] = useState<Array<{ id: string; name: string; price: string }>>([]);
  const [newAddOn, setNewAddOn] = useState({ name: '', price: '' });
  const [showAddOnInput, setShowAddOnInput] = useState(false);

  const cafeSlug = params.cafeSlug as string;
  const isSubscriptionActive = cafe?.setupFeeStatus === 'paid';

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.push('/owner/login');
        return;
      }

      try {
        const cafeData = await getCafeBySlug(cafeSlug);
        if (!cafeData) {
          router.push('/owner/login');
          return;
        }

        setCafe(cafeData);

        // Check subscription status
        if (cafeData.setupFeeStatus !== 'paid') {
          setShowPaymentModal(true);
        }

        const items = await getMenuItems(cafeData.id);
        setMenuItems(items);
        const cats = await getCafeCategories(cafeData.id);
        setCategories(cats.length > 0 ? cats : ['Beverages', 'Food', 'Desserts']);
        if (!formData.category && cats.length > 0) {
          setFormData((prev) => ({ ...prev, category: cats[0] }));
        }
      } catch (error) {
        console.error('[v0] Error loading menu:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [cafeSlug]);

  const handleAddCategory = async () => {
    if (!cafe || !newCategory.trim()) return;

    try {
      const updatedCategories = await addCategory(cafe.id, newCategory);
      setCategories(updatedCategories);
      setNewCategory('');
      setShowAddCategory(false);
    } catch (error) {
      console.error('[v0] Error adding category:', error);
    }
  };

  const handleAddAddOn = () => {
    if (!newAddOn.name.trim() || !newAddOn.price) return;
    
    setAddOns([...addOns, {
      id: Date.now().toString(),
      name: newAddOn.name,
      price: newAddOn.price,
    }]);
    setNewAddOn({ name: '', price: '' });
  };

  const handleRemoveAddOn = (id: string) => {
    setAddOns(addOns.filter(addon => addon.id !== id));
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cafe || !formData.category) return;

    try {
      const menuItem: Omit<MenuItem, 'id'> = {
        cafeId: cafe.id,
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        description: formData.description,
        isAvailable: formData.isAvailable,
        image: '',
        addOns: addOns.length > 0 ? addOns.map(addon => ({
          id: addon.id,
          name: addon.name,
          price: parseFloat(addon.price),
        })) : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await createMenuItem(menuItem);
      const items = await getMenuItems(cafe.id);
      setMenuItems(items);
      setFormData({
        name: '',
        category: categories[0] || '',
        price: '',
        description: '',
        isAvailable: true,
      });
      setAddOns([]);
      setShowAddForm(false);
    } catch (error) {
      console.error('[v0] Error adding menu item:', error);
    }
  };

  const handleRefresh = async () => {
    if (!cafe) return;
    const items = await getMenuItems(cafe.id);
    setMenuItems(items);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cafe) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Failed to load cafe information</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Subscription Payment Modal */}
      {cafe && !isSubscriptionActive && (
        <SetupFeePaymentModal
          open={showPaymentModal}
          cafe={cafe}
          onClose={() => setShowPaymentModal(false)}
          onPaymentRecorded={() => {
            // Refresh cafe data
            window.location.reload();
          }}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/owner/dashboard">
            <Button variant="ghost" size="sm" className="flex items-center gap-2 mb-4">
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Menu Setup</h1>
          <p className="text-sm text-muted-foreground">Add and manage your cafe menu items</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Subscription Status Warning */}
        {!isSubscriptionActive && (
          <Card className="p-6 mb-8 border-l-4 border-l-amber-600 bg-amber-50">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-amber-900 mb-2">Subscription Required</h3>
                <p className="text-sm text-amber-800 mb-3">
                  {cafe?.setupFeeStatus === 'pending'
                    ? 'Your subscription payment is pending verification. Please complete the setup fee payment to start adding menu items.'
                    : 'Please complete your subscription to add and manage menu items.'}
                </p>
                <Button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-amber-600 hover:bg-amber-700"
                  size="sm"
                >
                  Complete Payment
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Categories Section */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Categories</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((cat) => (
              <span key={cat} className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                {cat}
              </span>
            ))}
          </div>
          {!showAddCategory ? (
            <Button onClick={() => setShowAddCategory(true)} variant="outline" size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          ) : (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-1">New Category</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g., Snacks"
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                />
              </div>
              <Button onClick={handleAddCategory} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Save
              </Button>
              <Button
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategory('');
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          )}
        </Card>

        {/* Add Item Form */}
        {!showAddForm ? (
          <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 mb-6">
            <Plus className="h-4 w-4" />
            Add New Item
          </Button>
        ) : (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Add New Menu Item</h3>
            <form onSubmit={handleAddMenuItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                    placeholder="e.g., Espresso"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Availability</label>
                  <select
                    value={formData.isAvailable ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  >
                    <option value="true">Available</option>
                    <option value="false">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  placeholder="Brief description of the item"
                  rows={3}
                />
              </div>

              {/* Add-ons Section */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Add-ons (Optional)</h4>
                
                {addOns.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {addOns.map((addon) => (
                      <div key={addon.id} className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <div>
                          <p className="font-medium text-foreground">{addon.name}</p>
                          <p className="text-sm text-muted-foreground">+₹{addon.price}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAddOn(addon.id)}
                          className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {!showAddOnInput ? (
                  <Button
                    type="button"
                    onClick={() => setShowAddOnInput(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Option
                  </Button>
                ) : (
                  <div className="space-y-2 p-3 border rounded-lg bg-card">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Option Name</label>
                      <input
                        type="text"
                        value={newAddOn.name}
                        onChange={(e) => setNewAddOn({ ...newAddOn, name: e.target.value })}
                        placeholder="e.g., Extra Shot, Large Size"
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newAddOn.price}
                        onChange={(e) => setNewAddOn({ ...newAddOn, price: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleAddAddOn}
                        size="sm"
                        className="bg-primary text-primary-foreground"
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setShowAddOnInput(false);
                          setNewAddOn({ name: '', price: '' });
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-primary text-primary-foreground">
                  Add Item
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setAddOns([]);
                    setShowAddOnInput(false);
                    setNewAddOn({ name: '', price: '' });
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Menu Items List */}
        {menuItems.length > 0 ? (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Your Menu Items</h3>
            <MenuManagement items={menuItems} onUpdate={handleRefresh} />
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No menu items added yet</p>
            <p className="text-sm text-muted-foreground">Start by adding your first menu item above</p>
          </Card>
        )}
      </div>
    </div>
  );
}
