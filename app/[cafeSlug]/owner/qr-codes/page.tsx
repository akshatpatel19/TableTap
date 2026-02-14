'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getCafeBySlug, Cafe } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, ChevronLeft, QrCode, Clock } from 'lucide-react';
import Link from 'next/link';

export default function QRCodesPage() {
  const params = useParams();
  const router = useRouter();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

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
      } catch (error) {
        console.error('[v0] Error loading cafe:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [cafeSlug, router]);

  const generateQRLink = (tableNumber: number) => {
    return `https://table-tap-three.vercel.app/${cafeSlug}/menu?table=${tableNumber}`;
  };

  const downloadQR = async (tableNumber: number) => {
    const link = generateQRLink(tableNumber);
    
    try {
      const canvas = document.getElementById(`qr-${tableNumber}`) as HTMLCanvasElement;
      if (canvas) {
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `table-${tableNumber}-qr.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('[v0] Error downloading QR:', error);
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
          <h1 className="text-2xl font-bold text-foreground">Table QR Codes</h1>
          <p className="text-sm text-muted-foreground">Generate and download QR codes for each table</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Pending Upgrades Info */}
        {cafe.tableUpgradePayments && cafe.tableUpgradePayments.some((p) => p.status === 'pending') && (
          <Card className="p-6 mb-8 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-2">Pending Table Upgrades</h3>
                <p className="text-sm text-amber-800 mb-3">
                  You have pending table upgrade requests. Once approved by admin, new QR codes will appear below:
                </p>
                <div className="space-y-2">
                  {cafe.tableUpgradePayments
                    .filter((p) => p.status === 'pending')
                    .map((payment) => (
                      <div key={payment.id} className="text-sm text-amber-800 bg-white/50 rounded p-2">
                        <span className="font-semibold">{payment.oldTableCount} → {payment.newTableCount} tables</span> ({payment.tablesAdded} new) - Amount: ₹{payment.amount}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: cafe.tables }).map((_, index) => {
            const tableNumber = index + 1;
            const qrLink = generateQRLink(tableNumber);

            return (
              <Card key={tableNumber} className="p-6 flex flex-col items-center justify-center">
                <QrCode className="h-16 w-16 text-primary mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Table {tableNumber}</h3>
                <p className="text-xs text-muted-foreground text-center mb-4 break-all">{qrLink}</p>

                {/* QR Code Canvas - Hidden */}
                <canvas
                  id={`qr-${tableNumber}`}
                  ref={(canvas) => {
                    if (canvas && !canvas.dataset.generated) {
                      import('qrcode').then((QRCode) => {
                        QRCode.default.toCanvas(canvas, qrLink, { width: 200 }, (error: any) => {
                          if (error) {
                            console.error('[v0] QR Error:', error);
                          } else {
                            canvas.dataset.generated = 'true';
                          }
                        });
                      });
                    }
                  }}
                  className="mb-4 border border-input rounded-lg"
                />

                <Button
                  onClick={() => downloadQR(tableNumber)}
                  className="w-full flex items-center gap-2 justify-center bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Download className="h-4 w-4" />
                  Download QR
                </Button>

                <Button
                  onClick={() => setSelectedTable(tableNumber)}
                  variant="outline"
                  className="w-full mt-2"
                >
                  Copy Link
                </Button>

                {selectedTable === tableNumber && (
                  <div className="mt-4 w-full">
                    <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
                      <p className="text-xs text-green-700">Link copied to clipboard!</p>
                      <input
                        type="text"
                        value={qrLink}
                        readOnly
                        className="w-full mt-2 px-2 py-1 text-xs border border-input rounded bg-background"
                        onClick={(e) => {
                          e.currentTarget.select();
                          navigator.clipboard.writeText(qrLink);
                        }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Info Section */}
        <Card className="p-6 mt-12 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How to use QR codes</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>1. Generate QR codes for each table (one per table)</li>
            <li>2. Download the QR code images</li>
            <li>3. Print and laminate the QR codes</li>
            <li>4. Place one QR code on each table</li>
            <li>5. Customers scan to view the menu and place orders</li>
            <li>6. Each link opens the menu for that specific table</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
