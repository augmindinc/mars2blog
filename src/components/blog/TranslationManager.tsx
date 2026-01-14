'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

interface TranslationManagerProps {
    translations: Record<string, string>;
}

export function TranslationManager({ translations }: TranslationManagerProps) {
    const { setTranslations } = useLanguage();

    useEffect(() => {
        setTranslations(translations);
        return () => setTranslations({});
    }, [translations, setTranslations]);

    return null;
}
