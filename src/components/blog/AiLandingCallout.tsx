'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { LandingPage } from '@/types/landing';
import { getLandingPage, getLandingPageTranslations } from '@/services/landingService';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/routing';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface AiLandingCalloutProps {
    landingPageId: string;
    content: string;
}

export function AiLandingCallout({ landingPageId, content }: AiLandingCalloutProps) {
    const params = useParams();
    const locale = params.locale as string;
    const [placement, setPlacement] = useState<{ paragraphIndex: number; selectedCalloutIndex: number } | null>(null);
    const [landingPage, setLandingPage] = useState<LandingPage | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAndPlace = async () => {
            try {
                let lp = await getLandingPage(landingPageId);

                // If the landing page locale doesn't match current locale, try to find a translation
                if (lp && lp.locale !== locale && lp.groupId) {
                    const translations = await getLandingPageTranslations(lp.groupId);
                    const matchedTranslation = translations.find(t => t.locale === locale);
                    if (matchedTranslation) {
                        lp = matchedTranslation;
                    }
                }

                if (!lp || !lp.callouts || lp.callouts.length === 0) {
                    setLoading(false);
                    return;
                }
                setLandingPage(lp);

                const cacheKey = `callout_${landingPageId}_${content.length}`;
                const cached = sessionStorage.getItem(cacheKey);

                if (cached) {
                    setPlacement(JSON.parse(cached));
                } else {
                    const res = await fetch('/api/blog/callout-placement', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content, callouts: lp.callouts })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data.paragraphIndex !== undefined) {
                            setPlacement(data);
                            sessionStorage.setItem(cacheKey, JSON.stringify(data));
                            return;
                        }
                    }

                    // Heuristic Fallback Strategy if API fails or returns invalid data
                    const paragraphs = content.trim().split(/\n\n+/);
                    let fallbackIndex = 1; // Default to after 1st paragraph

                    if (paragraphs.length >= 6) {
                        fallbackIndex = Math.floor(paragraphs.length / 2); // Middle of post
                    } else if (paragraphs.length >= 3) {
                        fallbackIndex = 2; // After 2nd paragraph
                    }

                    const fallbackPlacement = {
                        paragraphIndex: Math.min(fallbackIndex, paragraphs.length - 1),
                        selectedCalloutIndex: 0 // Use first callout
                    };
                    setPlacement(fallbackPlacement);
                    console.warn("Using heuristic fallback for callout placement due to API error.");
                }
            } catch (error) {
                console.error("Failed callout placement, utilizing fallback:", error);
                // Last ditch fallback if even the above fails
                setPlacement({ paragraphIndex: 1, selectedCalloutIndex: 0 });
            } finally {
                setLoading(false);
            }
        };

        loadAndPlace();
    }, [landingPageId, content]);

    if (loading || !placement || !landingPage || !landingPage.callouts) {
        return (
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {content}
            </ReactMarkdown>
        );
    }

    const callouts = landingPage.callouts;
    const selectedCalloutIndex = Math.min(Math.max(0, placement.selectedCalloutIndex), callouts.length - 1);
    const calloutText = callouts[selectedCalloutIndex];

    // Better splitting that handles variations in newlines and multiple newlines
    const paragraphs = content.trim().split(/\n\n+/);

    // Ensure paragraphIndex is within bounds
    const targetParagraphIndex = Math.min(Math.max(0, placement.paragraphIndex), paragraphs.length - 1);

    return (
        <div className="space-y-0">
            {paragraphs.map((paragraphsText, idx) => (
                <div key={idx}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {paragraphsText}
                    </ReactMarkdown>

                    {idx === targetParagraphIndex && (
                        <div className="my-12 p-1 bg-black group relative overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] not-prose">
                            <Link
                                href={`/lp/${landingPage.slug}`}
                                className="block bg-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 no-underline"
                            >
                                <div className="space-y-4 flex-grow text-start">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-black/30">
                                        <Sparkles className="w-3 h-3" /> Protocol Inbound
                                    </div>
                                    <p className="text-xl md:text-2xl font-black uppercase tracking-tight leading-none text-black m-0">
                                        {calloutText}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 bg-black text-white px-6 h-12 text-[10px] font-black uppercase tracking-widest whitespace-nowrap group-hover:bg-white group-hover:text-black group-hover:ring-1 group-hover:ring-black transition-all">
                                    Initialize Protocol <ArrowRight className="w-3.5 h-3.5" />
                                </div>
                            </Link>
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/20" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/20" />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
