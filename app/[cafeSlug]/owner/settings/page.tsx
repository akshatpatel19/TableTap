'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getCafeBySlug, Cafe, updateCafe, recordTableDowngrade } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronLeft, Copy } from 'lucide-react';
import UPISettings from '@/components/UPISettings';
import TableUpgradeModal from '@/components/TableUpgradeModal';
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
    gstNumber: '',
  });
  const [savedMessage, setSavedMessage] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [newTableCount, setNewTableCount] = useState(0);
  const [upgradeInputValue, setUpgradeInputValue] = useState('');
  const [downgradeInputValue, setDowngradeInputValue] = useState('');
  const [downgradingMessage, setDowngradingMessage] = useState('');

  const [staffPassword, setStaffPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const cafeSlug = params.cafeSlug as string;

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
        setFormData({
          name: cafeData.name,
          phone: cafeData.phone,
          address: cafeData.address,
          tables: cafeData.tables,
          gstNumber: cafeData.gstNumber || '',
        });
      } catch (error) {
        console.error('[v0] Error loading cafe:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
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

  const handleSetStaffPassword = async () => {
    if (!cafe || !staffPassword) return;
    setIsSettingPassword(true);
    setPasswordMessage('');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();
      const response = await fetch('/api/owner/staff-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cafeId: cafe.id,
          staffPassword
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update password');
      }

      setPasswordMessage('Staff password updated successfully!');
      setStaffPassword('');
      setTimeout(() => setPasswordMessage(''), 3000);
    } catch (error) {
      console.error('[v0] Error setting staff password:', error);
      alert('Failed to update staff password. Please try again.');
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleUpgradeTableClick = () => {
    if (!upgradeInputValue || parseInt(upgradeInputValue) <= cafe?.tables!) {
      alert('Please enter a number greater than current table count');
      return;
    }
    setNewTableCount(parseInt(upgradeInputValue));
    setUpgradeModalOpen(true);
  };

  const handleDowngradeTableClick = async () => {
    if (!downgradeInputValue || parseInt(downgradeInputValue) >= cafe?.tables!) {
      alert('Please enter a number less than current table count');
      return;
    }

    if (!confirm('Are you sure you want to downgrade tables? This will be processed immediately at no cost.')) {
      return;
    }

    try {
      await recordTableDowngrade(cafe!.id, cafe!.tables, parseInt(downgradeInputValue));

      const updatedCafe = await getCafeBySlug(cafeSlug);
      if (updatedCafe) {
        setCafe(updatedCafe);
        setFormData({ ...formData, tables: updatedCafe.tables });
        setDowngradeInputValue('');
        setDowngradingMessage('Tables downgraded successfully!');
        setTimeout(() => setDowngradingMessage(''), 3000);
      }
    } catch (error) {
      console.error('[v0] Error downgrading tables:', error);
      alert('Failed to downgrade tables');
    }
  };

  const handleUpgradeSuccess = async () => {
    try {
      const updatedCafe = await getCafeBySlug(cafeSlug);
      if (updatedCafe) {
        setCafe(updatedCafe);
        setFormData({ ...formData, tables: updatedCafe.tables });
        setUpgradeInputValue('');
      }
    } catch (error) {
      console.error('[v0] Error refreshing cafe data:', error);
    }
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
        {/* Success Messages */}
        {savedMessage && (
          <Card className="p-4 bg-green-50 border border-green-200">
            <p className="text-green-800 text-sm font-medium">Settings saved successfully</p>
          </Card>
        )}

        {downgradingMessage && (
          <Card className="p-4 bg-green-50 border border-green-200">
            <p className="text-green-800 text-sm font-medium">{downgradingMessage}</p>
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
                <p className="text-sm text-muted-foreground mb-1">Cafe Code (For Staff Login)</p>
                <p className="font-medium text-foreground text-lg tracking-wider bg-muted px-2 py-1 rounded inline-block">{cafe.cafeCode || 'Not generated'}</p>
              </div>
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
              <div>
                <p className="text-sm text-muted-foreground mb-1">GST Number</p>
                <p className="font-medium text-foreground">{cafe.gstNumber || 'Not set'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Cafe Code</label>
                <div className="px-3 py-2 border border-input rounded-lg bg-muted text-foreground font-mono">
                  {cafe.cafeCode || 'Not generated'}
                </div>
              </div>

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
                <div className="px-3 py-2 border border-input rounded-lg bg-muted text-foreground">
                  {formData.tables}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Use the Manage Tables section below to modify table count</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">GST Number (Optional)</label>
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                  placeholder="e.g., 18AABCU9603R1Z0"
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">Enter your GST number for billing purposes</p>
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

        {/* Manage Staff Access */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Manage Staff Access</h3>
          <p className="text-sm text-muted-foreground mb-4">Set a password for your staff to log in using your Cafe Code: <strong className="font-mono bg-muted px-1 rounded">{cafe.cafeCode}</strong></p>
          <div className="space-y-4 max-w-sm">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Staff Password</label>
              <input
                type="password"
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                placeholder="Enter new staff password"
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
              />
            </div>
            <Button
              onClick={handleSetStaffPassword}
              disabled={isSettingPassword || !staffPassword}
              className="w-full"
            >
              {isSettingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Update Staff Password
            </Button>
            {passwordMessage && <p className="text-sm text-green-600 mt-2 font-medium">{passwordMessage}</p>}
          </div>
        </Card>

        {/* Manage Tables Section */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Manage Tables</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upgrade */}
            <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div>
                <h4 className="font-semibold text-foreground mb-3">Upgrade Tables</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Increase tables with prorated payment based on remaining subscription days.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Current Tables</label>
                <div className="px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm">
                  {cafe.tables}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">New Table Count</label>
                <input
                  type="number"
                  min={cafe.tables + 1}
                  value={upgradeInputValue}
                  onChange={(e) => setUpgradeInputValue(e.target.value)}
                  placeholder={`Enter number > ${cafe.tables}`}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm"
                />
              </div>

              <Button
                onClick={handleUpgradeTableClick}
                disabled={!upgradeInputValue}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Proceed to Upgrade
              </Button>
            </div>

            {/* Downgrade */}
            <div className="space-y-4 p-4 border border-green-200 rounded-lg bg-green-50">
              <div>
                <h4 className="font-semibold text-foreground mb-3">Downgrade Tables</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Reduce tables at no cost. Changes apply immediately.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Current Tables</label>
                <div className="px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm">
                  {cafe.tables}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">New Table Count</label>
                <input
                  type="number"
                  max={cafe.tables - 1}
                  value={downgradeInputValue}
                  onChange={(e) => setDowngradeInputValue(e.target.value)}
                  placeholder={`Enter number < ${cafe.tables}`}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm"
                />
              </div>

              <Button
                onClick={handleDowngradeTableClick}
                disabled={!downgradeInputValue}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Downgrade Tables
              </Button>
            </div>
          </div>
        </Card>

        {/* UPI Payment Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Payment Settings</h3>
          <UPISettings cafe={cafe} onUpdate={handleUPIUpdate} />
        </Card>
      </div>

      {/* Table Upgrade Modal */}
      {cafe && (
        <TableUpgradeModal
          open={upgradeModalOpen}
          cafe={cafe}
          newTableCount={newTableCount}
          onClose={() => {
            setUpgradeModalOpen(false);
            setUpgradeInputValue('');
          }}
          onPaymentRecorded={handleUpgradeSuccess}
        />
      )}
    </div>
  );
}
