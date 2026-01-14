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
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function PublicLoginPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const locale = useLocale();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!authLoading && user) {
            router.push(`/${locale}`);
        }
    }, [user, authLoading, router, locale]);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            await loginWithGoogle('author');
            router.push(`/${locale}`);
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
            if (isLogin) {
                await loginWithEmail(email, password);
            } else {
                if (!displayName) {
                    throw new Error('Name is required');
                }
                await registerWithEmail(email, password, displayName, 'author');
            }
            router.push(`/${locale}`);
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 px-4 py-8">
            <div className="w-full max-w-md mb-6">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Mars2Blog
                </Link>
            </div>

            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
                        <path d="M12 12L2.1 12"></path>
                        <path d="M12 12L22 12"></path>
                        <path d="M12 12v10"></path>
                    </svg>
                </div>

                <CardHeader className="space-y-1 pb-8">
                    <CardTitle className="text-3xl font-extrabold text-center tracking-tight">
                        {isLogin ? 'Welcome Back' : 'Join Mars2Blog'}
                    </CardTitle>
                    <CardDescription className="text-center text-base">
                        {isLogin
                            ? 'Sign in to your account'
                            : 'Create a free account to get started'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-lg text-center font-medium animate-in fade-in slide-in-from-top-2 duration-300">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-2">
                                <Label htmlFor="displayName">Display Name</Label>
                                <Input
                                    id="displayName"
                                    type="text"
                                    placeholder="Your Public Name"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    required={!isLogin}
                                    disabled={isLoading}
                                    className="h-12 bg-background/50 focus:bg-background transition-colors"
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
                                className="h-12 bg-background/50 focus:bg-background transition-colors"
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
                                className="h-12 bg-background/50 focus:bg-background transition-colors"
                            />
                        </div>
                        <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isLogin ? 'Sign In' : 'Sign Up Free'}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-muted-foreground/20" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-4 text-muted-foreground font-semibold">
                                Or Continue with
                            </span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        type="button"
                        className="w-full h-12 font-bold bg-background hover:bg-muted/50 transition-all border-2"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                    >
                        <svg className="mr-3 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                        </svg>
                        Continue with Google
                    </Button>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4 border-t bg-muted/5 pt-6 pb-8">
                    <div className="text-sm text-center text-muted-foreground font-medium">
                        {isLogin ? "New to Mars2Blog?" : "Already have an account?"}{' '}
                        <button
                            type="button"
                            className="text-primary hover:underline font-extrabold ml-1"
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? 'Create an account' : 'Sign in'}
                        </button>
                    </div>
                </CardFooter>
            </Card>

            <p className="mt-8 text-center text-xs text-muted-foreground max-w-sm">
                By continuing, you agree to Mars2Blog's <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
            </p>
        </div>
    );
}
