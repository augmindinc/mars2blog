'use client';

import { useQuery } from '@tanstack/react-query';
import { getInflowLogsByDays } from '@/services/inflowService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Key,
    TrendingUp,
    Star,
    Link as LinkIcon,
    Layers,
    AlertCircle,
    Calendar,
    Search,
    ExternalLink,
    HelpCircle,
    Clock
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Link } from '@/i18n/routing';
import { InflowLog } from '@/types/blog';

interface KeywordAnalysis {
    keyword: string;
    totalHits: number;
    uniqueDays: number;
    linkedPosts: { id: string; title: string; count: number }[];
    isFilial: boolean;
    recommendation: 'series' | 'internal_link' | 'none';
    lastAppearance: Date;
}

export default function KeywordAnalysisPage() {
    // 1. Fetch 90 days of logs for deep analysis
    const { data: rawLogs, isLoading } = useQuery({
        queryKey: ['inflow-logs-90d'],
        queryFn: () => getInflowLogsByDays(90),
    });

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Analyzing 90 days of search data...</div>;
    }

    // 2. Perform Analysis Logic
    const analyzeKeywords = (): KeywordAnalysis[] => {
        if (!rawLogs) return [];

        const keywordMap: Record<string, {
            hits: number;
            days: Set<string>;
            posts: Record<string, { title: string; count: number }>;
            lastDate: Date;
        }> = {};

        rawLogs.forEach(log => {
            const kw = log.searchKeyword?.trim().toLowerCase();
            if (!kw) return;

            if (!keywordMap[kw]) {
                keywordMap[kw] = {
                    hits: 0,
                    days: new Set(),
                    posts: {},
                    lastDate: new Date(log.createdAt.seconds * 1000)
                };
            }

            const data = keywordMap[kw];
            data.hits += 1;
            const dateStr = format(new Date(log.createdAt.seconds * 1000), 'yyyy-MM-dd');
            data.days.add(dateStr);

            if (!data.posts[log.postId]) {
                data.posts[log.postId] = { title: log.postTitle, count: 0 };
            }
            data.posts[log.postId].count += 1;

            if (new Date(log.createdAt.seconds * 1000) > data.lastDate) {
                data.lastDate = new Date(log.createdAt.seconds * 1000);
            }
        });

        return Object.entries(keywordMap)
            .map(([kw, data]) => {
                const uniqueDays = data.days.size;
                const sortedPosts = Object.entries(data.posts)
                    .map(([id, p]) => ({ id, ...p }))
                    .sort((a, b) => b.count - a.count);

                // 효자키워드 판별: 10일 이상 유입
                const isFilial = uniqueDays >= 10;

                // 추천 전략 판별
                let recommendation: 'series' | 'internal_link' | 'none' = 'none';
                if (isFilial && sortedPosts.length >= 2) recommendation = 'series';
                else if (isFilial) recommendation = 'internal_link';

                return {
                    keyword: kw,
                    totalHits: data.hits,
                    uniqueDays: uniqueDays,
                    linkedPosts: sortedPosts,
                    isFilial,
                    recommendation,
                    lastAppearance: data.lastDate
                };
            })
            .sort((a, b) => b.totalHits - a.totalHits)
            .slice(0, 20); // 상위 20개 추출
    };

    const analyzedData = analyzeKeywords();
    const filialKeywords = analyzedData.filter(d => d.isFilial);

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                        Keyword Intelligence
                    </h2>
                    <p className="text-muted-foreground font-medium">Identify "Filial Keywords" and strategic content opportunities.</p>
                </div>
                <Badge variant="outline" className="px-4 py-2 bg-background border-primary/20 shadow-sm text-sm">
                    <Calendar className="w-4 h-4 mr-2 text-primary" />
                    Last 90 Days Analysis
                </Badge>
            </div>

            {/* Analysis Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Top Analyzed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">{analyzedData.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">High-volume keywords</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-500/5 to-transparent border-yellow-500/10">
                    <CardHeader className="pb-2 text-yellow-600">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider">Filial Keywords (효자)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-yellow-600">{filialKeywords.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">10+ days consistent inflow</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/5 to-transparent border-green-500/10">
                    <CardHeader className="pb-2 text-green-600">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider">Series Potential</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-green-600">
                            {analyzedData.filter(d => d.recommendation === 'series').length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Multi-post targeting</p>
                    </CardContent>
                </Card>

                <Card className="bg-muted/30 border-dashed">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Internal Link Opp.</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">
                            {analyzedData.filter(d => d.recommendation === 'internal_link').length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Reinforce successful posts</p>
                    </CardContent>
                </Card>
            </div>

            {/* Keyword List Table */}
            <Card className="shadow-xl border-none bg-background/60 backdrop-blur-xl">
                <CardHeader className="border-b bg-muted/20">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <CardTitle>Top 20 Search Keywords (90d)</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/10">
                                <TableHead className="w-[200px]">Keyword / Status</TableHead>
                                <TableHead className="text-center">Unique Days</TableHead>
                                <TableHead className="text-center">Total Hits</TableHead>
                                <TableHead>Associated Content</TableHead>
                                <TableHead className="text-right">Strategy Recommendation</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analyzedData.map((item, idx) => (
                                <TableRow key={item.keyword} className="group hover:bg-muted/30 transition-colors">
                                    <TableCell>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg">{item.keyword}</span>
                                                {item.isFilial && (
                                                    <Badge className="bg-yellow-500 hover:bg-yellow-600 text-[10px] h-5 gap-1">
                                                        <Star className="w-3 h-3 fill-current" />
                                                        효자키워드
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Recently: {format(item.lastAppearance, 'MM.dd HH:mm')}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={`text-lg font-black ${item.uniqueDays >= 10 ? 'text-primary' : 'text-muted-foreground'}`}>
                                            {item.uniqueDays} <span className="text-xs font-normal">days</span>
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center font-mono font-medium">
                                        {item.totalHits.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1.5 py-2">
                                            {item.linkedPosts.map(post => (
                                                <div key={post.id} className="flex items-center gap-2 text-xs">
                                                    <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold">
                                                        {post.count}
                                                    </span>
                                                    <Link
                                                        href={`/admin/posts/${post.id}`}
                                                        className="hover:underline text-muted-foreground hover:text-foreground truncate max-w-[200px]"
                                                    >
                                                        {post.title}
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {item.recommendation === 'series' && (
                                            <Badge variant="default" className="bg-purple-600 hover:bg-purple-700 h-7 gap-1.5 px-3">
                                                <Layers className="w-3 h-3" />
                                                시리즈물 기획 추천
                                            </Badge>
                                        )}
                                        {item.recommendation === 'internal_link' && (
                                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200 h-7 gap-1.5 px-3">
                                                <LinkIcon className="w-3 h-3" />
                                                내부 링크 강화
                                            </Badge>
                                        )}
                                        {item.recommendation === 'none' && (
                                            <span className="text-xs text-muted-foreground italic">Monitor development</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* External Data Section Placeholder (GSC) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-dashed border-2 bg-muted/20">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Search className="w-5 h-5 text-gray-400" />
                                Google Search Console Insights
                            </CardTitle>
                            <Badge variant="secondary" className="text-[10px]">API Setup Required</Badge>
                        </div>
                        <CardDescription>
                            Connect your GSC account to identify high-potential keywords from search results.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-background rounded-lg border border-dashed flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold">Hidden Gems (평균 순위 10-20위)</p>
                                <p className="text-xs text-muted-foreground">노출은 많으나 순위가 아쉬운 효자 후보 키워드입니다.</p>
                            </div>
                            <Button size="sm" variant="outline" disabled>
                                <ExternalLink className="w-3 h-3 mr-2" />
                                Connect GSC
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2 text-primary">
                            <Key className="w-5 h-5" />
                            Strategy Tip: 효자키워드 활용
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1 text-sm">
                            <div className="font-bold flex items-center gap-2">
                                <Badge className="h-5 px-1.5">1</Badge>
                                내부 링크(Internal Link) 전략
                            </div>
                            <p className="text-muted-foreground pl-7">유입이 활발한 글에서 다른 글들을 링크하여 체류시간을 높이세요.</p>
                        </div>
                        <div className="space-y-1 text-sm">
                            <div className="font-bold flex items-center gap-2">
                                <Badge className="h-5 px-1.5">2</Badge>
                                시리즈화(Series) 전략
                            </div>
                            <p className="text-muted-foreground pl-7">검색 의도가 다양한 키워드는 'A-Z 시리즈'로 묶어 권위를 강화하세요.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
