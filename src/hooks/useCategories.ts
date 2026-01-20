import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/services/categoryService';
import { CategoryMeta } from '@/types/blog';

export function useCategories() {
    return useQuery<CategoryMeta[]>({
        queryKey: ['categories'],
        queryFn: getCategories,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
