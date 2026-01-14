import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'author';
export type UserStatus = 'pending' | 'approved';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string | null;
    role: UserRole;
    status: UserStatus;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
