'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    X, Send, Undo2, Redo2, Loader2, Sparkles,
    Maximize2, Minimize2, MessageSquare, History, Edit3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const FEEDBACK_CATEGORIES = [
    {
        name: '구조·맥락 관련',
        items: [
            { label: '주제 불명확', instruction: '글의 핵심 주제가 무엇인지 명확하게 드러나도록 수정해 주세요.' },
            { label: '도입 불필요', instruction: '도입부가 너무 길거나 불필요합니다. 핵심으로 바로 들어갈 수 있게 정리해 주세요.' },
            { label: '결론 없음', instruction: '마무리가 미흡하거나 결론이 보이지 않습니다. 인상적인 마무리 문장을 추가해 주세요.' },
            { label: '흐름 끊김', instruction: '논리적 흐름이나 정서적 흐름이 끊깁니다. 매끄럽게 이어지도록 다듬어 주세요.' },
            { label: '앞뒤 연결 약함', instruction: '앞 문장이나 뒷 문장과의 연결 고리가 약합니다. 인과관계를 강화해 주세요.' },
            { label: '위치 부적절', instruction: '이 문장이나 문단이 현재 위치에 있는 것이 어색합니다. 더 적절한 위치를 제안하거나 재배치해 주세요.' },
            { label: '문단 목적 불분명', instruction: '이 문단이 왜 존재하는지 목적이 불분명합니다. 의도를 명확히 하여 다시 써주세요.' },
            { label: '이 문장 없어도 됨', instruction: '전체 맥락상 이 문장은 없어도 무방해 보입니다. 삭제하거나 통합해 주세요.' },
        ]
    },
    {
        name: '논리·정보 관련',
        items: [
            { label: '근거 부족', instruction: '주장을 뒷받침할 구체적인 근거가 부족합니다. 설득력 있는 논거를 추가해 주세요.' },
            { label: '주장 과잉', instruction: '주장이 너무 강하거나 반복되어 독자에게 거부감을 줄 수 있습니다. 담백하게 수정해 주세요.' },
            { label: '설명 부족', instruction: '독자가 이해하기에 정보나 설명이 부족합니다. 충분한 부연 설명을 추가해 주세요.' },
            { label: '전제 지식 요구', instruction: '독자가 특정 지식을 알고 있다는 전제하에 쓰여졌습니다. 더 쉽게 풀어 설명해 주세요.' },
            { label: '논리 점프', instruction: '논리 전개 사이에 비약이 있습니다. 중간 과정을 생략하지 말고 상세히 기술해 주세요.' },
            { label: '인과 불명확', instruction: '원인과 결과가 명확히 연결되지 않습니다. 논리적 인과관계를 선명하게 해주세요.' },
            { label: '예시 필요', instruction: '추상적인 설명 뒤에 독자의 이해를 도울 구체적인 예시를 추가해 주세요.' },
            { label: '정보 중복', instruction: '앞서 언급된 정보가 불필요하게 반복되고 있습니다. 하나로 합치거나 삭제해 주세요.' },
        ]
    },
    {
        name: '추상성·명확성',
        items: [
            { label: '너무 추상적', instruction: '관념적이고 추상적인 표현입니다. 오감을 자극하는 구체적인 묘사나 단어로 바꿔 주세요.' },
            { label: '의미 모호', instruction: '문장의 의미가 여러 갈래로 해석될 수 있습니다. 하나의 명확한 의미로 다듬어 주세요.' },
            { label: '구체화 필요', instruction: '내용이 너무 뭉뚱그려져 있습니다. 더 세부적이고 구체적인 수치나 상황을 묘사해 주세요.' },
            { label: '범위 불분명', instruction: '말하고자 하는 대상의 범위가 너무 넓거나 좁습니다. 적절한 범위를 설정해 주세요.' },
            { label: '대상 불명확', instruction: '누구를 지칭하는지, 무엇에 대해 말하는지 대상이 불분명합니다. 주어를 선명히 해주세요.' },
            { label: '핵심 흐림', instruction: '여러 이야기를 섞다 보니 정작 하고 싶은 말이 가려졌습니다. 핵심만 남기고 곁가지를 쳐주세요.' },
            { label: '말만 많음', instruction: '수식어만 많고 실속이 없는 문장입니다. 간결하고 힘 있는 문장으로 수정해 주세요.' },
        ]
    },
    {
        name: '감정·태도 과잉',
        items: [
            { label: '감정 과잉', instruction: '감정적 호소가 너무 짙습니다. 독자가 스스로 감정을 느낄 수 있도록 상황만 묘사해 주세요.' },
            { label: '자기연민', instruction: '글쓴이의 자기연민이 강하게 드러나 독자가 불편할 수 있습니다. 한 걸음 물러나 객관적으로 써주세요.' },
            { label: '넋두리', instruction: '생각의 흐름이 단순한 한탄이나 넋두리에 가깝습니다. 교훈이나 깊이를 더해 주세요.' },
            { label: '분노 섞임', instruction: '문장에 날 선 감정이나 분노가 섞여 있습니다. 차분하고 성찰적인 어조로 바꿔 주세요.' },
            { label: '과장됨', instruction: '경험보다 표현이 과하여 신뢰도가 떨어집니다. 솔직하고 담백한 표현으로 수정해 주세요.' },
            { label: '호소 과다', instruction: '독자에게 동의나 행동을 너무 강요하는 느낌입니다. 부드러운 제안 형식으로 바꿔 주세요.' },
            { label: '분위기용 문장', instruction: '멋있어 보이려고 쓴 실속 없는 문장입니다. 진정성 있는 문장으로 교체하거나 삭제해 주세요.' },
        ]
    },
    {
        name: '소통 방해 요소',
        items: [
            { label: '허영적 표현', instruction: '고급 어휘나 외래어를 남발하여 가독성을 해칩니다. 쉬운 우리말로 바꿔 주세요.' },
            { label: '자기과시', instruction: '은근한 자기자랑이나 과시로 보일 우려가 있습니다. 겸손하고 진정성 있는 톤으로 다듬어 주세요.' },
            { label: '작가 중심', instruction: '전적으로 작가의 시각에서만 쓰여 이해하기 어렵습니다. 독자의 시선에서 다시 바라봐 주세요.' },
            { label: '독자 무관', instruction: '독자가 왜 이 이야기를 읽어야 하는지 명분이 부족합니다. 독자와의 접점을 만들어 주세요.' },
            { label: '집착적 설명', instruction: '중요하지 않은 세부 사항에 너무 집착하여 설명하고 있습니다. 과감히 덜어내 주세요.' },
            { label: '말투만 남음', instruction: '내용보다 글쓴이의 특이한 말투나 습관만 두드러집니다. 평이하고 자연스러운 말투로 교정해 주세요.' },
            { label: '있어 보이려는 문장', instruction: '어렵게 꼬아 놓았지만 실상은 단순한 내용입니다. 명쾌하고 직관적으로 고쳐 주세요.' },
        ]
    },
    {
        name: '커머스·목적 관점',
        items: [
            { label: '목적과 무관', instruction: '이 글의 비즈니스 목적이나 방향성과 관련 없는 내용입니다. 목적에 부합하게 수정해 주세요.' },
            { label: '전환에 도움 안 됨', instruction: '독자의 구매 의사나 행동을 이끌어내는 데 도움이 되지 않습니다. 매력적인 소구점을 강조해 주세요.' },
            { label: '행동 유도 없음', instruction: '독자가 다음에 무엇을 해야 할지 알 수 없습니다. 명확한 가이드를 제시해 주세요.' },
            { label: 'CTA 약함', instruction: '클릭이나 구매를 유도하는 문장(CTA)의 힘이 약합니다. 강렬하고 설득력 있게 바꿔 주세요.' },
            { label: '가치 전달 실패', instruction: '제품이나 서비스가 주는 핵심 가치가 충분히 전달되지 않았습니다. 장점을 경험으로 번역해 주세요.' },
        ]
    },
    {
        name: '즉시 수정 액션형',
        items: [
            { label: '삭제', instruction: '이 부분은 글의 흐름상 불필요해 보입니다. 삭제해 주세요.' },
            { label: '단순화', instruction: '복잡한 문장 구조를 최대한 단순하고 명료하게 고쳐 주세요.' },
            { label: '한 문장으로', instruction: '여러 개의 문장을 강렬하고 임팩트 있는 한 문장으로 합쳐 주세요.' },
            { label: '핵심만 남김', instruction: '불필요한 수식어를 모두 제거하고 뼈대가 되는 핵심 내용만 남겨 주세요.' },
            { label: '위치 이동', instruction: '이 문장이 가장 빛날 수 있는 최적의 위치로 이동을 제안하고 주변 문맥을 정리해 주세요.' },
            { label: '문단 병합', instruction: '나누어진 문단들을 하나의 긴밀한 호흡을 가진 문단으로 병합해 주세요.' },
            { label: '문장 분리', instruction: '너무 만연체인 긴 문장을 호흡이 짧은 여러 개의 문장으로 나누어 주세요.' },
        ]
    }
];

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ProofreadingModeProps {
    content: string;
    onChange: (content: string) => void;
    onClose: () => void;
}

export function ProofreadingMode({ content, onChange, onClose }: ProofreadingModeProps) {
    const [currentContent, setCurrentContent] = useState(content);
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [undoStack, setUndoStack] = useState<string[]>([]);
    const [redoStack, setRedoStack] = useState<string[]>([]);
    const [selection, setSelection] = useState<{ start: number, end: number } | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSuggestionsExpanded, setIsSuggestionsExpanded] = useState(true);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [selectionRect, setSelectionRect] = useState<{ top: number, left: number } | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleContentChange = (newContent: string) => {
        if (newContent === currentContent) return;
        setUndoStack(prev => [...prev, currentContent]);
        setRedoStack([]);
        setCurrentContent(newContent);
    };

    const handleUndo = () => {
        if (undoStack.length === 0) return;
        const previous = undoStack[undoStack.length - 1];
        const newUndoStack = undoStack.slice(0, -1);

        setRedoStack(prev => [...prev, currentContent]);
        setUndoStack(newUndoStack);
        setCurrentContent(previous);
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        const newRedoStack = redoStack.slice(0, -1);

        setUndoStack(prev => [...prev, currentContent]);
        setRedoStack(newRedoStack);
        setCurrentContent(next);
    };

    const handleSelect = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        if (start !== end) {
            setSelection({ start, end });

            // Calculate visual coordinates of the selection end
            const textarea = textareaRef.current;
            if (textarea) {
                const updatePosition = () => {
                    const style = window.getComputedStyle(textarea);
                    const mirror = document.createElement('div');

                    // Copy all relevant styles to mirror div
                    mirror.style.position = 'absolute';
                    mirror.style.visibility = 'hidden';
                    mirror.style.whiteSpace = 'pre-wrap';
                    mirror.style.wordWrap = 'break-word';
                    mirror.style.width = textarea.clientWidth + 'px';
                    mirror.style.font = style.font;
                    mirror.style.padding = style.padding;
                    mirror.style.lineHeight = style.lineHeight;
                    mirror.style.boxSizing = 'border-box';

                    // Set text up to selection end and add a marker span
                    mirror.textContent = currentContent.substring(0, end);
                    const span = document.createElement('span');
                    span.textContent = 'I'; // Character height marker
                    mirror.appendChild(span);

                    document.body.appendChild(mirror);

                    // Get coordinates relative to textarea origin
                    const spanOffsetTop = span.offsetTop;
                    const spanOffsetLeft = span.offsetLeft;

                    document.body.removeChild(mirror);

                    setSelectionRect({
                        top: spanOffsetTop - textarea.scrollTop + 32, // Adjust for top padding (p-8 = 32px)
                        left: Math.min(spanOffsetLeft + 10, textarea.clientWidth - 150) // Keep button inside
                    });
                };
                updatePosition();
            }

            const selectedText = currentContent.substring(start, end);
            const words = selectedText.trim().split(/\s+/);
            if (words.length > 0) {
                const startWord = words[0];
                const endWord = words[words.length - 1];
                const reference = `@${startWord}~${endWord}`;

                // Add reference to chat input if not already there or just append
                if (!chatInput.includes(reference)) {
                    setChatInput(prev => prev ? `${prev} ${reference}` : reference);
                }
            }
        } else {
            setSelection(null);
            setSelectionRect(null);
        }
    };

    const handleSend = async () => {
        if (!chatInput.trim() || isProcessing) return;

        const userMsg = chatInput;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatInput('');
        setIsProcessing(true);

        try {
            // If selection exists and reference is in message, we tell the AI to replace it
            const response = await fetch('/api/ai/proofread', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: currentContent,
                    instruction: userMsg,
                    selection: selection ? {
                        text: currentContent.substring(selection.start, selection.end),
                        start: selection.start,
                        end: selection.end
                    } : null
                })
            });

            const data = await response.json();
            if (data.result) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.message || '수정되었습니다.' }]);

                // Apply changes
                if (selection && data.improvedText) {
                    const newContent = currentContent.substring(0, selection.start) +
                        data.improvedText +
                        currentContent.substring(selection.end);
                    handleContentChange(newContent);
                    setSelection(null); // Clear selection after apply
                } else if (data.updatedContent) {
                    handleContentChange(data.updatedContent);
                }
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: '오류가 발생했습니다: ' + data.error }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: '요청 중 오류가 발생했습니다.' }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditorialFeedback = async () => {
        if (isProcessing) return;

        const feedbackPrompt = `아래 글을 읽어보고 대형 출판사 편집자의 시선으로 어느 부분을 어떻게 교정하는 게 좋을지 분석하고 제안해줘. 다음 사항을 기준으로 제안해 주면 좋겠어. 수정이 필요한 부분이 있다면 그 문장이 포함된 문단을 수정해서 제안해 줘. 직접 문장을 고치지 말고 고칠 부분을 구체적으로 제안만 해줘. 그리고 내 글의 초안에 대해 날카롭고 냉정한 피드백을 전달해 줘.

1. 명사의 사용 : 관념적인 명사보다는 더 뚜렷한 의미를 가진 구체적이고 품격 높은 명사로 제안할 것
2. 형용사 추가 : 특정한 문장에 필요한 형용사를 적절하게 제안할 것
3. 추상적인 문장의 회피 : 추상적인 문장이 있다면 더 구체적이고 분명한 의미를 지닌 문장으로 제안할 것
4. 유머와 위트를 적절하게 제안할 것
5. 어색한 문장이 있다면 어떻게 수정하는 게 좋을지 제안할 것
6. 적절한 비유의 사용: 재치 있고 독특한 비유 제안(AI가 자주 쓰는 식상한 비유는 제외할 것)
7. 주제에서 벗어나는 문장이 있는지 제안할 것
8. 필요하다면 문단의 구조를 재배치해 줄 것
9. 필요하다면 새로운 문단의 삽입이나 추가를 제안할 것
10. 자연스럽지 못한 부분이 있다면 매끄러운 구성으로 제안할 것
11. 특정 문장이나 문단을 전문 평론가가 쓴 것처럼 제안할 것
12. 글의 전개 흐름이 논리적이지 않다면 그 부분을 논리적인 구조로 제안할 것
13. 주장과 근거가 잘 연결되어 있는지 봐주고 그렇지 않다면 개선안을 제안할 것
14. 비슷한 표현을 반복하거나 불필요한 문장이 있으면 지적해 줄 것
15. 문장의 길이나 리듬이 단조롭다면 그 부분을 어떻게 고쳐야 할 것인지 제안할 것

[응답 지침]
- 위 15가지 항목 중 개선이 필요한 항목들을 선별하여 구체적인 제안을 생성하라.
- 응답은 반드시 아래 JSON 형식을 엄격히 지켜라:
{
    "message": "본문에 대한 전반적인 총평과 출판사 편집자로서의 날카로운 피드백 (Markdown 지원)",
    "suggestions": [
        {
            "id": 1,
            "category": "항목 이름 (예: 명사의 사용)",
            "description": "구체적으로 어느 부분이 왜 어색한지, 어떻게 바꾸면 좋을지에 대한 설명 및 수정 제안 문단 예시",
            "action": "해당 제안을 본문에 실제로 적용하기 위해 필요한 구체적인 AI 수정 지시문"
        }
    ],
    "result": true
}

[본문]
${currentContent}`;

        setMessages(prev => [...prev, { role: 'user', content: '전문 편집자의 상세 피드백을 부탁드립니다.' }]);
        setIsProcessing(true);
        setSuggestions([]);

        try {
            const response = await fetch('/api/ai/proofread', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: currentContent,
                    instruction: feedbackPrompt,
                    selection: null
                })
            });

            const data = await response.json();
            if (data.result) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
                if (data.suggestions) {
                    setSuggestions(data.suggestions);
                }
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: '오류가 발생했습니다: ' + data.error }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: '요청 중 오류가 발생했습니다.' }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const applySuggestion = async (suggestion: any) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setMessages(prev => [...prev, { role: 'user', content: `[적용 요청] ${suggestion.category}: ${suggestion.description}` }]);

        try {
            const response = await fetch('/api/ai/proofread', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: currentContent,
                    instruction: suggestion.action,
                    selection: null
                })
            });

            const data = await response.json();
            if (data.result && data.updatedContent) {
                handleContentChange(data.updatedContent);
                setMessages(prev => [...prev, { role: 'assistant', content: `성공적으로 적용되었습니다: ${suggestion.category}` }]);
                // Remove the suggestion after applying
                setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: '적용 중 오류가 발생했습니다.' }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: '요청 중 오류가 발생했습니다.' }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleQuickFeedback = async (feedback: { label: string, instruction: string }) => {
        if (isProcessing || !selection) return;
        setIsFeedbackModalOpen(false); // Close modal if open

        const userMsg = `[${feedback.label}] ${feedback.instruction}`;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsProcessing(true);

        try {
            const response = await fetch('/api/ai/proofread', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: currentContent,
                    instruction: feedback.instruction,
                    selection: {
                        text: currentContent.substring(selection.start, selection.end),
                        start: selection.start,
                        end: selection.end
                    }
                })
            });

            const data = await response.json();
            if (data.result) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.message || '수정되었습니다.' }]);
                if (data.improvedText !== undefined) {
                    const newContent = currentContent.substring(0, selection.start) +
                        (data.improvedText || '') +
                        currentContent.substring(selection.end);
                    handleContentChange(newContent);
                    setSelection(null);
                }
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: '오류가 발생했습니다: ' + data.error }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: '요청 중 오류가 발생했습니다.' }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const applyClose = () => {
        onChange(currentContent);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="h-14 border-b flex items-center justify-between px-6 bg-muted/20">
                <div className="flex items-center gap-4">
                    <History className="w-5 h-5 text-muted-foreground" />
                    <h2 className="font-bold text-sm uppercase tracking-tight">AI Proofreading Mode</h2>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleUndo}
                        disabled={undoStack.length === 0}
                        className="h-8 w-8 p-0"
                    >
                        <Undo2 className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                        className="h-8 w-8 p-0"
                    >
                        <Redo2 className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-4 bg-border mx-2" />
                    <Button
                        variant="default"
                        size="sm"
                        onClick={applyClose}
                        className="bg-black text-white px-4 h-8 text-xs font-bold uppercase tracking-tight rounded-none"
                    >
                        Apply & Close
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex overflow-hidden">
                {/* Editor Side */}
                <div className="flex-grow flex flex-col border-r relative bg-white">
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/5 border-b">
                        <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Editor</span>
                        <span className="text-[10px] text-muted-foreground">{currentContent.length} chars</span>
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={currentContent}
                        onChange={(e) => setCurrentContent(e.target.value)}
                        onSelect={handleSelect}
                        onScroll={() => {
                            if (selection) handleSelect();
                        }}
                        className="flex-grow p-8 outline-none resize-none font-medium text-base leading-relaxed selection:bg-black/10"
                        placeholder="본문을 여기에 작성하거나 AI와 대화하며 수정하세요..."
                    />

                    {selection && selectionRect && (
                        <div
                            className="absolute z-10 animate-in fade-in zoom-in duration-200 pointer-events-none"
                            style={{
                                top: `${selectionRect.top}px`,
                                left: `${selectionRect.left}px`
                            }}
                        >
                            <Button
                                onClick={() => setIsFeedbackModalOpen(true)}
                                className="bg-black text-white hover:bg-black/90 shadow-2xl gap-2 font-bold text-[10px] px-3 h-8 rounded-full pointer-events-auto transform translate-y-2"
                            >
                                <Sparkles className="w-3 h-3 animate-pulse text-yellow-400" />
                                AI 피드백
                            </Button>
                        </div>
                    )}
                </div>

                {/* AI Sidebar */}
                <div className="w-[450px] flex flex-col bg-muted/10">
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-black" />
                            <span className="text-xs font-bold uppercase tracking-tight">AI Assistant</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEditorialFeedback}
                            disabled={isProcessing}
                            className="h-7 px-2 text-[10px] font-bold bg-white border-black/10 hover:bg-black hover:text-white transition-all gap-1.5"
                        >
                            <Edit3 className="w-3 h-3" />
                            AI 제안 (Feedback)
                        </Button>
                    </div>

                    {/* Messages Area */}
                    <div className={cn(
                        "flex-grow overflow-y-auto p-4 space-y-4 transition-all duration-300",
                        isSuggestionsExpanded && suggestions.length > 0 ? "opacity-0 invisible h-0" : "opacity-100 visible"
                    )}>
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                                <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center">
                                    <MessageSquare className="w-6 h-6 text-black/20" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold">퇴고를 도와드릴까요?</p>
                                    <p className="text-xs text-muted-foreground leading-normal">
                                        문장을 드래그하여 참조(@단어~단어)하거나<br />
                                        수정 요청을 입력해주세요.
                                    </p>
                                </div>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "flex flex-col max-w-[85%] space-y-1",
                                    msg.role === 'user' ? "ml-auto items-end" : "items-start"
                                )}
                            >
                                <div className={cn(
                                    "px-4 py-2 text-sm prose prose-sm max-w-none",
                                    msg.role === 'user'
                                        ? "bg-black text-white rounded-2xl rounded-tr-none prose-invert"
                                        : "bg-white border text-black rounded-2xl rounded-tl-none"
                                )}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeRaw]}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                AI가 생각중입니다...
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Suggestions Area (Accordion style) */}
                    {suggestions.length > 0 && (
                        <div className={cn(
                            "flex flex-col border-t bg-muted/5 transition-all duration-300 ease-in-out",
                            isSuggestionsExpanded ? "flex-grow" : "h-[45px]"
                        )}>
                            <button
                                onClick={() => setIsSuggestionsExpanded(!isSuggestionsExpanded)}
                                className="w-full h-[45px] flex items-center justify-between px-4 hover:bg-black/5 transition-colors border-b border-black/5"
                            >
                                <div className="flex items-center gap-2">
                                    <Edit3 className="w-3.5 h-3.5 text-black/40" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-black/60">
                                        Actionable Suggestions ({suggestions.length})
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSuggestionsExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                                </div>
                            </button>

                            <div className={cn(
                                "flex-grow overflow-y-auto p-4 space-y-3 transition-opacity duration-300",
                                isSuggestionsExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
                            )}>
                                {suggestions.map((s) => (
                                    <div key={s.id} className="bg-white border border-black/5 p-4 space-y-3 shadow-sm hover:border-black/20 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1.5 flex-grow">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-black/5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase text-black/40">{s.category}</span>
                                                </div>
                                                <p className="text-xs leading-relaxed text-black/80 font-medium">{s.description}</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => applySuggestion(s)}
                                                disabled={isProcessing}
                                                className="h-8 px-3 text-[10px] font-bold border-black/10 hover:bg-black hover:text-white shrink-0 rounded-none bg-white transition-all shadow-sm"
                                            >
                                                <Sparkles className="w-3 h-3 mr-1.5" />
                                                적용
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Chat Input */}
                    <div className="p-4 border-t bg-white">
                        <div className="relative">
                            <Textarea
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="메세지를 입력하세요..."
                                className="min-h-[80px] pr-12 text-sm rounded-none border-black/10 resize-none focus-visible:ring-black/10"
                            />
                            <Button
                                size="sm"
                                onClick={handleSend}
                                disabled={!chatInput.trim() || isProcessing}
                                className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-none bg-black text-white hover:bg-black/90"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="mt-2 text-[10px] text-muted-foreground flex justify-between items-center">
                            <span>Markdown selection: @시작~끝</span>
                            <span>Shift + Enter for new line</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* Categorized Feedback Modal */}
            {isFeedbackModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between p-6 border-b bg-muted/5">
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold tracking-tight">AI 에디토리얼 피드백</h3>
                                <p className="text-xs text-muted-foreground">선택한 문장의 문제점을 선택하세요. AI가 전문 편집자의 시선으로 교정합니다.</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setIsFeedbackModalOpen(false)} className="h-10 w-10 p-0 rounded-full hover:bg-black/5">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-6 scrollbar-thin">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {FEEDBACK_CATEGORIES.map((category) => (
                                    <div key={category.name} className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b-2 border-black/5">
                                            <div className="w-1 h-3 bg-black" />
                                            <h4 className="text-[11px] font-black uppercase tracking-widest text-black/40">{category.name}</h4>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {category.items.map((f) => (
                                                <button
                                                    key={f.label}
                                                    onClick={() => handleQuickFeedback(f)}
                                                    disabled={isProcessing}
                                                    className="px-3 py-1.5 text-xs font-bold border border-black/5 hover:border-black hover:bg-black hover:text-white transition-all bg-muted/10 text-black/70 rounded-none shadow-sm disabled:opacity-50"
                                                >
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-muted/10 border-t text-center text-[10px] text-muted-foreground font-medium italic">
                            "선택된 문장은 전체 맥락과 브랜드 보이스(Mars 에세이 톤)에 맞춰 교정됩니다."
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
