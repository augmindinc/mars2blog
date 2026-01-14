'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithGoogle, loginWithEmail, registerWithEmail } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from 'next-intl';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { logout } from '@/services/authService';

export default function LoginPage() {
    const router = useRouter();
    const { user, profile, loading: authLoading } = useAuth();
    const locale = useLocale();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPendingModal, setShowPendingModal] = useState(false);

    useEffect(() => {
        if (!authLoading && user && profile) {
            if (profile.role === 'admin' && profile.status === 'pending') {
                setShowPendingModal(true);
            } else {
                router.push(`/${locale}/admin`);
            }
        }
    }, [user, profile, authLoading, router, locale]);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            const result = await loginWithGoogle('admin');
            if (result?.profile?.status === 'pending') {
                setShowPendingModal(true);
            } else if (result) {
                router.push(`/${locale}/admin`);
            }
        } catch (err: any) {
            setError(err.message || 'Google login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            let res;
            if (isLogin) {
                res = await loginWithEmail(email, password);
            } else {
                if (!displayName) {
                    throw new Error('Name is required');
                }
                res = await registerWithEmail(email, password, displayName, 'admin');
            }

            if (res.profile?.status === 'pending') {
                setShowPendingModal(true);
            } else {
                router.push(`/${locale}/admin`);
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseModal = async () => {
        setShowPendingModal(false);
        await logout();
        router.push(`/${locale}`);
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/30 px-4">
            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">
                        {isLogin ? 'Admin Login' : 'Admin Registration'}
                    </CardTitle>
                    <CardDescription className="text-center">
                        {isLogin
                            ? 'Manage your blog with admin access'
                            : 'Sign up for a new admin account'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md text-center font-medium animate-in fade-in zoom-in duration-200">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-2">
                                <Label htmlFor="displayName">Full Name</Label>
                                <Input
                                    id="displayName"
                                    type="text"
                                    placeholder="John Doe"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    required={!isLogin}
                                    disabled={isLoading}
                                    className="h-11"
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className="h-11"
                            />
                        </div>
                        <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isLogin ? 'Sign In' : 'Create Admin Account'}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground font-medium">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        type="button"
                        className="w-full h-11 font-medium bg-background"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                    >
                        <svg className="mr-3 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                        </svg>
                        Google Admin Login
                    </Button>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4 border-t bg-muted/10 pt-4">
                    <div className="text-sm text-center text-muted-foreground font-medium">
                        {isLogin ? "Need admin access?" : "Already have an account?"}{' '}
                        <button
                            type="button"
                            className="text-primary hover:underline font-bold"
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? 'Sign up' : 'Login'}
                        </button>
                    </div>
                </CardFooter>
            </Card>

            {/* Pending Approval Modal */}
            <Dialog open={showPendingModal} onOpenChange={(open) => !open && handleCloseModal()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                            Approval Pending
                        </DialogTitle>
                        <DialogDescription className="text-base pt-2">
                            Your admin account has been created successfully, but it requires manual approval from a super administrator before you can access the dashboard.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-3 mt-4">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-semibold">Next Steps:</p>
                            <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                                <li>The administrator will review your request.</li>
                                <li>You will be able to log in once approved.</li>
                            </ul>
                        </div>
                    </div>
                    <DialogFooter className="mt-6">
                        <Button type="button" className="w-full" onClick={handleCloseModal}>
                            Understood
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
