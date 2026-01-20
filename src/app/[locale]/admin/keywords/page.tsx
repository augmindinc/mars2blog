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
    const { data: rawLogs, isLoading } = useQuery({
        queryKey: ['inflow-logs-90d'],
        queryFn: () => getInflowLogsByDays(90),
    });

    // 2. Fetch GSC Data
    const { data: gscData, isLoading: isLoadingGSC } = useQuery({
        queryKey: ['admin-gsc-data'],
        queryFn: async () => {
            const res = await fetch('/api/admin/gsc');
            return res.json();
        }
    });

    if (isLoading || isLoadingGSC) {
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

    // Filter GSC "Hidden Gems" (Rank 10-20, has clicks)
    const hiddenGems = gscData?.queries?.filter((q: any) =>
        q.position >= 10 && q.position <= 20 && q.clicks > 0
    ) || [];

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-black">
                        Keyword Intelligence
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">Identify "Filial Keywords" and strategic content opportunities.</p>
                </div>
                <Badge variant="outline" className="px-4 py-2 bg-background border-black/10 rounded-none text-sm font-bold">
                    <Calendar className="w-4 h-4 mr-2" />
                    Last 90 Days Analysis
                </Badge>
            </div>

            {/* Analysis Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="rounded-none bg-black/[0.02] border-black/10 shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Top Analyzed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{analyzedData.length}</div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-tight">High-volume keywords</p>
                    </CardContent>
                </Card>

                <Card className="rounded-none bg-black/[0.02] border-black/10 shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Filial Keywords (효자)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{filialKeywords.length}</div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-tight">10+ days consistent inflow</p>
                    </CardContent>
                </Card>

                <Card className="rounded-none bg-black/[0.02] border-black/10 shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Series Potential</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {analyzedData.filter(d => d.recommendation === 'series').length}
                        </div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-tight">Multi-post targeting</p>
                    </CardContent>
                </Card>

                <Card className="rounded-none bg-black/[0.02] border-black/10 border-dashed shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Internal Link Opp.</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {analyzedData.filter(d => d.recommendation === 'internal_link').length}
                        </div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-tight">Reinforce successful posts</p>
                    </CardContent>
                </Card>
            </div>

            {/* Keyword List Table */}
            <Card className="rounded-none border border-black/10 shadow-none bg-background overflow-hidden">
                <CardHeader className="border-b border-black/5 bg-black/[0.02]">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        <CardTitle className="text-lg">Top 20 Search Keywords (90d)</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-black/5">
                                <TableHead className="w-[200px]">Keyword / Status</TableHead>
                                <TableHead className="text-center">Unique Days</TableHead>
                                <TableHead className="text-center">Total Hits</TableHead>
                                <TableHead>Associated Content</TableHead>
                                <TableHead className="text-right">Strategy Recommendation</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analyzedData.map((item, idx) => (
                                <TableRow key={item.keyword} className="group hover:bg-black/[0.02] transition-colors border-black/5">
                                    <TableCell>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xl">{item.keyword}</span>
                                                {item.isFilial && (
                                                    <Badge className="rounded-none bg-black text-white text-[10px] h-5 gap-1 border-none font-bold px-2">
                                                        <Star className="w-3 h-3" />
                                                        효자키워드
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold uppercase tracking-tight">
                                                <Clock className="w-3 h-3" />
                                                Recently: {format(item.lastAppearance, 'MM.dd HH:mm')}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={`text-xl font-bold ${item.uniqueDays >= 10 ? 'text-black' : 'text-muted-foreground'}`}>
                                            {item.uniqueDays} <span className="text-[10px] uppercase font-bold tracking-tight">days</span>
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-lg">
                                        {item.totalHits.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1.5 py-2">
                                            {item.linkedPosts.map(post => (
                                                <div key={post.id} className="flex items-center gap-2 text-xs">
                                                    <span className="w-5 h-5 rounded-none bg-black text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                                                        {post.count}
                                                    </span>
                                                    <Link
                                                        href={`/admin/posts/${post.id}`}
                                                        className="font-semibold text-muted-foreground hover:text-black truncate max-w-[200px]"
                                                    >
                                                        {post.title}
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {item.recommendation === 'series' && (
                                            <Badge variant="outline" className="rounded-none border-black text-black bg-black/[0.02] h-7 gap-1.5 px-3 font-bold text-[10px] uppercase tracking-tight">
                                                <Layers className="w-3 h-3" />
                                                시리즈물 기획 추천
                                            </Badge>
                                        )}
                                        {item.recommendation === 'internal_link' && (
                                            <Badge variant="outline" className="rounded-none border-black/20 text-muted-foreground h-7 gap-1.5 px-3 font-bold text-[10px] uppercase tracking-tight">
                                                <LinkIcon className="w-3 h-3" />
                                                내부 링크 강화
                                            </Badge>
                                        )}
                                        {item.recommendation === 'none' && (
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Monitor</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* GSC Insights Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className={`rounded-none border-black/10 shadow-none ${!gscData?.configured ? 'bg-black/[0.02] border-dashed' : ''}`}>
                    <CardHeader className="border-b border-black/5 bg-black/[0.02]">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Search className="w-5 h-5" />
                                Google Search Console Insights
                            </CardTitle>
                            {!gscData?.configured ? (
                                <Badge variant="outline" className="text-[9px] rounded-none border-black/10">API Required</Badge>
                            ) : (
                                <Badge variant="outline" className="text-[9px] rounded-none bg-black text-white border-none">Connected</Badge>
                            )}
                        </div>
                        <CardDescription className="text-xs pt-2">
                            {gscData?.configured
                                ? 'High-potential keywords from your actual search performance.'
                                : 'Connect your GSC account to identify high-potential keywords.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        {!gscData?.configured ? (
                            <div className="p-4 bg-white border border-black/10 rounded-none flex items-center gap-4">
                                <div className="w-10 h-10 rounded-none bg-black/[0.05] flex items-center justify-center text-black">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold">Hidden Gems (평균 순위 10-20위)</p>
                                    <p className="text-xs text-muted-foreground">노출은 많으나 순위가 아쉬운 효자 후보 키워드입니다.</p>
                                </div>
                                <Button size="sm" variant="outline" disabled className="rounded-none border-black/10">
                                    Connect
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                                    <Star className="w-3 h-3" />
                                    Hidden Gems Candidate
                                </h4>
                                <div className="grid gap-2 text-start">
                                    {hiddenGems.slice(0, 5).map((q: any) => (
                                        <div key={q.keys[0]} className="flex items-center justify-between p-3 bg-black/[0.02] border border-black/5 rounded-none group hover:bg-black/[0.05] transition-colors">
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold">{q.keys[0]}</p>
                                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                                                    <span>Rank: <span className="text-black">{q.position.toFixed(1)}</span></span>
                                                    <span>Clicks: <span className="text-black">{q.clicks}</span></span>
                                                    <span>CTR: <span className="text-black">{(q.ctr * 100).toFixed(1)}%</span></span>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-[9px] rounded-none border-black/10">Potential</Badge>
                                        </div>
                                    ))}
                                    {hiddenGems.length === 0 && (
                                        <p className="text-xs text-center py-8 text-muted-foreground italic">
                                            No keywords found in the 10-20 rank range.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-none bg-black/[0.02] border-black/10 shadow-none">
                    <CardHeader className="border-b border-black/5">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            Strategy Tip: 효자키워드 활용
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-2 text-sm text-start">
                            <div className="font-bold flex items-center gap-2 text-xs uppercase tracking-tight text-black">
                                <Badge variant="outline" className="h-5 px-1.5 rounded-none border-black/10">1</Badge>
                                내부 링크(Internal Link) 전략
                            </div>
                            <p className="text-muted-foreground pl-7 text-xs font-medium leading-relaxed">유입이 활발한 글에서 다른 글들을 링크하여 체류시간을 높이세요.</p>
                        </div>
                        <div className="space-y-2 text-sm text-start">
                            <div className="font-bold flex items-center gap-2 text-xs uppercase tracking-tight text-black">
                                <Badge variant="outline" className="h-5 px-1.5 rounded-none border-black/10">2</Badge>
                                시리즈화(Series) 전략
                            </div>
                            <p className="text-muted-foreground pl-7 text-xs font-medium leading-relaxed">검색 의도가 다양한 키워드는 'A-Z 시리즈'로 묶어 권위를 강화하세요.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
