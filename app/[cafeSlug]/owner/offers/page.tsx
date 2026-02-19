'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCafeBySlug, getCafeDiscounts, createDiscount, deleteDiscount, updateDiscount, Discount, getMenuItems, getCafeCategories, MenuItem } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Edit2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function OffersPage() {
  const params = useParams();
  const cafeSlug = params.cafeSlug as string;

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'menu' as 'menu' | 'category' | 'item' | 'special',
    name: '',
    description: '',
    discountValue: '',
    discountType: 'percentage' as 'percentage' | 'fixed' | 'bogo',
    applicableTo: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const cafeData = await getCafeBySlug(cafeSlug);
        if (!cafeData) return;

        const discountsData = await getCafeDiscounts(cafeData.id);
        setDiscounts(discountsData.sort((a, b) => b.createdAt - a.createdAt));

        const itemsData = await getMenuItems(cafeData.id);
        setMenuItems(itemsData);

        const catsData = await getCafeCategories(cafeData.id);
        setCategories(catsData);
      } catch (error) {
        console.error('[v0] Error loading offers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [cafeSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cafe = await getCafeBySlug(cafeSlug);
      if (!cafe) return;

      const discountData: Omit<Discount, 'id'> = {
        cafeId: cafe.id,
        type: formData.type,
        name: formData.name,
        description: formData.description || '',
        discountValue: parseFloat(formData.discountValue),
        discountType: formData.discountType,
        applicableTo: formData.type === 'menu' ? '' : formData.applicableTo,
        startDate: new Date(formData.startDate).getTime(),
        endDate: new Date(formData.endDate).getTime(),
        isActive: true,
        createdAt: editingId ? discounts.find(d => d.id === editingId)?.createdAt || Date.now() : Date.now(),
        updatedAt: Date.now(),
      };

      if (editingId) {
        await updateDiscount(editingId, discountData);
        setDiscounts(discounts.map(d => d.id === editingId ? { ...d, ...discountData } : d));
      } else {
        const newDiscount = await createDiscount(discountData);
        setDiscounts([newDiscount, ...discounts]);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        type: 'menu',
        name: '',
        description: '',
        discountValue: '',
        discountType: 'percentage',
        applicableTo: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('[v0] Error saving discount:', error);
    }
  };

  const handleEdit = (discount: Discount) => {
    setEditingId(discount.id);
    setFormData({
      type: discount.type,
      name: discount.name,
      description: discount.description || '',
      discountValue: discount.discountValue.toString(),
      discountType: discount.discountType,
      applicableTo: discount.applicableTo || '',
      startDate: new Date(discount.startDate).toISOString().split('T')[0],
      endDate: new Date(discount.endDate).toISOString().split('T')[0],
    });
    setShowForm(true);
  };

  const handleDelete = async (discountId: string) => {
    try {
      await deleteDiscount(discountId);
      setDiscounts(discounts.filter(d => d.id !== discountId));
    } catch (error) {
      console.error('[v0] Error deleting discount:', error);
    }
  };

  const getApplicableToLabel = (discount: Discount) => {
    if (discount.type === 'menu') return 'Whole Menu';
    if (discount.type === 'category') return `Category: ${discount.applicableTo}`;
    if (discount.type === 'item') {
      const item = menuItems.find((i: any) => i.id === discount.applicableTo);
      return item ? `Item: ${item.name}` : 'Item (Deleted)';
    }
    return 'Special Offer';
  };

  const getDiscountLabel = (discount: Discount) => {
    if (discount.discountType === 'percentage') return `${discount.discountValue}% OFF`;
    if (discount.discountType === 'fixed') return `₹${discount.discountValue} OFF`;
    return 'Buy 1 Get 1';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-card border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/owner/dashboard">
            <Button variant="ghost" size="sm" className="flex items-center gap-2 mb-4">
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Offers & Discounts</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage discounts</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 mb-6">
            <Plus className="h-4 w-4" />
            Create New Offer
          </Button>
        ) : (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">{editingId ? 'Edit Offer' : 'Create New Offer'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Offer Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Summer Sale"
                    required
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Offer Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any, applicableTo: '' })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  >
                    <option value="menu">Whole Menu</option>
                    <option value="category">Category</option>
                    <option value="item">Single Item</option>
                    {/* <option value="special">Special (Buy 1 Get 1)</option> */}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add details about this offer"
                  rows={2}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Discount Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                    disabled={formData.type === 'special'}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground disabled:opacity-50"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Discount Value</label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    placeholder={formData.discountType === 'percentage' ? '10' : '50'}
                    required
                    disabled={formData.type === 'special'}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground disabled:opacity-50"
                  />
                </div>
              </div>

              {formData.type === 'category' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Select Category</label>
                  <select
                    value={formData.applicableTo}
                    onChange={(e) => setFormData({ ...formData, applicableTo: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  >
                    <option value="">Choose a category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.type === 'item' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Select Item</label>
                  <select
                    value={formData.applicableTo}
                    onChange={(e) => setFormData({ ...formData, applicableTo: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  >
                    <option value="">Choose an item</option>
                    {menuItems.map((item: any) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
                  {editingId ? 'Update Offer' : 'Create Offer'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({
                      type: 'menu',
                      name: '',
                      description: '',
                      discountValue: '',
                      discountType: 'percentage',
                      applicableTo: '',
                      startDate: new Date().toISOString().split('T')[0],
                      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {discounts.length > 0 ? (
          <div className="grid gap-4">
            {discounts.map((discount) => (
              <Card key={discount.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-foreground">{discount.name}</h4>
                      <Badge className="bg-primary/10 text-primary">{getDiscountLabel(discount)}</Badge>
                      <Badge variant="outline">{getApplicableToLabel(discount)}</Badge>
                      {new Date().getTime() > discount.endDate && (
                        <Badge className="bg-red-100 text-red-800">Expired</Badge>
                      )}
                    </div>
                    {discount.description && (
                      <p className="text-sm text-muted-foreground mb-1">{discount.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(discount.startDate).toLocaleDateString()} - {new Date(discount.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(discount)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(discount.id)}
                      variant="destructive"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No offers yet. Create one to attract customers!</p>
          </Card>
        )}
      </div>
    </div>
  );
}
