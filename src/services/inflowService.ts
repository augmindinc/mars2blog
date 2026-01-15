import { db } from '@/lib/firebase';
import { InflowLog } from '@/types/blog';
import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    Timestamp,
    where
} from 'firebase/firestore';

const COLLECTION_NAME = 'inflow_logs';

export const logInflow = async (log: Omit<InflowLog, 'id'>) => {
    try {
        await addDoc(collection(db, COLLECTION_NAME), log);
    } catch (error) {
        console.error("Error logging inflow:", error);
    }
};

export const getInflowLogs = async (max: number = 100): Promise<InflowLog[]> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            orderBy('createdAt', 'desc'),
            limit(max)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as InflowLog));
    } catch (error) {
        console.error("Error fetching inflow logs:", error);
        return [];
    }
};

// 특정 게시글의 유입 로그만 가져오기
export const getInflowLogsByPost = async (postId: string): Promise<InflowLog[]> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('postId', '==', postId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as InflowLog));
    } catch (error) {
        console.error("Error fetching inflow logs by post:", error);
        return [];
    }
};
