'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LandingPageType, LandingPageTemplate } from '@/types/landing';
import { ArrowLeft, Check, Sparkles, Layout, Target, MousePointerClick, Download, Plus, BookOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { getAllPublishedPosts } from '@/services/blogService';
import { Post } from '@/types/blog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useEffect } from 'react';

const GOAL_TYPES: { id: LandingPageType; label: string; description: string; icon: any }[] = [
    {
        id: 'consulting',
        label: 'Inquiry / Consulting',
        description: 'Maximize lead generation through professional inquiry forms.',
        icon: Target
    },
    {
        id: 'app_install',
        label: 'App Conversion',
        description: 'Drive users to app stores with clean download CTAs.',
        icon: MousePointerClick
    },
    {
        id: 'lead_magnet',
        label: 'File / Content Delivery',
        description: 'Exchange high-value files for user contact information.',
        icon: Download
    },
    {
        id: 'product_sale',
        label: 'Product Sale',
        description: 'Direct sales focus with product features and purchase links.',
        icon: Layout
    },
];

const MOCK_TEMPLATES: LandingPageTemplate[] = [
    {
        id: 'proto-min-01',
        name: 'Minimalist Startup',
        description: 'Clean, high-contrast design for modern SaaS products.',
        type: 'consulting',
        industry: ['SaaS', 'B2B'],
        thumbnailUrl: '/templates/thumb-01.jpg',
        sections: []
    },
    {
        id: 'proto-lead-01',
        name: 'The Whitepaper',
        description: 'Optimized for high-value PDF and content delivery.',
        type: 'lead_magnet',
        industry: ['Marketing', 'Edu'],
        thumbnailUrl: '/templates/thumb-02.jpg',
        sections: []
    },
    {
        id: 'proto-app-01',
        name: 'Mobile First',
        description: 'Focus on app screenshots and store badges.',
        type: 'app_install',
        industry: ['Utility', 'Lifestyle'],
        thumbnailUrl: '/templates/thumb-03.jpg',
        sections: []
    }
];

export default function CreateLandingPage() {
    const router = useRouter();
    const locale = useLocale();
    const [step, setStep] = useState(1);
    const [selectedGoal, setSelectedGoal] = useState<LandingPageType | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [aiGoal, setAiGoal] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [title, setTitle] = useState('');
    const [posts, setPosts] = useState<Post[]>([]);
    const [selectedPostId, setSelectedPostId] = useState<string>('');

    useEffect(() => {
        const fetchPosts = async () => {
            const data = await getAllPublishedPosts();
            setPosts(data);
        };
        fetchPosts();
    }, []);

    const handlePostSelect = (postId: string) => {
        const post = posts.find(p => p.id === postId);
        if (post) {
            setSelectedPostId(postId);
            setTitle(`LP: ${post.title}`);
            setAiGoal(`[SOURCE BLOG CONTENT]\n---\nTITLE: ${post.title}\nCONTENT: ${post.content}\n---`);
        }
    };

    const handleGoalSelect = (goal: LandingPageType) => {
        setSelectedGoal(goal);
        setStep(2);
    };

    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplate(templateId);
        router.push(`/${locale}/admin/landing/builder?type=${selectedGoal}&template=${templateId}`);
    };

    const handleAIGenerate = async () => {
        if (!selectedGoal || !aiGoal.trim() || !title.trim()) return;

        setIsGenerating(true);
        try {
            const res = await fetch('/api/landing/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal: aiGoal, type: selectedGoal })
            });
            const data = await res.json();

            if (data.sections) {
                // Store in localStorage to pick up in builder
                localStorage.setItem('ai_generated_config', JSON.stringify({
                    title,
                    type: selectedGoal,
                    content: data.sections,
                    locale,
                    groupId: `lp-group-${Date.now()}`
                }));
                router.push(`/${locale}/admin/landing/builder?source=ai`);
            }
        } catch (error) {
            console.error(error);
            alert('AI GENERATION FAILED. RETRY PROTOCOL.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-12">
            <div className="flex items-center justify-between">
                <Link href="/admin/landing">
                    <Button variant="ghost" className="gap-2 rounded-none font-bold text-[10px] uppercase tracking-widest hover:bg-black/[0.05]">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Abort Creation
                    </Button>
                </Link>
                <div className="flex items-center gap-4">
                    <div className={`w-8 h-1 ${step >= 1 ? 'bg-black' : 'bg-black/10'}`} />
                    <div className={`w-8 h-1 ${step >= 2 ? 'bg-black' : 'bg-black/10'}`} />
                </div>
            </div>

            {step === 1 && (
                <div className="space-y-10">
                    <div className="text-center space-y-2">
                        <Badge className="rounded-none bg-black text-white font-bold text-[9px] uppercase tracking-widest px-3">Phase 01</Badge>
                        <h1 className="text-3xl font-black uppercase tracking-tighter">Define Conversion Purpose</h1>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select the core operational goal for this landing infrastructure</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {GOAL_TYPES.map((goal) => (
                            <Card
                                key={goal.id}
                                className={`rounded-none border-black/10 hover:border-black transition-all cursor-pointer group ${selectedGoal === goal.id ? 'bg-black text-white' : 'bg-white'}`}
                                onClick={() => setSelectedGoal(goal.id)}
                            >
                                <CardContent className="p-8 flex items-start gap-6">
                                    <div className={`p-4 rounded-none ${selectedGoal === goal.id ? 'bg-white text-black' : 'bg-black/[0.02] text-black'}`}>
                                        <goal.icon className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-black uppercase tracking-tight">{goal.label}</h3>
                                        <p className={`text-[10px] font-medium leading-relaxed uppercase tracking-tight ${selectedGoal === goal.id ? 'text-white/60' : 'text-muted-foreground'}`}>
                                            {goal.description}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {selectedGoal && (
                        <div className="bg-black text-white p-8 md:p-12 space-y-8 animate-in fade-in slide-in-from-top-4">
                            <div className="space-y-2">
                                <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3">
                                    <Sparkles className="w-5 h-5" />
                                    AI Genesis Protocol
                                </h3>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Provide detailed tactical objectives for autonomous content synthesis</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                                        <BookOpen className="w-3 h-3" />
                                        Select Source Blog Content (Optional)
                                    </label>
                                    <Select onValueChange={handlePostSelect} value={selectedPostId}>
                                        <SelectTrigger className="bg-transparent border-white/20 text-white rounded-none h-12 uppercase font-bold text-xs ring-offset-black">
                                            <SelectValue placeholder="CHOOSE A BLOG POST TO ANALYZE" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-black border-white/20 text-white rounded-none">
                                            {posts.map(post => (
                                                <SelectItem key={post.id} value={post.id} className="focus:bg-white focus:text-black uppercase text-[10px] font-bold">
                                                    {post.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Operation Name (Title)</label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. SEO MAXIMIZER 2026"
                                        className="bg-transparent border-white/20 text-white rounded-none h-12 uppercase font-bold text-xs"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Detailed Mission Objectives</label>
                                    <Textarea
                                        value={aiGoal}
                                        onChange={(e) => setAiGoal(e.target.value)}
                                        placeholder="Describe your target audience, value proposition, and specific conversion desired..."
                                        className="bg-transparent border-white/20 text-white rounded-none min-h-[120px] uppercase font-medium text-xs leading-relaxed"
                                    />
                                </div>
                                <div className="flex flex-col md:flex-row gap-4 pt-4">
                                    <Button
                                        onClick={handleAIGenerate}
                                        disabled={isGenerating || !aiGoal.trim() || !title.trim()}
                                        className="flex-1 bg-white text-black hover:bg-white/90 rounded-none h-14 font-black text-xs uppercase tracking-[0.2em] disabled:opacity-50"
                                    >
                                        {isGenerating ? 'SYNTHESIZING MATRIX...' : 'INITIATE AI GENERATION'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setStep(2)}
                                        className="bg-transparent border-white/20 text-white hover:bg-white/10 rounded-none h-14 font-black text-xs uppercase tracking-widest px-8"
                                    >
                                        Manual Blueprint Selection
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {step === 2 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                    <div className="text-center space-y-2">
                        <Badge className="rounded-none bg-black text-white font-bold text-[9px] uppercase tracking-widest px-3">Phase 02</Badge>
                        <h1 className="text-3xl font-black uppercase tracking-tighter">Choose Architecture</h1>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select a high-conversion blueprint to initialize your landing page</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {MOCK_TEMPLATES.filter(t => t.type === selectedGoal || t.type === 'all').map((template) => (
                            <div key={template.id} className="group cursor-pointer space-y-4" onClick={() => handleTemplateSelect(template.id)}>
                                <div className="aspect-[4/5] bg-black/[0.02] border border-black/10 rounded-none overflow-hidden relative">
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button className="rounded-none bg-white text-black font-bold text-[10px] uppercase tracking-widest px-6 hover:bg-white/90">
                                            Apply Template
                                        </Button>
                                    </div>
                                    {/* Placeholder for template preview */}
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Layout className="w-12 h-12 text-black/5" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest">{template.name}</h4>
                                        <Sparkles className="w-3 h-3 text-black/20" />
                                    </div>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight leading-normal">
                                        {template.description}
                                    </p>
                                </div>
                            </div>
                        ))}

                        <div
                            className="aspect-[4/5] border border-dashed border-black/20 flex flex-col items-center justify-center p-8 text-center space-y-4 hover:border-black transition-colors cursor-pointer"
                            onClick={() => handleTemplateSelect('blank')}
                        >
                            <div className="p-4 bg-black/[0.02]">
                                <Plus className="w-6 h-6 text-black/20" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-black">Start from Scratch</h4>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Zero-base architecture for maximum creative control</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-8">
                        <Button variant="ghost" onClick={() => setStep(1)} className="rounded-none font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
                            Go Back to Purpose Selection
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
