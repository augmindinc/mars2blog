'use client';

import { Category, CATEGORY_LABELS } from '@/types/blog';
import { cn } from '@/lib/utils';
import { useLocale } from 'next-intl';

interface CategoryFilterProps {
    currentCategory: Category;
    onSelectCategory: (category: Category) => void;
}

export function CategoryFilter({ currentCategory, onSelectCategory }: CategoryFilterProps) {
    const locale = useLocale() as 'en' | 'ko';

    const categories: Category[] = ['ALL', 'PLANNING', 'SHOPPING', 'COOKING', 'TRAVEL', 'ISSUE', 'ESSAY'];

    return (
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => onSelectCategory(cat)}
                    className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                        currentCategory === cat
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                >
                    {CATEGORY_LABELS[cat][locale]}
                </button>
            ))}
        </div>
    );
}
