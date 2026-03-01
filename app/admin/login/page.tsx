'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const ALLOWED_EMAILS = [
  'akshatpatel1901@gmail.com',
  'tabletapofficial@gmail.com',
  'jainikpatel670@gmail.com'
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const clearAdminSession = async () => {
      try {
        localStorage.removeItem('admin_token');
        await signOut(auth);
      } catch (err) {
        console.error('[v0] Error clearing admin session:', err);
      }
    };
    clearAdminSession();
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);
      const userEmail = result.user?.email;

      if (!userEmail || !ALLOWED_EMAILS.includes(userEmail)) {
        await signOut(auth);
        setError('Unauthorized email address. Access denied.');
        return;
      }

      localStorage.setItem('admin_token', 'authenticated');
      router.push('/admin/dashboard');
    } catch (err: any) {
      console.error('[v0] Login error:', err);
      // Firebase auth error codes can be messy, show a clean message or the actual error message
      setError(err?.message || 'Failed to login with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 text-center">TableTap Admin</h1>
        <p className="text-center text-muted-foreground mb-8">Platform Administration</p>

        <div className="space-y-6">
          {error && <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}

          <Button
            onClick={handleGoogleSignIn}
            className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-semibold py-2 h-auto flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                  <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335"></path>
                  <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4"></path>
                  <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05"></path>
                  <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853"></path>
                </svg>
                Sign in with Google
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
