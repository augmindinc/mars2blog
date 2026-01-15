'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPosts } from '@/services/blogService';
import { getContentPlans, createContentPlan, updateContentPlan, deleteContentPlan } from '@/services/planService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, RefreshCw, Trash2, ListChecks, FileText, ChevronRight, TrendingUp, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlanningPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isGenerating, setIsGenerating] = useState(false);

    // 1. Fetch original Korean posts
    const { data: sourcePosts, isLoading: isLoadingPosts } = useQuery({
        queryKey: ['admin-source-posts'],
        queryFn: () => getPosts('ALL', 'ko'),
    });

    // 2. Fetch saved plans
    const { data: plans, isLoading: isLoadingPlans } = useQuery({
        queryKey: ['content-plans'],
        queryFn: () => getContentPlans(),
    });

    // 3. AI Generation Mutation
    const generateMutation = useMutation({
        mutationFn: async () => {
            const existingPosts = sourcePosts?.map(p => ({ title: p.title, content: p.content })) || [];
            if (existingPosts.length === 0) throw new Error("No source posts found");

            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'plan', existingPosts }),
            });

            if (!response.ok) throw new Error("AI failed");
            return response.json();
        },
        onSuccess: async (suggestions) => {
            // Save each suggestion to Firestore
            for (const item of suggestions) {
                await createContentPlan({
                    title: item.title,
                    description: item.description,
                    reason: item.reason,
                    contentType: item.contentType || 'informational',
                    completed: false,
                    createdAt: Timestamp.now(),
                    authorId: user?.uid || 'anonymous'
                });
            }
            queryClient.invalidateQueries({ queryKey: ['content-plans'] });
            setIsGenerating(false);
        },
        onError: (err) => {
            console.error(err);
            alert("Failed to generate suggestions.");
            setIsGenerating(false);
        }
    });

    const handleGenerate = () => {
        setIsGenerating(true);
        generateMutation.mutate();
    };

    const togglePlan = async (id: string, completed: boolean) => {
        await updateContentPlan(id, { completed: !completed });
        queryClient.invalidateQueries({ queryKey: ['content-plans'] });
    };

    const removePlan = async (id: string) => {
        await deleteContentPlan(id);
        queryClient.invalidateQueries({ queryKey: ['content-plans'] });
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                        Content Ideation & Planning
                    </h2>
                    <p className="text-muted-foreground mt-1 font-medium">
                        AI-powered blog topic recommendations based on your existing content.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        size="lg"
                        onClick={handleGenerate}
                        disabled={isGenerating || (sourcePosts?.length === 0)}
                        className="bg-gradient-to-r from-primary to-purple-600 hover:shadow-lg transition-all duration-300"
                    >
                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                        {plans && plans.length > 0 ? 'Shuffle New Ideas' : 'Generate AI Ideas'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Source Content Reference */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-none shadow-xl bg-background/60 backdrop-blur-xl overflow-hidden">
                        <CardHeader className="bg-muted/50 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Source Content
                            </CardTitle>
                            <CardDescription>
                                Currently using your published Korean posts as context.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                            {isLoadingPosts ? (
                                <div className="p-8 text-center space-y-3">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                                    <p className="text-xs text-muted-foreground">Loading source posts...</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {sourcePosts?.map((post) => (
                                        <div key={post.id} className="p-4 hover:bg-muted/30 transition-colors group">
                                            <div className="flex items-start gap-3">
                                                <Badge variant="outline" className="mt-0.5 shrink-0 bg-background">KO</Badge>
                                                <div className="space-y-1 min-w-0">
                                                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{post.title}</p>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                        <span>{post.category}</span>
                                                        <span>•</span>
                                                        <span>{post.author.name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {sourcePosts?.length === 0 && (
                                        <div className="p-8 text-center text-muted-foreground italic text-sm">
                                            No published Korean posts found.
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Column 2 & 3: AI Recommendations List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <ListChecks className="w-6 h-6 text-purple-500" />
                            Content Plan Backlog
                        </h3>
                        <Badge variant="secondary" className="px-3 py-1 font-mono">
                            {plans?.length || 0} Suggestions
                        </Badge>
                    </div>

                    <div className="space-y-4">
                        {isLoadingPlans ? (
                            <div className="p-20 text-center space-y-4">
                                <div className="relative w-12 h-12 mx-auto">
                                    <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
                                    <Loader2 className="w-12 h-12 animate-spin text-primary relative z-10" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">Synchronizing with AI archives...</p>
                            </div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {plans?.map((plan, index) => (
                                    <motion.div
                                        key={plan.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                    >
                                        <Card className={`group relative border-transparent transition-all duration-300 hover:shadow-2xl overflow-hidden ${plan.completed ? 'bg-muted/30 opacity-70' : 'bg-gradient-to-br from-background to-muted/20 border-border/50'
                                            }`}>
                                            {/* Rainbow accent bar for new/incomplete items */}
                                            {!plan.completed && (
                                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary via-purple-500 to-pink-500" />
                                            )}

                                            <CardContent className="p-6">
                                                <div className="flex items-start gap-4">
                                                    <div className="pt-1">
                                                        <Checkbox
                                                            checked={plan.completed}
                                                            onCheckedChange={() => togglePlan(plan.id, plan.completed)}
                                                            className="w-5 h-5 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                        />
                                                    </div>
                                                    <div className="flex-1 space-y-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h4 className={`text-lg font-bold leading-tight transition-all duration-500 ${plan.completed ? 'line-through text-muted-foreground italic' : 'text-foreground'
                                                                }`}>
                                                                {plan.title}
                                                            </h4>
                                                            <Badge
                                                                variant={plan.contentType === 'trend' ? 'default' : 'secondary'}
                                                                className={`text-[10px] h-5 gap-1 shrink-0 ${plan.contentType === 'trend'
                                                                        ? 'bg-orange-500 hover:bg-orange-600 text-white border-none'
                                                                        : 'bg-blue-500/10 text-blue-600 border-blue-200'
                                                                    }`}
                                                            >
                                                                {plan.contentType === 'trend' ? (
                                                                    <>
                                                                        <TrendingUp className="w-3 h-3" />
                                                                        최근 트렌드 이슈
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Info className="w-3 h-3" />
                                                                        정보성 콘텐츠
                                                                    </>
                                                                )}
                                                            </Badge>
                                                        </div>
                                                        <p className={`text-sm leading-relaxed transition-all duration-500 ${plan.completed ? 'text-muted-foreground/60' : 'text-muted-foreground font-medium'
                                                            }`}>
                                                            {plan.description}
                                                        </p>

                                                        {!plan.completed && (
                                                            <div className="bg-primary/5 rounded-lg p-4 border border-primary/10 transition-all group-hover:bg-primary/10">
                                                                <div className="flex items-center gap-2 mb-1 text-primary">
                                                                    <Sparkles className="w-3.5 h-3.5" />
                                                                    <span className="text-[11px] font-bold uppercase tracking-wider">Why AI recommends this:</span>
                                                                </div>
                                                                <p className="text-xs text-foreground/80 leading-relaxed italic">
                                                                    "{plan.reason}"
                                                                </p>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                                Generated on {new Date(plan.createdAt?.seconds * 1000).toLocaleDateString()}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removePlan(plan.id)}
                                                                    className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
                        )}

                        {plans && plans.length === 0 && !isLoadingPlans && (
                            <div className="flex flex-col items-center justify-center p-20 bg-muted/20 border-2 border-dashed rounded-2xl text-center space-y-6">
                                <div className="p-4 bg-primary/10 rounded-full">
                                    <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                                </div>
                                <div className="space-y-2 max-w-sm">
                                    <h4 className="text-xl font-bold">No Content Plans Yet</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Click the button above to have Gemini analyze your existing content and suggest your next 5 viral blog topics.
                                    </p>
                                </div>
                                <Button size="lg" onClick={handleGenerate} disabled={isGenerating || sourcePosts?.length === 0}>
                                    {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    Get Suggestions Now
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
