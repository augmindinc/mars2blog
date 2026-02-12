'use client';

import { useState, useEffect, ReactNode } from 'react';

interface HydrationStabilizerProps {
    children: ReactNode;
    className?: string;
}

/**
 * A component that helps stabilize hydration issues caused by third-party scripts (AdSense, etc.)
 * that modify the DOM before React can hydrate.
 */
export function HydrationStabilizer({ children, className }: HydrationStabilizerProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <div
            className={className}
            suppressHydrationWarning
        >
            {/* 
                On the first render (matching server), we render children normally.
                If AdSense modifies them before hydration, suppressHydrationWarning on this div
                should help React stay stable.
            */}
            {children}
        </div>
    );
}
