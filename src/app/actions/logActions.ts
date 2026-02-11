'use server';

import { detectAndLogBot } from '@/services/botService';

export async function logVisitAction(userAgent: string, pagePath: string, ip: string) {
    return await detectAndLogBot(userAgent, pagePath, ip);
}
