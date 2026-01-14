'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { LayoutDashboard, FileText, Globe, LogOut, Users } from 'lucide-react';
import { logout } from '@/services/authService';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();

    useEffect(() => {
        if (!loading) {
            if (!user && !pathname.includes('/login')) {
                router.push(`/${locale}/admin/login`);
            } else if (user && profile) {
                // Keep admin check: if admin status becomes pending, logout
                if (profile.role === 'admin' && profile.status === 'pending' && !pathname.includes('/login')) {
                    logout();
                    router.push(`/${locale}/admin/login`);
                }
            }
        }
    }, [user, profile, loading, router, pathname, locale]);

    const handleLogout = async () => {
        await logout();
        router.push(`/${locale}`);
    };

    if (loading) return <div className="flex h-screen items-center justify-center font-medium">Loading...</div>;

    const isLoginPage = pathname.includes('/login');

    if (!user && isLoginPage) {
        return <>{children}</>;
    }

    // If user exists but profile is still loading, wait
    if (user && !profile && !isLoginPage) {
        return <div className="flex h-screen items-center justify-center font-medium">Loading Profile...</div>;
    }

    // Special case: if on login page and have user but profile is pending, let LoginPage show the modal
    if (user && isLoginPage) {
        return <>{children}</>;
    }

    if (!user || !profile) return null;

    // RBAC: Filtering navigation items
    const navItems = [
        { href: '/admin', label: 'Posts', icon: FileText, roles: ['admin', 'author'] },
        { href: '/admin/members', label: 'Members', icon: Users, roles: ['admin'] },
        { href: '/admin/sitemap', label: 'Sitemap', icon: Globe, roles: ['admin'] },
    ].filter(item => item.roles.includes(profile.role));

    return (
        <div className="min-h-screen flex bg-muted/5">
            {/* Sidebar */}
            <aside className="w-64 border-r bg-background flex flex-col hidden md:flex">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-primary" />
                        Admin Panel
                    </h1>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === `/${locale}${item.href}` || (item.href === '/admin' && pathname === `/${locale}/admin`);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                <item.icon className={`w-4 h-4 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-4 border-t space-y-4">
                    <div className="px-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">User ({profile.role})</p>
                        <p className="text-xs truncate font-medium">{user.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="md:hidden border-b p-4 flex justify-between items-center bg-background sticky top-0 z-10">
                    <h1 className="text-lg font-bold truncate">Admin: {navItems.find(n => pathname.includes(n.href))?.label || 'Dashboard'}</h1>
                    <div className="flex gap-2">
                        {navItems.map(item => (
                            <Link key={item.href} href={item.href}><item.icon className="w-5 h-5" /></Link>
                        ))}
                        <button onClick={handleLogout}><LogOut className="w-5 h-5 text-destructive" /></button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-10">
                    <div className="max-w-6xl mx-auto h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
