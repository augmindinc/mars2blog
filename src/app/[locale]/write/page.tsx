'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Category, CATEGORY_LABELS, Post } from '@/types/blog';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '@/lib/imageCompression';
import { MarkdownEditor } from '@/components/editor/MarkdownEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from 'next-intl';
import { UploadCloud, Loader2, Sparkles, Languages } from 'lucide-react';
import slugify from 'slugify';
import { SocialPreview } from '@/components/admin/SocialPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

interface translationData {
    enabled: boolean;
    title: string;
    content: string;
    slug: string;
    seoTitle: string;
    seoDescription: string;
    excerpt: string;
    isGenerating?: boolean;
}

export default function WritePage() {
    const router = useRouter();
    const { user } = useAuth();
    const locale = useLocale() as 'en' | 'ko';

    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<Category>('ISSUE');
    const [summary, setSummary] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [thumbnailAlt, setThumbnailAlt] = useState('');
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');
    const [tldr, setTldr] = useState('');
    const [publishedAt, setPublishedAt] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingSlug, setIsGeneratingSlug] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    const [shortCode, setShortCode] = useState('');
    const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);

    const [translations, setTranslations] = useState<Record<string, translationData>>({
        en: { enabled: false, title: '', content: '', slug: '', seoTitle: '', seoDescription: '', excerpt: '' },
        ja: { enabled: false, title: '', content: '', slug: '', seoTitle: '', seoDescription: '', excerpt: '' },
        zh: { enabled: false, title: '', content: '', slug: '', seoTitle: '', seoDescription: '', excerpt: '' },
    });

    const handleGenerateAI = async () => {
        if (!content && !title) return;
        setIsGeneratingAI(true);
        try {
            // Generate TL;DR and SEO meta
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

            // Generate Alt text if we have a title
            if (thumbnailUrl && !thumbnailAlt) {
                const altResponse = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'alt-text', content: title, imageUrl: thumbnailUrl }),
                });
                const altData = await altResponse.json();
                if (altData.result) setThumbnailAlt(altData.result);
            }
        } catch (error) {
            console.error("AI Generation failed", error);
        } finally {
            setIsGeneratingAI(false);
        }
    };
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    const generateShortUrl = () => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setShortCode(code);
    };

    // Debounce and generate slug using AI
    useEffect(() => {
        const handler = setTimeout(async () => {
            if (title.trim()) {
                setIsGeneratingSlug(true);
                try {
                    const response = await fetch('/api/generate-slug', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ title }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.slug) {
                            setSlug(data.slug);
                        }
                    } else {
                        setSlug(slugify(title, { lower: true, strict: true, trim: true }));
                    }
                } catch (error) {
                    console.error("Slug generation error:", error);
                    setSlug(slugify(title, { lower: true, strict: true, trim: true }));
                } finally {
                    setIsGeneratingSlug(false);
                }
            } else {
                setSlug('');
            }
        }, 1000);

        return () => {
            clearTimeout(handler);
        };
    }, [title]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content) return;

        setIsSubmitting(true);
        try {
            const groupId = `group-${Date.now()}`;
            const publishTimestamp = publishedAt ? Timestamp.fromDate(new Date(publishedAt)) : Timestamp.now();
            let initialStatus: 'published' | 'scheduled' = 'published';
            if (publishedAt && new Date(publishedAt) > new Date()) {
                initialStatus = 'scheduled';
            }

            // 1. Prepare Original Post
            const originalPost: Omit<Post, 'id'> = {
                groupId,
                locale,
                title,
                content,
                excerpt: tldr || summary || seoDescription.substring(0, 160),
                slug: slug || `post-${Date.now()}`,
                category,
                tags: [],
                author: {
                    id: user?.uid || 'anonymous',
                    name: user?.displayName || 'Anonymous',
                    photoUrl: user?.photoURL ?? null
                },
                thumbnail: {
                    url: thumbnailUrl,
                    alt: thumbnailAlt || title
                },
                seo: {
                    metaTitle: seoTitle || title,
                    metaDesc: seoDescription || summary || (tldr ? tldr.substring(0, 160) : ''),
                    structuredData: {
                        "@context": "https://schema.org",
                        "@type": "BlogPosting",
                        "headline": seoTitle || title,
                        "datePublished": publishTimestamp.toDate().toISOString(),
                        "author": {
                            "@type": "Person",
                            "name": user?.displayName || 'Anonymous'
                        }
                    }
                },
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                publishedAt: publishTimestamp,
                status: initialStatus,
                viewCount: 0,
                shortCode: shortCode || null
            };

            const postsToSave = [originalPost];

            // 2. Prepare Translations
            Object.entries(translations).forEach(([lang, data]) => {
                if (data.enabled && data.title && data.content) {
                    postsToSave.push({
                        ...originalPost,
                        locale: lang,
                        title: data.title,
                        content: data.content,
                        slug: data.slug || `post-${Date.now()}-${lang}`,
                        excerpt: data.excerpt,
                        seo: {
                            ...originalPost.seo,
                            metaTitle: data.seoTitle,
                            metaDesc: data.seoDescription,
                            structuredData: {
                                ...originalPost.seo.structuredData,
                                headline: data.seoTitle,
                            }
                        }
                    });
                }
            });

            // 3. Save all to Firestore
            await Promise.all(postsToSave.map(p => addDoc(collection(db, 'posts'), p)));
            router.push(`/${locale}`);
        } catch (error) {
            console.error('Error adding document: ', error);
            alert('Failed to save post');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Write New Post</h1>
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateAI}
                    disabled={isGeneratingAI || (!content && !title)}
                    className="gap-2"
                >
                    {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                    Generate AI Meta
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="space-y-4 bg-background p-6 rounded-lg border">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter post title"
                                    required
                                    className="text-lg font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug (URL)</Label>
                                <div className="relative">
                                    <Input
                                        id="slug"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value)}
                                        placeholder="english-slug-only"
                                        required
                                        className={isGeneratingSlug ? "pr-10" : ""}
                                    />
                                    {isGeneratingSlug && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2 pt-2 border-t border-dashed">
                                <Label className="text-xs text-muted-foreground">Short URL (Optional)</Label>
                                <div className="flex gap-2">
                                    <div className="flex-grow bg-muted/50 rounded-md px-3 py-2 text-sm font-mono flex items-center justify-between border">
                                        <span>{shortCode ? `mars.it.kr/s/${shortCode}` : 'Not generated'}</span>
                                        {shortCode && (
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(`https://mars.it.kr/s/${shortCode}`)}
                                                className="text-primary hover:underline text-xs"
                                            >
                                                Copy
                                            </button>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={generateShortUrl}
                                        className="whitespace-nowrap"
                                    >
                                        Generate
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Content (Markdown)</Label>
                            <MarkdownEditor content={content} onChange={setContent} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tldr">AI 핵심 요약 (TL;DR)</Label>
                            <Textarea
                                id="tldr"
                                value={tldr}
                                onChange={(e) => setTldr(e.target.value)}
                                placeholder="AI summary will appear here..."
                                rows={3}
                            />
                        </div>

                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader className="pb-3 px-4 sm:px-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Languages className="w-5 h-5 text-primary" />
                                            Multi-Language Translations
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            AI will generate SEO-friendly slugs and content for other languages.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="default"
                                        size="sm"
                                        onClick={handleTranslateAll}
                                        disabled={isTranslating || !content || !title}
                                        className="shadow-sm"
                                    >
                                        {isTranslating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                        Translate to All Languages
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                                <Tabs defaultValue="en" className="w-full">
                                    <TabsList className="grid grid-cols-3 w-full max-w-md">
                                        {Object.keys(translations).map(lang => (
                                            <TabsTrigger key={lang} value={lang} className="flex items-center gap-2">
                                                <span className="uppercase text-xs font-bold">{lang}</span>
                                                {translations[lang].enabled && (
                                                    <span className="w-2 h-2 rounded-full bg-primary" />
                                                )}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                    {Object.entries(translations).map(([lang, data]) => (
                                        <TabsContent key={lang} value={lang} className="space-y-4 pt-4 border-t mt-4">
                                            <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-dashed">
                                                <div className="flex items-center gap-2">
                                                    <Languages className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">Enable {lang.toUpperCase()} Translation</span>
                                                </div>
                                                <Switch
                                                    checked={data.enabled}
                                                    onCheckedChange={(val) => setTranslations(prev => ({ ...prev, [lang]: { ...prev[lang], enabled: val } }))}
                                                />
                                            </div>
                                            {!data.enabled && (
                                                <div className="bg-muted/50 rounded-md p-4 text-center text-sm text-muted-foreground">
                                                    Enable this language to edit and publish the translation.
                                                </div>
                                            )}
                                            <div className={data.enabled ? "space-y-4" : "opacity-50 pointer-events-none space-y-4"}>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs">Title ({lang.toUpperCase()})</Label>
                                                        <Input
                                                            value={data.title}
                                                            onChange={(e) => setTranslations(prev => ({ ...prev, [lang]: { ...prev[lang], title: e.target.value } }))}
                                                            placeholder="Translated Title"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs">Slug ({lang.toUpperCase()})</Label>
                                                        <Input
                                                            value={data.slug}
                                                            onChange={(e) => setTranslations(prev => ({ ...prev, [lang]: { ...prev[lang], slug: e.target.value } }))}
                                                            placeholder="translated-slug"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Content ({lang.toUpperCase()})</Label>
                                                    <Textarea
                                                        value={data.content}
                                                        onChange={(e) => setTranslations(prev => ({ ...prev, [lang]: { ...prev[lang], content: e.target.value } }))}
                                                        placeholder="Translated content in Markdown..."
                                                        rows={12}
                                                        className="font-mono text-sm leading-relaxed"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs">SEO Title ({lang.toUpperCase()})</Label>
                                                        <Input
                                                            value={data.seoTitle}
                                                            onChange={(e) => setTranslations(prev => ({ ...prev, [lang]: { ...prev[lang], seoTitle: e.target.value } }))}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs">SEO Description ({lang.toUpperCase()})</Label>
                                                        <Textarea
                                                            value={data.seoDescription}
                                                            onChange={(e) => setTranslations(prev => ({ ...prev, [lang]: { ...prev[lang], seoDescription: e.target.value, excerpt: e.target.value.substring(0, 160) } }))}
                                                            rows={2}
                                                            className="text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Publishing Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select value={category} onValueChange={(val) => setCategory(val as Category)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(CATEGORY_LABELS).map((cat) => (
                                                cat !== 'ALL' && (
                                                    <SelectItem key={cat} value={cat}>
                                                        {CATEGORY_LABELS[cat as Category]?.[locale] || cat}
                                                    </SelectItem>
                                                )
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="publishedAt">Scheduled Date</Label>
                                    <Input
                                        id="publishedAt"
                                        type="datetime-local"
                                        value={publishedAt}
                                        onChange={(e) => setPublishedAt(e.target.value)}
                                        className="accent-primary"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">SEO & AI Optimization</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="seoTitle">SEO Title</Label>
                                    <Input
                                        id="seoTitle"
                                        value={seoTitle}
                                        onChange={(e) => setSeoTitle(e.target.value)}
                                        placeholder="Search engine title"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="seoDescription">SEO Description</Label>
                                    <Textarea
                                        id="seoDescription"
                                        value={seoDescription}
                                        onChange={(e) => setSeoDescription(e.target.value)}
                                        placeholder="Search engine summary"
                                        rows={3}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Thumbnail</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
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
                                        className="w-full"
                                        onClick={() => thumbnailInputRef.current?.click()}
                                        disabled={isUploadingThumbnail}
                                    >
                                        {isUploadingThumbnail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                                        Upload Image
                                    </Button>
                                </div>
                                {thumbnailUrl && (
                                    <div className="space-y-4">
                                        <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="thumbnailAlt">Alt Text (AI generated)</Label>
                                            <Input
                                                id="thumbnailAlt"
                                                value={thumbnailAlt}
                                                onChange={(e) => setThumbnailAlt(e.target.value)}
                                                placeholder="AI description for accessibility"
                                            />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Social & Search Preview</CardTitle>
                            </CardHeader>
                            <CardContent>
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

                <div className="flex justify-end gap-4 border-t pt-6">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting || isGeneratingAI} className="px-8">
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...</> : 'Publish Post'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
