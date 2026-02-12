'use client';

import { useEffect } from 'react';
import { incrementViewCount } from '@/services/blogService';
import { logInflow } from '@/services/inflowService';
// Firebase dependency removed.

interface ViewCounterProps {
    postId: string;
    postTitle: string;
}

export function ViewCounter({ postId, postTitle }: ViewCounterProps) {
    useEffect(() => {
        if (postId) {
            const viewedPosts = sessionStorage.getItem('viewed_posts');
            const viewedArray = viewedPosts ? JSON.parse(viewedPosts) : [];

            if (!viewedArray.includes(postId)) {
                // 1. 조회수 증가
                incrementViewCount(postId);

                // 2. 유입 로그 기록
                let referrer = document.referrer || 'Direct / Bookmark';
                let domain = 'Direct';
                let keyword = null;

                // URL에서 내부 추천 정보 추출
                try {
                    const urlParams = new URLSearchParams(window.location.search);
                    const internalFromTitle = urlParams.get('from_title');

                    if (internalFromTitle) {
                        referrer = `Related Post: ${internalFromTitle}`;
                        domain = window.location.hostname;
                    } else if (document.referrer) {
                        const refUrl = new URL(document.referrer);
                        domain = refUrl.hostname;

                        // 간단한 검색어 추출
                        const searchParams = refUrl.searchParams;
                        keyword = searchParams.get('query') || searchParams.get('q');
                    }
                } catch (e) {
                    console.error("Referrer/Params parsing failed", e);
                }

                logInflow({
                    postId,
                    postTitle,
                    referrer,
                    referrerDomain: domain,
                    searchKeyword: keyword,
                    userAgent: navigator.userAgent,
                    createdAt: new Date().toISOString(),
                });

                viewedArray.push(postId);
                sessionStorage.setItem('viewed_posts', JSON.stringify(viewedArray));
            }
        }
    }, [postId, postTitle]);

    return null;
}
