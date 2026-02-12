'use client';

import { useAuth } from '@/context/AuthContext';
import { logout } from '@/services/authService';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { User, LogOut, LayoutDashboard, LogIn, UserPlus } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

export function UserMenu() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const locale = useLocale();

    const handleLogout = async () => {
        await logout();
        router.push(`/${locale}`);
    };

    if (loading) return <div className="w-8 h-8 rounded-none bg-black/[0.05] animate-pulse" />;

    if (!user) {
        return (
            <div className="flex items-center gap-2">
                <Link href="/login">
                    <Button variant="ghost" size="sm" className="rounded-none font-bold text-[10px] uppercase tracking-widest hover:bg-black/[0.05] px-4">
                        <LogIn className="w-3.5 h-3.5 mr-1" />
                        Login
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-none border border-black/10 bg-background overflow-hidden hover:bg-black/[0.05]">
                    {profile?.photoURL ? (
                        <img src={profile.photoURL} alt={profile.displayName || 'User'} className="h-full w-full object-cover grayscale" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-black/[0.02] text-black/40">
                            <User className="h-4 w-4" />
                        </div>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-none border-black/10 p-0 overflow-hidden shadow-2xl">
                <DropdownMenuLabel className="font-normal p-4 bg-black/[0.02] border-b border-black/5">
                    <div className="flex flex-col space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest leading-none text-black">{profile?.displayName || 'User'}</p>
                        <p className="text-[9px] font-bold uppercase tracking-tight leading-none text-muted-foreground mt-1">{user.email}</p>
                    </div>
                </DropdownMenuLabel>
                <div className="p-1">
                    <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer flex items-center p-3 text-[10px] font-bold uppercase tracking-widest hover:bg-black/[0.05] focus:bg-black/[0.05] focus:text-black transition-colors">
                            <LayoutDashboard className="mr-2 h-3.5 w-3.5" />
                            <span>Dashboard</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-black/5" />
                    <DropdownMenuItem
                        className="cursor-pointer flex items-center p-3 text-[10px] font-bold uppercase tracking-widest hover:bg-black/[0.05] focus:bg-black/[0.05] focus:text-black transition-colors"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 h-3.5 w-3.5" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
