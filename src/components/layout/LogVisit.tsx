'use client';

import { useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';

interface LogVisitProps {
    userAgent: string;
    ip: string;
}

/**
 * LogVisit Component
 * Performs bot detection and logging from the client side 
 * to ensure that server-side streaming is not interrupted by Firestore writes.
 */
export function LogVisit({ userAgent, ip }: LogVisitProps) {
    const params = useParams();
    const pathname = usePathname();

    useEffect(() => {
        // We trigger the log via a dedicated log action or API
        // For now, we can use a small delay or requestIdleCallback to be non-intrusive
        const triggerLog = async () => {
            try {
                // Use a dynamic import or a dedicated server action to keep client bundle small
                const { logVisitAction } = await import('@/app/actions/logActions');
                await logVisitAction(userAgent, pathname, ip);
            } catch (error) {
                // Silently fail as this is non-critical telemetry
                console.error('Visit logging failed:', error);
            }
        };

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            (window as any).requestIdleCallback(() => triggerLog());
        } else {
            setTimeout(triggerLog, 2000);
        }
    }, [userAgent, ip, pathname]);

    return null;
}
