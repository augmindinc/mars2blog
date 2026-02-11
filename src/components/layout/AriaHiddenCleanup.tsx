'use client';

import { useEffect } from 'react';

/**
 * AdSense Vignette (interstitial) ads can sometimes add aria-hidden="true" 
 * to the body element but fail to remove it if interrupted or blocked.
 * This component ensures the accessibility tree remains visible.
 */
export function AriaHiddenCleanup() {
    useEffect(() => {
        // 1. Initial Cleanup
        if (document.body.getAttribute('aria-hidden') === 'true') {
            document.body.removeAttribute('aria-hidden');
        }

        // 2. MutationObserver safeguard
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === 'attributes' &&
                    mutation.attributeName === 'aria-hidden' &&
                    document.body.getAttribute('aria-hidden') === 'true'
                ) {
                    document.body.removeAttribute('aria-hidden');
                }
            });
        });

        observer.observe(document.body, { attributes: true });

        return () => {
            observer.disconnect();
        };
    }, []);

    return null;
}
