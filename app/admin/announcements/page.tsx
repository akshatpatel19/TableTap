'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminSettings, updateAdminSettings, AdminSettings } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Megaphone, Save, Mail, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function AdminAnnouncementsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [broadcasting, setBroadcasting] = useState(false);

    const [formData, setFormData] = useState({
        globalNotice: '',
        noticeActive: false,
    });

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const adminToken = localStorage.getItem('admin_token');
                if (!adminToken) {
                    router.push('/admin/login');
                    return;
                }

                const existingSettings = await getAdminSettings();
                if (existingSettings) {
                    setFormData({
                        globalNotice: existingSettings.globalNotice || '',
                        noticeActive: existingSettings.noticeActive || false,
                    });
                }
            } catch (error) {
                console.error('Error loading admin settings:', error);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [router]);

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            await updateAdminSettings(formData);
            toast.success('Announcement settings saved successfully.');
        } catch (error) {
            console.error('Error saving announcement:', error);
            toast.error('Failed to save announcement.');
        } finally {
            setSaving(false);
        }
    };

    const handleBroadcastEmail = async () => {
        if (!formData.globalNotice) {
            toast.error("Please enter a notice message before broadcasting.");
            return;
        }

        setBroadcasting(true);
        try {
            // First save to DB to ensure it's up to date
            await updateAdminSettings(formData);

            const response = await fetch('/api/admin/broadcast-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    noticeMessage: formData.globalNotice,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to broadcast');
            }

            toast.success(result.message || 'Email broadcast sent successfully!', {
                icon: <CheckCircle2 className="h-5 w-5 text-green-500" />
            });
        } catch (error: any) {
            console.error('Error broadcasting email:', error);
            toast.error(error.message || 'Failed to send broadcast email.');
        } finally {
            setBroadcasting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Global Announcements</h1>
                    <p className="text-muted-foreground mt-1">Manage platform-wide notices and broadcast emails to all cafe owners.</p>
                </div>
            </div>

            <Card className="p-6 md:p-8 border-primary/10 hover:border-primary/20 transition-colors shadow-sm bg-card/80 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Megaphone className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Dashboard Notice Banner</h2>
                            <p className="text-sm text-muted-foreground">Controls the alert banner displayed on all owner dashboards.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-xl border">
                        <div className="text-right">
                            <label className="text-sm font-semibold text-foreground block">Visibility Status</label>
                            <span className="text-xs text-muted-foreground">
                                {formData.noticeActive ? 'Currently Visible' : 'Currently Hidden'}
                            </span>
                        </div>
                        <Switch
                            checked={formData.noticeActive}
                            onCheckedChange={(checked) => setFormData({ ...formData, noticeActive: checked })}
                            className="data-[state=checked]:bg-green-500"
                        />
                    </div>
                </div>

                <div className="space-y-4 mb-8">
                    <label className="block text-sm font-semibold text-foreground">Announcement Message Content <span className="text-red-500">*</span></label>
                    <textarea
                        placeholder="E.g., Scheduled maintenance on Sunday at 2 AM IST. Please plan accordingly."
                        value={formData.globalNotice}
                        onChange={(e) => setFormData({ ...formData, globalNotice: e.target.value })}
                        className="w-full p-4 rounded-xl border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[160px] resize-y text-base transition-shadow"
                    />
                    <p className="text-xs text-muted-foreground">This message will be shown exactly as formatted above.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border">
                    <Button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className="flex-1 gap-2 h-12 shadow-sm"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save & Update Banner
                    </Button>

                    <Button
                        onClick={handleBroadcastEmail}
                        disabled={broadcasting || !formData.globalNotice}
                        variant="secondary"
                        className="flex-1 gap-2 h-12 shadow-sm bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                    >
                        {broadcasting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        Broadcast via Email
                    </Button>
                </div>
            </Card>

            <Card className="p-6 border-blue-500/10 bg-blue-500/5 shadow-sm text-sm">
                <h3 className="font-semibold text-blue-800 flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4" /> Understanding Broadcast Limits
                </h3>
                <p className="text-blue-700/80 leading-relaxed">
                    The <strong>Broadcast via Email</strong> action will immediately fetch all <em>active</em> cafe email addresses and dispatch a formatted email outlining your notice. Use this sparingly for critical platform updates so cafe owners don't unsubscribe or mark emails as spam.
                </p>
            </Card>
        </div>
    );
}
