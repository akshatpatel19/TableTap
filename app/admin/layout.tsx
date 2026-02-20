'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import {
    LayoutDashboard,
    Store,
    TrendingUp,
    Settings,
    LogOut,
    Menu,
    PieChart,
    Megaphone,
    X,
    Database
} from 'lucide-react';

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // If we are on the login page, don't show the sidebar
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    const handleLogout = async () => {
        try {
            await auth.signOut();
            router.push('/admin/login');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const navigation = [
        { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Cafes', href: '/admin/cafes', icon: Store },
        { name: 'Platform Analytics', href: '/admin/analytics/platform', icon: TrendingUp },
        { name: 'Cafe Analytics', href: '/admin/analytics/cafes', icon: PieChart },
        { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
        { name: 'Database', href: '/admin/database', icon: Database },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
    ];

    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div className="min-h-screen bg-background flex">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar Navigation */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:w-64 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="h-16 flex items-center justify-between px-6 border-b">
                    <Link href="/admin/dashboard" className="flex items-center gap-2">
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                            TableTap Admin
                        </span>
                    </Link>
                    <button
                        onClick={closeSidebar}
                        className="lg:hidden p-2 text-muted-foreground hover:bg-muted rounded-md"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="space-y-1 px-3">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={closeSidebar}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                >
                                    <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="p-4 border-t">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-5 w-5 mr-3" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <div className="lg:hidden h-16 border-b bg-card flex items-center px-4 sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 mr-2 text-muted-foreground hover:bg-muted rounded-md"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        TableTap Admin
                    </span>
                </div>

                {/* Page Content */}
                <div className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-primary/5">
                    {children}
                </div>
            </main>
        </div>
    );
}
