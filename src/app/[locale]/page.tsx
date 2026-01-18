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
                <header className="mb-12 text-center">
                    <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
                    <p className="text-xl text-muted-foreground">{t('welcome')}</p>
                </header>

                <PostList />
            </div>
        </main>
    );
}
