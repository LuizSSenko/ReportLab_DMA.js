// Configuration Manager - Handles PDF configuration modal functionality

class ConfigManager {
    constructor(app) {
        this.app = app;
        this.pdfViewerState = {
            currentPage: 1,
            totalPages: 0,
            scale: 1.0, // Default scale for better visibility
            pdfDoc: null
        };
        this.configModalSetup = false;
        this.savedMacroConfig = null; // Store saved macro configuration
        this.savedPDFConfig = null; // Store saved PDF configuration
        this.fileManagerRetryScheduled = false; // Track if we've scheduled a FileManager retry
        
        // FileManager will be initialized when needed
        this.fileManager = null;
        
        // Initialize macros when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeMacros();
            });
        } else {
            // DOM is already ready
            this.initializeMacros();
        }
    }

    /**
     * Get or initialize FileManager with proper fallback handling
     */
    getFileManager() {
        if (!this.fileManager) {
            // Try different ways to access FileManager
            const FileManagerClass = (typeof FileManager !== 'undefined' && FileManager) || 
                                    (typeof window !== 'undefined' && window.FileManager);
            
            if (FileManagerClass) {
                try {
                    this.fileManager = new FileManagerClass();
                    console.log('FileManager initialized successfully');
                } catch (error) {
                    console.warn('Error initializing FileManager:', error);
                    this.fileManager = this.createMockFileManager();
                }
            } else {
                // FileManager not available yet, create mock but schedule retry
                this.fileManager = this.createMockFileManager();
                
                // Only schedule retry once and only if we haven't successfully found FileManager
                if (!this.fileManagerRetryScheduled) {
                    this.fileManagerRetryScheduled = true;
                    
                    // Use a longer timeout and try multiple times
                    setTimeout(() => {
                        const RetryFileManagerClass = (typeof FileManager !== 'undefined' && FileManager) || 
                                                     (typeof window !== 'undefined' && window.FileManager);
                        
                        if (RetryFileManagerClass) {
                            try {
                                console.log('FileManager became available, upgrading from mock...');
                                this.fileManager = new RetryFileManagerClass();
                                console.log('Successfully upgraded to real FileManager');
                            } catch (error) {
                                console.warn('Failed to upgrade to real FileManager:', error);
                            }
                        }
                        // No warning if still not available - the mock works fine
                    }, 250); // Increased timeout for better reliability
                }
            }
        }
        return this.fileManager;
    }

    /**
     * Create mock FileManager with default methods
     */
    createMockFileManager() {
        const defaultMacros = {
            macro1: 'Área limpa e organizada',
            macro2: 'Necessita limpeza',
            macro3: 'Poda realizada',
            macro4: 'Irrigação funcionando',
            macro5: 'Problemas de drenagem',
            macro6: 'Equipamento danificado',
            macro7: 'Manutenção necessária',
            macro8: 'Área em bom estado',
            macro9: 'Observações adicionais'
        };
        
        const defaultPDFConfig = {
            header1: 'DAV - DIRETORIA DE ÁREAS VERDES / DMA - DIVISÃO DE MEIO AMBIENTE',
            header2: 'UNICAMP - UNIVERSIDADE ESTADUAL DE CAMPINAS',
            title: 'RELATÓRIO DE REALIZAÇÃO DE SERVIÇOS - PROVAC',
            datePrefix: 'DATA DO RELATÓRIO:',
            referenceNumber: 'CONTRATO Nº: 039/2019 - PROVAC TERCEIRIZAÇÃO DE MÃO DE OBRA LTDA',
            description: 'Vistoria de campo realizada pelos técnicos da DAV.',
            address: 'Rua 5 de Junho, 251 - Cidade Universitária Zeferino Vaz - Campinas - SP',
            postalCode: '13083-877',
            contactPhone: 'mascard@unicamp.br'
        };

        return {
            isMock: true,
            getDefaultMacros: () => defaultMacros,
            getDefaultPDFConfig: () => defaultPDFConfig,
            getDefaultConfig: () => ({
                pdf: defaultPDFConfig,
                macros: defaultMacros
            }),
            validateConfigStructure: () => true,
            loadConfigFromFile: () => Promise.resolve(null),
            saveConfigToFile: () => console.warn('FileManager not available for saving')
        };
    }

    /**
     * Initialize macros functionality (separate from modal setup)
     */
    async initializeMacros() {
        // Try to load from file first, then fallback to localStorage, then defaults
        let configLoaded = false;
        
        try {
            // First try to load from db/config.json
            configLoaded = await this.loadConfigurationFromFile();
            if (configLoaded) {
                console.log('Configuration loaded from db/config.json file');
            }
        } catch (error) {
            console.log('Could not load from file, trying localStorage:', error.message);
        }
        
        // If file loading failed, try localStorage
        if (!configLoaded) {
            configLoaded = this.loadMacroConfiguration();
            if (configLoaded) {
                console.log('Macros loaded from localStorage');
            }
        }
        
        // If no saved configuration exists anywhere, initialize with defaults
        if (!configLoaded) {
            try {
                this.initializeDefaultConfig();
                console.log('Configuration initialized with default values');
            } catch (error) {
                console.warn('Could not initialize default config:', error.message);
                // Fallback to hardcoded defaults
                this.savedMacroConfig = {
                    macro1: 'JUJUBA',
                    macro2: 'XUXU',
                    macro3: 'Poda realizada',
                    macro4: 'Irrigação funcionando',
                    macro5: 'Problemas de drenagem',
                    macro6: 'Equipamento danificado',
                    macro7: 'Manutenção necessária',
                    macro8: 'Área em bom estado',
                    macro9: 'Observações adicionais'
                };
                console.log('Using hardcoded default macros');
            }
        }
        
        // Setup macros functionality (keyboard listeners)
        this.setupMacros();
        
        console.log('Macros initialized at startup');
        
        // Debug: Log the current configuration
        if (this.savedMacroConfig) {
            console.log('Active macro configuration:', this.savedMacroConfig);
        }
    }

    /**
     * Show configuration dialog
     */
    showConfigDialog() {
        console.log('showConfigDialog called');
        const configModal = document.getElementById('configModal');
        console.log('configModal element:', configModal);
        
        if (configModal) {
            console.log('Setting modal display to flex');
            configModal.style.display = 'flex';
            
            // Only setup once
            if (!this.configModalSetup) {
                console.log('Setting up config modal for first time');
                this.setupConfigModal();
                this.configModalSetup = true;
            }
        } else {
            console.error('Config modal element not found!');
        }
    }

    /**
     * Setup configuration modal functionality
     */
    setupConfigModal() {
        const closeBtn = document.getElementById('closeModalBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const saveBtn = document.getElementById('saveConfigBtn');
        const configModal = document.getElementById('configModal');

        // Close modal handlers
        const closeModal = () => {
            if (configModal) {
                configModal.style.display = 'none';
            }
        };

        // Remove existing event listeners to prevent duplicates
        if (closeBtn) {
            closeBtn.removeEventListener('click', closeModal);
            closeBtn.addEventListener('click', closeModal);
        }

        if (cancelBtn) {
            cancelBtn.removeEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);
        }

        if (saveBtn) {
            const saveHandler = () => {
                // Save complete configuration logic
                this.saveCompleteConfiguration();
                console.log('Complete configuration saved');
                closeModal();
            };
            saveBtn.removeEventListener('click', saveHandler);
            saveBtn.addEventListener('click', saveHandler);
        }

        // Close modal when clicking outside
        if (configModal) {
            const outsideClickHandler = (e) => {
                if (e.target === configModal) {
                    closeModal();
                }
            };
            configModal.removeEventListener('click', outsideClickHandler);
            configModal.addEventListener('click', outsideClickHandler);
        }

        // Setup tab switching
        this.setupConfigTabs();
        
        // Setup real-time preview updates
        this.setupPreviewUpdates();
        
        // Set default values if none are configured (only when modal is opened)
        this.setDefaultValues();
        
        // Setup global configuration file management buttons
        this.setupConfigFileButtons();
        
        // Setup reset macros button (for macro-specific reset)
        this.setupResetMacrosButton();
    }

    /**
     * Setup configuration tabs
     */
    setupConfigTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            // Remove existing event listeners to prevent duplicates
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', () => {
                const targetTab = newButton.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                newButton.classList.add('active');
                const targetContent = document.getElementById(targetTab + 'Tab');
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    /**
     * Setup real-time preview updates
     */
    setupPreviewUpdates() {
        // Initialize PDF.js
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        // Initialize PDF viewer state
        this.pdfViewerState = {
            currentPage: 1,
            totalPages: 0,
            scale: 0.95, // Default scale for better visibility
            pdfDoc: null
        };

        // Setup PDF navigation controls
        this.setupPDFControls();

        // Get form elements
        const formFields = [
            'header1', 'header2', 'title', 'datePrefix', 'referenceNumber',
            'description', 'address', 'postalCode', 'contactPhone'
        ];

        // Create debounced update function
        let updateTimeout;
        const debouncedUpdate = () => {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                this.generateAndRenderPDF();
            }, 500); // Wait 500ms after user stops typing
        };

        // Setup event listeners for real-time updates
        formFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', debouncedUpdate);
                field.addEventListener('change', debouncedUpdate);
            }
        });

        // Initial PDF generation
        this.generateAndRenderPDF();
    }

    /**
     * Setup PDF viewer navigation controls
     */
    setupPDFControls() {
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const zoomFitBtn = document.getElementById('zoomFitBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.pdfViewerState.currentPage > 1) {
                    this.pdfViewerState.currentPage--;
                    this.renderPDFPage();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.pdfViewerState.currentPage < this.pdfViewerState.totalPages) {
                    this.pdfViewerState.currentPage++;
                    this.renderPDFPage();
                }
            });
        }

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                this.pdfViewerState.scale *= 1.2;
                this.renderPDFPage();
            });
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                this.pdfViewerState.scale /= 1.2;
                this.renderPDFPage();
            });
        }

        if (zoomFitBtn) {
            zoomFitBtn.addEventListener('click', () => {
                this.pdfViewerState.scale = 0.75;
                this.renderPDFPage();
            });
        }
    }

    /**
     * Generate PDF and render it in the viewer
     */
    async generateAndRenderPDF() {
        try {
            // Show loading indicator
            const loadingEl = document.getElementById('pdfLoading');
            if (loadingEl) {
                loadingEl.classList.remove('hidden');
            }

            // Get configuration and generate PDF
            const config = this.getPDFConfiguration();
            const pdfBlob = await this.app.pdfGenerator.generateConfigPDF(config, this.app.processedImages);
            
            // Convert blob to array buffer
            const arrayBuffer = await pdfBlob.arrayBuffer();
            
            // Load PDF with PDF.js
            if (typeof pdfjsLib !== 'undefined') {
                const typedArray = new Uint8Array(arrayBuffer);
                this.pdfViewerState.pdfDoc = await pdfjsLib.getDocument(typedArray).promise;
                this.pdfViewerState.totalPages = this.pdfViewerState.pdfDoc.numPages;
                this.pdfViewerState.currentPage = 1;
                
                // Render first page
                await this.renderPDFPage();
                
                // Update navigation
                this.updatePDFNavigation();
            }

            // Hide loading indicator
            if (loadingEl) {
                loadingEl.classList.add('hidden');
            }

        } catch (error) {
            console.error('Error generating PDF preview:', error);
            
            // Hide loading indicator
            const loadingEl = document.getElementById('pdfLoading');
            if (loadingEl) {
                loadingEl.classList.add('hidden');
            }
        }
    }

    /**
     * Render current PDF page to canvas
     */
    async renderPDFPage() {
        if (!this.pdfViewerState.pdfDoc) return;

        try {
            const page = await this.pdfViewerState.pdfDoc.getPage(this.pdfViewerState.currentPage);
            const canvas = document.getElementById('pdfCanvas');
            const context = canvas.getContext('2d');

            const viewport = page.getViewport({ scale: this.pdfViewerState.scale });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;
            this.updatePDFNavigation();

        } catch (error) {
            console.error('Error rendering PDF page:', error);
        }
    }

    /**
     * Update PDF navigation controls
     */
    updatePDFNavigation() {
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');

        if (pageInfo) {
            pageInfo.textContent = `Page ${this.pdfViewerState.currentPage} of ${this.pdfViewerState.totalPages}`;
        }

        if (prevBtn) {
            prevBtn.disabled = this.pdfViewerState.currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.pdfViewerState.currentPage >= this.pdfViewerState.totalPages;
        }
    }

    /**
     * Get PDF configuration for PDF generation
     * @returns {Object} Complete PDF configuration
     */
    getPDFConfiguration() {
        return {
            header1: this.getFieldValue('header1', 'DAV - DIRETORIA DE ÁREAS VERDES / DMA - DIVISÃO DE MEIO AMBIENTE'),
            header2: this.getFieldValue('header2', 'UNICAMP - UNIVERSIDADE ESTADUAL DE CAMPINAS'),
            title: this.getFieldValue('title', 'RELATÓRIO DE REALIZAÇÃO DE SERVIÇOS - PROVAC'),
            datePrefix: this.getFieldValue('datePrefix', 'DATA DO RELATÓRIO:'),
            referenceNumber: this.getFieldValue('referenceNumber', 'CONTRATO Nº: 039/2019 - PROVAC TERCEIRIZAÇÃO DE MÃO DE OBRA LTDA'),
            description: this.getFieldValue('description', 'Vistoria de campo realizada pelos técnicos da DAV.'),
            address: this.getFieldValue('address', 'Rua 5 de Junho, 251 - Cidade Universitária Zeferino Vaz - Campinas - SP'),
            postalCode: this.getFieldValue('postalCode', '13083-877'),
            contactPhone: this.getFieldValue('contactPhone', 'mascard@unicamp.br')
        };
    }

    /**
     * Get field value from form or default
     * @param {string} fieldId - The ID of the form field
     * @param {string} defaultValue - Default value if field not found
     * @returns {string} Field value or default
     */
    getFieldValue(fieldId, defaultValue) {
        const field = document.getElementById(fieldId);
        return field ? field.value : defaultValue;
    }

    /**
     * Setup macros functionality
     */
    setupMacros() {
        // Remove any existing event listeners
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }

        // Create new keydown handler
        this.keydownHandler = (event) => {
            // Only process if an image is selected and we're not in an input field
            if (this.app.selectedImageIndex === -1 || 
                event.target.tagName === 'INPUT' || 
                event.target.tagName === 'TEXTAREA') {
                return;
            }

            // Check for numpad keys (Numpad1-Numpad9) or regular number keys (1-9)
            let macroNumber = null;
            
            if (event.code >= 'Numpad1' && event.code <= 'Numpad9') {
                macroNumber = event.code.replace('Numpad', '');
            } else if (event.code >= 'Digit1' && event.code <= 'Digit9') {
                macroNumber = event.code.replace('Digit', '');
            }

            if (macroNumber) {
                event.preventDefault();
                this.applyMacro(macroNumber);
            }
        };

        // Add the event listener
        document.addEventListener('keydown', this.keydownHandler);
    }

    /**
     * Apply a macro to the currently selected image
     * @param {string} macroNumber - The macro number (1-9)
     */
    applyMacro(macroNumber) {
        const selectedImage = this.app.processedImages[this.app.selectedImageIndex];
        if (!selectedImage) {
            console.warn('No image selected for macro application');
            return;
        }

        const macroText = this.getMacroText(macroNumber);
        console.log(`Getting macro ${macroNumber}: "${macroText}"`); // Debug log
        
        if (!macroText.trim()) {
            console.warn(`Macro ${macroNumber} is not configured`);
            console.log('Current savedMacroConfig:', this.savedMacroConfig); // Debug log
            return;
        }

        // Initialize comments if not present
        if (!selectedImage.comments) {
            selectedImage.comments = '';
        }

        // Add macro text to comments (new line if there's existing content)
        if (selectedImage.comments.trim()) {
            selectedImage.comments += '\n' + macroText;
        } else {
            selectedImage.comments = macroText;
        }

        // Update the comment textarea if it's visible
        const commentTextarea = document.getElementById('imageComment');
        if (commentTextarea) {
            commentTextarea.value = selectedImage.comments;
            
            // Trigger input event to update character counter
            const inputEvent = new Event('input', { bubbles: true });
            commentTextarea.dispatchEvent(inputEvent);
        }

        console.log(`Applied macro ${macroNumber}: "${macroText}" to image ${this.app.selectedImageIndex}`);
    }

    /**
     * Get macro text for a specific number
     * @param {string} macroNumber - The macro number (1-9)
     * @returns {string} The macro text
     */
    getMacroText(macroNumber) {
        const macroField = document.getElementById(`macro${macroNumber}`);
        if (macroField && macroField.value.trim()) {
            console.log(`Got macro ${macroNumber} from DOM: "${macroField.value}"`); // Debug log
            return macroField.value;
        }
        
        // Fallback to saved configuration if DOM element doesn't exist or is empty
        if (this.savedMacroConfig && this.savedMacroConfig[`macro${macroNumber}`]) {
            console.log(`Got macro ${macroNumber} from saved config: "${this.savedMacroConfig[`macro${macroNumber}`]}"`); // Debug log
            return this.savedMacroConfig[`macro${macroNumber}`];
        }
        
        // Fallback to default macros
        const defaultMacros = {
            macro1: 'Área limpa e organizada',
            macro2: 'Necessita limpeza',
            macro3: 'Poda realizada',
            macro4: 'Irrigação funcionando',
            macro5: 'Problemas de drenagem',
            macro6: 'Equipamento danificado',
            macro7: 'Manutenção necessária',
            macro8: 'Área em bom estado',
            macro9: 'Observações adicionais'
        };
        
        const defaultText = defaultMacros[`macro${macroNumber}`] || '';
        console.log(`Got macro ${macroNumber} from defaults: "${defaultText}"`); // Debug log
        return defaultText;
    }

    /**
     * Save macro configuration to localStorage
     */
    saveMacroConfiguration() {
        const macroConfig = {};
        
        for (let i = 1; i <= 9; i++) {
            const macroField = document.getElementById(`macro${i}`);
            if (macroField) {
                macroConfig[`macro${i}`] = macroField.value;
            }
        }

        try {
            localStorage.setItem('reportlab_macros', JSON.stringify(macroConfig));
            console.log('Macro configuration saved');
        } catch (error) {
            console.error('Error saving macro configuration:', error);
        }
    }

    /**
     * Load macro configuration from localStorage
     */
    loadMacroConfiguration() {
        try {
            const savedConfig = localStorage.getItem('reportlab_macros');
            if (savedConfig) {
                const macroConfig = JSON.parse(savedConfig);
                
                // Store the configuration for later use if DOM elements don't exist yet
                this.savedMacroConfig = macroConfig;
                
                for (let i = 1; i <= 9; i++) {
                    const macroField = document.getElementById(`macro${i}`);
                    if (macroField && macroConfig[`macro${i}`]) {
                        macroField.value = macroConfig[`macro${i}`];
                    }
                }
                
                console.log('Macro configuration loaded from localStorage');
                return true; // Successfully loaded from localStorage
            } else {
                console.log('No saved macro configuration found in localStorage');
                return false; // No saved configuration
            }
        } catch (error) {
            console.error('Error loading macro configuration:', error);
            return false; // Error occurred
        }
    }

    /**
     * Load complete configuration from db/config.json file
     */
    async loadConfigurationFromFile() {
        try {
            const response = await fetch('db/config.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const config = await response.json();
            
            // Validate the configuration structure using FileManager
            const fileManager = this.getFileManager();
            if (!fileManager.validateConfigStructure(config)) {
                throw new Error('Invalid configuration structure');
            }
            
            // Store both PDF and macro configurations
            this.savedPDFConfig = config.pdf;
            this.savedMacroConfig = config.macros;
            
            // Update PDF form fields if they exist
            if (config.pdf) {
                this.loadPDFConfigurationToForm(config.pdf);
            }
            
            // Update macro fields if they exist
            if (config.macros) {
                this.loadMacroConfigurationToForm(config.macros);
            }
            
            console.log('Complete configuration loaded from db/config.json');
            return true; // Successfully loaded from file
        } catch (error) {
            console.log('Could not load configuration from file:', error.message);
            return false; // Could not load from file
        }
    }

    /**
     * Load PDF configuration to form fields
     */
    loadPDFConfigurationToForm(pdfConfig) {
        const fieldMappings = {
            'header1': 'header1',
            'header2': 'header2', 
            'title': 'title',
            'datePrefix': 'datePrefix',
            'referenceNumber': 'referenceNumber',
            'description': 'description',
            'address': 'address',
            'postalCode': 'postalCode',
            'contactPhone': 'contactPhone'
        };

        for (const [fieldId, configKey] of Object.entries(fieldMappings)) {
            const field = document.getElementById(fieldId);
            if (field && pdfConfig[configKey]) {
                field.value = pdfConfig[configKey];
            }
        }
    }

    /**
     * Load macro configuration to form fields
     */
    loadMacroConfigurationToForm(macroConfig) {
        for (let i = 1; i <= 9; i++) {
            const macroField = document.getElementById(`macro${i}`);
            if (macroField && macroConfig[`macro${i}`]) {
                macroField.value = macroConfig[`macro${i}`];
            }
        }
    }

    /**
     * Initialize default configuration when no saved config exists
     */
    initializeDefaultConfig() {
        this.savedMacroConfig = this.getFileManager().getDefaultMacros();
        this.savedPDFConfig = this.getFileManager().getDefaultPDFConfig();
        console.log('Default configuration initialized');
    }

    /**
     * Set default values for both PDF and macro configurations
     */
    setDefaultValues() {
        try {
            // Set PDF defaults
            if (this.savedPDFConfig) {
                this.loadPDFConfigurationToForm(this.savedPDFConfig);
            } else {
                const defaultPDFConfig = this.getFileManager().getDefaultPDFConfig();
                this.loadPDFConfigurationToForm(defaultPDFConfig);
            }
        } catch (error) {
            console.warn('Could not load PDF defaults from FileManager:', error.message);
            // Use hardcoded PDF defaults
            const hardcodedPDFDefaults = {
                header1: 'DAV - DIRETORIA DE ÁREAS VERDES / DMA - DIVISÃO DE MEIO AMBIENTE',
                header2: 'UNICAMP - UNIVERSIDADE ESTADUAL DE CAMPINAS',
                title: 'RELATÓRIO DE REALIZAÇÃO DE SERVIÇOS - PROVAC',
                datePrefix: 'DATA DO RELATÓRIO:',
                referenceNumber: 'CONTRATO Nº: 039/2019 - PROVAC TERCEIRIZAÇÃO DE MÃO DE OBRA LTDA',
                description: 'Vistoria de campo realizada pelos técnicos da DAV.',
                address: 'Rua 5 de Junho, 251 - Cidade Universitária Zeferino Vaz - Campinas - SP',
                postalCode: '13083-877',
                contactPhone: 'mascard@unicamp.br'
            };
            this.loadPDFConfigurationToForm(hardcodedPDFDefaults);
        }

        // Set macro defaults  
        const defaultMacros = {
            macro1: 'JUJUBA',  // Use user's custom values from config.json
            macro2: 'XUXU',
            macro3: 'Poda realizada',
            macro4: 'Irrigação funcionando',
            macro5: 'Problemas de drenagem',
            macro6: 'Equipamento danificado',
            macro7: 'Manutenção necessária',
            macro8: 'Área em bom estado',
            macro9: 'Observações adicionais'
        };

        for (let i = 1; i <= 9; i++) {
            const macroField = document.getElementById(`macro${i}`);
            if (macroField) {
                // First try to use saved configuration
                if (this.savedMacroConfig && this.savedMacroConfig[`macro${i}`]) {
                    macroField.value = this.savedMacroConfig[`macro${i}`];
                } else if (!macroField.value) {
                    // Only set default if field is empty
                    macroField.value = defaultMacros[`macro${i}`] || '';
                }
            }
        }
    }

    /**
     * Setup global configuration file management buttons
     */
    setupConfigFileButtons() {
        const loadBtn = document.getElementById('loadConfigBtn');
        const exportBtn = document.getElementById('exportConfigBtn');
        const resetBtn = document.getElementById('resetConfigBtn');

        if (loadBtn) {
            // Remove existing event listener
            const newLoadBtn = loadBtn.cloneNode(true);
            loadBtn.parentNode.replaceChild(newLoadBtn, loadBtn);
            
            newLoadBtn.addEventListener('click', async () => {
                await this.loadConfigFromFile();
            });
        }

        if (exportBtn) {
            // Remove existing event listener
            const newExportBtn = exportBtn.cloneNode(true);
            exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
            
            newExportBtn.addEventListener('click', () => {
                this.exportConfigToFile();
            });
        }

        if (resetBtn) {
            // Remove existing event listener
            const newResetBtn = resetBtn.cloneNode(true);
            resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
            
            newResetBtn.addEventListener('click', () => {
                if (confirm('Tem certeza que deseja restaurar TODAS as configurações para os valores padrão? Esta ação não pode ser desfeita.')) {
                    this.resetToDefaultConfig();
                }
            });
        }
    }

    /**
     * Load complete configuration from file
     */
    async loadConfigFromFile() {
        try {
            const config = await this.getFileManager().loadConfigFromFile();
            
            if (config) {
                // Update the saved configurations
                this.savedPDFConfig = config.pdf;
                this.savedMacroConfig = config.macros;
                
                // Update form fields
                this.loadPDFConfigurationToForm(config.pdf);
                this.loadMacroConfigurationToForm(config.macros);
                
                // Save to localStorage as well
                this.saveCompleteConfiguration();
                
                alert('Configuração completa carregada com sucesso do arquivo!');
                console.log('Complete configuration loaded from file and applied');
            }
        } catch (error) {
            console.error('Error loading configuration from file:', error);
            alert('Erro ao carregar configuração do arquivo.');
        }
    }

    /**
     * Export current complete configuration to file
     */
    exportConfigToFile() {
        try {
            // Get current configuration from DOM
            const pdfConfig = this.getCurrentPDFConfiguration();
            const macroConfig = this.getCurrentMacroConfiguration();
            
            const fullConfig = {
                pdf: pdfConfig,
                macros: macroConfig
            };
            
            // Use FileManager to save the file
            this.getFileManager().saveConfigToFile(fullConfig);
            
            console.log('Complete configuration exported to file');
        } catch (error) {
            console.error('Error exporting configuration to file:', error);
            alert('Erro ao exportar configuração para arquivo.');
        }
    }

    /**
     * Get current PDF configuration from form
     */
    getCurrentPDFConfiguration() {
        const config = {};
        const fieldMappings = {
            'header1': 'header1',
            'header2': 'header2', 
            'title': 'title',
            'datePrefix': 'datePrefix',
            'referenceNumber': 'referenceNumber',
            'description': 'description',
            'address': 'address',
            'postalCode': 'postalCode',
            'contactPhone': 'contactPhone'
        };

        for (const [fieldId, configKey] of Object.entries(fieldMappings)) {
            const field = document.getElementById(fieldId);
            if (field) {
                config[configKey] = field.value || '';
            }
        }

        return config;
    }

    /**
     * Get current macro configuration from form
     */
    getCurrentMacroConfiguration() {
        const macroConfig = {};
        
        for (let i = 1; i <= 9; i++) {
            const macroField = document.getElementById(`macro${i}`);
            if (macroField) {
                macroConfig[`macro${i}`] = macroField.value || '';
            }
        }

        return macroConfig;
    }

    /**
     * Save complete configuration to localStorage
     */
    saveCompleteConfiguration() {
        // Save macro configuration
        this.saveMacroConfiguration();
        
        // Save PDF configuration
        const pdfConfig = this.getCurrentPDFConfiguration();
        try {
            localStorage.setItem('reportlab_pdf', JSON.stringify(pdfConfig));
            console.log('PDF configuration saved to localStorage');
        } catch (error) {
            console.error('Error saving PDF configuration:', error);
        }
    }

    /**
     * Reset all configurations to default values
     */
    resetToDefaultConfig() {
        const defaultConfig = this.getFileManager().getDefaultConfig();

        // Reset PDF fields
        this.loadPDFConfigurationToForm(defaultConfig.pdf);
        
        // Reset macro fields
        this.loadMacroConfigurationToForm(defaultConfig.macros);
        
        // Update saved configurations
        this.savedPDFConfig = defaultConfig.pdf;
        this.savedMacroConfig = defaultConfig.macros;
        
        // Save the reset configuration
        this.saveCompleteConfiguration();
        console.log('All configurations reset to default values');
    }

    /**
     * Setup reset macros button functionality
     */
    setupResetMacrosButton() {
        const resetBtn = document.getElementById('resetMacrosBtn');
        if (resetBtn) {
            // Remove existing event listener
            const newResetBtn = resetBtn.cloneNode(true);
            resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
            
            newResetBtn.addEventListener('click', () => {
                if (confirm('Tem certeza que deseja restaurar os macros para os valores padrão? Esta ação não pode ser desfeita.')) {
                    this.resetToDefaultMacros();
                }
            });
        }
    }

    /**
     * Reset macros to default values
     */
    resetToDefaultMacros() {
        const defaultMacros = this.getFileManager().getDefaultMacros();

        for (let i = 1; i <= 9; i++) {
            const macroField = document.getElementById(`macro${i}`);
            if (macroField) {
                macroField.value = defaultMacros[`macro${i}`] || '';
            }
        }
        
        // Update saved configuration
        this.savedMacroConfig = defaultMacros;
        
        // Save the reset configuration
        this.saveMacroConfiguration();
        console.log('Macros reset to default values');
    }
}

// Export the class
window.ConfigManager = ConfigManager;
