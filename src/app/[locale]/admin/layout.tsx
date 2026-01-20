'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { LayoutDashboard, FileText, Globe, LogOut, Users, Lightbulb, BarChart3, Key, Bot, FolderInput } from 'lucide-react';
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
        { href: '/admin/planning', label: 'Planning', icon: Lightbulb, roles: ['admin', 'author'] },
        { href: '/admin/categories', label: 'Categories', icon: FolderInput, roles: ['admin', 'author'] },
        { href: '/admin/inflow', label: 'Inflow', icon: BarChart3, roles: ['admin', 'author'] },
        { href: '/admin/bots', label: 'Bot Logs', icon: Bot, roles: ['admin', 'author'] },
        { href: '/admin/keywords', label: 'Keywords', icon: Key, roles: ['admin', 'author'] },
        { href: '/admin/members', label: 'Members', icon: Users, roles: ['admin'] },
        { href: '/admin/sitemap', label: 'Sitemap', icon: Globe, roles: ['admin'] },
    ].filter(item => item.roles.includes(profile.role));

    return (
        <div className="min-h-screen flex bg-white font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-black/5 bg-white flex flex-col hidden md:flex shrink-0">
                <div className="p-8 border-b border-black/5">
                    <h1 className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter">
                        <LayoutDashboard className="w-4 h-4" />
                        Management
                    </h1>
                </div>
                <nav className="flex-1 p-6 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === `/${locale}${item.href}` || (item.href === '/admin' && pathname === `/${locale}/admin`);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-none text-[10px] font-bold uppercase tracking-widest transition-all ${isActive
                                    ? 'bg-black text-white'
                                    : 'text-muted-foreground hover:bg-black/[0.02] hover:text-black'
                                    }`}
                            >
                                <item.icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-muted-foreground group-hover:text-black'}`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-6 border-t border-black/5 space-y-6">
                    <div className="px-4">
                        <p className="text-[9px] font-bold text-muted-foreground mb-1 uppercase tracking-widest">Protocol User ({profile?.role})</p>
                        <p className="text-[10px] truncate font-black uppercase tracking-tight text-black">{user?.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-none text-[10px] font-bold uppercase tracking-widest text-black/40 hover:text-white hover:bg-black transition-all"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Terminal Exit
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="md:hidden border-b border-black/5 p-4 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h1 className="text-xs font-black uppercase tracking-tight truncate">Terminal: {navItems.find(n => pathname.includes(n.href))?.label || 'Dashboard'}</h1>
                    <div className="flex gap-4">
                        {navItems.map(item => (
                            <Link key={item.href} href={item.href}><item.icon className="w-4 h-4 text-black/40" /></Link>
                        ))}
                        <button onClick={handleLogout}><LogOut className="w-4 h-4 text-black" /></button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-12 lg:p-16">
                    <div className="max-w-6xl mx-auto h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
