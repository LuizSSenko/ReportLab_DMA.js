// Main application class that coordinates all modules

class ImageGeoApp {
    constructor() {
        this.imageProcessor = new ImageProcessor();
        this.mapManager = null;
        this.pdfGenerator = new PDFGenerator();
        this.configManager = null; // Will be initialized after DOM is ready
        this.geojsonData = null;
        this.processedImages = [];
        this.selectedImageIndex = null;
        this.currentImageMap = null; // For image location map
        
        this.initializeApp();
    }
    /**
     * Initialize the application
     */
    initializeApp() {
        this.setupEventListeners();
        this.loadDefaultGeoJSON(); // Load map.geojson automatically
        
        // Initialize ConfigManager after all scripts are loaded
        this.initializeConfigManager();
        
        console.log('Image Geolocation Processor initialized');
    }

    /**
     * Initialize ConfigManager with proper timing
     */
    initializeConfigManager() {
        // Wait for DOM to be ready and ConfigManager to be available
        const initConfig = () => {
            if (typeof ConfigManager !== 'undefined') {
                this.configManager = new ConfigManager(this);
                console.log('ConfigManager initialized successfully');
            } else {
                console.warn('ConfigManager not loaded, retrying...');
                // Retry after a short delay
                setTimeout(initConfig, 100);
            }
        };

        // Initialize immediately if DOM is ready, otherwise wait
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initConfig);
        } else {
            initConfig();
        }
    }

    /**
     * Load default map.geojson file
     */
    async loadDefaultGeoJSON() {
        try {
            document.getElementById('geojsonInfo').textContent = 'Loading map.geojson...';
            
            const response = await fetch('map.geojson');
            if (!response.ok) {
                throw new Error(`Failed to load map.geojson: ${response.status}`);
            }
            
            const geojsonData = await response.json();
            
            // Validate and load GeoJSON
            if (!AppUtils.validateGeoJSON(geojsonData)) {
                throw new Error('Invalid GeoJSON format in map.geojson');
            }

            this.geojsonData = geojsonData;
            
            document.getElementById('geojsonInfo').textContent = '✅ map.geojson loaded successfully';
            
        } catch (error) {
            console.error('Error loading default GeoJSON:', error);
            document.getElementById('geojsonInfo').textContent = '❌ Failed to load map.geojson - Run from web server';
        }
    }

    /**
     * Setup event listeners for UI elements
     */
    setupEventListeners() {
        // Image file input
        const imageInput = document.getElementById('imageInput');
        imageInput.addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files);
        });

        // Back button
        const backButton = document.getElementById('backButton');
        backButton.addEventListener('click', () => {
            this.showWelcomePage();
        });

        // PDF generation button
        const generatePDFBtn = document.getElementById('generatePDF');
        generatePDFBtn.addEventListener('click', () => {
            this.generatePDFReport();
        });

        // Configuration button
        const configBtn = document.getElementById('configBtn');
        if (configBtn) {
            configBtn.addEventListener('click', (e) => {
                console.log('Config button clicked!');
                e.preventDefault(); // Prevent any default behavior
                if (this.configManager) {
                    this.configManager.showConfigDialog();
                } else {
                    console.error('ConfigManager not initialized');
                }
            });
        } else {
            console.error('Config button not found!');
        }

        // Setup drag and drop for welcome page
        this.setupDragAndDrop();

        // Setup scroll forwarding
        this.setupScrollForwarding();
    }

    /**
     * Setup drag and drop functionality for welcome page
     */
    setupDragAndDrop() {
        const welcomeCard = document.querySelector('.welcome-card');
        
        if (welcomeCard) {
            welcomeCard.addEventListener('dragover', (e) => {
                e.preventDefault();
                welcomeCard.style.backgroundColor = '#f0f7ff';
                welcomeCard.style.borderColor = '#667eea';
            });

            welcomeCard.addEventListener('dragleave', () => {
                welcomeCard.style.backgroundColor = '';
                welcomeCard.style.borderColor = '';
            });

            welcomeCard.addEventListener('drop', (e) => {
                e.preventDefault();
                welcomeCard.style.backgroundColor = '';
                welcomeCard.style.borderColor = '';
                
                const files = Array.from(e.dataTransfer.files);
                const imageFiles = files.filter(f => f.type.startsWith('image/'));
                
                if (imageFiles.length > 0) {
                    const imageInput = document.getElementById('imageInput');
                    imageInput.files = e.dataTransfer.files;
                    this.handleImageUpload(imageFiles);
                }
            });
        }
    }

    /**
     * Initialize scroll forwarding from right panel to left panel
     */
    setupScrollForwarding() {
        // Wait for DOM to be ready before setting up scroll forwarding
        setTimeout(() => {
            const rightPanel = document.querySelector('.right-panel');
            const imageList = document.querySelector('.image-list');
            
            if (rightPanel && imageList) {
                console.log('Setting up smart scroll forwarding...');
                
                // Smart scroll forwarding that respects scrollable content
                rightPanel.addEventListener('wheel', (e) => {
                    // Don't forward if scrolling within the image list itself
                    if (e.target.closest('.image-list')) {
                        return;
                    }
                    
                    // Check if the target element or its scrollable parent can scroll
                    const target = e.target;
                    const scrollableParent = this.findScrollableParent(target);
                    
                    if (scrollableParent) {
                        // Check if the scrollable element can actually scroll in the direction
                        const canScrollDown = scrollableParent.scrollTop < (scrollableParent.scrollHeight - scrollableParent.clientHeight);
                        const canScrollUp = scrollableParent.scrollTop > 0;
                        
                        // If scrolling down and can scroll down, or scrolling up and can scroll up, don't forward
                        if ((e.deltaY > 0 && canScrollDown) || (e.deltaY < 0 && canScrollUp)) {
                            return; // Let the element handle its own scrolling
                        }
                    }
                    
                    // Forward scroll to image list if right panel content can't scroll
                    e.preventDefault();
                    const scrollAmount = e.deltaY * 1.2;
                    imageList.scrollTop += scrollAmount;
                }, { passive: false });
                
                console.log('Smart scroll forwarding set up successfully');
            } else {
                console.log('Could not find elements for scroll forwarding, retrying...');
                setTimeout(() => this.setupScrollForwarding(), 500);
            }
        }, 100);
    }

    /**
     * Find the nearest scrollable parent element
     */
    findScrollableParent(element) {
        let current = element;
        
        while (current && current !== document.body) {
            const style = window.getComputedStyle(current);
            const overflowY = style.overflowY;
            
            // Check if element is scrollable and has content that can scroll
            if ((overflowY === 'auto' || overflowY === 'scroll') && 
                current.scrollHeight > current.clientHeight) {
                return current;
            }
            
            current = current.parentElement;
        }
        
        return null;
    }

    /**
     * Initialize image selection states
     */
    initializeImageSelection() {
        this.processedImages.forEach(image => {
            if (image.imageSelected === undefined) {
                image.imageSelected = true; // Default: all images selected
            }
        });
    }

    /**
     * Toggle image selection
     */
    toggleImageSelection(index) {
        const image = this.processedImages[index];
        image.imageSelected = !image.imageSelected;
        console.log(`Image ${index} selection toggled to: ${image.imageSelected}`);
        
        // Update just this item instead of rebuilding the entire list
        this.updateImageListItem(index);
        
        // Update button states
        this.enableButtons();
    }

    /**
     * Show welcome page
     */
    showWelcomePage() {
        document.getElementById('welcomePage').style.display = 'block';
        document.getElementById('viewerPage').style.display = 'none';
        
        // Reset processed images
        this.processedImages = [];
        this.selectedImageIndex = null;
        
        // Reset file input
        const imageInput = document.getElementById('imageInput');
        imageInput.value = '';
        
        // Reset info text
        document.getElementById('imageInfo').textContent = '';
    }

    /**
     * Show viewer page
     */
    showViewerPage() {
        console.log('showViewerPage called');
        
        const welcomePage = document.getElementById('welcomePage');
        const viewerPage = document.getElementById('viewerPage');
        
        console.log('welcomePage element:', welcomePage);
        console.log('viewerPage element:', viewerPage);
        
        if (welcomePage && viewerPage) {
            welcomePage.style.display = 'none';
            viewerPage.style.display = 'block';
            
            // Update the interface with processed results
            this.updateImageList();
            // Removed updateStatsSummary() since we hid the stats section
            this.enableButtons();
            
            // Set up scroll forwarding now that viewer page is visible
            this.setupScrollForwarding();
            
            console.log('Successfully switched to viewer page');
        } else {
            console.error('Could not find page elements');
        }
    }

    /**
     * Handle image file upload
     */
    async handleImageUpload(files) {
        if (!files || files.length === 0) return;

        console.log('handleImageUpload called with', files.length, 'files');

        try {
            // Show loading overlay
            this.showLoading(`Processing ${files.length} images...`);
            this.updateFileInfo('imageInfo', `Processing ${files.length} images...`);
            
            console.log('Starting image processing...');
            
            // Validate files
            for (const file of files) {
                this.imageProcessor.validateImageFile(file);
            }

            // Process images
            this.processedImages = await this.imageProcessor.processImages(files);
            
            console.log('Processed images:', this.processedImages);
            
            // Store original file references for renaming
            this.processedImages.forEach((imageData, index) => {
                if (index < files.length) {
                    imageData.originalFile = files[index];
                }
            });
            
            // Analyze locations if GeoJSON is loaded
            if (this.geojsonData) {
                console.log('Analyzing locations...');
                this.analyzeImageLocations();
            } else {
                console.log('No GeoJSON data loaded');
            }

            // Initialize selection states
            this.initializeImageSelection();

            // Hide loading and show viewer page
            console.log('Switching to viewer page...');
            this.hideLoading();
            this.showViewerPage();
            
        } catch (error) {
            this.hideLoading();
            console.error('Error processing images:', error);
            this.showError(`Error processing images: ${error.message}`);
            this.updateFileInfo('imageInfo', `❌ Error: ${error.message}`);
        }
    }

    /**
     * Analyze image locations against GeoJSON data
     */
    analyzeImageLocations() {
        if (!this.geojsonData) return;

        this.processedImages.forEach(image => {
            if (image.hasGPS) {
                // Create a temporary map manager just for analysis if we don't have one
                if (!this.mapManager) {
                    this.mapManager = { analyzePointLocation: (lat, lng) => {
                        // Simple point-in-polygon check using Turf.js
                        const point = turf.point([lng, lat]);
                        
                        // First, check if point is inside any polygon
                        for (const feature of this.geojsonData.features) {
                            if (turf.booleanPointInPolygon(point, feature)) {
                                return {
                                    status: 'Inside region',
                                    region: feature.properties.name || 'Unknown Region',
                                    sigla: feature.properties.Sigla || feature.properties.sigla || null,
                                    feature: feature
                                };
                            }
                        }
                        
                        // If not inside any polygon, find the nearest one by border distance
                        let nearestFeature = null;
                        let nearestDistance = Infinity;
                        
                        for (const feature of this.geojsonData.features) {
                            try {
                                // Calculate distance from point to polygon border/edge
                                const distance = turf.pointToPolygon(point, feature, { units: 'kilometers' });
                                
                                if (distance < nearestDistance) {
                                    nearestDistance = distance;
                                    nearestFeature = feature;
                                }
                            } catch (error) {
                                console.warn('Error calculating distance to polygon border:', error);
                                // Alternative method: calculate distance to polygon boundary using nearestPointOnLine
                                try {
                                    let minDistanceToEdge = Infinity;
                                    
                                    // Get the polygon coordinates
                                    const coords = feature.geometry.coordinates[0]; // Assuming first ring for exterior
                                    
                                    // Create line segments from polygon edges and find closest point on any edge
                                    for (let i = 0; i < coords.length - 1; i++) {
                                        const lineSegment = turf.lineString([coords[i], coords[i + 1]]);
                                        const nearestPoint = turf.nearestPointOnLine(lineSegment, point);
                                        const distanceToEdge = turf.distance(point, nearestPoint, { units: 'kilometers' });
                                        
                                        if (distanceToEdge < minDistanceToEdge) {
                                            minDistanceToEdge = distanceToEdge;
                                        }
                                    }
                                    
                                    if (minDistanceToEdge < nearestDistance) {
                                        nearestDistance = minDistanceToEdge;
                                        nearestFeature = feature;
                                    }
                                } catch (edgeError) {
                                    console.warn('Error calculating edge distance, skipping polygon:', edgeError);
                                }
                            }
                        }
                        
                        if (nearestFeature) {
                            const nearestName = nearestFeature.properties.Sigla || nearestFeature.properties.sigla || nearestFeature.properties.name || 'Unknown';
                            return {
                                status: `Outside region (nearest: ${nearestName})`,
                                region: nearestFeature.properties.name || nearestFeature.properties.Sigla || nearestFeature.properties.sigla || 'Unknown Region',
                                sigla: nearestFeature.properties.Sigla || nearestFeature.properties.sigla || null,
                                feature: nearestFeature,
                                distance: nearestDistance
                            };
                        }
                        
                        return {
                            status: 'Outside mapped regions',
                            region: null,
                            sigla: null,
                            feature: null
                        };
                    }};
                }
                
                image.locationInfo = this.mapManager.analyzePointLocation(
                    image.latitude, 
                    image.longitude
                );
            }
        });
    }





    /**
     * Update the image list in the left panel
     */
    updateImageList() {
        console.log('=== UPDATE IMAGE LIST CALLED ===');
        console.log('Number of processed images:', this.processedImages.length);
        
        const imageList = document.getElementById('imageList');
        imageList.innerHTML = '';

        if (this.processedImages.length === 0) {
            console.log('No images to display');
            return;
        }

        this.processedImages.forEach((image, index) => {
            console.log(`Creating list item for image ${index}: ${image.filename}`);
            const listItem = document.createElement('div');
            listItem.className = 'image-list-item';
            
            // Initialize selection if not set
            if (image.imageSelected === undefined) {
                image.imageSelected = true; // Default: all images selected
            }
            
            // Apply selection state
            if (index === this.selectedImageIndex) {
                listItem.classList.add('selected');
            }
            
            // Apply faded class if image is not selected
            if (!image.imageSelected) {
                listItem.classList.add('faded');
            }

            // Calculate new filename if image has Sigla
            let displayName = image.filename;
            if (image.hasGPS && image.locationInfo && image.locationInfo.sigla) {
                const fileIndex = String(index + 1).padStart(3, '0');
                const extension = this.getFileExtension(image.filename);
                displayName = `${fileIndex} - ${image.locationInfo.sigla}${extension}`;
            }

            // Create selection checkbox (not work status)
            let selectionIcon = image.imageSelected ? '☑' : '☐';
            let selectionClass = 'status-checkbox';
            
            // Initialize work status if not set
            if (!image.workStatus) {
                image.workStatus = 'Não concluído';
            }

            listItem.innerHTML = `
                <div class="image-item-content">
                    <div class="image-item-left">
                        <div class="image-item-header">
                            <span class="status-indicator ${selectionClass}" data-index="${index}" title="Click to toggle selection">${selectionIcon}</span>
                            <span class="image-name">${displayName}</span>
                        </div>
                    </div>
                    <div class="image-item-right">
                        <div class="status-options-horizontal">
                            <label class="status-option-inline">
                                <input type="radio" name="status_${index}" value="Concluído" ${image.workStatus === 'Concluído' ? 'checked' : ''}>
                                <span class="status-dot concluido" title="Concluído">✓</span>
                            </label>
                            <label class="status-option-inline">
                                <input type="radio" name="status_${index}" value="Parcial" ${image.workStatus === 'Parcial' ? 'checked' : ''}>
                                <span class="status-dot parcial" title="Parcial">◐</span>
                            </label>
                            <label class="status-option-inline">
                                <input type="radio" name="status_${index}" value="Não concluído" ${image.workStatus === 'Não concluído' ? 'checked' : ''}>
                                <span class="status-dot nao-concluido" title="Não concluído">○</span>
                            </label>
                        </div>
                    </div>
                </div>
            `;

            // Set a data attribute to identify this item
            listItem.setAttribute('data-image-index', index);

            // Add simple click handler for the entire image item area
            listItem.addEventListener('click', (e) => {
                console.log('Click detected on:', e.target.tagName, e.target.className);
                console.log('Clicked item index:', index);
                
                // Handle checkbox toggle if clicked
                if (e.target.classList.contains('status-indicator')) {
                    console.log('Checkbox clicked, toggling selection');
                    e.stopPropagation();
                    this.toggleImageSelection(index);
                    return;
                }
                
                // Don't handle clicks on radio buttons or their labels
                if (e.target.tagName === 'INPUT' && e.target.type === 'radio') {
                    console.log('Radio button clicked, ignoring for image selection');
                    return;
                }
                
                if (e.target.closest('.status-option-inline')) {
                    console.log('Status option area clicked, ignoring for image selection');
                    return;
                }
                
                // For everything else, display the image
                console.log('Selecting image:', index);
                this.selectImage(index);
            }); // Removed capture phase

            // Add change handlers for radio buttons
            const radioButtons = listItem.querySelectorAll('input[type="radio"]');
            radioButtons.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        console.log('Radio button changed:', e.target.value);
                        image.workStatus = e.target.value;
                        console.log(`Image ${index} status changed to: ${e.target.value}`);
                        
                        // Update the list without rebuilding (to avoid losing the current view)
                        this.updateImageListItem(index);
                        
                        // Also display the image when radio button status changes
                        console.log('Selecting image from radio button change:', index);
                        this.selectImage(index);
                        
                        // Update the selected image display
                        this.displaySelectedImage();
                    }
                });
                
                // Add click handler to prevent event bubbling but allow radio functionality
                radio.addEventListener('click', (e) => {
                    console.log('Radio button click detected:', e.target.value);
                    e.stopPropagation(); // Prevent the main list item click handler
                    // Don't call selectImage here as it will be called in the change event
                });
            });

            imageList.appendChild(listItem);
        });
    }

    /**
     * Update a single image list item without rebuilding the entire list
     */
    updateImageListItem(index) {
        const imageList = document.getElementById('imageList');
        const listItems = imageList.querySelectorAll('.image-list-item');
        
        if (listItems[index]) {
            const image = this.processedImages[index];
            const listItem = listItems[index];
            
            console.log(`Updating item ${index}: imageSelected=${image.imageSelected}`);
            
            // Update checkbox icon
            const checkbox = listItem.querySelector('.status-indicator');
            if (checkbox) {
                checkbox.textContent = image.imageSelected ? '☑' : '☐';
                console.log(`Updated checkbox icon to: ${checkbox.textContent}`);
            }
            
            // Update radio button states
            const radioButtons = listItem.querySelectorAll('input[type="radio"]');
            radioButtons.forEach(radio => {
                radio.checked = (radio.value === image.workStatus);
            });
            
            // Update selection state classes
            listItem.classList.toggle('selected', index === this.selectedImageIndex);
            listItem.classList.toggle('faded', !image.imageSelected);
            
            console.log(`Item ${index} has faded class: ${listItem.classList.contains('faded')}`);
        }
    }

    /**
     * Toggle image completion status using the checkbox
     */
    toggleImageCompletion(index) {
        const image = this.processedImages[index];
        
        // Toggle between "Não concluído" and "Concluído"
        if (image.workStatus === 'Concluído') {
            image.workStatus = 'Não concluído';
        } else {
            image.workStatus = 'Concluído';
        }
        
        console.log(`Image ${index} toggled to: ${image.workStatus}`);
        
        // Update the list to reflect the change
        this.updateImageList();
        
        // Update the selected image display if this is the currently selected image
        if (index === this.selectedImageIndex) {
            this.displaySelectedImage();
        }
    }

    /**
     * Select an image for viewing
     */
    selectImage(index) {
        console.log('=== SELECT IMAGE CALLED ===');
        console.log('Selected image index:', index);
        
        this.selectedImageIndex = index;
        this.updateImageList(); // Update selection styling
        this.displaySelectedImage();
    }

    /**
     * Display the selected image in the viewer
     */
    displaySelectedImage() {
        const placeholder = document.getElementById('viewerPlaceholder');
        const imageDisplay = document.getElementById('imageDisplay');
        const currentImage = document.getElementById('currentImage');
        const imageDetails = document.getElementById('imageDetails');

        // Clean up previous map if it exists
        this.cleanupImageMap();

        if (this.selectedImageIndex === null || this.selectedImageIndex >= this.processedImages.length) {
            placeholder.style.display = 'flex';
            currentImage.style.display = 'none';
            imageDisplay.style.display = 'none';
            this.hideCommentSection();
            return;
        }

        const image = this.processedImages[this.selectedImageIndex];
        console.log('Displaying image:', image.filename);
        
        placeholder.style.display = 'none';
        imageDisplay.style.display = 'block';
        
        console.log('Placeholder display:', placeholder.style.display);
        console.log('ImageDisplay display:', imageDisplay.style.display);

        // Display image
        if (image.originalFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                currentImage.src = e.target.result;
                currentImage.style.display = 'block';
                console.log('Image source set and display changed to block');
            };
            reader.readAsDataURL(image.originalFile);
        }

        // Display image details
        let detailsHTML = `<h3>${image.filename}</h3>`;
        
        // Work Status
        if (image.workStatus) {
            const statusClass = image.workStatus === 'Concluído' ? 'concluido' : 
                               image.workStatus === 'Parcial' ? 'parcial' : 'nao-concluido';
            detailsHTML += `
                <div class="detail-row highlight">
                    <span class="detail-label">🔧 Status do trabalho:</span>
                    <span class="detail-value work-status ${statusClass}" style="
                        padding: 4px 8px; 
                        border-radius: 4px; 
                        font-weight: 500;
                        ${image.workStatus === 'Concluído' ? 'background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : ''}
                        ${image.workStatus === 'Parcial' ? 'background-color: #fff3cd; color: #856404; border: 1px solid #ffeaa7;' : ''}
                        ${image.workStatus === 'Não concluído' ? 'background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;' : ''}
                    ">${image.workStatus}</span>
                </div>
            `;
        }
        
        // Show original filename
        detailsHTML += `
            <div class="detail-row highlight">
                <span class="detail-label">📄 Original Filename:</span>
                <span class="detail-value">${image.filename}</span>
            </div>
        `;

        if (image.error) {
            detailsHTML += `
                <div class="detail-row error">
                    <span class="detail-label">❌ Error:</span>
                    <span class="detail-value">${image.error}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">📁 Size:</span>
                    <span class="detail-value">${AppUtils.formatFileSize(image.size)}</span>
                </div>
            `;
        } else if (image.hasGPS) {
            detailsHTML += `
                <div class="detail-row">
                    <span class="detail-label">📍 Coordinates:</span>
                    <span class="detail-value">${AppUtils.formatCoordinates(image.latitude, image.longitude)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">📅 Date:</span>
                    <span class="detail-value">${AppUtils.formatDate(image.datetime) || 'Not available'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"> Size:</span>
                    <span class="detail-value">${AppUtils.formatFileSize(image.size)}</span>
                </div>
            `;
            
            if (image.locationInfo && image.locationInfo.sigla) {
                detailsHTML += `
                    <div class="detail-row">
                        <span class="detail-label">🏷️ Sigla:</span>
                        <span class="detail-value">${image.locationInfo.sigla}</span>
                    </div>
                `;
            }
        } else {
            detailsHTML += `
                <div class="detail-row error">
                    <span class="detail-label">❌ GPS Data:</span>
                    <span class="detail-value">No GPS data found</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">📁 Size:</span>
                    <span class="detail-value">${AppUtils.formatFileSize(image.size)}</span>
                </div>
            `;
        }

        imageDetails.innerHTML = detailsHTML;
        
        // Display map for images with GPS coordinates
        this.displayImageLocationMap(image);
        
        // Show and update comment section
        this.showCommentSection(image);
    }

    /**
     * Show comment section for the selected image
     */
    showCommentSection(image) {
        const commentSection = document.getElementById('commentSection');
        const commentImageName = document.getElementById('commentImageName');
        const imageComment = document.getElementById('imageComment');
        const commentCounter = document.getElementById('commentCounter');
        
        // Show the comment section
        commentSection.style.display = 'block';
        
        // Update image name
        commentImageName.textContent = image.filename;
        
        // Initialize comment if not exists
        if (!image.comments) {
            image.comments = '';
        }
        
        // Set current comment value
        imageComment.value = image.comments;
        
        // Update counter
        this.updateCommentCounter(image.comments.length);
        
        // Remove existing event listeners to prevent duplicates
        const newComment = imageComment.cloneNode(true);
        imageComment.parentNode.replaceChild(newComment, imageComment);
        
        // Add event listeners to new element
        newComment.addEventListener('input', (e) => {
            const currentLength = e.target.value.length;
            
            // Update counter
            this.updateCommentCounter(currentLength);
            
            // Update image comment
            image.comments = e.target.value;
            
            console.log(`Comment updated for image ${this.selectedImageIndex}: ${image.comments}`);
        });
        
        newComment.addEventListener('blur', () => {
            console.log('Comment field blurred, ensuring comment is saved');
        });
    }

    /**
     * Hide comment section
     */
    hideCommentSection() {
        const commentSection = document.getElementById('commentSection');
        commentSection.style.display = 'none';
    }

    /**
     * Update comment character counter
     */
    updateCommentCounter(length) {
        const commentCounter = document.getElementById('commentCounter');
        commentCounter.textContent = `${length}/500`;
        
        // Add warning class if near limit
        if (length > 450) {
            commentCounter.classList.add('near-limit');
        } else {
            commentCounter.classList.remove('near-limit');
        }
    }

    /**
     * Get file extension from filename
     */
    getFileExtension(filename) {
        const lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
    }

    /**
     * Show loading overlay with message
     */
    showLoading(message = 'Loading...') {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.querySelector('.loading-text');
        
        if (loadingText) {
            loadingText.textContent = message;
        }
        
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    /**
     * Show error message to user
     */
    showError(message) {
        alert(message); // Simple alert for now, could be enhanced with a better UI
    }

    /**
     * Update file info display
     */
    updateFileInfo(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
        }
    }

    /**
     * Generate PDF report
     */
    async generatePDFReport() {
        try {
            if (!this.processedImages || this.processedImages.length === 0) {
                this.showError('No processed images available for PDF generation');
                return;
            }

            // Show loading overlay
            AppUtils.showLoading('Generating PDF report...');

            // Generate location summary data
            const locationSummary = this.generateLocationSummary();
            console.log('Generated location summary:', locationSummary);

            // Generate PDF using the PDF generator
            const result = await this.pdfGenerator.generateReport(
                this.processedImages, 
                this.geojsonData, 
                locationSummary // Pass the summary data instead of null
            );

            // Hide loading
            AppUtils.hideLoading();

            if (result.success) {
                this.showSuccess(`PDF generated successfully: ${result.filename}`);
            } else {
                this.showError(`PDF generation failed: ${result.message}`);
            }

        } catch (error) {
            AppUtils.hideLoading();
            console.error('Error generating PDF:', error);
            this.showError(`Error generating PDF: ${error.message}`);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorElement = AppUtils.createErrorMessage(message);
        const container = document.getElementById('errorContainer') || document.body;
        container.appendChild(errorElement);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.parentNode.removeChild(errorElement);
            }
        }, 5000);
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        const successElement = AppUtils.createSuccessMessage(message);
        const container = document.getElementById('successContainer') || document.body;
        container.appendChild(successElement);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (successElement.parentNode) {
                successElement.parentNode.removeChild(successElement);
            }
        }, 3000);
    }

    /**
     * Enable buttons after images are processed
     */
    enableButtons() {
        const processBtn = document.getElementById('processBtn');
        const generatePDFBtn = document.getElementById('generatePDF');
        const selectAllBtn = document.getElementById('selectAllBtn');
        const selectNoneBtn = document.getElementById('selectNoneBtn');
        
        if (processBtn) {
            processBtn.disabled = false;
        }
        
        if (generatePDFBtn) {
            generatePDFBtn.disabled = false;
        }
        
        if (selectAllBtn) {
            selectAllBtn.disabled = false;
            selectAllBtn.addEventListener('click', () => {
                this.selectAllImages();
            });
        }
        
        if (selectNoneBtn) {
            selectNoneBtn.disabled = false;
            selectNoneBtn.addEventListener('click', () => {
                this.selectNoneImages();
            });
        }
    }

    /**
     * Select all images
     */
    selectAllImages() {
        this.processedImages.forEach(image => {
            image.imageSelected = true;
        });
        this.updateImageList();
    }

    /**
     * Select none images
     */
    selectNoneImages() {
        this.processedImages.forEach(image => {
            image.imageSelected = false;
        });
        this.updateImageList();
    }

    /**
     * Display image location map
     */
    displayImageLocationMap(image) {
        const mapContainer = document.getElementById('imageMapContainer');
        const mapElement = document.getElementById('imageMap');
        
        if (!image.hasGPS || !image.latitude || !image.longitude) {
            if (mapContainer) {
                mapContainer.style.display = 'none';
            }
            return;
        }
        
        if (mapContainer) {
            mapContainer.style.display = 'block';
        }
        
        if (mapElement) {
            // Clean up previous map
            this.cleanupImageMap();
            
            // Create new map
            this.currentImageMap = L.map('imageMap').setView([image.latitude, image.longitude], 15);
            
            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.currentImageMap);
            
            // Add GeoJSON polygons if available
            if (this.geojsonData) {
                L.geoJSON(this.geojsonData, {
                    style: {
                        color: '#667eea',
                        weight: 2,
                        opacity: 0.8,
                        fillColor: '#667eea',
                        fillOpacity: 0.1
                    },
                    onEachFeature: (feature, layer) => {
                        // Add popup to each polygon showing region info
                        if (feature.properties) {
                            const regionName = feature.properties.name || feature.properties.Name || 'Unknown Region';
                            const sigla = feature.properties.Sigla || feature.properties.sigla || 'No Sigla';
                            layer.bindPopup(`
                                <strong>Region:</strong> ${regionName}<br>
                                <strong>Sigla:</strong> ${sigla}
                            `);
                        }
                    }
                }).addTo(this.currentImageMap);
            }
            
            // Calculate display name (same logic as in image list)
            let displayName = image.filename;
            if (image.hasGPS && image.locationInfo && image.locationInfo.sigla) {
                const fileIndex = String(this.selectedImageIndex + 1).padStart(3, '0');
                const extension = this.getFileExtension(image.filename);
                displayName = `${fileIndex} - ${image.locationInfo.sigla}${extension}`;
            }
            
            // Add marker for image location with enhanced popup
            const marker = L.marker([image.latitude, image.longitude], {
                draggable: true
            }).addTo(this.currentImageMap);
            
            // Create popup content
            let popupContent = `<strong>${displayName}</strong><br>`;
            popupContent += `<strong>Coordinates:</strong> ${image.latitude.toFixed(6)}, ${image.longitude.toFixed(6)}<br>`;
            
            if (image.locationInfo) {
                if (image.locationInfo.sigla) {
                    popupContent += `<strong>Sigla:</strong> ${image.locationInfo.sigla}<br>`;
                }
                popupContent += `<strong>Status:</strong> ${image.locationInfo.status}`;
            }
            
            marker.bindPopup(popupContent).openPopup();
            
            // Handle marker drag events
            marker.on('dragstart', (e) => {
                console.log('Marker drag started');
            });
            
            marker.on('drag', (e) => {
                const currentLatLng = e.target.getLatLng();
                console.log('Marker being dragged to:', currentLatLng.lat.toFixed(6), currentLatLng.lng.toFixed(6));
            });
            
            marker.on('dragend', (e) => {
                console.log('Marker drag ended');
                const newLatLng = e.target.getLatLng();
                console.log('Final position:', newLatLng.lat.toFixed(6), newLatLng.lng.toFixed(6));
                
                // Update image coordinates
                image.latitude = newLatLng.lat;
                image.longitude = newLatLng.lng;
                
                // Re-analyze location with new coordinates
                if (this.geojsonData && this.mapManager) {
                    image.locationInfo = this.mapManager.analyzePointLocation(
                        image.latitude, 
                        image.longitude
                    );
                    console.log('New location analysis:', image.locationInfo);
                }
                
                // Recalculate display name with new sigla information
                let newDisplayName = image.filename;
                if (image.hasGPS && image.locationInfo && image.locationInfo.sigla) {
                    const fileIndex = String(this.selectedImageIndex + 1).padStart(3, '0');
                    const extension = this.getFileExtension(image.filename);
                    newDisplayName = `${fileIndex} - ${image.locationInfo.sigla}${extension}`;
                }
                
                // Update marker popup with new information
                let newPopupContent = `<strong>${newDisplayName}</strong><br>`;
                newPopupContent += `<strong>Coordinates:</strong> ${image.latitude.toFixed(6)}, ${image.longitude.toFixed(6)}<br>`;
                
                if (image.locationInfo) {
                    if (image.locationInfo.sigla) {
                        newPopupContent += `<strong>Sigla:</strong> ${image.locationInfo.sigla}<br>`;
                    }
                    newPopupContent += `<strong>Status:</strong> ${image.locationInfo.status}`;
                }
                
                marker.setPopupContent(newPopupContent);
                
                // Update the image details display
                this.displaySelectedImage();
                
                // Update the image list to reflect new filename if sigla changed
                this.updateImageList();
                
                console.log(`Image ${this.selectedImageIndex} position updated to: ${image.latitude.toFixed(6)}, ${image.longitude.toFixed(6)}`);
                console.log('New location info:', image.locationInfo);
            });
        }
    }

    /**
     * Clean up image map
     */
    cleanupImageMap() {
        if (this.currentImageMap) {
            this.currentImageMap.remove();
            this.currentImageMap = null;
        }
    }

    /**
     * Generate summary data for Quadras and Canteiros
     */
    generateLocationSummary() {
        const quadraSummary = new Map();
        const canteiroSummary = new Map();

        // Process each image with GPS and location info
        this.processedImages.forEach(image => {
            if (image.hasGPS && image.locationInfo && image.locationInfo.sigla && image.locationInfo.feature) {
                const properties = image.locationInfo.feature.properties;
                const sigla = image.locationInfo.sigla;
                const status = image.workStatus || 'Não concluído';

                // Check if this location has Quadra information
                if (properties.Quadra || properties.quadra) {
                    const quadraNumber = properties.Quadra || properties.quadra;
                    const key = `${quadraNumber}-${sigla}`;
                    
                    if (!quadraSummary.has(key)) {
                        quadraSummary.set(key, {
                            quadra: quadraNumber,
                            sigla: sigla,
                            status: status,
                            images: []
                        });
                    } else {
                        // Update status based on priority: Concluído > Parcial > Não concluído
                        const existing = quadraSummary.get(key);
                        if (status === 'Concluído' || (status === 'Parcial' && existing.status === 'Não concluído')) {
                            existing.status = status;
                        }
                    }
                    quadraSummary.get(key).images.push(image);
                }

                // Check if this location has Canteiro information
                if (properties.Canteiro || properties.canteiro) {
                    const canteiroNumber = properties.Canteiro || properties.canteiro;
                    const key = `${canteiroNumber}-${sigla}`;
                    
                    if (!canteiroSummary.has(key)) {
                        canteiroSummary.set(key, {
                            canteiro: canteiroNumber,
                            sigla: sigla,
                            status: status,
                            images: []
                        });
                    } else {
                        // Update status based on priority: Concluído > Parcial > Não concluído
                        const existing = canteiroSummary.get(key);
                        if (status === 'Concluído' || (status === 'Parcial' && existing.status === 'Não concluído')) {
                            existing.status = status;
                        }
                    }
                    canteiroSummary.get(key).images.push(image);
                }
            }
        });

        // Convert Maps to sorted arrays
        const quadraData = Array.from(quadraSummary.values()).sort((a, b) => {
            // Sort by quadra number first, then by sigla
            if (a.quadra !== b.quadra) {
                return String(a.quadra).localeCompare(String(b.quadra), undefined, { numeric: true });
            }
            return a.sigla.localeCompare(b.sigla);
        });

        const canteiroData = Array.from(canteiroSummary.values()).sort((a, b) => {
            // Sort by canteiro number first, then by sigla
            if (a.canteiro !== b.canteiro) {
                return String(a.canteiro).localeCompare(String(b.canteiro), undefined, { numeric: true });
            }
            return a.sigla.localeCompare(b.sigla);
        });

        return {
            quadras: quadraData,
            canteiros: canteiroData
        };
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ImageGeoApp();
});
