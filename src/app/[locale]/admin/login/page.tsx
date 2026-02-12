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
            // In Supabase, this triggers a redirect, so we don't handle the result/profile here.
            // The useEffect will handle the "pending" state or redirection after the user returns from Google.
            await loginWithGoogle('admin');
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

            if (res && 'profile' in res && res.profile?.status === 'pending') {
                setShowPendingModal(true);
            } else if (res) {
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
        <div className="flex items-center justify-center min-h-screen bg-white px-4">
            <Card className="w-full max-w-sm rounded-none border border-black/10 shadow-none">
                <CardHeader className="space-y-4 py-8 border-b border-black/5 bg-black/[0.02]">
                    <CardTitle className="text-xl font-bold text-center uppercase tracking-widest">
                        {isLogin ? 'Admin Access' : 'Admin Registration'}
                    </CardTitle>
                    <CardDescription className="text-center text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                        {isLogin
                            ? 'Authenticate to manage your platform'
                            : 'Initialize a new administrative account'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-8 pb-6">
                    {error && (
                        <div className="bg-black text-white text-[10px] p-3 rounded-none text-center font-bold uppercase tracking-widest">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-2">
                                <Label htmlFor="displayName" className="text-[10px] font-bold uppercase tracking-tight">Full Name</Label>
                                <Input
                                    id="displayName"
                                    type="text"
                                    placeholder="Enter your name"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    required={!isLogin}
                                    disabled={isLoading}
                                    className="h-10 rounded-none border-black/10 font-bold"
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-tight">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                className="h-10 rounded-none border-black/10 font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-tight">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className="h-10 rounded-none border-black/10 font-medium"
                            />
                        </div>
                        <Button type="submit" className="w-full h-10 bg-black text-white hover:bg-black/90 rounded-none font-bold text-[10px] uppercase tracking-widest" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isLogin ? 'Sign In' : 'Register Account'}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-black/5" />
                        </div>
                        <div className="relative flex justify-center text-[9px] uppercase tracking-widest">
                            <span className="bg-white px-3 text-muted-foreground font-bold">
                                Authentication Matrix
                            </span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        type="button"
                        className="w-full h-10 rounded-none border-black/10 font-bold text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                    >
                        <svg className="mr-2.5 h-3.5 w-3.5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                        </svg>
                        Google Authentication
                    </Button>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4 border-t border-black/5 bg-black/[0.01] py-6">
                    <div className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-tight">
                        {isLogin ? "Need admin privileges?" : "Identity already verified?"}{' '}
                        <button
                            type="button"
                            className="text-black hover:underline font-black"
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? 'Apply' : 'Login'}
                        </button>
                    </div>
                </CardFooter>
            </Card>

            <Dialog open={showPendingModal} onOpenChange={(open) => !open && handleCloseModal()}>
                <DialogContent className="sm:max-w-md rounded-none border-black/20 shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-6 bg-black/[0.02] border-b border-black/5">
                        <DialogTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            <AlertTriangle className="w-4 h-4" />
                            Approval Pending
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6 space-y-6">
                        <p className="text-xs font-medium leading-relaxed text-muted-foreground uppercase tracking-tight">
                            Your admin account has been created successfully, but it requires manual approval from a super administrator before dashboard access is granted.
                        </p>
                        <div className="bg-black/[0.02] p-5 border border-black/5 rounded-none flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-black shrink-0 mt-0.5" />
                            <div className="text-[10px] uppercase font-bold tracking-tight">
                                <p className="text-black">Protocol Status:</p>
                                <ul className="mt-2 space-y-1.5 text-muted-foreground">
                                    <li>• Supervisor review in progress</li>
                                    <li>• Access tokens will be activated post-approval</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="p-6 bg-black/[0.02] border-t border-black/5">
                        <Button type="button" className="w-full bg-black text-white hover:bg-black/90 rounded-none font-bold text-[10px] uppercase tracking-widest h-10" onClick={handleCloseModal}>
                            Understood
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
