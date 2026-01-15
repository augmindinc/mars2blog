import { db } from '@/lib/firebase';
import { ContentPlan } from '@/types/blog';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp,
    doc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';

const COLLECTION_NAME = 'content_plans';

export const getContentPlans = async (authorId?: string): Promise<ContentPlan[]> => {
    try {
        let q = query(
            collection(db, COLLECTION_NAME),
            orderBy('createdAt', 'desc')
        );

        if (authorId) {
            q = query(
                collection(db, COLLECTION_NAME),
                where('authorId', '==', authorId),
                orderBy('createdAt', 'desc')
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ContentPlan));
    } catch (error) {
        console.error("Error fetching content plans:", error);
        return [];
    }
};

export const createContentPlan = async (plan: Omit<ContentPlan, 'id'>) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), plan);
        return docRef.id;
    } catch (error) {
        console.error("Error creating content plan:", error);
        throw error;
    }
};

export const updateContentPlan = async (id: string, data: Partial<ContentPlan>) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, data);
        return true;
    } catch (error) {
        console.error("Error updating content plan:", error);
        throw error;
    }
};

export const deleteContentPlan = async (id: string) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
        return true;
    } catch (error) {
        console.error("Error deleting content plan:", error);
        throw error;
    }
};
