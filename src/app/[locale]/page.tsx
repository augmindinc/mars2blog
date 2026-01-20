import { useTranslations } from 'next-intl';
import { PostList } from '@/components/blog/PostList';
import { Metadata } from 'next';

interface HomePageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
    const { locale } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mars.it.kr';

    return {
        alternates: {
            canonical: `${baseUrl}/${locale}`,
            languages: {
                'ko': `${baseUrl}/ko`,
                'en': `${baseUrl}/en`,
                'ja': `${baseUrl}/ja`,
                'zh': `${baseUrl}/zh`,
                'x-default': `${baseUrl}/`,
            },
        },
    };
}

export default function HomePage() {
    const t = useTranslations('HomePage');

    return (
        <main className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <header className="mb-16 text-center">
                    <h1 className="text-2xl font-black mb-4 uppercase tracking-tighter">
                        {t('title')}
                    </h1>
                    <div className="flex justify-center">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-t border-black/10 pt-4 px-8">
                            {t('welcome')}
                        </p>
                    </div>
                </header>

                <PostList />
            </div>
        </main>
    );
}
