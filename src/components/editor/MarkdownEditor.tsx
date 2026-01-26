import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Button } from '@/components/ui/button';
import {
    Bold, Italic, Link as LinkIcon, Image as ImageIcon,
    List, ListOrdered, Quote, Code, Eye, Edit3, UploadCloud,
    Heading1, Heading2, Heading3
} from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '@/lib/imageCompression';
import { cn } from '@/lib/utils';
import { ImageLightbox } from '@/components/blog/ImageLightbox';
import { useEffect, useCallback } from 'react';

interface MarkdownEditorProps {
    content: string;
    onChange: (content: string) => void;
}

export function MarkdownEditor({ content, onChange }: MarkdownEditorProps) {
    const [view, setView] = useState<'write' | 'preview'>('write');
    const [isUploading, setIsUploading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const [lightboxData, setLightboxData] = useState<{ isOpen: boolean; index: number }>({ isOpen: false, index: 0 });
    const [extractedImages, setExtractedImages] = useState<{ url: string; alt: string }[]>([]);

    // Scan for images in preview mode
    useEffect(() => {
        if (view !== 'preview' || !previewRef.current) return;

        const imgs = previewRef.current.querySelectorAll('img');
        const imageList: { url: string; alt: string }[] = [];

        imgs.forEach((img) => {
            const src = img.getAttribute('src');
            if (src && !src.includes('profile') && !src.includes('avatar')) {
                imageList.push({
                    url: src,
                    alt: img.getAttribute('alt') || 'Preview image'
                });

                img.style.cursor = 'zoom-in';
                const currentIdx = imageList.length - 1;
                img.onclick = (e) => {
                    e.preventDefault();
                    setLightboxData({ isOpen: true, index: currentIdx });
                };
            }
        });

        setExtractedImages(imageList);

        return () => {
            imgs.forEach(img => {
                img.onclick = null;
            });
        };
    }, [view, content]);

    const insertText = (before: string, after: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);

        onChange(newText);

        // Reset cursor position
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + before.length, end + before.length);
        }, 0);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const compressedFile = await compressImage(file);
                const dateStr = new Date().toISOString().split('T')[0];
                const storageRef = ref(storage, `temp/${dateStr}/${Date.now()}-${file.name}`);
                await uploadBytes(storageRef, compressedFile);
                const url = await getDownloadURL(storageRef);
                insertText(`![${file.name}](${url})`, '');
            }
        } catch (error) {
            console.error("Upload failed", error);
            alert("Image upload failed");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const toolbarItems = [
        { icon: Heading1, onClick: () => insertText('# ', ''), title: 'Heading 1' },
        { icon: Heading2, onClick: () => insertText('## ', ''), title: 'Heading 2' },
        { icon: Heading3, onClick: () => insertText('### ', ''), title: 'Heading 3' },
        { icon: Bold, onClick: () => insertText('**', '**'), title: 'Bold' },
        { icon: Italic, onClick: () => insertText('_', '_'), title: 'Italic' },
        { icon: Quote, onClick: () => insertText('> ', ''), title: 'Quote' },
        { icon: Code, onClick: () => insertText('`', '`'), title: 'Code' },
        { icon: List, onClick: () => insertText('- ', ''), title: 'Bullet List' },
        { icon: ListOrdered, onClick: () => insertText('1. ', ''), title: 'Ordered List' },
        { icon: LinkIcon, onClick: () => insertText('[', '](url)'), title: 'Link' },
        { icon: ImageIcon, onClick: () => insertText('![alt](', ')'), title: 'Image Link' },
    ];

    return (
        <div className="flex flex-col border rounded-md overflow-hidden bg-background">
            <div className="flex items-center justify-between p-2 border-b bg-muted/30">
                <div className="flex items-center gap-1">
                    {toolbarItems.map((item, idx) => (
                        <Button
                            key={idx}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={item.onClick}
                            title={item.title}
                        >
                            <item.icon className="h-4 w-4" />
                        </Button>
                    ))}
                    <div className="w-px h-4 bg-border mx-1" />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        title="Upload Image"
                    >
                        <UploadCloud className="h-4 w-4" />
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                    />
                </div>
                <div className="flex bg-muted rounded-md p-1">
                    <Button
                        type="button"
                        variant={view === 'write' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 px-3 text-xs"
                        onClick={() => setView('write')}
                    >
                        <Edit3 className="mr-1 h-3 w-3" />
                        Write
                    </Button>
                    <Button
                        type="button"
                        variant={view === 'preview' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 px-3 text-xs"
                        onClick={() => setView('preview')}
                    >
                        <Eye className="mr-1 h-3 w-3" />
                        Preview
                    </Button>
                </div>
            </div>

            <div className="relative min-h-[400px]">
                {view === 'write' ? (
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full h-full min-h-[400px] p-4 bg-transparent outline-none resize-none font-mono text-sm leading-relaxed"
                        placeholder="Write your story in markdown..."
                    />
                ) : (
                    <div ref={previewRef} className="p-4 prose prose-sm dark:prose-invert max-w-none min-h-[400px]">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                        >
                            {content || '*No content to preview*'}
                        </ReactMarkdown>

                        <ImageLightbox
                            images={extractedImages}
                            currentIndex={lightboxData.index}
                            isOpen={lightboxData.isOpen}
                            onClose={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
                            onNavigate={(index) => setLightboxData(prev => ({ ...prev, index }))}
                        />
                    </div>
                )}
                {isUploading && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                        <span className="text-sm font-medium">Uploading images...</span>
                    </div>
                )}
            </div>
            <div className="p-2 border-t bg-muted/10 text-[10px] text-muted-foreground flex justify-between items-center">
                <span>Markdown supported</span>
                <span>{content.length} characters</span>
            </div>
        </div>
    );
}
