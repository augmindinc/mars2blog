import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

export default async function LpRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    // Default to the default locale
    redirect(`/${routing.defaultLocale}/lp/${slug}`);
}
