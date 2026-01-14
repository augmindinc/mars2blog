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
import { UploadCloud, Loader2, Sparkles } from 'lucide-react';
import slugify from 'slugify';
import { SocialPreview } from '@/components/admin/SocialPreview';

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
    const thumbnailInputRef = useRef<HTMLInputElement>(null);
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
            const finalSlug = slug || `post-${Date.now()}`;
            const publishTimestamp = publishedAt ? Timestamp.fromDate(new Date(publishedAt)) : Timestamp.now();

            let initialStatus: 'published' | 'scheduled' = 'published';
            if (publishedAt && new Date(publishedAt) > new Date()) {
                initialStatus = 'scheduled';
            }

            const newPost: Omit<Post, 'id'> = {
                title,
                content,
                excerpt: tldr || summary || seoDescription.substring(0, 160),
                slug: finalSlug,
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

            await addDoc(collection(db, 'posts'), newPost);
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
                                                        {CATEGORY_LABELS[cat as Category][locale]}
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
