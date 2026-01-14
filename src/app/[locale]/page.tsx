import { useTranslations } from 'next-intl';
import { PostList } from '@/components/blog/PostList';

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
