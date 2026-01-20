'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminPosts, deletePost, subscribeToAdminPosts, bulkUpdateCategory } from '@/services/blogService';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Link } from '@/i18n/routing';
import { format } from 'date-fns';
import { CATEGORY_LABELS, Category } from '@/types/blog';
import { useLocale } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, AlertCircle, Search, FolderInput, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function AdminDashboardPage() {
    const locale = useLocale() as 'en' | 'ko';
    const queryClient = useQueryClient();

    const [postToDelete, setPostToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [targetCategory, setTargetCategory] = useState<Category | ''>('');
    const [isUpdating, setIsUpdating] = useState(false);

    const { data: posts, isLoading } = useQuery({
        queryKey: ['admin-posts'],
        queryFn: getAdminPosts,
    });

    const filteredPosts = posts?.filter(post =>
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.author.name.toLowerCase().includes(search.toLowerCase()) ||
        (CATEGORY_LABELS[post.category]?.[locale] || post.category).toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        const unsubscribe = subscribeToAdminPosts((newPosts) => {
            queryClient.setQueryData(['admin-posts'], newPosts);
        });
        return () => unsubscribe();
    }, [queryClient]);

    const deleteMutation = useMutation({
        mutationFn: deletePost,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            setPostToDelete(null);
            setIsDeleting(false);
        },
        onError: () => {
            alert('Failed to delete post');
            setIsDeleting(false);
        }
    });

    const handleDeleteConfirm = async () => {
        if (postToDelete) {
            setIsDeleting(true);
            deleteMutation.mutate(postToDelete);
        }
    };

    const handleBulkUpdate = async () => {
        if (selectedIds.length > 0 && targetCategory) {
            setIsUpdating(true);
            try {
                await bulkUpdateCategory(selectedIds, targetCategory as Category);
                setSelectedIds([]);
                setTargetCategory('');
                queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
            } catch (error) {
                alert('Failed to update categories');
            } finally {
                setIsUpdating(false);
            }
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredPosts?.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredPosts?.map(p => p.id) || []);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    if (isLoading) return <div className="p-8 text-center text-muted-foreground font-medium animate-pulse">Loading posts...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Posts ({filteredPosts?.length || 0})</h2>
                    <p className="text-muted-foreground text-sm">Manage and organize your blog content.</p>
                </div>

                <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search posts..."
                            className="pl-9 h-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Link href="/write" className="w-full sm:w-auto">
                        <Button type="button" className="w-full shadow-sm">
                            <Plus className="w-4 h-4 mr-2" /> New Post
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-primary text-primary-foreground px-2">
                            {selectedIds.length} Selected
                        </Badge>
                        <span className="text-sm font-medium">Bulk Action: Move to Category</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select value={targetCategory} onValueChange={(val) => setTargetCategory(val as Category)}>
                            <SelectTrigger className="w-full sm:w-40 bg-background">
                                <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(CATEGORY_LABELS)
                                    .filter(([key]) => key !== 'ALL')
                                    .map(([key, labels]) => (
                                        <SelectItem key={key} value={key}>
                                            {labels[locale] || key}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        <Button
                            size="sm"
                            onClick={handleBulkUpdate}
                            disabled={!targetCategory || isUpdating}
                            className="whitespace-nowrap"
                        >
                            {isUpdating ? 'Updating...' : <><Check className="w-4 h-4 mr-1" /> Move</>}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            <div className="bg-background rounded-md border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]">
                                <Checkbox
                                    checked={selectedIds.length > 0 && selectedIds.length === filteredPosts?.length}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Author</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Scheduled At</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead className="text-right">Views</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPosts?.map((post) => (
                            <TableRow key={post.id} className={selectedIds.includes(post.id) ? 'bg-primary/5' : ''}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedIds.includes(post.id)}
                                        onCheckedChange={() => toggleSelect(post.id)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium max-w-[300px] truncate" title={post.title}>
                                    <Link href={`/admin/posts/${post.id}`} className="hover:underline text-primary">
                                        {post.title}
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="font-normal">
                                        {CATEGORY_LABELS[post.category]?.[locale] || post.category}
                                    </Badge>
                                </TableCell>
                                <TableCell>{post.author.name}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${post.status === 'published'
                                        ? 'bg-green-100 text-green-800'
                                        : post.status === 'scheduled'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {post.status.toUpperCase()}
                                    </span>
                                </TableCell>
                                <TableCell className="text-sm">
                                    {post.status === 'scheduled' && post.publishedAt?.seconds
                                        ? format(new Date(post.publishedAt.seconds * 1000), 'yyyy.MM.dd HH:mm')
                                        : '-'}
                                </TableCell>
                                <TableCell className="text-sm">
                                    {post.createdAt?.seconds
                                        ? format(new Date(post.createdAt.seconds * 1000), 'yyyy.MM.dd HH:mm')
                                        : '-'}
                                </TableCell>
                                <TableCell className="text-right font-bold text-primary">
                                    {post.viewCount.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Link href={`/admin/posts/${post.id}/edit`}>
                                            <Button variant="ghost" size="icon" type="button">
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            type="button"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setPostToDelete(post.id);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {posts && posts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    No posts found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-destructive" />
                            Delete Post
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this post? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
