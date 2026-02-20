'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminSettings, updateAdminSettings, AdminSettings } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronLeft, Copy, Check, Save, ShieldAlert } from 'lucide-react';
import { generateQRCode } from '@/lib/upi';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';

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
    maintenanceMode: false,
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
            maintenanceMode: existingSettings.maintenanceMode || false,
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation Layer */}
      <nav className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard">
              <Button size="sm" variant="ghost" className="h-auto p-1.5 hover:bg-primary/10 hover:text-primary transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Platform Settings</h1>
              <p className="text-sm text-muted-foreground">Configure payment and platform maintenance status</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {saved && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-green-800 font-medium">Settings saved successfully!</p>
          </div>
        )}

        {/* Global Platform Controls */}
        <Card className="p-6 mb-8 border-red-500/20 shadow-sm bg-red-500/5 backdrop-blur">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-700">Maintenance Mode</h2>
              <p className="text-sm text-red-600/80">Pause the platform and lock out all cafe owners</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-red-500/20">
            <div>
              <label className="text-sm font-semibold text-foreground">Global Lockdown</label>
              <p className="text-xs text-muted-foreground">If enabled, cafe owners cannot access their dashboard and customer orders are paused.</p>
            </div>
            <Switch
              checked={formData.maintenanceMode}
              onCheckedChange={(checked) => setFormData({ ...formData, maintenanceMode: checked })}
              className="data-[state=checked]:bg-red-600"
            />
          </div>
        </Card>

        {/* UPI Information */}
        <Card className="p-6 mb-8 border-primary/10 hover:border-primary/30 transition-colors shadow-sm bg-card/50 backdrop-blur">
          <h2 className="text-xl font-bold text-foreground mb-6">UPI Payment Information</h2>

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
                className="w-full px-4 py-3 rounded-lg border border-input bg-background/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-3 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyUPI}
                  className="flex-1 hover:bg-primary/5"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-600" />
                      <span className="text-green-600">Copied</span>
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
                  className="flex-1 hover:bg-primary/5"
                >
                  Generate QR Preview
                </Button>
              </div>
            </div>

            {qrCode && (
              <div className="mt-6 p-6 bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 rounded-xl flex flex-col items-center">
                <p className="text-sm font-semibold text-foreground mb-4">Scan to Pay Preview</p>
                <div className="p-4 bg-white rounded-xl shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="UPI QR Code" className="w-48 h-48" />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Fee Configuration */}
        <Card className="p-6 mb-8 border-primary/10 hover:border-primary/30 transition-colors shadow-sm bg-card/50 backdrop-blur">
          <h2 className="text-xl font-bold text-foreground mb-6">Subscription Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Setup Fee (₹)</label>
              <p className="text-xs text-muted-foreground mb-3">One-time registration fee</p>
              <input
                type="number"
                value={formData.setupFeeAmount}
                onChange={(e) => setFormData({ ...formData, setupFeeAmount: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Monthly Fee/Table (₹)</label>
              <p className="text-xs text-muted-foreground mb-3">Recurring charge per table</p>
              <input
                type="number"
                value={formData.monthlyFeePerTable}
                onChange={(e) => setFormData({ ...formData, monthlyFeePerTable: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-lg">
            <p className="text-sm font-medium text-primary mb-1">Example Calculation:</p>
            <p className="text-sm text-foreground">
              A cafe with 5 tables pays ₹{formData.setupFeeAmount} upfront, then ₹{(formData.monthlyFeePerTable * 5).toLocaleString()} (₹{formData.monthlyFeePerTable} × 5) monthly.
            </p>
          </div>
        </Card>

        {/* Save Button Action Bar */}
        <div className="flex gap-4 sticky bottom-6 p-4 bg-card/80 backdrop-blur-md rounded-2xl border shadow-lg">
          <Button
            onClick={handleSaveSettings}
            disabled={saving || !formData.upiId}
            className="flex-2 w-full bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/20 text-primary-foreground font-semibold py-6 text-lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-3" />
                Save Settings
              </>
            )}
          </Button>
          <Link href="/admin/dashboard" className="w-1/3">
            <Button variant="outline" className="w-full py-6 text-lg hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors">
              Cancel
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
