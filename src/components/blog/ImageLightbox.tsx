'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageLightboxProps {
    images: { url: string; alt: string }[];
    currentIndex: number;
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (index: number) => void;
}

export function ImageLightbox({ images, currentIndex, isOpen, onClose, onNavigate }: ImageLightboxProps) {
    const [scale, setScale] = useState(1);
    const [isOriginalSize, setIsOriginalSize] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const resetZoom = useCallback(() => {
        setScale(1);
        setIsOriginalSize(false);
    }, []);

    const handlePrev = useCallback(() => {
        onNavigate((currentIndex - 1 + images.length) % images.length);
        resetZoom();
    }, [currentIndex, images.length, onNavigate, resetZoom]);

    const handleNext = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
        onNavigate((currentIndex + 1) % images.length);
        resetZoom();
    }, [currentIndex, images.length, onNavigate, resetZoom]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose, handlePrev, handleNext]);

    const toggleZoom = () => {
        if (isOriginalSize) {
            setScale(1);
            setIsOriginalSize(false);
        } else {
            setIsOriginalSize(true);
            // We'll handle the actual "original size" via CSS classes
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                {/* Header/Controls */}
                <div className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-6 z-[110] bg-gradient-to-b from-white/80 to-transparent pointer-events-none">
                    <div className="text-black/80 text-[10px] font-bold uppercase tracking-widest pointer-events-auto flex items-center gap-3">
                        <span className="bg-black px-2 py-1 text-white">IMAGE {currentIndex + 1} OF {images.length}</span>
                        <span className="hidden md:inline-block opacity-40 truncate max-w-[300px]">{images[currentIndex]?.alt || 'POST CONTENT'}</span>
                    </div>
                    <div className="flex items-center gap-2 pointer-events-auto">
                        <div className="flex items-center bg-black/5 backdrop-blur-2xl rounded-full p-1 border border-black/5">
                            <button
                                type="button"
                                onClick={() => setScale(prev => Math.min(prev + 0.25, 4))}
                                className="p-2 text-black/60 hover:text-black transition-colors hover:bg-black/5 rounded-full"
                                title="Zoom In"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setScale(prev => Math.max(prev - 0.25, 0.25))}
                                className="p-2 text-black/60 hover:text-black transition-colors hover:bg-black/5 rounded-full"
                                title="Zoom Out"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-black/10 mx-1" />
                            <button
                                type="button"
                                onClick={toggleZoom}
                                className={`p-2 transition-colors rounded-full ${isOriginalSize ? 'text-blue-600 bg-black/5' : 'text-black/60 hover:text-black hover:bg-black/5'}`}
                                title="1:1 Size"
                            >
                                <Maximize className="w-4 h-4" />
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-black/60 hover:text-black transition-colors bg-black/5 hover:bg-black/10 backdrop-blur-xl border border-black/5 rounded-full ml-2"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div
                    ref={containerRef}
                    className="relative w-full flex-grow overflow-auto p-4 md:p-12 scroll-smooth no-scrollbar"
                    onClick={(e) => e.target === e.currentTarget && onClose()}
                >
                    <div className={`min-h-full w-full flex items-center justify-center ${isOriginalSize ? 'cursor-zoom-out' : 'cursor-default'}`}>
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: isOriginalSize ? 1 : scale }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative shadow-2xl shadow-black/10"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                ref={imageRef}
                                src={images[currentIndex].url}
                                alt={images[currentIndex].alt}
                                className={`block transition-all duration-300 ${isOriginalSize ? 'max-w-none h-auto w-auto' : 'max-w-full max-h-[80vh] object-contain'}`}
                            />
                        </motion.div>
                    </div>

                    {/* Navigation Buttons */}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        className="fixed left-4 top-1/2 -translate-y-1/2 p-4 text-black/10 hover:text-black/60 hover:bg-black/5 transition-all rounded-full z-[120]"
                    >
                        <ChevronLeft className="w-10 h-10" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        className="fixed right-4 top-1/2 -translate-y-1/2 p-4 text-black/10 hover:text-black/60 hover:bg-black/5 transition-all rounded-full z-[120]"
                    >
                        <ChevronRight className="w-10 h-10" />
                    </button>
                </div>

                {/* Thumbnail Strip */}
                <div className="w-full h-32 bg-gray-50/80 backdrop-blur-3xl border-t border-black/5 flex flex-col items-center justify-center py-4 z-[130]">
                    <div className="flex items-center gap-4 overflow-x-auto px-12 w-full justify-center no-scrollbar h-full">
                        {images.map((img, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigate(idx);
                                    resetZoom();
                                }}
                                className={`relative flex-shrink-0 h-16 w-28 overflow-hidden transition-all duration-300 rounded-sm border-2 ${idx === currentIndex ? 'border-blue-500 scale-110 opacity-100 shadow-[0_5px_15px_rgba(59,130,246,0.3)]' : 'border-black/5 opacity-50 hover:opacity-100 hover:border-black/20'}`}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={img.url}
                                    alt={img.alt}
                                    className="w-full h-full object-cover"
                                />
                                {idx === currentIndex && (
                                    <div className="absolute inset-0 bg-blue-500/5 mix-blend-multiply" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <style jsx global>{`
                    .no-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .no-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}</style>
            </motion.div>
        </AnimatePresence>
    );
}
