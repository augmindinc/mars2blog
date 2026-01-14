'use client';

import { Link } from '@/i18n/routing';
import { UserMenu } from './UserMenu';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLocale } from 'next-intl';

export function Navbar() {
    const locale = useLocale();

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent tracking-tighter">
                            MARS2BLOG
                        </span>
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <LanguageSwitcher />
                    <UserMenu />
                </div>
            </div>
        </nav>
    );
}
