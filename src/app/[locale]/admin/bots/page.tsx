'use client';

import { useQuery } from '@tanstack/react-query';
import { getBotLogs } from '@/services/botService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
    Bot,
    Clock,
    Globe,
    ExternalLink,
    ShieldCheck,
    Building2,
    Activity
} from 'lucide-react';

export default function BotLogsPage() {
    const { data: logs, isLoading } = useQuery({
        queryKey: ['bot-logs'],
        queryFn: () => getBotLogs(100),
    });

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading bot logs...</div>;
    }

    // 통계 계산
    const companyStats = logs?.reduce((acc: Record<string, number>, log) => {
        acc[log.botCompany] = (acc[log.botCompany] || 0) + 1;
        return acc;
    }, {});

    const topCompanies = Object.entries(companyStats || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight">Crawler Bot Activity</h2>
                    <p className="text-muted-foreground">Monitor search engine and crawler bot visits.</p>
                </div>
            </div>

            {/* Stats Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-primary/5 border-primary/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" />
                            Total Bot Visits
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
                            <Building2 className="w-4 h-4 text-orange-500" />
                            Most Active Company
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">
                            {topCompanies[0]?.[0] || 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {topCompanies[0]?.[1] || 0} visits
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-500/5 border-emerald-500/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            Top Bot
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {logs?.[0]?.botName || 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Latest visit</p>
                    </CardContent>
                </Card>
            </div>

            {/* Bot Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Bot className="w-5 h-5 text-primary" />
                        Detailed Bot Activity
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Time</TableHead>
                                <TableHead>Bot Name</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Page Path</TableHead>
                                <TableHead>IP / User-Agent</TableHead>
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
                                        <div className="font-bold flex items-center gap-2">
                                            <Bot className="w-3.5 h-3.5 text-primary" />
                                            {log.botName}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-normal border-orange-200 bg-orange-50 text-orange-700">
                                            {log.botCompany}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 font-mono text-xs">
                                            <Globe className="w-3 h-3 text-muted-foreground" />
                                            {log.pagePath}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-mono font-semibold text-muted-foreground">
                                                IP: {log.ip}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground truncate max-w-[250px]" title={log.userAgent}>
                                                {log.userAgent}
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {logs?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                                        No crawler bot visits recorded yet.
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
