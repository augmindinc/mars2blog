/**
 * Ensures the file is in a format compatible with AI processing (PNG/JPG).
 * Specifically converts HEIC/HEIF files to JPEG.
 */
export async function ensureCompatibleImage(file: File | Blob): Promise<Blob | File> {
    if (typeof window === "undefined") return file;

    const type = file.type.toLowerCase();

    if (type.includes("heic") || type.includes("heif")) {
        console.log("[ImageUtils] Converting HEIC to JPEG for compatibility...");
        try {
            // Dynamically import heic2any to avoid SSR "window is not defined" error
            const heic2any = (await import("heic2any")).default;

            const converted = await heic2any({
                blob: file,
                toType: "image/jpeg",
                quality: 0.8
            });

            const resultBlob = Array.isArray(converted) ? converted[0] : converted;
            return resultBlob;
        } catch (error) {
            console.error("[ImageUtils] HEIC conversion failed:", error);
            return file;
        }
    }

    return file;
}
