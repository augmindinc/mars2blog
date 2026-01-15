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

    const filteredPosts = sourcePosts?.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                    AI 콘텐츠 기획 센터 (Ideation)
                </h2>
                <p className="text-muted-foreground font-medium">
                    발행된 기존 게시글의 맥락을 분석하여 새로운 글감을 제안받으세요.
                </p>
            </div>

            {/* Search and List Section */}
            <Card className="border-none shadow-xl bg-background/60 backdrop-blur-xl overflow-hidden">
                <CardHeader className="border-b bg-muted/30 pb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            아이디어 소스 (발행된 게시글)
                        </CardTitle>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="제목 또는 카테고리로 검색..."
                                className="pl-9 bg-background/50"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoadingPosts ? (
                        <div className="p-20 text-center space-y-4">
                            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                            <p className="text-muted-foreground animate-pulse">콘텐츠 라이브러리를 불러오는 중입니다...</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {filteredPosts?.map((post) => (
                                <div
                                    key={post.id}
                                    onClick={() => setSelectedPost(post)}
                                    className="p-5 hover:bg-muted/40 transition-all cursor-pointer group flex items-center justify-between"
                                >
                                    <div className="flex items-start gap-4 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                            <FileText className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <h4 className="font-bold text-foreground group-hover:text-primary transition-colors truncate pr-4">
                                                {post.title}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                <Badge variant="secondary" className="px-2 py-0 h-5 font-mono text-[10px] uppercase">
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
                                    <div className="flex items-center gap-4 group-hover:translate-x-[-4px] transition-transform">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="hidden md:flex items-center gap-2 bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            아이디어 관리
                                        </Button>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all" />
                                    </div>
                                </div>
                            ))}
                            {filteredPosts?.length === 0 && (
                                <div className="p-20 text-center text-muted-foreground italic">
                                    No posts matched your search.
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Sidebar / Detailed Planning Sheet */}
            <Sheet open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
                <SheetContent className="sm:max-w-xl w-full p-0 border-l shadow-2xl overflow-y-auto">
                    {/* Sidebar Header */}
                    <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b p-6">
                        <SheetHeader className="space-y-4 text-left">
                            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                                <Sparkles className="w-4 h-4" />
                                AI Content Planning
                            </div>
                            <SheetTitle className="text-2xl font-black leading-tight">
                                {selectedPost?.title}
                            </SheetTitle>
                            <SheetDescription className="line-clamp-2 italic border-l-2 border-primary/20 pl-4 py-1">
                                {selectedPost?.excerpt || 'Context analysis complete. Ready for new ideas.'}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="mt-8">
                            <Button
                                className="w-full bg-gradient-to-r from-primary to-purple-600 hover:shadow-lg h-12 text-md font-bold"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                ) : (
                                    <Sparkles className="w-5 h-5 mr-2" />
                                )}
                                {plans && plans.length > 0 ? '새로운 아이디어 추가 추출' : 'AI Ideas 생성'}
                            </Button>
                        </div>
                    </div>

                    {/* Recommendations List Container */}
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <ListChecks className="w-5 h-5 text-primary" />
                                Content Plan Backlog
                            </h3>
                            <Badge variant="outline" className="font-mono">{plans?.length || 0} Suggestions</Badge>
                        </div>

                        {isLoadingPlans ? (
                            <div className="py-20 text-center space-y-4">
                                <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                                <p className="text-sm font-medium text-muted-foreground">Analyzing deep context...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <AnimatePresence mode="popLayout">
                                    {plans?.map((plan, index) => (
                                        <motion.div
                                            key={plan.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.3, delay: index * 0.05 }}
                                        >
                                            <Card className={`group border-transparent transition-all duration-300 ${plan.completed ? 'bg-muted/30 opacity-60' : 'bg-muted/50 hover:bg-background hover:shadow-xl border-primary/10'
                                                }`}>
                                                <CardContent className="p-5">
                                                    <div className="flex items-start gap-3">
                                                        <div className="pt-1">
                                                            <Checkbox
                                                                checked={plan.completed}
                                                                onCheckedChange={() => togglePlan(plan.id, plan.completed)}
                                                                className="w-5 h-5"
                                                            />
                                                        </div>
                                                        <div className="flex-1 space-y-3">
                                                            <div className="space-y-1">
                                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                    <Badge
                                                                        variant={plan.contentType === 'trend' ? 'default' : 'secondary'}
                                                                        className={`text-[9px] h-4 gap-1 ${plan.contentType === 'trend' ? 'bg-orange-500 hover:bg-orange-500' : ''
                                                                            }`}
                                                                    >
                                                                        {plan.contentType === 'trend' ? <TrendingUp className="w-2 h-2" /> : <Info className="w-2 h-2" />}
                                                                        {plan.contentType === 'trend' ? '트렌드' : '정보성'}
                                                                    </Badge>
                                                                </div>
                                                                <h4 className={`font-bold leading-tight ${plan.completed ? 'line-through text-muted-foreground italic' : ''}`}>
                                                                    {plan.title}
                                                                </h4>
                                                                <p className={`text-xs leading-relaxed ${plan.completed ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                                                                    {plan.description}
                                                                </p>
                                                            </div>

                                                            {!plan.completed && (
                                                                <div className="bg-background/50 rounded p-3 text-[11px] leading-relaxed italic text-foreground/70 border-l border-primary/20">
                                                                    {plan.reason}
                                                                </div>
                                                            )}

                                                            <div className="flex items-center justify-between pt-2 border-t border-border/20">
                                                                <span className="text-[9px] text-muted-foreground font-mono">
                                                                    {format(new Date(plan.createdAt?.seconds * 1000), 'yyyy.MM.dd')}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    {!plan.completed && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="default"
                                                                            onClick={() => handleGeneratePost(plan)}
                                                                            disabled={generatingPosts[plan.id]}
                                                                            className="h-7 px-3 bg-primary hover:bg-primary/90 text-[10px] font-bold gap-1.5"
                                                                        >
                                                                            {generatingPosts[plan.id] ? (
                                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                            ) : (
                                                                                <PenLine className="w-3 h-3" />
                                                                            )}
                                                                            AI 포스팅 생성
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => removePlan(plan.id)}
                                                                        className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
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
                                    <div className="py-20 text-center space-y-4 bg-muted/20 border-2 border-dashed rounded-xl">
                                        <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto">
                                            <Sparkles className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="space-y-1 px-4">
                                            <p className="font-bold text-sm">No suggestions yet</p>
                                            <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
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
