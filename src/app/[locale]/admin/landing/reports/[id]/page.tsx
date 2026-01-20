'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getLandingPage, getSubmissions } from '@/services/landingService';
import { LandingPage, LandingPageSubmission } from '@/types/landing';
import { format } from 'date-fns';
import {
    ArrowLeft, Download, Filter, Search,
    Calendar, Mail, User, Phone, MessageSquare,
    ChevronRight, BarChart3, Users, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/routing';

export default function LandingReportsPage() {
    const params = useParams();
    const id = params.id as string;
    const [page, setPage] = useState<LandingPage | null>(null);
    const [submissions, setSubmissions] = useState<LandingPageSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const [pageData, submissionData] = await Promise.all([
                    getLandingPage(id),
                    getSubmissions(id)
                ]);
                setPage(pageData);
                setSubmissions(submissionData);
            } catch (error) {
                console.error('Failed to load report data:', error);
            } finally {
                setLoading(false);
            }
        };
        if (id) loadData();
    }, [id]);

    const filteredSubmissions = submissions.filter(s =>
        Object.values(s.data).some(val =>
            String(val).toLowerCase().includes(search.toLowerCase())
        )
    );

    const handleExportCSV = () => {
        if (!page || filteredSubmissions.length === 0) {
            alert('NO DATA AVAILABLE FOR EXPORT.');
            return;
        }

        // 1. Get all unique field keys from all submissions to use as headers
        const allKeys = new Set<string>();
        filteredSubmissions.forEach(sub => {
            Object.keys(sub.data).forEach(key => allKeys.add(key));
        });
        const headerKeys = Array.from(allKeys);

        // 2. Create CSV header row
        const headers = ['Timestamp', ...headerKeys].join(',');

        // 3. Create CSV data rows
        const rows = filteredSubmissions.map(sub => {
            const timestamp = format(sub.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss');
            const values = headerKeys.map(key => {
                const val = sub.data[key] || '';
                // Escape double quotes by doubling them and wrapping the value in quotes
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            return [timestamp, ...values].join(',');
        });

        // 4. Combine with UTF-8 BOM for Excel compatibility
        const csvContent = "\uFEFF" + [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        const fileName = `leads-${page.slug}-${format(new Date(), 'yyyyMMdd')}.csv`;
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loading) return (
        <div className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
            Analyzing Conversion Data...
        </div>
    );

    if (!page) return (
        <div className="p-8 text-center space-y-4">
            <h1 className="text-xl font-black uppercase tracking-tighter text-red-500">Protocol Failure: 404</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">The requested landing sequence does not exist.</p>
            <Link href="/admin/landing">
                <Button variant="outline" className="rounded-none text-[10px] font-bold uppercase">Back to Terminal</Button>
            </Link>
        </div>
    );

    return (
        <div className="space-y-10 pb-20">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/landing">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border border-black/5 hover:bg-black/5">
                                <ArrowLeft className="w-3.5 h-3.5" />
                            </Button>
                        </Link>
                        <h2 className="text-xl font-black uppercase tracking-tighter">Reports / {page.title}</h2>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground pl-11">Advanced Conversion Analytics & Lead Retrieval</p>
                </div>

                <div className="flex items-center gap-2 pl-11 md:pl-0">
                    <Button
                        variant="outline"
                        onClick={handleExportCSV}
                        className="h-9 rounded-none border-black/10 text-[9px] font-black uppercase tracking-widest gap-2 hover:bg-black hover:text-white transition-all cursor-pointer"
                    >
                        <Download className="w-3 h-3" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="rounded-none border-black/10 shadow-none bg-black text-white">
                    <CardContent className="p-6 space-y-1">
                        <div className="flex items-center justify-between opacity-40">
                            <span className="text-[9px] font-black uppercase tracking-widest">Gross Views</span>
                            <BarChart3 className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-3xl font-black tabular-nums tracking-tighter">{page.stats.views.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="rounded-none border-black/10 shadow-none">
                    <CardContent className="p-6 space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[9px] font-black uppercase tracking-widest">Conversions</span>
                            <Target className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-3xl font-black tabular-nums tracking-tighter">{page.stats.conversions.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="rounded-none border-black/10 shadow-none">
                    <CardContent className="p-6 space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[9px] font-black uppercase tracking-widest">Conv. Rate</span>
                            <BarChart3 className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-3xl font-black tabular-nums tracking-tighter">
                            {((page.stats.conversions / (page.stats.views || 1)) * 100).toFixed(1)}%
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-none border-black/10 shadow-none">
                    <CardContent className="p-6 space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[9px] font-black uppercase tracking-widest">Leads Captured</span>
                            <Users className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-3xl font-black tabular-nums tracking-tighter">{submissions.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* SUBMISSIONS LIST */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Inbound Sequences
                    </h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            placeholder="SEARCH LEADS..."
                            className="pl-9 h-9 rounded-none border-black/10 text-[10px] font-bold uppercase tracking-widest bg-black/[0.02]"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-none border border-black/10 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-black/[0.02] border-black/5">
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground w-[180px]">Timestamp</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Inbound Data</TableHead>
                                <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-muted-foreground px-6 w-[100px]">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSubmissions.map((sub) => (
                                <TableRow key={sub.id} className="group border-black/5 hover:bg-black/[0.01]">
                                    <TableCell className="text-[10px] font-bold text-muted-foreground uppercase tabular-nums">
                                        {format(sub.createdAt.toDate(), 'yyyy.MM.dd HH:mm:ss')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                                            {Object.entries(sub.data).map(([key, val]) => (
                                                <div key={key} className="flex items-center gap-2">
                                                    <span className="text-[8px] font-black text-black/20 uppercase tracking-tighter">{key}:</span>
                                                    <span className="text-[10px] font-bold text-black uppercase">{String(val)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-black/5">
                                            <ChevronRight className="w-4 h-4 text-black/20" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredSubmissions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-48 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        No inbound leads localized.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
