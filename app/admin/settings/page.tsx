'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminSettings, updateAdminSettings, AdminSettings } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronLeft, Copy, Check } from 'lucide-react';
import { generateQRCode } from '@/lib/upi';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    upiId: '',
    setupFeeAmount: 4999,
    monthlyFeePerTable: 199,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const existingSettings = await getAdminSettings();
        if (existingSettings) {
          setSettings(existingSettings);
          setFormData({
            upiId: existingSettings.upiId,
            setupFeeAmount: existingSettings.setupFeeAmount,
            monthlyFeePerTable: existingSettings.monthlyFeePerTable,
          });
        }
      } catch (error) {
        console.error('[v0] Error loading admin settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateAdminSettings(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('[v0] Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!formData.upiId) return;

    try {
      const qr = await generateQRCode(
        `upi://pay?pa=${formData.upiId}&pn=TableTap&tn=Payment`
      );
      setQrCode(qr);
    } catch (error) {
      console.error('[v0] Error generating QR:', error);
    }
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(formData.upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard">
              <Button size="sm" variant="ghost" className="h-auto p-1">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Payment Settings</h1>
              <p className="text-sm text-muted-foreground">Configure payment information for subscription handling</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {saved && (
          <Card className="p-4 mb-6 bg-green-50 border-green-200">
            <p className="text-green-800 font-semibold">Settings saved successfully!</p>
          </Card>
        )}

        {/* UPI Information */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-bold text-foreground mb-6">UPI Payment Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">UPI ID</label>
              <p className="text-xs text-muted-foreground mb-3">
                This is where cafe owners will send their subscription payments
              </p>
              <input
                type="text"
                placeholder="example@upi"
                value={formData.upiId}
                onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyUPI}
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy UPI ID
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateQR}
                  disabled={!formData.upiId}
                  className="flex-1"
                >
                  Generate QR Code
                </Button>
              </div>
            </div>

            {qrCode && (
              <div className="mt-6 p-4 bg-background border rounded-lg">
                <p className="text-sm font-semibold text-foreground mb-3">QR Code Preview</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="UPI QR Code" className="w-48 h-48" />
              </div>
            )}
          </div>
        </Card>

        {/* Fee Configuration */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-bold text-foreground mb-6">Subscription Fee Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Setup Fee Amount (₹)</label>
              <p className="text-xs text-muted-foreground mb-3">One-time fee charged when cafe owner registers</p>
              <input
                type="number"
                value={formData.setupFeeAmount}
                onChange={(e) => setFormData({ ...formData, setupFeeAmount: parseInt(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Monthly Fee Per Table (₹)</label>
              <p className="text-xs text-muted-foreground mb-3">Recurring monthly charge per table</p>
              <input
                type="number"
                value={formData.monthlyFeePerTable}
                onChange={(e) => setFormData({ ...formData, monthlyFeePerTable: parseInt(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-background border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Example Calculation:</p>
            <p className="text-sm text-foreground">
              A cafe with 5 tables would pay ₹{formData.setupFeeAmount} upfront, then ₹{formData.monthlyFeePerTable * 5} (₹{formData.monthlyFeePerTable} × 5 tables) monthly
            </p>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex gap-3">
          <Button
            onClick={handleSaveSettings}
            disabled={saving || !formData.upiId}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
          <Link href="/admin/dashboard" className="flex-1">
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
