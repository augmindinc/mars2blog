'use client';

import { useEffect } from 'react';
import { incrementViewCount } from '@/services/blogService';
import { logInflow } from '@/services/inflowService';
import { Timestamp } from 'firebase/firestore';

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
                const referrer = document.referrer || 'Direct / Bookmark';
                let domain = 'Direct';
                let keyword = null;

                try {
                    if (document.referrer) {
                        const url = new URL(document.referrer);
                        domain = url.hostname;

                        // 간단한 검색어 추출 (Naver: query, Google: q, Daum: q)
                        const searchParams = url.searchParams;
                        keyword = searchParams.get('query') || searchParams.get('q');
                    }
                } catch (e) {
                    console.error("Referrer parsing failed", e);
                }

                logInflow({
                    postId,
                    postTitle,
                    referrer,
                    referrerDomain: domain,
                    searchKeyword: keyword,
                    userAgent: navigator.userAgent,
                    createdAt: Timestamp.now(),
                });

                viewedArray.push(postId);
                sessionStorage.setItem('viewed_posts', JSON.stringify(viewedArray));
            }
        }
    }, [postId, postTitle]);

    return null;
}
