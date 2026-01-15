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
                    <h2 className="text-3xl font-extrabold tracking-tight">Inflow Analytics</h2>
                    <p className="text-muted-foreground">Monitor where your visitors are coming from.</p>
                </div>
            </div>

            {/* Stats Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-primary/5 border-primary/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <MousePointer2 className="w-4 h-4 text-primary" />
                            Total Tracked Hits
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{logs?.length || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Last 100 entries</p>
                    </CardContent>
                </Card>

                <Card className="bg-orange-500/5 border-orange-500/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Globe className="w-4 h-4 text-orange-500" />
                            Top Traffic Source
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">
                            {topDomains[0]?.[0] || 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {topDomains[0]?.[1] || 0} visits ({Math.round((topDomains[0]?.[1] || 0) / (logs?.length || 1) * 100)}%)
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-500/5 border-blue-500/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Search className="w-4 h-4 text-blue-500" />
                            Search Entries
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {logs?.filter(l => l.searchKeyword).length || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Identified keywords</p>
                    </CardContent>
                </Card>
            </div>

            {/* Inflow Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Recent Inflow Logs
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Time</TableHead>
                                <TableHead>Source (Referrer)</TableHead>
                                <TableHead>Target Post</TableHead>
                                <TableHead>Keyword</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs?.map((log) => (
                                <TableRow key={log.id} className="group">
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(log.createdAt?.seconds * 1000), 'MM.dd HH:mm:ss')}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="px-1.5 py-0 h-5 font-mono text-[10px]">
                                                    {log.referrerDomain}
                                                </Badge>
                                            </div>
                                            {log.referrer && log.referrer !== 'Direct' && log.referrer.startsWith('http') ? (
                                                <a
                                                    href={log.referrer}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-muted-foreground hover:text-primary hover:underline truncate max-w-[200px] block transition-colors"
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
                                            className="font-medium text-sm hover:underline hover:text-primary transition-colors line-clamp-1"
                                        >
                                            {log.postTitle}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        {log.searchKeyword ? (
                                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200">
                                                <Search className="w-3 h-3 mr-1" />
                                                {log.searchKeyword}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">-</span>
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
