'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getLandingPageBySlug, createSubmission, incrementPageView } from '@/services/landingService';
import { LandingPage } from '@/types/landing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, X } from 'lucide-react';
import { LandingViewCounter } from '@/components/landing/LandingViewCounter';

export default function LandingViewPage() {
    const params = useParams();
    const slug = params.slug as string;
    const locale = params.locale as string;
    const [page, setPage] = useState<LandingPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [modalUrl, setModalUrl] = useState<string | null>(null);

    const scrollToCta = () => {
        const element = document.getElementById('cta_form');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        const loadPage = async () => {
            try {
                const data = await getLandingPageBySlug(slug, locale);
                if (data) {
                    setPage(data);
                }
            } catch (error) {
                console.error('Failed to load landing page:', error);
            } finally {
                setLoading(false);
            }
        };
        if (slug) loadPage();
    }, [slug]);

    const validateForm = (fields: any[]) => {
        const newErrors: Record<string, string> = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        fields.forEach(field => {
            const value = formData[field.id];

            if (field.required) {
                if (!value || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0)) {
                    newErrors[field.id] = 'THIS FIELD IS REQUIRED';
                }
            }

            if (field.type === 'email' && value && !emailRegex.test(value)) {
                newErrors[field.id] = 'INVALID EMAIL FORMAT';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (sectionContent: any) => {
        if (!validateForm(sectionContent.fields)) return;
        if (!page) return;

        setIsSubmitting(true);
        try {
            await createSubmission({
                pageId: page.id,
                data: formData,
                createdAt: new Date().toISOString()
            });

            setIsSubmitted(true);
            setFormData({});

            // Handle redirect if configured
            if (page.formConfig?.postSubmitAction === 'redirect' && page.formConfig.postSubmitValue) {
                setTimeout(() => {
                    window.location.href = page.formConfig!.postSubmitValue;
                }, 2000);
            }
        } catch (error) {
            console.error(error);
            alert('SUBMISSION FAILED. RE-INITIALIZE ATTEMPT.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Initializing Matrix...</div>
            </div>
        );
    }

    if (!page) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-12 text-center">
                <div className="space-y-4">
                    <h1 className="text-4xl font-black uppercase tracking-tighter">404 / Protocol Error</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">The requested landing sequence does not exist in our database.</p>
                </div>
            </div>
        );
    }

    if (page.status !== 'published') {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-12 text-center space-y-6">
                <div className="w-12 h-1 bg-black/10" />
                <div className="space-y-2">
                    <h1 className="text-2xl font-black uppercase tracking-tighter">Secure Protocol Active</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">This landing sequence is currently in draft mode.</p>
                </div>
                <div className="w-12 h-1 bg-black/10" />
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-12 text-center space-y-10 animate-in fade-in zoom-in duration-500">
                <div className="relative">
                    <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-150 animate-pulse" />
                    <CheckCircle2 className="w-24 h-24 text-white relative z-10" strokeWidth={1} />
                </div>
                <div className="space-y-4 relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                        Protocol Success
                    </h2>
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] text-white/40 max-w-sm mx-auto leading-relaxed">
                        Your data has been securely synchronized with our architecture.
                        A synchronization specialist will initiate contact shortly.
                    </p>
                </div>
                <div className="pt-8">
                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="border-white/20 text-white rounded-none px-12 h-14 font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                    >
                        Return to Origin
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col selection:bg-black selection:text-white overflow-x-hidden">
            <LandingViewCounter pageId={page.id} pageTitle={page.title} />
            {page.content?.map((section) => (
                <div key={section.id} className="relative w-full">
                    {/* HERO SECTION */}
                    {section.type === 'hero' && (
                        <div className="py-20 md:py-32 px-6 md:px-12 text-center border-b border-black/5 bg-white space-y-8 overflow-hidden">
                            {section.content.badge && (
                                <span className="inline-block px-4 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em]">
                                    {section.content.badge}
                                </span>
                            )}
                            <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] max-w-4xl mx-auto break-words">
                                {section.content.title}
                            </h1>
                            <p className="max-w-2xl mx-auto text-xs md:text-base font-medium text-muted-foreground uppercase tracking-tight leading-relaxed break-words">
                                {section.content.subtitle}
                            </p>
                            <div className="pt-6">
                                <Button
                                    onClick={scrollToCta}
                                    className="bg-black text-white rounded-none px-12 h-14 font-black text-xs uppercase tracking-[0.2em] shadow-none hover:bg-black/90 transition-all cursor-pointer"
                                >
                                    {section.content.buttonText}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* PROBLEM SECTION */}
                    {section.type === 'problem' && (
                        <div className="py-20 md:py-32 px-6 md:px-12 border-b border-black/5 bg-black text-white space-y-16 overflow-hidden">
                            <div className="space-y-6 text-center md:text-left max-w-2xl">
                                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter break-words leading-tight">
                                    {section.content.title}
                                </h2>
                                <p className="text-[10px] md:text-sm font-medium text-white/40 uppercase tracking-[0.1em] break-words leading-relaxed">
                                    {section.content.subtitle}
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 w-full">
                                {section.content.points?.map((p: string, i: number) => (
                                    <div key={i} className="flex flex-col gap-4 border-l border-white/20 pl-8 py-4 text-left w-full min-w-0 group hover:border-white transition-colors">
                                        <span className="text-[9px] font-black tabular-nums opacity-30 tracking-[0.3em]">
                                            BLOCK 0{i + 1}
                                        </span>
                                        <span className="text-sm md:text-lg font-bold uppercase tracking-normal break-all leading-normal flex-1">
                                            {p}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SOLUTION SECTION */}
                    {section.type === 'solution' && (
                        <div className="py-20 md:py-32 px-6 md:px-12 border-b border-black/5 bg-white text-center space-y-20 overflow-hidden">
                            <div className="space-y-6">
                                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter break-words">
                                    {section.content.title}
                                </h2>
                                <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] break-words">
                                    {section.content.subtitle}
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 w-full max-w-6xl mx-auto">
                                {section.content.items?.map((item: any, i: number) => (
                                    <div key={i} className="p-10 md:p-16 border border-black/5 bg-black/[0.01] w-full min-w-0 flex flex-col items-center text-center space-y-6 hover:bg-black/[0.02] transition-colors">
                                        <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter break-words text-black">
                                            {item.title}
                                        </h3>
                                        <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-tight break-words font-medium leading-relaxed max-w-sm">
                                            {item.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* FEATURES SECTION */}
                    {section.type === 'features' && (
                        <div className="py-20 md:py-32 px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 border-b border-black/5 bg-white max-w-7xl mx-auto">
                            {section.content.items?.map((item: any, i: number) => (
                                <div key={i} className="space-y-6 group">
                                    <div className="text-[10px] font-black text-black border-l-4 border-black pl-4 uppercase tracking-[0.2em]">
                                        MODULE 0{i + 1}
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none break-words">
                                        {item.title}
                                    </h3>
                                    <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-tight leading-relaxed break-words">
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* PROCESS SECTION */}
                    {section.type === 'process' && (
                        <div className="py-20 md:py-32 px-6 md:px-12 border-b border-black/5 bg-black/[0.02] overflow-hidden">
                            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-20 text-center break-words">
                                {section.content.title}
                            </h2>
                            <div className="flex flex-col md:flex-row gap-12 md:gap-6 w-full max-w-7xl mx-auto">
                                {section.content.steps?.map((step: any, i: number) => (
                                    <div key={i} className="flex-1 bg-white border border-black/5 p-10 md:p-12 relative min-w-0 group hover:border-black transition-colors">
                                        <span className="absolute -top-4 -left-4 w-10 h-10 bg-black text-white flex items-center justify-center text-[10px] font-black z-10 tracking-widest">
                                            0{i + 1}
                                        </span>
                                        <h3 className="text-sm md:text-base font-black uppercase tracking-[0.1em] mb-4 break-words">
                                            {step.title}
                                        </h3>
                                        <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold tracking-tight break-words leading-relaxed">
                                            {step.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SOCIAL PROOF / TESTIMONIALS */}
                    {section.type === 'social_proof' && (
                        <div className="py-20 md:py-32 px-6 md:px-12 border-b border-black/5 bg-white space-y-24 overflow-hidden">
                            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-30 grayscale contrast-125">
                                {section.content.logos?.filter((l: string) => l !== '').map((l: string, i: number) => (
                                    <span key={`${l}-${i}`} className="text-2xl md:text-4xl font-black tracking-tighter italic whitespace-nowrap">
                                        {l}
                                    </span>
                                ))}
                            </div>
                            <div className="max-w-4xl mx-auto space-y-20">
                                {section.content.testimonials?.map((t: any, idx: number) => (
                                    <div key={idx} className={`text-center italic ${idx !== 0 ? 'pt-20 border-t border-black/5' : ''}`}>
                                        <p className="text-xl md:text-3xl font-medium uppercase tracking-tight mb-8 leading-[1.1] text-black">
                                            "{t.text}"
                                        </p>
                                        <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] flex flex-col md:flex-row items-center justify-center gap-2">
                                            <span className="text-black">{t.author}</span>
                                            <span className="hidden md:inline text-black/20">/</span>
                                            <span className="text-muted-foreground">{t.role}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PRICING SECTION */}
                    {section.type === 'pricing' && (
                        <div className="py-20 md:py-32 px-6 md:px-12 border-b border-black/5 bg-white space-y-20 overflow-hidden max-w-7xl mx-auto">
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-center break-words">
                                {section.content.title}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {section.content.plans?.map((plan: any, i: number) => (
                                    <div key={i} className={`p-10 md:p-12 border transition-all ${plan.recommended ? 'border-black bg-black text-white scale-105 z-10' : 'border-black/10 bg-white hover:border-black'}`}>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-60">
                                            {plan.name}
                                        </h3>
                                        <div className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-10">
                                            {plan.price}
                                        </div>
                                        <div className="space-y-4 mb-14">
                                            {plan.features.filter((f: string) => f !== '').map((f: string, idx: number) => (
                                                <div key={`${f}-${idx}`} className="text-[11px] font-bold uppercase tracking-tight flex items-start gap-3">
                                                    <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${plan.recommended ? 'text-white' : 'text-black'}`} />
                                                    <span className="flex-1 leading-none">{f}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <Button className={`w-full rounded-none h-14 font-black text-xs uppercase tracking-[0.2em] transition-colors ${plan.recommended ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'}`}>
                                            SELECT PROTOCOL
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* FAQ SECTION */}
                    {section.type === 'faq' && (
                        <div className="py-20 md:py-32 px-6 md:px-12 border-b border-black/5 bg-black/[0.01] space-y-16 overflow-hidden max-w-4xl mx-auto">
                            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter break-words">
                                {section.content.title}
                            </h2>
                            <div className="grid grid-cols-1 gap-6 md:gap-8">
                                {section.content.items?.map((item: any, i: number) => (
                                    <div key={i} className="p-8 md:p-10 border-b border-black/5 bg-white space-y-4 group hover:border-black transition-colors">
                                        <h3 className="text-xs md:text-base font-black uppercase tracking-[0.1em] leading-tight flex gap-4">
                                            <span className="opacity-20">Q /</span>
                                            <span className="flex-1">{item.q}</span>
                                        </h3>
                                        <p className="text-[10px] md:text-sm font-medium text-muted-foreground uppercase tracking-tight break-words leading-relaxed pl-10">
                                            {item.a}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* CTA FORM SECTION */}
                    {section.type === 'cta_form' && (
                        <div id="cta_form" className="py-24 md:py-40 px-6 md:px-12 text-center bg-black text-white space-y-16 overflow-hidden scroll-mt-20">
                            <div className="space-y-6">
                                <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] break-words">
                                    {section.content.title}
                                </h2>
                                <p className="text-[10px] md:text-sm font-bold text-white/40 uppercase tracking-[0.3em] break-words">
                                    {section.content.subtitle}
                                </p>
                            </div>
                            <div className="max-w-xl mx-auto space-y-8 text-left">
                                {section.content.fields?.map((field: any, idx: number) => (
                                    <div key={field.id || idx} className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <label className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">
                                                {field.label} {field.required && '*'}
                                            </label>
                                            {errors[field.id] && (
                                                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest animate-pulse">
                                                    {errors[field.id]}
                                                </span>
                                            )}
                                        </div>

                                        {(field.type === 'text' || field.type === 'email') && (
                                            <Input
                                                value={formData[field.id] || ''}
                                                onChange={e => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                className={`bg-transparent border-white/20 text-white rounded-none h-14 text-xs font-bold uppercase tracking-widest placeholder:text-white/10 focus-visible:ring-0 focus-visible:border-white transition-colors ${errors[field.id] ? 'border-red-500/50' : ''}`}
                                                placeholder={field.placeholder}
                                            />
                                        )}

                                        {field.type === 'select' && (
                                            <select
                                                value={formData[field.id] || ''}
                                                onChange={e => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                className={`w-full bg-transparent border border-white/20 text-white rounded-none h-14 text-xs font-bold uppercase tracking-widest px-4 focus:outline-none focus:border-white transition-colors cursor-pointer appearance-none ${errors[field.id] ? 'border-red-500/50' : ''}`}
                                            >
                                                <option value="" disabled className="bg-black text-white/40">{field.placeholder || 'CHOOSE OPTION'}</option>
                                                {field.options?.map((opt: string, i: number) => (
                                                    <option key={`${opt}-${i}`} value={opt} className="bg-black text-white">
                                                        {opt}
                                                    </option>
                                                ))}
                                            </select>
                                        )}

                                        {(field.type === 'radio_group' || field.type === 'checkbox_group') && (
                                            <div className="flex flex-wrap gap-6 pt-2">
                                                {field.options?.map((opt: string, i: number) => {
                                                    const isChecked = field.type === 'radio_group'
                                                        ? formData[field.id] === opt
                                                        : (formData[field.id] || []).includes(opt);

                                                    return (
                                                        <label key={`${opt}-${i}`} className="flex items-center gap-3 cursor-pointer group">
                                                            <div
                                                                onClick={() => {
                                                                    if (field.type === 'radio_group') {
                                                                        setFormData(prev => ({ ...prev, [field.id]: opt }));
                                                                    } else {
                                                                        const current = formData[field.id] || [];
                                                                        const next = current.includes(opt)
                                                                            ? current.filter((c: string) => c !== opt)
                                                                            : [...current, opt];
                                                                        setFormData(prev => ({ ...prev, [field.id]: next }));
                                                                    }
                                                                }}
                                                                className={`w-5 h-5 border flex items-center justify-center transition-all ${isChecked ? 'border-white bg-white text-black' : 'border-white/20 group-hover:border-white'} ${field.type === 'radio_group' ? 'rounded-full' : 'rounded-none'}`}
                                                            >
                                                                {isChecked && <div className={`w-2 h-2 bg-black ${field.type === 'radio_group' ? 'rounded-full' : 'rounded-none'}`} />}
                                                            </div>
                                                            <span className={`text-[11px] font-bold transition-colors tracking-tight ${isChecked ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                                                                {opt}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {field.type === 'consent' && (
                                            <div className="flex items-start gap-4 pt-4 pb-6">
                                                <div
                                                    onClick={() => setFormData(prev => ({ ...prev, [field.id]: !formData[field.id] }))}
                                                    className={`w-5 h-5 border mt-0.5 flex items-center justify-center transition-all cursor-pointer shrink-0 ${formData[field.id] ? 'border-white bg-white' : 'border-white/20 group-hover:border-white'}`}
                                                >
                                                    {formData[field.id] && <CheckCircle2 className="w-4 h-4 text-black" />}
                                                </div>
                                                <div className="text-[10px] font-bold leading-relaxed transition-colors uppercase tracking-tight">
                                                    <span className={formData[field.id] ? 'text-white' : 'text-white/40'}>
                                                        {field.label}
                                                    </span>
                                                    {field.url && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setModalUrl(field.url);
                                                            }}
                                                            className="ml-2 text-white/20 hover:text-white underline decoration-white/20 underline-offset-4 transition-colors"
                                                        >
                                                            VIEW TERMS
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <Button
                                    disabled={isSubmitting}
                                    onClick={() => handleSubmit(section.content)}
                                    className="w-full bg-white text-black hover:bg-white/90 disabled:opacity-50 rounded-none h-16 font-black text-xs uppercase tracking-[0.3em] mt-8 shadow-2xl transition-all cursor-pointer"
                                >
                                    {isSubmitting ? 'PROCESSING...' : section.content.buttonText}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* FOOTER SECTION */}
                    {section.type === 'footer' && (
                        <div className="py-16 md:py-24 px-6 md:px-12 border-t border-black/5 bg-white flex flex-col md:flex-row justify-between items-center gap-12 text-[10px] font-black uppercase tracking-[0.2em] text-center md:text-left overflow-hidden w-full max-w-7xl mx-auto">
                            <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
                                <span className="text-black">
                                    {section.content.company}
                                </span>
                                <div className="flex flex-wrap justify-center gap-6 text-muted-foreground font-bold">
                                    {(section.content.links || []).map((l: any, i: number) => {
                                        const label = typeof l === 'string' ? l : l.label;
                                        const url = typeof l === 'string' ? null : l.url;

                                        if (url) {
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => setModalUrl(url)}
                                                    className="hover:text-black cursor-pointer transition-colors"
                                                >
                                                    {label}
                                                </button>
                                            );
                                        }

                                        return (
                                            <span key={i} className="hover:text-black cursor-pointer transition-colors">
                                                {label}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                            <span className="text-black/20 tracking-normal font-medium">
                                {section.content.copyright}
                            </span>
                        </div>
                    )}
                </div>
            ))}

            {/* TERMS MODAL */}
            {modalUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-4xl h-[80vh] bg-white rounded-none flex flex-col relative">
                        <div className="p-4 border-b border-black/5 flex items-center justify-between bg-black text-white">
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none pt-0.5">TERMS & ARCHITECTURE PROTOCOL</span>
                            <button
                                onClick={() => setModalUrl(null)}
                                className="p-2 hover:bg-white/10 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 bg-white">
                            <iframe
                                src={modalUrl}
                                className="w-full h-full border-none"
                                title="Terms of Service"
                            />
                        </div>
                        <div className="p-6 border-t border-black/5 flex justify-end">
                            <Button
                                onClick={() => setModalUrl(null)}
                                className="bg-black text-white rounded-none px-12 h-12 font-black text-xs uppercase tracking-widest shadow-none hover:bg-black/90"
                            >
                                CLOSE BRIDGE
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
