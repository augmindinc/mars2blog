import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(req: Request) {
    try {
        const { content } = await req.json();

        const prompt = `
You are a world-class marketing copywriter specializing in high-conversion callout messages.
Based on the provided landing page content, generate 3 unique, catchy, and persuasive callout messages (short phrases or sentences) that would encourage a blog post reader to click and visit this landing page.

LANDING PAGE CONTENT:
${JSON.stringify(content)}

The response MUST be a valid JSON array of exactly 3 strings.
Example: ["Ready to transform your workflow?", "Download our free guide to mastering Next.js.", "Join 5,000+ experts who have leveled up their career."]

Return ONLY the JSON array. No markdown, no extra text.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown code blocks if AI included them
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        const callouts = JSON.parse(text);

        return NextResponse.json({ callouts: Array.isArray(callouts) ? callouts.slice(0, 3) : [] });
    } catch (error) {
        console.error("AI Callout Generation Error:", error);
        return NextResponse.json({ error: "Failed to generate callouts" }, { status: 500 });
    }
}
