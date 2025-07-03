// Utility functions for the application

/**
 * Convert GPS coordinates from degrees/minutes/seconds to decimal degrees
 */
function convertDMSToDD(degrees, minutes, seconds, direction) {
    let dd = degrees + minutes / 60 + seconds / 3600;
    if (direction === "S" || direction === "W") {
        dd = dd * -1;
    }
    return dd;
}

/**
 * Format coordinates for display
 */
function formatCoordinates(lat, lon) {
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'No date available';
    
    try {
        // EXIF date format: "YYYY:MM:DD HH:MM:SS"
        const formattedDate = dateString.replace(/:/g, '-').replace(/-(\d{2}:\d{2}:\d{2})/, ' $1');
        const date = new Date(formattedDate);
        
        if (isNaN(date.getTime())) {
            return dateString; // Return original if parsing fails
        }
        
        return date.toLocaleString();
    } catch (error) {
        return dateString;
    }
}

/**
 * Debounce function to limit function calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Show loading overlay
 */
function showLoading(text = 'Processing...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.querySelector('.loading-text');
    loadingText.textContent = text;
    overlay.style.display = 'flex';
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'none';
}

/**
 * Update progress bar
 */
function updateProgress(percentage, text = '') {
    const progressFill = document.getElementById('progressFill');
    const statusText = document.getElementById('statusText');
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    
    if (statusText && text) {
        statusText.textContent = text;
    }
}

/**
 * Show status section
 */
function showStatus() {
    const statusSection = document.getElementById('statusSection');
    statusSection.style.display = 'block';
}

/**
 * Hide status section
 */
function hideStatus() {
    const statusSection = document.getElementById('statusSection');
    statusSection.style.display = 'none';
}

/**
 * Show results section
 */
function showResults() {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.style.display = 'block';
}

/**
 * Generate a unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Validate GeoJSON structure
 */
function validateGeoJSON(data) {
    try {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid GeoJSON: Not an object');
        }
        
        if (data.type !== 'FeatureCollection' && data.type !== 'Feature') {
            throw new Error('Invalid GeoJSON: Must be FeatureCollection or Feature');
        }
        
        if (data.type === 'FeatureCollection' && !Array.isArray(data.features)) {
            throw new Error('Invalid GeoJSON: FeatureCollection must have features array');
        }
        
        return true;
    } catch (error) {
        console.error('GeoJSON validation error:', error);
        return false;
    }
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * Create error message element
 */
function createErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: #fed7d7;
        color: #742a2a;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        border: 1px solid #feb2b2;
    `;
    errorDiv.textContent = message;
    return errorDiv;
}

/**
 * Create success message element
 */
function createSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
        background: #c6f6d5;
        color: #22543d;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        border: 1px solid #9ae6b4;
    `;
    successDiv.textContent = message;
    return successDiv;
}

// Export functions for use in other modules
window.AppUtils = {
    convertDMSToDD,
    formatCoordinates,
    formatFileSize,
    formatDate,
    debounce,
    showLoading,
    hideLoading,
    updateProgress,
    showStatus,
    hideStatus,
    showResults,
    generateId,
    validateGeoJSON,
    calculateDistance,
    createErrorMessage,
    createSuccessMessage
};
