import { supabase } from '@/lib/supabase';
import { BotLog } from '@/types/blog';

const TABLE_NAME = 'bot_logs';

const BOT_MAP = [
    { pattern: /googlebot/i, name: 'Googlebot', company: 'Google' },
    { pattern: /adsbot-google/i, name: 'AdsBot-Google', company: 'Google' },
    { pattern: /mediapartners-google/i, name: 'Google AdSense', company: 'Google' },
    { pattern: /bingbot/i, name: 'Bingbot', company: 'Microsoft' },
    { pattern: /yandexbot/i, name: 'YandexBot', company: 'Yandex' },
    { pattern: /naverbot|yeti/i, name: 'Naverbot', company: 'Naver' },
    { pattern: /daumua|daum/i, name: 'Daumoa', company: 'Kakao' },
    { pattern: /duckduckbot/i, name: 'DuckDuckBot', company: 'DuckDuckGo' },
    { pattern: /baiduspider/i, name: 'Baiduspider', company: 'Baidu' },
    { pattern: /slurp/i, name: 'Yahoo! Slurp', company: 'Yahoo' },
    { pattern: /ia_archiver/i, name: 'Alexa/Internet Archive', company: 'Alexa/Internet Archive' },
    { pattern: /facebookexternalhit|facebot/i, name: 'FacebookBot', company: 'Meta' },
    { pattern: /twitterbot/i, name: 'Twitterbot', company: 'X (Twitter)' },
    { pattern: /linkedinbot/i, name: 'LinkedInBot', company: 'LinkedIn' },
    { pattern: /discordbot/i, name: 'Discordbot', company: 'Discord' },
    { pattern: /telegrambot/i, name: 'TelegramBot', company: 'Telegram' },
    { pattern: /applebot/i, name: 'Applebot', company: 'Apple' },
    { pattern: /petalbot/i, name: 'PetalBot', company: 'Huawei' },
    { pattern: /dotbot/i, name: 'DotBot', company: 'Moz' },
    { pattern: /semrushbot/i, name: 'SemrushBot', company: 'Semrush' },
    { pattern: /ahrefsbot/i, name: 'AhrefsBot', company: 'Ahrefs' },
    { pattern: /mj12bot/i, name: 'MJ12bot', company: 'Majestic' },
];

export const detectAndLogBot = async (userAgent: string, pagePath: string, ip?: string) => {
    const bot = BOT_MAP.find(b => b.pattern.test(userAgent));

    if (bot) {
        try {
            const { error } = await supabase
                .from(TABLE_NAME)
                .insert([{
                    bot_name: bot.name,
                    bot_company: bot.company,
                    page_path: pagePath,
                    user_agent: userAgent,
                    ip: ip || 'unknown',
                    created_at: new Date().toISOString(),
                }]);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error("Error logging bot visit:", error);
        }
    }
    return false;
};

export const getBotLogs = async (max: number = 100): Promise<BotLog[]> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(max);

        if (error) throw error;
        return (data || []).map(d => ({
            ...d,
            botName: d.bot_name,
            botCompany: d.bot_company,
            pagePath: d.page_path,
            userAgent: d.user_agent,
            createdAt: d.created_at
        })) as BotLog[];
    } catch (error) {
        console.error("Error fetching bot logs:", error);
        return [];
    }
};
