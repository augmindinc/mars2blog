/**
 * Enhances an image using Canvas filters.
 * Applies brightness, contrast, and saturation to make photos look "vivid".
 */
export async function enhanceImage(file: File | Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            canvas.width = img.width;
            canvas.height = img.height;

            // Apply "Vivid/Bright" filters
            // Brightness +10%, Contrast +15%, Saturation +20%
            ctx.filter = 'brightness(1.1) contrast(1.15) saturate(1.2)';
            ctx.drawImage(img, 0, 0);

            const outputType = file.type || 'image/png';
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas toBlob failed'));
                }
            }, outputType, outputType === 'image/jpeg' ? 0.9 : undefined);
        };

        img.onerror = () => reject(new Error('Image load failed'));
        reader.readAsDataURL(file);
    });
}
