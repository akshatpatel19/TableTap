'use client';

import { useState } from 'react';
import { Cafe } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, QrCode, AlertCircle } from 'lucide-react';
import { generateQRCode, isValidUPIId } from '@/lib/upi';

interface UPISettingsProps {
  cafe: Cafe;
  onUpdate: (upiId: string, upiQrCode: string) => Promise<void>;
}

export default function UPISettings({ cafe, onUpdate }: UPISettingsProps) {
  const [upiId, setUpiId] = useState(cafe.upiId || '');
  const [qrCodeUrl, setQrCodeUrl] = useState(cafe.upiQrCode || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGenerateQRCode = async () => {
    if (!upiId) {
      setError('Please enter a UPI ID first');
      return;
    }

    if (!isValidUPIId(upiId)) {
      setError('Invalid UPI ID format. Example: username@upi or mobile@bankname');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const qrCode = await generateQRCode(
        `upi://pay?pa=${upiId}&pn=${encodeURIComponent(cafe.name)}`
      );
      setQrCodeUrl(qrCode);
    } catch (err) {
      console.error('[v0] Error generating QR code:', err);
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!upiId) {
      setError('Please enter a UPI ID');
      return;
    }

    if (!isValidUPIId(upiId)) {
      setError('Invalid UPI ID format. Example: username@upi or mobile@bankname');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await onUpdate(upiId, qrCodeUrl);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('[v0] Error saving UPI settings:', err);
      setError('Failed to save UPI settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">UPI Payment Settings</h2>
        </div>

        <div className="space-y-4">
          {/* UPI ID Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              UPI ID <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="username@upi or mobilenumber@bankname"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Example: john@paytm, 9876543210@okhdfcbank
            </p>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex gap-2">
            <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              Make sure to use a business UPI ID if available. Customers will scan the QR code or enter this UPI ID to send payments.
            </p>
          </div>

          {/* QR Code Display */}
          {qrCodeUrl && (
            <div className="p-4 bg-background rounded-lg border flex flex-col items-center gap-4">
              <div>
                <img
                  src={qrCodeUrl || "/placeholder.svg"}
                  alt="UPI QR Code"
                  className="w-40 h-40 border rounded-lg"
                />
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">QR Code Preview</p>
                <p className="text-sm font-mono text-foreground">{upiId}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 flex-col sm:flex-row">
            <Button
              onClick={handleGenerateQRCode}
              disabled={loading || !upiId}
              variant="outline"
              className="flex-1 bg-transparent"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate QR Code
                </>
              )}
            </Button>

            <Button
              onClick={handleSave}
              disabled={loading || !upiId}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>

          {/* Messages */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
              ✓ UPI settings saved successfully
            </div>
          )}
        </div>
      </Card>

      {/* Instructions */}
      <Card className="p-6 bg-muted/30">
        <h3 className="font-semibold text-foreground mb-3">How UPI Payments Work</h3>
        <ol className="space-y-2 text-sm text-foreground list-decimal list-inside">
          <li>Customer scans the QR code or enters your UPI ID at checkout</li>
          <li>Payment is initiated in the customer's UPI app</li>
          <li>Customer completes the payment and confirms</li>
          <li>You receive a notification of the payment</li>
          <li>Order goes to your kitchen and you verify the payment manually</li>
        </ol>
      </Card>
    </div>
  );
}
