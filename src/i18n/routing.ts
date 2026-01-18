import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
    locales: ['en', 'ko', 'ja', 'zh'],
    defaultLocale: 'ko',
    localePrefix: 'always',
    localeDetection: false
});

export const { Link, redirect, usePathname, useRouter } =
    createNavigation(routing);
