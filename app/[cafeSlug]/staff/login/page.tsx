'use client';

import React from "react"

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCafeBySlug } from '@/lib/db';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function StaffLoginPage() {
  const params = useParams();
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cafeSlug = params.cafeSlug as string;

  useEffect(() => {
    const clearAdminSession = async () => {
      try {
        localStorage.removeItem('current_cafe_id');
        await signOut(auth);
      } catch (err) {
        console.error('[v0] Error clearing session:', err);
      }
    };
    clearAdminSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cafe = await getCafeBySlug(cafeSlug);

      if (!cafe) {
        setError('Cafe not found');
        return;
      }

      // Store in localStorage temporarily for demo - in production, use secure session
      localStorage.setItem(`cafe_staff_${cafe.id}`, accessCode);
      localStorage.setItem(`current_cafe_id`, cafe.id);

      router.push(`/${cafeSlug}/staff/dashboard`);
    } catch (err) {
      console.error('[v0] Login error:', err);
      setError('Failed to authenticate. Please check your access code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 text-center">Staff Access</h1>
        <p className="text-center text-muted-foreground mb-8">Enter your access code to continue</p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Access Code</label>
            <input
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter your staff access code"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
              required
              disabled={loading}
            />
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
                Verifying...
              </>
            ) : (
              'Login'
            )}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Contact your cafe manager for the access code
        </p>
      </Card>
    </div>
  );
}
