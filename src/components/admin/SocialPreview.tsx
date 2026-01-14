import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Share2, Twitter } from 'lucide-react';

interface SocialPreviewProps {
    title: string;
    description: string;
    thumbnailUrl?: string;
    siteName?: string;
    locale?: string;
}

export function SocialPreview({ title, description, thumbnailUrl, siteName = 'Mars2Blog', locale = 'ko' }: SocialPreviewProps) {
    const displayTitle = title || 'Post Title Placeholder';
    const displayDescription = description || 'This is how your post description will appear in search results and social media shares. Make it compelling!';
    const baseUrl = 'mars.it.kr';
    const previewUrl = `${baseUrl}/${locale}/blog/example-slug`;

    return (
        <div className="space-y-6">
            {/* Google Search Preview */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                    <Globe className="w-4 h-4" />
                    Google Search Preview
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm max-w-[600px] font-sans">
                    <div className="text-[14px] text-[#202124] mb-1 truncate">{baseUrl} › blog › ...</div>
                    <div className="text-[20px] text-[#1a0dab] hover:underline cursor-pointer leading-tight mb-1 truncate">
                        {displayTitle}
                    </div>
                    <div className="text-[14px] text-[#4d5156] line-clamp-2 leading-relaxed">
                        {displayDescription}
                    </div>
                </div>
            </div>

            {/* Facebook / Open Graph Preview */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                    <Share2 className="w-4 h-4" />
                    Open Graph (Facebook / LinkedIn)
                </div>
                <div className="bg-[#f2f3f5] rounded-xl border shadow-sm overflow-hidden max-w-[500px] font-sans">
                    <div className="aspect-[1.91/1] bg-muted relative overflow-hidden flex items-center justify-center">
                        {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt="social-preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-muted-foreground text-xs uppercase font-bold tracking-widest">Image Thumbnail</div>
                        )}
                    </div>
                    <div className="p-3 bg-white border-t">
                        <div className="text-[12px] text-[#606770] uppercase mb-1">{baseUrl.toUpperCase()}</div>
                        <div className="text-[16px] font-bold text-[#1c1e21] leading-tight mb-1 line-clamp-2">
                            {displayTitle}
                        </div>
                        <div className="text-[14px] text-[#606770] line-clamp-1 leading-snug">
                            {displayDescription}
                        </div>
                    </div>
                </div>
            </div>

            {/* Twitter Card Preview */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                    <Twitter className="w-4 h-4" />
                    Twitter Card
                </div>
                <div className="rounded-2xl border shadow-sm overflow-hidden max-w-[500px] font-sans bg-white">
                    <div className="aspect-[1.91/1] bg-muted relative overflow-hidden flex items-center justify-center">
                        {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt="twitter-preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-muted-foreground text-xs uppercase font-bold tracking-widest">Image Thumbnail</div>
                        )}
                    </div>
                    <div className="p-3">
                        <div className="text-[14px] text-muted-foreground mb-1">{baseUrl}</div>
                        <div className="text-[15px] font-bold text-black leading-tight mb-1 line-clamp-1">
                            {displayTitle}
                        </div>
                        <div className="text-[14px] text-[#536471] line-clamp-2 leading-snug">
                            {displayDescription}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
