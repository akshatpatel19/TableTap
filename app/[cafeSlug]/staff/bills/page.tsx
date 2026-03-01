'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCafeBySlug, getOrders, Order, Cafe, getAdminSettings, isPaymentOverdue } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronLeft, Printer, Download, ShieldAlert, X, LogOut } from 'lucide-react';
import Link from 'next/link';

interface BillItem {
    orderId: string;
    orderNumber: string;
    items: any[];
    totalAmount: number;
    createdAt: number;
    customerName?: string;
    tableNumber: string;
}

interface CombinedBill {
    billNumber: string;
    orders: BillItem[];
    totalAmount: number;
    billDate: number;
    itemCount: number;
}

export default function StaffBillsPage() {
    const params = useParams();
    const router = useRouter();
    const cafeSlug = params.cafeSlug as string;

    const [cafe, setCafe] = useState<Cafe | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [generatedBill, setGeneratedBill] = useState<CombinedBill | null>(null);
    const [adminSettings, setAdminSettings] = useState<any>(null);
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const cafeData = await getCafeBySlug(cafeSlug);
                if (!cafeData) {
                    router.push('/owner/login');
                    return;
                }

                setCafe(cafeData);

                const settings = await getAdminSettings();
                setAdminSettings(settings);

                if (cafeData.setupFeeStatus === 'paid') {
                    const overdue = await isPaymentOverdue(cafeData.id);
                    setIsOverdue(overdue);
                } else if (cafeData.setupFeeStatus === 'pending' || cafeData.setupFeeStatus === 'rejected') {
                    setIsOverdue(true);
                }

                const ordersData = await getOrders(cafeData.id);
                const sortedOrders = ordersData.sort((a, b) => b.createdAt - a.createdAt);
                setOrders(sortedOrders);
            } catch (error) {
                console.error('Error loading bills page:', error);
                router.push('/owner/login');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [cafeSlug, router]);

    const handleSelectOrder = (orderId: string) => {
        const newSelected = new Set(selectedOrders);
        if (newSelected.has(orderId)) {
            newSelected.delete(orderId);
        } else {
            newSelected.add(orderId);
        }
        setSelectedOrders(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedOrders.size === orders.length) {
            setSelectedOrders(new Set());
        } else {
            setSelectedOrders(new Set(orders.map(o => o.id)));
        }
    };

    const generateBill = () => {
        if (selectedOrders.size === 0) return;

        const selectedOrdersData = orders.filter(order => selectedOrders.has(order.id));
        const billItems: BillItem[] = selectedOrdersData.map(order => ({
            orderId: order.id,
            orderNumber: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
            items: order.items || [],
            totalAmount: order.totalAmount,
            createdAt: order.createdAt,
            tableNumber: String(order.tableId),
        }));

        const totalAmount = billItems.reduce((sum, item) => sum + item.totalAmount, 0);
        const itemCount = billItems.reduce((sum, item) => sum + (item.items?.length || 0), 0);

        const bill: CombinedBill = {
            billNumber: `BILL-${Date.now()}`,
            orders: billItems,
            totalAmount,
            billDate: Date.now(),
            itemCount,
        };

        setGeneratedBill(bill);
    };

    const handlePrint = () => {
        if (!generatedBill) return;

        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            const billHTML = `
        <html>
          <head>
            <title>${generatedBill.billNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
              .bill-header { text-align: center; margin-bottom: 30px; }
              .cafe-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
              .cafe-details { font-size: 12px; color: #666; }
              .bill-info { display: flex; justify-content: space-between; margin: 20px 0; padding: 10px 0; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; }
              .bill-info-item { flex: 1; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              td { font-size: 12px; }
              .amount-cell { text-align: right; }
              .total-section { margin-top: 20px; border-top: 2px solid #ddd; padding-top: 10px; }
              .total-row { display: flex; justify-content: flex-end; font-size: 16px; font-weight: bold; gap: 50px; }
              .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
              @media print {
                body { margin: 0; padding: 10mm; }
              }
            </style>
          </head>
          <body>
            <div class="bill-header">
              <div class="cafe-name">${cafe?.name}</div>
              <div class="cafe-details">${cafe?.address}</div>
              <div class="cafe-details">Ph: ${cafe?.phone}</div>
              ${cafe?.gstNumber ? `<div class="cafe-details" style="margin-top: 5px;">GST: ${cafe.gstNumber}</div>` : ''}
            </div>
            
            <div class="bill-info">
              <div class="bill-info-item">
                <strong>Bill No:</strong> ${generatedBill.billNumber}
              </div>
              <div class="bill-info-item">
                <strong>Date:</strong> ${new Date(generatedBill.billDate).toLocaleDateString()}
              </div>
              <div class="bill-info-item">
                <strong>Time:</strong> ${new Date(generatedBill.billDate).toLocaleTimeString()}
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th style="text-align: center; width: 60px;">Qty</th>
                  <th class="amount-cell" style="width: 100px;">Price</th>
                  <th class="amount-cell" style="width: 100px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${generatedBill.orders.map((order: any) =>
                (order.items || []).map((item: any) => {
                    const qty = item.quantity || 1;
                    const amount = (item.price || 0) * qty;
                    const addOnsTotal = item.addOnsTotal || 0;
                    const basePrice = item.basePrice || item.price;

                    return `
                    <tr>
                      <td>
                        <div>${item.name}</div>
                        ${item.addOns && item.addOns.length > 0 ? `
                          <div style="font-size: 11px; color: #666; margin-top: 4px; padding-left: 10px; border-left: 2px solid #ddd;">
                            ${item.addOns.map((addon: any) => `
                              <div>+ ${addon.name} (₹${addon.price})</div>
                            `).join('')}
                          </div>
                        ` : ''}
                      </td>
                      <td style="text-align: center;">${qty}</td>
                      <td class="amount-cell">
                        ${item.addOns && item.addOns.length > 0 ? `
                          <div style="font-size: 11px;">
                            <div>Base: ₹${basePrice.toFixed(2)}</div>
                            <div>Add-ons: ₹${addOnsTotal.toFixed(2)}</div>
                          </div>
                        ` : `
                          ₹${(item.price || 0).toFixed(2)}
                        `}
                      </td>
                      <td class="amount-cell">₹${amount.toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')
            ).join('')}
              </tbody>
            </table>
            
            <div class="total-section">
              <div class="total-row">
                <span>TOTAL:</span>
                <span style="color: #000;">₹${generatedBill.totalAmount.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>Thank you for your business!</p>
            </div>
          </body>
        </html>
      `;

            printWindow.document.write(billHTML);
            printWindow.document.close();

            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    const handleDownloadPDF = () => {
        if (!generatedBill) return;
        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write(`
        <html>
          <head>
            <title>${generatedBill.billNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .bill-header { text-align: center; margin-bottom: 20px; }
              .cafe-name { font-size: 24px; font-weight: bold; }
              .bill-details { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .total-row { font-weight: bold; font-size: 18px; }
              .footer { text-align: center; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="bill-header">
              <div class="cafe-name">${cafe?.name}</div>
              <div>${cafe?.address}</div>
              ${cafe?.gstNumber ? `<div style="margin-top: 8px; font-size: 12px;">GST: ${cafe.gstNumber}</div>` : ''}
            </div>
            <div class="bill-details">
              <p><strong>Bill No:</strong> ${generatedBill.billNumber}</p>
              <p><strong>Date:</strong> ${new Date(generatedBill.billDate).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(generatedBill.billDate).toLocaleTimeString()}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Items</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${generatedBill.orders.map(order => `
                  <tr>
                    <td>${order.orderNumber}</td>
                    <td>${order.items.map((item: any) => item.name).join(', ')}</td>
                    <td>₹${order.totalAmount.toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="2">TOTAL</td>
                  <td>₹${generatedBill.totalAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <div class="footer">
              <p>Thank you for your business!</p>
            </div>
          </body>
        </html>
      `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        );
    }

    const handleLogout = () => {
        localStorage.removeItem(`current_cafe_id`);
        router.replace('/owner/login');
    };

    if (!cafe) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-destructive">Failed to load cafe information</p>
            </div>
        );
    }

    if (adminSettings?.maintenanceMode) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background border-t-8 border-amber-500">
                <div className="max-w-md w-full p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert className="h-10 w-10 text-amber-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">System Maintenance</h1>
                    <p className="text-muted-foreground text-lg">
                        The platform is currently undergoing scheduled maintenance. Dashboard access is temporarily paused.
                    </p>
                    <Button onClick={handleLogout} variant="outline" className="w-full mt-4">
                        <LogOut className="h-4 w-4 mr-2" />
                        Log out
                    </Button>
                </div>
            </div>
        );
    }

    if (!cafe.isActive) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background border-t-8 border-red-600">
                <div className="max-w-md w-full p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="h-10 w-10 text-red-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">Account Suspended</h1>
                    <p className="text-muted-foreground text-lg">
                        This cafe account has been blocked by the administration.
                    </p>
                    <Button onClick={handleLogout} variant="outline" className="w-full mt-4">
                        <LogOut className="h-4 w-4 mr-2" />
                        Log out
                    </Button>
                </div>
            </div>
        );
    }

    if (isOverdue) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background border-t-8 border-red-600">
                <div className="max-w-md w-full p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert className="h-10 w-10 text-red-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">Payment Overdue</h1>
                    <p className="text-muted-foreground text-lg">
                        Dashboard access is temporarily restricted due to overdue cafe payments. Please contact the cafe owner.
                    </p>
                    <Button onClick={handleLogout} variant="outline" className="w-full mt-4">
                        <LogOut className="h-4 w-4 mr-2" />
                        Log out
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-card border-b shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={`/${cafeSlug}/staff/dashboard`}>
                            <Button size="sm" variant="ghost" className="gap-2">
                                <ChevronLeft className="h-4 w-4" />
                                Staff Dashboard
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold text-foreground">Bills & Invoices</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                {!generatedBill ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Orders Selection */}
                        <div className="lg:col-span-2">
                            <Card className="p-6">
                                <h2 className="text-lg font-semibold text-foreground mb-4">Select Orders</h2>

                                {orders.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">No orders available</p>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                                            <input
                                                type="checkbox"
                                                checked={selectedOrders.size === orders.length && orders.length > 0}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4"
                                            />
                                            <label className="font-medium text-foreground cursor-pointer">
                                                Select All ({selectedOrders.size}/{orders.length})
                                            </label>
                                        </div>

                                        <div className="space-y-3 max-h-96 overflow-y-auto">
                                            {orders.map(order => (
                                                <div
                                                    key={order.id}
                                                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                                    onClick={() => handleSelectOrder(order.id)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedOrders.has(order.id)}
                                                        onChange={() => { }}
                                                        className="w-4 h-4"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-medium text-foreground">Order {order.id.slice(0, 8)}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {order.items?.length || 0} items • ₹{order.totalAmount.toFixed(2)}
                                                        </p>
                                                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                                            <span>Table {order.tableId || 'N/A'}</span>
                                                            <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
                                                            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </Card>
                        </div>

                        {/* Summary */}
                        <div>
                            <Card className="p-6 sticky top-20">
                                <h3 className="font-semibold text-foreground mb-4">Bill Summary</h3>
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Selected Orders:</span>
                                        <span className="font-medium text-foreground">{selectedOrders.size}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Items:</span>
                                        <span className="font-medium text-foreground">
                                            {orders
                                                .filter(o => selectedOrders.has(o.id))
                                                .reduce((sum, o) => sum + (o.items?.length || 0), 0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold border-t pt-3">
                                        <span className="text-foreground">Total Amount:</span>
                                        <span className="text-primary">
                                            ₹{orders
                                                .filter(o => selectedOrders.has(o.id))
                                                .reduce((sum, o) => sum + o.totalAmount, 0)
                                                .toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    onClick={generateBill}
                                    disabled={selectedOrders.size === 0}
                                    className="w-full bg-primary hover:bg-primary/90"
                                >
                                    Generate Bill
                                </Button>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto">
                        {/* Bill Preview */}
                        <Card className="p-8 mb-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-foreground">{cafe?.name}</h2>
                                <p className="text-muted-foreground">{cafe?.address}</p>
                                <p className="text-muted-foreground">{cafe?.phone}</p>
                            </div>

                            <div className="border-t border-b py-4 mb-6">
                                <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                                    <div>
                                        <p className="text-muted-foreground">Bill Number</p>
                                        <p className="font-semibold text-foreground">{generatedBill.billNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Date</p>
                                        <p className="font-semibold text-foreground">
                                            {new Date(generatedBill.billDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-muted-foreground">Time</p>
                                        <p className="font-semibold text-foreground">
                                            {new Date(generatedBill.billDate).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 font-semibold">Item Name</th>
                                            <th className="text-center py-2 font-semibold">Qty</th>
                                            <th className="text-right py-2 font-semibold">Price</th>
                                            <th className="text-right py-2 font-semibold">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {generatedBill.orders.map((order, orderIdx) => (
                                            <React.Fragment key={orderIdx}>
                                                {order.items?.map((item: any, itemIdx: number) => {
                                                    const quantity = item.quantity || 1;
                                                    const itemTotal = (item.price || 0) * quantity;
                                                    return (
                                                        <tr key={`${orderIdx}-${itemIdx}`} className="border-b">
                                                            <td className="py-2 text-foreground">{item.name}</td>
                                                            <td className="py-2 text-center text-foreground">{quantity}</td>
                                                            <td className="py-2 text-right text-foreground">₹{(item.price || 0).toFixed(2)}</td>
                                                            <td className="py-2 text-right text-foreground">₹{itemTotal.toFixed(2)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="border-t pt-4 flex justify-between items-center">
                                <p className="font-semibold text-foreground">TOTAL</p>
                                <p className="text-2xl font-bold text-primary">₹{generatedBill.totalAmount.toFixed(2)}</p>
                            </div>

                            <div className="text-center mt-8 pt-8 border-t text-sm text-muted-foreground">
                                <p>Thank you for your business!</p>
                            </div>
                        </Card>

                        {/* Actions */}
                        <div className="flex gap-3 justify-center">
                            <Button onClick={() => setGeneratedBill(null)} variant="outline" className="bg-transparent">
                                Back to Orders
                            </Button>
                            <Button onClick={handlePrint} className="gap-2 bg-primary hover:bg-primary/90">
                                <Printer className="h-4 w-4" />
                                Print Bill
                            </Button>
                            <Button onClick={handleDownloadPDF} className="gap-2 bg-accent hover:bg-accent/90">
                                <Download className="h-4 w-4" />
                                Download PDF
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
