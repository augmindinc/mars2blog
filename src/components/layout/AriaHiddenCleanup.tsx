'use client';

import { useEffect } from 'react';

/**
 * AdSense Vignette (interstitial) ads can sometimes add aria-hidden="true" 
 * to the body element but fail to remove it if interrupted or blocked.
 * This component ensures the accessibility tree remains visible.
 */
export function AriaHiddenCleanup() {
    useEffect(() => {
        // 1. Proactive Interception: Override setAttribute to ignore aria-hidden="true" on body
        const originalSetAttribute = document.body.setAttribute;

        document.body.setAttribute = function (name: string, value: string) {
            if (name === 'aria-hidden' && value === 'true') {
                // Ignore attempt to hide the body from screen readers
                return;
            }
            return originalSetAttribute.apply(this, [name, value]);
        };

        // 2. Initial Cleanup
        if (document.body.getAttribute('aria-hidden') === 'true') {
            document.body.removeAttribute('aria-hidden');
        }

        // 3. MutationObserver as a secondary safeguard
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
            // Restore original setAttribute behavior on unmount
            document.body.setAttribute = originalSetAttribute;
            observer.disconnect();
        };
    }, []);

    return null;
}
