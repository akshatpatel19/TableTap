'use client';

import React, { useState } from 'react';
import { MenuItem, updateMenuItem, deleteMenuItem, AddOn } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, X, Plus } from 'lucide-react';

interface MenuManagementProps {
  items: MenuItem[];
  categories: string[];
  onUpdate: () => Promise<void>;
}

export const MenuManagement: React.FC<MenuManagementProps> = ({ items, categories, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<MenuItem>>({});
  const [editAddOns, setEditAddOns] = useState<Array<AddOn & { isAvailable?: boolean }>>([]);
  const [newAddOn, setNewAddOn] = useState({ name: '', price: '' });
  const [showAddOnInput, setShowAddOnInput] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEditStart = (item: MenuItem) => {
    setEditingId(item.id);
    setEditData(item);
    setEditAddOns(item.addOns || []);
    setShowAddOnInput(false);
    setNewAddOn({ name: '', price: '' });
  };

  const handleAddAddOn = () => {
    if (!newAddOn.name.trim() || !newAddOn.price) return;

    setEditAddOns([...editAddOns, {
      id: Date.now().toString(),
      name: newAddOn.name,
      price: parseFloat(newAddOn.price),
      isAvailable: true,
    }]);
    setNewAddOn({ name: '', price: '' });
  };

  const handleRemoveAddOn = (id: string) => {
    setEditAddOns(editAddOns.filter(addon => addon.id !== id));
  };

  const toggleAddOnAvailability = (id: string) => {
    setEditAddOns(editAddOns.map(addon =>
      addon.id === id ? { ...addon, isAvailable: !addon.isAvailable } : addon
    ));
  };

  const handleEditSave = async (id: string) => {
    setLoading(true);
    try {
      // Keep isAvailable property for add-ons
      const addOnsToSave = editAddOns.map((addon) => ({
        id: addon.id,
        name: addon.name,
        price: addon.price,
        isAvailable: addon.isAvailable ?? true
      }));

      await updateMenuItem(id, {
        ...editData,
        ...(addOnsToSave.length > 0 && { addOns: addOnsToSave }),
        updatedAt: Date.now(),
      });
      setEditingId(null);
      setEditAddOns([]);
      await onUpdate();
    } catch (error) {
      console.error('[v0] Error updating menu item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setLoading(true);
      try {
        await deleteMenuItem(id);
        await onUpdate();
      } catch (error) {
        console.error('[v0] Error deleting menu item:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const groupedByCategory = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, MenuItem[]>
  );

  return (
    <div className="space-y-8">
      {Object.entries(groupedByCategory).map(([category, categoryItems]) => (
        <div key={category}>
          <h3 className="text-lg font-bold text-foreground mb-4 capitalize">{category}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryItems.map((item) =>
              editingId === item.id ? (
                <Card key={item.id} className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Name</label>
                    <input
                      type="text"
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded text-foreground bg-background text-sm"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Price (₹)</label>
                    <input
                      type="number"
                      value={editData.price || 0}
                      onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border rounded text-foreground bg-background text-sm"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
                    <select
                      value={editData.category || ''}
                      onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                      className="w-full px-3 py-2 border rounded text-foreground bg-background text-sm"
                      disabled={loading}
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Food Type</label>
                    <select
                      value={editData.foodType || 'vegetarian'}
                      onChange={(e) => setEditData({ ...editData, foodType: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded text-foreground bg-background text-sm"
                      disabled={loading}
                    >
                      <option value="vegetarian">Vegetarian</option>
                      <option value="non-vegetarian">Non-Vegetarian</option>
                      <option value="eggitarian">Eggitarian</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
                    <textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded text-foreground bg-background text-sm"
                      disabled={loading}
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editData.isAvailable ?? true}
                      onChange={(e) => setEditData({ ...editData, isAvailable: e.target.checked })}
                      disabled={loading}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium text-foreground">Available</label>
                  </div>

                  {/* Add-ons Edit Section */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Add-ons</h4>

                    {editAddOns.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {editAddOns.map((addon) => (
                          <div key={addon.id} className="flex items-center justify-between p-2 bg-primary/10 rounded border border-primary/20">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-foreground">{addon.name}</p>
                              <p className="text-xs text-muted-foreground">₹{addon.price}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={addon.isAvailable ?? true}
                                onChange={() => toggleAddOnAvailability(addon.id)}
                                disabled={loading}
                                className="w-4 h-4"
                                title="Toggle availability"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveAddOn(addon.id)}
                                disabled={loading}
                                className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
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
                        className="flex items-center gap-2 text-xs"
                        disabled={loading}
                      >
                        <Plus className="h-3 w-3" />
                        Add Option
                      </Button>
                    ) : (
                      <div className="space-y-2 p-2 border rounded bg-card">
                        <input
                          type="text"
                          value={newAddOn.name}
                          onChange={(e) => setNewAddOn({ ...newAddOn, name: e.target.value })}
                          placeholder="Option name"
                          className="w-full px-2 py-1 border rounded text-foreground bg-background text-xs"
                          disabled={loading}
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={newAddOn.price}
                          onChange={(e) => setNewAddOn({ ...newAddOn, price: e.target.value })}
                          placeholder="Price"
                          className="w-full px-2 py-1 border rounded text-foreground bg-background text-xs"
                          disabled={loading}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={handleAddAddOn}
                            size="sm"
                            className="flex-1 bg-primary text-primary-foreground text-xs h-8"
                            disabled={loading}
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
                            className="flex-1 text-xs h-8"
                            disabled={loading}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEditSave(item.id)}
                      disabled={loading}
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingId(null);
                        setEditAddOns([]);
                        setShowAddOnInput(false);
                        setNewAddOn({ name: '', price: '' });
                      }}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card key={item.id} className="p-4 flex flex-col justify-between hover:shadow-lg transition-shadow">
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-foreground">{item.name}</h4>
                      <Badge className={item.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    )}
                    {item.addOns && item.addOns.length > 0 && (
                      <div className="mt-3 pt-2 border-t">
                        <p className="text-xs font-semibold text-foreground mb-2">Add-ons:</p>
                        <div className="space-y-1">
                          {item.addOns.map((addon) => (
                            <div key={addon.id} className="text-xs text-muted-foreground">
                              • {addon.name} (+₹{addon.price})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t mb-3">
                    <span className="text-lg font-bold text-primary">₹{item.price}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEditStart(item)}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(item.id)}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              )
            )}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No menu items yet</p>
        </Card>
      )}
    </div>
  );
};
