import { db } from '@/lib/firebase';
import { CategoryMeta, CATEGORY_LABELS } from '@/types/blog';
import {
    collection,
    getDocs,
    query,
    orderBy,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    Timestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'categories';

export const getCategories = async (): Promise<CategoryMeta[]> => {
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);

        // If collection doesn't exist or is empty, return empty (UI can handle initialization)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as CategoryMeta));
    } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
    }
};

export const addCategory = async (data: Omit<CategoryMeta, 'id' | 'createdAt'>) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            createdAt: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding category:", error);
        throw error;
    }
};

export const updateCategory = async (id: string, data: Partial<CategoryMeta>) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, ...updateData } = data;
        await updateDoc(docRef, updateData);
        return true;
    } catch (error) {
        console.error("Error updating category:", error);
        throw error;
    }
};

export const deleteCategory = async (id: string) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
        return true;
    } catch (error) {
        console.error("Error deleting category:", error);
        throw error;
    }
};

/**
 * Initial seed for categories if empty
 */
export const seedCategories = async (initialLabels: Record<string, Record<string, string>>) => {
    const existing = await getCategories();
    if (existing.length > 0) return;

    const entries = Object.entries(initialLabels).filter(([key]) => key !== 'ALL');

    for (let i = 0; i < entries.length; i++) {
        const [key, labels] = entries[i];
        await addCategory({
            name: labels,
            slug: key.toLowerCase(),
            order: i
        });
    }
};

export const getCategoryLabel = async (categoryId: string, locale: string): Promise<string> => {
    try {
        const categories = await getCategories();
        const cat = categories.find(c => c.id === categoryId || c.slug.toUpperCase() === categoryId);
        if (cat) {
            return cat.name[locale] || cat.name['ko'] || cat.name['en'] || categoryId;
        }
        return CATEGORY_LABELS[categoryId]?.[locale] || categoryId;
    } catch (error) {
        return CATEGORY_LABELS[categoryId]?.[locale] || categoryId;
    }
};
