'use client';

import { useQuery } from '@tanstack/react-query';
import { getInflowLogs } from '@/services/inflowService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
    BarChart3,
    Link as LinkIcon,
    Search,
    MousePointer2,
    Clock,
    Globe,
    MessageSquare
} from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function InflowPage() {
    const { data: logs, isLoading } = useQuery({
        queryKey: ['inflow-logs'],
        queryFn: () => getInflowLogs(100),
    });

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading inflow data...</div>;
    }

    // 간단한 통계 계산
    const domainStats = logs?.reduce((acc: Record<string, number>, log) => {
        acc[log.referrerDomain] = (acc[log.referrerDomain] || 0) + 1;
        return acc;
    }, {});

    const topDomains = Object.entries(domainStats || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Inflow Analytics</h2>
                    <p className="text-muted-foreground text-sm">Monitor where your visitors are coming from.</p>
                </div>
            </div>

            {/* Stats Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="rounded-none bg-black/[0.02] border-black/10 shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-tight text-muted-foreground">
                            <MousePointer2 className="w-4 h-4" />
                            Total Tracking
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{logs?.length || 0}</div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-tight">Last 100 entries</p>
                    </CardContent>
                </Card>

                <Card className="rounded-none bg-black/[0.02] border-black/10 shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-tight text-muted-foreground">
                            <LinkIcon className="w-4 h-4" />
                            Internal Clicks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {logs?.filter(l => l.referrer?.startsWith('Related Post:')).length || 0}
                        </div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-tight">From related posts</p>
                    </CardContent>
                </Card>

                <Card className="rounded-none bg-black/[0.02] border-black/10 shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-tight text-muted-foreground">
                            <Globe className="w-4 h-4" />
                            Top Traffic
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">
                            {topDomains[0]?.[0] || 'N/A'}
                        </div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-tight">
                            {topDomains[0]?.[1] || 0} visits
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-none bg-black/[0.02] border-black/10 shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-tight text-muted-foreground">
                            <Search className="w-4 h-4" />
                            Search Entries
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {logs?.filter(l => l.searchKeyword).length || 0}
                        </div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-tight">Identified keywords</p>
                    </CardContent>
                </Card>
            </div>

            {/* Inflow Logs Table */}
            <Card className="rounded-none border-black/10 shadow-none overflow-hidden">
                <CardHeader className="border-b border-black/5 bg-black/[0.02]">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Recent Inflow Logs
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-black/5">
                                <TableHead className="w-[180px]">Time</TableHead>
                                <TableHead>Source (Referrer)</TableHead>
                                <TableHead>Target Post</TableHead>
                                <TableHead>Keyword</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs?.map((log) => (
                                <TableRow key={log.id} className="group border-black/5">
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3" />
                                            {log.createdAt ? format(new Date(log.createdAt), 'MM.dd HH:mm:ss') : '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="px-1.5 py-0 h-5 text-[10px] rounded-none border-black/10">
                                                    {log.referrerDomain}
                                                </Badge>
                                            </div>
                                            {log.referrer && log.referrer.startsWith('Related Post:') ? (
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-black bg-black/[0.05] px-1.5 py-0.5 rounded-none border border-black/5 w-fit">
                                                    <MessageSquare className="w-3 h-3" />
                                                    {log.referrer}
                                                </div>
                                            ) : log.referrer && log.referrer !== 'Direct' && log.referrer.startsWith('http') ? (
                                                <a
                                                    href={log.referrer}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-muted-foreground hover:text-black hover:underline truncate max-w-[200px] block transition-colors"
                                                    title={log.referrer}
                                                >
                                                    {log.referrer}
                                                </a>
                                            ) : (
                                                <div className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={log.referrer}>
                                                    {log.referrer}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Link
                                            href={`/admin/posts/${log.postId}`}
                                            className="font-semibold text-sm hover:underline hover:text-black transition-colors line-clamp-1"
                                        >
                                            {log.postTitle}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        {log.searchKeyword ? (
                                            <Badge variant="outline" className="rounded-none border-black/10 bg-black/[0.02] text-black font-bold text-[10px]">
                                                <Search className="w-3 h-3 mr-1" />
                                                {log.searchKeyword}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic font-medium">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {logs?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                                        No inflow logs recorded yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
