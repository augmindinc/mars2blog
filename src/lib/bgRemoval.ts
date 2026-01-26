import { removeBackground, Config } from "@imgly/background-removal";

/**
 * Removes the background from an image.
 * Uses @imgly/background-removal which runs in the browser/client-side.
 * @param imageSource The image file or URL to process.
 * @returns A Promise that resolves to a Blob of the processed image (PNG with transparency).
 */
export async function removeImageBackground(imageSource: File | Blob | string | URL): Promise<Blob> {
    const config: Config = {
        progress: (status, progress) => {
            console.log(`[BG Removal] ${status}: ${Math.round(progress * 100)}%`);
        },
        output: {
            format: "image/png",
            quality: 0.8,
        }
    };

    try {
        const blob = await removeBackground(imageSource, config);
        return blob;
    } catch (error) {
        console.error("Background removal failed:", error);
        throw error;
    }
}
