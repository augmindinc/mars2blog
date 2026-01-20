'use client';

import { useCategories } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';
import { useLocale } from 'next-intl';

interface CategoryFilterProps {
    currentCategory: string;
    onSelectCategory: (category: string) => void;
}

export function CategoryFilter({ currentCategory, onSelectCategory }: CategoryFilterProps) {
    const locale = useLocale() as 'en' | 'ko';
    const { data: categories, isLoading } = useCategories();

    if (isLoading) {
        return (
            <div className="flex flex-wrap gap-2 mb-8 justify-center animate-pulse">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-9 w-20 bg-secondary rounded-none border border-black/10" />
                ))}
            </div>
        );
    }

    // Combine "ALL" with dynamic categories
    const allCategories = [
        { id: 'ALL', name: { ko: '전체', en: 'All', ja: 'すべて', zh: '全部' } },
        ...(categories || [])
    ];

    return (
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {allCategories.map((cat) => {
                const id = cat.id === 'ALL' ? 'ALL' : cat.id; // Or use slug
                const label = cat.name[locale] || cat.name['ko'] || id;
                const value = cat.id === 'ALL' ? 'ALL' : cat.id;

                return (
                    <button
                        key={id}
                        onClick={() => onSelectCategory(value)}
                        className={cn(
                            "px-5 py-2 rounded-none text-sm font-medium transition-all duration-200 border",
                            currentCategory === value
                                ? "bg-black text-white border-black"
                                : "bg-white text-black border-black/10 hover:border-black/20 hover:bg-black/[0.02]"
                        )}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}
