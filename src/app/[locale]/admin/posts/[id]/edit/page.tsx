'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Category, CATEGORY_LABELS, Post } from '@/types/blog';
import { getPost, updatePost, createPost } from '@/services/blogService';
import { supabase } from '@/lib/supabase';
import { MarkdownEditor } from '@/components/editor/MarkdownEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProofreadingMode } from '@/components/editor/ProofreadingMode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from 'next-intl';
import { useRef } from 'react';
import { compressImage } from '@/lib/imageCompression';
import { removeImageBackground } from '@/lib/bgRemoval';
import { enhanceImage } from '@/lib/imageEnhance';
import { ensureCompatibleImage } from '@/lib/imageUtils';
import { finalizeContentImages, finalizeSingleImage } from '@/lib/storageFinalizer';
import { Sparkles, Loader2, UploadCloud, Languages, Lock, History, Image as ImageIcon, Camera, Palette, Wand2, Scissors, ShoppingBag, Scan, Check, AlertCircle, Trash, Sun } from 'lucide-react';
import { SocialPreview } from '@/components/admin/SocialPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { getPostTranslations } from '@/services/blogService';
import { useCategories } from '@/hooks/useCategories';
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
    const [slug, setSlug] = useState('');
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
    const [isProofreading, setIsProofreading] = useState(false);
    const [imageStyle, setImageStyle] = useState<'photo' | 'illustration' | 'minimalism' | 'paper-cut'>('photo');
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
    const [isGeneratingParaImages, setIsGeneratingParaImages] = useState(false);
    const [isProcessingTrial, setIsProcessingTrial] = useState(false);
    const [trialMode, setTrialMode] = useState<'bg-remove' | 'enhance'>('bg-remove');
    const [isAutoEnhance, setIsAutoEnhance] = useState(true);
    const [trialProgress, setTrialProgress] = useState<{ current: number, total: number, status: string }>({ current: 0, total: 0, status: '' });
    const trialInputRef = useRef<HTMLInputElement>(null);

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
                setSlug(post.slug);
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
                    const date = new Date(post.publishedAt);
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

    const base64ToBlob = (base64: string, mimeType: string) => {
        const byteCharacters = atob(base64);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        return new Blob(byteArrays, { type: mimeType });
    };

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingThumbnail(true);
        try {
            const compressedFile = await compressImage(file);
            const dateStr = new Date().toISOString().split('T')[0];
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileName = `thumb-${Date.now()}-${sanitizedName}`;
            const fullPath = `temp/${dateStr}/${fileName}`;

            const { data, error: uploadError } = await supabase.storage
                .from('posts')
                .upload(fullPath, compressedFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('posts')
                .getPublicUrl(fullPath);

            const url = publicUrl;
            console.log("Thumbnail uploaded successfully (Edit). URL:", url);
            setThumbnailUrl(url);
            setIsUploadingThumbnail(false); // Stop loading early

            // Automatically generate alt text when thumbnail is uploaded (Non-blocking)
            fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'alt-text', content: title, imageUrl: url }),
            })
                .then(res => res.json())
                .then(altData => {
                    if (altData.result) setThumbnailAlt(altData.result);
                })
                .catch(err => console.error("Auto alt-text generation failed:", err));

        } catch (error) {
            console.error("Thumbnail upload failed", error);
            alert("Thumbnail upload failed");
            setIsUploadingThumbnail(false);
        }
    };

    const handleGenerateNanoThumbnail = async () => {
        if (!title && !content) return;
        setIsGeneratingThumbnail(true);
        try {
            // 1. Generate descriptive prompt first (using existing logic but keeping it internal)
            const promptRes = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'image-prompt',
                    style: imageStyle,
                    locale, // Pass current locale for cultural optimization
                    content: `Title: ${title}\n\nContent: ${content.substring(0, 500)}`
                }),
            });
            const promptData = await promptRes.json();

            if (promptData.result) {
                // 2. Call Nano Banana for actual image generation
                const imageRes = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'nano-banana-image',
                        style: imageStyle,
                        prompt: promptData.result
                    }),
                });
                const imageData = await imageRes.json();

                if (imageData.base64) {
                    // 3. Convert to Blob -> File -> Compress -> Upload
                    const blob = base64ToBlob(imageData.base64, imageData.mimeType);
                    const file = new File([blob], 'nano-thumbnail.png', { type: imageData.mimeType || 'image/png' });
                    const compressedFile = await compressImage(file);

                    const fileName = `nano-thumbnail.png`;
                    const fullPath = `thumbnails/${Date.now()}-nano-banana.png`;

                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('posts')
                        .upload(fullPath, compressedFile);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('posts')
                        .getPublicUrl(fullPath);

                    const url = publicUrl;

                    setThumbnailUrl(url);
                    setThumbnailAlt(title);
                }
            }
        } catch (error) {
            console.error("Nano Banana generation failed", error);
            alert("Nano Banana generation failed. Please try again.");
        } finally {
            setIsGeneratingThumbnail(false);
        }
    };

    const handleGenerateParaImages = async () => {
        if (!content) return;
        setIsGeneratingParaImages(true);
        try {
            const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50 && !p.trim().startsWith('#') && !p.trim().startsWith('!'));

            if (paragraphs.length === 0) {
                alert("No suitable paragraphs found for image generation.");
                return;
            }

            // Distribute images evenly across the content
            const maxImages = 4;
            const targetCount = Math.min(maxImages, Math.ceil(paragraphs.length / 3));
            const targetParas: string[] = [];

            if (paragraphs.length <= maxImages) {
                targetParas.push(...paragraphs);
            } else {
                for (let i = 0; i < targetCount; i++) {
                    const idx = Math.floor(i * (paragraphs.length / targetCount));
                    targetParas.push(paragraphs[idx]);
                }
            }

            let newContent = content;

            for (const para of targetParas) {
                // 1. Generate Prompt
                const promptRes = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'image-prompt',
                        style: imageStyle,
                        locale,
                        content: para,
                        context: `Post Title: ${title}`
                    }),
                });

                if (!promptRes.ok) {
                    const errorText = await promptRes.text();
                    console.error(`Prompt API failed status: ${promptRes.status}`, errorText);
                    continue; // Skip this paragraph if prompt generation fails
                }
                const promptData = await promptRes.json();

                if (promptData.result) {
                    // 2. Generate Image
                    const imageRes = await fetch('/api/ai/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'nano-banana-image',
                            style: imageStyle,
                            prompt: promptData.result
                        }),
                    });

                    if (!imageRes.ok) {
                        const errorData = await imageRes.json().catch(() => ({ error: "Unknown API error" }));
                        console.error(`Image API failed status: ${imageRes.status}`, errorData);
                        continue; // Skip if image generation fails
                    }
                    const imageData = await imageRes.json();

                    if (imageData.base64) {
                        // 3. Convert to Blob -> File -> Compress -> Upload
                        const blob = base64ToBlob(imageData.base64, imageData.mimeType);
                        const file = new File([blob], 'para-image.png', { type: imageData.mimeType || 'image/png' });
                        const compressedFile = await compressImage(file);

                        const fileName = `para-image.png`;
                        const fullPath = `content-images/${Date.now()}-para.png`;

                        const { data: uploadData, error: uploadError } = await supabase.storage
                            .from('posts')
                            .upload(fullPath, compressedFile);

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage
                            .from('posts')
                            .getPublicUrl(fullPath);

                        const url = publicUrl;

                        const imageMarkdown = `\n\n![${para.substring(0, 30)}...](${url})\n\n`;
                        newContent = newContent.replace(para, `${para}${imageMarkdown}`);
                    }
                }
            }
            setContent(newContent);
            alert("Nano Banana images generated and inserted!");
        } catch (error) {
            console.error("Para image generation failed", error);
        } finally {
            setIsGeneratingParaImages(false);
        }
    };

    const handleTrialImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []).slice(0, 10);
        if (files.length === 0) return;

        setIsProcessingTrial(true);
        setTrialProgress({ current: 0, total: files.length, status: 'Initializing...' });

        let injectedMarkdown = '\n\n### 📸 체험단 상세 리뷰 이미지\n\n<div style="display: grid; grid-cols: 2; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 24px 0;">\n';

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setTrialProgress({ current: i + 1, total: files.length, status: trialMode === 'bg-remove' ? `Removing Background: ${file.name}` : `Enhancing Color: ${file.name}` });

                // 1. Convert for Compatibility (e.g., HEIC -> JPG)
                const compatibleFile = await ensureCompatibleImage(file);

                // 2. Process Image
                let processedBlob = trialMode === 'bg-remove'
                    ? await removeImageBackground(compatibleFile)
                    : await enhanceImage(compatibleFile);

                // 2.5 Optional Auto-Enhance for BG removal
                if (trialMode === 'bg-remove' && isAutoEnhance) {
                    setTrialProgress(prev => ({ ...prev, status: `Brightening Subject: ${file.name}` }));
                    processedBlob = await enhanceImage(processedBlob);
                }

                // 3. Compress
                const processedFile = new File([processedBlob], `trial-${Date.now()}-${i}.png`, { type: trialMode === 'bg-remove' ? 'image/png' : 'image/jpeg' });
                const compressedFile = await compressImage(processedFile);

                // 3. Upload to Supabase
                const dateStr = new Date().toISOString().split('T')[0];
                const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const fileName = `trial-${Date.now()}-${i}-${sanitizedName}`;
                const fullPath = `temp/${dateStr}/${fileName}`;

                const { data, error: uploadError } = await supabase.storage
                    .from('posts')
                    .upload(fullPath, compressedFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('posts')
                    .getPublicUrl(fullPath);

                const url = publicUrl;

                // 4. Add to Markdown (using img tag for better control in grid)
                injectedMarkdown += `  <img src="${url}" alt="${file.name}" style="width: 100%; aspect-ratio: 1; object-fit: contain; background: #f9f9f9; border: 1px solid #eee;" />\n`;
            }

            injectedMarkdown += '</div>\n\n';
            setContent(prev => prev + injectedMarkdown);
            alert(`Succesfully processed and injected ${files.length} images!`);
        } catch (error) {
            console.error("Trial image processing failed", error);
            alert("Some images failed to process. Please check console.");
        } finally {
            setIsProcessingTrial(false);
            setTrialProgress({ current: 0, total: 0, status: '' });
            if (trialInputRef.current) trialInputRef.current.value = '';
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
                        targetLocale: lang === 'en' ? 'English' : lang === 'ja' ? 'Japanese' : lang === 'zh' ? 'Chinese' : 'Korean',
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
        console.log("[EditPost] Starting post update process...");

        try {
            // 0. Ensure session is fresh
            console.log("[EditPost] Checking authentication...");
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;
            if (!session) throw new Error("Session expired. Please log in again.");

            // 1. Finalize Images
            console.log("[EditPost] Finalizing main content images...");
            const postDateStr = new Date().toISOString().split('T')[0];
            const permanentBasePath = `posts/${postDateStr}/${slug || id}`;

            const [finalContent, finalThumbnailUrl] = await Promise.all([
                finalizeContentImages(content, `${permanentBasePath}/content`),
                finalizeSingleImage(thumbnailUrl, `${permanentBasePath}/thumbnail`)
            ]).catch(err => {
                console.error("[EditPost] Image finalization failed, proceeding with original URLs", err);
                return [content, thumbnailUrl];
            });

            // Also finalize translations if enabled
            console.log("[EditPost] Finalizing translation images...");
            const finalTranslations = { ...translations };
            await Promise.all(Object.entries(finalTranslations).map(async ([lang, data]) => {
                if (data.enabled && data.content) {
                    try {
                        data.content = await finalizeContentImages(data.content, `${permanentBasePath}/content/${lang}`);
                    } catch (err) {
                        console.error(`[EditPost] Failed to finalize images for ${lang}`, err);
                    }
                }
            }));

            const currentGroupId = groupId || `group-${Date.now()}`;
            const publishTimestamp = publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString();

            const updateData: Partial<Post> = {
                groupId: currentGroupId,
                title,
                content: finalContent,
                excerpt: tldr || summary,
                category,
                status,
                thumbnail: {
                    url: finalThumbnailUrl || '',
                    alt: thumbnailAlt || title
                },
                seo: {
                    metaTitle: seoTitle || title,
                    metaDesc: seoDescription || summary,
                    structuredData: {
                        "@context": "https://schema.org",
                        "@type": "BlogPosting",
                        "headline": seoTitle || title,
                        "datePublished": publishTimestamp
                    }
                },
                shortCode: shortCode || null,
                publishedAt: publishTimestamp,
                linkedLandingPageId: selectedLandingId === 'none' ? null : selectedLandingId
            };

            console.log("[EditPost] Updating main post structure...");
            await updatePost(id, updateData);

            // Handle translations
            console.log("[EditPost] Processing translation updates...");
            await Promise.all(Object.entries(finalTranslations).map(async ([lang, data]) => {
                if (data.enabled && data.title && data.content) {
                    console.log(`[EditPost] Saving translation: ${lang}...`);
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
                            id: 'anonymous',
                            name: 'Admin',
                            photoUrl: null
                        },
                        thumbnail: {
                            url: finalThumbnailUrl || '',
                            alt: data.title
                        },
                        seo: {
                            metaTitle: data.seoTitle,
                            metaDesc: data.seoDescription,
                            structuredData: {
                                "@context": "https://schema.org",
                                "@type": "BlogPosting",
                                "headline": data.seoTitle,
                                "datePublished": publishTimestamp
                            }
                        },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        publishedAt: publishTimestamp,
                        status,
                        viewCount: 0,
                        shortCode: shortCode || null,
                        linkedLandingPageId: selectedLandingId === 'none' ? null : selectedLandingId
                    };

                    try {
                        if (data.id) {
                            await updatePost(data.id, transDoc as any);
                        } else {
                            await createPost(transDoc);
                        }
                        console.log(`[EditPost] Success: ${lang} update complete.`);
                    } catch (err: any) {
                        console.error(`[EditPost] Error saving translation (${lang}):`, err);
                        // Don't throw here to allow main post to finish successfully
                        alert(`Translation (${lang}) failed: ${err.message}`);
                    }
                }
            }));

            console.log("[EditPost] All tasks completed successfully.");
            router.push(`/${locale}/admin`);
        } catch (error: any) {
            console.error('[EditPost] CRITICAL_REJECTION:', error);
            alert(`Failed to update post: ${error.message || 'Unknown error'}`);
        } finally {
            console.log("[EditPost] Finalizing UI State.");
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading post...</div>;

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            {isProofreading && (
                <ProofreadingMode
                    content={content}
                    onChange={setContent}
                    onClose={() => setIsProofreading(false)}
                />
            )}
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold">Edit Post</h1>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsProofreading(true)}
                        className="gap-2 rounded-none border-black/20 hover:bg-black hover:text-white transition-colors h-9"
                    >
                        <History className="h-4 w-4" />
                        퇴고 (AI Proofread)
                    </Button>
                </div>
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
                                                    <SelectItem key={cat.id} value={cat.slug.toUpperCase()}>
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

                        <Card className="rounded-none border-black/10 shadow-none bg-yellow-50/50">
                            <CardHeader className="border-b border-black/5 bg-yellow-500/10 py-4 px-6">
                                <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-yellow-700">
                                    <Wand2 className="w-3.5 h-3.5" />
                                    Nano Banana AI
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-tight">Image Style</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            type="button"
                                            variant={imageStyle === 'photo' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setImageStyle('photo')}
                                            className="h-9 rounded-none text-[9px] uppercase font-bold"
                                        >
                                            <Camera className="w-3 h-3 mr-1" /> Photo
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={imageStyle === 'illustration' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setImageStyle('illustration')}
                                            className="h-9 rounded-none text-[9px] uppercase font-bold"
                                        >
                                            <Palette className="w-3 h-3 mr-1" /> Illust
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={imageStyle === 'minimalism' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setImageStyle('minimalism')}
                                            className="h-9 rounded-none text-[9px] uppercase font-bold"
                                        >
                                            <Sparkles className="w-3 h-3 mr-1" /> Minimal
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={imageStyle === 'paper-cut' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setImageStyle('paper-cut')}
                                            className="h-9 rounded-none text-[9px] uppercase font-bold"
                                        >
                                            <Scissors className="w-3 h-3 mr-1" /> Paper
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-10 rounded-none border-yellow-200 bg-white hover:bg-yellow-50 text-yellow-700 font-bold text-[10px] uppercase tracking-tight"
                                        onClick={handleGenerateNanoThumbnail}
                                        disabled={isGeneratingThumbnail || (!title && !content)}
                                    >
                                        {isGeneratingThumbnail ? <Loader2 className="h-3.5 h-3.5 animate-spin mr-2" /> : <ImageIcon className="w-3.5 h-3.5 mr-2" />}
                                        Generate Thumbnail
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-10 rounded-none border-yellow-200 bg-white hover:bg-yellow-50 text-yellow-700 font-bold text-[10px] uppercase tracking-tight"
                                        onClick={handleGenerateParaImages}
                                        disabled={isGeneratingParaImages || !content}
                                    >
                                        {isGeneratingParaImages ? <Loader2 className="h-3.5 h-3.5 animate-spin mr-2" /> : <Wand2 className="w-3.5 h-3.5 mr-2" />}
                                        Generate Paragraph Images
                                    </Button>
                                </div>
                                <p className="text-[9px] text-yellow-600/70 font-medium uppercase tracking-tight text-center">
                                    Nano Banana generates custom visuals based on your content.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-none border-blue-100 shadow-none bg-blue-50/30">
                            <CardHeader className="border-b border-blue-50 bg-blue-500/10 py-4 px-6">
                                <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-700">
                                    <ShoppingBag className="w-3.5 h-3.5" />
                                    Trial Toolkit
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-tight text-blue-800">Batch Photo Processor</label>
                                    <div className="flex gap-1 bg-white border border-blue-100 p-0.5 mb-2">
                                        <button
                                            type="button"
                                            onClick={() => setTrialMode('bg-remove')}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[8px] font-bold uppercase tracking-widest transition-all ${trialMode === 'bg-remove' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-600/40 hover:text-blue-600'}`}
                                        >
                                            <Scan className="w-3 h-3" /> BG Remove
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTrialMode('enhance')}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[8px] font-bold uppercase tracking-widest transition-all ${trialMode === 'enhance' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-600/40 hover:text-blue-600'}`}
                                        >
                                            <Sun className="w-3 h-3" /> Magic Enhance
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-blue-600/80 font-medium leading-relaxed">
                                        {trialMode === 'bg-remove'
                                            ? "Upload photos to automatically remove backgrounds and insert as transparent PNGs."
                                            : "Upload photos to auto-adjust brightness, contrast, and saturation for a vivid look."}
                                    </p>
                                </div>

                                {trialMode === 'bg-remove' && (
                                    <div className="flex items-center justify-between px-3 py-2 bg-white border border-blue-100 rounded-none">
                                        <div className="flex items-center gap-2">
                                            <Sun className="w-3 h-3 text-blue-500" />
                                            <span className="text-[9px] font-bold text-blue-800 uppercase tracking-tight">Auto-Brighten Subject</span>
                                        </div>
                                        <Switch
                                            checked={isAutoEnhance}
                                            onCheckedChange={setIsAutoEnhance}
                                            className="scale-75 data-[state=checked]:bg-blue-600"
                                        />
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <input
                                        type="file"
                                        ref={trialInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        multiple
                                        onChange={handleTrialImages}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-12 rounded-none border-blue-200 bg-white hover:bg-blue-100 text-blue-700 font-black text-[10px] uppercase tracking-widest transition-all"
                                        onClick={() => trialInputRef.current?.click()}
                                        disabled={isProcessingTrial}
                                    >
                                        {isProcessingTrial ? (
                                            <div className="flex flex-col items-center">
                                                <Loader2 className="w-4 h-4 animate-spin mb-1" />
                                                <span className="text-[7px]">{trialProgress.status} ({trialProgress.current}/{trialProgress.total})</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {trialMode === 'bg-remove' ? <Scan className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                                Start Batch Process
                                            </div>
                                        )}
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/5 border border-blue-100/50">
                                    <Check className="w-3 h-3 text-blue-600" />
                                    <span className="text-[8px] font-bold text-blue-800 uppercase tracking-tight">
                                        {trialMode === 'bg-remove' ? 'Auto-Transparency PNGs' : 'Vivid Color Correction Result'}
                                    </span>
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
