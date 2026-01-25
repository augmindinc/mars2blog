import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(req: Request) {
  try {
    const { goal, type } = await req.json();

    const prompt = `
You are an elite conversion rate optimization (CRO) expert and landing page architect.
Your task is to generate a high-conversion landing page structure and content based on a blog post.

[BLOG CONTENT / GOAL]
${goal}

[CONVERSION TYPE]
${type}

### MISSION
Create a landing page that converts 100 micro-targeted users who just finished reading the blog content.
**ALL OUTPUT CONTENT MUST BE IN KOREAN.**

### LANDING PAGE GENERATION RULES

1. HYPER-SPECIFIC PERSONA DEFINITION:
- Define the user in ONE sentence. It must be specific (not "everyone", but "this exact person").
- Use this persona to dictate the tone of all sections.

2. STRUCTURE (MUST FOLLOW THIS ORDER):
- [1] Hero Section: Immediate continuity from the blog. "Exactly what you were looking for" feel.
- [2] Problem Resonance: Verbalize the user's unarticulated frustrations. 3-5 sharp points.
- [3] Solution Presentation: Why traditional ways fail and why this works. Focus on worldview/logic, not just features.
- [4] Micro-Conversion: Low-friction action (preview, template, sample). Explain why this leads to purchase.
- [5] Social Proof: Focus on elite/limited groups (e.g., "100 pioneers"). Specific changes/numbers.
- [6] Urgency & Scarcity: Time/People/Condition-based trigger. What they lose by waiting.
- [7] Final CTA: No "Buy" button. Use action-oriented copy with a reassurance line.

3. TONE & STYLE:
- Convince, don't just explain.
- One paragraph = One message.
- "I decided this," not "I was persuaded."

### OUTPUT FORMAT
The response MUST be a valid JSON object:
{
  "suggestedSlug": "url-friendly-english-slug",
  "sections": [
    {
      "id": "random_string",
      "type": "hero" | "problem" | "solution" | "features" | "process" | "social_proof" | "pricing" | "faq" | "cta_form" | "footer",
      "content": { ... type-specific content ... }
    }
  ]
}

**CRITICAL: ALL content within 'sections' must be in KOREAN.**
**'suggestedSlug' must be in URL-friendly English (lowercase, dashes).**

Type-specific content structures (STRICTLY FOLLOW THESE KEYS):
- hero: { "title": string, "subtitle": string, "badge": string, "buttonText": string, "imageUrl": string, "imageKeywords": string }
- problem: { "title": string, "subtitle": string, "points": string[], "imageUrl": string, "imageKeywords": string }
- solution: { "title": string, "subtitle": string, "items": [{ "title": string, "description": string, "imageUrl": string, "imageKeywords": string }] }
- features: { "items": [{ "title": string, "description": string, "imageUrl": string, "imageKeywords": string }] }
- process: { "title": string, "steps": [{ "title": string, "description": string }] }
- social_proof: { "testimonials": [{ "text": string, "author": string, "role": string, "avatarUrl": string, "imageKeywords": string }] }
- cta_form: { "title": string, "subtitle": string, "buttonText": string, "fields": [{ "id": string, "type": "text" | "email", "label": string, "placeholder": string, "required": boolean }] }

**IMAGE GUIDELINES:**
For 'imageUrl' and 'avatarUrl', use high-quality placeholder URLs from Unsplash (e.g., https://images.unsplash.com/photo-...).
**IMPORTANT**: For every section WITH an image, you MUST provide 'imageKeywords' (3-5 English keywords describing the ideal visual context, e.g., "minimalist diary, cozy desk, morning light").
Choose images that match the persona and the professional/luxury tone of the blog.

Mapping Instructions:
- Section [1] -> type: "hero" (badge: context continuity)
- Section [2] -> type: "problem" (direct resonance)
- Section [3] -> type: "solution" (worldview shift)
- Section [4] -> type: "features" (micro-conversion benefits)
- Section [5] -> type: "social_proof" (elite community proof)
- Section [6] -> type: "process" (urgency/scarcity steps)
- Section [7] -> type: "cta_form" (Final conversion action)

Return ONLY the JSON array. No markdown, no extra text.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up markdown code blocks if AI included them
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const data = JSON.parse(text);
    const sections = data.sections || [];
    const suggestedSlug = data.suggestedSlug || "";

    return NextResponse.json({ sections, suggestedSlug });
  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate landing page" }, { status: 500 });
  }
}
