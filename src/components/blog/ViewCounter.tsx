'use client';

import { useEffect } from 'react';
import { incrementViewCount } from '@/services/blogService';

interface ViewCounterProps {
    postId: string;
}

export function ViewCounter({ postId }: ViewCounterProps) {
    useEffect(() => {
        if (postId) {
            incrementViewCount(postId);
        }
    }, [postId]);

    return null; // This component doesn't render anything
}
