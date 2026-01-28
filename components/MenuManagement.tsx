'use client';

import React, { useState } from 'react';
import { MenuItem, updateMenuItem, deleteMenuItem } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2 } from 'lucide-react';

interface MenuManagementProps {
  items: MenuItem[];
  onUpdate: () => Promise<void>;
}

export const MenuManagement: React.FC<MenuManagementProps> = ({ items, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<MenuItem>>({});
  const [loading, setLoading] = useState(false);

  const handleEditStart = (item: MenuItem) => {
    setEditingId(item.id);
    setEditData(item);
  };

  const handleEditSave = async (id: string) => {
    setLoading(true);
    try {
      await updateMenuItem(id, {
        ...editData,
        updatedAt: Date.now(),
      });
      setEditingId(null);
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
                      onClick={() => setEditingId(null)}
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
