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
            console.log(`[AI API] Parsing text (length: ${text.length})...`);
            try {
                let cleaned = text.replace(/```json|```/g, "").trim();
                const firstBrace = cleaned.indexOf('{');
                const lastBrace = cleaned.lastIndexOf('}');

                if (firstBrace !== -1 && lastBrace !== -1) {
                    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
                }

                // Simplified repair: Only escape newlines if it's strictly necessary
                // Most modern Gemini models in JSON mode handle this well now
                try {
                    return JSON.parse(cleaned);
                } catch (e) {
                    console.log("[AI API] Standard JSON.parse failed, attempting repair...");
                    const repaired = cleaned.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
                    // Note: This is a very basic repair. For mission critical, use a JSON repair library.
                    return JSON.parse(repaired);
                }
            } catch (error) {
                console.error("[AI API] Total JSON Parse Failure. Raw text snippet:", text.substring(0, 100));
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
                'minimalism': 'A clean, minimal, warm-toned design with simple shapes, soft shadows, and an elegant, peaceful aesthetic.',
                'paper-cut': 'An artistic paper-cut or collage style illustration. It features layers of textured paper, handcrafted edges, subtle 3D-like shadows between layers, and a warm, emotional, tactile aesthetic (Paper Collage Art).'
            };
            const fullPrompt = `Style: ${styleGuides[style] || style}\n\nTask: Generate an image based on the following description:\n${prompt}`;
            const imageModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

            let lastError;
            for (let i = 0; i < 3; i++) {
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
                    lastError = error;
                    console.error(`Nano Banana Attempt ${i + 1} failed:`, error.message);
                    if (i < 2) await new Promise(resolve => setTimeout(resolve, 1500 * (i + 1))); // Incremental backoff
                }
            }
            return NextResponse.json({ error: "Nano Banana generation failed after retries", details: String(lastError) }, { status: 500 });
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
            const { experience, context, contentType, author } = body;
            const prompt = `너는 사용자의 ‘에세이 파트너’다. 브랜드 보이스: "지식보다 기록을, 확신보다 회고를."
            입력: 경험(${experience}), 맥락(${context}), 유형(${contentType}). 
            장문의 에세이 초안을 JSON 형식으로 작성하라. 분량은 약 1,500자~2,000자 정도로 하되, JSON 구조를 깨뜨리지 않도록 주의하라.
            { 
                "title": "제목 (호기심을 자극하는 문구)", 
                "content": "마크다운(Markdown) 형식의 에세이 본문. 소제목, 리스트, 강조 등을 적절히 사용.", 
                "slug": "url-friendly-slug", 
                "seoTitle": "SEO 제목 (60자 이내)", 
                "seoDescription": "SEO 설명 (160자 이내)" 
            }`;
            const text = await callGemini(prompt, true);
            const data = safeParseJson(text);
            console.log("[AI API] Experience-to-post generation successful");

            // Server-side DB Insertion using Service Role Key to bypass RLS issues/timeouts
            const { createClient } = await import("@supabase/supabase-js");
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL || "",
                process.env.SUPABASE_SERVICE_ROLE_KEY || ""
            );

            const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const groupId = `group-${Date.now()}`;
            const categoryMap: Record<string, string> = {
                '정보형': 'PLANNING',
                '커머스형': 'SHOPPING',
                '이슈형': 'ISSUE'
            };

            const dbRow = {
                group_id: groupId,
                locale: 'ko',
                title: data.title,
                content: data.content,
                excerpt: data.seoDescription?.substring(0, 160) || '',
                slug: data.slug || `post-${Date.now()}`,
                category: categoryMap[contentType] || 'PLANNING',
                tags: ['AI-Partner', '에세이톤', contentType],
                author: {
                    id: author?.id || 'anonymous',
                    name: author?.name || 'Anonymous',
                    photoUrl: author?.photoUrl ?? null
                },
                thumbnail_url: '',
                thumbnail_alt: data.title,
                seo: {
                    metaTitle: data.seoTitle || data.title,
                    metaDesc: data.seoDescription || '',
                    structuredData: {
                        "@context": "https://schema.org",
                        "@type": "BlogPosting",
                        "headline": data.seoTitle || data.title,
                        "datePublished": new Date().toISOString(),
                        "author": {
                            "@type": "Person",
                            "name": author?.name || 'Anonymous'
                        }
                    }
                },
                status: 'draft',
                view_count: 0,
                short_code: shortCode,
                published_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            console.log("[AI API] Inserting post into DB...");
            const { data: inserted, error: dbError } = await supabaseAdmin
                .from('posts')
                .insert([dbRow])
                .select()
                .single();

            if (dbError) {
                console.error("[AI API] DB Insertion Failed:", dbError);
                // We still return the content even if DB fails, but with an error flag
                return NextResponse.json({ ...data, dbError: dbError.message, dbStatus: 'failed' });
            }

            console.log("[AI API] DB Insertion Success:", inserted.id);
            return NextResponse.json({ ...data, dbStatus: 'success', postId: inserted.id });
        }

        if (type === 'image-prompt') {
            const { style, context, locale } = body;
            const styleGuides: Record<string, string> = {
                'photo': 'realistic photograph, professional lighting, high resolution',
                'illustration': 'colorful digital illustration, whimsical, soft edges',
                'minimalism': 'minimal warm design, clean shapes, elegant',
                'paper-cut': 'paper-cut collage art, layered paper texture, handcrafted look, soft overlapping shadows, tactile aesthetic'
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
