'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminPosts, deletePost, subscribeToAdminPosts, bulkUpdateCategory } from '@/services/blogService';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Link } from '@/i18n/routing';
import { format } from 'date-fns';
import { CATEGORY_LABELS, CategoryMeta, Category } from '@/types/blog';
import { useLocale } from 'next-intl';
import { useCategories } from '@/hooks/useCategories';
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
    const { data: categories } = useCategories();

    const [postToDelete, setPostToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [targetCategory, setTargetCategory] = useState<string | ''>('');
    const [isUpdating, setIsUpdating] = useState(false);

    const { data: posts, isLoading } = useQuery({
        queryKey: ['admin-posts'],
        queryFn: getAdminPosts,
    });

    const filteredPosts = posts?.filter(post => {
        const dynamicCat = categories?.find(c => c.id === post.category || c.slug.toUpperCase() === post.category);
        const catLabel = dynamicCat
            ? (dynamicCat.name[locale] || dynamicCat.name['ko'])
            : (CATEGORY_LABELS[post.category]?.[locale] || post.category);

        return (
            post.title.toLowerCase().includes(search.toLowerCase()) ||
            post.author.name.toLowerCase().includes(search.toLowerCase()) ||
            catLabel.toLowerCase().includes(search.toLowerCase())
        );
    });

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

    if (isLoading) return <div className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Initializing Dashboard Data...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter">Posts ({filteredPosts?.length || 0})</h2>
                    <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground mt-1">Platform Content Architecture & Management</p>
                </div>

                <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-3">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            placeholder="SEARCH PROJECT..."
                            className="pl-9 h-10 rounded-none border-black/10 text-[10px] font-bold uppercase tracking-widest bg-black/[0.02]"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Link href="/write" className="w-full sm:w-auto">
                        <Button type="button" className="w-full h-10 bg-black text-white hover:bg-black/90 rounded-none font-bold text-[10px] uppercase tracking-widest px-6 shadow-none">
                            <Plus className="w-3.5 h-3.5 mr-2" /> New Entry
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="bg-black text-white p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 rounded-none">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="px-2 border-white/20 text-white font-bold text-[9px] rounded-none uppercase">
                            {selectedIds.length} SELECTED
                        </Badge>
                        <span className="text-[10px] font-bold uppercase tracking-widest">BULK PROTOCOL: REASSIGN CATEGORY</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select value={targetCategory} onValueChange={(val) => setTargetCategory(val)}>
                            <SelectTrigger className="w-full sm:w-44 bg-white text-black rounded-none border-none h-9 text-[10px] font-bold uppercase tracking-widest">
                                <SelectValue placeholder="CHOOSE CATEGORY" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-black/10">
                                {categories?.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.slug.toUpperCase()} className="text-[10px] font-bold uppercase tracking-widest cursor-pointer">
                                        {cat.name[locale] || cat.name['ko'] || cat.id}
                                    </SelectItem>
                                ))}
                                {(!categories || categories.length === 0) &&
                                    Object.keys(CATEGORY_LABELS).map((cat) => (
                                        cat !== 'ALL' && (
                                            <SelectItem key={cat} value={cat} className="text-[10px] font-bold uppercase tracking-widest cursor-pointer">
                                                {CATEGORY_LABELS[cat]?.[locale] || cat}
                                            </SelectItem>
                                        )
                                    ))
                                }
                            </SelectContent>
                        </Select>
                        <Button
                            size="sm"
                            onClick={handleBulkUpdate}
                            disabled={!targetCategory || isUpdating}
                            className="h-9 whitespace-nowrap bg-white text-black hover:bg-white/90 rounded-none font-bold text-[10px] uppercase tracking-widest px-6 border-none"
                        >
                            {isUpdating ? 'PROCESSING...' : 'EXECUTE'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="h-9 text-white hover:bg-white/10 rounded-none font-bold text-[10px] uppercase tracking-widest hover:text-white">
                            ABORT
                        </Button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-none border border-black/10 overflow-hidden shadow-none">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-black/[0.02] border-black/5">
                            <TableHead className="w-[50px] py-4">
                                <Checkbox
                                    checked={selectedIds.length > 0 && selectedIds.length === filteredPosts?.length}
                                    onCheckedChange={toggleSelectAll}
                                    className="rounded-none border-black/20 data-[state=checked]:bg-black data-[state=checked]:border-black"
                                />
                            </TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Entry Title</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Category</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Author</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Protocol Status</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Execution Date</TableHead>
                            <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Engagement</TableHead>
                            <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-6">Operations</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPosts?.map((post) => {
                            const dynamicCat = categories?.find(c => c.id === post.category || c.slug.toUpperCase() === post.category);
                            const catLabel = dynamicCat
                                ? (dynamicCat.name[locale] || dynamicCat.name['ko'])
                                : (CATEGORY_LABELS[post.category]?.[locale] || post.category);

                            return (
                                <TableRow key={post.id} className={`group border-black/5 hover:bg-black/[0.01] transition-colors ${selectedIds.includes(post.id) ? 'bg-black/[0.02]' : ''}`}>
                                    <TableCell className="py-4">
                                        <Checkbox
                                            checked={selectedIds.includes(post.id)}
                                            onCheckedChange={() => toggleSelect(post.id)}
                                            className="rounded-none border-black/20 data-[state=checked]:bg-black data-[state=checked]:border-black"
                                        />
                                    </TableCell>
                                    <TableCell className="max-w-[300px] truncate">
                                        <Link href={`/admin/posts/${post.id}`} className="text-xs font-bold hover:text-black/60 transition-colors uppercase tracking-tight text-black">
                                            {post.title}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[9px] font-bold rounded-none border-black/10 uppercase tracking-tight bg-black/[0.02]">
                                            {catLabel}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-[10px] font-medium uppercase tracking-tight text-muted-foreground">{post.author.name}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-0.5 border text-[9px] font-black uppercase tracking-widest rounded-none ${post.status === 'published'
                                            ? 'bg-black text-white border-black'
                                            : post.status === 'scheduled'
                                                ? 'bg-white text-black border-black/40'
                                                : 'bg-black/[0.05] text-black/40 border-black/5'
                                            }`}>
                                            {post.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                        {post.status === 'scheduled' && post.publishedAt?.seconds
                                            ? format(new Date(post.publishedAt.seconds * 1000), 'yyyy.MM.dd')
                                            : post.createdAt?.seconds
                                                ? format(new Date(post.createdAt.seconds * 1000), 'yyyy.MM.dd')
                                                : '-'}
                                    </TableCell>
                                    <TableCell className="text-right text-[10px] font-black text-black tabular-nums">
                                        {post.viewCount.toLocaleString().padStart(2, '0')}
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <div className="flex justify-end gap-1">
                                            <Link href={`/admin/posts/${post.id}/edit`}>
                                                <Button variant="ghost" size="icon" type="button" className="h-8 w-8 rounded-none hover:bg-black/[0.05]">
                                                    <Pencil className="w-3.5 h-3.5 text-black/40 hover:text-black transition-colors" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                type="button"
                                                className="h-8 w-8 rounded-none text-black/20 hover:text-black hover:bg-black/[0.05]"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setPostToDelete(post.id);
                                                }}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {posts && posts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-48 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    No records found in local matrix.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
                <DialogContent className="sm:max-w-md rounded-none border-black/20 shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-6 bg-black/[0.02] border-b border-black/5">
                        <DialogTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            <AlertCircle className="w-4 h-4" />
                            Purge Command
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6">
                        <p className="text-xs font-medium leading-relaxed text-muted-foreground uppercase tracking-tight">
                            You are about to initiate a terminal deletion protocol for this entry. This operation is permanent and irreversible.
                        </p>
                    </div>
                    <DialogFooter className="p-6 bg-black/[0.02] border-t border-black/5 gap-3">
                        <DialogClose asChild>
                            <Button type="button" variant="outline" className="rounded-none border-black/10 font-bold text-[10px] uppercase tracking-widest px-6 h-10">
                                Abort
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            className="bg-black text-white hover:bg-black/90 rounded-none font-bold text-[10px] uppercase tracking-widest px-8 h-10"
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'PURGING...' : 'CONFIRM PURGE'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
