'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname, routing } from '@/i18n/routing';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
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
                <Button variant="ghost" size="icon" className="w-9 h-9 rounded-none hover:bg-black/[0.05]">
                    <Languages className="h-4 w-4" />
                    <span className="sr-only">Toggle language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none border-black/10 min-w-[120px]">
                {routing.locales.map((l) => (
                    <DropdownMenuItem
                        key={l}
                        onClick={() => handleLocaleChange(l)}
                        className={cn(
                            "text-[10px] font-bold uppercase tracking-widest cursor-pointer",
                            locale === l ? "bg-black text-white focus:bg-black focus:text-white" : "hover:bg-black/[0.05]"
                        )}
                    >
                        {l === 'ko' ? '한국어' : l === 'en' ? 'English' : l === 'ja' ? '日本語' : '中文'}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
