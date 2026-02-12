'use client';

import { useEffect } from 'react';
import { incrementPageView } from '@/services/landingService';
import { logInflow } from '@/services/inflowService';
// Firebase dependency removed.

interface LandingViewCounterProps {
    pageId: string;
    pageTitle: string;
}

export function LandingViewCounter({ pageId, pageTitle }: LandingViewCounterProps) {
    useEffect(() => {
        if (pageId) {
            const viewedLandings = sessionStorage.getItem('viewed_landings');
            const viewedArray = viewedLandings ? JSON.parse(viewedLandings) : [];

            if (!viewedArray.includes(pageId)) {
                // 1. 조회수 증가
                incrementPageView(pageId);

                // 2. 유입 로그 기록
                let referrer = document.referrer || 'Direct / Bookmark';
                let domain = 'Direct';
                let keyword = null;

                try {
                    if (document.referrer) {
                        const refUrl = new URL(document.referrer);
                        domain = refUrl.hostname;

                        const searchParams = refUrl.searchParams;
                        keyword = searchParams.get('query') || searchParams.get('q');
                    }
                } catch (e) {
                    console.error("Referrer parsing failed", e);
                }

                logInflow({
                    postId: pageId, // Using postId field for pageId to reuse inflow tracking
                    postTitle: `[LP] ${pageTitle}`,
                    referrer,
                    referrerDomain: domain,
                    searchKeyword: keyword,
                    userAgent: navigator.userAgent,
                    createdAt: new Date().toISOString(),
                });

                viewedArray.push(pageId);
                sessionStorage.setItem('viewed_landings', JSON.stringify(viewedArray));
            }
        }
    }, [pageId, pageTitle]);

    return null;
}
