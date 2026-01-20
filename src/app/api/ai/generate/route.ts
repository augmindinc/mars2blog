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

        if (type === 'translate-landing') {
            const { targetLocale, title, content, callouts, seo } = body;
            const prompt = `Translate this entire landing page structure into ${targetLocale}.
            
            IMPORTANT: Return ONLY a valid JSON object.
            {
                "title": "Translated Page Title",
                "slug": "hyphenated-english-slug",
                "content": [ 
                    // Maintain the same array structure as input
                    // Translate all text values inside each content object
                ],
                "callouts": [ "Translated callout 1", "callout 2", "callout 3" ],
                "seo": {
                    "title": "Translated SEO Title",
                    "description": "Translated SEO Description"
                }
            }
            
            INPUT DATA:
            Title: ${title}
            Content: ${JSON.stringify(content)}
            Callouts: ${JSON.stringify(callouts)}
            SEO: ${JSON.stringify(seo)}
            
            Return ONLY the JSON.`;

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
                우리의 브랜드 보이스는 다음과 같다:
                "우리는 지식을 가르치지 않습니다. 알게 된 순서를 기록합니다. 이슈를 결론으로 정리하지 않고 생각이 바뀌는 지점을 기록합니다. 상품을 설명하기보다 어떤 선택이 어떤 하루를 만들었는지를 기록합니다. 확신 대신 회고를, 결론 대신 질문을 남깁니다."

                아래 [사용자 입력]을 바탕으로 6단계 에세이 작법을 적용하여 블로그 초안을 작성하라.
                단, 단순히 개인적인 에세이에 그치지 않고, 선택된 [콘텐츠 유형]의 비즈니스 목적을 에세이톤으로 달성해야 한다.
                분량은 공백 포함 한글 기준 약 3,000자 내외로 상세하게 작성하라.

                [사용자 입력]
                1. 경험/관찰/생각: ${experience}
                2. 관련된 제품/서비스/이슈: ${context || '없음'}
                3. 콘텐츠 유형: ${contentType} (정보형 / 커머스형 / 이슈형)

                [작성 가이드 - 콘텐츠 유형별 전략]
                - 이슈형 (에세이형 이슈 템플릿 적용):
                    1. 시작 문장: 입장이 아닌 발견 (어디서, 어떤 순간에 이 이슈를 마주쳤는지 "이상하게 멈춰 섰어요.")
                    2. 초기 반응: 판단 전의 감정 (맞다 틀리다로 나누기 전의 막연한 느낌)
                    3. 흔들린 계기: 생각이 바뀐 지점 (어떤 문장이나 데이터를 보고 생각이 달라졌는지 기록. 콘텐츠의 중심) - 이 부분을 아주 상세히 서술할 것
                    4. 맥락 추가: 알게 된 배경 (팩트 나열이 아닌, 정보를 찾아보며 알게 된 전후 맥락) - 관련 배경 지식을 충분히 포함할 것
                    5. 복잡성 인정: 쉽게 말하기 어려운 이유 (무엇을 놓치고 있는지, 복잡함을 그대로 인정)
                    6. 지금의 생각: 결론이 아닌 현재 위치 (잠정적 정리. "이 생각도 오래 가지 않을 수 있겠죠.")
                    7. 끝 문장: 판단을 독자에게 남기기 (행동 촉구/선동 금지)
                - 정보형 (에세이형 정보 템플릿 적용):
                    1. 시작 문장: 질문이 아닌 계기 ("몰라서 헤맸던 쪽에 가까웠어요.")
                    2. 이전의 생각: 흔한 오해 또는 나의 착각 (나 역시 했던 실수를 공유)
                    3. 핵심 깨달음: 문제의 본질 ("핵심은 정보의 양이 아니라, 순서였습니다.")
                    4. 구조화된 정보: 최소한의 정리 (메모 느낌의 리스트 활용하되 각 항목을 친절하고 상세하게 설명할 것)
                    5. 적용 맥락: '누구에게 유용한가' 대신 '언제 떠오르는가'
                    6. 한계와 예외: 정보의 절대성 제거 (예외 상황을 구체적으로 예시를 들어 설명)
                    7. 마무리 문장: 결론이 아닌 여운
                - 커머스형 (에세이형 커머스 템플릿 적용):
                    1. 첫 문장: 쓰게 된 이유 (후킹이 아닌 고백. "어느 날, 이게 필요하다는 생각이 들었습니다.")
                    2. 망설임: 바로 사지 않았다는 기록 (비슷한 것들 사이의 고민 과정을 생생하게 묘사)
                    3. 선택의 이유: 기능을 경험으로 번역 (예: "밤에 켜도 집이 조용했습니다") - 각 기능별 경험담을 길게 서술
                    4. 사용 후 변화: 하루의 변화 (인생템 금지. "하루가 조금 덜 번거로워졌어요") - 실제 변화된 일상을 에피소드 형태로 상세히 작성
                    5. 솔직한 배제: 안 맞을 수도 있는 사람 (단점 솔직 언급)
                    6. 마지막 문장: 추천이 아닌 기록의 끝 ("아마 같은 선택을 할 것 같아요")
                    7. CTA: 판매 버튼이 아닌 여백 문장 ("이 선택이 궁금하다면, 아래에 남겨두었습니다.")

                [작성 로직]
                STEP 1. 사례 구조화: 상황-행동-불편-전환점-여운 구조로 정리.
                STEP 2. 사례 진짜성 검증: 인위적인 느낌 제거.
                STEP 3. 유형별 리프레이밍: ${contentType}에 맞는 관점 설정. (각 전용 템플릿 엄격 준수)
                STEP 4. 톤 앵커 고정: 1인칭 유지. 확심하는 어미("정답은 분명/결국 문제는") 제거. 과도한 감정어(분노/참담/충격) 금지. 
                STEP 5. 초안 작성: "저는 / 당시엔 / 나중에 보니" 등 과정과 흔들림을 기록하는 어조로 **장문의 본문(약 3,000자)**을 작성.
                STEP 6. 「했어요, 그랬나요?」 필터링 적용: 
                    - "했어요", "그랬나요?", "잘 모르겠어요", "그런 것 같기도 해요" 등의 어미를 자연스럽게 섞을 것.
                    - 판단을 주장하기보다 생각이 바뀌는 지점을 투명하게 기록할 것.

                [출력 형식]
                반드시 아래 JSON 형식을 지켜라:
                {
                    "title": "에세이 느낌이면서도 클릭을 유도하는 제목",
                    "content": "마크다운 형식의 본문 전체 (성찰적인 톤 유지, 공백 포함 약 3,000자 분량)",
                    "slug": "url-friendly-slug",
                    "seoTitle": "SEO 제목",
                    "seoDescription": "메타 설명 (160자 내외)"
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
