'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getCafeByEmail, getOrders, Cafe, Order } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Download, FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type FilterType = 'month' | 'year' | 'custom';

export default function OrdersPage() {
    const router = useRouter();
    const [cafe, setCafe] = useState<Cafe | null>(null);
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [filterType, setFilterType] = useState<FilterType>('month');
    // Helper for local YYYY-MM
    const getLocalMonthString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const [selectedMonth, setSelectedMonth] = useState<string>(getLocalMonthString(new Date()));
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Dropdown state
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
            if (!currentUser) {
                router.push('/owner/login');
                return;
            }

            try {
                const cafeData = await getCafeByEmail(currentUser.email || '');
                if (!cafeData) {
                    router.push('/owner/login');
                    return;
                }

                setCafe(cafeData);

                const ordersData = await getOrders(cafeData.id);
                setAllOrders(ordersData);
            } catch (error) {
                console.error('[v0] Error loading orders:', error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, [router]);

    // Computed Filtered Orders
    const filteredOrders = useMemo(() => {
        return allOrders.filter((order) => {
            const orderDate = new Date(order.createdAt);

            if (filterType === 'month') {
                const orderMonth = getLocalMonthString(orderDate);
                return orderMonth === selectedMonth;
            } else if (filterType === 'year') {
                return orderDate.getFullYear().toString() === selectedYear;
            } else if (filterType === 'custom') {
                if (!startDate && !endDate) return true;

                // normalize dates for comparison
                const start = startDate ? new Date(startDate) : new Date(0);
                start.setHours(0, 0, 0, 0);

                const end = endDate ? new Date(endDate) : new Date(8640000000000000);
                end.setHours(23, 59, 59, 999);

                return orderDate >= start && orderDate <= end;
            }
            return true;
        }).sort((a, b) => b.createdAt - a.createdAt);
    }, [allOrders, filterType, selectedMonth, selectedYear, startDate, endDate]);

    // Computed Summaries
    const { totalSales, totalUPI, totalCash } = useMemo(() => {
        let sales = 0;
        let upi = 0;
        let cash = 0;

        filteredOrders.forEach((order) => {
            if (order.status !== 'cancelled') {
                sales += order.totalAmount;
                // Treat UPI distinctively, fallback defaults could be mixed
                if (order.paymentMethod === 'online') {
                    upi += order.totalAmount;
                } else if (order.paymentMethod === 'counter') {
                    cash += order.totalAmount;
                }
            }
        });

        return { totalSales: sales, totalUPI: upi, totalCash: cash };
    }, [filteredOrders]);

    // Export Functions
    const generateCsv = () => {
        const headers = ['Order ID', 'Date', 'Time', 'Status', 'Payment Method', 'Payment Status', 'Total Amount', 'Items'];

        const rows = filteredOrders.map(order => {
            const date = new Date(order.createdAt);
            const itemsList = order.items.map(i => `${i.quantity}x ${i.name}`).join('; ');

            return [
                order.id,
                date.toLocaleDateString(),
                date.toLocaleTimeString(),
                order.status,
                order.paymentMethod || 'N/A',
                order.paymentStatus,
                order.totalAmount,
                `"${itemsList}"`
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        downloadFile(csvContent, 'orders_export.csv', 'text/csv');
        setShowDownloadMenu(false);
    };

    const generateXlsx = () => {
        const data = filteredOrders.map(order => {
            const date = new Date(order.createdAt);
            const itemsList = order.items.map(i => `${i.quantity}x ${i.name}`).join('; ');
            return {
                'Order ID': order.id,
                'Date': date.toLocaleDateString(),
                'Time': date.toLocaleTimeString(),
                'Status': order.status,
                'Payment Method': order.paymentMethod?.toUpperCase() || 'N/A',
                'Payment Status': order.paymentStatus,
                'Total Amount': order.totalAmount,
                'Items': itemsList
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
        XLSX.writeFile(workbook, "orders_export.xlsx");
        setShowDownloadMenu(false);
    };

    const generatePdf = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(`Order Report - ${cafe?.name}`, 14, 22);

        doc.setFontSize(11);
        doc.text(`Total Sales: Rs. ${totalSales}`, 14, 32);
        doc.text(`UPI Payments: Rs. ${totalUPI}`, 14, 38);
        doc.text(`Cash Payments: Rs. ${totalCash}`, 14, 44);

        const tableColumn = ["ID", "Date", "Status", "Payment", "Amount"];
        const tableRows: any[] = [];

        filteredOrders.forEach(order => {
            const date = new Date(order.createdAt).toLocaleDateString();
            const orderData = [
                order.id.slice(0, 8),
                date,
                order.status,
                order.paymentMethod?.toUpperCase() || 'N/A',
                `Rs. ${order.totalAmount}`
            ];
            tableRows.push(orderData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 50,
        });

        doc.save("orders_export.pdf");
        setShowDownloadMenu(false);
    };

    const downloadFile = (content: string, fileName: string, contentType: string) => {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
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
        <div className="min-h-screen bg-background pb-12">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-card border-b shadow-lg mb-8">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/owner/dashboard">
                            <Button variant="outline" size="icon" className="h-8 w-8">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Order History</h1>
                            <p className="text-sm text-muted-foreground">{cafe.name}</p>
                        </div>
                    </div>

                    {/* Download Dropdown */}
                    <div className="relative">
                        <Button
                            variant="outline"
                            className="flex items-center gap-2"
                            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                        >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Export</span>
                        </Button>

                        {showDownloadMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-card border shadow-lg rounded-md overflow-hidden z-50">
                                <button onClick={generateCsv} className="w-full text-left px-4 py-3 text-sm hover:bg-muted flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-green-600" />
                                    Download CSV
                                </button>
                                <button onClick={generateXlsx} className="w-full text-left px-4 py-3 text-sm hover:bg-muted flex items-center gap-2 border-t border-border">
                                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                    Download Excel (XLSX)
                                </button>
                                <button onClick={generatePdf} className="w-full text-left px-4 py-3 text-sm hover:bg-muted flex items-center gap-2 border-t border-border">
                                    <FileDown className="h-4 w-4 text-red-500" />
                                    Download PDF
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-6 border-l-4 border-l-blue-600">
                        <p className="text-sm text-muted-foreground mb-1">Total Sales</p>
                        <p className="text-3xl font-bold text-foreground">₹{totalSales}</p>
                        <p className="text-xs text-muted-foreground mt-2">Completed/Pending non-cancelled orders</p>
                    </Card>
                    <Card className="p-6 border-l-4 border-l-purple-600">
                        <p className="text-sm text-muted-foreground mb-1">UPI Payments</p>
                        <p className="text-3xl font-bold text-foreground">₹{totalUPI}</p>
                        <p className="text-xs text-muted-foreground mt-2">Digital payments</p>
                    </Card>
                    <Card className="p-6 border-l-4 border-l-green-600">
                        <p className="text-sm text-muted-foreground mb-1">Counter/Cash</p>
                        <p className="text-3xl font-bold text-foreground">₹{totalCash}</p>
                        <p className="text-xs text-muted-foreground mt-2">Cash received at counter</p>
                    </Card>
                </div>

                <Card className="p-6">
                    <div className="mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                        <h3 className="text-lg font-semibold text-foreground">Orders List</h3>

                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Filter By</label>
                                <select
                                    className="px-3 py-2 border rounded-lg bg-background text-sm w-full sm:w-auto"
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value as FilterType)}
                                >
                                    <option value="month">Month</option>
                                    <option value="year">Year</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                            </div>

                            {filterType === 'month' && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Select Month</label>
                                    <input
                                        type="month"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="px-3 py-2 border border-input rounded-lg bg-background text-sm w-full sm:w-auto"
                                    />
                                </div>
                            )}

                            {filterType === 'year' && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Select Year</label>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="px-3 py-2 border border-input rounded-lg bg-background text-sm w-full sm:w-auto"
                                    >
                                        {[...Array(5)].map((_, i) => {
                                            const year = new Date().getFullYear() - i;
                                            return <option key={year} value={year}>{year}</option>;
                                        })}
                                    </select>
                                </div>
                            )}

                            {filterType === 'custom' && (
                                <div className="flex items-center gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">From</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="px-2 py-2 border border-input rounded-lg bg-background text-xs w-full"
                                        />
                                    </div>
                                    <div className="mb-1 self-end pb-2">-</div>
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">To</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="px-2 py-2 border border-input rounded-lg bg-background text-xs w-full"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                            <div key={order.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-card/50 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <p className="font-medium text-foreground text-lg">Order #{order.id.slice(0, 8)}</p>
                                        <Badge
                                            className={
                                                order.status === 'served'
                                                    ? 'bg-green-100 text-green-800'
                                                    : order.status === 'cancelled'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-blue-100 text-blue-800'
                                            }
                                            variant="outline"
                                        >
                                            {order.status}
                                        </Badge>
                                        <Badge
                                            className={
                                                order.paymentStatus === 'paid'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }
                                        >
                                            {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                                        </Badge>
                                        <Badge variant="outline" className="bg-muted text-xs">
                                            {order.paymentMethod?.toUpperCase() || 'N/A'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-1">
                                        Table {order.tableId} • {order.items.length} items • ₹{order.totalAmount}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                                    </p>

                                    {/* Items detail list */}
                                    <div className="mt-4 bg-muted/30 rounded p-3">
                                        <p className="text-xs font-semibold mb-2">Items</p>
                                        <ul className="space-y-1">
                                            {order.items.map((item, idx) => (
                                                <li key={idx} className="text-sm text-foreground flex justify-between">
                                                    <span>{item.quantity}x {item.name}
                                                        {item.addOns && item.addOns.length > 0 && (
                                                            <span className="text-xs text-muted-foreground ml-2">
                                                                (+{item.addOns.map((a: any) => a.name).join(', ')})
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span>₹{item.price * item.quantity}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-muted-foreground py-8">No orders found for the selected filter.</p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}

