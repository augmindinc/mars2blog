'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { UserProfile, UserRole, UserStatus } from '@/types/user';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { Shield, User, CheckCircle, XCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function MembersPage() {
    const { profile } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const userData = querySnapshot.docs.map(doc => doc.data() as UserProfile);
            setUsers(userData);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (profile?.role === 'admin') {
            fetchUsers();
        }
    }, [profile]);

    const handleUpdateStatus = async (uid: string, newStatus: UserStatus) => {
        try {
            await updateDoc(doc(db, 'users', uid), {
                status: newStatus,
                updatedAt: new Date()
            });
            // Update local state
            setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus } : u));
        } catch (error) {
            alert("Failed to update status");
        }
    };

    const handleUpdateRole = async (uid: string, newRole: UserRole) => {
        try {
            await updateDoc(doc(db, 'users', uid), {
                role: newRole,
                updatedAt: new Date()
            });
            // Update local state
            setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
        } catch (error) {
            alert("Failed to update role");
        }
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.displayName.toLowerCase().includes(search.toLowerCase())
    );

    if (profile?.role !== 'admin') {
        return <div className="p-8 text-center text-destructive font-bold text-xl uppercase tracking-widest">Access Denied</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <User className="w-6 h-6 text-primary" />
                        Member Management
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Manage user roles and approve admin registrations.
                    </p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search members..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12">Loading members...</TableCell>
                            </TableRow>
                        ) : filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No members found</TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.uid}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                                {user.photoURL ? (
                                                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-4 h-4 text-primary" />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm">{user.displayName}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                                {user.role.toUpperCase()}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-1 text-[10px]"
                                                onClick={() => handleUpdateRole(user.uid, user.role === 'admin' ? 'author' : 'admin')}
                                            >
                                                Switch
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.status === 'approved' ? 'success' : 'warning' as any}>
                                            {user.status.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {user.createdAt ? format(user.createdAt.toDate(), 'yyyy-MM-dd') : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {user.status === 'pending' ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 gap-1 border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                                                onClick={() => handleUpdateStatus(user.uid, 'approved')}
                                            >
                                                <CheckCircle className="w-3 h-3" />
                                                Approve
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 gap-1 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30"
                                                onClick={() => handleUpdateStatus(user.uid, 'pending')}
                                            >
                                                <XCircle className="w-3 h-3" />
                                                Suspend
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
