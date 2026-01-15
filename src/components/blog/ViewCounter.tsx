'use client';

import { useEffect } from 'react';
import { incrementViewCount } from '@/services/blogService';

interface ViewCounterProps {
    postId: string;
}

export function ViewCounter({ postId }: ViewCounterProps) {
    useEffect(() => {
        if (postId) {
            const viewedPosts = sessionStorage.getItem('viewed_posts');
            const viewedArray = viewedPosts ? JSON.parse(viewedPosts) : [];

            if (!viewedArray.includes(postId)) {
                incrementViewCount(postId);
                viewedArray.push(postId);
                sessionStorage.setItem('viewed_posts', JSON.stringify(viewedArray));
            }
        }
    }, [postId]);

    return null;
}
