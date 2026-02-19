import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

/**
 * useAuthGuard
 *
 * Waits for Firebase to restore the auth session (async) before deciding
 * whether to redirect to the login page. This fixes the "refresh → login"
 * bug caused by reading auth.currentUser synchronously before Firebase
 * has finished restoring the persisted session.
 *
 * Also enforces email verification: unverified users are redirected to
 * /owner/verify-email instead of being allowed into protected pages.
 *
 * Returns:
 *  - authLoading: true while Firebase is still restoring the session
 *  - user: the authenticated Firebase user (or null if not logged in)
 */
export function useAuthGuard(redirectTo = '/owner/login'): {
  authLoading: boolean;
  user: User | null;
} {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        if (!firebaseUser.emailVerified) {
          // User is logged in but hasn't verified their email — block access
          router.push('/owner/verify-email');
          setAuthLoading(false);
          return;
        }
        setUser(firebaseUser);
      } else {
        // Auth state resolved and there is no user — redirect to login.
        router.push(redirectTo);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [redirectTo, router]);

  return { authLoading, user };
}
