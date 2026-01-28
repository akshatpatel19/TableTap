'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getCafeBySlug, Cafe, updateCafe } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronLeft, Copy } from 'lucide-react';
import UPISettings from '@/components/UPISettings';
import Link from 'next/link';

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    tables: 0,
  });
  const [savedMessage, setSavedMessage] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const cafeSlug = params.cafeSlug as string;

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          router.push('/owner/login');
          return;
        }

        const cafeData = await getCafeBySlug(cafeSlug);
        if (!cafeData) {
          router.push('/owner/login');
          return;
        }

        setCafe(cafeData);
        setFormData({
          name: cafeData.name,
          phone: cafeData.phone,
          address: cafeData.address,
          tables: cafeData.tables,
        });
      } catch (error) {
        console.error('[v0] Error loading cafe:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [cafeSlug]);

  const handleSaveChanges = async () => {
    if (!cafe) return;

    try {
      await updateCafe(cafe.id, {
        ...formData,
        updatedAt: Date.now(),
      });

      setCafe({
        ...cafe,
        ...formData,
        updatedAt: Date.now(),
      });

      setSavedMessage(true);
      setEditMode(false);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (error) {
      console.error('[v0] Error updating cafe:', error);
    }
  };

  const handleUPIUpdate = async (upiId: string, upiQrCode: string) => {
    if (!cafe) return;

    try {
      await updateCafe(cafe.id, {
        upiId,
        upiQrCode,
        updatedAt: Date.now(),
      });

      setCafe({
        ...cafe,
        upiId,
        upiQrCode,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('[v0] Error updating UPI:', error);
    }
  };

  const menuUrl = `${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'https://tabletap.com'}/${cafe?.slug}/menu`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
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
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/owner/dashboard">
            <Button variant="ghost" size="sm" className="flex items-center gap-2 mb-4">
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Cafe Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your cafe information and payment settings</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Success Message */}
        {savedMessage && (
          <Card className="p-4 bg-green-50 border border-green-200">
            <p className="text-green-800 text-sm font-medium">Settings saved successfully</p>
          </Card>
        )}

        {/* Cafe Information */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Cafe Information</h3>
            {!editMode && (
              <Button onClick={() => setEditMode(true)} variant="outline" size="sm">
                Edit
              </Button>
            )}
          </div>

          {!editMode ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Cafe Name</p>
                <p className="font-medium text-foreground">{cafe.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Phone Number</p>
                <p className="font-medium text-foreground">{cafe.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Address</p>
                <p className="font-medium text-foreground">{cafe.address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Number of Tables</p>
                <p className="font-medium text-foreground">{cafe.tables}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Cafe Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Number of Tables</label>
                <input
                  type="number"
                  min="1"
                  value={formData.tables}
                  onChange={(e) => setFormData({ ...formData, tables: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveChanges} className="bg-primary text-primary-foreground">
                  Save Changes
                </Button>
                <Button onClick={() => setEditMode(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Menu URL */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Customer Menu URL</h3>
          <p className="text-sm text-muted-foreground mb-3">Share this link with customers or display it at your tables</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={menuUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-input rounded-lg bg-muted text-foreground text-sm"
            />
            <Button onClick={copyToClipboard} variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
              <Copy className="h-4 w-4" />
              {copiedUrl ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </Card>

        {/* UPI Payment Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Payment Settings</h3>
          <UPISettings cafe={cafe} onUpdate={handleUPIUpdate} />
        </Card>
      </div>
    </div>
  );
}
