'use client';

import { useQuery } from '@tanstack/react-query';
import { getPosts } from '@/services/blogService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ExternalLink, Search, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface SitemapEntry {
    url: string;
    priority: number;
    frequency: string;
    type: string;
    lastModified?: Date;
    title?: string;
}

export default function AdminSitemapPage() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mars.it.kr';
    const [search, setSearch] = useState('');

    const { data: posts, isLoading } = useQuery({
        queryKey: ['sitemap-posts'],
        queryFn: () => getPosts('ALL'),
    });

    const staticPages: SitemapEntry[] = [
        { url: baseUrl, priority: 1.0, frequency: 'daily', type: 'Static' },
        { url: `${baseUrl}/ko`, priority: 1.0, frequency: 'daily', type: 'Static' },
        { url: `${baseUrl}/en`, priority: 1.0, frequency: 'daily', type: 'Static' },
    ];

    const postEntries: SitemapEntry[] = posts?.map(post => ({
        url: `${baseUrl}/ko/blog/${post.slug}`,
        priority: 0.7,
        frequency: 'weekly',
        type: 'Post',
        lastModified: post.updatedAt?.toDate(),
        title: post.title
    })) || [];

    const allEntries: SitemapEntry[] = [...staticPages, ...postEntries];

    const filteredEntries = allEntries.filter(entry =>
        entry.url.toLowerCase().includes(search.toLowerCase()) ||
        (entry.title && entry.title.toLowerCase().includes(search.toLowerCase()))
    );

    const [indexingUrls, setIndexingUrls] = useState<Set<string>>(new Set());

    const handleRequestIndex = async (url: string) => {
        setIndexingUrls(prev => new Set(prev).add(url));
        try {
            const indexUrllCallable = httpsCallable(functions, 'manualIndexUrl');
            const result = await indexUrllCallable({ url });

            if (result.data) {
                alert(`Indexing requested for: ${url}`);
            }
        } catch (error: any) {
            console.error("Indexing request failed", error);
            alert(`Failed: ${error.message || 'Unknown error'}`);
        } finally {
            setIndexingUrls(prev => {
                const next = new Set(prev);
                next.delete(url);
                return next;
            });
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading sitemap data...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Globe className="w-6 h-6 text-primary" />
                        Sitemap Management
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        View all URLs currently indexed and included in sitemap.xml
                    </p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search URLs..."
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
                            <TableHead>Type</TableHead>
                            <TableHead>URL / Title</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Frequency</TableHead>
                            <TableHead>Last Modified</TableHead>
                            <TableHead className="text-right">Link</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredEntries.map((entry, idx) => (
                            <TableRow key={idx}>
                                <TableCell>
                                    <Badge variant={entry.type === 'Static' ? 'secondary' : 'outline'}>
                                        {entry.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="max-w-[400px]">
                                    <div className="flex flex-col">
                                        {entry.title && <span className="font-semibold text-sm truncate">{entry.title}</span>}
                                        <span className="text-xs text-muted-foreground break-all">{entry.url}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm font-mono text-blue-600">{entry.priority.toFixed(1)}</span>
                                </TableCell>
                                <TableCell className="text-sm italic text-muted-foreground capitalize">
                                    {entry.frequency}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {entry.lastModified ? format(entry.lastModified, 'yyyy-MM-dd HH:mm') : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-xs gap-1 hover:text-primary hover:bg-primary/5"
                                            onClick={() => handleRequestIndex(entry.url)}
                                            disabled={indexingUrls.has(entry.url)}
                                        >
                                            {indexingUrls.has(entry.url) ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Send className="w-3 h-3" />
                                            )}
                                            {indexingUrls.has(entry.url) ? 'Requesting...' : 'Index'}
                                        </Button>
                                        <a
                                            href={entry.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center p-2 hover:bg-muted rounded-md transition-colors text-primary"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-between items-center text-xs text-muted-foreground px-2">
                <span>Total Entries: {filteredEntries.length}</span>
                <span className="flex items-center gap-1">
                    Live XML: <a href="/sitemap.xml" target="_blank" className="underline hover:text-primary">/sitemap.xml</a>
                </span>
            </div>
        </div>
    );
}
