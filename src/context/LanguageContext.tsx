'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LanguageContextType {
    translations: Record<string, string>; // locale -> slug
    setTranslations: (translations: Record<string, string>) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [translations, setTranslations] = useState<Record<string, string>>({});

    return (
        <LanguageContext.Provider value={{ translations, setTranslations }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
