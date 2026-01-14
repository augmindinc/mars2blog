"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualIndexUrl = exports.onPostUpdated = exports.onPostCreated = exports.publishScheduledPosts = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const googleapis_1 = require("googleapis");
admin.initializeApp();
const db = admin.firestore();
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
exports.onPostCreated = (0, firestore_1.onDocumentCreated)("posts/{postId}", async (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    if (data.status === "published" && data.slug) {
        const baseUrl = "https://mars.it.kr"; // Updated to custom domain
        const url = `${baseUrl}/ko/blog/${data.slug}`;
        await notifyGoogleIndexing(url);
    }
});
exports.onPostUpdated = (0, firestore_1.onDocumentUpdated)("posts/{postId}", async (event) => {
    var _a, _b;
    const newData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after.data();
    const oldData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.before.data();
    if (!newData || !oldData)
        return;
    // Trigger indexing if status changed to published or slug changed while published
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