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
            configBtn.addEventListener('click', () => {
                console.log('Config button clicked!');
                this.showConfigDialog();
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
        
        const mapContainer = document.getElementById('imageMapContainer');
        const mapElement = document.getElementById('imageMap');
        
        console.log('Map container found:', !!mapContainer);
        console.log('Map element found:', !!mapElement);
        
        if (!mapContainer || !mapElement) {
            console.error('Map container or element not found in HTML!');
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
        
        // Check if image has valid GPS coordinates
        let lat = image.latitude;
        let lng = image.longitude;
        let hasValidCoords = image.hasGPS && lat !== undefined && lng !== undefined && lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);
        
        console.log('GPS validation check:');
        console.log('- image.hasGPS:', image.hasGPS);
        console.log('- lat:', lat, 'type:', typeof lat);
        console.log('- lng:', lng, 'type:', typeof lng);
        console.log('- hasValidCoords:', hasValidCoords);
        
        if (!hasValidCoords) {
            console.log('Image has no valid GPS data, hiding map');
            mapContainer.style.display = 'none';
            return;
        }
        
        console.log('Image has GPS coordinates, showing map');
        console.log('Coordinates:', lat, lng);
        
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
                        ${AppUtils.formatCoordinates(lat, lng)}</p>
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
        console.log('Cleaning up image map...');
        if (this.currentImageMap) {
            console.log('Removing previous image map');
            this.currentImageMap.remove();
            this.currentImageMap = null;
        }
        
        // Also clear the map container content
        const mapElement = document.getElementById('imageMap');
        if (mapElement) {
            console.log('Clearing map element content');
            mapElement.innerHTML = '';
        }
        
        // Hide map container by default - will be shown if image has GPS
        const mapContainer = document.getElementById('imageMapContainer');
        if (mapContainer) {
            console.log('Hiding map container');
            mapContainer.style.display = 'none';
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
            image.locationInfo = this.mapManager.analyzePointLocation(newLat, newLng);
            
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
            // PDF generated silently - no success message
        } catch (error) {
            this.hideLoading();
            console.error('Error generating PDF:', error);
            this.showError(`Failed to generate PDF: ${error.message}`);
        }
    }

    /**
     * Show configuration dialog
     */
    showConfigDialog() {
        console.log('showConfigDialog called!');
        // Create modal backdrop
        const modal = document.createElement('div');
        modal.className = 'config-modal-backdrop';
        modal.innerHTML = `
            <div class="config-modal">
                <div class="config-header">
                    <h2>⚙️ Configurações</h2>
                    <button class="config-close-btn" type="button">✕</button>
                </div>
                
                <div class="config-tabs">
                    <button class="config-tab-btn active" data-tab="pdf">📄 PDF</button>
                    <button class="config-tab-btn" data-tab="questionario">📋 Questionário</button>
                </div>
                
                <div class="config-content">
                    <!-- PDF Configuration Tab -->
                    <div class="config-tab-content active" data-tab="pdf">
                        <div class="config-split">
                            <div class="config-form">
                                <h3>📄 Configuração da Capa</h3>
                                <div class="config-section">
                                    <label>Header 1:</label>
                                    <input type="text" id="config-header1" value="DAV - DIRETORIA DE ÁREAS VERDES / DMA - DIVISÃO DE MEIO AMBIENTE">
                                    
                                    <label>Header 2:</label>
                                    <input type="text" id="config-header2" value="UNICAMP - UNIVERSIDADE ESTADUAL DE CAMPINAS">
                                    
                                    <label>Título:</label>
                                    <input type="text" id="config-title" value="RELATÓRIO DE REALIZAÇÃO DE SERVIÇOS - PROVAC">
                                    
                                    <label>Prefixo da Data:</label>
                                    <input type="text" id="config-datePrefix" value="DATA DO RELATÓRIO:">
                                    
                                    <label>Número de Referência:</label>
                                    <textarea id="config-referenceNumber" rows="2">CONTRATO Nº: 039/2019 - PROVAC TERCEIRIZAÇÃO DE MÃO DE OBRA LTDA</textarea>
                                    
                                    <label>Descrição:</label>
                                    <textarea id="config-description" rows="3">Vistoria de campo realizada pelos técnicos da DAV.</textarea>
                                </div>
                                
                                <h3>📍 Informações de Rodapé</h3>
                                <div class="config-section">
                                    <label>Endereço:</label>
                                    <input type="text" id="config-address" value="Rua 5 de Junho, 251 - Cidade Universitária Zeferino Vaz - Campinas - SP">
                                    
                                    <label>CEP:</label>
                                    <input type="text" id="config-postalCode" value="13083-877">
                                    
                                    <label>Telefone de Contato:</label>
                                    <input type="text" id="config-contactPhone" value="mascard@unicamp.br">
                                </div>
                                
                                <h3>✍️ Página Final - Assinaturas</h3>
                                <div class="config-section">
                                    <label>Assinatura 1:</label>
                                    <input type="text" id="config-sign1" value="PREPOSTO CONTRATANTE">
                                    
                                    <label>Nome 1:</label>
                                    <input type="text" id="config-sign1Name" value="sign1_name">
                                    
                                    <label>Assinatura 2:</label>
                                    <input type="text" id="config-sign2" value="PREPOSTO CONTRATADA">
                                    
                                    <label>Nome 2:</label>
                                    <input type="text" id="config-sign2Name" value="sign2_name">
                                </div>
                            </div>
                            
                            <div class="config-preview">
                                <h4>👁️ Pré-visualização do PDF</h4>
                                <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">
                                    Visualização das páginas inicial e final do relatório em formato A4 paisagem
                                </p>
                                <div class="pdf-preview" id="pdfPreview">
                                    <div class="preview-pages-container">
                                        <!-- Cover Page Preview -->
                                        <div>
                                            <div class="preview-page-label">📄 Página 1 - Capa</div>
                                            <div class="preview-page cover-page">
                                                <div class="preview-header">
                                                    <div class="preview-header1" id="preview-header1">DAV - DIRETORIA DE ÁREAS VERDES / DMA - DIVISÃO DE MEIO AMBIENTE</div>
                                                    <div class="preview-header2" id="preview-header2">UNICAMP - UNIVERSIDADE ESTADUAL DE CAMPINAS</div>
                                                </div>
                                                
                                                <div class="preview-title" id="preview-title">RELATÓRIO DE REALIZAÇÃO DE SERVIÇOS - PROVAC</div>
                                                
                                                <div class="preview-date-section">
                                                    <span class="preview-date-prefix" id="preview-datePrefix">DATA DO RELATÓRIO:</span>
                                                    <span class="preview-date">${new Date().toLocaleDateString('pt-BR')}</span>
                                                </div>
                                                
                                                <div class="preview-reference" id="preview-referenceNumber">CONTRATO Nº: 039/2019 - PROVAC TERCEIRIZAÇÃO DE MÃO DE OBRA LTDA</div>
                                                
                                                <div class="preview-description" id="preview-description">Vistoria de campo realizada pelos técnicos da DAV.</div>
                                                
                                                <div class="preview-footer">
                                                    <div class="preview-address" id="preview-address">Rua 5 de Junho, 251 - Cidade Universitária Zeferino Vaz - Campinas - SP</div>
                                                    <div class="preview-postal">CEP: <span id="preview-postalCode">13083-877</span> - Tel: (19) 3521-7010 - Fax: (19) 3521-7635</div>
                                                    <div class="preview-contact" id="preview-contactPhone">mascard@unicamp.br</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Signature Page Preview -->
                                        <div>
                                            <div class="preview-page-label">✍️ Página Final - Assinaturas</div>
                                            <div class="preview-page signature-page">
                                                <div class="signature-preview">
                                                    <div class="signature-box">
                                                        <div class="signature-label" id="preview-sign1">PREPOSTO CONTRATANTE</div>
                                                        <div class="signature-line"></div>
                                                        <div class="signature-name" id="preview-sign1Name">sign1_name</div>
                                                        <div class="signature-date">Data: ......./......./...........</div>
                                                    </div>
                                                    <div class="signature-box">
                                                        <div class="signature-label" id="preview-sign2">PREPOSTO CONTRATADA</div>
                                                        <div class="signature-line"></div>
                                                        <div class="signature-name" id="preview-sign2Name">sign2_name</div>
                                                        <div class="signature-date">Data: ......./......./...........</div>
                                                    </div>
                                                </div>
                                                
                                                <div class="signature-location">
                                                    <span id="preview-signature-address">Rua 5 de Junho, 251 - Cidade Universitária Zeferino Vaz - Campinas - SP</span>, ${new Date().toLocaleDateString('pt-BR')}
                                                </div>
                                                
                                                <div class="preview-footer">
                                                    <div class="preview-address" id="preview-address-sig">Rua 5 de Junho, 251 - Cidade Universitária Zeferino Vaz - Campinas - SP</div>
                                                    <div class="preview-postal">CEP: <span id="preview-postalCode-sig">13083-877</span> - Tel: (19) 3521-7010 - Fax: (19) 3521-7635</div>
                                                    <div class="preview-contact" id="preview-contactPhone-sig">mascard@unicamp.br</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Questionário Configuration Tab -->
                    <div class="config-tab-content" data-tab="questionario">
                        <div class="config-form">
                            <h3>📋 Configuração do Questionário</h3>
                            <div class="config-section">
                                <p>⚠️ Esta funcionalidade será implementada em uma versão futura.</p>
                                <p>Aqui você poderá configurar:</p>
                                <ul>
                                    <li>Perguntas personalizadas para cada imagem</li>
                                    <li>Campos de observação</li>
                                    <li>Critérios de avaliação</li>
                                    <li>Templates de questionário</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="config-footer">
                    <button class="config-btn config-btn-cancel" type="button">Cancelar</button>
                    <button class="config-btn config-btn-save" type="button">💾 Salvar Configurações</button>
                </div>
            </div>
        `;

        // Add to body
        document.body.appendChild(modal);

        // Load current configuration
        this.loadConfigurationIntoDialog();

        // Setup event handlers
        this.setupConfigDialogEvents(modal);

        // Setup live preview updates
        this.setupConfigPreviewUpdates();

        // Show modal with animation
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
    }

    /**
     * Load current configuration into dialog
     */
    loadConfigurationIntoDialog() {
        const config = this.getPDFConfiguration();
        
        // Load values into form fields
        const fields = [
            'header1', 'header2', 'title', 'datePrefix', 'referenceNumber',
            'description', 'address', 'postalCode', 'contactPhone',
            'sign1', 'sign1Name', 'sign2', 'sign2Name'
        ];

        fields.forEach(field => {
            const element = document.getElementById(`config-${field}`);
            if (element && config[field] !== undefined) {
                element.value = config[field];
            }
        });

        // Update preview
        this.updateConfigPreview();
    }

    /**
     * Setup event handlers for config dialog
     */
    setupConfigDialogEvents(modal) {
        // Close button
        modal.querySelector('.config-close-btn').addEventListener('click', () => {
            this.closeConfigDialog(modal);
        });

        // Cancel button
        modal.querySelector('.config-btn-cancel').addEventListener('click', () => {
            this.closeConfigDialog(modal);
        });

        // Save button
        modal.querySelector('.config-btn-save').addEventListener('click', () => {
            this.saveConfiguration(modal);
        });

        // Tab switching
        modal.querySelectorAll('.config-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchConfigTab(btn.dataset.tab);
            });
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeConfigDialog(modal);
            }
        });

        // Prevent modal content clicks from closing modal
        modal.querySelector('.config-modal').addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Setup live preview updates
     */
    setupConfigPreviewUpdates() {
        const fields = [
            'header1', 'header2', 'title', 'datePrefix', 'referenceNumber',
            'description', 'address', 'postalCode', 'contactPhone',
            'sign1', 'sign1Name', 'sign2', 'sign2Name'
        ];

        fields.forEach(field => {
            const element = document.getElementById(`config-${field}`);
            if (element) {
                element.addEventListener('input', () => {
                    this.updateConfigPreview();
                });
            }
        });
    }

    /**
     * Update configuration preview for both cover and signature pages
     */
    updateConfigPreview() {
        // Cover page fields
        const coverFields = [
            'header1', 'header2', 'title', 'datePrefix', 'referenceNumber',
            'description', 'address', 'postalCode', 'contactPhone'
        ];

        coverFields.forEach(field => {
            const inputElement = document.getElementById(`config-${field}`);
            const previewElement = document.getElementById(`preview-${field}`);
            
            if (inputElement && previewElement) {
                previewElement.textContent = inputElement.value;
            }
        });

        // Signature page fields
        const signatureFields = ['sign1', 'sign1Name', 'sign2', 'sign2Name'];
        
        signatureFields.forEach(field => {
            const inputElement = document.getElementById(`config-${field}`);
            const previewElement = document.getElementById(`preview-${field}`);
            
            if (inputElement && previewElement) {
                previewElement.textContent = inputElement.value;
            }
        });

        // Update signature page footer elements (they have different IDs)
        const addressElement = document.getElementById('config-address');
        const postalElement = document.getElementById('config-postalCode');
        const contactElement = document.getElementById('config-contactPhone');

        if (addressElement) {
            const sigAddressElement = document.getElementById('preview-address-sig');
            const sigLocationElement = document.getElementById('preview-signature-address');
            if (sigAddressElement) sigAddressElement.textContent = addressElement.value;
            if (sigLocationElement) sigLocationElement.textContent = addressElement.value;
        }

        if (postalElement) {
            const sigPostalElement = document.getElementById('preview-postalCode-sig');
            if (sigPostalElement) sigPostalElement.textContent = postalElement.value;
        }

        if (contactElement) {
            const sigContactElement = document.getElementById('preview-contactPhone-sig');
            if (sigContactElement) sigContactElement.textContent = contactElement.value;
        }
    }

    /**
     * Switch configuration tab
     */
    switchConfigTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.config-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.config-tab-btn[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.config-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.querySelector(`.config-tab-content[data-tab="${tabName}"]`).classList.add('active');
    }

    /**
     * Save configuration
     */
    saveConfiguration(modal) {
        const config = {};
        
        const fields = [
            'header1', 'header2', 'title', 'datePrefix', 'referenceNumber',
            'description', 'address', 'postalCode', 'contactPhone',
            'sign1', 'sign1Name', 'sign2', 'sign2Name'
        ];

        fields.forEach(field => {
            const element = document.getElementById(`config-${field}`);
            if (element) {
                config[field] = element.value;
            }
        });

        // Save to localStorage
        localStorage.setItem('pdfConfiguration', JSON.stringify(config));

        // Close modal
        this.closeConfigDialog(modal);

        // Show success notification
        this.showConfigSavedNotification();
    }

    /**
     * Close configuration dialog
     */
    closeConfigDialog(modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }

    /**
     * Get PDF configuration (used by PDF generator)
     */
    getPDFConfiguration() {
        // Try to get from localStorage
        const savedConfig = localStorage.getItem('pdfConfiguration');
        if (savedConfig) {
            try {
                return JSON.parse(savedConfig);
            } catch (error) {
                console.error('Error parsing saved configuration:', error);
            }
        }
        
        // Return default configuration
        return {
            header1: 'DAV - DIRETORIA DE ÁREAS VERDES / DMA - DIVISÃO DE MEIO AMBIENTE',
            header2: 'UNICAMP - UNIVERSIDADE ESTADUAL DE CAMPINAS',
            title: 'RELATÓRIO DE REALIZAÇÃO DE SERVIÇOS - PROVAC',
            datePrefix: 'DATA DO RELATÓRIO:',
            referenceNumber: 'CONTRATO Nº: 039/2019 - PROVAC TERCEIRIZAÇÃO DE MÃO DE OBRA LTDA',
            description: 'Vistoria de campo realizada pelos técnicos da DAV.',
            address: 'Rua 5 de Junho, 251 - Cidade Universitária Zeferino Vaz - Campinas - SP',
            postalCode: '13083-877',
            contactPhone: 'mascard@unicamp.br',
            sign1: 'PREPOSTO CONTRATANTE',
            sign1Name: 'sign1_name',
            sign2: 'PREPOSTO CONTRATADA',
            sign2Name: 'sign2_name'
        };
    }

    /**
     * Show configuration saved notification
     */
    showConfigSavedNotification() {
        const notification = document.createElement('div');
        notification.className = 'config-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 500;
        `;
        
        notification.textContent = '💾 Configurações salvas com sucesso!';
        
        document.body.appendChild(notification);
        
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
        }, 3000);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ImageGeoApp();
});

// Export for potential external use
window.ImageGeoApp = ImageGeoApp;
