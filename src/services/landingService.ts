import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, orderBy, where, onSnapshot, increment, Timestamp } from 'firebase/firestore';
import { LandingPage, LandingPageSubmission } from '@/types/landing';

const COLLECTION_NAME = 'landing_pages';
const SUBMISSIONS_COLLECTION = 'landing_submissions';

export const getLandingPages = async (): Promise<LandingPage[]> => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LandingPage));
};

export const subscribeToLandingPages = (callback: (pages: LandingPage[]) => void) => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const pages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LandingPage));
        callback(pages);
    });
};

export const getLandingPage = async (id: string): Promise<LandingPage | null> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as LandingPage;
    }
    return null;
};

export const createLandingPage = async (page: Omit<LandingPage, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), page);
    return docRef.id;
};

export const updateLandingPage = async (id: string, page: Partial<LandingPage>): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, page);
};

export const deleteLandingPage = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
};

export const getLandingPageBySlug = async (slug: string, locale?: string): Promise<LandingPage | null> => {
    // 1. Initial search by slug (any locale)
    const slugQuery = query(collection(db, COLLECTION_NAME), where('slug', '==', slug));
    const slugSnapshot = await getDocs(slugQuery);

    if (slugSnapshot.empty) return null;

    const initialDocs = slugSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LandingPage));

    // 2. Prioritize precise slug + locale match
    if (locale) {
        const preciseMatch = initialDocs.find(d => d.locale === locale);
        if (preciseMatch) return preciseMatch;
    }

    // 3. Robust Translation lookup via groupId
    // If the slug exists but doesn't match the locale, find related translations in the same group
    const referenceDoc = initialDocs[0];
    if (locale && referenceDoc.groupId) {
        const groupQuery = query(collection(db, COLLECTION_NAME), where('groupId', '==', referenceDoc.groupId));
        const groupSnapshot = await getDocs(groupQuery);
        const groupDocs = groupSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LandingPage));

        // Find the translation for the requested locale within the group
        const groupMatch = groupDocs.find(d => d.locale === locale);
        if (groupMatch) return groupMatch;

        // Fallback within the group to 'ko' (default) or anything available
        const groupFallback = groupDocs.find(d => d.locale === 'ko' || !d.locale) || groupDocs[0];
        return groupFallback;
    }

    // 4. Final Fallbacks for matches with no groupId or no requested locale
    const finalFallback = initialDocs.find(d => d.locale === 'ko' || !d.locale) || initialDocs[0];
    return finalFallback;
};

export const getLandingPageTranslations = async (groupId: string): Promise<LandingPage[]> => {
    const q = query(collection(db, COLLECTION_NAME), where('groupId', '==', groupId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LandingPage));
};

export const getSubmissions = async (pageId?: string): Promise<LandingPageSubmission[]> => {
    const coll = collection(db, SUBMISSIONS_COLLECTION);
    const q = pageId
        ? query(coll, where('pageId', '==', pageId), orderBy('createdAt', 'desc'))
        : query(coll, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LandingPageSubmission));
};

export const createSubmission = async (submission: Omit<LandingPageSubmission, 'id'>): Promise<string> => {
    // 1. Add submission
    const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), submission);

    // 2. Increment conversion stat
    const pageRef = doc(db, COLLECTION_NAME, submission.pageId);
    await updateDoc(pageRef, {
        "stats.conversions": increment(1)
    });

    return docRef.id;
};

export const incrementPageView = async (pageId: string): Promise<void> => {
    const pageRef = doc(db, COLLECTION_NAME, pageId);
    await updateDoc(pageRef, {
        "stats.views": increment(1)
    });
};
