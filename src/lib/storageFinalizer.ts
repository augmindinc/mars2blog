import { supabase } from './supabase';

/**
 * Moves a file from one Storage location to another in Supabase.
 * Unlike Firebase Client SDK, Supabase supports 'copy' directly.
 */
async function moveFile(sourceUrl: string, targetPath: string): Promise<string> {
    if (!sourceUrl.includes('supabase.co')) {
        return sourceUrl; // Not a Supabase Storage URL
    }

    try {
        // Extract bucket and path from URL
        // Example: https://[project-id].supabase.co/storage/v1/object/public/[bucket]/[path]
        const urlObj = new URL(sourceUrl);
        const pathParts = urlObj.pathname.split('/public/')[1]?.split('/');
        if (!pathParts) return sourceUrl;

        const bucket = pathParts[0];
        const sourcePath = pathParts.slice(1).join('/');

        // 1. Copy
        const { error: copyError } = await supabase.storage
            .from(bucket)
            .copy(sourcePath, targetPath);

        if (copyError) throw copyError;

        // 2. Get new URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(targetPath);

        // 3. Delete old file
        const { error: deleteError } = await supabase.storage
            .from(bucket)
            .remove([sourcePath]);

        if (deleteError) {
            console.warn("[StorageFinalizer] Error deleting source file after copy:", deleteError);
        }

        console.log(`[StorageFinalizer] Moved file to: ${targetPath}`);
        return publicUrl;
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
    const tempUrlRegex = /(https?:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/[^/]+\/temp\/[^?#\s"]+)/g;

    const matches = Array.from(content.matchAll(tempUrlRegex));
    if (matches.length === 0) return content;

    console.log(`[StorageFinalizer] Found ${matches.length} temporary images in content.`);

    for (const match of matches) {
        const tempUrl = match[0];
        // Extract filename from URL
        const urlParts = tempUrl.split('/');
        const filename = urlParts[urlParts.length - 1];

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
    if (!url || !url.includes('/temp/')) return url;

    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];

    return await moveFile(url, `${targetPath}/${filename}`);
}
