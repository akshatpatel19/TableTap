'use client';

import React from "react"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCafeByEmail } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);

    // Staff login state
    const [cafeCode, setCafeCode] = useState('');
    const [staffPassword, setStaffPassword] = useState('');
    const [staffLoading, setStaffLoading] = useState(false);

    // Force clear any active sessions upon hitting the login screen (e.g., via browser "back" button)
    useEffect(() => {
        const clearSessions = async () => {
            try {
                // Clear any stored client side references
                localStorage.removeItem('current_cafe_id');
                // Destroy active firebase auth states to prevent "back" button into dashboard bypassing auth listeners
                await signOut(auth);
            } catch (err) {
                console.error('[v0] Error clearing existing session on login mount:', err);
            }
        };

        clearSessions();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Sign in with Firebase
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            // Block unverified users
            if (!userCredential.user.emailVerified) {
                setError('Please verify your email. Redirecting to verification page...');
                setLoading(false);
                // Give user a moment to read the message, then redirect to verify-email page
                setTimeout(() => router.push('/owner/verify-email'), 1500);
                return;
            }

            // Get cafe information
            const cafe = await getCafeByEmail(email);
            if (cafe) {
                localStorage.setItem('current_cafe_id', cafe.id);
            }

            // Redirect to owner dashboard
            router.push('/owner/dashboard');
        } catch (err: any) {
            console.error('[v0] Login error:', err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('Invalid email or password');
            } else {
                setError(err.message || 'Failed to login. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStaffLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setStaffLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/staff/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cafeCode: cafeCode.toUpperCase(), password: staffPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to login');
            }

            // Successful login
            localStorage.setItem('current_cafe_id', data.cafeId);
            router.push(`/${data.cafeSlug}/staff/dashboard`);

        } catch (err: any) {
            console.error('[v0] Staff login error:', err);
            setError(err.message || 'Failed to login. Please try again.');
        } finally {
            setStaffLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetLoading(true);
        setError(null);
        setResetSuccess(false);

        try {
            if (!resetEmail) {
                setError('Please enter your email address');
                setResetLoading(false);
                return;
            }

            await sendPasswordResetEmail(auth, resetEmail);
            setResetSuccess(true);
            setResetEmail('');
            // Auto close after 3 seconds
            setTimeout(() => {
                setShowForgotPassword(false);
                setResetSuccess(false);
            }, 3000);
        } catch (err: any) {
            console.error('[v0] Password reset error:', err);
            if (err.code === 'auth/user-not-found') {
                setError('No account found with this email address');
            } else {
                setError(err.message || 'Failed to send reset email. Please try again.');
            }
        } finally {
            setResetLoading(false);
        }
    };

    if (showForgotPassword) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
                <Card className="w-full max-w-md p-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2 text-center">Reset Password</h1>
                    <p className="text-center text-muted-foreground mb-8">Enter your email to receive a password reset link</p>

                    <form onSubmit={handleForgotPassword} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                            <input
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
                                required
                                disabled={resetLoading}
                            />
                        </div>

                        {error && <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}

                        {resetSuccess && (
                            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                                Password reset email sent! Check your inbox and follow the link to reset your password.
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 h-auto"
                            disabled={resetLoading}
                        >
                            {resetLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                'Send Reset Link'
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                setShowForgotPassword(false);
                                setError(null);
                                setResetEmail('');
                            }}
                        >
                            Back to Login
                        </Button>
                    </form>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-8">
                <h1 className="text-3xl font-bold text-foreground mb-2 text-center">Welcome Back</h1>
                <p className="text-center text-muted-foreground mb-8">Login to TableTap</p>

                <Tabs defaultValue="owner" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="owner">Owner Login</TabsTrigger>
                        <TabsTrigger value="staff">Staff Login</TabsTrigger>
                    </TabsList>

                    {error && <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm mb-4">{error}</div>}

                    <TabsContent value="owner">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 h-auto"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Logging in...
                                    </>
                                ) : (
                                    'Login as Owner'
                                )}
                            </Button>

                            <button
                                type="button"
                                onClick={() => setShowForgotPassword(true)}
                                className="w-full text-center text-sm text-primary hover:underline font-semibold"
                            >
                                Forgot Password?
                            </button>

                            <p className="text-center text-sm text-muted-foreground mt-6">
                                Don&apos;t have an account?{' '}
                                <Link href="/owner/register" className="text-primary hover:underline font-semibold">
                                    Register here
                                </Link>
                            </p>
                        </form>
                    </TabsContent>

                    <TabsContent value="staff">
                        <form onSubmit={handleStaffLogin} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Cafe Code</label>
                                <input
                                    type="text"
                                    value={cafeCode}
                                    onChange={(e) => setCafeCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. A10239"
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground font-mono"
                                    required
                                    disabled={staffLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Staff Password</label>
                                <input
                                    type="password"
                                    value={staffPassword}
                                    onChange={(e) => setStaffPassword(e.target.value)}
                                    placeholder="Enter staff password"
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
                                    required
                                    disabled={staffLoading}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 h-auto"
                                disabled={staffLoading}
                            >
                                {staffLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    'Login as Staff'
                                )}
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </Card>
        </div>
    );
}
