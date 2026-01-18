"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualIndexUrl = exports.onPostUpdated = exports.onPostCreated = exports.publishScheduledPosts = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const googleapis_1 = require("googleapis");
const generative_ai_1 = require("@google/generative-ai");
const params_1 = require("firebase-functions/params");
admin.initializeApp();
const db = admin.firestore();
// Secret to store the Gemini API Key
const geminiApiKey = (0, params_1.defineSecret)("GEMINI_API_KEY");
// Helper to generate embedding using Gemini
async function generateEmbedding(text, apiKey) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
}
// 1. Scheduled Publish Logic
exports.publishScheduledPosts = (0, scheduler_1.onSchedule)("every 1 minutes", async (event) => {
    const now = admin.firestore.Timestamp.now();
    try {
        const scheduledPostsQuery = db.collection("posts")
            .where("status", "==", "scheduled")
            .where("publishedAt", "<=", now);
        const snapshot = await scheduledPostsQuery.get();
        if (snapshot.empty)
            return;
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, { status: "published", updatedAt: now });
        });
        await batch.commit();
        console.log(`Successfully published ${snapshot.size} posts.`);
    }
    catch (error) {
        console.error("Error publishing scheduled posts:", error);
    }
});
const path = require("path");
// 2. Google Indexing API Notification
async function notifyGoogleIndexing(url) {
    try {
        const keyPath = path.join(__dirname, "..", "mars2blog-fc67bf553699.json");
        const auth = new googleapis_1.google.auth.GoogleAuth({
            keyFile: keyPath,
            scopes: ["https://www.googleapis.com/auth/indexing"],
        });
        const authClient = await auth.getClient();
        const indexing = googleapis_1.google.indexing({ version: "v3", auth: authClient });
        const res = await indexing.urlNotifications.publish({
            requestBody: {
                url: url,
                type: "URL_UPDATED",
            },
        });
        console.log(`Google Indexing API response for ${url}:`, res.data);
    }
    catch (error) {
        console.error(`Failed to notify Google Indexing for ${url}:`, error);
    }
}
exports.onPostCreated = (0, firestore_1.onDocumentCreated)({
    document: "posts/{postId}",
    secrets: [geminiApiKey]
}, async (event) => {
    var _a, _b;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    // 1. Generate and save embedding
    try {
        const textToEmbed = `${data.title}\n\n${data.excerpt || ""}\n\n${data.content.substring(0, 1000)}`;
        const embedding = await generateEmbedding(textToEmbed, geminiApiKey.value());
        await ((_b = event.data) === null || _b === void 0 ? void 0 : _b.ref.update({ embedding: embedding }));
        console.log(`Embedding generated for post: ${data.title}`);
    }
    catch (error) {
        console.error("Error generating embedding on create:", error);
    }
    // 2. Google Indexing
    if (data.status === "published" && data.slug) {
        const baseUrl = "https://mars.it.kr";
        const url = `${baseUrl}/ko/blog/${data.slug}`;
        await notifyGoogleIndexing(url);
    }
});
exports.onPostUpdated = (0, firestore_1.onDocumentUpdated)({
    document: "posts/{postId}",
    secrets: [geminiApiKey]
}, async (event) => {
    var _a, _b, _c;
    const newData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after.data();
    const oldData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.before.data();
    if (!newData || !oldData)
        return;
    // 1. Check if embedding needs update (title, excerpt, or content changed)
    const contentChanged = newData.title !== oldData.title ||
        newData.excerpt !== oldData.excerpt ||
        newData.content !== oldData.content;
    if (contentChanged || !newData.embedding) {
        try {
            const textToEmbed = `${newData.title}\n\n${newData.excerpt || ""}\n\n${newData.content.substring(0, 1000)}`;
            const embedding = await generateEmbedding(textToEmbed, geminiApiKey.value());
            await ((_c = event.data) === null || _c === void 0 ? void 0 : _c.after.ref.update({ embedding: embedding }));
            console.log(`Embedding updated for post: ${newData.title}`);
        }
        catch (error) {
            console.error("Error generating embedding on update:", error);
        }
    }
    // 2. Trigger indexing if status changed to published or slug changed while published
    if ((newData.status === "published" && oldData.status !== "published") ||
        (newData.status === "published" && newData.slug !== oldData.slug)) {
        const baseUrl = "https://mars.it.kr";
        const url = `${baseUrl}/ko/blog/${newData.slug}`;
        await notifyGoogleIndexing(url);
    }
});
const https_1 = require("firebase-functions/v2/https");
exports.manualIndexUrl = (0, https_1.onCall)({ region: "us-central1", cors: true }, async (request) => {
    // 보안: 로그인한 사용자만 호출 가능하도록 체크
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "인증된 사용자만 접근 가능합니다.");
    }
    const { url } = request.data;
    if (!url) {
        throw new https_1.HttpsError("invalid-argument", "URL이 제공되지 않았습니다.");
    }
    try {
        await notifyGoogleIndexing(url);
        return { message: `Successfully requested indexing for ${url}` };
    }
    catch (error) {
        throw new https_1.HttpsError("internal", error.message);
    }
});
//# sourceMappingURL=index.js.map