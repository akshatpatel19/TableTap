'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createCafe } from '@/lib/db';
import { generateUniqueSlug } from '@/lib/slug-generator';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import SetupFeePaymentModal from '@/components/SetupFeePaymentModal';
import MonthlySubscriptionModal from '@/components/MonthlySubscriptionModal';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    cafeName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
    tables: 5,
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [cafe, setCafe] = useState<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'tables' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!formData.cafeName || !formData.email || !formData.phone || !formData.address) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      if (!agreeToTerms) {
        setError('You must agree to the Terms and Conditions and Privacy Policy');
        setLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      // Send email verification before anything else
      await sendEmailVerification(userCredential.user);

      // Generate unique cafe slug from cafe name
      const slug = generateUniqueSlug(formData.cafeName);

      // Create cafe in database
      const newCafe = await createCafe({
        name: formData.cafeName,
        slug,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        tables: formData.tables,
        subscriptionPlan: 'basic',
        subscriptionStartDate: Date.now(),
        subscriptionEndDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        isActive: true,
      } as any);

      // Store cafe ID in localStorage
      localStorage.setItem('current_cafe_id', newCafe.id);

      // Redirect to email verification page — user must verify before entering the app
      router.push('/owner/verify-email');
    } catch (err: any) {
      console.error('[v0] Registration error:', err);
      setError(err.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentRecorded = () => {
    // After setup fee payment is confirmed, show monthly subscription modal
    setShowPaymentModal(false);
    // Use setTimeout to ensure state updates are processed
    setTimeout(() => {
      setShowMonthlyModal(true);
    }, 100);
  };

  const handleMonthlyPaymentRecorded = () => {
    // After monthly payment, redirect to dashboard
    setShowMonthlyModal(false);
    setTimeout(() => {
      router.push('/owner/dashboard');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      {cafe && (
        <>
          <SetupFeePaymentModal
            open={showPaymentModal}
            cafe={cafe}
            onClose={() => {
              setShowPaymentModal(false);
              router.push('/owner/dashboard');
            }}
            onPaymentRecorded={handlePaymentRecorded}
          />
          <MonthlySubscriptionModal
            open={showMonthlyModal}
            cafe={cafe}
            onClose={() => {
              setShowMonthlyModal(false);
              router.push('/owner/dashboard');
            }}
            onPaymentRecorded={handleMonthlyPaymentRecorded}
          />
        </>
      )}

      <Card className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 text-center">Create Your Cafe</h1>
        <p className="text-center text-muted-foreground mb-6">Join TableTap and start accepting QR code orders</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Cafe Name</label>
            <input
              type="text"
              name="cafeName"
              value={formData.cafeName}
              onChange={handleChange}
              placeholder="Your cafe name"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="10-digit phone number"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Cafe address"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Number of Tables</label>
            <input
              type="number"
              name="tables"
              value={formData.tables}
              onChange={handleChange}
              placeholder="Enter number of tables"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
              required
              min="1"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
              required
              disabled={loading}
            />
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="terms"
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              disabled={loading}
            />
            <label htmlFor="terms" className="text-sm text-muted-foreground">
              I agree to the{' '}
              <Link href="/terms-and-conditions" target="_blank" className="text-primary hover:underline font-semibold">
                Terms and Conditions
              </Link>
              {' '}and{' '}
              <Link href="/privacy-policy" target="_blank" className="text-primary hover:underline font-semibold">
                Privacy Policy
              </Link>
            </label>
          </div>

          {error && <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 h-auto"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Cafe Account'
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link href="/owner/login" className="text-primary hover:underline font-semibold">
              Login here
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
