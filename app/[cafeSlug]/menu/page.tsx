'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getCafeBySlug, getMenuItems, Cafe, MenuItem, getCafeDiscounts, Discount } from '@/lib/db';
import { MenuCard } from '@/components/MenuCard';
import { OrderCart } from '@/components/OrderCart';
import { Loader2 } from 'lucide-react';

export default function MenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cafeSlug = params.cafeSlug as string;
  const tableId = searchParams.get('table') ? parseInt(searchParams.get('table') as string) : 1;

  useEffect(() => {
    const loadCafeAndMenu = async () => {
      try {
        setLoading(true);
        const cafeData = await getCafeBySlug(cafeSlug);

        if (!cafeData) {
          setError('Cafe not found');
          return;
        }

        setCafe(cafeData);
        const items = await getMenuItems(cafeData.id);
        setMenuItems(items);

        // Load active discounts
        const allDiscounts = await getCafeDiscounts(cafeData.id);
        const now = Date.now();
        const activeDiscounts = allDiscounts.filter(
          (d) => d.isActive && d.startDate <= now && d.endDate >= now
        );
        setDiscounts(activeDiscounts);

        if (items.length > 0) {
          const categories = Array.from(new Set(items.map((i) => i.category)));
          if (categories.length > 0) {
            setSelectedCategory(categories[0]);
          }
        }
      } catch (err) {
        console.error('[v0] Error loading cafe:', err);
        setError('Failed to load menu');
      } finally {
        setLoading(false);
      }
    };

    loadCafeAndMenu();
  }, [cafeSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error || !cafe) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive font-semibold mb-2">{error || 'Cafe not found'}</p>
          <p className="text-muted-foreground text-sm">Please check the URL and try again</p>
        </div>
      </div>
    );
  }

  const categories = Array.from(new Set(menuItems.map((i) => i.category)));
  const filteredItems =
    selectedCategory === 'all' ? menuItems : menuItems.filter((i) => i.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-foreground">{cafe.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Table {tableId}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Mobile Cart - Shown at top on mobile */}
        <div className="lg:hidden mb-8">
          <OrderCart cafeSlug={cafeSlug} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Menu Items */}
          <div className="lg:col-span-3">
            {/* Category Filter */}
            {categories.length > 1 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-4">Categories</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-foreground border hover:border-primary'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedCategory === category
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-foreground border hover:border-primary'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Menu Grid */}
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredItems.map((item) => (
                  <MenuCard key={item.id} item={item} discounts={discounts} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No items in this category</p>
              </div>
            )}
          </div>

          {/* Desktop Sidebar Cart */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24">
              <OrderCart cafeSlug={cafeSlug} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
