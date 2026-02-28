'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getCafeBySlug, getMenuItems, Cafe, MenuItem, getCafeDiscounts, Discount, getAdminSettings } from '@/lib/db';
import { MenuCard } from '@/components/MenuCard';
import { OrderCart } from '@/components/OrderCart';
import { FloatingOrderCart } from '@/components/FloatingOrderCart';
import { Loader2, ShieldAlert, Search } from 'lucide-react';

export default function MenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showVegOnly, setShowVegOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cafeSlug = params.cafeSlug as string;
  const tableId = searchParams.get('table') ? parseInt(searchParams.get('table') as string) : 1;

  useEffect(() => {
    const loadCafeAndMenu = async () => {
      try {
        setLoading(true);
        const globalSettings = await getAdminSettings();
        if (globalSettings?.maintenanceMode) {
          setMaintenance(true);
          setLoading(false);
          return;
        }

        const cafeData = await getCafeBySlug(cafeSlug);

        if (!cafeData) {
          setError('Cafe not found');
          return;
        }

        // Validate table number - must be between 1 and total tables
        if (tableId < 1 || tableId > cafeData.tables) {
          setError(`Invalid table number. This cafe has ${cafeData.tables} table${cafeData.tables !== 1 ? 's' : ''}.`);
          setCafe(cafeData);
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
            setSelectedCategory('all');
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

  if (maintenance) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background border-t-8 border-amber-500">
        <div className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Under Maintenance</h1>
          <p className="text-muted-foreground text-lg">
            We are currently upgrading our systems.
          </p>
          <p className="text-sm text-muted-foreground">
            Ordering is temporarily paused. Please check back in a few minutes.
          </p>
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
  let filteredItems =
    selectedCategory === 'all' ? menuItems : menuItems.filter((i) => i.category === selectedCategory);

  if (showVegOnly) {
    filteredItems = filteredItems.filter((i) => i.foodType === 'vegetarian' || !i.foodType);
  }

  if (searchQuery.trim() !== '') {
    const query = searchQuery.toLowerCase();
    filteredItems = filteredItems.filter((i) =>
      i.name.toLowerCase().includes(query) ||
      (i.description && i.description.toLowerCase().includes(query))
    );
  }

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
        {/* Mobile Floating Cart */}
        <div className="lg:hidden">
          <FloatingOrderCart cafeSlug={cafeSlug} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Menu Items */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="mb-6 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-border rounded-lg bg-card text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow placeholder:text-muted-foreground"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Dietary Preference Filter */}
            <div className="mb-6 flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-foreground">Vegetarian Only</h2>
                <p className="text-xs text-muted-foreground">Show only vegetarian items</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={showVegOnly}
                  onChange={(e) => setShowVegOnly(e.target.checked)}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
            {/* Category Filter */}
            {categories.length > 1 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-4">Categories</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === 'all'
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
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === category
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
