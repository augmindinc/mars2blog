import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { google } from "googleapis";

admin.initializeApp();

const db = admin.firestore();

// 1. Scheduled Publish Logic
export const publishScheduledPosts = onSchedule("every 1 minutes", async (event) => {
    const now = admin.firestore.Timestamp.now();
    try {
        const scheduledPostsQuery = db.collection("posts")
            .where("status", "==", "scheduled")
            .where("publishedAt", "<=", now);

        const snapshot = await scheduledPostsQuery.get();
        if (snapshot.empty) return;

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, { status: "published", updatedAt: now });
        });

        await batch.commit();
        console.log(`Successfully published ${snapshot.size} posts.`);
    } catch (error) {
        console.error("Error publishing scheduled posts:", error);
    }
});

import * as path from "path";

// 2. Google Indexing API Notification
async function notifyGoogleIndexing(url: string) {
    try {
        const keyPath = path.join(__dirname, "..", "mars2blog-fc67bf553699.json");
        const auth = new google.auth.GoogleAuth({
            keyFile: keyPath,
            scopes: ["https://www.googleapis.com/auth/indexing"],
        });

        const authClient = await auth.getClient();
        const indexing = google.indexing({ version: "v3", auth: authClient as any });

        const res = await indexing.urlNotifications.publish({
            requestBody: {
                url: url,
                type: "URL_UPDATED",
            },
        });

        console.log(`Google Indexing API response for ${url}:`, res.data);
    } catch (error) {
        console.error(`Failed to notify Google Indexing for ${url}:`, error);
    }
}

export const onPostCreated = onDocumentCreated("posts/{postId}", async (event) => {
    const data = event.data?.data();
    if (!data) return;

    if (data.status === "published" && data.slug) {
        const baseUrl = "https://mars.it.kr"; // Updated to custom domain
        const url = `${baseUrl}/ko/blog/${data.slug}`;
        await notifyGoogleIndexing(url);
    }
});

export const onPostUpdated = onDocumentUpdated("posts/{postId}", async (event) => {
    const newData = event.data?.after.data();
    const oldData = event.data?.before.data();
    if (!newData || !oldData) return;

    // Trigger indexing if status changed to published or slug changed while published
    if (
        (newData.status === "published" && oldData.status !== "published") ||
        (newData.status === "published" && newData.slug !== oldData.slug)
    ) {
        const baseUrl = "https://mars.it.kr";
        const url = `${baseUrl}/ko/blog/${newData.slug}`;
        await notifyGoogleIndexing(url);
    }
});
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const manualIndexUrl = onCall({ region: "us-central1", cors: true }, async (request) => {
    // 보안: 로그인한 사용자만 호출 가능하도록 체크
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "인증된 사용자만 접근 가능합니다.");
    }

    const { url } = request.data;
    if (!url) {
        throw new HttpsError("invalid-argument", "URL이 제공되지 않았습니다.");
    }

    try {
        await notifyGoogleIndexing(url);
        return { message: `Successfully requested indexing for ${url}` };
    } catch (error) {
        throw new HttpsError("internal", (error as Error).message);
    }
});
