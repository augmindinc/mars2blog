'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import slugify from 'slugify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LandingPage, LandingPageSection, LandingPageType } from '@/types/landing';
import {
    ChevronUp, ChevronDown, Trash2, Plus, Play, Save, Monitor, Smartphone,
    ArrowLeft, Type, Image as ImageIcon, FormInput as FormIcon, Layout as LayoutIcon,
    Layers, Settings, Eye, EyeOff, CheckCircle2, Sparkles, X, RefreshCw,
    Languages, Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { createLandingPage, updateLandingPage, getLandingPage, getLandingPageTranslations } from '@/services/landingService';
import { Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';

interface LandingTranslationData {
    id?: string;
    enabled: boolean;
    title: string;
    slug: string;
    content: LandingPageSection[];
    callouts: string[];
    seo: { title: string; description: string; };
}

// --- SECTION PRESETS ---
const SECTION_TEMPLATES: Record<string, any> = {
    hero: {
        title: 'REVOLUTIONIZE YOUR WORKFLOW',
        subtitle: 'The ultimate minimalist engine for modern creators and visionary digital architects.',
        buttonText: 'GET STARTED NOW',
        imageUrl: '',
        badge: 'NEW ERA OF PRODUCTIVITY',
    },
    problem: {
        title: 'STOP WASTING RESOURCES',
        subtitle: 'Traditional systems are slowing you down. Here is why:',
        points: [
            'Inefficient resource allocation',
            'Fragmented communication channels',
            'Obsolescence of legacy tools'
        ]
    },
    solution: {
        title: 'THE PROTOCOL SOLUTION',
        subtitle: 'A unified field theory for your business operations.',
        items: [
            { title: 'Unified Core', description: 'Everything in one high-performance terminal.' },
            { title: 'Auto-Scaling', description: 'Growth without the infrastructure headache.' }
        ]
    },
    features: {
        items: [
            { title: 'Sharp Design', description: 'Zero rounded corners for maximum professional impact.' },
            { title: 'Infinite Scale', description: 'Built on top of elite cloud infrastructure.' },
            { title: 'AI Driven', description: 'Smart content generation at your fingertips.' },
        ]
    },
    process: {
        title: 'HOW IT OPERATES',
        steps: [
            { title: 'INITIALIZE', description: 'Connect your data sources.' },
            { title: 'PROCESS', description: 'AI evaluates and optimizes.' },
            { title: 'PROFIT', description: 'Visual results in 24 hours.' }
        ]
    },
    social_proof: {
        title: 'TRUSTED BY LEADERS',
        logos: ['LOGIC', 'MATRIX', 'ORBIT', 'KINETIC'],
        testimonials: [
            { author: 'Jane Doe', role: 'CEO, Matrix', text: 'The efficiency gained is unprecedented.' }
        ]
    },
    pricing: {
        title: 'TRANSPARENT VALUE',
        plans: [
            { name: 'STARTER', price: '$0', features: ['Basic Access', '1 User'] },
            { name: 'PRO', price: '$99', features: ['Core Access', '10 Users', 'Priority Support'], recommended: true },
            { name: 'ENTERPRISE', price: 'CUSTOM', features: ['Full Access', 'Unlimited', 'Dedicated Node'] }
        ]
    },
    faq: {
        title: 'QUERIES & CLARITY',
        items: [
            { q: 'Is deployment instant?', a: 'Yes, our automated agents handle everything in real-time.' },
            { q: 'Can I cancel anytime?', a: 'Absolute freedom is part of our manifesto.' }
        ]
    },
    cta_form: {
        title: 'READY TO START?',
        subtitle: 'Enter your credentials to join the elite network.',
        buttonText: 'JOIN PROTOCOL',
        fields: [
            { id: 'f1', type: 'text', label: 'NAME', placeholder: 'YOUR FULL NAME', required: true },
            { id: 'f2', type: 'email', label: 'EMAIL', placeholder: 'IDENTIFIER / EMAIL', required: true },
            { id: 'f3', type: 'consent', label: 'I AGREE TO THE PRIVACY PROTOCOL', required: true }
        ]
    },
    footer: {
        company: 'MARS2BLOG / PROTOCOL',
        links: [
            { label: 'TERMS', url: '' },
            { label: 'PRIVACY', url: '' },
            { label: 'CONTACT', url: '' }
        ],
        copyright: '© 2026 ARCHITECTURAL SYSTEMS'
    }
};

function BuilderContent() {
    const searchParams = useSearchParams();
    const pageId = searchParams.get('id');
    const router = useRouter();
    const locale = useLocale();
    const type = (searchParams.get('type') as LandingPageType) || 'consulting';

    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [isAiRefining, setIsAiRefining] = useState(false);
    const [refineGoal, setRefineGoal] = useState('');
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [isGeneratingCallouts, setIsGeneratingCallouts] = useState(false);
    const [showCalloutModal, setShowCalloutModal] = useState(false);
    const [tempCallouts, setTempCallouts] = useState<string[]>([]);
    const [translations, setTranslations] = useState<Record<string, LandingTranslationData>>({
        en: { enabled: false, title: '', slug: '', content: [], callouts: [], seo: { title: '', description: '' } },
        ja: { enabled: false, title: '', slug: '', content: [], callouts: [], seo: { title: '', description: '' } },
        zh: { enabled: false, title: '', slug: '', content: [], callouts: [], seo: { title: '', description: '' } },
    });
    const [isTranslating, setIsTranslating] = useState(false);

    const [pageConfig, setPageConfig] = useState<Partial<LandingPage>>({
        title: 'Untitled Landing Page',
        slug: 'new-landing-' + Date.now().toString().slice(-4),
        type: type,
        status: 'draft',
        locale: locale as string,
        groupId: `lp-group-${Date.now()}`,
        content: [
            { id: 'h1', type: 'hero', order: 0, content: SECTION_TEMPLATES.hero },
            { id: 'p1', type: 'problem', order: 1, content: SECTION_TEMPLATES.problem },
            { id: 's1', type: 'solution', order: 2, content: SECTION_TEMPLATES.solution },
            { id: 'c1', type: 'cta_form', order: 3, content: SECTION_TEMPLATES.cta_form },
            { id: 'f1', type: 'footer', order: 4, content: SECTION_TEMPLATES.footer },
        ],
        stats: { views: 0, conversions: 0 },
        seo: { title: '', description: '' }
    });

    useEffect(() => {
        if (pageId) {
            const loadPage = async () => {
                const data = await getLandingPage(pageId);
                if (data) {
                    setPageConfig(data);

                    // Fetch translations
                    if (data.groupId) {
                        const allTrans = await getLandingPageTranslations(data.groupId);
                        const transObj = { ...translations };
                        allTrans.forEach(t => {
                            if (t.locale !== locale) {
                                transObj[t.locale] = {
                                    id: t.id,
                                    enabled: true,
                                    title: t.title,
                                    slug: t.slug,
                                    content: t.content,
                                    callouts: t.callouts || [],
                                    seo: t.seo
                                };
                            }
                        });
                        setTranslations(transObj);
                    }
                }
            };
            loadPage();
        } else if (searchParams.get('source') === 'ai') {
            const aiDataStr = localStorage.getItem('ai_generated_config');
            if (aiDataStr) {
                try {
                    const aiData = JSON.parse(aiDataStr);
                    setPageConfig(prev => ({
                        ...prev,
                        title: aiData.title || prev.title,
                        type: aiData.type || prev.type,
                        groupId: aiData.groupId || prev.groupId,
                        locale: aiData.locale || prev.locale,
                        content: aiData.content.map((s: any, idx: number) => ({
                            ...s,
                            order: idx
                        })),
                        slug: aiData.suggestedSlug ||
                            (aiData.title ? slugify(aiData.title.replace(/^LP:\s*/i, ''), { lower: true, strict: true }) : '') ||
                            `lp-${Date.now().toString().slice(-4)}`
                    }));
                    // Clean up
                    localStorage.removeItem('ai_generated_config');
                } catch (e) {
                    console.error('Failed to parse AI data', e);
                }
            }
        }
    }, [pageId, searchParams]);

    const addSection = (sectionType: string) => {
        const newSection: LandingPageSection = {
            id: Math.random().toString(36).substr(2, 9),
            type: sectionType,
            order: (pageConfig.content?.length || 0),
            content: SECTION_TEMPLATES[sectionType] || { title: 'New ' + sectionType },
        };
        setPageConfig(prev => ({
            ...prev,
            content: [...(prev.content || []), newSection]
        }));
    };

    const removeSection = (id: string) => {
        setPageConfig(prev => ({
            ...prev,
            content: prev.content?.filter(s => s.id !== id)
        }));
        if (activeSectionId === id) setActiveSectionId(null);
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        const sections = [...(pageConfig.content || [])];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= sections.length) return;

        [sections[index], sections[targetIndex]] = [sections[targetIndex], sections[index]];

        setPageConfig(prev => ({ ...prev, content: sections }));
    };

    const updateSectionContent = (id: string, newContent: any) => {
        setPageConfig(prev => ({
            ...prev,
            content: prev.content?.map(s => s.id === id ? { ...s, content: { ...s.content, ...newContent } } : s)
        }));
    };

    const handleAiRefine = async () => {
        if (!refineGoal.trim()) return;
        setIsAiRefining(true);
        try {
            const res = await fetch('/api/landing/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal: refineGoal, type: pageConfig.type })
            });
            const data = await res.json();
            if (data.sections) {
                setPageConfig(prev => ({
                    ...prev,
                    content: data.sections.map((s: any, idx: number) => ({ ...s, order: idx })),
                    slug: data.suggestedSlug || prev.slug
                }));
                setShowAiPanel(false);
                setRefineGoal('');
                alert('ARCHITECTURAL MATRIX RE-GENERATED BY AI.');
            }
        } catch (error) {
            console.error(error);
            alert('AI SYNTHESIS FAILED.');
        } finally {
            setIsAiRefining(false);
        }
    };

    const handleGenerateCallouts = async () => {
        setIsGeneratingCallouts(true);
        try {
            const res = await fetch('/api/landing/callouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: pageConfig.content })
            });
            const data = await res.json();
            if (data.callouts) {
                setTempCallouts(data.callouts);
                setShowCalloutModal(true);
            }
        } catch (error) {
            console.error(error);
            alert('CALLOUT SYNTHESIS FAILED.');
        } finally {
            setIsGeneratingCallouts(false);
        }
    };

    const handleSaveCallouts = () => {
        setPageConfig(prev => ({ ...prev, callouts: tempCallouts }));
        setShowCalloutModal(false);
        alert('CALLOUT PROTOCOL SECURED.');
    };

    const handleTranslateAll = async () => {
        if (!pageConfig.title || !pageConfig.content) return;
        setIsTranslating(true);
        const targetLocales = Object.keys(translations);

        try {
            for (const lang of targetLocales) {
                const res = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'translate-landing',
                        targetLocale: lang === 'en' ? 'English' : lang === 'ja' ? 'Japanese' : 'Chinese',
                        title: pageConfig.title,
                        content: pageConfig.content,
                        callouts: pageConfig.callouts || [],
                        seo: pageConfig.seo
                    }),
                });

                if (!res.ok) continue;

                const data = await res.json();
                setTranslations(prev => ({
                    ...prev,
                    [lang]: {
                        ...prev[lang],
                        enabled: true,
                        title: data.title,
                        slug: data.slug,
                        content: data.content,
                        callouts: data.callouts,
                        seo: data.seo
                    }
                }));
            }
            alert('ALL LANDING SEQUENCES TRANSLATED.');
        } catch (error) {
            console.error(error);
            alert('TRANSLATION SYNTHESIS FAILED.');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const currentGroupId = pageConfig.groupId || `lp-group-${Date.now()}`;

            // Clean undefined values for Firestore
            const cleanData = (obj: any) => {
                return Object.fromEntries(
                    Object.entries(obj).filter(([_, v]) => v !== undefined)
                );
            };

            const dataToSave = cleanData({
                ...pageConfig,
                groupId: currentGroupId,
                updatedAt: Timestamp.now(),
            });

            if (pageId) {
                // UPDATE EXISTING
                delete (dataToSave as any).id;
                await updateLandingPage(pageId, dataToSave as Partial<LandingPage>);
            } else {
                // CREATE NEW
                const finalData = cleanData({
                    ...dataToSave,
                    createdAt: Timestamp.now(),
                }) as Omit<LandingPage, 'id'>;
                await createLandingPage(finalData);
            }

            // Handle translations
            await Promise.all(Object.entries(translations).map(async ([lang, data]) => {
                if (data.enabled && data.title && data.content.length > 0) {
                    const transDoc: any = cleanData({
                        title: data.title,
                        slug: data.slug || `lp-${Date.now()}-${lang}`,
                        type: pageConfig.type!,
                        status: pageConfig.status!,
                        locale: lang,
                        groupId: currentGroupId,
                        templateId: pageConfig.templateId || 'default',
                        content: data.content,
                        callouts: data.callouts || [],
                        formConfig: pageConfig.formConfig || null, // Ensure at least null
                        seo: data.seo,
                        stats: { views: 0, conversions: 0 },
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now()
                    });

                    if (data.id) {
                        const { id: _, ...updateData } = transDoc;
                        await updateLandingPage(data.id, updateData);
                    } else {
                        await addDoc(collection(db, 'landing_pages'), transDoc);
                    }
                }
            }));

            alert('Global Architecture Synchronized Successfully.');
            router.push(`/${locale}/admin/landing`);
        } catch (error) {
            console.error(error);
            alert('CRITICAL FAILURE: Operation aborted.');
        } finally {
            setIsSaving(false);
        }
    };

    const activeSection = pageConfig.content?.find(s => s.id === activeSectionId);

    return (
        <div className="fixed inset-0 top-[64px] flex bg-white z-20">
            {/* LEFT BAR: Structure & Editor */}
            <div className="w-80 border-r border-black/5 bg-white flex flex-col shrink-0">
                <div className="p-4 border-b border-black/5 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-black">Architecture</span>
                    <Badge variant="outline" className="text-[8px] rounded-none px-1.5 py-0 border-black/10 uppercase">{type}</Badge>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Page Basic Settings */}
                    <div className="space-y-3">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Internal Title</label>
                        <Input
                            value={pageConfig.title}
                            onChange={e => setPageConfig(prev => ({ ...prev, title: e.target.value }))}
                            className="h-8 text-xs rounded-none border-black/5 bg-black/[0.02] font-medium"
                        />
                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block mt-3">Slug (URL Path)</label>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground font-bold italic">/lp/</span>
                            <Input
                                value={pageConfig.slug}
                                onChange={e => setPageConfig(prev => ({ ...prev, slug: e.target.value }))}
                                className="h-8 text-xs rounded-none border-black/5 bg-black/[0.02] font-medium"
                            />
                        </div>

                        <div className="space-y-2 pt-2">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block">Deployment Status</label>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPageConfig(prev => ({ ...prev, status: prev.status === 'published' ? 'draft' : 'published' }))}
                                className={`w-full h-9 rounded-none text-[9px] font-black uppercase tracking-widest gap-2 transition-all ${pageConfig.status === 'published' ? 'bg-black text-white hover:bg-black/90' : 'border-black/10 text-black/40 hover:text-black hover:border-black'}`}
                            >
                                {pageConfig.status === 'published' ? (
                                    <><Eye className="w-3.5 h-3.5" /> Published Presence</>
                                ) : (
                                    <><EyeOff className="w-3.5 h-3.5" /> Draft Protocol</>
                                )}
                            </Button>
                        </div>

                        <div className="space-y-2 pt-2">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block">Callout Protocol</label>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleGenerateCallouts}
                                disabled={isGeneratingCallouts}
                                className="w-full h-9 rounded-none text-[9px] font-black uppercase tracking-widest gap-2 border-black/10 text-black hover:bg-black hover:text-white transition-all"
                            >
                                <Sparkles className={`w-3.5 h-3.5 ${isGeneratingCallouts ? 'animate-spin' : ''}`} />
                                {isGeneratingCallouts ? 'Generating...' : 'Callout AI Recommendation'}
                            </Button>
                            {pageConfig.callouts && pageConfig.callouts.length > 0 && (
                                <div className="mt-2 p-3 bg-black/[0.02] border border-black/5 space-y-2">
                                    {pageConfig.callouts.map((c, i) => (
                                        <div key={i} className="text-[10px] font-medium leading-tight text-black/60 italic border-l border-black/10 pl-2">
                                            "{c}"
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Global Translation Protocol */}
                        <div className="space-y-4 pt-4 border-t border-black/5">
                            <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                    <Languages className="w-3 h-3" /> Global Translation
                                </label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleTranslateAll}
                                    disabled={isTranslating}
                                    className="h-6 px-2 text-[8px] font-black uppercase tracking-tighter hover:bg-black hover:text-white transition-all"
                                >
                                    {isTranslating ? <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" /> : <Sparkles className="w-2.5 h-2.5 mr-1" />}
                                    AI Multi-Sync
                                </Button>
                            </div>

                            <Tabs defaultValue="en" className="w-full">
                                <TabsList className="grid grid-cols-3 w-full bg-black/[0.03] rounded-none p-1 h-auto">
                                    {Object.keys(translations).map(lang => (
                                        <TabsTrigger key={lang} value={lang} className="text-[9px] font-black uppercase tracking-widest py-1 rounded-none data-[state=active]:bg-black data-[state=active]:text-white">
                                            {lang}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                                {Object.entries(translations).map(([lang, data]) => (
                                    <TabsContent key={lang} value={lang} className="space-y-4 pt-4">
                                        <div className="flex items-center justify-between bg-black/[0.02] p-2 border border-dashed border-black/5">
                                            <span className="text-[9px] font-black uppercase tracking-tighter text-black/40">Enable {lang.toUpperCase()}</span>
                                            <Switch
                                                checked={data.enabled}
                                                onCheckedChange={(val) => setTranslations(prev => ({ ...prev, [lang]: { ...prev[lang], enabled: val } }))}
                                                className="scale-75 data-[state=checked]:bg-black"
                                            />
                                        </div>
                                        <div className={data.enabled ? "space-y-3" : "opacity-30 pointer-events-none space-y-3"}>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black uppercase text-muted-foreground">Title ({lang})</label>
                                                <Input
                                                    value={data.title}
                                                    onChange={e => setTranslations(prev => ({ ...prev, [lang]: { ...prev[lang], title: e.target.value } }))}
                                                    className="h-7 text-[10px] rounded-none border-black/5 bg-black/[0.01] font-medium"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black uppercase text-muted-foreground">Slug ({lang})</label>
                                                <Input
                                                    value={data.slug}
                                                    onChange={e => setTranslations(prev => ({ ...prev, [lang]: { ...prev[lang], slug: e.target.value } }))}
                                                    className="h-7 text-[10px] rounded-none border-black/5 bg-black/[0.01] font-medium"
                                                />
                                            </div>
                                            {/* Callouts Summary */}
                                            {data.callouts && data.callouts.length > 0 && (
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black uppercase text-muted-foreground">Callouts ({lang})</label>
                                                    <div className="p-2 bg-black/[0.02] border border-black/5 space-y-2">
                                                        {data.callouts.map((c, i) => (
                                                            <div key={i} className="text-[9px] text-black/60 italic font-medium leading-tight border-l-2 border-black/5 pl-2">"{c}"</div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </div>
                    </div>

                    <div className="h-px bg-black/5" />

                    {/* Section List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Layout Blocks</span>
                        </div>
                        <div className="space-y-1">
                            {pageConfig.content?.map((section, idx) => (
                                <div
                                    key={section.id}
                                    className={`group flex items-center gap-2 p-3 border transition-all cursor-pointer ${activeSectionId === section.id ? 'border-black bg-black text-white' : 'border-black/5 hover:border-black/20 bg-black/[0.01]'}`}
                                    onClick={() => setActiveSectionId(section.id)}
                                >
                                    <Layers className={`w-3 h-3 ${activeSectionId === section.id ? 'text-white/60' : 'text-black/20'}`} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest flex-1">{section.type}</span>
                                    <div className={`flex gap-0.5 ${activeSectionId === section.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }} className="p-1 hover:bg-white/10 rounded-none"><ChevronUp className="w-3 h-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }} className="p-1 hover:bg-white/10 rounded-none"><ChevronDown className="w-3 h-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); removeSection(section.id); }} className="p-1 hover:bg-red-500 rounded-none"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-1 pt-2">
                            {['hero', 'problem', 'solution', 'features', 'process', 'social_proof', 'pricing', 'faq', 'cta_form', 'footer'].map(sType => (
                                <button
                                    key={sType}
                                    className="py-2 border border-black/5 text-[8px] font-black uppercase tracking-widest text-muted-foreground hover:border-black hover:text-black transition-all flex items-center justify-center gap-1"
                                    onClick={() => addSection(sType)}
                                >
                                    <Plus className="w-2.5 h-2.5" /> {sType.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* BOTTOM ACTION */}
                <div className="p-4 border-t border-black/5 space-y-2">
                    <Button
                        className="w-full bg-black text-white hover:bg-black/90 rounded-none h-10 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        <Save className="w-3.5 h-3.5" /> {isSaving ? 'DEPLOYING...' : 'SAVE & DEPLOY'}
                    </Button>
                </div>
            </div>

            {/* MAIN CANVAS: Preview */}
            <div className="flex-1 bg-black/[0.03] flex flex-col relative overflow-hidden">
                {/* TOOLBAR */}
                <div className="h-14 border-b border-black/5 bg-white flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-6">
                        <Link href="/admin/landing">
                            <Button variant="ghost" size="sm" className="rounded-none text-[9px] font-bold uppercase tracking-widest gap-2">
                                <ArrowLeft className="w-3.5 h-3.5" /> Exit
                            </Button>
                        </Link>
                        <div className="h-4 w-px bg-black/5" />
                        <div className="flex gap-1 bg-black/[0.05] p-1 rounded-none">
                            <button
                                onClick={() => setViewMode('desktop')}
                                className={`p-1.5 rounded-none transition-all ${viewMode === 'desktop' ? 'bg-white shadow-sm ring-1 ring-black/5' : 'text-black/40 hover:text-black'}`}
                            >
                                <Monitor className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setViewMode('mobile')}
                                className={`p-1.5 rounded-none transition-all ${viewMode === 'mobile' ? 'bg-white shadow-sm ring-1 ring-black/5' : 'text-black/40 hover:text-black'}`}
                            >
                                <Smartphone className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            {showAiPanel ? (
                                <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                                    <Input
                                        value={refineGoal}
                                        onChange={(e) => setRefineGoal(e.target.value)}
                                        placeholder="Enter new objective..."
                                        className="h-8 w-60 text-[9px] font-bold uppercase tracking-widest rounded-none border-black focus-visible:ring-0"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAiRefine()}
                                    />
                                    <Button
                                        size="sm"
                                        disabled={isAiRefining || !refineGoal.trim()}
                                        onClick={handleAiRefine}
                                        className="h-8 bg-black text-white rounded-none text-[8px] font-black uppercase px-4"
                                    >
                                        {isAiRefining ? 'GENING...' : 'APPLY'}
                                    </Button>
                                    <button onClick={() => setShowAiPanel(false)} className="p-1 text-black/20 hover:text-black">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <Button
                                    onClick={() => setShowAiPanel(true)}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 border-black text-black hover:bg-black hover:text-white rounded-none text-[8px] font-black uppercase tracking-widest gap-2"
                                >
                                    <Sparkles className="w-3 h-3" /> AI Re-Synthesis
                                </Button>
                            )}
                        </div>
                        <div className="h-4 w-px bg-black/5" />
                        <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Live Preview Syncing
                        </div>
                    </div>
                </div>

                {/* THE VIEWPORT */}
                <div className="flex-1 overflow-y-auto p-12 flex justify-center items-start">
                    <div
                        className={`bg-white shadow-2xl transition-all duration-500 origin-top overflow-y-auto ${viewMode === 'desktop' ? 'w-full max-w-5xl' : 'w-[375px]'}`}
                        style={{ height: viewMode === 'desktop' ? 'auto' : '667px' }}
                    >
                        {/* Actual Landing Content Rendering */}
                        <div className="min-h-full flex flex-col">
                            {pageConfig.content?.map((section) => (
                                <div key={section.id} className={`relative group ${activeSectionId === section.id ? 'ring-2 ring-black ring-inset' : ''}`}>

                                    {/* RENDER LOGIC PER TYPE */}
                                    {section.type === 'hero' && (
                                        <div className="py-16 md:py-24 px-6 md:px-12 text-center border-b border-black/5 bg-white space-y-6 overflow-hidden">
                                            {section.content.badge && <span className="inline-block px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest">{section.content.badge}</span>}
                                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none break-words max-w-full">{section.content.title}</h2>
                                            <p className="max-w-xl mx-auto text-[11px] md:text-sm font-medium text-muted-foreground uppercase tracking-tight leading-relaxed break-words">
                                                {section.content.subtitle}
                                            </p>
                                            <div className="pt-4">
                                                <Button className="bg-black text-white rounded-none px-10 h-12 font-black text-xs uppercase tracking-widest shadow-none">
                                                    {section.content.buttonText}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {section.type === 'problem' && (
                                        <div className="py-16 md:py-20 px-6 md:px-12 border-b border-black/5 bg-black text-white space-y-12 overflow-hidden">
                                            <div className="space-y-4 text-center md:text-left max-w-2xl">
                                                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter break-words leading-tight">{section.content.title}</h2>
                                                <p className="text-[10px] md:text-xs font-medium text-white/40 uppercase tracking-tight break-words">{section.content.subtitle}</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 w-full">
                                                {section.content.points?.map((p: string, i: number) => (
                                                    <div key={i} className="flex flex-col gap-2 border-l border-white/20 pl-6 py-2 text-left w-full min-w-0 group hover:border-white transition-colors">
                                                        <span className="text-[8px] font-black tabular-nums opacity-30 tracking-[0.2em]">VARIABLE 0{i + 1}</span>
                                                        <span className="text-[12px] md:text-sm font-bold uppercase tracking-normal md:tracking-widest break-all leading-normal flex-1">{p}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {section.type === 'solution' && (
                                        <div className="py-16 md:py-20 px-6 md:px-12 border-b border-black/5 bg-white text-center space-y-12 overflow-hidden">
                                            <div className="space-y-4">
                                                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter break-words">{section.content.title}</h2>
                                                <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest break-words">{section.content.subtitle}</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 w-full">
                                                {section.content.items?.map((item: any, i: number) => (
                                                    <div key={i} className="p-6 md:p-8 border border-black/5 bg-black/[0.01] w-full min-w-0">
                                                        <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter mb-4 break-words">{item.title}</h3>
                                                        <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-tight break-words">{item.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {section.type === 'features' && (
                                        <div className="py-16 md:py-20 px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8 border-b border-black/5 bg-white">
                                            {section.content.items?.map((item: any, i: number) => (
                                                <div key={i} className="space-y-3">
                                                    <div className="text-[10px] font-bold text-black border-l-2 border-black pl-3 uppercase tracking-widest">0{i + 1} / Module</div>
                                                    <h3 className="text-base md:text-lg font-black uppercase tracking-tighter">{item.title}</h3>
                                                    <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-tight leading-relaxed">{item.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {section.type === 'process' && (
                                        <div className="py-16 md:py-20 px-6 md:px-12 border-b border-black/5 bg-black/[0.02] overflow-hidden">
                                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter mb-8 md:mb-12 text-center break-words">{section.content.title}</h2>
                                            <div className="flex flex-col md:flex-row gap-8 md:gap-4 w-full">
                                                {section.content.steps?.map((step: any, i: number) => (
                                                    <div key={i} className="flex-1 bg-white border border-black/5 p-6 md:p-8 relative min-w-0">
                                                        <span className="absolute -top-3 -left-3 w-8 h-8 bg-black text-white flex items-center justify-center text-[10px] font-black z-10">{i + 1}</span>
                                                        <h3 className="text-[12px] md:text-sm font-black uppercase tracking-widest mb-2 break-words">{step.title}</h3>
                                                        <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-bold tracking-tight break-words">{step.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {section.type === 'social_proof' && (
                                        <div className="py-12 md:py-16 px-6 md:px-12 border-b border-black/5 bg-white space-y-12 md:space-y-16">
                                            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-30 grayscale">
                                                {section.content.logos?.filter((l: string) => l !== '').map((l: string, i: number) => <span key={`${l}-${i}`} className="text-lg md:text-xl font-black tracking-tighter italic">{l}</span>)}
                                            </div>
                                            <div className="max-w-3xl mx-auto space-y-12">
                                                {section.content.testimonials?.map((t: any, idx: number) => (
                                                    <div key={idx} className={`text-center italic ${idx !== 0 ? 'pt-8 md:pt-12 border-t border-black/5' : ''}`}>
                                                        <p className="text-base md:text-lg font-medium uppercase tracking-tight mb-6">"{t.text}"</p>
                                                        <div className="text-[10px] font-black uppercase tracking-widest">
                                                            {t.author} / <span className="text-muted-foreground">{t.role}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {section.type === 'pricing' && (
                                        <div className="py-16 md:py-20 px-6 md:px-12 border-b border-black/5 bg-white space-y-10 md:space-y-12">
                                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-center">{section.content.title}</h2>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {section.content.plans?.map((plan: any, i: number) => (
                                                    <div key={i} className={`p-6 md:p-8 border ${plan.recommended ? 'border-black bg-black text-white' : 'border-black/10'}`}>
                                                        <h3 className="text-[10px] font-black uppercase tracking-widest mb-2">{plan.name}</h3>
                                                        <div className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-8">{plan.price}</div>
                                                        <div className="space-y-2 mb-12">
                                                            {plan.features.filter((f: string) => f !== '').map((f: string, idx: number) => <div key={`${f}-${idx}`} className="text-[10px] font-bold uppercase tracking-tight flex items-center gap-2"><CheckCircle2 className="w-3 h-3" /> {f}</div>)}
                                                        </div>
                                                        <Button className={`w-full rounded-none h-12 text-[10px] font-black uppercase tracking-widest ${plan.recommended ? 'bg-white text-black' : 'bg-black text-white'}`}>Select Protocol</Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {section.type === 'faq' && (
                                        <div className="py-16 md:py-20 px-6 md:px-12 border-b border-black/5 bg-black/[0.01] space-y-10 md:space-y-12">
                                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter">{section.content.title}</h2>
                                            <div className="grid grid-cols-1 gap-4">
                                                {section.content.items?.map((item: any, i: number) => (
                                                    <div key={i} className="p-4 md:p-6 border-b border-black/5 space-y-2">
                                                        <h3 className="text-[11px] md:text-xs font-black uppercase tracking-widest">Q: {item.q}</h3>
                                                        <p className="text-[10px] md:text-[11px] font-medium text-muted-foreground uppercase tracking-tight">A: {item.a}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {section.type === 'cta_form' && (
                                        <div className="py-16 md:py-24 px-6 md:px-12 text-center bg-black text-white space-y-10 md:space-y-12">
                                            <div className="space-y-4">
                                                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">{section.content.title}</h2>
                                                <p className="text-[9px] md:text-[10px] font-bold text-white/40 uppercase tracking-widest">{section.content.subtitle}</p>
                                            </div>
                                            <div className="max-w-md mx-auto space-y-6 text-left">
                                                {section.content.fields?.map((field: any, idx: number) => (
                                                    <div key={idx} className="space-y-2">
                                                        <label className="text-[9px] font-black tracking-widest text-white/40 uppercase">{field.label} {field.required && '*'}</label>

                                                        {(field.type === 'text' || field.type === 'email') && (
                                                            <Input
                                                                className="bg-transparent border-white/20 text-white rounded-none h-12 text-[10px] font-bold uppercase tracking-widest placeholder:text-white/10 focus-visible:ring-0 focus-visible:border-white"
                                                                placeholder={field.placeholder}
                                                            />
                                                        )}

                                                        {field.type === 'select' && (
                                                            <select className="w-full bg-transparent border border-white/20 text-white rounded-none h-12 text-[10px] font-bold uppercase tracking-widest px-3 focus:outline-none focus:border-white">
                                                                {field.options?.map((opt: string, i: number) => <option key={`${opt}-${i}`} value={opt} className="bg-black text-white">{opt}</option>)}
                                                            </select>
                                                        )}

                                                        {field.type === 'radio_group' && (
                                                            <div className="flex flex-wrap gap-4 pt-1">
                                                                {field.options?.map((opt: string, i: number) => (
                                                                    <label key={`${opt}-${i}`} className="flex items-center gap-2 cursor-pointer group">
                                                                        <div className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white">
                                                                            <div className="w-2 h-2 rounded-full bg-white opacity-0" />
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-white/60 group-hover:text-white">{opt}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {field.type === 'checkbox_group' && (
                                                            <div className="flex flex-wrap gap-4 pt-1">
                                                                {field.options?.map((opt: string, i: number) => (
                                                                    <label key={`${opt}-${i}`} className="flex items-center gap-2 cursor-pointer group">
                                                                        <div className="w-4 h-4 border border-white/20 flex items-center justify-center group-hover:border-white">
                                                                            <div className="w-2 h-2 bg-white opacity-0" />
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-white/60 group-hover:text-white">{opt}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {field.type === 'consent' && (
                                                            <label className="flex items-start gap-3 cursor-pointer group pt-2 pb-4">
                                                                <div className="w-4 h-4 border border-white/20 mt-0.5 flex items-center justify-center group-hover:border-white">
                                                                    <CheckCircle2 className="w-3 h-3 text-white opacity-0" />
                                                                </div>
                                                                <span className="text-[9px] font-bold text-white/40 leading-relaxed group-hover:text-white transition-colors">{field.label}</span>
                                                            </label>
                                                        )}
                                                    </div>
                                                ))}

                                                <Button className="w-full bg-white text-black hover:bg-white/90 rounded-none h-14 font-black text-xs uppercase tracking-widest mt-4">
                                                    {section.content.buttonText}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {section.type === 'footer' && (
                                        <div className="py-12 px-6 md:px-12 border-t border-black/5 bg-white flex flex-col md:flex-row justify-between items-center md:items-center gap-8 text-[9px] font-black uppercase tracking-widest text-center md:text-left overflow-hidden w-full">
                                            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-center w-full md:w-auto">
                                                <span className="break-words max-w-full">{section.content.company}</span>
                                                <div className="flex flex-wrap justify-center gap-4 text-muted-foreground">
                                                    {(section.content.links || []).map((l: any, i: number) => {
                                                        const label = typeof l === 'string' ? l : l.label;
                                                        return <span key={i} className="hover:text-black cursor-pointer break-words">{label}</span>;
                                                    })}
                                                </div>
                                            </div>
                                            <span className="text-black/20 break-words">{section.content.copyright}</span>
                                        </div>
                                    )}

                                    {/* Action Overlay in Preview */}
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <Button
                                            size="sm"
                                            className="bg-white text-black border border-black/10 rounded-none text-[8px] font-black uppercase tracking-widest shadow-xl py-1 h-auto"
                                            onClick={() => setActiveSectionId(section.id)}
                                        >
                                            Configure Block
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {(!pageConfig.content || pageConfig.content.length === 0) && (
                                <div className="flex-1 flex flex-col items-center justify-center p-20 text-black/10">
                                    <LayoutIcon className="w-20 h-20 mb-6" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Null Logic Grid Detected</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT BAR: Property Editor (Conditional) */}
                {activeSectionId && (
                    <div className="absolute right-0 top-14 bottom-0 w-80 border-l border-black/5 bg-white shadow-2xl animate-in slide-in-from-right-4 z-30">
                        <div className="p-4 border-b border-black/5 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-black">Component Logic</span>
                            <button onClick={() => setActiveSectionId(null)} className="text-black/40 hover:text-black px-2 py-1"><CheckCircle2 className="w-4 h-4" /></button>
                        </div>
                        <div className="p-6 space-y-8 overflow-y-auto h-[calc(100vh-120px)]">
                            <div className="space-y-2">
                                <Badge className="rounded-none bg-black/[0.03] text-black border border-black/5 font-bold text-[8px] uppercase tracking-widest px-2">{activeSection?.type}</Badge>
                                <h4 className="text-[10px] font-black uppercase tracking-widest">Variable Injection</h4>
                            </div>

                            <div className="space-y-6 pb-20">
                                {/* COMMON HEADER/SUBTITLE/BUTTON EDITOR */}
                                {['hero', 'problem', 'solution', 'features', 'process', 'pricing', 'faq', 'social_proof', 'cta_form'].includes(activeSection?.type || '') && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Primary Heading</label>
                                            <Input
                                                value={activeSection?.content.title || ''}
                                                onChange={e => updateSectionContent(activeSection!.id, { title: e.target.value })}
                                                className="rounded-none border-black/10 text-xs font-bold uppercase tracking-tight h-10"
                                            />
                                        </div>
                                        {activeSection?.content.subtitle !== undefined && (
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Subtitle / Manifesto</label>
                                                <textarea
                                                    className="w-full min-h-[80px] p-3 rounded-none border border-black/10 text-xs font-medium uppercase tracking-tight bg-black/[0.01] focus:outline-none focus:border-black"
                                                    value={activeSection.content.subtitle || ''}
                                                    onChange={e => updateSectionContent(activeSection.id, { subtitle: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        {activeSection?.content.buttonText !== undefined && (
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">CTA Text</label>
                                                <Input
                                                    value={activeSection.content.buttonText || ''}
                                                    onChange={e => updateSectionContent(activeSection.id, { buttonText: e.target.value })}
                                                    className="rounded-none border-black/10 text-xs font-bold uppercase tracking-tight h-10"
                                                />
                                            </div>
                                        )}
                                        {activeSection?.type === 'hero' && (
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Top Badge Text / Intro</label>
                                                <Input
                                                    value={activeSection.content.badge || ''}
                                                    onChange={e => updateSectionContent(activeSection.id, { badge: e.target.value })}
                                                    className="rounded-none border-black/10 text-xs font-bold uppercase tracking-tight h-10"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="h-px bg-black/5" />

                                {/* TYPE-SPECIFIC DEEP EDITOR */}
                                {activeSection?.type === 'problem' && (
                                    <div className="space-y-4">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Pain Points (List)</label>
                                        {activeSection.content.points?.map((p: string, i: number) => (
                                            <div key={i} className="flex gap-2">
                                                <Input
                                                    value={p}
                                                    onChange={e => {
                                                        const newPoints = [...activeSection.content.points];
                                                        newPoints[i] = e.target.value;
                                                        updateSectionContent(activeSection.id, { points: newPoints });
                                                    }}
                                                    className="rounded-none border-black/10 text-[10px] font-bold h-8"
                                                />
                                                <Button size="icon" variant="ghost" onClick={() => {
                                                    const newPoints = activeSection.content.points.filter((_: any, idx: number) => idx !== i);
                                                    updateSectionContent(activeSection.id, { points: newPoints });
                                                }} className="h-8 w-8"><Trash2 className="w-3 h-3" /></Button>
                                            </div>
                                        ))}
                                        <Button variant="outline" className="w-full h-8 text-[8px] font-black tracking-widest rounded-none border-dashed mb-4" onClick={() => {
                                            updateSectionContent(activeSection.id, { points: [...(activeSection.content.points || []), 'NEW PAIN POINT'] });
                                        }}>ADD POINT</Button>
                                    </div>
                                )}

                                {activeSection?.type === 'features' && (
                                    <div className="space-y-6">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Feature Nodes</label>
                                        {activeSection.content.items?.map((item: any, i: number) => (
                                            <div key={i} className="p-4 bg-black/[0.02] border border-black/5 space-y-3 relative">
                                                <Input
                                                    value={item.title || ''}
                                                    placeholder="Title"
                                                    onChange={e => {
                                                        const newItems = [...activeSection.content.items];
                                                        newItems[i] = { ...item, title: e.target.value };
                                                        updateSectionContent(activeSection.id, { items: newItems });
                                                    }}
                                                    className="rounded-none border-black/10 text-[10px] font-bold h-8"
                                                />
                                                <textarea
                                                    value={item.description || ''}
                                                    placeholder="Description"
                                                    onChange={e => {
                                                        const newItems = [...activeSection.content.items];
                                                        newItems[i] = { ...item, description: e.target.value };
                                                        updateSectionContent(activeSection.id, { items: newItems });
                                                    }}
                                                    className="w-full min-h-[60px] p-2 rounded-none border border-black/10 text-[9px] font-medium uppercase bg-white"
                                                />
                                                <button onClick={() => {
                                                    const newItems = activeSection.content.items.filter((_: any, idx: number) => idx !== i);
                                                    updateSectionContent(activeSection.id, { items: newItems });
                                                }} className="absolute top-2 right-2 text-black/20 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                        <Button variant="outline" className="w-full h-8 text-[8px] font-black tracking-widest rounded-none border-dashed" onClick={() => {
                                            updateSectionContent(activeSection.id, { items: [...(activeSection.content.items || []), { title: 'NEW FEATURE', description: 'DESCRIPTION' }] });
                                        }}>ADD FEATURE</Button>
                                    </div>
                                )}

                                {activeSection?.type === 'process' && (
                                    <div className="space-y-6">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Operational Steps</label>
                                        {activeSection.content.steps?.map((step: any, i: number) => (
                                            <div key={i} className="p-4 bg-black/[0.02] border border-black/5 space-y-3 relative">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black">STP {i + 1}</span>
                                                    <Input
                                                        value={step.title || ''}
                                                        onChange={e => {
                                                            const newSteps = [...activeSection.content.steps];
                                                            newSteps[i] = { ...step, title: e.target.value };
                                                            updateSectionContent(activeSection.id, { steps: newSteps });
                                                        }}
                                                        className="rounded-none border-black/10 text-[10px] font-bold h-8"
                                                    />
                                                </div>
                                                <textarea
                                                    value={step.description || ''}
                                                    onChange={e => {
                                                        const newSteps = [...activeSection.content.steps];
                                                        newSteps[i] = { ...step, description: e.target.value };
                                                        updateSectionContent(activeSection.id, { steps: newSteps });
                                                    }}
                                                    className="w-full min-h-[60px] p-2 rounded-none border border-black/10 text-[9px] font-medium uppercase bg-white"
                                                />
                                                <button onClick={() => {
                                                    const newSteps = activeSection.content.steps.filter((_: any, idx: number) => idx !== i);
                                                    updateSectionContent(activeSection.id, { steps: newSteps });
                                                }} className="absolute top-2 right-2 text-black/20 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                        <Button variant="outline" className="w-full h-8 text-[8px] font-black tracking-widest rounded-none border-dashed" onClick={() => {
                                            updateSectionContent(activeSection.id, { steps: [...(activeSection.content.steps || []), { title: 'NEW STEP', description: 'DESCRIPTION' }] });
                                        }}>ADD STEP</Button>
                                    </div>
                                )}

                                {activeSection?.type === 'pricing' && (
                                    <div className="space-y-6">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Pricing Tiers / Plans</label>
                                        {activeSection.content.plans?.map((plan: any, i: number) => (
                                            <div key={i} className={`p-4 border space-y-3 relative ${plan.recommended ? 'border-black bg-black/[0.03]' : 'border-black/5 bg-black/[0.01]'}`}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <Input
                                                        value={plan.name || ''}
                                                        placeholder="Plan Name"
                                                        onChange={e => {
                                                            const newPlans = [...activeSection.content.plans];
                                                            newPlans[i] = { ...plan, name: e.target.value };
                                                            updateSectionContent(activeSection.id, { plans: newPlans });
                                                        }}
                                                        className="rounded-none border-black/10 text-[10px] font-bold h-8"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant={plan.recommended ? 'default' : 'outline'}
                                                        className="h-8 text-[8px] font-black rounded-none px-2"
                                                        onClick={() => {
                                                            const newPlans = activeSection.content.plans.map((p: any, idx: number) => ({
                                                                ...p,
                                                                recommended: idx === i ? !p.recommended : false
                                                            }));
                                                            updateSectionContent(activeSection.id, { plans: newPlans });
                                                        }}
                                                    >
                                                        {plan.recommended ? 'REC ON' : 'REC OFF'}
                                                    </Button>
                                                </div>
                                                <Input
                                                    value={plan.price || ''}
                                                    placeholder="Price (e.g. $99)"
                                                    onChange={e => {
                                                        const newPlans = [...activeSection.content.plans];
                                                        newPlans[i] = { ...plan, price: e.target.value };
                                                        updateSectionContent(activeSection.id, { plans: newPlans });
                                                    }}
                                                    className="rounded-none border-black/10 text-[10px] font-black h-8"
                                                />
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-bold text-muted-foreground uppercase">Highlights (CSV)</label>
                                                    <Input
                                                        value={plan.features.join(', ')}
                                                        onChange={e => {
                                                            const newPlans = [...activeSection.content.plans];
                                                            newPlans[i] = { ...plan, features: e.target.value.split(',').map(f => f.trim()) };
                                                            updateSectionContent(activeSection.id, { plans: newPlans });
                                                        }}
                                                        className="rounded-none border-black/10 text-[9px] h-8"
                                                    />
                                                </div>
                                                <button onClick={() => {
                                                    const newPlans = activeSection.content.plans.filter((_: any, idx: number) => idx !== i);
                                                    updateSectionContent(activeSection.id, { plans: newPlans });
                                                }} className="absolute -top-2 -right-2 bg-white border border-black/10 text-black/20 hover:text-red-500 p-1.5 shadow-sm">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <Button variant="outline" className="w-full h-8 text-[8px] font-black tracking-widest rounded-none border-dashed" onClick={() => {
                                            updateSectionContent(activeSection.id, {
                                                plans: [...(activeSection.content.plans || []), { name: 'NEW PLAN', price: '$0', features: ['FEATURE 1'], recommended: false }]
                                            });
                                        }}>ADD PRICE TIER</Button>
                                    </div>
                                )}

                                {activeSection?.type === 'solution' && (
                                    <div className="space-y-6">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Solution Matrix Items</label>
                                        {activeSection.content.items?.map((item: any, i: number) => (
                                            <div key={i} className="p-4 bg-black/[0.02] border border-black/5 space-y-3 relative">
                                                <Input
                                                    value={item.title || ''}
                                                    placeholder="Solution Title"
                                                    onChange={e => {
                                                        const newItems = [...activeSection.content.items];
                                                        newItems[i] = { ...item, title: e.target.value };
                                                        updateSectionContent(activeSection.id, { items: newItems });
                                                    }}
                                                    className="rounded-none border-black/10 text-[10px] font-bold h-8"
                                                />
                                                <textarea
                                                    value={item.description || ''}
                                                    placeholder="Benefit/Description"
                                                    onChange={e => {
                                                        const newItems = [...activeSection.content.items];
                                                        newItems[i] = { ...item, description: e.target.value };
                                                        updateSectionContent(activeSection.id, { items: newItems });
                                                    }}
                                                    className="w-full min-h-[60px] p-2 rounded-none border border-black/10 text-[9px] font-medium uppercase bg-white focus:outline-none focus:border-black"
                                                />
                                                <button onClick={() => {
                                                    const newItems = activeSection.content.items.filter((_: any, idx: number) => idx !== i);
                                                    updateSectionContent(activeSection.id, { items: newItems });
                                                }} className="absolute top-2 right-2 text-black/20 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                        <Button variant="outline" className="w-full h-8 text-[8px] font-black tracking-widest rounded-none border-dashed" onClick={() => {
                                            updateSectionContent(activeSection.id, { items: [...(activeSection.content.items || []), { title: 'NEW SOLUTION', description: 'DESCRIPTION' }] });
                                        }}>ADD ITEM</Button>
                                    </div>
                                )}

                                {activeSection?.type === 'faq' && (
                                    <div className="space-y-6">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">FAQ Data Points</label>
                                        {activeSection.content.items?.map((item: any, i: number) => (
                                            <div key={i} className="p-4 bg-black/[0.02] border border-black/5 space-y-3 relative">
                                                <Input
                                                    value={item.q || ''}
                                                    placeholder="Question"
                                                    onChange={e => {
                                                        const newItems = [...activeSection.content.items];
                                                        newItems[i] = { ...item, q: e.target.value };
                                                        updateSectionContent(activeSection.id, { items: newItems });
                                                    }}
                                                    className="rounded-none border-black/10 text-[10px] font-bold h-8"
                                                />
                                                <textarea
                                                    value={item.a || ''}
                                                    placeholder="Answer"
                                                    onChange={e => {
                                                        const newItems = [...activeSection.content.items];
                                                        newItems[i] = { ...item, a: e.target.value };
                                                        updateSectionContent(activeSection.id, { items: newItems });
                                                    }}
                                                    className="w-full min-h-[60px] p-2 rounded-none border border-black/10 text-[9px] font-medium uppercase bg-white focus:outline-none focus:border-black"
                                                />
                                                <button onClick={() => {
                                                    const newItems = activeSection.content.items.filter((_: any, idx: number) => idx !== i);
                                                    updateSectionContent(activeSection.id, { items: newItems });
                                                }} className="absolute top-2 right-2 text-black/20 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                        <Button variant="outline" className="w-full h-8 text-[8px] font-black tracking-widest rounded-none border-dashed" onClick={() => {
                                            updateSectionContent(activeSection.id, { items: [...(activeSection.content.items || []), { q: 'NEW QUESTION', a: 'NEW ANSWER' }] });
                                        }}>ADD FAQ ITEM</Button>
                                    </div>
                                )}

                                {activeSection?.type === 'social_proof' && (
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Partner Logos (CSV)</label>
                                            <Input
                                                value={activeSection.content.logos?.join(', ') || ''}
                                                placeholder="LOGO1, LOGO2, LOGO3"
                                                onChange={e => {
                                                    const newLogos = e.target.value.split(',').map(l => l.trim());
                                                    updateSectionContent(activeSection.id, { logos: newLogos });
                                                }}
                                                className="rounded-none border-black/10 text-[10px] font-black h-10"
                                            />
                                        </div>

                                        <div className="h-px bg-black/5" />

                                        <div className="space-y-6">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Testimonial Manifestos</label>
                                            {activeSection.content.testimonials?.map((t: any, i: number) => (
                                                <div key={i} className="p-4 bg-black/[0.02] border border-black/5 space-y-3 relative">
                                                    <textarea
                                                        value={t.text || ''}
                                                        placeholder="The Review / Quote"
                                                        onChange={e => {
                                                            const newTestimonials = [...activeSection.content.testimonials];
                                                            newTestimonials[i] = { ...t, text: e.target.value };
                                                            updateSectionContent(activeSection.id, { testimonials: newTestimonials });
                                                        }}
                                                        className="w-full min-h-[80px] p-2 rounded-none border border-black/10 text-[10px] italic font-medium uppercase bg-white focus:outline-none focus:border-black"
                                                    />
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Input
                                                            value={t.author || ''}
                                                            placeholder="Author"
                                                            onChange={e => {
                                                                const newTestimonials = [...activeSection.content.testimonials];
                                                                newTestimonials[i] = { ...t, author: e.target.value };
                                                                updateSectionContent(activeSection.id, { testimonials: newTestimonials });
                                                            }}
                                                            className="rounded-none border-black/10 text-[9px] font-bold h-8"
                                                        />
                                                        <Input
                                                            value={t.role || ''}
                                                            placeholder="Role / Title"
                                                            onChange={e => {
                                                                const newTestimonials = [...activeSection.content.testimonials];
                                                                newTestimonials[i] = { ...t, role: e.target.value };
                                                                updateSectionContent(activeSection.id, { testimonials: newTestimonials });
                                                            }}
                                                            className="rounded-none border-black/10 text-[9px] h-8"
                                                        />
                                                    </div>
                                                    <button onClick={() => {
                                                        const newTestimonials = activeSection.content.testimonials.filter((_: any, idx: number) => idx !== i);
                                                        updateSectionContent(activeSection.id, { testimonials: newTestimonials });
                                                    }} className="absolute top-2 right-2 text-black/20 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                                </div>
                                            ))}
                                            <Button variant="outline" className="w-full h-8 text-[8px] font-black tracking-widest rounded-none border-dashed" onClick={() => {
                                                updateSectionContent(activeSection.id, {
                                                    testimonials: [...(activeSection.content.testimonials || []), { text: 'UNPRECEDENTED IMPACT.', author: 'NAME', role: 'ROLE' }]
                                                });
                                            }}>ADD TESTIMONIAL</Button>
                                        </div>
                                    </div>
                                )}

                                {activeSection?.type === 'cta_form' && (
                                    <div className="space-y-6">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Form Logic & Fields</label>
                                        <div className="space-y-6">
                                            {activeSection.content.fields?.map((field: any, i: number) => (
                                                <div key={i} className="p-4 bg-black/[0.02] border border-black/5 space-y-4 relative">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <select
                                                            value={field.type}
                                                            onChange={e => {
                                                                const newFields = [...activeSection.content.fields];
                                                                newFields[i] = { ...field, type: e.target.value };
                                                                updateSectionContent(activeSection.id, { fields: newFields });
                                                            }}
                                                            className="bg-white border border-black/10 rounded-none h-8 text-[9px] font-black uppercase tracking-widest px-2"
                                                        >
                                                            <option value="text">TEXT INPUT</option>
                                                            <option value="email">EMAIL INPUT</option>
                                                            <option value="select">SELECT BOX</option>
                                                            <option value="radio_group">RADIO GROUP</option>
                                                            <option value="checkbox_group">CHECKBOX GROUP</option>
                                                            <option value="consent">CONSENT CHECK</option>
                                                        </select>
                                                        <div className="flex items-center gap-2 px-2 border border-black/10 bg-white">
                                                            <input
                                                                type="checkbox"
                                                                checked={field.required}
                                                                onChange={e => {
                                                                    const newFields = [...activeSection.content.fields];
                                                                    newFields[i] = { ...field, required: e.target.checked };
                                                                    updateSectionContent(activeSection.id, { fields: newFields });
                                                                }}
                                                                className="w-3 h-3 rounded-none accent-black"
                                                            />
                                                            <span className="text-[8px] font-bold uppercase">Required</span>
                                                        </div>
                                                    </div>

                                                    <Input
                                                        value={field.label || ''}
                                                        placeholder="Field Label"
                                                        onChange={e => {
                                                            const newFields = [...activeSection.content.fields];
                                                            newFields[i] = { ...field, label: e.target.value };
                                                            updateSectionContent(activeSection.id, { fields: newFields });
                                                        }}
                                                        className="rounded-none border-black/10 text-[9px] font-bold h-8"
                                                    />

                                                    {['text', 'email', 'select'].includes(field.type) && (
                                                        <Input
                                                            value={field.placeholder || ''}
                                                            placeholder="Placeholder Text"
                                                            onChange={e => {
                                                                const newFields = [...activeSection.content.fields];
                                                                newFields[i] = { ...field, placeholder: e.target.value };
                                                                updateSectionContent(activeSection.id, { fields: newFields });
                                                            }}
                                                            className="rounded-none border-black/10 text-[9px] h-8"
                                                        />
                                                    )}

                                                    {['select', 'radio_group', 'checkbox_group'].includes(field.type) && (
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-bold text-muted-foreground uppercase">Options (CSV)</label>
                                                            <Input
                                                                value={field.options?.join(', ') || ''}
                                                                placeholder="Option 1, Option 2"
                                                                onChange={e => {
                                                                    const newFields = [...activeSection.content.fields];
                                                                    newFields[i] = { ...field, options: e.target.value.split(',').map(o => o.trim()) };
                                                                    updateSectionContent(activeSection.id, { fields: newFields });
                                                                }}
                                                                className="rounded-none border-black/10 text-[9px] h-8"
                                                            />
                                                        </div>
                                                    )}

                                                    {field.type === 'consent' && (
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-bold text-muted-foreground uppercase">Terms URL (Optional)</label>
                                                            <Input
                                                                value={field.url || ''}
                                                                placeholder="https://example.com/terms"
                                                                onChange={e => {
                                                                    const newFields = [...activeSection.content.fields];
                                                                    newFields[i] = { ...field, url: e.target.value };
                                                                    updateSectionContent(activeSection.id, { fields: newFields });
                                                                }}
                                                                className="rounded-none border-black/10 text-[9px] h-8"
                                                            />
                                                        </div>
                                                    )}

                                                    <button onClick={() => {
                                                        const newFields = activeSection.content.fields.filter((_: any, idx: number) => idx !== i);
                                                        updateSectionContent(activeSection.id, { fields: newFields });
                                                    }} className="absolute -top-2 -right-2 bg-white border border-black/10 text-black/20 hover:text-red-500 p-1.5 shadow-sm">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}

                                            <Button variant="outline" className="w-full h-8 text-[8px] font-black tracking-widest rounded-none border-dashed" onClick={() => {
                                                updateSectionContent(activeSection.id, {
                                                    fields: [...(activeSection.content.fields || []), { id: Math.random().toString(), type: 'text', label: 'NEW FIELD', placeholder: 'ENTER DATA', required: false }]
                                                });
                                            }}>ADD FORM FIELD</Button>
                                        </div>
                                    </div>
                                )}

                                {activeSection?.type === 'footer' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Entity Name</label>
                                            <Input
                                                value={activeSection.content.company || ''}
                                                onChange={e => updateSectionContent(activeSection.id, { company: e.target.value })}
                                                className="rounded-none border-black/10 text-xs font-bold uppercase h-10"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Protocol Links</label>
                                            <div className="space-y-2">
                                                {(activeSection.content.links || []).map((link: any, i: number) => (
                                                    <div key={i} className="flex flex-col gap-1 p-2 bg-black/[0.02] border border-black/5 relative">
                                                        <Input
                                                            value={link.label}
                                                            placeholder="Label (e.g. TERMS)"
                                                            onChange={e => {
                                                                const newLinks = [...activeSection.content.links];
                                                                newLinks[i] = { ...link, label: e.target.value };
                                                                updateSectionContent(activeSection.id, { links: newLinks });
                                                            }}
                                                            className="h-7 text-[9px] font-bold rounded-none border-black/10 bg-white"
                                                        />
                                                        <Input
                                                            value={link.url}
                                                            placeholder="URL / Endpoint (Optional)"
                                                            onChange={e => {
                                                                const newLinks = [...activeSection.content.links];
                                                                newLinks[i] = { ...link, url: e.target.value };
                                                                updateSectionContent(activeSection.id, { links: newLinks });
                                                            }}
                                                            className="h-7 text-[9px] rounded-none border-black/10 bg-white"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const newLinks = activeSection.content.links.filter((_: any, idx: number) => idx !== i);
                                                                updateSectionContent(activeSection.id, { links: newLinks });
                                                            }}
                                                            className="absolute top-1 right-1 text-black/20 hover:text-red-500"
                                                        >
                                                            <Trash2 className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full h-7 text-[8px] font-black rounded-none border-dashed"
                                                    onClick={() => {
                                                        const newLinks = [...(activeSection.content.links || []), { label: 'NEW LINK', url: '' }];
                                                        updateSectionContent(activeSection.id, { links: newLinks });
                                                    }}
                                                >
                                                    ADD LINK
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Copyright Notice</label>
                                            <Input
                                                value={activeSection.content.copyright || ''}
                                                onChange={e => updateSectionContent(activeSection.id, { copyright: e.target.value })}
                                                className="rounded-none border-black/10 text-xs font-bold uppercase h-10"
                                            />
                                        </div>
                                    </div>
                                )}

                                <p className="text-[9px] font-bold text-black/20 italic">Logic sequence verified. All fields synced with preview matrix.</p>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-black/5">
                                <Button
                                    variant="outline"
                                    className="w-full border-black rounded-none text-[9px] font-black uppercase tracking-widest h-10 hover:bg-black hover:text-white"
                                    onClick={() => setActiveSectionId(null)}
                                >
                                    Confirm Configuration
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* CALLOUT AI MODAL */}
            <Dialog open={showCalloutModal} onOpenChange={setShowCalloutModal}>
                <DialogContent className="max-w-2xl rounded-none border-black/10 shadow-2xl p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-6 bg-black text-white rounded-none">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Callout Matrix Synthesis
                            </DialogTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleGenerateCallouts}
                                disabled={isGeneratingCallouts}
                                className="h-8 rounded-none text-[9px] font-black uppercase tracking-widest gap-2 bg-white/10 hover:bg-white/20 text-white"
                            >
                                <RefreshCw className={`w-3 h-3 ${isGeneratingCallouts ? 'animate-spin' : ''}`} /> Shuffle
                            </Button>
                        </div>
                    </DialogHeader>

                    <div className="p-8 space-y-6 bg-white">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            AI analyzed your page content and generated these conversion-focused callouts for your blog posts.
                        </p>

                        <div className="space-y-4">
                            {tempCallouts.map((callout, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 border border-black/5 bg-black/[0.01] hover:bg-black/[0.03] transition-colors group relative"
                                >
                                    <div className="text-[8px] font-black text-black/20 uppercase tracking-tighter mb-2">Message 0{idx + 1}</div>
                                    <p className="text-xs font-bold text-black leading-relaxed">
                                        {callout}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-black/[0.02] border-t border-black/5 flex sm:justify-between items-center sm:flex-row gap-4">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">3 SEQUENCED MESSAGES READY</span>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => setShowCalloutModal(false)}
                                className="rounded-none text-[9px] font-black uppercase tracking-widest h-10 px-6"
                            >
                                Discard
                            </Button>
                            <Button
                                onClick={handleSaveCallouts}
                                className="rounded-none text-[9px] font-black uppercase tracking-widest h-10 px-8 bg-black text-white hover:bg-black/90 shadow-xl"
                            >
                                Deployment & Save
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function LandingBuilderPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Initializing Canvas Logic...</div>}>
            <BuilderContent />
        </Suspense>
    );
}
