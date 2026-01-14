import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI("AIzaSyA2XT6tAEmI5hmiyH9lsk9NI8paYfLDrNM");

export async function POST(req: Request) {
    try {
        const { title } = await req.json();

        if (!title) {
            return NextResponse.json({ slug: "" });
        }

        // Use the requested model
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const prompt = `Convert the following blog post title into an optimized English URL slug.
        
        Rules:
        1. If the title is not in English, translate it into natural English based on its MEANING (e.g., "게시글" should become "post", not "gesiggeul").
        2. Use lowercase letters only.
        3. Replace spaces and all special characters with hyphens (-).
        4. Keep it concise, descriptive, and SEO-friendly.
        5. Return ONLY the slug string itself, with no explanations, quotes, or additional text.
        6. If the title is already English, just slugify it naturally.
        
        Title: "${title}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const slug = response.text().trim();

        return NextResponse.json({ slug });
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        return NextResponse.json({
            error: "Failed to generate slug",
            details: error.message || String(error)
        }, { status: 500 });
    }
}
