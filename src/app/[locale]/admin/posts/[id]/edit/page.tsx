'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Category, CATEGORY_LABELS, Post } from '@/types/blog';
import { getPost, updatePost } from '@/services/blogService';
import { Timestamp } from 'firebase/firestore';
import { MarkdownEditor } from '@/components/editor/MarkdownEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from 'next-intl';
import { useRef } from 'react';
import { storage } from '@/lib/firebase';
import { useCategories } from '@/hooks/useCategories';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '@/lib/imageCompression';
import { Sparkles, Loader2, UploadCloud, Languages, Lock } from 'lucide-react';
import { SocialPreview } from '@/components/admin/SocialPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { getPostTranslations } from '@/services/blogService';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getLandingPages } from '@/services/landingService';
import { LandingPage } from '@/types/landing';

interface translationData {
    id?: string;
    enabled: boolean;
    title: string;
    content: string;
    slug: string;
    seoTitle: string;
    seoDescription: string;
    excerpt: string;
}

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const locale = useLocale() as 'en' | 'ko';
    const { id } = use(params);

    const { data: categories, isLoading: isCategoriesLoading } = useCategories();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<string>('PLANNING');
    const [summary, setSummary] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [thumbnailAlt, setThumbnailAlt] = useState('');
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');
    const [tldr, setTldr] = useState('');
    const [status, setStatus] = useState<'published' | 'draft' | 'scheduled'>('published');
    const [publishedAt, setPublishedAt] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [shortCode, setShortCode] = useState('');
    const [groupId, setGroupId] = useState('');
    const [translations, setTranslations] = useState<Record<string, translationData>>({
        en: { enabled: false, title: '', content: '', slug: '', seoTitle: '', seoDescription: '', excerpt: '' },
        ja: { enabled: false, title: '', content: '', slug: '', seoTitle: '', seoDescription: '', excerpt: '' },
        zh: { enabled: false, title: '', content: '', slug: '', seoTitle: '', seoDescription: '', excerpt: '' },
    });
    const [isTranslating, setIsTranslating] = useState(false);
    const [isShortCodePermanent, setIsShortCodePermanent] = useState(false);
    const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
    const [selectedLandingId, setSelectedLandingId] = useState<string>('none');

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);

    const generateShortUrl = () => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setShortCode(code);
    };

    useEffect(() => {
        const fetchPost = async () => {
            const post = await getPost(id);
            if (post) {
                setTitle(post.title || '');
                setContent(post.content || '');
                setCategory(post.category);
                setSummary(post.excerpt || '');
                setThumbnailUrl(post.thumbnail?.url || '');
                setThumbnailAlt(post.thumbnail?.alt || '');
                setSeoTitle(post.seo?.metaTitle || '');
                setSeoDescription(post.seo?.metaDesc || '');
                setTldr(post.excerpt || '');
                setStatus(post.status);
                setShortCode(post.shortCode || '');
                if (post.shortCode) setIsShortCodePermanent(true);
                setGroupId(post.groupId || '');

                if (post.publishedAt) {
                    const date = new Date(post.publishedAt.seconds * 1000);
                    const formattedDate = date.toISOString().slice(0, 16);
                    setPublishedAt(formattedDate);
                }

                // Fetch extra translations
                if (post.groupId) {
                    const allTrans = await getPostTranslations(post.groupId);
                    const transObj = { ...translations };
                    allTrans.forEach(t => {
                        if (t.locale !== locale) {
                            transObj[t.locale] = {
                                id: t.id,
                                enabled: true,
                                title: t.title,
                                content: t.content,
                                slug: t.slug,
                                seoTitle: t.seo.metaTitle,
                                seoDescription: t.seo.metaDesc,
                                excerpt: t.excerpt
                            };
                        }
                    });
                    setTranslations(transObj);
                }

                // Fetch landing pages
                const lpList = await getLandingPages();
                setLandingPages(lpList);
                if (post.linkedLandingPageId) setSelectedLandingId(post.linkedLandingPageId);
            } else {
                alert('Post not found');
                router.push(`/${locale}/admin`);
            }
            setIsLoading(false);
        };
        fetchPost();
    }, [id, router, locale]);

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingThumbnail(true);
        try {
            const compressedFile = await compressImage(file);
            const storageRef = ref(storage, `thumbnails/${Date.now()}-${file.name}`);
            await uploadBytes(storageRef, compressedFile);
            const url = await getDownloadURL(storageRef);
            setThumbnailUrl(url);

            // Automatically generate alt text when thumbnail is uploaded
            const altResponse = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'alt-text', content: title, imageUrl: url }),
            });
            const altData = await altResponse.json();
            if (altData.result) setThumbnailAlt(altData.result);

        } catch (error) {
            console.error("Thumbnail upload failed", error);
            alert("Thumbnail upload failed");
        } finally {
            setIsUploadingThumbnail(false);
        }
    };
    const handleGenerateAI = async () => {
        if (!content && !title) return;
        setIsGeneratingAI(true);
        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'seo-metadata', content: `Title: ${title}\n\n${content}` }),
            });
            const data = await response.json();
            if (data.seoTitle) setSeoTitle(data.seoTitle);
            if (data.seoDescription) setSeoDescription(data.seoDescription);

            const tldrResponse = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'tldr', content }),
            });
            const tldrData = await tldrResponse.json();
            if (tldrData.result) setTldr(tldrData.result);
        } catch (error) {
            console.error("AI Generation failed", error);
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleTranslateAll = async () => {
        if (!title || !content) return;
        setIsTranslating(true);
        const targetLocales = Object.keys(translations);

        try {
            for (const lang of targetLocales) {
                const response = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'translate',
                        targetLocale: lang === 'en' ? 'English' : lang === 'ja' ? 'Japanese' : 'Chinese',
                        title,
                        content
                    }),
                });

                if (!response.ok) {
                    const errData = await response.json();
                    console.error(`Translation failed for ${lang}:`, errData);
                    continue;
                }

                const data = await response.json();
                setTranslations(prev => ({
                    ...prev,
                    [lang]: {
                        ...prev[lang],
                        enabled: true,
                        title: data.title,
                        slug: data.slug,
                        content: data.content,
                        seoTitle: data.seoTitle,
                        seoDescription: data.seoDescription,
                        excerpt: data.seoDescription.substring(0, 160)
                    }
                }));
            }
        } catch (error) {
            console.error("Translation failed", error);
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content) return;

        setIsSubmitting(true);
        try {
            const currentGroupId = groupId || `group-${Date.now()}`;
            const publishTimestamp = publishedAt ? Timestamp.fromDate(new Date(publishedAt)) : Timestamp.now();

            const updateData: Partial<Post> = {
                groupId: currentGroupId,
                title,
                content,
                excerpt: tldr || summary,
                category,
                status,
                thumbnail: {
                    url: thumbnailUrl,
                    alt: thumbnailAlt || title
                },
                seo: {
                    metaTitle: seoTitle || title,
                    metaDesc: seoDescription || summary,
                    structuredData: {
                        "@context": "https://schema.org",
                        "@type": "BlogPosting",
                        "headline": seoTitle || title,
                        "datePublished": publishTimestamp.toDate().toISOString()
                    }
                },
                shortCode: shortCode || null,
                publishedAt: publishTimestamp,
                linkedLandingPageId: selectedLandingId === 'none' ? undefined : selectedLandingId
            };

            await updatePost(id, updateData);

            // Handle translations
            await Promise.all(Object.entries(translations).map(async ([lang, data]) => {
                if (data.enabled && data.title && data.content) {
                    const transDoc: Omit<Post, 'id'> = {
                        groupId: currentGroupId,
                        locale: lang,
                        title: data.title,
                        content: data.content,
                        slug: data.slug || `post-${Date.now()}-${lang}`,
                        excerpt: data.excerpt,
                        category,
                        tags: [],
                        author: {
                            id: 'anonymous', // Should ideally fetch from original post if needed, but let's keep it simple
                            name: 'Admin',
                            photoUrl: null
                        },
                        thumbnail: {
                            url: thumbnailUrl,
                            alt: data.title
                        },
                        seo: {
                            metaTitle: data.seoTitle,
                            metaDesc: data.seoDescription,
                            structuredData: {
                                "@context": "https://schema.org",
                                "@type": "BlogPosting",
                                "headline": data.seoTitle,
                                "datePublished": publishTimestamp.toDate().toISOString()
                            }
                        },
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                        publishedAt: publishTimestamp,
                        status,
                        viewCount: 0,
                        shortCode: shortCode || null,
                        linkedLandingPageId: selectedLandingId === 'none' ? undefined : selectedLandingId
                    };

                    if (data.id) {
                        await updatePost(data.id, transDoc as any);
                    } else {
                        await addDoc(collection(db, 'posts'), transDoc);
                    }
                }
            }));

            alert('Post and translations updated successfully');
            router.push(`/${locale}/admin`);
        } catch (error) {
            console.error('Error updating document: ', error);
            alert('Failed to update post');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading post...</div>;

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Edit Post</h1>
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateAI}
                    disabled={isGeneratingAI || (!content && !title)}
                    className="gap-2 rounded-none border-black/10"
                >
                    {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Generate AI Meta
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="space-y-4 bg-background p-6 rounded-none border border-black/10 shadow-none">
                            <div className="space-y-2 text-start">
                                <Label htmlFor="title" className="font-bold text-xs uppercase tracking-tight">Title</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter post title"
                                    required
                                    className="text-lg font-bold rounded-none border-black/10"
                                />
                            </div>
                            <div className="space-y-2 pt-4 border-t border-black/5">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight text-start block">Short URL (Optional)</Label>
                                <div className="flex gap-2">
                                    <div className="flex-grow bg-black/[0.02] rounded-none px-3 py-2 text-sm font-medium flex items-center justify-between border border-black/5">
                                        <span className="text-muted-foreground">{shortCode ? `mars.it.kr/s/${shortCode}` : 'Not generated'}</span>
                                        {shortCode && (
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(`https://mars.it.kr/s/${shortCode}`)}
                                                className="text-black font-bold hover:underline text-[10px] uppercase tracking-tight"
                                            >
                                                Copy
                                            </button>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant={isShortCodePermanent ? "ghost" : "outline"}
                                        size="sm"
                                        onClick={generateShortUrl}
                                        className="whitespace-nowrap rounded-none border-black/10 font-bold text-[10px] uppercase tracking-tight"
                                        disabled={isShortCodePermanent}
                                    >
                                        {isShortCodePermanent ? (
                                            <span className="flex items-center gap-1 opacity-60">
                                                <Lock className="w-3 h-3" /> Fixed
                                            </span>
                                        ) : (
                                            shortCode ? 'Regenerate' : 'Generate'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 text-start">
                            <Label className="font-bold text-xs uppercase tracking-tight">Content (Markdown)</Label>
                            <MarkdownEditor content={content} onChange={setContent} />
                        </div>

                        <div className="space-y-2 text-start">
                            <Label htmlFor="tldr" className="font-bold text-xs uppercase tracking-tight">AI 핵심 요약 (TL;DR)</Label>
                            <Textarea
                                id="tldr"
                                value={tldr}
                                onChange={(e) => setTldr(e.target.value)}
                                placeholder="AI summary will appear here..."
                                rows={3}
                                className="rounded-none border-black/10 font-medium text-sm"
                            />
                        </div>

                        <Card className="rounded-none border-black/10 bg-black/[0.02] shadow-none">
                            <CardHeader className="pb-3 px-4 sm:px-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="text-start">
                                        <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                            <Languages className="w-5 h-5" />
                                            Multi-Language Translations
                                        </CardTitle>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-tight">
                                            Manage translations for this post. Enable to edit.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleTranslateAll}
                                        disabled={isTranslating || !content || !title}
                                        className="bg-black text-white hover:bg-black/90 rounded-none font-bold text-[10px] uppercase tracking-tight"
                                    >
                                        {isTranslating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                        {Object.values(translations).some(t => t.id) ? 'Update All Translations' : 'Translate to All Languages'}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                                <Tabs defaultValue="en" className="w-full">
                                    <TabsList className="grid grid-cols-3 w-full max-w-md bg-black/[0.05] rounded-none p-1 h-auto">
                                        {Object.keys(translations).map(lang => (
                                            <TabsTrigger key={lang} value={lang} className="flex items-center gap-2 rounded-none data-[state=active]:bg-white data-[state=active]:text-black py-2">
                                                <span className="uppercase text-[10px] font-bold tracking-widest">{lang}</span>
                                                {translations[lang].enabled && (
                                                    <span className="w-1.5 h-1.5 rounded-none bg-black" />
                                                )}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                    {Object.entries(translations).map(([lang, data]) => (
                                        <TabsContent key={lang} value={lang} className="space-y-4 pt-4 border-t border-black/5 mt-4">
                                            <div className="flex items-center justify-between bg-black/[0.02] p-3 rounded-none border border-dashed border-black/10 text-start">
                                                <div className="flex items-center gap-2">
                                                    <Languages className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-bold uppercase tracking-tight">Enable {lang.toUpperCase()} Translation</span>
                                                </div>
                                                <Switch
                                                    checked={data.enabled}
                                                    onCheckedChange={(val) => setTranslations(prev => ({ ...prev, [lang]: { ...prev[lang], enabled: val } }))}
                                                    className="data-[state=checked]:bg-black"
                                                />
                                            </div>
                                            {!data.enabled && (
                                                <div className="bg-black/[0.02] rounded-none p-4 text-center text-[10px] font-bold uppercase tracking-tight text-muted-foreground border border-black/5">
                                                    Enable this language to edit and publish the translation.
                                                </div>
                                            )}
                                            <div className={data.enabled ? "space-y-4" : "opacity-50 pointer-events-none space-y-4 text-start"}>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-bold uppercase tracking-tight">Title ({lang.toUpperCase()})</Label>
                                                        <Input
                                                            value={data.title}
                                                            onChange={(e) => setTranslations(prev => ({ ...prev, [lang]: { ...prev[lang], title: e.target.value } }))}
                                                            className="rounded-none border-black/10 font-bold"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-bold uppercase tracking-tight">Slug ({lang.toUpperCase()})</Label>
                                                        <Input
                                                            value={data.slug}
                                                            onChange={(e) => setTranslations(prev => ({ ...prev, [lang]: { ...prev[lang], slug: e.target.value } }))}
                                                            className="rounded-none border-black/10 font-medium"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-bold uppercase tracking-tight">Content ({lang.toUpperCase()})</Label>
                                                    <Textarea
                                                        value={data.content}
                                                        onChange={(e) => setTranslations(prev => ({ ...prev, [lang]: { ...prev[lang], content: e.target.value } }))}
                                                        rows={12}
                                                        className="font-mono text-sm leading-relaxed rounded-none border-black/10"
                                                    />
                                                </div>
                                            </div>
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6 text-start">
                        <Card className="rounded-none border-black/10 shadow-none">
                            <CardHeader className="border-b border-black/5 bg-black/[0.02] py-4 px-6">
                                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Publishing Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="space-y-2">
                                    <Label htmlFor="status" className="text-[10px] font-bold uppercase tracking-tight">Status</Label>
                                    <Select value={status} onValueChange={(val) => setStatus(val as any)}>
                                        <SelectTrigger className="rounded-none border-black/10 font-bold">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none border-black/10">
                                            <SelectItem value="published">Published</SelectItem>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="scheduled">Scheduled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="category" className="text-[10px] font-bold uppercase tracking-tight">Category</Label>
                                    <Select value={category} onValueChange={(val) => setCategory(val)}>
                                        <SelectTrigger disabled={isCategoriesLoading} className="rounded-none border-black/10 font-bold">
                                            <SelectValue placeholder={isCategoriesLoading ? "Loading..." : "Select category"} />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none border-black/10">
                                            {isCategoriesLoading ? (
                                                <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                                            ) : (
                                                categories?.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.id}>
                                                        {cat.name[locale] || cat.name['ko'] || cat.id}
                                                    </SelectItem>
                                                ))
                                            )}
                                            {(!categories || categories.length === 0) && !isCategoriesLoading &&
                                                Object.keys(CATEGORY_LABELS).map((cat) => (
                                                    cat !== 'ALL' && (
                                                        <SelectItem key={cat} value={cat}>
                                                            {CATEGORY_LABELS[cat]?.[locale] || cat}
                                                        </SelectItem>
                                                    )
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="publishedAt" className="text-[10px] font-bold uppercase tracking-tight">Scheduled Date</Label>
                                    <Input
                                        id="publishedAt"
                                        type="datetime-local"
                                        value={publishedAt}
                                        onChange={(e) => setPublishedAt(e.target.value)}
                                        className="rounded-none border-black/10 font-medium"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-none border-black/10 shadow-none">
                            <CardHeader className="border-b border-black/5 bg-black/[0.02] py-4 px-6">
                                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">SEO Optimization</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="space-y-2">
                                    <Label htmlFor="seoTitle" className="text-[10px] font-bold uppercase tracking-tight">SEO Title</Label>
                                    <Input
                                        id="seoTitle"
                                        value={seoTitle}
                                        onChange={(e) => setSeoTitle(e.target.value)}
                                        placeholder="Search engine title"
                                        className="rounded-none border-black/10 font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="seoDescription" className="text-[10px] font-bold uppercase tracking-tight">SEO Description</Label>
                                    <Textarea
                                        id="seoDescription"
                                        value={seoDescription}
                                        onChange={(e) => setSeoDescription(e.target.value)}
                                        placeholder="Search engine summary"
                                        rows={3}
                                        className="rounded-none border-black/10 text-sm"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-none border-black/10 shadow-none">
                            <CardHeader className="border-b border-black/5 bg-black/[0.02] py-4 px-6">
                                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Thumbnail</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="flex gap-2">
                                    <input
                                        type="file"
                                        ref={thumbnailInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleThumbnailUpload}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full rounded-none border-black/10 font-bold text-[10px] uppercase tracking-tight"
                                        onClick={() => thumbnailInputRef.current?.click()}
                                        disabled={isUploadingThumbnail}
                                    >
                                        {isUploadingThumbnail ? <Loader2 className="h-3 h-3 animate-spin mr-2" /> : <UploadCloud className="w-3.5 h-3.5 mr-2" />}
                                        Upload Image
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="thumbnailUrl" className="text-[10px] font-bold uppercase tracking-tight">Thumbnail URL</Label>
                                    <Input
                                        id="thumbnailUrl"
                                        value={thumbnailUrl}
                                        onChange={(e) => setThumbnailUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="rounded-none border-black/10 font-medium text-xs"
                                    />
                                </div>
                                {thumbnailUrl && (
                                    <div className="space-y-4">
                                        <div className="relative aspect-video bg-black/[0.05] rounded-none overflow-hidden border border-black/5">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="thumbnailAlt" className="text-[10px] font-bold uppercase tracking-tight">Alt Text</Label>
                                            <Input
                                                id="thumbnailAlt"
                                                value={thumbnailAlt}
                                                onChange={(e) => setThumbnailAlt(e.target.value)}
                                                placeholder="Description for accessibility"
                                                className="rounded-none border-black/10 font-medium"
                                            />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-none border-black/10 shadow-none">
                            <CardHeader className="border-b border-black/5 bg-black/[0.02] py-4 px-6">
                                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Linked Landing Page</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-tight">Active Campaign</Label>
                                    <Select value={selectedLandingId} onValueChange={setSelectedLandingId}>
                                        <SelectTrigger className="rounded-none border-black/10 font-bold">
                                            <SelectValue placeholder="Select Landing Page" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none border-black/10">
                                            <SelectItem value="none">Disabled (No Landing Page)</SelectItem>
                                            {landingPages.map(lp => (
                                                <SelectItem key={lp.id} value={lp.id}>
                                                    {lp.title} ({lp.locale?.toUpperCase() || '??'}, {lp.status})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">
                                        Selected landing page callouts will be automatically injected into the post content by AI.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-none border-black/10 shadow-none overflow-hidden">
                            <CardHeader className="border-b border-black/5 bg-black/[0.02] py-4 px-6">
                                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Social & Search Preview</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <SocialPreview
                                    title={seoTitle || title}
                                    description={seoDescription || summary || content.replace(/[#*`]/g, '').substring(0, 160)}
                                    thumbnailUrl={thumbnailUrl}
                                    locale={locale}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-black/5 pt-8">
                    <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-none border-black/10 px-8 font-bold text-[10px] uppercase tracking-widest hover:bg-black/[0.05]">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting || isGeneratingAI} className="px-10 rounded-none bg-black text-white hover:bg-black/90 font-bold text-[10px] uppercase tracking-widest">
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : 'Update Post'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
