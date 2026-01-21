import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const { content, instruction, selection } = await req.json();

        // Using Gemini 2.0 Flash
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        let prompt = "";

        if (selection) {
            prompt = `
                너는 전문 에디터이자 문장 교정 전문가다. 
                사용자가 작성한 전체 본문의 맥락을 이해하고, [선택된 부분]을 사용자의 [요청]에 맞춰 수정하라.

                [전체 본문 (참고용)]
                ${content}

                [선택된 부분 (수정 대상)]
                ${selection.text}

                [사용자 요청]
                ${instruction}

                [지시사항]
                1. [선택된 부분]만 수정하여 "improvedText" 필드에 담아라.
                2. 전체 본문의 맥락과 어조(Mars 브랜드 보이스: 에세이 톤)를 유지하라.
                3. 수정된 내용에 대한 짧은 설명을 "message"에 담아라.

                반드시 아래 JSON 형식을 지켜라:
                {
                    "improvedText": "수정된 문구",
                    "message": "수정 사항 설명",
                    "result": true
                }
            `;
        } else {
            prompt = `
                너는 전문 에디터이자 문장 교정 전문가다. 
                사용자가 작성한 본문을 사용자의 [요청]에 맞춰 전체적으로 교정하라.

                [본문]
                ${content}

                [사용자 요청]
                ${instruction}

                [지시사항]
                1. 본문 전체를 교정하여 "updatedContent" 필드에 담아라.
                2. Mars 브랜드 보이스(에세이 톤, 했어요/그랬나요 등)를 적용하라.

                반드시 아래 JSON 형식을 지켜라:
                {
                    "updatedContent": "교정된 전체 본문",
                    "message": "수정 사항 설명",
                    "result": true
                }
            `;
        }

        let result;
        let lastError;
        const maxRetries = 3;

        for (let i = 0; i < maxRetries; i++) {
            try {
                result = await model.generateContent(prompt);
                break; // Success!
            } catch (error: any) {
                lastError = error;
                console.error(`Attempt ${i + 1} failed:`, error.message);
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
                }
            }
        }

        if (!result) {
            throw lastError || new Error("AI generation failed after retries");
        }

        const responseText = result.response.text();

        try {
            // Finding the JSON part just in case
            let cleaned = responseText.trim();
            const start = cleaned.indexOf('{');
            const end = cleaned.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                cleaned = cleaned.substring(start, end + 1);
            }
            return NextResponse.json(JSON.parse(cleaned));
        } catch (e) {
            console.error("Parse error in proofread API:", responseText);
            return NextResponse.json({
                result: false,
                error: "AI 응답 파싱 실패",
                rawResponse: responseText
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Proofread API Final Error:", error);
        return NextResponse.json({
            result: false,
            error: error.message || "Unknown error occurred"
        }, { status: 500 });
    }
}
