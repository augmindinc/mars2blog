import { db, storage } from '@/lib/firebase';
import { Post, Category } from '@/types/blog';
import { collection, getDocs, query, where, orderBy, limit, Timestamp, doc, deleteDoc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';

const COLLECTION_NAME = 'posts';

// Helper to delete an image from storage using its URL
const deleteStorageImage = async (url: string | undefined) => {
    if (!url || !url.includes('firebasestorage.googleapis.com')) return;
    try {
        const imageRef = ref(storage, url);
        await deleteObject(imageRef);
    } catch (error) {
        console.error("Error deleting image from storage:", error);
    }
};

// Helper to extract image URLs from HTML content
const extractImageUrls = (html: string): string[] => {
    const urls: string[] = [];
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
        if (match[1].includes('firebasestorage.googleapis.com')) {
            urls.push(match[1]);
        }
    }
    return urls;
};

export const getPosts = async (category: Category = 'ALL'): Promise<Post[]> => {
    try {
        let q = query(
            collection(db, COLLECTION_NAME),
            where('status', '==', 'published'),
            where('publishedAt', '<=', Timestamp.now()),
            orderBy('publishedAt', 'desc'),
            limit(20)
        );

        if (category !== 'ALL') {
            q = query(
                collection(db, COLLECTION_NAME),
                where('status', '==', 'published'),
                where('category', '==', category),
                where('publishedAt', '<=', Timestamp.now()),
                orderBy('publishedAt', 'desc'),
                limit(20)
            );
        }

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Post));
    } catch (error) {
        console.error("Error fetching posts:", error);
        return [];
    }
};

// Real-time subscription for public posts
export const subscribeToPosts = (category: Category, callback: (posts: Post[]) => void) => {
    let q = query(
        collection(db, COLLECTION_NAME),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(20)
    );

    if (category !== 'ALL') {
        q = query(
            collection(db, COLLECTION_NAME),
            where('status', '==', 'published'),
            where('category', '==', category),
            orderBy('publishedAt', 'desc'),
            limit(20)
        );
    }

    return onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Post));
        callback(posts);
    }, (error) => {
        console.error("Error subscribing to posts:", error);
    });
};

export const getAdminPosts = async (): Promise<Post[]> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Post));
    } catch (error) {
        console.error("Error fetching admin posts:", error);
        return [];
    }
};

// Real-time subscription for admin posts
export const subscribeToAdminPosts = (callback: (posts: Post[]) => void) => {
    const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Post));
        callback(posts);
    }, (error) => {
        console.error("Error subscribing to admin posts:", error);
    });
};

export const getPost = async (id: string): Promise<Post | null> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Post;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching post:", error);
        return null;
    }
}

export const getPostBySlug = async (slug: string): Promise<Post | null> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('slug', '==', slug),
            limit(1)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as Post;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching post by slug:", error);
        return null;
    }
}
export const getPostByShortCode = async (shortCode: string): Promise<Post | null> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('shortCode', '==', shortCode),
            limit(1)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as Post;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching post by short code:", error);
        return null;
    }
}


export const deletePost = async (id: string) => {
    try {
        // 1. Get post data to find images
        const post = await getPost(id);
        if (post) {
            // 2. Delete thumbnail from storage
            if (post.thumbnail.url) {
                await deleteStorageImage(post.thumbnail.url);
            }

            // 3. Delete content images from storage
            const contentImages = extractImageUrls(post.content);
            await Promise.all(contentImages.map(url => deleteStorageImage(url)));
        }

        // 4. Delete document from Firestore
        await deleteDoc(doc(db, COLLECTION_NAME, id));
        return true;
    } catch (error) {
        console.error("Error deleting post:", error);
        throw error;
    }
}

export const updatePost = async (id: string, data: Partial<Post>) => {
    try {
        // 1. If thumbnail is being updated, delete the old one
        if (data.thumbnail?.url !== undefined) {
            const oldPost = await getPost(id);
            if (oldPost && oldPost.thumbnail?.url && oldPost.thumbnail.url !== data.thumbnail.url) {
                await deleteStorageImage(oldPost.thumbnail.url);
            }
        }

        // 2. Update Firestore document
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, createdAt, ...updateData } = data;

        await updateDoc(doc(db, COLLECTION_NAME, id), {
            ...updateData,
            updatedAt: Timestamp.now()
        });
        return true;
    } catch (error) {
        console.error("Error updating post:", error);
        throw error;
    }
}
