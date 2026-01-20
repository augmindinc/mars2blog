'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPosts } from '@/services/blogService';
import { getContentPlans, createContentPlan, updateContentPlan, deleteContentPlan } from '@/services/planService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    Sparkles,
    Trash2,
    ListChecks,
    FileText,
    ChevronRight,
    TrendingUp,
    Info,
    ArrowLeft,
    Search,
    Calendar,
    User,
    PenLine
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ContentPlan } from '@/types/blog';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Post } from '@/types/blog';

export default function PlanningPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingPosts, setGeneratingPosts] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');

    // Experience Modal State
    const [isExperienceModalOpen, setIsExperienceModalOpen] = useState(false);
    const [experienceData, setExperienceData] = useState({
        experience: '',
        context: '',
        contentType: '정보형'
    });
    const [isExperienceGenerating, setIsExperienceGenerating] = useState(false);

    // 1. Fetch original Korean posts
    const { data: sourcePosts, isLoading: isLoadingPosts } = useQuery({
        queryKey: ['admin-source-posts'],
        queryFn: () => getPosts('ALL', 'ko'),
    });

    // 2. Fetch plans for the selected post
    const { data: plans, isLoading: isLoadingPlans } = useQuery({
        queryKey: ['content-plans', selectedPost?.id],
        queryFn: () => selectedPost ? getContentPlans(selectedPost.id) : Promise.resolve([]),
        enabled: !!selectedPost,
    });

    // 3. AI Generation Mutation
    const generateMutation = useMutation({
        mutationFn: async (post: Post) => {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'plan',
                    existingPosts: [{ title: post.title, content: post.content }]
                }),
            });

            if (!response.ok) throw new Error("AI failed");
            return response.json();
        },
        onSuccess: async (suggestions, post) => {
            for (const item of suggestions) {
                await createContentPlan({
                    title: item.title,
                    description: item.description,
                    reason: item.reason,
                    contentType: item.contentType || 'informational',
                    sourcePostId: post.id,
                    completed: false,
                    createdAt: Timestamp.now(),
                    authorId: user?.uid || 'anonymous'
                });
            }
            queryClient.invalidateQueries({ queryKey: ['content-plans', post.id] });
            setIsGenerating(false);
        },
        onError: (err) => {
            console.error(err);
            alert("Failed to generate suggestions.");
            setIsGenerating(false);
        }
    });

    const handleGenerate = () => {
        if (!selectedPost) return;
        setIsGenerating(true);
        generateMutation.mutate(selectedPost);
    };

    const togglePlan = async (id: string, completed: boolean) => {
        await updateContentPlan(id, { completed: !completed });
        queryClient.invalidateQueries({ queryKey: ['content-plans', selectedPost?.id] });
    };

    const removePlan = async (id: string) => {
        await deleteContentPlan(id);
        queryClient.invalidateQueries({ queryKey: ['content-plans', selectedPost?.id] });
    };

    const handleGeneratePost = async (plan: ContentPlan) => {
        if (!selectedPost || generatingPosts[plan.id]) return;

        setGeneratingPosts(prev => ({ ...prev, [plan.id]: true }));
        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'full-post-generation',
                    sourcePost: selectedPost,
                    plan: plan
                }),
            });

            if (!response.ok) throw new Error("AI generation failed");
            const data = await response.json();

            // Create new post document
            const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const groupId = `group-${Date.now()}`;

            const newPost: any = {
                groupId,
                locale: 'ko',
                title: data.title,
                content: data.content,
                excerpt: data.seoDescription?.substring(0, 160) || '',
                slug: data.slug || `post-${Date.now()}`,
                category: selectedPost.category,
                tags: [],
                author: {
                    id: user?.uid || 'anonymous',
                    name: user?.displayName || 'Anonymous',
                    photoUrl: user?.photoURL ?? null
                },
                thumbnail: {
                    url: '',
                    alt: data.title
                },
                seo: {
                    metaTitle: data.seoTitle || data.title,
                    metaDesc: data.seoDescription || '',
                    structuredData: {
                        "@context": "https://schema.org",
                        "@type": "BlogPosting",
                        "headline": data.seoTitle || data.title,
                        "datePublished": new Date().toISOString(),
                        "author": {
                            "@type": "Person",
                            "name": user?.displayName || 'Anonymous'
                        }
                    }
                },
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                publishedAt: Timestamp.now(),
                status: 'draft',
                viewCount: 0,
                shortCode: shortCode
            };

            await addDoc(collection(db, 'posts'), newPost);

            // Mark plan as completed
            await updateContentPlan(plan.id, { completed: true });

            queryClient.invalidateQueries({ queryKey: ['content-plans', selectedPost.id] });
            alert("초안이 성공적으로 생성되었습니다. 'Posts' 메뉴에서 확인하실 수 있습니다.");

        } catch (error) {
            console.error("Error generating full post:", error);
            alert("글 생성 중 오류가 발생했습니다.");
        } finally {
            setGeneratingPosts(prev => ({ ...prev, [plan.id]: false }));
        }
    };
    const handleExperienceSubmit = async () => {
        if (!experienceData.experience.trim()) {
            alert("최근 겪은 경험이나 생각을 입력해주세요.");
            return;
        }

        setIsExperienceGenerating(true);
        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'experience-to-post',
                    ...experienceData
                }),
            });

            if (!response.ok) throw new Error("AI generation failed");
            const data = await response.json();

            // Create new post document
            const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const groupId = `group-${Date.now()}`;

            // Map contentType to System Category
            const categoryMap: Record<string, string> = {
                '정보형': 'PLANNING',
                '커머스형': 'SHOPPING',
                '이슈형': 'ISSUE'
            };

            const newPost: any = {
                groupId,
                locale: 'ko',
                title: data.title,
                content: data.content,
                excerpt: data.seoDescription?.substring(0, 160) || '',
                slug: data.slug || `post-${Date.now()}`,
                category: categoryMap[experienceData.contentType] || 'PLANNING',
                tags: ['AI-Partner', '에세이톤', experienceData.contentType],
                author: {
                    id: user?.uid || 'anonymous',
                    name: user?.displayName || 'Anonymous',
                    photoUrl: user?.photoURL ?? null
                },
                thumbnail: { url: '', alt: data.title },
                seo: {
                    metaTitle: data.seoTitle || data.title,
                    metaDesc: data.seoDescription || '',
                    structuredData: {
                        "@context": "https://schema.org",
                        "@type": "BlogPosting",
                        "headline": data.seoTitle || data.title,
                        "datePublished": new Date().toISOString(),
                        "author": {
                            "@type": "Person",
                            "name": user?.displayName || 'Anonymous'
                        }
                    }
                },
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                publishedAt: Timestamp.now(),
                status: 'draft',
                viewCount: 0,
                shortCode: shortCode
            };

            await addDoc(collection(db, 'posts'), newPost);

            alert("에세이 초안이 성공적으로 생성되었습니다. 'Posts' 메뉴에서 확인하실 수 있습니다.");
            setIsExperienceModalOpen(false);
            setExperienceData({ experience: '', context: '', contentType: '정보형' });
            queryClient.invalidateQueries({ queryKey: ['admin-source-posts'] });

        } catch (error) {
            console.error("Error generating experience post:", error);
            alert("글 생성 중 오류가 발생했습니다.");
        } finally {
            setIsExperienceGenerating(false);
        }
    };

    const filteredPosts = sourcePosts?.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-20 text-start">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight text-black">
                        AI 콘텐츠 기획 센터
                    </h2>
                    <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-tight">
                        발행된 기존 게시글의 맥락을 분석하거나, 당신의 경험을 에세이로 만들어보세요.
                    </p>
                </div>

                <Dialog open={isExperienceModalOpen} onOpenChange={setIsExperienceModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-none bg-black text-white hover:bg-black/90 h-10 px-6 font-bold text-[10px] uppercase tracking-widest gap-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            경험 기반 초안 만들기
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] rounded-none border-black/20 shadow-2xl p-0 overflow-hidden">
                        <DialogHeader className="p-6 bg-black/[0.02] border-b border-black/5">
                            <DialogTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">경험을 에세이로 바꾸기</DialogTitle>
                            <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mt-1">
                                한 줄의 경험이라도 괜찮습니다. 당신의 생각을 정리해주는 파트너가 되어드릴게요.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 p-6">
                            <div className="space-y-2">
                                <Label htmlFor="experience" className="text-[10px] font-bold uppercase tracking-tight">최근 겪은 경험 / 관찰 / 생각 (한 줄 이상)</Label>
                                <Textarea
                                    id="experience"
                                    placeholder="예: 오늘 아침 카페에서 본 노부부의 뒷모습이 마음에 남았어요."
                                    className="min-h-[120px] bg-black/[0.02] border border-black/10 rounded-none resize-none focus-visible:ring-black/10 font-medium text-sm"
                                    value={experienceData.experience}
                                    onChange={(e) => setExperienceData(prev => ({ ...prev, experience: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="context" className="text-[10px] font-bold uppercase tracking-tight">관련된 제품·서비스·이슈 (선택)</Label>
                                    <Input
                                        id="context"
                                        placeholder="예: 아이폰 15 보조배터리"
                                        className="bg-black/[0.02] border border-black/10 rounded-none focus-visible:ring-black/10 text-xs font-bold"
                                        value={experienceData.context}
                                        onChange={(e) => setExperienceData(prev => ({ ...prev, context: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-tight">글의 목적</Label>
                                    <Select
                                        value={experienceData.contentType}
                                        onValueChange={(val) => setExperienceData(prev => ({ ...prev, contentType: val }))}
                                    >
                                        <SelectTrigger className="bg-black/[0.02] border border-black/10 rounded-none font-bold text-xs">
                                            <SelectValue placeholder="유형 선택" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none border-black/10">
                                            <SelectItem value="정보형">정보형 (인사이트 중심)</SelectItem>
                                            <SelectItem value="커머스형">커머스형 (선택의 이유)</SelectItem>
                                            <SelectItem value="이슈형">이슈형 (사회적 맥락 연결)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="p-6 bg-black/[0.02] border-t border-black/5">
                            <Button
                                className="w-full h-12 bg-black text-white hover:bg-black/90 font-bold text-[10px] uppercase tracking-widest rounded-none"
                                onClick={handleExperienceSubmit}
                                disabled={isExperienceGenerating}
                            >
                                {isExperienceGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        에세이 파트너가 분석 중...
                                    </>
                                ) : (
                                    <>
                                        <PenLine className="w-4 h-4 mr-2" />
                                        에세이 초안 생성하기
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="rounded-none border border-black/10 shadow-none bg-background overflow-hidden text-start">
                <CardHeader className="border-b border-black/5 bg-black/[0.02] py-4 px-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            아이디어 소스 (발행된 게시글)
                        </CardTitle>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                placeholder="제목 또는 카테고리로 검색..."
                                className="pl-9 h-9 bg-background rounded-none border-black/10 text-xs font-bold"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoadingPosts ? (
                        <div className="p-20 text-center space-y-4">
                            <Loader2 className="w-10 h-10 animate-spin mx-auto text-black/5" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">콘텐츠 라이브러리를 불러오는 중입니다...</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-black/5">
                            {filteredPosts?.map((post) => (
                                <div
                                    key={post.id}
                                    onClick={() => setSelectedPost(post)}
                                    className="p-5 hover:bg-black/[0.02] transition-colors cursor-pointer group flex items-center justify-between"
                                >
                                    <div className="flex items-start gap-4 min-w-0">
                                        <div className="w-10 h-10 rounded-none bg-black/[0.05] flex items-center justify-center shrink-0 transition-colors">
                                            <FileText className="w-5 h-5 text-black" />
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <h4 className="font-bold text-foreground group-hover:text-black transition-colors truncate pr-4">
                                                {post.title}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                                <Badge variant="outline" className="px-2 py-0 h-5 font-bold rounded-none border-black/10 uppercase tracking-tight text-[9px]">
                                                    {post.category}
                                                </Badge>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(post.publishedAt?.seconds * 1000), 'yyyy.MM.dd')}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {post.author.name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="hidden md:flex items-center gap-2 rounded-none border-black/10 hover:bg-black hover:text-white font-bold text-[10px] uppercase tracking-widest h-8"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            아이디어 관리
                                        </Button>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-black transition-all" />
                                    </div>
                                </div>
                            ))}
                            {filteredPosts?.length === 0 && (
                                <div className="p-20 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    No posts matched your search.
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Sheet open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
                <SheetContent className="sm:max-w-xl w-full p-0 border-l border-black/10 shadow-none overflow-y-auto rounded-none text-start">
                    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-black/5 p-6 space-y-6">
                        <SheetHeader className="space-y-4 text-left">
                            <div className="flex items-center gap-2 text-black font-bold text-[10px] uppercase tracking-widest">
                                <Sparkles className="w-3.5 h-3.5" />
                                AI Content Planning
                            </div>
                            <SheetTitle className="text-2xl font-bold leading-tight">
                                {selectedPost?.title}
                            </SheetTitle>
                            <SheetDescription className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground border-l-2 border-black pl-4 py-1">
                                {selectedPost?.excerpt || 'Context analysis complete. Ready for new ideas.'}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="pt-2">
                            <Button
                                className="w-full bg-black hover:bg-black/90 text-white rounded-none h-12 text-xs font-bold uppercase tracking-widest"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                ) : (
                                    <Sparkles className="w-5 h-5 mr-2" />
                                )}
                                {plans && plans.length > 0 ? '아이디어 추가 추출' : 'AI 아이디어 생성'}
                            </Button>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <ListChecks className="w-4 h-4" />
                                Content Plan Backlog
                            </h3>
                            <Badge variant="outline" className="rounded-none border-black/10 px-2 font-bold text-[9px] uppercase tracking-tight">{plans?.length || 0} Suggestions</Badge>
                        </div>

                        {isLoadingPlans ? (
                            <div className="py-20 text-center space-y-4">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-black/5" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Analyzing context...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <AnimatePresence mode="popLayout">
                                    {plans?.map((plan, index) => (
                                        <motion.div
                                            key={plan.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            transition={{ duration: 0.2, delay: index * 0.03 }}
                                        >
                                            <Card className={`rounded-none border-black/10 shadow-none transition-all ${plan.completed ? 'bg-black/[0.02] opacity-50' : 'bg-white hover:border-black/30'
                                                }`}>
                                                <CardContent className="p-5">
                                                    <div className="flex items-start gap-3">
                                                        <div className="pt-1">
                                                            <Checkbox
                                                                checked={plan.completed}
                                                                onCheckedChange={() => togglePlan(plan.id, plan.completed)}
                                                                className="w-4 h-4 rounded-none border-black/20 data-[state=checked]:bg-black data-[state=checked]:border-black"
                                                            />
                                                        </div>
                                                        <div className="flex-1 space-y-4">
                                                            <div className="space-y-2">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={`text-[9px] h-4 rounded-none border-black/10 font-bold uppercase tracking-tight ${plan.contentType === 'trend' ? 'bg-black text-white border-none' : 'bg-black/[0.05]'
                                                                            }`}
                                                                    >
                                                                        {plan.contentType === 'trend' ? '트렌드' : '정보성'}
                                                                    </Badge>
                                                                </div>
                                                                <h4 className={`font-bold text-sm leading-tight ${plan.completed ? 'text-muted-foreground line-through' : 'text-black'}`}>
                                                                    {plan.title}
                                                                </h4>
                                                                <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                                                                    {plan.description}
                                                                </p>
                                                            </div>

                                                            {!plan.completed && (
                                                                <div className="bg-black/[0.02] p-3 text-[10px] font-bold uppercase tracking-tight leading-relaxed text-muted-foreground border-l border-black/20">
                                                                    {plan.reason}
                                                                </div>
                                                            )}

                                                            <div className="flex items-center justify-between pt-3 border-t border-black/5">
                                                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                                                                    {format(new Date(plan.createdAt?.seconds * 1000), 'yyyy.MM.dd')}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    {!plan.completed && (
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => handleGeneratePost(plan)}
                                                                            disabled={generatingPosts[plan.id]}
                                                                            className="h-8 px-3 bg-black text-white hover:bg-black/80 font-bold text-[9px] uppercase tracking-widest rounded-none"
                                                                        >
                                                                            {generatingPosts[plan.id] ? (
                                                                                <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                                                                            ) : (
                                                                                <PenLine className="w-3 h-3 mr-1.5" />
                                                                            )}
                                                                            AI 포스팅 생성
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => removePlan(plan.id)}
                                                                        className="h-8 w-8 text-black/30 hover:text-black hover:bg-black/[0.05] rounded-none"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {plans?.length === 0 && !isGenerating && (
                                    <div className="py-20 text-center space-y-4 bg-black/[0.02] border border-dashed border-black/10 rounded-none">
                                        <div className="p-3 bg-black/[0.05] w-fit mx-auto">
                                            <Sparkles className="w-5 h-5 text-black/10" />
                                        </div>
                                        <div className="space-y-1 px-4">
                                            <p className="font-bold text-[10px] uppercase tracking-widest">No suggestions yet</p>
                                            <p className="text-[10px] font-medium text-muted-foreground max-w-[200px] mx-auto uppercase tracking-tight">
                                                Click Generate to get tailored ideas based on this post's topic.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
