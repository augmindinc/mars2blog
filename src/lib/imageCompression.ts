import imageCompression from 'browser-image-compression';

export async function compressImage(file: File) {
    // If file is smaller than 1MB, we might skip or use very light compression
    // but browser-image-compression handles this well with maxIteration.

    const options = {
        maxSizeMB: 1,            // Target size is 1MB
        maxWidthOrHeight: 1920, // Max resolution
        useWebWorker: true,
        initialQuality: 0.8,
    };

    try {
        const compressedFile = await imageCompression(file, options);
        console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

        // Return compressed file only if it's actually smaller
        return compressedFile.size < file.size ? compressedFile : file;
    } catch (error) {
        console.error('Image compression failed:', error);
        return file; // Fallback to original
    }
}
