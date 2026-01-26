import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, getBlob } from 'firebase/storage';

/**
 * Moves a file from one Storage location to another.
 * Since Firebase Client SDK doesn't support 'move', we download and re-upload.
 */
async function moveFile(sourceUrl: string, targetPath: string): Promise<string> {
    if (!sourceUrl.includes('firebasestorage.googleapis.com') && !sourceUrl.includes('firebasestorage.app')) {
        return sourceUrl; // Not a Firebase Storage URL
    }

    try {
        const sourceRef = ref(storage, sourceUrl);

        // 1. Download
        const blob = await getBlob(sourceRef);

        // 2. Upload to new path
        const targetRef = ref(storage, targetPath);
        await uploadBytes(targetRef, blob);

        // 3. Get new URL
        const newUrl = await getDownloadURL(targetRef);

        // 4. Delete old file
        await deleteObject(sourceRef);

        console.log(`[StorageFinalizer] Moved file to: ${targetPath}`);
        return newUrl;
    } catch (error) {
        console.error("[StorageFinalizer] Error moving file:", error);
        return sourceUrl; // Fallback to original if move fails
    }
}

/**
 * Processes a string (Markdown/HTML) and replaces all images in 'temp/' with permanent paths.
 */
export async function finalizeContentImages(content: string, postPath: string): Promise<string> {
    let updatedContent = content;

    // Regex to find images in temp/
    // Matches ![alt](url) and <img src="url">
    const tempUrlRegex = /(https?:\/\/(firebasestorage\.googleapis\.com|firebasestorage\.app)\/v0\/b\/[^?#]+\/o\/temp%2F[^?#]+(?:\?[^#]*)?)/g;

    const matches = Array.from(content.matchAll(tempUrlRegex));
    if (matches.length === 0) return content;

    console.log(`[StorageFinalizer] Found ${matches.length} temporary images in content.`);

    for (const match of matches) {
        const tempUrl = match[0];
        // Extract filename from URL (it's encoded between %2F and ?)
        const filenameMatch = tempUrl.match(/%2F([^?]+)\?/);
        const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : `image-${Date.now()}.png`;

        const permanentPath = `${postPath}/${filename}`;
        const permanentUrl = await moveFile(tempUrl, permanentPath);

        updatedContent = updatedContent.replaceAll(tempUrl, permanentUrl);
    }

    return updatedContent;
}

/**
 * Finalizes a single image URL (e.g., thumbnail) if it's in temp/.
 */
export async function finalizeSingleImage(url: string | undefined, targetPath: string): Promise<string | undefined> {
    if (!url || !url.includes('/temp%2F')) return url;

    const filenameMatch = url.match(/%2F([^?]+)\?/);
    const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : `thumb-${Date.now()}.png`;

    return await moveFile(url, `${targetPath}/${filename}`);
}
