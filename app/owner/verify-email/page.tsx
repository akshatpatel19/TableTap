'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sendEmailVerification, signOut, onAuthStateChanged, reload } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Mail, CheckCircle, RefreshCw } from 'lucide-react';

export default function VerifyEmailPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                // No user logged in, go to login
                router.replace('/owner/login');
                return;
            }
            if (user.emailVerified) {
                // Already verified, go to dashboard
                router.replace('/owner/dashboard');
                return;
            }
            setUserEmail(user.email);
        });
        return () => unsubscribe();
    }, [router]);

    // Countdown timer for resend cooldown
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const handleResendEmail = async () => {
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('No user found. Please login again.');
            await sendEmailVerification(user);
            setMessage('Verification email sent! Please check your inbox (and spam folder).');
            setResendCooldown(60);
        } catch (err: any) {
            console.error('[verify-email] Resend error:', err);
            if (err.code === 'auth/too-many-requests') {
                setError('Too many requests. Firebase has temporarily blocked further emails. Please wait a few minutes before trying again, or check your spam folder — an email may have already been sent.');
                setResendCooldown(300); // 5-minute cooldown after rate-limit
            } else {
                setError(err.message || 'Failed to send verification email. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCheckVerification = async () => {
        setChecking(true);
        setError(null);
        setMessage(null);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('No user found. Please login again.');
            // Reload user to get the latest emailVerified status from Firebase
            await reload(user);
            if (user.emailVerified) {
                setMessage('Email verified! Redirecting to dashboard…');
                setTimeout(() => router.replace('/owner/dashboard'), 1000);
            } else {
                setError('Email not yet verified. Please click the link in your email first.');
            }
        } catch (err: any) {
            console.error('[verify-email] Check error:', err);
            setError(err.message || 'Failed to check verification status.');
        } finally {
            setChecking(false);
        }
    };

    const handleSignOut = async () => {
        await signOut(auth);
        router.replace('/owner/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-8 text-center">
                <div className="flex justify-center mb-4">
                    <div className="bg-primary/10 p-4 rounded-full">
                        <Mail className="h-10 w-10 text-primary" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-foreground mb-2">Verify Your Email</h1>
                <p className="text-muted-foreground mb-2">
                    We sent a verification link to:
                </p>
                <p className="font-semibold text-foreground mb-6 break-all">{userEmail}</p>

                <p className="text-sm text-muted-foreground mb-8">
                    Click the link in that email to activate your account, then come back here and click{' '}
                    <strong>&ldquo;I&apos;ve Verified My Email&rdquo;</strong>.
                </p>

                {message && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm mb-4">
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        {message}
                    </div>
                )}
                {error && (
                    <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                <div className="space-y-3">
                    <Button
                        onClick={handleCheckVerification}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-auto py-2"
                        disabled={checking}
                    >
                        {checking ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Checking…
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                I&apos;ve Verified My Email
                            </>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleResendEmail}
                        className="w-full h-auto py-2"
                        disabled={loading || resendCooldown > 0}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sending…
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
                            </>
                        )}
                    </Button>

                    <button
                        onClick={handleSignOut}
                        className="w-full text-sm text-muted-foreground hover:text-foreground underline"
                    >
                        Sign out and use a different account
                    </button>
                </div>
            </Card>
        </div>
    );
}
