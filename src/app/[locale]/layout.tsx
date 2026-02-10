import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Providers } from '@/providers/Providers';
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from 'next/headers';
import { detectAndLogBot } from '@/services/botService';
import Script from 'next/script';
import "../globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

import { Navbar } from '@/components/layout/Navbar';
import { AriaHiddenCleanup } from '@/components/layout/AriaHiddenCleanup';

export default async function LocaleLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // Server-side bot detection
    const headerList = await headers();
    const userAgent = headerList.get('user-agent') || '';
    const ip = headerList.get('x-forwarded-for')?.split(',')[0] || '';

    // Non-blocking log
    detectAndLogBot(userAgent, `/${locale}`, ip).catch(console.error);

    // Ensure that the incoming `locale` is valid
    if (!routing.locales.includes(locale as any)) {
        notFound();
    }

    // Providing all messages to the client
    // side is the easiest way to get started
    const messages = await getMessages();

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                <meta name="google-adsense-account" content="ca-pub-7171708184619536" />
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <AriaHiddenCleanup />
                <Script
                    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7171708184619536"
                    crossOrigin="anonymous"
                    strategy="lazyOnload"
                />
                {/* Google Analytics */}
                <Script
                    src="https://www.googletagmanager.com/gtag/js?id=G-PGX6QCE0TP"
                    strategy="afterInteractive"
                />
                <Script id="google-analytics" strategy="afterInteractive">
                    {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());

                        gtag('config', 'G-PGX6QCE0TP');
                    `}
                </Script>

                <NextIntlClientProvider messages={messages}>
                    <Providers>
                        <div className="flex flex-col min-h-screen">
                            <Navbar />
                            <div className="flex-grow">
                                {children}
                            </div>
                        </div>
                    </Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
