import { auth, db } from '@/lib/firebase';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    User
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { UserRole, UserProfile, UserStatus } from '@/types/user';

const COLLECTION_USERS = 'users';

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    const docRef = doc(db, COLLECTION_USERS, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
    }
    return null;
};

export const registerWithEmail = async (email: string, password: string, displayName: string, role: UserRole = 'author') => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });

        // Create user profile in Firestore
        const status: UserStatus = role === 'admin' ? 'pending' : 'approved';
        const userProfile: UserProfile = {
            uid: result.user.uid,
            email,
            displayName,
            photoURL: result.user.photoURL ?? null,
            role,
            status,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        await setDoc(doc(db, COLLECTION_USERS, result.user.uid), userProfile);

        await setDoc(doc(db, COLLECTION_USERS, result.user.uid), userProfile);

        return { user: result.user, profile: userProfile };
    } catch (error) {
        console.error("Registration failed", error);
        throw error;
    }
};

export const loginWithEmail = async (email: string, password: string) => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const profile = await getUserProfile(result.user.uid);

        return { user: result.user, profile };
    } catch (error) {
        console.error("Email login failed", error);
        throw error;
    }
};

export const loginWithGoogle = async (requestedRole: UserRole = 'author') => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
        let result;
        try {
            result = await signInWithPopup(auth, provider);
        } catch (popupError: any) {
            // Fallback to redirect if popup is blocked or fails due to COOP
            if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user' || popupError.code === 'auth/cancelled-popup-request') {
                return await signInWithRedirect(auth, provider);
            }
            throw popupError;
        }

        if (!result) return null;

        let profile = await getUserProfile(result.user.uid);

        if (!profile) {
            // New user via Google
            const status: UserStatus = requestedRole === 'admin' ? 'pending' : 'approved';
            profile = {
                uid: result.user.uid,
                email: result.user.email || '',
                displayName: result.user.displayName || 'User',
                photoURL: result.user.photoURL ?? null,
                role: requestedRole,
                status,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };
            await setDoc(doc(db, COLLECTION_USERS, result.user.uid), profile);
        }

        return { user: result.user, profile };
    } catch (error) {
        console.error("Google login failed", error);
        throw error;
    }
};

export const handleRedirectResult = async () => {
    try {
        const result = await getRedirectResult(auth);
        if (result) {
            return result.user;
        }
    } catch (error) {
        console.error("Redirect result error", error);
    }
    return null;
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed", error);
        throw error;
    }
};
