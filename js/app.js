// Main application class that coordinates all modules

class ImageGeoApp {
    constructor() {
        this.imageProcessor = new ImageProcessor();
        this.mapManager = null;
        this.pdfGenerator = new PDFGenerator();
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
        this.updateProcessButton(); // Initialize process button state
        console.log('Image Geolocation Processor initialized');
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
            
            // Update process button state now that GeoJSON is loaded
            this.updateProcessButton();
            
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
            this.updateProcessButton(); // Update process button state
            // Don't auto-process, wait for user to click process button
        });

        // Process button on welcome page
        const processBtn = document.getElementById('processBtn');
        if (processBtn) {
            processBtn.addEventListener('click', () => {
                const imageInput = document.getElementById('imageInput');
                if (imageInput.files && imageInput.files.length > 0) {
                    this.handleImageUpload(imageInput.files);
                }
            });
        }

        // Back button
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.showWelcomePage();
            });
        }

        // PDF generation button
        const generatePDFBtn = document.getElementById('generatePDF');
        if (generatePDFBtn) {
            generatePDFBtn.addEventListener('click', () => {
                this.generatePDFReport();
            });
        }

        // Configuration button
        const configBtn = document.getElementById('configBtn');
        if (configBtn) {
            configBtn.addEventListener('click', () => {
                this.showConfigDialog();
            });
        }

        // Select All / Select None buttons
        const selectAllBtn = document.getElementById('selectAllBtn');
        const selectNoneBtn = document.getElementById('selectNoneBtn');
        
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                this.selectAllImages(true);
            });
        }
        
        if (selectNoneBtn) {
            selectNoneBtn.addEventListener('click', () => {
                this.selectAllImages(false);
            });
        }

        // Modal close button
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                this.hideConfigDialog();
            });
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
                    this.updateProcessButton(); // Update process button state
                    // Don't auto-process, wait for user to click process button
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
            
            // Initialize map if not already done
            this.initializeMapManager();
            
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
     * Initialize the map manager for the main map
     */
    initializeMapManager() {
        if (!this.mapManager && document.getElementById('map')) {
            try {
                console.log('Initializing MapManager...');
                this.mapManager = new MapManager('map');
                
                // Load GeoJSON data if available
                if (this.geojsonData) {
                    this.mapManager.loadGeoJSON(this.geojsonData);
                }
                
                // Add processed images to map
                if (this.processedImages && this.processedImages.length > 0) {
                    this.mapManager.addImages(this.processedImages);
                }
                
                console.log('MapManager initialized successfully');
            } catch (error) {
                console.error('Error initializing MapManager:', error);
            }
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
            
            // Add images to map if map manager is available
            if (this.mapManager) {
                this.mapManager.addImages(this.processedImages);
            }
            
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
                // Ensure we have a map manager for analysis
                if (!this.mapManager) {
                    // Create a temporary analysis function if MapManager isn't available yet
                    image.locationInfo = this.analyzePointLocation(image.latitude, image.longitude);
                } else {
                    // Use the proper MapManager for analysis
                    image.locationInfo = this.mapManager.analyzePointLocation(
                        image.latitude, 
                        image.longitude
                    );
                }
            }
        });
    }

    /**
     * Analyze a point location against GeoJSON data (fallback method)
     */
    analyzePointLocation(lat, lng) {
        if (!this.geojsonData) return null;
        
        // Simple point-in-polygon check using Turf.js
        const point = turf.point([lng, lat]);
        
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
        
        return {
            status: 'Outside mapped regions',
            region: null,
            sigla: null,
            feature: null
        };
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
                        
                        // Update the selected image display
                        this.displaySelectedImage();
                    }
                });
                
                // Also add click handler to ensure clicks are processed
                radio.addEventListener('click', (e) => {
                    console.log('Radio button click detected:', e.target.value);
                    e.stopPropagation(); // Prevent the main list item click handler
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
            imageDisplay.style.display = 'none';
            return;
        }

        const image = this.processedImages[this.selectedImageIndex];
        
        placeholder.style.display = 'none';
        imageDisplay.style.display = 'block';

        // Display image
        if (image.originalFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                currentImage.src = e.target.result;
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
                    <span class="detail-value work-status ${statusClass}">${image.workStatus}</span>
                </div>
            `;
        }
        
        // Calculate new filename if image has Sigla
        if (image.hasGPS && image.locationInfo && image.locationInfo.sigla) {
            const fileIndex = String(this.selectedImageIndex + 1).padStart(3, '0');
            const extension = this.getFileExtension(image.filename);
            const newFilename = `${fileIndex} - ${image.locationInfo.sigla}${extension}`;
            detailsHTML += `
                <div class="detail-row highlight">
                    <span class="detail-label">🏷️ New filename:</span>
                    <span class="detail-value">${newFilename}</span>
                </div>
            `;
        }

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
                    <span class="detail-label">📷 Camera:</span>
                    <span class="detail-value">${image.camera || 'Unknown'} ${image.model || ''}`.trim() + `</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">📁 Size:</span>
                    <span class="detail-value">${AppUtils.formatFileSize(image.size)}</span>
                </div>
            `;
            
            if (image.locationInfo) {
                const statusClass = image.locationInfo.status === 'Inside region' ? 'status-inside' : 
                                   image.locationInfo.status === 'Outside mapped regions' ? 'status-outside' : 'status-no-gps';
                                   
                detailsHTML += `
                    <div class="detail-row">
                        <span class="detail-label">🗺️ Location Status:</span>
                        <span class="detail-value location-status ${statusClass}">${image.locationInfo.status}</span>
                    </div>
                `;
                
                if (image.locationInfo.sigla) {
                    detailsHTML += `
                        <div class="detail-row">
                            <span class="detail-label">🏷️ Sigla:</span>
                            <span class="detail-value">${image.locationInfo.sigla}</span>
                        </div>
                    `;
                }
                
                if (image.locationInfo.region && image.locationInfo.region !== image.locationInfo.sigla) {
                    detailsHTML += `
                        <div class="detail-row">
                            <span class="detail-label">📍 Region:</span>
                            <span class="detail-value">${image.locationInfo.region}</span>
                        </div>
                    `;
                }
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
    }

    /**
     * Display map showing the location of the selected image
     */
    displayImageLocationMap(image) {
        console.log('=== DISPLAY IMAGE LOCATION MAP START ===');
        console.log('displayImageLocationMap called for image:', image.filename);
        console.log('Image has GPS:', image.hasGPS);
        console.log('Image coordinates:', image.latitude, image.longitude);
        
        let mapContainer = document.getElementById('imageMapContainer');
        let mapElement = document.getElementById('imageMap');
        
        console.log('Map container found:', !!mapContainer);
        console.log('Map element found:', !!mapElement);
        
        // Debug: Check what elements actually exist
        console.log('imageDisplay element:', document.getElementById('imageDisplay'));
        console.log('imageDetails element:', document.getElementById('imageDetails'));
        console.log('All elements with id containing "Map":', Array.from(document.querySelectorAll('[id*="Map"]')));
        console.log('All elements with class containing "map":', Array.from(document.querySelectorAll('[class*="map"]')));
        
        if (mapContainer) {
            console.log('Map container current display style:', mapContainer.style.display);
        } else {
            console.log('❌ imageMapContainer element does not exist in DOM!');
            // Let's try to create it dynamically
            const imageDisplay = document.getElementById('imageDisplay');
            if (imageDisplay) {
                console.log('Found imageDisplay, adding map container dynamically...');
                const newMapContainer = document.createElement('div');
                newMapContainer.id = 'imageMapContainer';
                newMapContainer.className = 'image-map-container';
                newMapContainer.style.display = 'block';
                newMapContainer.innerHTML = `
                    <h4>📍 Image Location</h4>
                    <div id="imageMap" class="image-location-map"></div>
                `;
                imageDisplay.appendChild(newMapContainer);
                console.log('Map container created dynamically');
                
                // Try again
                mapContainer = document.getElementById('imageMapContainer');
                mapElement = document.getElementById('imageMap');
                console.log('New map container found:', !!mapContainer);
                console.log('New map element found:', !!mapElement);
            }
        }
        
        if (!mapContainer || !mapElement) {
            console.error('Map container or element not found!');
            return;
        }
        
        console.log('Map container found:', !!mapContainer);
        console.log('Map element found:', !!mapElement);
        console.log('Image has GPS:', image.hasGPS);
        console.log('Image coordinates:', image.latitude, image.longitude);
        console.log('Leaflet available:', typeof L !== 'undefined');
        
        if (!mapContainer || !mapElement) {
            console.error('Map container or element not found');
            return;
        }
        
        // TEMPORARY TEST: Always show map with default location if no GPS
        let lat = image.latitude;
        let lng = image.longitude;
        let hasValidCoords = image.hasGPS && lat && lng;
        
        if (!hasValidCoords) {
            // Use default coordinates (Lisbon, Portugal) for testing
            lat = 38.7223;
            lng = -9.1393;
            console.log('Using default coordinates for testing');
        }
        
        if (typeof L === 'undefined') {
            console.error('Leaflet not loaded');
            mapContainer.style.display = 'none';
            return;
        }
        
        // Show map container
        mapContainer.style.display = 'block';
        
        // Clear existing map if any
        mapElement.innerHTML = '';
        
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            try {
                // Create new map centered on image location
                const map = L.map('imageMap').setView([lat, lng], 15);
                
                // Add OpenStreetMap tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 18
                }).addTo(map);
                
                // Add marker for image location (make it draggable)
                const marker = L.marker([lat, lng], {
                    draggable: true,
                    title: 'Drag to update GPS coordinates'
                }).addTo(map);
                
                // Handle marker drag events
                marker.on('dragstart', () => {
                    console.log('Marker drag started');
                });
                
                marker.on('drag', (e) => {
                    const newLatLng = e.target.getLatLng();
                    console.log('Marker dragged to:', newLatLng.lat, newLatLng.lng);
                });
                
                marker.on('dragend', (e) => {
                    const newLatLng = e.target.getLatLng();
                    console.log('Marker drag ended at:', newLatLng.lat, newLatLng.lng);
                    
                    // Update the image coordinates
                    this.updateImageCoordinates(this.selectedImageIndex, newLatLng.lat, newLatLng.lng);
                });
                
                // Create popup content
                let popupContent = `
                    <div class="map-popup">
                        <h4>📷 ${image.filename}</h4>
                        <p><strong>📍 Coordinates:</strong><br>
                        ${hasValidCoords ? AppUtils.formatCoordinates(lat, lng) : 'Default location (no GPS)'}</p>
                `;
                
                if (image.locationInfo && image.locationInfo.sigla) {
                    popupContent += `<p><strong>🏷️ Sigla:</strong> ${image.locationInfo.sigla}</p>`;
                }
                
                if (image.locationInfo && image.locationInfo.status) {
                    popupContent += `<p><strong>🗺️ Status:</strong> ${image.locationInfo.status}</p>`;
                }
                
                popupContent += `</div>`;
                
                marker.bindPopup(popupContent).openPopup();
                
                // Add GeoJSON regions if available
                if (this.geojsonData && this.geojsonData.features) {
                    console.log('Adding GeoJSON layer...');
                    L.geoJSON(this.geojsonData, {
                        style: (feature) => {
                            // Highlight the region containing this image
                            const isImageRegion = image.locationInfo && 
                                                image.locationInfo.sigla && 
                                                feature.properties.Sigla === image.locationInfo.sigla;
                            
                            return {
                                color: isImageRegion ? '#ff6b6b' : '#667eea',
                                weight: isImageRegion ? 3 : 2,
                                opacity: isImageRegion ? 0.8 : 0.6,
                                fillColor: isImageRegion ? '#ff6b6b' : '#667eea',
                                fillOpacity: isImageRegion ? 0.3 : 0.1
                            };
                        },
                        onEachFeature: (feature, layer) => {
                            if (feature.properties.Sigla) {
                                layer.bindTooltip(`Sigla: ${feature.properties.Sigla}`, {
                                    permanent: false,
                                    direction: 'center'
                                });
                            }
                        }
                    }).addTo(map);
                }
                
                // Store map reference for cleanup
                this.currentImageMap = map;
                
                console.log('Map created successfully');
                
                // Force map to invalidate size after a short delay
                setTimeout(() => {
                    map.invalidateSize();
                    console.log('Map size invalidated');
                }, 200);
                
            } catch (error) {
                console.error('Error creating image location map:', error);
                mapElement.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #718096;">
                        <p>❌ Error loading map: ${error.message}</p>
                    </div>
                `;
            }
        }, 100);
    }

    /**
     * Clean up the current image map
     */
    cleanupImageMap() {
        if (this.currentImageMap) {
            this.currentImageMap.remove();
            this.currentImageMap = null;
        }
    }

    /**
     * Update image GPS coordinates when marker is dragged
     */
    updateImageCoordinates(imageIndex, newLat, newLng) {
        if (imageIndex < 0 || imageIndex >= this.processedImages.length) {
            console.error('Invalid image index for coordinate update');
            return;
        }
        
        const image = this.processedImages[imageIndex];
        const oldLat = image.latitude;
        const oldLng = image.longitude;
        
        console.log(`Updating coordinates for image ${imageIndex}:`);
        console.log(`  Old: ${oldLat}, ${oldLng}`);
        console.log(`  New: ${newLat}, ${newLng}`);
        
        // Update the image coordinates
        image.latitude = newLat;
        image.longitude = newLng;
        image.hasGPS = true; // Ensure GPS flag is set
        
        // Recalculate location information with new coordinates
        if (this.geojsonData) {
            const oldSigla = image.locationInfo?.sigla;
            
            // Analyze new location
            if (this.mapManager && this.mapManager.analyzePointLocation) {
                image.locationInfo = this.mapManager.analyzePointLocation(newLat, newLng);
            } else {
                image.locationInfo = this.analyzePointLocation(newLat, newLng);
            }
            
            const newSigla = image.locationInfo?.sigla;
            
            console.log(`Location analysis result:`);
            console.log(`  Old Sigla: ${oldSigla}`);
            console.log(`  New Sigla: ${newSigla}`);
            console.log(`  Status: ${image.locationInfo?.status}`);
            
            // If Sigla changed, update the display
            if (oldSigla !== newSigla) {
                console.log('Sigla changed - updating image list and display');
                
                // Update the image list to reflect new filename
                this.updateImageList();
                
                // Ensure the same image remains selected
                this.selectedImageIndex = imageIndex;
                
                // Update the image display
                this.displaySelectedImage();
                
                // Show notification about the change
                this.showCoordinateUpdateNotification(imageIndex, oldSigla, newSigla);
            } else {
                // Just update the current display without rebuilding the list
                this.displaySelectedImage();
                
                // Show notification about coordinate update
                this.showCoordinateUpdateNotification(imageIndex, null, null, true);
            }
        } else {
            // No GeoJSON data, just update the display
            this.displaySelectedImage();
            this.showCoordinateUpdateNotification(imageIndex, null, null, true);
        }
    }
    
    /**
     * Show notification when coordinates are updated
     */
    showCoordinateUpdateNotification(imageIndex, oldSigla, newSigla, coordsOnly = false) {
        const image = this.processedImages[imageIndex];
        
        let message;
        if (coordsOnly) {
            message = `📍 GPS coordinates updated for image ${imageIndex + 1}\n` +
                     `New coordinates: ${AppUtils.formatCoordinates(image.latitude, image.longitude)}`;
        } else if (oldSigla && newSigla && oldSigla !== newSigla) {
            message = `📍 Image location updated!\n` +
                     `Old Sigla: ${oldSigla}\n` +
                     `New Sigla: ${newSigla}\n` +
                     `Coordinates: ${AppUtils.formatCoordinates(image.latitude, image.longitude)}`;
        } else if (!oldSigla && newSigla) {
            message = `📍 Image moved into mapped region!\n` +
                     `New Sigla: ${newSigla}\n` +
                     `Coordinates: ${AppUtils.formatCoordinates(image.latitude, image.longitude)}`;
        } else if (oldSigla && !newSigla) {
            message = `📍 Image moved outside mapped regions\n` +
                     `Previous Sigla: ${oldSigla}\n` +
                     `Coordinates: ${AppUtils.formatCoordinates(image.latitude, image.longitude)}`;
        } else {
            message = `📍 GPS coordinates updated\n` +
                     `Coordinates: ${AppUtils.formatCoordinates(image.latitude, image.longitude)}`;
        }
        
        // Create a temporary notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 300px;
            font-size: 14px;
            line-height: 1.4;
            white-space: pre-line;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove notification after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transition = 'opacity 0.3s ease';
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 4000);
    }

    /**
     * Update statistics summary
     */
    updateStatsSummary() {
        const statsSummary = document.getElementById('statsSummary');
        const stats = this.imageProcessor.getStats();
        
        // Calculate work status statistics
        const workStats = {
            concluido: this.processedImages.filter(img => img.workStatus === 'Concluído').length,
            parcial: this.processedImages.filter(img => img.workStatus === 'Parcial').length,
            naoConcluido: this.processedImages.filter(img => img.workStatus === 'Não concluído').length
        };
        
        statsSummary.innerHTML = `
            <div class="stats-row">
                <div class="stat-item">
                    <span class="stat-number">${stats.total}</span>
                    <span class="stat-label">Total</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${stats.withGPS}</span>
                    <span class="stat-label">With GPS</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${stats.withoutGPS}</span>
                    <span class="stat-label">No GPS</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${stats.successRate}%</span>
                    <span class="stat-label">Success Rate</span>
                </div>
            </div>
            <div class="stats-row work-stats">
                <div class="stat-item work-stat">
                    <span class="stat-number concluido">${workStats.concluido}</span>
                    <span class="stat-label">Concluído</span>
                </div>
                <div class="stat-item work-stat">
                    <span class="stat-number parcial">${workStats.parcial}</span>
                    <span class="stat-label">Parcial</span>
                </div>
                <div class="stat-item work-stat">
                    <span class="stat-number nao-concluido">${workStats.naoConcluido}</span>
                    <span class="stat-label">Não concluído</span>
                </div>
            </div>
        `;
    }

    /**
     * Enable buttons on viewer page
     */
    enableButtons() {
        const generatePDFBtn = document.getElementById('generatePDF');
        
        const selectedImages = this.processedImages.filter(img => img.imageSelected);
        generatePDFBtn.disabled = selectedImages.length === 0;
    }

    /**
     * Show loading overlay
     */
    showLoading(message = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = overlay.querySelector('.loading-text');
        text.textContent = message;
        overlay.style.display = 'flex';
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = 'none';
    }

    /**
     * Reset the application
     */
    reset() {
        this.processedImages = [];
        this.geojsonData = null;
        this.imageProcessor.clear();
        
        if (this.mapManager) {
            this.mapManager.clearImageMarkers();
        }

        // Clear UI
        document.getElementById('imageInput').value = '';
        document.getElementById('geojsonInput').value = '';
        document.getElementById('imageInfo').textContent = '';
        document.getElementById('geojsonInfo').textContent = '';
        document.getElementById('imageResults').innerHTML = '';
        document.getElementById('generatePDF').disabled = true;
        
        // Hide sections
        AppUtils.hideStatus();
        document.getElementById('resultsSection').style.display = 'none';
    }

    /**
     * Export data as JSON
     */
    exportData() {
        const data = {
            timestamp: new Date().toISOString(),
            geojsonData: this.geojsonData,
            processedImages: this.processedImages,
            stats: this.imageProcessor.getStats()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `image-geolocation-data-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Get file extension from filename
     */
    getFileExtension(filename) {
        return filename.substring(filename.lastIndexOf('.'));
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
     * Show error message
     */
    showError(message) {
        console.error('Error:', message);
        alert(message); // Simple alert for now
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        console.log('Success:', message);
        alert(message); // Simple alert for now
    }

    /**
     * Show message in the UI
     */
    showMessage(element) {
        const container = document.querySelector('.container main') || document.body;
        container.insertBefore(element, container.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 5000);
    }

    /**
     * Generate PDF report for selected images
     */
    async generatePDFReport() {
        const selectedImages = this.processedImages.filter(img => img.imageSelected);
        
        if (selectedImages.length === 0) {
            this.showError('No selected images to include in the PDF report');
            return;
        }

        try {
            this.showLoading(`Generating PDF report for ${selectedImages.length} selected images...`);
            
            // Use the PDF generator
            await this.pdfGenerator.generateReport(selectedImages, this.geojsonData);
            
            this.hideLoading();
            this.showSuccess(`PDF report generated successfully for ${selectedImages.length} selected images`);
        } catch (error) {
            this.hideLoading();
            console.error('Error generating PDF:', error);
            this.showError(`Failed to generate PDF: ${error.message}`);
        }
    }

    /**
     * Select or deselect all images
     */
    selectAllImages(select) {
        this.processedImages.forEach(image => {
            image.imageSelected = select;
        });
        
        // Update the image list display
        this.updateImageList();
        
        // Update button states
        this.enableButtons();
        
        console.log(`${select ? 'Selected' : 'Deselected'} all images`);
    }

    /**
     * Show configuration dialog
     */
    showConfigDialog() {
        const modal = document.getElementById('configModal');
        if (modal) {
            modal.style.display = 'flex';
            this.setupConfigModal();
        }
    }

    /**
     * Hide configuration dialog
     */
    hideConfigDialog() {
        const modal = document.getElementById('configModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Setup configuration modal functionality
     */
    setupConfigModal() {
        // Only set up once
        if (this.configModalSetup) return;
        this.configModalSetup = true;
        
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                
                // Remove active class from all tabs and contents
                tabBtns.forEach(tb => tb.classList.remove('active'));
                tabContents.forEach(tc => tc.classList.remove('active'));
                
                // Add active class to clicked tab
                btn.classList.add('active');
                
                // Show corresponding content
                const targetContent = document.getElementById(tabId + 'Tab');
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });

        // Save button
        const saveBtn = document.getElementById('saveConfigBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveConfiguration();
            });
        }

        // Cancel button
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideConfigDialog();
            });
        }
        
        // Load saved configuration
        this.loadConfiguration();
        
        // Set up real-time preview updates
        const inputIds = [
            'header1', 'header2', 'title', 'datePrefix', 'referenceNumber', 
            'description', 'address', 'postalCode', 'contactPhone', 
            'sign1', 'sign1Name', 'sign2', 'sign2Name'
        ];
        
        inputIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.updateConfigPreview();
                });
            }
        });
    }

    /**
     * Save configuration
     */
    saveConfiguration() {
        // Get form values
        const config = {
            header1: document.getElementById('header1')?.value || '',
            header2: document.getElementById('header2')?.value || '',
            title: document.getElementById('title')?.value || '',
            datePrefix: document.getElementById('datePrefix')?.value || '',
            referenceNumber: document.getElementById('referenceNumber')?.value || '',
            description: document.getElementById('description')?.value || '',
            address: document.getElementById('address')?.value || '',
            postalCode: document.getElementById('postalCode')?.value || '',
            contactPhone: document.getElementById('contactPhone')?.value || '',
            sign1: document.getElementById('sign1')?.value || '',
            sign1Name: document.getElementById('sign1Name')?.value || '',
            sign2: document.getElementById('sign2')?.value || '',
            sign2Name: document.getElementById('sign2Name')?.value || ''
        };

        // Save to localStorage
        localStorage.setItem('pdfConfiguration', JSON.stringify(config));
        
        // Update preview
        this.updateConfigPreview();
        
        console.log('Configuration saved:', config);
        this.hideConfigDialog();
        
        // Show success message
        this.showSuccess('Configuration saved successfully!');
    }

    /**
     * Load configuration from localStorage
     */
    loadConfiguration() {
        try {
            const savedConfig = localStorage.getItem('pdfConfiguration');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                
                // Populate form fields
                Object.keys(config).forEach(key => {
                    const element = document.getElementById(key);
                    if (element) {
                        element.value = config[key];
                    }
                });
                
                // Update preview
                this.updateConfigPreview();
                
                console.log('Configuration loaded from localStorage');
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
        }
    }
    
    /**
     * Update configuration preview
     */
    updateConfigPreview() {
        // Update preview elements
        const previewElements = [
            'previewHeader1', 'previewHeader2', 'previewTitle', 'previewDatePrefix',
            'previewReference', 'previewDescription', 'previewAddress', 'previewPostalCode',
            'previewContactPhone', 'previewSign1', 'previewSign1Name', 'previewSign2', 'previewSign2Name'
        ];
        
        previewElements.forEach(previewId => {
            const sourceId = previewId.replace('preview', '').toLowerCase();
            const sourceElement = document.getElementById(sourceId);
            const previewElement = document.getElementById(previewId);
            
            if (sourceElement && previewElement) {
                previewElement.textContent = sourceElement.value;
            }
        });
        
        // Update current date
        const dateElement = document.getElementById('previewDate');
        if (dateElement) {
            dateElement.textContent = new Date().toLocaleDateString('pt-BR');
        }
    }

    /**
     * Update process button state
     */
    updateProcessButton() {
        const processBtn = document.getElementById('processBtn');
        const imageInput = document.getElementById('imageInput');
        
        if (processBtn && imageInput) {
            const hasImages = imageInput.files && imageInput.files.length > 0;
            const hasGeoJSON = this.geojsonData !== null;
            
            processBtn.disabled = !hasImages;
            
            if (hasImages && hasGeoJSON) {
                processBtn.textContent = `🚀 Process ${imageInput.files.length} Images`;
            } else if (hasImages) {
                processBtn.textContent = `🚀 Process ${imageInput.files.length} Images (No map data)`;
            } else {
                processBtn.textContent = '🚀 Process Images';
            }
        }
    }

    // ...existing code...
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ImageGeoApp();
});

// Export for potential external use
window.ImageGeoApp = ImageGeoApp;
