'use client';

import { useEffect } from 'react';

/**
 * AdSense Vignette (interstitial) ads can sometimes add aria-hidden="true" 
 * to the body element but fail to remove it if interrupted or blocked.
 * This component ensures the accessibility tree remains visible.
 */
export function AriaHiddenCleanup() {
    useEffect(() => {
        // Initial check
        if (document.body.getAttribute('aria-hidden') === 'true') {
            document.body.removeAttribute('aria-hidden');
        }

        // Periodic check every few seconds as a safety net
        const interval = setInterval(() => {
            if (document.body.getAttribute('aria-hidden') === 'true') {
                // If there's no visible AdSense overlay but aria-hidden is true, remove it
                const adsenseOverlay = document.querySelector('ins.adsbygoogle[data-vignette-loaded="true"]');
                if (!adsenseOverlay) {
                    document.body.removeAttribute('aria-hidden');
                }
            }
        }, 3000);

        // MutationObserver to catch it in real-time
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === 'attributes' &&
                    mutation.attributeName === 'aria-hidden' &&
                    document.body.getAttribute('aria-hidden') === 'true'
                ) {
                    // Slight delay to allow AdSense to actually show the ad if it's currently working
                    setTimeout(() => {
                        const adsenseOverlay = document.querySelector('ins.adsbygoogle[data-vignette-loaded="true"]');
                        const vignetteActive = document.body.classList.contains('google-vignette-active');

                        if (!adsenseOverlay && !vignetteActive) {
                            document.body.removeAttribute('aria-hidden');
                            console.log('Accessibility Safeguard: Removed stuck aria-hidden from body');
                        }
                    }, 1000);
                }
            });
        });

        observer.observe(document.body, { attributes: true });

        return () => {
            clearInterval(interval);
            observer.disconnect();
        };
    }, []);

    return null;
}
