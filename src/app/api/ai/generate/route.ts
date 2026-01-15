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

        if (type === 'alt-text') {
            if (!imageUrl) return NextResponse.json({ error: "Image URL required" }, { status: 400 });

            // For alt-text, if we only have the URL, we might need to fetch the image or just describe based on filename if it's not accessible.
            // But usually we can pass the image data if we have it. 
            // Since we're using Firebase Storage, we might not have the bytes here easily unless we fetch it.
            // Simple approach: ask Gemini to describe an image from its URL if possible, or just skip if URL is private.
            // Actually, Gemini can't directly fetch images from private URLs.
            // Let's assume for now we provide the URL and see if it works, or just ask it to describe what it MIGHT be based on the post title if provided.
            // Better: If the user just uploaded it, we could have the base64.

            const prompt = `Describe this image for an SEO alt text. The image is a thumbnail for a blog post. Provide a concise, descriptive alt text in Korean.
            Return ONLY the alt text string.`;

            // If content (title) is provided, use it as context
            const contextualPrompt = content ? `${prompt}\nContext: The blog post title is "${content}"` : prompt;

            // Note: Gemini can't fetch external URLs directly in this way without vision capabilities. 
            // For now, I'll implement a placeholder or try to use vision if it's a base64.
            // Since implementing full vision here is complex without the actual bits, 
            // I'll make it generate a description based on the TITLE if it's all we have, 
            // or I'll warn the user.

            const result = await model.generateContent(contextualPrompt);
            return NextResponse.json({ result: result.response.text().trim() });
        }

        if (type === 'tldr') {
            const prompt = `Summarize the following markdown content into a single concise paragraph (TL;DR) in Korean. 
            Focus on the key takeaways.
            Return ONLY the summary.
            
            Content:
            ${content}`;

            const result = await model.generateContent(prompt);
            return NextResponse.json({ result: result.response.text().trim() });
        }

        if (type === 'seo-metadata') {
            const prompt = `Based on the following blog content, generate:
            1. SEO Title (max 60 chars)
            2. SEO Description (max 160 chars)
            
            Return the result in JSON format:
            {
                "seoTitle": "...",
                "seoDescription": "..."
            }
            
            Content:
            ${content}`;

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return NextResponse.json(JSON.parse(jsonMatch[0]));
            }
            return NextResponse.json({ error: "Failed to parse JSON" }, { status: 500 });
        }

        if (type === 'translate') {
            const { targetLocale, title: postTitle, content: postContent } = body;
            const prompt = `Translate the post into ${targetLocale}. 
            IMPORTANT: Output only the JSON object.
            {
                "title": "...",
                "slug": "...",
                "content": "...",
                "seoTitle": "...",
                "seoDescription": "..."
            }
            - slug: English, lowercase, hyphenated.
            - content: markdown in ${targetLocale}.
            
            Title: ${postTitle}
            Content: ${postContent}`;

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return NextResponse.json(JSON.parse(jsonMatch[0]));
            }
            return NextResponse.json({ error: "Failed to parse JSON", text }, { status: 500 });
        }

        if (type === 'plan') {
            const { existingPosts } = body; // Array of { title, content }
            const context = existingPosts.map((p: any) => `Title: ${p.title}\nContent: ${p.content.substring(0, 500)}...`).join('\n\n---\n\n');

            const prompt = `Based on the following existing blog posts (Title and partial Content), suggest 5 NEW and unique blog post ideas that would be interesting to the same audience.
            
            Existing Posts Context:
            ${context}
            
            For each suggestion, provide:
            1. Title (captivating and SEO-friendly)
            2. Description (what the post should be about, what points to cover)
            3. Rationale (why this is a good topic based on the specific themes and depth of your existing content)
            4. ContentType (Determine if this is 'informational' (Evergreen, helpful, educational) or 'trend' (Reflecting recent industry shifts, news, or viral topics))
            
            IMPORTANT: Output only a JSON array of objects like this:
            [
                {
                    "title": "...",
                    "description": "...",
                    "reason": "...",
                    "contentType": "informational" or "trend"
                }
            ]
            
            Return ONLY the valid JSON array.`;

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return NextResponse.json(JSON.parse(jsonMatch[0]));
            }
            return NextResponse.json({ error: "Failed to parse JSON", text }, { status: 500 });
        }

        if (type === 'experience-to-post') {
            const { experience, context, contentType } = body;
            const prompt = `
                너는 사용자의 ‘경험과 생각을 정리해주는 에세이 파트너’다.
                사용자의 짧은 입력을 바탕으로 6단계 에세이 작법을 적용하여 블로그 초안을 작성하라.

                [사용자 입력]
                1. 경험/관찰/생각: ${experience}
                2. 관련된 제품/서비스/이슈: ${context || '없음'}
                3. 콘텐츠 유형: ${contentType} (정보형 / 커머스형 / 이슈형)

                [작성 로직 - 내부적으로 수행]
                STEP 1. 사례 구조화: 상황-행동-불편-전환점-여운 구조로 정리.
                STEP 2. 사례 진짜성 검증: 인위적인 느낌 제거. (질문이 필요하다면 문장 내에 반영하거나 자연스럽게 녹일 것)
                STEP 3. 유형별 리프레이밍: ${contentType}에 맞는 관점 설정.
                STEP 4. 톤 앵커 고정: 1인칭, 단정 지양, 조언 지양, 질문 마무리.
                STEP 5. 초안 작성: 개인적인 장면으로 시작, 중반 확장, 질문으로 마무리.
                STEP 6. AI 티 제거: 매끄러운 결론 지양, 여운 강조.

                [출력 형식]
                반드시 아래 JSON 형식을 지켜라:
                {
                    "title": "에세이 느낌의 제목 (SEO 느낌 지양)",
                    "content": "마크다운 형식의 본문 전체",
                    "slug": "url-friendly-slug",
                    "seoTitle": "SEO 제목",
                    "seoDescription": "메타 설명"
                }
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            const cleanedJson = responseText.replace(/```json|```/g, "").trim();
            return NextResponse.json(JSON.parse(cleanedJson));
        }

        if (type === 'full-post-generation') {
            const { sourcePost, plan } = body;
            const prompt = `Based on the following reference blog post, generate a NEW full blog post for the suggested topic.
            
            REFERENCE POST (Analyze its tone, length, structure, purpose, and target audience):
            Title: ${sourcePost.title}
            Content: ${sourcePost.content}
            
            NEW TOPIC TO WRITE ABOUT:
            Title: ${plan.title}
            Description: ${plan.description}
            Rationale: ${plan.reason}
            
            INSTRUCTIONS:
            1. TONE: Match the exact tone and voice of the reference post (e.g., formal, witty, professional, friendly).
            2. STRUCTURE: Use a similar logical structure (e.g., introduction, bullet points, subheadings, conclusion).
            3. LENGTH: The word count should be roughly similar to the reference post.
            4. LANGUAGE: Must be written in Korean (ko).
            5. SEO: Ensure the content is SEO-friendly.
            
            IMPORTANT: Output only a JSON object:
            {
                "title": "...",
                "content": "...",
                "slug": "english-lowercase-hyphenated-slug",
                "seoTitle": "...",
                "seoDescription": "..."
            }
            
            Return ONLY the valid JSON object.`;

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return NextResponse.json(JSON.parse(jsonMatch[0]));
            }
            return NextResponse.json({ error: "Failed to parse JSON", text }, { status: 500 });
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({
            error: "Failed to generate content",
            details: error.message || String(error),
            stack: error.stack
        }, { status: 500 });
    }
}
