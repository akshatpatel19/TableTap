'use client';

import { useEffect, useState } from 'react';
import { getAllAdminPopups, createAdminPopup, updateAdminPopup, deleteAdminPopup, AdminPopup, getAllCafes, Cafe, getCafePopupResponses, CafePopup } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit2, Trash2, X, Eye, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function PopupsPage() {
    const [popups, setPopups] = useState<AdminPopup[]>([]);
    const [cafes, setCafes] = useState<Cafe[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingPopup, setEditingPopup] = useState<AdminPopup | null>(null);
    const [selectedPopupLogs, setSelectedPopupLogs] = useState<AdminPopup | null>(null);
    const [popupResponses, setPopupResponses] = useState<CafePopup[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [cafeLookup, setCafeLookup] = useState<Record<string, Cafe>>({});
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        content: '',
        templateType: 'notification' as 'notification' | 'confirmation' | 'form' | 'terms',
        hasCheckbox: false,
        checkboxText: '',
        isUnclosable: false,
        targetCafes: 'all' as 'all' | 'specific',
        selectedCafeIds: [] as string[],
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [popupsData, cafesData] = await Promise.all([getAllAdminPopups(), getAllCafes()]);
            setPopups(popupsData);
            setCafes(cafesData);
        } catch (error) {
            console.error('[v0] Error loading popups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (popup: AdminPopup) => {
        setEditingPopup(popup);
        setFormData({
            title: popup.title,
            description: popup.description,
            content: popup.content,
            templateType: popup.templateType,
            hasCheckbox: popup.hasCheckbox,
            checkboxText: popup.checkboxText || '',
            isUnclosable: popup.isUnclosable,
            targetCafes: popup.targetCafes,
            selectedCafeIds: popup.cafeIds || [],
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        try {
            const popupData = {
                ...formData,
                ...(formData.targetCafes === 'specific' && { cafeIds: formData.selectedCafeIds }),
            };

            if (editingPopup) {
                await updateAdminPopup(editingPopup.id, popupData as any);
            } else {
                await createAdminPopup({
                    ...popupData,
                    status: 'active',
                    createdBy: 'admin',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                } as any);
            }
            setShowForm(false);
            setEditingPopup(null);
            setFormData({
                title: '',
                description: '',
                content: '',
                templateType: 'notification',
                hasCheckbox: false,
                checkboxText: '',
                isUnclosable: false,
                targetCafes: 'all',
                selectedCafeIds: [],
            });
            await loadData();
        } catch (error) {
            console.error('[v0] Error saving popup:', error);
        }
    };

    const handleDelete = async (popupId: string) => {
        if (confirm('Archive this popup?')) {
            try {
                await deleteAdminPopup(popupId);
                await loadData();
            } catch (error) {
                console.error('[v0] Error deleting popup:', error);
            }
        }
    };

    const handleViewLogs = async (popup: AdminPopup) => {
        setSelectedPopupLogs(popup);
        setLoadingLogs(true);
        try {
            const responses = await getCafePopupResponses(popup.id);
            setPopupResponses(responses);

            // Build cafe lookup
            const newCafeLookup = { ...cafeLookup };
            for (const response of responses) {
                if (!newCafeLookup[response.cafeId]) {
                    const cafe = cafes.find(c => c.id === response.cafeId);
                    if (cafe) {
                        newCafeLookup[response.cafeId] = cafe;
                    }
                }
            }
            setCafeLookup(newCafeLookup);
        } catch (error) {
            console.error('[v0] Error loading popup logs:', error);
        } finally {
            setLoadingLogs(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Popup Manager</h1>
                    <Button
                        onClick={() => {
                            setEditingPopup(null);
                            setFormData({
                                title: '',
                                description: '',
                                content: '',
                                templateType: 'notification',
                                hasCheckbox: false,
                                checkboxText: '',
                                isUnclosable: false,
                                targetCafes: 'all',
                                selectedCafeIds: [],
                            });
                            setShowForm(!showForm);
                        }}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        New Popup
                    </Button>
                </div>

                {showForm && (
                    <Card className="p-6 mb-8">
                        <h2 className="text-xl font-semibold mb-4">{editingPopup ? 'Edit' : 'Create'} Popup</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                                    placeholder="Popup title"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                                    placeholder="Short description"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Content</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                                    placeholder="Popup content"
                                    rows={4}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Template Type</label>
                                <select
                                    value={formData.templateType}
                                    onChange={(e) => setFormData({ ...formData, templateType: e.target.value as any })}
                                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                                >
                                    <option value="notification">Notification</option>
                                    <option value="confirmation">Confirmation</option>
                                    <option value="form">Form</option>
                                    <option value="terms">Terms & Conditions</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="hasCheckbox"
                                    checked={formData.hasCheckbox}
                                    onChange={(e) => setFormData({ ...formData, hasCheckbox: e.target.checked })}
                                    className="h-4 w-4"
                                />
                                <label htmlFor="hasCheckbox" className="text-sm font-medium text-foreground">
                                    Add checkbox (I agree / Accept)
                                </label>
                            </div>

                            {formData.hasCheckbox && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Checkbox Label</label>
                                    <input
                                        type="text"
                                        value={formData.checkboxText}
                                        onChange={(e) => setFormData({ ...formData, checkboxText: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                                        placeholder="e.g., I agree to the new terms and conditions"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="isUnclosable"
                                    checked={formData.isUnclosable}
                                    onChange={(e) => setFormData({ ...formData, isUnclosable: e.target.checked })}
                                    className="h-4 w-4"
                                />
                                <label htmlFor="isUnclosable" className="text-sm font-medium text-foreground">
                                    Unclosable (Cannot be dismissed)
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Target Cafes</label>
                                <select
                                    value={formData.targetCafes}
                                    onChange={(e) => setFormData({ ...formData, targetCafes: e.target.value as any })}
                                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                                >
                                    <option value="all">All Cafes</option>
                                    <option value="specific">Specific Cafes</option>
                                </select>
                            </div>

                            {formData.targetCafes === 'specific' && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Select Cafes</label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted/20">
                                        {cafes.map((cafe) => (
                                            <div key={cafe.id} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id={`cafe-${cafe.id}`}
                                                    checked={formData.selectedCafeIds.includes(cafe.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({
                                                                ...formData,
                                                                selectedCafeIds: [...formData.selectedCafeIds, cafe.id],
                                                            });
                                                        } else {
                                                            setFormData({
                                                                ...formData,
                                                                selectedCafeIds: formData.selectedCafeIds.filter((id) => id !== cafe.id),
                                                            });
                                                        }
                                                    }}
                                                    className="h-4 w-4"
                                                />
                                                <label htmlFor={`cafe-${cafe.id}`} className="text-sm text-foreground">
                                                    {cafe.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 pt-4 border-t">
                                <Button onClick={handleSave} className="bg-primary text-primary-foreground">
                                    {editingPopup ? 'Update' : 'Create'} Popup
                                </Button>
                                <Button
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingPopup(null);
                                    }}
                                    variant="outline"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

                <div className="grid gap-4">
                    {popups.length === 0 ? (
                        <Card className="p-8 text-center">
                            <p className="text-muted-foreground">No popups created yet. Create one to get started.</p>
                        </Card>
                    ) : (
                        popups.map((popup) => (
                            <Card key={popup.id} className="p-4 flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-foreground">{popup.title}</h3>
                                        <Badge variant="outline">{popup.templateType}</Badge>
                                        <Badge className={popup.isUnclosable ? 'bg-amber-100 text-amber-900' : ''}>
                                            {popup.isUnclosable ? 'Unclosable' : 'Closable'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">{popup.description}</p>
                                    <p className="text-sm text-foreground mb-2">
                                        <strong>Target:</strong> {popup.targetCafes === 'all' ? 'All cafes' : `${popup.cafeIds?.length || 0} specific cafe(s)`}
                                    </p>
                                    {popup.hasCheckbox && (
                                        <p className="text-sm text-foreground">
                                            <strong>Checkbox:</strong> {popup.checkboxText}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => handleViewLogs(popup)}
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <Eye className="h-4 w-4" />
                                        View Logs
                                    </Button>
                                    <Button
                                        onClick={() => handleEdit(popup)}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        onClick={() => handleDelete(popup.id)}
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))
                    )}
                </div>

                {/* Popup Logs Modal */}
                <Dialog open={!!selectedPopupLogs} onOpenChange={(open) => {
                    if (!open) {
                        setSelectedPopupLogs(null);
                        setPopupResponses([]);
                    }
                }}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Popup Response Logs - {selectedPopupLogs?.title}</DialogTitle>
                        </DialogHeader>

                        {loadingLogs ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    <Card className="p-4 bg-blue-50 border-blue-200">
                                        <p className="text-xs text-blue-700 font-medium">Total Responses</p>
                                        <p className="text-2xl font-bold text-blue-900">{popupResponses.length}</p>
                                    </Card>
                                    <Card className="p-4 bg-green-50 border-green-200">
                                        <p className="text-xs text-green-700 font-medium">Agreed</p>
                                        <p className="text-2xl font-bold text-green-900">
                                            {popupResponses.filter(r => r.agreedToTerms).length}
                                        </p>
                                    </Card>
                                    <Card className="p-4 bg-yellow-50 border-yellow-200">
                                        <p className="text-xs text-yellow-700 font-medium">Dismissed</p>
                                        <p className="text-2xl font-bold text-yellow-900">
                                            {popupResponses.filter(r => !r.agreedToTerms).length}
                                        </p>
                                    </Card>
                                </div>

                                {popupResponses.length === 0 ? (
                                    <Card className="p-8 text-center border-dashed">
                                        <p className="text-muted-foreground">No responses yet</p>
                                    </Card>
                                ) : (
                                    <div className="space-y-2">
                                        {popupResponses.map((response) => (
                                            <Card
                                                key={response.id}
                                                className={`p-4 flex items-center justify-between border-l-4 ${response.agreedToTerms
                                                        ? 'bg-green-50 border-l-green-500'
                                                        : 'bg-yellow-50 border-l-yellow-500'
                                                    }`}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-semibold text-foreground">
                                                            {cafeLookup[response.cafeId]?.name || response.cafeId}
                                                        </p>
                                                        {response.agreedToTerms ? (
                                                            <Badge className="bg-green-100 text-green-800 border-0">
                                                                <Check className="h-3 w-3 mr-1" />
                                                                Agreed
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-yellow-100 text-yellow-800 border-0">
                                                                Dismissed
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Email: {cafeLookup[response.cafeId]?.email || 'N/A'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        {response.agreedToTerms ? 'Agreed on' : 'Dismissed on'}:{' '}
                                                        {new Date(response.agreedToTerms ? response.agreedAt! : response.dismissedAt!).toLocaleString()}
                                                    </p>
                                                    {response.formResponse && Object.keys(response.formResponse).length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                                            <p className="text-xs font-semibold text-foreground mb-1">Form Responses:</p>
                                                            <div className="text-xs text-muted-foreground space-y-1">
                                                                {Object.entries(response.formResponse).map(([key, value]) => (
                                                                    <p key={key}>
                                                                        <strong>{key}:</strong> {String(value)}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
