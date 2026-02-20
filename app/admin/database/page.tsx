'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Database, Download, Upload, AlertTriangle } from 'lucide-react';

export default function DatabaseManagementPage() {
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [backupSuccess, setBackupSuccess] = useState(false);
    const [restoreSuccess, setRestoreSuccess] = useState(false);
    const [restoreError, setRestoreError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [confirmText, setConfirmText] = useState('');

    const handleBackup = async () => {
        setIsBackingUp(true);
        setBackupSuccess(false);
        try {
            const response = await fetch('/api/admin/backup-db', {
                method: 'GET',
            });

            if (!response.ok) throw new Error('Backup failed');

            // Handle file download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tabletap_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setBackupSuccess(true);
            setTimeout(() => setBackupSuccess(false), 5000);
        } catch (error) {
            console.error('Backup error:', error);
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
            setRestoreError(null);
            setRestoreSuccess(false);
        }
    };

    const handleRestore = async () => {
        if (!selectedFile || confirmText !== 'RESTORE') return;

        setIsRestoring(true);
        setRestoreError(null);
        setRestoreSuccess(false);

        try {
            const fileContent = await selectedFile.text();
            const payload = JSON.parse(fileContent);

            const response = await fetch('/api/admin/restore-db', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            setRestoreSuccess(true);
            setSelectedFile(null);
            setConfirmText('');
        } catch (error: any) {
            console.error('Restore error:', error);
            setRestoreError(error.message || 'Failed to parse or restore database JSON.');
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Database Management</h1>
                <p className="text-muted-foreground mt-1">Export full platform backups or completely restore the state of the database.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Backup Card */}
                <Card className="p-8 border-primary/10 shadow-sm bg-card/50 backdrop-blur flex flex-col h-full">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary">
                            <Download className="h-8 w-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">Export Backup</h2>
                            <p className="text-sm text-muted-foreground">Download a complete snapshot of all collections.</p>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            This process will aggregate all Cafes, Menu Items, Orders, Settings, and active Subscriptions into a single JSON file. This file contains senstive customer data—store it securely.
                        </p>
                    </div>

                    <div className="mt-8">
                        <Button
                            onClick={handleBackup}
                            disabled={isBackingUp}
                            className="w-full text-lg h-12 gap-2 shadow-sm"
                        >
                            {isBackingUp ? (
                                <><Loader2 className="h-5 w-5 animate-spin" /> Exporting Database...</>
                            ) : backupSuccess ? (
                                <>Backup Downloaded</>
                            ) : (
                                <><Database className="h-5 w-5" /> Generate JSON Backup</>
                            )}
                        </Button>
                    </div>
                </Card>

                {/* Restore Card */}
                <Card className="p-8 border-red-500/20 shadow-sm bg-red-500/5 backdrop-blur flex flex-col h-full">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 rounded-xl bg-red-500/10 text-red-600">
                            <AlertTriangle className="h-8 w-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-red-700">Restore Database</h2>
                            <p className="text-sm text-red-600/80">Wipe and overwrite the entire platform.</p>
                        </div>
                    </div>

                    <div className="flex-1 space-y-6">
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-sm text-red-800 font-semibold mb-2">DANGER ZONE</p>
                            <p className="text-sm text-red-700/80">
                                Restoring a backup will <strong>permanently delete all current data</strong> across all collections and replace it entirely with the contents of the uploaded JSON file. This action cannot be undone.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Upload Backup File (.json)</label>
                                <input
                                    type="file"
                                    accept="application/json"
                                    onChange={handleFileChange}
                                    className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                />
                            </div>

                            {selectedFile && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-sm font-medium text-foreground mb-2">Type "RESTORE" to confirm</label>
                                    <input
                                        type="text"
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        placeholder="RESTORE"
                                        className="w-full px-4 py-2 border border-red-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-background text-foreground"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 space-y-4">
                        {restoreError && (
                            <div className="p-3 rounded-lg bg-red-100 text-red-800 text-sm font-medium">
                                {restoreError}
                            </div>
                        )}

                        {restoreSuccess && (
                            <div className="p-3 rounded-lg bg-green-100 text-green-800 text-sm font-medium">
                                Database completely restored successfully.
                            </div>
                        )}

                        <Button
                            onClick={handleRestore}
                            disabled={isRestoring || !selectedFile || confirmText !== 'RESTORE'}
                            variant="destructive"
                            className="w-full text-lg h-12 gap-2 shadow-sm font-bold"
                        >
                            {isRestoring ? (
                                <><Loader2 className="h-5 w-5 animate-spin" /> Restoring Infrastructure...</>
                            ) : (
                                <><Upload className="h-5 w-5" /> Start Wipe & Restore</>
                            )}
                        </Button>
                    </div>
                </Card>

            </div>
        </div>
    );
}
