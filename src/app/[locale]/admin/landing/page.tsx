'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLandingPages, subscribeToLandingPages, deleteLandingPage, updateLandingPage } from '@/services/landingService';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from '@/i18n/routing';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, ExternalLink, MoreVertical, Trash2, Pencil, BarChart2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { useLocale } from 'next-intl';

export default function LandingPagesPage() {
    const locale = useLocale();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');

    const { data: pages, isLoading } = useQuery({
        queryKey: ['admin-landing-pages'],
        queryFn: getLandingPages,
    });

    useEffect(() => {
        const unsubscribe = subscribeToLandingPages((newPages) => {
            queryClient.setQueryData(['admin-landing-pages'], newPages);
        });
        return () => unsubscribe();
    }, [queryClient]);

    const filteredPages = pages?.filter(page =>
        page.title.toLowerCase().includes(search.toLowerCase()) ||
        page.slug.toLowerCase().includes(search.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this landing page?')) {
            await deleteLandingPage(id);
        }
    };

    const handleStatusToggle = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'published' ? 'draft' : 'published';
        try {
            await updateLandingPage(id, { status: newStatus as any });
        } catch (error) {
            console.error('Failed to toggle status:', error);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Initializing Landing Matrix...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter">Landing Pages ({filteredPages?.length || 0})</h2>
                    <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground mt-1">Conversion-focused No-code Landing Infrastructure</p>
                </div>

                <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-3">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            placeholder="SEARCH PAGES..."
                            className="pl-9 h-10 rounded-none border-black/10 text-[10px] font-bold uppercase tracking-widest bg-black/[0.02]"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Link href="/admin/landing/create" className="w-full sm:w-auto">
                        <Button type="button" className="w-full h-10 bg-black text-white hover:bg-black/90 rounded-none font-bold text-[10px] uppercase tracking-widest px-6 shadow-none">
                            <Plus className="w-3.5 h-3.5 mr-2" /> New Landing
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-none border border-black/10 overflow-hidden shadow-none">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-black/[0.02] border-black/5">
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Title & Endpoint</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Purpose</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Funnel Stats</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Last Modified</TableHead>
                            <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-6">Operations</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPages?.map((page) => (
                            <TableRow key={page.id} className="group border-black/5 hover:bg-black/[0.01] transition-colors">
                                <TableCell className="py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold uppercase tracking-tight text-black">{page.title}</span>
                                            {page.locale && (
                                                <Badge variant="secondary" className="text-[8px] h-3.5 px-1 rounded-none font-black uppercase tracking-tighter bg-black/5 text-black/40 border-none">
                                                    {page.locale}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground">
                                            <span>/{page.slug}</span>
                                            <a href={`/${locale}/lp/${page.slug}`} target="_blank" rel="noopener noreferrer" className="hover:text-black">
                                                <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-[9px] font-bold rounded-none border-black/10 uppercase tracking-tight bg-black/[0.02]">
                                        {page.type.replace('_', ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <button
                                        onClick={() => handleStatusToggle(page.id, page.status)}
                                        className={`px-3 py-1 border text-[9px] font-black uppercase tracking-[0.1em] rounded-none transition-all hover:scale-105 active:scale-95 ${page.status === 'published'
                                            ? 'bg-black text-white border-black'
                                            : 'bg-white text-black/40 border-black/10 hover:border-black hover:text-black'
                                            }`}
                                    >
                                        {page.status === 'published' ? 'PUBLISHED' : 'DRAFT'}
                                    </button>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-4 text-[10px] font-black tabular-nums">
                                        <div className="flex flex-col">
                                            <span className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">Views</span>
                                            <span>{page.stats.views.toLocaleString().padStart(2, '0')}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">Convs</span>
                                            <span>{page.stats.conversions.toLocaleString().padStart(2, '0')}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-muted-foreground text-[8px] uppercase tracking-widest font-bold">CR</span>
                                            <span>{((page.stats.conversions / (page.stats.views || 1)) * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                    {format(page.updatedAt.toDate(), 'yyyy.MM.dd')}
                                </TableCell>
                                <TableCell className="text-right px-6">
                                    <div className="flex justify-end gap-1">
                                        <Link href={`/admin/landing/builder?id=${page.id}`}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-black/[0.05]">
                                                <Pencil className="w-3.5 h-3.5 text-black/40 hover:text-black transition-colors" />
                                            </Button>
                                        </Link>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-black/[0.05]">
                                                    <MoreVertical className="w-3.5 h-3.5 text-black/40" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-none border-black/10">
                                                <Link href={`/admin/landing/reports/${page.id}`}>
                                                    <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest cursor-pointer">
                                                        <BarChart2 className="w-3.5 h-3.5 mr-2" /> View Reports
                                                    </DropdownMenuItem>
                                                </Link>
                                                <DropdownMenuItem
                                                    className="text-[10px] font-bold uppercase tracking-widest cursor-pointer text-destructive focus:text-destructive"
                                                    onClick={() => handleDelete(page.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {(!filteredPages || filteredPages.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-48 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    No landing sequences detected in matrix.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
