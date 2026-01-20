'use client';

import { useQuery } from '@tanstack/react-query';
import { getAdminPosts } from '@/services/blogService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_LABELS, Category } from '@/types/blog';
import { useLocale } from 'next-intl';
import { FolderInput, FileText, MousePointer2, TrendingUp } from 'lucide-react';

export default function CategoriesPage() {
    const locale = useLocale() as 'en' | 'ko';

    const { data: posts, isLoading } = useQuery({
        queryKey: ['admin-posts'],
        queryFn: getAdminPosts,
    });

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading category data...</div>;
    }

    // Calculate category statistics
    const stats = Object.keys(CATEGORY_LABELS)
        .filter(key => key !== 'ALL')
        .map(key => {
            const categoryPosts = posts?.filter(p => p.category === key) || [];
            const publishedCount = categoryPosts.filter(p => p.status === 'published').length;
            const totalViews = categoryPosts.reduce((sum, p) => sum + p.viewCount, 0);

            return {
                id: key as Category,
                label: CATEGORY_LABELS[key as Category][locale] || key,
                totalCount: categoryPosts.length,
                publishedCount,
                draftCount: categoryPosts.length - publishedCount,
                totalViews
            };
        });

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-extrabold tracking-tight">Category Management</h2>
                <p className="text-muted-foreground">Overview of your blog categories and their performance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-primary/5 border-primary/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FolderInput className="w-4 h-4 text-primary" />
                            Total Categories
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.length}</div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-500/5 border-emerald-500/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-500" />
                            Total Published Posts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {posts?.filter(p => p.status === 'published').length || 0}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-500/5 border-blue-500/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            Top Category (by Views)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">
                            {[...stats].sort((a, b) => b.totalViews - a.totalViews)[0]?.label || 'N/A'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <FolderInput className="w-5 h-5 text-primary" />
                        Category List & Stats
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category Name</TableHead>
                                <TableHead className="text-center">Published</TableHead>
                                <TableHead className="text-center">Drafts</TableHead>
                                <TableHead className="text-center">Total Posts</TableHead>
                                <TableHead className="text-right">Total Views</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.map((stat) => (
                                <TableRow key={stat.id}>
                                    <TableCell className="font-bold">
                                        <Badge variant="outline" className="text-sm px-3 py-1">
                                            {stat.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="text-emerald-600 font-medium">{stat.publishedCount}</span>
                                    </TableCell>
                                    <TableCell className="text-center text-muted-foreground">
                                        {stat.draftCount}
                                    </TableCell>
                                    <TableCell className="text-center font-bold">
                                        {stat.totalCount}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1.5 font-mono text-primary font-bold">
                                            <MousePointer2 className="w-3.5 h-3.5" />
                                            {stat.totalViews.toLocaleString()}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
