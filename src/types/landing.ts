import { Timestamp } from 'firebase/firestore';

export type LandingPageType = 'consulting' | 'app_install' | 'lead_magnet' | 'product_sale';

export interface LandingPage {
    id: string;
    title: string;
    slug: string;
    type: LandingPageType;
    status: 'active' | 'inactive';
    templateId: string;
    content: LandingPageSection[];
    formConfig?: LandingPageFormConfig;
    seo: {
        title: string;
        description: string;
    };
    stats: {
        views: number;
        conversions: number;
    };
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface LandingPageSection {
    id: string;
    type: string; // 'hero', 'features', 'testimonial', 'faq', 'cta_form', etc.
    content: any; // Dynamic content based on type
    order: number;
}

export interface LandingPageFormConfig {
    fields: LandingPageFormField[];
    submitButtonText: string;
    postSubmitAction: 'message' | 'redirect';
    postSubmitValue: string; // Message string or redirect URL
}

export interface LandingPageFormField {
    id: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
    placeholder?: string;
    required: boolean;
    options?: string[]; // For select type
}

export interface LandingPageSubmission {
    id: string;
    pageId: string;
    data: Record<string, any>;
    createdAt: Timestamp;
}

export interface LandingPageTemplate {
    id: string;
    name: string;
    description: string;
    type: LandingPageType | 'all';
    industry: string[];
    thumbnailUrl: string;
    sections: LandingPageSection[];
}
