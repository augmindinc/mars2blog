'use client';

import { Link } from '@/i18n/routing';
import { UserMenu } from './UserMenu';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLocale } from 'next-intl';

export function Navbar() {
    const locale = useLocale();

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-black/5 bg-white/80 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="text-xl font-black text-black tracking-tighter">
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
