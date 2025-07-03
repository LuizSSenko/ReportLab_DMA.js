// Image processing module for extracting GPS data from images

class ImageProcessor {
    constructor() {
        this.processedImages = [];
        this.supportedFormats = ['image/jpeg', 'image/jpg', 'image/tiff'];
    }

    /**
     * Process multiple image files
     */
    async processImages(files) {
        const results = [];
        const totalFiles = files.length;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            try {
                const imageData = await this.extractImageData(file);
                results.push(imageData);
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
                results.push({
                    filename: file.name,
                    error: error.message,
                    size: file.size,
                    type: file.type,
                    hasGPS: false
                });
            }
        }
        
        this.processedImages = results;
        return results;
    }

    /**
     * Extract GPS and metadata from a single image
     */
    extractImageData(file) {
        return new Promise((resolve, reject) => {
            // Check if file type is supported
            if (!this.supportedFormats.includes(file.type)) {
                resolve({
                    filename: file.name,
                    size: file.size,
                    type: file.type,
                    hasGPS: false,
                    error: 'Unsupported file format for GPS extraction'
                });
                return;
            }

            EXIF.getData(file, function() {
                try {
                    const imageData = {
                        filename: file.name,
                        size: file.size,
                        type: file.type,
                        hasGPS: false
                    };

                    // Extract basic EXIF data
                    imageData.camera = EXIF.getTag(this, "Make") || 'Unknown';
                    imageData.model = EXIF.getTag(this, "Model") || 'Unknown';
                    imageData.datetime = EXIF.getTag(this, "DateTime");
                    imageData.orientation = EXIF.getTag(this, "Orientation");

                    // Extract GPS data
                    const lat = EXIF.getTag(this, "GPSLatitude");
                    const lon = EXIF.getTag(this, "GPSLongitude");
                    const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                    const lonRef = EXIF.getTag(this, "GPSLongitudeRef");

                    if (lat && lon && latRef && lonRef) {
                        // Convert DMS to decimal degrees
                        imageData.latitude = AppUtils.convertDMSToDD(lat[0], lat[1], lat[2], latRef);
                        imageData.longitude = AppUtils.convertDMSToDD(lon[0], lon[1], lon[2], lonRef);
                        imageData.hasGPS = true;
                        
                        // Additional GPS data
                        imageData.altitude = EXIF.getTag(this, "GPSAltitude");
                        imageData.altitudeRef = EXIF.getTag(this, "GPSAltitudeRef");
                        imageData.gpsDateStamp = EXIF.getTag(this, "GPSDateStamp");
                        imageData.gpsTimeStamp = EXIF.getTag(this, "GPSTimeStamp");
                    }

                    resolve(imageData);
                } catch (error) {
                    reject(new Error(`Failed to extract EXIF data: ${error.message}`));
                }
            });
        });
    }

    /**
     * Create image preview with metadata
     */
    async createImagePreview(imageData, file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = {
                    ...imageData,
                    dataUrl: e.target.result,
                    thumbnailUrl: e.target.result // For now, use full image
                };
                resolve(preview);
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * Filter images with GPS data
     */
    getImagesWithGPS() {
        return this.processedImages.filter(img => img.hasGPS);
    }

    /**
     * Filter images without GPS data
     */
    getImagesWithoutGPS() {
        return this.processedImages.filter(img => !img.hasGPS);
    }

    /**
     * Get processing statistics
     */
    getStats() {
        const total = this.processedImages.length;
        const withGPS = this.getImagesWithGPS().length;
        const withoutGPS = this.getImagesWithoutGPS().length;
        const errors = this.processedImages.filter(img => img.error).length;

        return {
            total,
            withGPS,
            withoutGPS,
            errors,
            successRate: total > 0 ? (withGPS / total * 100).toFixed(1) : 0
        };
    }

    /**
     * Get all processed images
     */
    getAllImages() {
        return this.processedImages;
    }

    /**
     * Clear processed images
     */
    clear() {
        this.processedImages = [];
    }

    /**
     * Get image data by filename
     */
    getImageByFilename(filename) {
        return this.processedImages.find(img => img.filename === filename);
    }

    /**
     * Export image data to JSON
     */
    exportToJSON() {
        return JSON.stringify(this.processedImages, null, 2);
    }

    /**
     * Validate image file
     */
    validateImageFile(file) {
        const maxSize = 50 * 1024 * 1024; // 50MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff'];
        
        if (file.size > maxSize) {
            throw new Error(`File ${file.name} is too large. Maximum size is 50MB.`);
        }
        
        if (!allowedTypes.includes(file.type)) {
            throw new Error(`File ${file.name} has unsupported format. Supported: JPEG, PNG, TIFF.`);
        }
        
        return true;
    }
}

// Export the class
window.ImageProcessor = ImageProcessor;
