'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminPosts } from '@/services/blogService';
import {
    getCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    seedCategories
} from '@/services/categoryService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { CATEGORY_LABELS, CategoryMeta } from '@/types/blog';
import { useLocale } from 'next-intl';
import {
    FolderInput,
    FileText,
    MousePointer2,
    TrendingUp,
    Plus,
    Pencil,
    Trash2,
    AlertCircle,
    Save,
    ListRestart
} from 'lucide-react';

export default function CategoriesPage() {
    const locale = useLocale() as 'en' | 'ko';
    const queryClient = useQueryClient();

    const [isEditing, setIsEditing] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Partial<CategoryMeta> | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

    const { data: posts, isLoading: postsLoading } = useQuery({
        queryKey: ['admin-posts'],
        queryFn: getAdminPosts,
    });

    const { data: categories, isLoading: categoriesLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: getCategories,
    });

    // Auto-seed if empty
    useEffect(() => {
        if (!categoriesLoading && (!categories || categories.length === 0)) {
            // Seed categories from static labels
            seedCategories(CATEGORY_LABELS).then(() => {
                queryClient.invalidateQueries({ queryKey: ['categories'] });
            });
        }
    }, [categories, categoriesLoading, queryClient]);

    const saveMutation = useMutation({
        mutationFn: async (data: Partial<CategoryMeta>) => {
            if (data.id) {
                return updateCategory(data.id, data);
            } else {
                return addCategory({
                    name: data.name!,
                    slug: (data.slug || data.name!['en'] || 'new-category').toLowerCase(),
                    order: categories?.length || 0,
                } as any);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setIsEditing(false);
            setEditingCategory(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setIsDeleting(false);
            setCategoryToDelete(null);
        },
    });

    const handleSave = () => {
        if (editingCategory?.name) {
            saveMutation.mutate(editingCategory);
        }
    };

    if (postsLoading || categoriesLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading category data...</div>;
    }

    // Calculate category statistics
    const stats = categories?.map(cat => {
        const categoryPosts = posts?.filter(p => p.category === cat.id || p.category === cat.slug.toUpperCase()) || [];
        const publishedCount = categoryPosts.filter(p => p.status === 'published').length;
        const totalViews = categoryPosts.reduce((sum, p) => sum + p.viewCount, 0);

        return {
            ...cat,
            label: cat.name[locale] || cat.name['en'] || cat.id,
            totalCount: categoryPosts.length,
            publishedCount,
            draftCount: categoryPosts.length - publishedCount,
            totalViews
        };
    }) || [];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center text-start">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Category Management</h2>
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-tight mt-1">Manage and organize your blog categories.</p>
                </div>
                <Button onClick={() => {
                    setEditingCategory({ name: { ko: '', en: '', ja: '', zh: '' }, slug: '', order: categories?.length || 0 });
                    setIsEditing(true);
                }} className="rounded-none bg-black text-white hover:bg-black/90 font-bold text-[10px] uppercase tracking-widest px-6">
                    <Plus className="w-3.5 h-3.5 mr-2" /> Add Category
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-none bg-black/[0.02] border-black/10 shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                            <FolderInput className="w-3.5 h-3.5" />
                            Total Categories
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(stats.length).toString().padStart(2, '0')}</div>
                    </CardContent>
                </Card>

                <Card className="rounded-none bg-black/[0.02] border-black/10 shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                            <FileText className="w-3.5 h-3.5" />
                            Total Published
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {(posts?.filter(p => p.status === 'published').length || 0).toString().padStart(2, '0')}
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-none bg-black/[0.02] border-black/10 shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Top Category (Views)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">
                            {[...stats].sort((a, b) => b.totalViews - a.totalViews)[0]?.label || 'N/A'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="rounded-none border-black/10 shadow-none overflow-hidden">
                <CardHeader className="border-b border-black/5 bg-black/[0.02] py-4 px-6">
                    <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                        <ListRestart className="w-4 h-4" />
                        Category List & Stats
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-black/[0.02] border-black/5">
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-3">Category Name (KO)</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-3">Slug</TableHead>
                                <TableHead className="text-center text-[10px] font-bold uppercase tracking-widest py-3">Published</TableHead>
                                <TableHead className="text-center text-[10px] font-bold uppercase tracking-widest py-3">Total</TableHead>
                                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest py-3">Total Views</TableHead>
                                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest py-3">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.map((stat) => (
                                <TableRow key={stat.id} className="border-black/5 group hover:bg-black/[0.01]">
                                    <TableCell className="font-bold py-4">
                                        <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-none border-black/10 uppercase tracking-tight">
                                            {stat.name[locale] || stat.name['ko']}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs font-medium text-muted-foreground">{stat.slug}</TableCell>
                                    <TableCell className="text-center">
                                        <span className="text-black font-bold text-sm">{stat.publishedCount}</span>
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-sm">
                                        {stat.totalCount}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1.5 font-bold text-black">
                                            <MousePointer2 className="w-3 h-3 text-muted-foreground" />
                                            {stat.totalViews.toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                setEditingCategory(stat);
                                                setIsEditing(true);
                                            }} className="rounded-none h-8 w-8 hover:bg-black/[0.05]">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-black/[0.05] rounded-none" onClick={() => {
                                                setCategoryToDelete(stat.id);
                                                setIsDeleting(true);
                                            }}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="rounded-none border-black/20 shadow-2xl p-0 overflow-hidden max-w-lg">
                    <DialogHeader className="p-6 bg-black/[0.02] border-b border-black/5">
                        <DialogTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            {editingCategory?.id ? 'Edit Category' : 'Add New Category'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 p-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-tight">Name (Korean)</Label>
                                <Input
                                    value={editingCategory?.name?.ko || ''}
                                    onChange={e => setEditingCategory(prev => ({
                                        ...prev!,
                                        name: { ...prev!.name!, ko: e.target.value }
                                    }))}
                                    className="rounded-none border-black/10 font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-tight">Name (English)</Label>
                                <Input
                                    value={editingCategory?.name?.en || ''}
                                    onChange={e => setEditingCategory(prev => ({
                                        ...prev!,
                                        name: { ...prev!.name!, en: e.target.value }
                                    }))}
                                    className="rounded-none border-black/10 font-bold"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-tight">Name (Japanese)</Label>
                                <Input
                                    value={editingCategory?.name?.ja || ''}
                                    onChange={e => setEditingCategory(prev => ({
                                        ...prev!,
                                        name: { ...prev!.name!, ja: e.target.value }
                                    }))}
                                    className="rounded-none border-black/10 font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-tight">Name (Chinese)</Label>
                                <Input
                                    value={editingCategory?.name?.zh || ''}
                                    onChange={e => setEditingCategory(prev => ({
                                        ...prev!,
                                        name: { ...prev!.name!, zh: e.target.value }
                                    }))}
                                    className="rounded-none border-black/10 font-bold"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-tight">Slug (for URL)</Label>
                                <Input
                                    placeholder="e.g. shopping"
                                    value={editingCategory?.slug || ''}
                                    onChange={e => setEditingCategory(prev => ({ ...prev!, slug: e.target.value }))}
                                    className="rounded-none border-black/10 font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-tight">Display Order</Label>
                                <Input
                                    type="number"
                                    value={editingCategory?.order || 0}
                                    onChange={e => setEditingCategory(prev => ({ ...prev!, order: parseInt(e.target.value) }))}
                                    className="rounded-none border-black/10 font-bold"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="p-6 bg-black/[0.02] border-t border-black/5 gap-3">
                        <DialogClose asChild>
                            <Button variant="outline" className="rounded-none border-black/10 font-bold text-[10px] uppercase tracking-widest px-6">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSave} disabled={saveMutation.isPending} className="rounded-none bg-black text-white hover:bg-black/90 font-bold text-[10px] uppercase tracking-widest px-8">
                            {saveMutation.isPending ? 'Saving...' : 'Save Category'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
                <DialogContent className="rounded-none border-black/20 shadow-2xl p-0 overflow-hidden max-w-sm">
                    <DialogHeader className="p-6 bg-black/[0.02] border-b border-black/5">
                        <DialogTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Delete Category
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6">
                        <p className="text-xs font-medium leading-relaxed text-muted-foreground uppercase tracking-tight">
                            Are you sure you want to delete this category?
                            Existing posts in this category will remain, but they won't belong to any active category.
                        </p>
                    </div>
                    <DialogFooter className="p-6 bg-black/[0.02] border-t border-black/5 gap-3">
                        <DialogClose asChild>
                            <Button variant="outline" className="rounded-none border-black/10 font-bold text-[10px] uppercase tracking-widest px-6">Cancel</Button>
                        </DialogClose>
                        <Button
                            onClick={() => categoryToDelete && deleteMutation.mutate(categoryToDelete)}
                            disabled={deleteMutation.isPending}
                            className="rounded-none bg-black text-white hover:bg-black/90 font-bold text-[10px] uppercase tracking-widest px-6"
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
