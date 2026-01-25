import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, content, imageUrl } = body;

        console.log(`[AI API] Type: ${type}`);

        // Using the requested Gemini 2.5 Flash model (stable in 2026)
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Helper for robust JSON parsing
        const safeParseJson = (text: string) => {
            try {
                let cleaned = text.replace(/```json|```/g, "").trim();
                const firstBrace = cleaned.indexOf('{');
                const firstBracket = cleaned.indexOf('[');
                let start = -1;
                if (firstBrace !== -1 && firstBracket !== -1) {
                    start = Math.min(firstBrace, firstBracket);
                } else {
                    start = firstBrace !== -1 ? firstBrace : firstBracket;
                }
                const lastBrace = cleaned.lastIndexOf('}');
                const lastBracket = cleaned.lastIndexOf(']');
                let end = -1;
                if (lastBrace !== -1 && lastBracket !== -1) {
                    end = Math.max(lastBrace, lastBracket);
                } else {
                    end = lastBrace !== -1 ? lastBrace : lastBracket;
                }
                if (start !== -1 && end !== -1) {
                    cleaned = cleaned.substring(start, end + 1);
                }
                let repaired = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/gs, (match) => {
                    return match
                        .replace(/\n/g, "\\n")
                        .replace(/\r/g, "\\r")
                        .replace(/\t/g, "\\t");
                });
                repaired = repaired.replace(/"\s*\n\s*"/g, '",\n"');
                return JSON.parse(repaired);
            } catch (error) {
                console.error("JSON Parse Error:", error);
                throw error;
            }
        };

        // Standardized Gemini API call with retries
        const callGemini = async (prompt: string, jsonMode: boolean = false) => {
            const config = jsonMode ? { responseMimeType: "application/json" } : {};
            let lastError;
            for (let i = 0; i < 3; i++) {
                try {
                    const result = await model.generateContent({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: config
                    });
                    return result.response.text();
                } catch (error: any) {
                    lastError = error;
                    console.error(`Gemini API Attempt ${i + 1} failed:`, error.message);
                    if (i < 2) await new Promise(resolve => setTimeout(resolve, i === 0 ? 1000 : 2000));
                }
            }
            throw lastError;
        };

        if (type === 'nano-banana-image') {
            const { style, prompt } = body;
            const styleGuides: Record<string, string> = {
                'photo': 'A realistic, high-quality photograph with cinematic lighting, professional composition, and 8k resolution.',
                'illustration': 'A cute, colorful digital illustration with soft edges, whimsical characters, and a playful atmosphere.',
                'minimalism': 'A clean, minimal, warm-toned design with simple shapes, soft shadows, and an elegant, peaceful aesthetic.'
            };
            const fullPrompt = `Style: ${styleGuides[style] || style}\n\nTask: Generate an image based on the following description:\n${prompt}`;
            const imageModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });
            try {
                const result = await imageModel.generateContent(fullPrompt);
                const response = await result.response;
                const candidate = response.candidates?.[0];
                const imagePart = candidate?.content?.parts?.find(p => p.inlineData);
                if (imagePart?.inlineData) {
                    return NextResponse.json({
                        base64: imagePart.inlineData.data,
                        mimeType: imagePart.inlineData.mimeType || 'image/png'
                    });
                }
                throw new Error("No image data returned from Nano Banana");
            } catch (error: any) {
                console.error("Nano Banana Error:", error);
                return NextResponse.json({ error: "Nano Banana generation failed", details: error.message }, { status: 500 });
            }
        }

        if (type === 'alt-text') {
            if (!imageUrl) return NextResponse.json({ error: "Image URL required" }, { status: 400 });
            const prompt = `Describe this image for an SEO alt text. Provide a concise, descriptive alt text in Korean. Return ONLY the alt text string.`;
            const contextualPrompt = content ? `${prompt}\nContext: The blog post title is "${content}"` : prompt;
            const text = await callGemini(contextualPrompt);
            return NextResponse.json({ result: text.trim() });
        }

        if (type === 'tldr') {
            const prompt = `Summarize the following markdown content into a single concise paragraph (TL;DR) in Korean. Focus on the key takeaways. Return ONLY the summary.\n\nContent:\n${content}`;
            const text = await callGemini(prompt);
            return NextResponse.json({ result: text.trim() });
        }

        if (type === 'seo-metadata') {
            const prompt = `Based on the following blog content, generate SEO Title (60 chars) and SEO Description (160 chars) in JSON format.\n\nContent:\n${content}`;
            const text = await callGemini(prompt, true);
            return NextResponse.json(safeParseJson(text));
        }

        if (type === 'translate') {
            const { targetLocale, title: postTitle, content: postContent } = body;
            const prompt = `Translate the following post into ${targetLocale}. 
            IMPORTANT: Return ONLY a valid JSON object.
            {
                "title": "...",
                "slug": "...",
                "content": "...",
                "seoTitle": "...",
                "seoDescription": "..."
            }
            LOCALIZATION STRATEGY:
            - Content: Translate all text naturally for ${targetLocale}, capturing local nuances and phrasing.
            - Visuals/Images: Suggest image themes featuring ${targetLocale === 'Korean' ? 'Korean-looking' : targetLocale === 'Japanese' ? 'Japanese-looking' : 'culturally appropriate'} subjects.
            - Tone: Adapt the politeness level and cultural references to feel native to ${targetLocale}.
            
            Input: Title: ${postTitle}, Content: ${postContent}`;
            const text = await callGemini(prompt, true);
            return NextResponse.json(safeParseJson(text));
        }

        if (type === 'translate-landing') {
            const { targetLocale, title: lTitle, content: lContent, callouts, seo } = body;
            const prompt = `Translate this entire landing page structure into ${targetLocale}. Return ONLY a valid JSON object.
            LOCALIZATION STRATEGY: Focus on making the page feel native to ${targetLocale}. Suggest culturally appropriate visual themes.
            Input: Title: ${lTitle}, Content: ${JSON.stringify(lContent)}, Callouts: ${JSON.stringify(callouts)}, SEO: ${JSON.stringify(seo)}`;
            const text = await callGemini(prompt, true);
            return NextResponse.json(safeParseJson(text));
        }

        if (type === 'plan') {
            const { existingPosts } = body;
            const context = existingPosts.slice(0, 5).map((p: any) => `Title: ${p.title}`).join('\n');
            const prompt = `Based on these posts, suggest 5 NEW unique blog post ideas in JSON array format.\n\n${context}`;
            const text = await callGemini(prompt, true);
            return NextResponse.json(safeParseJson(text));
        }

        if (type === 'experience-to-post') {
            const { experience, context, contentType } = body;
            const prompt = `너는 사용자의 ‘에세이 파트너’다. 브랜드 보이스: "지식보다 기록을, 확신보다 회고를."
            입력: 경험(${experience}), 맥락(${context}), 유형(${contentType}). 
            약 3,000자 분량의 장문 에세이 초안을 JSON 형식으로 작성하라. { title, content, slug, seoTitle, seoDescription }`;
            const text = await callGemini(prompt, true);
            return NextResponse.json(safeParseJson(text));
        }

        if (type === 'image-prompt') {
            const { style, context, locale } = body;
            const styleGuides: Record<string, string> = {
                'photo': 'realistic photograph, professional lighting, high resolution',
                'illustration': 'colorful digital illustration, whimsical, soft edges',
                'minimalism': 'minimal warm design, clean shapes, elegant'
            };
            const culturalContext: Record<string, string> = {
                'ko': 'Feature Korean/East Asian people, clean Korean-style business/home environments, and warm modern Korean aesthetics.',
                'ja': 'Feature Japanese people, Zen-inspired aesthetics, soft natural colors, and polite Japanese settings.',
                'zh': 'Feature Chinese people, vibrant modern Chinese cityscapes or traditional motifs.',
                'en': 'Feature a diverse global context with international settings and western-style modern aesthetics.'
            };
            const prompt = `Create a CONCISE image generation prompt in English under 400 characters.
            Style: ${styleGuides[style] || style}
            Locale Context: ${culturalContext[locale] || 'Diverse global context'}
            Content: ${content}
            ${context ? `Additional Context: ${context}` : ''}
            Rules: ONLY prompt text, under 400 chars, single paragraph, no newlines. Focus on cultural authenticity for the ${locale} locale.`;
            const text = await callGemini(prompt);
            return NextResponse.json({ result: text.replace(/[\n\r]+/g, ' ').trim() });
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    } catch (error: any) {
        console.error("AI API Error:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
