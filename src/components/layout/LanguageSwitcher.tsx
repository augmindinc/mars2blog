'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname, routing } from '@/i18n/routing';
import { useLanguage } from '@/context/LanguageContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const { translations } = useLanguage();

    const handleLocaleChange = (newLocale: string) => {
        // If we are on a blog post page, we might need a different slug
        const isBlogPost = pathname.includes('/blog/');

        if (isBlogPost && translations[newLocale]) {
            router.push(`/blog/${translations[newLocale]}`, { locale: newLocale as any });
        } else {
            router.push(pathname, { locale: newLocale as any });
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full">
                    <Languages className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
                    <span className="sr-only">Toggle language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {routing.locales.map((l) => (
                    <DropdownMenuItem
                        key={l}
                        onClick={() => handleLocaleChange(l)}
                        className={locale === l ? "bg-accent font-bold" : ""}
                    >
                        {l === 'ko' ? '한국어' : l === 'en' ? 'English' : l === 'ja' ? '日本語' : '中文'}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
