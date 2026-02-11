'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { AiLandingCallout } from '@/components/blog/AiLandingCallout';
import { ImageLightbox } from './ImageLightbox';

interface ArticleContentProps {
    serializedPost: any;
}

export function ArticleContent({ serializedPost }: ArticleContentProps) {
    const [lightboxData, setLightboxData] = useState<{ isOpen: boolean; index: number }>({ isOpen: false, index: 0 });
    const [extractedImages, setExtractedImages] = useState<{ url: string; alt: string }[]>([]);
    const contentRef = useRef<HTMLDivElement>(null);

    // Scan for images after component is mounted and anytime content changes
    useEffect(() => {
        if (!contentRef.current) return;

        const imgs = contentRef.current.querySelectorAll('img');
        const imageList: { url: string; alt: string }[] = [];

        imgs.forEach((img, idx) => {
            // Skip the author photo and other small thumbnails if needed
            // For now, only include images that are likely part of the article content
            const src = img.getAttribute('src');
            if (src && !src.includes('profile') && !src.includes('avatar')) {
                imageList.push({
                    url: src,
                    alt: img.getAttribute('alt') || 'Post image'
                });

                // Attach click handler
                img.style.cursor = 'zoom-in';
                img.onclick = (e) => {
                    e.preventDefault();
                    setLightboxData({ isOpen: true, index: imageList.length - 1 });
                };
            }
        });

        setExtractedImages(imageList);

        // Cleanup function (optional but good practice)
        return () => {
            imgs.forEach(img => {
                img.onclick = null;
            });
        };
    }, [serializedPost.content, serializedPost.linkedLandingPageId]);

    return (
        <div ref={contentRef} className="prose prose-lg dark:prose-invert max-w-none" suppressHydrationWarning>
            {serializedPost.linkedLandingPageId ? (
                <AiLandingCallout
                    landingPageId={serializedPost.linkedLandingPageId}
                    content={serializedPost.content}
                />
            ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {serializedPost.content}
                </ReactMarkdown>
            )}

            <ImageLightbox
                images={extractedImages}
                currentIndex={lightboxData.index}
                isOpen={lightboxData.isOpen}
                onClose={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
                onNavigate={(index) => setLightboxData(prev => ({ ...prev, index }))}
            />
        </div>
    );
}
