import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(req: Request) {
    try {
        const { goal, type } = await req.json();

        const prompt = `
You are an elite conversion rate optimization (CRO) expert and landing page architect.
Your task is to generate a high-conversion landing page structure and content based on the user's goal.

GOAL: ${goal}
CONVERSION TYPE: ${type}

The response MUST be a valid JSON array of section objects. 
Each section object must strictly follow this structure:
{
  "id": "random_string",
  "type": "hero" | "problem" | "solution" | "features" | "process" | "social_proof" | "pricing" | "faq" | "cta_form" | "footer",
  "content": { ... type-specific content ... }
}

Type-specific content structures:
- hero: { "title": string, "subtitle": string, "badge": string, "buttonText": string }
- problem: { "title": string, "subtitle": string, "points": string[] }
- solution: { "title": string, "subtitle": string, "items": [{ "title": string, "description": string }] }
- features: { "items": [{ "title": string, "description": string }] }
- process: { "title": string, "steps": [{ "title": string, "description": string }] }
- social_proof: { "logos": string[], "testimonials": [{ "text": string, "author": string, "role": string }] }
- pricing: { "title": string, "plans": [{ "name": string, "price": string, "features": string[], "recommended": boolean }] }
- faq: { "title": string, "items": [{ "q": string, "a": string }] }
- cta_form: { "title": string, "subtitle": string, "buttonText": string, "fields": [{ "id": string, "type": "text" | "email", "label": string, "placeholder": string, "required": boolean }] }
- footer: { "company": string, "links": [{ "label": string, "url": string }], "copyright": string }

Guidelines:
1. Be creative and professional. Use persuasive copywriting.
2. Ensure the flow of sections makes sense for the goal (e.g., Problem -> Solution -> Features -> Social Proof -> CTA).
3. Return ONLY the JSON array. No markdown, no extra text.

Example Flow:
[
  { "id": "h1", "type": "hero", "content": { "title": "...", "subtitle": "...", "badge": "...", "buttonText": "..." } },
  ...
]
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown code blocks if AI included them
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        const sections = JSON.parse(text);

        return NextResponse.json({ sections });
    } catch (error) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({ error: "Failed to generate landing page" }, { status: 500 });
    }
}
