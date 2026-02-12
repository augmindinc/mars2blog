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
            // Redirect is handled by Supabase OAuth.
            // Presence of 'user' will trigger the useEffect for local redirection.
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4 py-8 text-start">
            <div className="w-full max-w-sm mb-8">
                <Link href="/" className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-black transition-colors">
                    <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                    Back to Mars2Blog
                </Link>
            </div>

            <Card className="w-full max-w-sm rounded-none border border-black/10 shadow-none overflow-hidden">
                <CardHeader className="space-y-4 py-8 border-b border-black/5 bg-black/[0.02]">
                    <CardTitle className="text-xl font-bold text-center uppercase tracking-widest">
                        {isLogin ? 'Access Portal' : 'Join Platform'}
                    </CardTitle>
                    <CardDescription className="text-center text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                        {isLogin
                            ? 'Authenticate to proceed'
                            : 'Initialize your reader profile'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-8 pb-6">
                    {error && (
                        <div className="bg-black text-white text-[10px] p-4 rounded-none text-center font-bold uppercase tracking-widest">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-2">
                                <Label htmlFor="displayName" className="text-[10px] font-bold uppercase tracking-tight">Display Name</Label>
                                <Input
                                    id="displayName"
                                    type="text"
                                    placeholder="Your Public Identity"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    required={!isLogin}
                                    disabled={isLoading}
                                    className="h-10 rounded-none border-black/10 font-bold bg-transparent"
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
                                className="h-10 rounded-none border-black/10 font-bold bg-transparent"
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
                                className="h-10 rounded-none border-black/10 font-medium bg-transparent"
                            />
                        </div>
                        <Button type="submit" className="w-full h-10 bg-black text-white hover:bg-black/90 rounded-none font-bold text-[10px] uppercase tracking-widest transition-all" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isLogin ? 'Sign In' : 'Establish Account'}
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
                        className="w-full h-10 rounded-none border-black/10 font-bold text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all bg-transparent"
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
                        {isLogin ? "New instance?" : "Already initialized?"}{' '}
                        <button
                            type="button"
                            className="text-black hover:underline font-black ml-1"
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? 'Create Profile' : 'Authenticate'}
                        </button>
                    </div>
                </CardFooter>
            </Card>

            <p className="mt-12 text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground max-w-xs leading-loose">
                Engagement signifies consent to <span className="text-black underline cursor-pointer">Protocol Terms</span> and <span className="text-black underline cursor-pointer">Privacy Matrix</span>.
            </p>
        </div>
    );
}
