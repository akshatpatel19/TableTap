'use client';

import { useEffect, useState } from 'react';
import { getCafePopups, saveCafePopupResponse, dismissCafePopup, AdminPopup } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface PopupRendererProps {
  cafeId: string;
}

export default function PopupRenderer({ cafeId }: PopupRendererProps) {
  const [popups, setPopups] = useState<AdminPopup[]>([]);
  const [currentPopupIndex, setCurrentPopupIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPopups();
  }, [cafeId]);

  const loadPopups = async () => {
    try {
      const cafePopups = await getCafePopups(cafeId);
      // Filter out already dismissed popups
      const activePops = cafePopups.filter(p => p.status === 'active');
      setPopups(activePops);
      setCurrentPopupIndex(0);
    } catch (error) {
      console.error('[v0] Error loading popups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (popups.length === 0) return;
    const popup = popups[currentPopupIndex];
    
    if (!popup.isUnclosable) {
      try {
        await dismissCafePopup(cafeId, popup.id);
        const newIndex = currentPopupIndex + 1;
        if (newIndex < popups.length) {
          setCurrentPopupIndex(newIndex);
        } else {
          setPopups([]);
        }
      } catch (error) {
        console.error('[v0] Error dismissing popup:', error);
      }
    }
  };

  const handleAgree = async () => {
    if (popups.length === 0) return;
    const popup = popups[currentPopupIndex];

    try {
      await saveCafePopupResponse(cafeId, popup.id, {
        agreedToTerms: true,
        formData,
      });

      // Move to next popup or close
      const newIndex = currentPopupIndex + 1;
      if (newIndex < popups.length) {
        setCurrentPopupIndex(newIndex);
        setFormData({});
        setAgreedToTerms(false);
      } else {
        setPopups([]);
      }
    } catch (error) {
      console.error('[v0] Error saving popup response:', error);
    }
  };

  if (loading || popups.length === 0) {
    return null;
  }

  const popup = popups[currentPopupIndex];

  return (
    <Dialog open={popups.length > 0} onOpenChange={(open) => {
      if (!open && !popup.isUnclosable) {
        handleDismiss();
      }
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{popup.title}</DialogTitle>
            {!popup.isUnclosable && (
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <DialogDescription>{popup.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-foreground whitespace-pre-wrap">
            {popup.content}
          </div>

          {popup.hasCheckbox && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <input
                type="checkbox"
                id="agreement"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="agreement" className="text-sm font-medium text-foreground">
                {popup.checkboxText || 'I agree to the terms'}
              </label>
            </div>
          )}

          <div className="flex gap-2">
            {!popup.isUnclosable && (
              <Button onClick={handleDismiss} variant="outline" className="flex-1">
                {popup.hasCheckbox ? 'Decline' : 'Close'}
              </Button>
            )}
            <Button
              onClick={handleAgree}
              disabled={popup.hasCheckbox && !agreedToTerms}
              className="flex-1 bg-primary text-primary-foreground"
            >
              {popup.hasCheckbox ? 'Agree & Continue' : 'OK'}
            </Button>
          </div>

          {popups.length > 1 && (
            <p className="text-xs text-center text-muted-foreground">
              {currentPopupIndex + 1} of {popups.length}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
