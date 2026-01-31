'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Clock } from 'lucide-react';
import { Cafe } from '@/lib/db';

interface PaymentReminderModalProps {
  open: boolean;
  cafe: Cafe;
  onClose: () => void;
  onPayNow: () => void;
}

export default function PaymentReminderModal({
  open,
  cafe,
  onClose,
  onPayNow,
}: PaymentReminderModalProps) {
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    if (open && cafe.nextMonthlyPaymentDueDate) {
      const now = Date.now();
      const dueDate = cafe.nextMonthlyPaymentDueDate;
      const msRemaining = dueDate - now;
      const daysLeft = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
      setDaysRemaining(Math.max(0, daysLeft));
    }
  }, [open, cafe.nextMonthlyPaymentDueDate]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            Payment Reminder
          </DialogTitle>
          <DialogDescription>
            Your subscription payment is due soon
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          <Card className="p-4 bg-amber-50 border border-amber-200">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-900">Payment Due in {daysRemaining} Days</p>
                  <p className="text-sm text-amber-800">
                    {new Date(cafe.nextMonthlyPaymentDueDate || Date.now()).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Subscription:</span>
                  <span className="font-semibold text-foreground">₹{cafe.monthlySubscriptionAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tables:</span>
                  <span className="font-semibold text-foreground">{cafe.tables}</span>
                </div>
                <div className="border-t border-muted pt-2 flex justify-between">
                  <span className="text-muted-foreground">Rate per Table:</span>
                  <span className="font-semibold text-foreground">₹199/month</span>
                </div>
              </div>

              <p className="text-xs text-amber-700 p-2 bg-amber-100 rounded">
                ℹ️ Pay now to avoid service interruption. After the due date, payment will be mandatory to continue using TableTap.
              </p>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Remind Later
            </Button>
            <Button
              onClick={onPayNow}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              Pay Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
