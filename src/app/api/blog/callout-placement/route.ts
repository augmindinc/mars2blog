import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(req: Request) {
    try {
        const { content, callouts } = await req.json();

        const prompt = `
You are a content optimization assistant. 
Your task is to identify the most natural and effective position within a blog post to insert a promotional callout message.
The goal is to maximize click-through rate without disrupting the reading experience.

BLOG CONTENT (Markdown):
${content}

AVAILABLE CALLOUT MESSAGES:
${callouts.map((c: string, i: number) => `${i}: ${c}`).join('\n')}

Instructions:
1. Analyze the content sentiment and context.
2. Choose the ONE callout message that fits best with the overall theme.
3. Identify the best paragraph index (0-based) to insert the callout AFTER. 
   - A blog post is split by double newlines (\n\n) into paragraphs.
   - Choose an index where the transition is smooth (e.g., after a problem is stated, or before a conclusion).

Return ONLY a JSON object:
{
  "paragraphIndex": number,
  "selectedCalloutIndex": number
}

Example: { "paragraphIndex": 2, "selectedCalloutIndex": 1 }
`;

        let text = "";
        let lastError;
        for (let i = 0; i < 3; i++) {
            try {
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                });
                text = result.response.text();
                break;
            } catch (error: any) {
                lastError = error;
                console.error(`Callout placement attempt ${i + 1} failed:`, error.message);
                if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (!text) throw lastError;

        const responseText = text;

        // Helper for robust JSON parsing
        const safeParseJson = (text: string) => {
            try {
                let cleaned = text.replace(/```json|```/g, "").trim();
                const start = cleaned.indexOf('{');
                const end = cleaned.lastIndexOf('}');
                if (start !== -1 && end !== -1) {
                    cleaned = cleaned.substring(start, end + 1);
                }
                return JSON.parse(cleaned);
            } catch (error) {
                console.error("Callout Placement JSON Parse Error:", error);
                throw error;
            }
        };

        const placement = safeParseJson(responseText);

        return NextResponse.json(placement);
    } catch (error) {
        console.error("AI Placement Error:", error);
        return NextResponse.json({ error: "Failed to determine placement" }, { status: 500 });
    }
}
