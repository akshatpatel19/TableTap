'use client';

import React from "react"

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

export interface SubscriptionPlan {
  id: 'basic' | 'standard' | 'premium';
  name: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  yearlyPrice: number;
  tablesIncluded: number;
  features: string[];
  highlighted?: boolean;
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    monthlyPrice: 499,
    quarterlyPrice: 1399,
    yearlyPrice: 4999,
    tablesIncluded: 5,
    features: [
      'Up to 5 tables',
      'Basic menu management',
      'Order tracking',
      'Pay at counter option',
      'Email support',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    monthlyPrice: 999,
    quarterlyPrice: 2799,
    yearlyPrice: 9999,
    tablesIncluded: 15,
    features: [
      'Up to 15 tables',
      'Advanced menu management',
      'Real-time order notifications',
      'Razorpay integration',
      'Order analytics',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 1999,
    quarterlyPrice: 5599,
    yearlyPrice: 19999,
    tablesIncluded: 50,
    features: [
      'Up to 50 tables',
      'Multi-location support',
      'Custom branding',
      'Advanced analytics',
      'API access',
      'Dedicated support',
      'Staff management',
    ],
  },
];

interface SubscriptionPlansProps {
  onSelectPlan: (plan: SubscriptionPlan, duration: 'monthly' | 'quarterly' | 'yearly') => void;
  loading?: boolean;
  selectedPlan?: string;
}

export const SubscriptionPlansComponent: React.FC<SubscriptionPlansProps> = ({
  onSelectPlan,
  loading = false,
  selectedPlan,
}) => {
  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-foreground mb-2">Simple, Transparent Pricing</h2>
        <p className="text-muted-foreground">Choose the perfect plan for your cafe</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {subscriptionPlans.map((plan) => (
          <Card
            key={plan.id}
            className={`p-8 relative overflow-hidden transition-all hover:shadow-lg ${
              plan.highlighted ? 'ring-2 ring-primary md:scale-105' : ''
            } ${selectedPlan === plan.id ? 'ring-2 ring-primary' : ''}`}
          >
            {plan.highlighted && (
              <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">Most Popular</Badge>
            )}

            <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Perfect for {plan.tablesIncluded > 5 ? 'larger' : 'small'} cafes
            </p>

            <div className="mb-6 space-y-2">
              <p className="text-muted-foreground text-sm">Pricing</p>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-sm text-muted-foreground">Monthly</span>
                  <span className="text-2xl font-bold text-primary">₹{plan.monthlyPrice}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-sm text-muted-foreground">Quarterly</span>
                  <span className="text-2xl font-bold text-primary">₹{plan.quarterlyPrice}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-sm text-muted-foreground">Yearly</span>
                  <span className="text-2xl font-bold text-primary">₹{plan.yearlyPrice}</span>
                </div>
              </div>
            </div>

            <div className="pb-6 border-b mb-6">
              <p className="text-sm font-semibold text-foreground mb-2">Includes:</p>
              <p className="text-lg font-bold text-accent">{plan.tablesIncluded} Tables</p>
            </div>

            <div className="space-y-3 mb-8">
              {plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => onSelectPlan(plan, 'monthly')}
                disabled={loading}
                className={`w-full ${plan.highlighted ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
              >
                Choose Monthly
              </Button>
              <Button
                onClick={() => onSelectPlan(plan, 'quarterly')}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Choose Quarterly
              </Button>
              <Button
                onClick={() => onSelectPlan(plan, 'yearly')}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Choose Yearly
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
