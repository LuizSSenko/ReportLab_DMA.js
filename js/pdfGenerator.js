// PDF generation module for creating reports

class PDFGenerator {
    constructor() {
        this.doc = null;
        this.pageHeight = 210; // A4 height in mm (landscape)
        this.pageWidth = 297;  // A4 width in mm (landscape)
        this.margin = 20;
        this.currentY = this.margin;
        this.lineHeight = 7;
    }

    /**
     * Generate PDF report from processed images and analysis results - Optimized for large datasets
     */
    async generateReport(images, geojsonData, analysisResults) {
        try {
            AppUtils.showLoading('Initializing PDF generation...');

            // Get current PDF configuration
            const config = this.getPDFConfiguration();
            
            // Count selected images
            const selectedImages = images.filter(img => img.imageSelected);
            console.log(`Generating PDF for ${selectedImages.length} selected images`);
            
            // Check if we have too many images and warn user
            if (selectedImages.length > 100) {
                const proceed = confirm(`You are about to generate a PDF with ${selectedImages.length} images. This may take several minutes and create a very large file. Do you want to continue?`);
                if (!proceed) {
                    AppUtils.hideLoading();
                    return { success: false, message: 'PDF generation cancelled by user' };
                }
            }

            // Initialize jsPDF (landscape mode for A4)
            const { jsPDF } = window.jspdf;
            this.doc = new jsPDF('landscape', 'mm', 'a4');
            this.pageHeight = 210; // A4 landscape height
            this.pageWidth = 297;  // A4 landscape width
            this.currentY = this.margin;

            // Generate cover page
            AppUtils.showLoading('Adding cover page...');
            await this.addCoverPage(config);
            
            // Add image pages with progress tracking
            AppUtils.showLoading('Processing images...');
            await this.addImagePages(images);
            
            // Add final signature page
            AppUtils.showLoading('Adding signature page...');
            this.addSignaturePage(config);

            // Fix page numbering for all pages
            AppUtils.showLoading('Finalizing PDF...');
            this.fixPageNumbers();

            // Save the PDF
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `relatorio-servicos-${timestamp}.pdf`;
            
            AppUtils.showLoading('Saving PDF file...');
            
            // Add small delay before saving to ensure all operations complete
            await new Promise(resolve => setTimeout(resolve, 500));
            
            this.doc.save(filename);
            
            AppUtils.hideLoading();
            
            return {
                success: true,
                filename: filename,
                pageCount: this.doc.internal.getNumberOfPages(),
                imageCount: selectedImages.length
            };
        } catch (error) {
            AppUtils.hideLoading();
            console.error('Error generating PDF:', error);
            
            // Provide more specific error information
            let errorMessage = error.message;
            if (error.message.includes('Invalid string length')) {
                errorMessage = 'PDF too large. Try reducing the number of images or image quality.';
            }
            
            throw new Error(`Failed to generate PDF: ${errorMessage}`);
        }
    }

    /**
     * Fix page numbers throughout the document (exactly as shown in screenshots)
     */
    fixPageNumbers() {
        const totalPages = this.doc.internal.getNumberOfPages();
        
        for (let i = 1; i <= totalPages; i++) {
            this.doc.setPage(i);
            
            // Clear only the page number area (not the entire bottom section)
            this.doc.setFillColor(255, 255, 255);
            this.doc.rect(this.pageWidth / 2 - 20, this.pageHeight - 8, 40, 8, 'F'); // Clear only around page number
            
            // Add page number at bottom center (as shown in screenshots)
            this.doc.setFontSize(8);
            this.doc.setFont('helvetica', 'normal');
            this.doc.setTextColor(0, 0, 0);
            
            // Format: "Página X de Y" (as shown in screenshots)
            this.doc.text(`Página ${i} de ${totalPages}`, this.pageWidth / 2, this.pageHeight - 5, { align: 'center' });
        }
    }
    
    /**
     * Get PDF configuration
     */
    getPDFConfiguration() {
        // Try to get from app instance if available
        if (window.app && typeof window.app.getPDFConfiguration === 'function') {
            return window.app.getPDFConfiguration();
        }
        
        // Fallback to localStorage
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
     * Add cover page with configuration data (corrected coordinate system)
     */
    async addCoverPage(config) {
        // Logo positioning (correcting coordinate system - Y starts from top)
        const leftLogoOffset = 15; // 15mm from left edge
        const rightLogoOffset = 40; // 40mm from right edge
        const maxLogoHeight = 25; // Maximum height for logos
        
        // Load and add logos with original proportions
        try {
            // Left logo (Logo_001.png) positioned 30mm from top
            const leftLogoInfo = await this.loadLogoImage('Logo_001.png');
            
            // Calculate dimensions to fit within max height while preserving aspect ratio
            let leftLogoHeight = maxLogoHeight;
            let leftLogoWidth = leftLogoHeight * leftLogoInfo.aspectRatio;
            
            // If width exceeds reasonable bounds, scale down
            if (leftLogoWidth > 40) {
                leftLogoWidth = 40;
                leftLogoHeight = leftLogoWidth / leftLogoInfo.aspectRatio;
            }
            
            this.doc.addImage(leftLogoInfo.dataURL, 'PNG', leftLogoOffset, 30, leftLogoWidth, leftLogoHeight);
        } catch (error) {
            console.error('Error loading left logo:', error);
            // Fallback to placeholder
            this.doc.setDrawColor(150, 150, 150);
            this.doc.setFillColor(240, 240, 240);
            this.doc.rect(leftLogoOffset, 30, 25, 25, 'FD');
            this.doc.setFontSize(8);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text('LOGO', leftLogoOffset + 12.5, 42.5, { align: 'center' });
        }
        
        try {
            // Right logo (Logo_002.png) positioned 24mm from top
            const rightLogoInfo = await this.loadLogoImage('Logo_002.png');
            
            // Calculate dimensions to fit within max height while preserving aspect ratio
            let rightLogoHeight = maxLogoHeight;
            let rightLogoWidth = rightLogoHeight * rightLogoInfo.aspectRatio;
            
            // If width exceeds reasonable bounds, scale down
            if (rightLogoWidth > 40) {
                rightLogoWidth = 40;
                rightLogoHeight = rightLogoWidth / rightLogoInfo.aspectRatio;
            }
            
            this.doc.addImage(rightLogoInfo.dataURL, 'PNG', this.pageWidth - rightLogoOffset - rightLogoWidth, 24, rightLogoWidth, rightLogoHeight);
        } catch (error) {
            console.error('Error loading right logo:', error);
            // Fallback to placeholder
            this.doc.setDrawColor(150, 150, 150);
            this.doc.setFillColor(240, 240, 240);
            this.doc.rect(this.pageWidth - rightLogoOffset - 25, 24, 25, 25, 'FD');
            this.doc.setFontSize(8);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text('LOGO', this.pageWidth - rightLogoOffset - 12.5, 36.5, { align: 'center' });
        }
        
        // Header section (positioned from top)
        // Header 1 at 30mm from top
        this.doc.setFontSize(14);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(config.header1, this.pageWidth / 2, 30, { align: 'center' });
        
        // Header 2 at 40mm from top
        this.doc.setFontSize(14);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(config.header2, this.pageWidth / 2, 40, { align: 'center' });
        
        // Title at 60mm from top
        this.doc.setFontSize(16);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(config.title, this.pageWidth / 2, 60, { align: 'center' });
        
        // Content section starting at 80mm from top
        this.doc.setFontSize(12);
        this.doc.setFont('helvetica', 'normal');
        
        // Date at 80mm from top
        const currentDate = new Date().toLocaleDateString('pt-BR');
        this.doc.text(`${config.datePrefix} ${currentDate}`, 40, 80);
        
        // Reference number at 90mm from top
        this.doc.text(config.referenceNumber, 40, 90);
        
        // Description at 110mm from top
        this.doc.text(config.description, 40, 110);
        
        // Footer section (positioned from bottom using pageHeight)
        this.doc.setFontSize(8);
        this.doc.setFont('helvetica', 'normal');
        
        // Address at 20mm from bottom
        this.doc.text(config.address, this.pageWidth / 2, this.pageHeight - 20, { align: 'center' });
        
        // Contact info at 15mm from bottom
        this.doc.text(`CEP: ${config.postalCode} - Tel: (19) 3521-7010 - Fax: (19) 3521-7635`, 
                     this.pageWidth / 2, this.pageHeight - 15, { align: 'center' });
        
        // Email at 10mm from bottom
        this.doc.text(config.contactPhone, this.pageWidth / 2, this.pageHeight - 10, { align: 'center' });
        
        // Page number will be added later by fixPageNumbers()
    }
    
    /**
     * Add image pages with embedded images and metadata (2 images per page) - Optimized for large datasets
     */
    async addImagePages(images) {
        const selectedImages = images.filter(img => img.imageSelected);
        
        if (selectedImages.length === 0) {
            this.doc.addPage();
            this.currentY = 30;
            this.doc.setFontSize(16);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text('IMAGENS PROCESSADAS', this.pageWidth / 2, this.currentY, { align: 'center' });
            this.currentY += 20;
            
            this.doc.setFontSize(12);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text('Nenhuma imagem selecionada para o relatório.', this.margin, this.currentY);
            return;
        }
        
        console.log(`Processing ${selectedImages.length} images for PDF...`);
        
        // Process images in batches to avoid memory issues
        const batchSize = 20; // Process 20 images at a time (10 pages)
        
        for (let batchStart = 0; batchStart < selectedImages.length; batchStart += batchSize) {
            const batchEnd = Math.min(batchStart + batchSize, selectedImages.length);
            const batch = selectedImages.slice(batchStart, batchEnd);
            
            console.log(`Processing batch ${Math.floor(batchStart/batchSize) + 1}/${Math.ceil(selectedImages.length/batchSize)} (images ${batchStart + 1}-${batchEnd})`);
            
            // Update loading message
            if (window.AppUtils && AppUtils.showLoading) {
                AppUtils.showLoading(`Generating PDF... ${Math.round((batchEnd / selectedImages.length) * 100)}% complete`);
            }
            
            // Process images in pairs (2 per page) within this batch
            for (let i = 0; i < batch.length; i += 2) {
                const leftImage = batch[i];
                const rightImage = i + 1 < batch.length ? batch[i + 1] : null;
                const leftIndex = batchStart + i + 1;
                const rightIndex = rightImage ? batchStart + i + 2 : null;
                
                // Add new page for each pair of images
                this.doc.addPage();
                this.currentY = this.margin;
                
                // Add page header
                await this.addImagePageHeader();
                
                // Process first image (left side)
                try {
                    await this.addImageWithMetadata(leftImage, leftIndex, 'left');
                } catch (error) {
                    console.error(`Error adding image ${leftIndex}:`, error);
                    this.addImageErrorMessage(leftImage, leftIndex, error.message, 'left');
                }
                
                // Process second image (right side) if it exists
                if (rightImage) {
                    try {
                        await this.addImageWithMetadata(rightImage, rightIndex, 'right');
                    } catch (error) {
                        console.error(`Error adding image ${rightIndex}:`, error);
                        this.addImageErrorMessage(rightImage, rightIndex, error.message, 'right');
                    }
                }
                
                // Add footer after both images are processed
                this.addImagePageFooter();
            }
            
            // Small delay between batches to prevent browser freezing
            if (batchEnd < selectedImages.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        console.log('All images processed successfully');
    }
    
    /**
     * Add a single image with its metadata (supports left/right positioning for 2 images per page)
     */
    async addImageWithMetadata(image, index, position = 'left') {
        // Reduce space between header and images (was 50, now 42)
        const startY = 35;
        
        // Calculate layout for 2 images per page
        const usableWidth = this.pageWidth - 2 * this.margin;
        const usableHeight = this.pageHeight - startY - 40; // Reserve space for footer
        
        // Two-column layout with gap
        const columnWidth = (usableWidth - 5) / 2; // 15mm gap between columns
        const leftColumnX = this.margin;
        const rightColumnX = this.margin + columnWidth + 5;
        
        // Determine position based on parameter
        const isLeft = position === 'left';
        const columnX = isLeft ? leftColumnX : rightColumnX;
        
        // Image area background (light pink/beige)
        this.doc.setFillColor(245, 230, 230);
        this.doc.rect(columnX, startY, columnWidth, usableHeight + 14, 'F');
        
        // Calculate image dimensions while preserving aspect ratio
        const maxImageWidth = columnWidth - 20;
        const maxImageHeight = usableHeight * 0.8; // Increased slightly for better proportions
        
        // Default aspect ratio (4:3) if no image file available
        let imageWidth = maxImageWidth;
        let imageHeight = maxImageWidth * 0.75; // 4:3 aspect ratio
        
        // If we have the actual image, try to get its dimensions to preserve aspect ratio
        if (image.originalFile) {
            try {
                const img = new Image();
                // Use compressed image data for better performance
                const imageDataURL = await this.getImageDataURL(image.originalFile, 800, 600, 0.6);
                img.src = imageDataURL;
                
                await new Promise((resolve) => {
                    img.onload = () => {
                        const aspectRatio = img.width / img.height;
                        
                        // Calculate dimensions preserving aspect ratio
                        if (aspectRatio > 1) {
                            // Landscape image
                            imageWidth = Math.min(maxImageWidth, maxImageHeight * aspectRatio);
                            imageHeight = imageWidth / aspectRatio;
                        } else {
                            // Portrait image
                            imageHeight = Math.min(maxImageHeight, maxImageWidth / aspectRatio);
                            imageWidth = imageHeight * aspectRatio;
                        }
                        
                        // Ensure it fits within max bounds
                        if (imageWidth > maxImageWidth) {
                            imageWidth = maxImageWidth;
                            imageHeight = imageWidth / aspectRatio;
                        }
                        if (imageHeight > maxImageHeight) {
                            imageHeight = maxImageHeight;
                            imageWidth = imageHeight * aspectRatio;
                        }
                        
                        resolve();
                    };
                    img.onerror = () => {
                        // Keep default dimensions if image load fails
                        resolve();
                    };
                });
            } catch (error) {
                console.error('Error getting image dimensions:', error);
                // Keep default dimensions
            }
        }
        
        const imageX = columnX + 10;
        const imageY = startY + 3; // Reduced blank space above image
        
        // Add the image if available
        if (image.originalFile) {
            try {
                // Use compressed image data for PDF to reduce size
                const imageData = await this.getImageDataURL(image.originalFile, 800, 600, 0.6);
                this.doc.addImage(imageData, 'JPEG', imageX, imageY, imageWidth, imageHeight);
            } catch (error) {
                console.error('Error embedding image:', error);
                // Draw placeholder rectangle
                this.doc.setDrawColor(200, 200, 200);
                this.doc.setFillColor(240, 240, 240);
                this.doc.rect(imageX, imageY, imageWidth, imageHeight, 'FD');
                
                // Add error text
                this.doc.setFontSize(10);
                this.doc.setFont('helvetica', 'normal');
                this.doc.setTextColor(100, 100, 100);
                this.doc.text('Erro ao carregar', imageX + imageWidth/2, imageY + imageHeight/2 - 3, { align: 'center' });
                this.doc.text('imagem', imageX + imageWidth/2, imageY + imageHeight/2 + 3, { align: 'center' });
                this.doc.setTextColor(0, 0, 0); // Reset color
            }
        } else {
            // Draw placeholder rectangle
            this.doc.setDrawColor(200, 200, 200);
            this.doc.setFillColor(240, 240, 240);
            this.doc.rect(imageX, imageY, imageWidth, imageHeight, 'FD');
            
            // Add placeholder text
            this.doc.setFontSize(10);
            this.doc.setFont('helvetica', 'normal');
            this.doc.setTextColor(100, 100, 100);
            this.doc.text('Imagem não', imageX + imageWidth/2, imageY + imageHeight/2 - 3, { align: 'center' });
            this.doc.text('disponível', imageX + imageWidth/2, imageY + imageHeight/2 + 3, { align: 'center' });
            this.doc.setTextColor(0, 0, 0); // Reset color
        }
        
        // Add metadata below the image with reduced spacing
        const metadataX = imageX;
        let metadataY = imageY + imageHeight + 6; // Further reduced spacing after image
        const lineSpacing = 4; // Reduced from 6 to 4 for tighter spacing
        const availableMetadataWidth = columnWidth - 20;
        
        // Index number (formatted as 001, 002, etc.)
        this.doc.setFontSize(12);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(0, 0, 0);
        this.doc.text(`${String(index).padStart(3, '0')}`, metadataX, metadataY);
        metadataY += lineSpacing - 1; // Reduced space between index and Data e Hora
        
        // Date and time - Fixed EXIF parsing
        let dateTimeStr = 'Data não disponível';
        if (image.datetime) {
            try {
                // EXIF DateTime format is "YYYY:MM:DD HH:MM:SS"
                // Convert to DD/MM/YYYY HH:MM format
                if (typeof image.datetime === 'string' && image.datetime.includes(':')) {
                    // Parse EXIF DateTime format "YYYY:MM:DD HH:MM:SS"
                    const parts = image.datetime.split(' ');
                    if (parts.length === 2) {
                        const datePart = parts[0]; // "YYYY:MM:DD"
                        const timePart = parts[1]; // "HH:MM:SS"
                        
                        const dateComponents = datePart.split(':');
                        const timeComponents = timePart.split(':');
                        
                        if (dateComponents.length === 3 && timeComponents.length >= 2) {
                            const year = dateComponents[0];
                            const month = dateComponents[1];
                            const day = dateComponents[2];
                            const hour = timeComponents[0];
                            const minute = timeComponents[1];
                            
                            // Format as DD/MM/YYYY HH:MM
                            dateTimeStr = `${day}/${month}/${year} ${hour}:${minute}`;
                        }
                    }
                } else {
                    // Fallback: try to parse as regular date
                    const date = new Date(image.datetime);
                    if (!isNaN(date.getTime())) {
                        dateTimeStr = date.toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                }
            } catch (error) {
                console.error('Error formatting date:', error);
                dateTimeStr = 'Erro ao formatar data';
            }
        }
        
        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Data e hora: ', metadataX, metadataY);
        this.doc.setFont('helvetica', 'normal');
        const labelWidth = this.doc.getTextWidth('Data e hora: ');
        
        // Wrap long date/time if needed
        const dateLines = this.doc.splitTextToSize(dateTimeStr, availableMetadataWidth - labelWidth);
        this.doc.text(dateLines, metadataX + labelWidth, metadataY);
        metadataY += (dateLines.length * lineSpacing);
        
        // Quadra and Sigla - Fixed string conversion
        let quadraCanteiro = 'N/A';
        let sigla = 'N/A';
        
        if (image.locationInfo && image.locationInfo.feature && image.locationInfo.feature.properties) {
            const props = image.locationInfo.feature.properties;
            const rawValue = props.Quadra || props.quadra || props.Canteiro || props.canteiro || props.number || props.Number || 'N/A';
            quadraCanteiro = String(rawValue); // Ensure it's always a string
        }
        
        if (image.locationInfo && image.locationInfo.sigla) {
            sigla = String(image.locationInfo.sigla); // Ensure it's always a string
        }
        
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Quadra: ', metadataX, metadataY);
        const quadraLabelWidth = this.doc.getTextWidth('Quadra: ');
        this.doc.setFont('helvetica', 'normal');
        
        // Create combined text and wrap if needed
        const quadraSiglaText = `${quadraCanteiro}, Sigla: ${sigla}`;
        const combinedLines = this.doc.splitTextToSize(quadraSiglaText, availableMetadataWidth - quadraLabelWidth);
        this.doc.text(combinedLines, metadataX + quadraLabelWidth, metadataY);
        metadataY += (combinedLines.length * lineSpacing);
        
        // Location (Google Maps URL - wrapped for smaller space)
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Localização: ', metadataX, metadataY);
        
        if (image.hasGPS && image.latitude && image.longitude) {
            // Round coordinates to 6 decimal places to avoid precision issues
            const roundedLat = parseFloat(image.latitude).toFixed(6);
            const roundedLng = parseFloat(image.longitude).toFixed(6);
            const googleMapsUrl = `https://www.google.com/maps?q=${roundedLat},${roundedLng}`;
            
            this.doc.setFont('helvetica', 'normal');
            this.doc.setTextColor(0, 0, 255); // Blue color for link
            
            const locLabelWidth = this.doc.getTextWidth('Localização: ') + 1; // Add 1mm extra space
            
            // Check if URL fits in one line
            const availableUrlWidth = availableMetadataWidth - locLabelWidth;
            const urlWidth = this.doc.getTextWidth(googleMapsUrl);
            
            if (urlWidth <= availableUrlWidth) {
                // URL fits in one line
                this.doc.text(googleMapsUrl, metadataX + locLabelWidth, metadataY);
                metadataY += lineSpacing;
            } else {
                // Break URL at a safe point (after the domain)
                const baseUrl = 'https://www.google.com/maps?q=';
                const coordinates = `${roundedLat},${roundedLng}`;
                
                // First line: base URL
                this.doc.text(baseUrl, metadataX + locLabelWidth, metadataY);
                metadataY += lineSpacing;
                
                // Second line: coordinates (indented slightly)
                this.doc.text(coordinates, metadataX + locLabelWidth + 5, metadataY);
                metadataY += lineSpacing;
            }
            
            this.doc.setTextColor(0, 0, 0); // Reset to black
        } else {
            this.doc.setFont('helvetica', 'normal');
            const locLabelWidth = this.doc.getTextWidth('Localização: ') + 1; // Add 1mm extra space
            this.doc.text('GPS não disponível', metadataX + locLabelWidth, metadataY);
            metadataY += lineSpacing;
        }
        
        // Status (reduced space from Localização)
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Estado: ', metadataX, metadataY);
        this.doc.setFont('helvetica', 'normal');
        
        const status = image.workStatus || 'Não Iniciado';
        // Set color based on status
        if (status === 'Concluído') {
            this.doc.setTextColor(0, 150, 0); // Green
        } else if (status === 'Parcial') {
            this.doc.setTextColor(255, 165, 0); // Orange
        } else {
            this.doc.setTextColor(200, 0, 0); // Red
        }
        
        const estadoLabelWidth = this.doc.getTextWidth('Estado: ');
        this.doc.text(status, metadataX + estadoLabelWidth, metadataY);
        this.doc.setTextColor(0, 0, 0); // Reset to black
        
        // Add any additional comments or notes in remaining space
        metadataY += lineSpacing + 1; // Reduced spacing before observations
        if (image.comments) {
            this.doc.setFont('helvetica', 'bold');
            this.doc.text('Observações: ', metadataX, metadataY);
            metadataY += lineSpacing;
            
            this.doc.setFont('helvetica', 'normal');
            this.doc.setFontSize(8);
            const commentLines = this.doc.splitTextToSize(image.comments, availableMetadataWidth);
            this.doc.text(commentLines, metadataX, metadataY);
        }
    }
    
    /**
     * Add error message when image cannot be processed (supports left/right positioning)
     */
    addImageErrorMessage(image, index, errorMsg, position = 'left') {
        // Calculate layout for 2 images per page
        const usableWidth = this.pageWidth - 2 * this.margin;
        const columnWidth = (usableWidth - 15) / 2; // 15mm gap between columns
        const leftColumnX = this.margin;
        const rightColumnX = this.margin + columnWidth + 15;
        
        // Determine position
        const isLeft = position === 'left';
        const columnX = isLeft ? leftColumnX : rightColumnX;
        const startY = 50;
        
        const imageWidth = Math.min(columnWidth - 20, 100);
        const imageHeight = 70;
        const imageX = columnX + 10;
        const imageY = startY + 10;
        
        // Draw error placeholder
        this.doc.setDrawColor(200, 0, 0);
        this.doc.setFillColor(255, 240, 240);
        this.doc.rect(imageX, imageY, imageWidth, imageHeight, 'FD');
        
        // Add error text in placeholder
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(200, 0, 0);
        this.doc.text('ERRO', imageX + imageWidth/2, imageY + imageHeight/2 - 3, { align: 'center' });
        this.doc.setFont('helvetica', 'normal');
        this.doc.text('Imagem não carregada', imageX + imageWidth/2, imageY + imageHeight/2 + 3, { align: 'center' });
        
        // Reset colors
        this.doc.setTextColor(0, 0, 0);
        
        // Add basic metadata below image
        const metadataX = imageX;
        let metadataY = imageY + imageHeight + 10;
        const lineSpacing = 8;
        
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(`Índice: ${String(index).padStart(3, '0')}`, metadataX, metadataY);
        metadataY += lineSpacing;
        
        this.doc.text('Arquivo:', metadataX, metadataY);
        this.doc.setFont('helvetica', 'normal');
        const filenameLines = this.doc.splitTextToSize(image.filename, columnWidth - 30);
        this.doc.text(filenameLines, metadataX, metadataY + lineSpacing);
        metadataY += (filenameLines.length + 1) * lineSpacing;
        
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Erro:', metadataX, metadataY);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(200, 0, 0);
        const errorLines = this.doc.splitTextToSize(errorMsg, columnWidth - 20);
        this.doc.text(errorLines, metadataX, metadataY + lineSpacing);
        this.doc.setTextColor(0, 0, 0);
    }
    
    /**
     * Convert image file to data URL for embedding in PDF with compression
     */
    async getImageDataURL(file, maxWidth = 800, maxHeight = 600, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    // Create canvas for image compression
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate new dimensions while maintaining aspect ratio
                    let { width, height } = img;
                    
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width *= ratio;
                        height *= ratio;
                    }
                    
                    // Set canvas dimensions
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw and compress image
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to JPEG with compression
                    const compressedDataURL = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedDataURL);
                } catch (error) {
                    console.error('Error compressing image:', error);
                    // Fallback to original file reading
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = () => reject(new Error('Failed to read image file'));
                    reader.readAsDataURL(file);
                }
            };
            img.onerror = () => {
                // Fallback to original file reading
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('Failed to read image file'));
                reader.readAsDataURL(file);
            };
            
            // Create object URL for the image
            const objectURL = URL.createObjectURL(file);
            img.src = objectURL;
        });
    }
    
    /**
     * Add signature page (exactly as shown in screenshot)
     */
    addSignaturePage(config) {
        this.doc.addPage();
        
        // Position signatures in the middle of the page (as shown in screenshot)
        this.currentY = this.pageHeight / 2 - 20;
        
        // Signature boxes - centered and spaced as shown in screenshot
        const boxWidth = 80;
        const spacing = 50;
        const leftBoxX = (this.pageWidth - 2 * boxWidth - spacing) / 2;
        const rightBoxX = leftBoxX + boxWidth + spacing;
        
        // Left signature box (PREPOSTO CONTRATANTE)
        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(config.sign1, leftBoxX + boxWidth / 2, this.currentY, { align: 'center' });
        
        // Signature line (as shown in screenshot)
        this.doc.setLineWidth(0.5);
        this.doc.line(leftBoxX, this.currentY + 10, leftBoxX + boxWidth, this.currentY + 10);
        
        // Name line under the signature line
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(config.sign1Name, leftBoxX + boxWidth / 2, this.currentY + 18, { align: 'center' });
        
        // Date line (exactly as shown: "Data: ......./......./...........")
        this.doc.text('Data: ......./......./...........', leftBoxX + boxWidth / 2, this.currentY + 28, { align: 'center' });
        
        // Right signature box (PREPOSTO CONTRATADA)
        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(config.sign2, rightBoxX + boxWidth / 2, this.currentY, { align: 'center' });
        
        // Signature line
        this.doc.setLineWidth(0.5);
        this.doc.line(rightBoxX, this.currentY + 10, rightBoxX + boxWidth, this.currentY + 10);
        
        // Name line under the signature line
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(config.sign2Name, rightBoxX + boxWidth / 2, this.currentY + 18, { align: 'center' });
        
        // Date line
        this.doc.text('Data: ......./......./...........', rightBoxX + boxWidth / 2, this.currentY + 28, { align: 'center' });
        
        // Add date and location line at the bottom as shown in screenshot
        const currentDate = new Date().toLocaleDateString('pt-BR');
        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(`Rua 5 de Junho, 251 - Cidade Universitária Zeferino Vaz - Campinas - SP, ${currentDate}`, 
                     this.pageWidth / 2, this.pageHeight - 50, { align: 'center' });
        
        // Add footer
        this.addSignaturePageFooter();
    }
    
    /**
     * Add footer for signature page (exactly as shown in screenshot)
     */
    addSignaturePageFooter() {
        const config = this.getPDFConfiguration();
        
        // Footer line (as shown in screenshot)
        const footerY = this.pageHeight - 25;
        this.doc.setLineWidth(0.5);
        this.doc.setDrawColor(0, 0, 0);
        this.doc.line(this.margin, footerY, this.pageWidth - this.margin, footerY);
        
        // Footer text (as shown in screenshot)
        this.doc.setFontSize(8);
        this.doc.setFont('helvetica', 'normal');
        
        // Address line
        this.doc.text(config.address, this.pageWidth / 2, footerY + 6, { align: 'center' });
        
        // Contact info
        this.doc.text(`CEP: ${config.postalCode} - Tel: (19) 3521-7010 - Fax: (19) 3521-7635`, 
                     this.pageWidth / 2, footerY + 11, { align: 'center' });
        
        this.doc.text(config.contactPhone, this.pageWidth / 2, footerY + 16, { align: 'center' });
        
        // Page number will be added later by fixPageNumbers()
    }
    
    /**
     * Add header for image pages (exactly as shown in screenshots)
     */
    async addImagePageHeader() {
        // Get configuration for header text
        const config = this.getPDFConfiguration();
        
        // Add logo images with original proportions (as shown in screenshots)
        const maxLogoHeight = 20; // Maximum height for image page logos
        
        try {
            // Left logo (Logo_001.png)
            const leftLogoInfo = await this.loadLogoImage('Logo_001.png');
            
            // Calculate dimensions to fit within max height while preserving aspect ratio
            let leftLogoHeight = maxLogoHeight;
            let leftLogoWidth = leftLogoHeight * leftLogoInfo.aspectRatio;
            
            // If width exceeds reasonable bounds, scale down
            if (leftLogoWidth > 30) {
                leftLogoWidth = 30;
                leftLogoHeight = leftLogoWidth / leftLogoInfo.aspectRatio;
            }
            
            this.doc.addImage(leftLogoInfo.dataURL, 'PNG', this.margin, 10, leftLogoWidth, leftLogoHeight);
        } catch (error) {
            console.error('Error loading left logo for image page:', error);
            // Fallback to placeholder
            this.doc.setDrawColor(150, 150, 150);
            this.doc.setFillColor(240, 240, 240);
            this.doc.rect(this.margin, 10, 20, 20, 'FD');
            this.doc.setFontSize(6);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text('LOGO', this.margin + 10, 22, { align: 'center' });
        }
        
        try {
            // Right logo (Logo_002.png)
            const rightLogoInfo = await this.loadLogoImage('Logo_002.png');
            
            // Calculate dimensions to fit within max height while preserving aspect ratio
            let rightLogoHeight = maxLogoHeight;
            let rightLogoWidth = rightLogoHeight * rightLogoInfo.aspectRatio;
            
            // If width exceeds reasonable bounds, scale down
            if (rightLogoWidth > 30) {
                rightLogoWidth = 30;
                rightLogoHeight = rightLogoWidth / rightLogoInfo.aspectRatio;
            }
            
            this.doc.addImage(rightLogoInfo.dataURL, 'PNG', this.pageWidth - this.margin - rightLogoWidth, 10, rightLogoWidth, rightLogoHeight);
        } catch (error) {
            console.error('Error loading right logo for image page:', error);
            // Fallback to placeholder
            this.doc.setDrawColor(150, 150, 150);
            this.doc.setFillColor(240, 240, 240);
            this.doc.rect(this.pageWidth - this.margin - 20, 10, 20, 20, 'FD');
            this.doc.setFontSize(6);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text('LOGO', this.pageWidth - this.margin - 10, 22, { align: 'center' });
        }
        
        // Header section (smaller than cover page, as shown in screenshots)
        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(config.header1, this.pageWidth / 2, 15, { align: 'center' });
        
        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(config.header2, this.pageWidth / 2, 22, { align: 'center' });
        
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(config.title, this.pageWidth / 2, 32, { align: 'center' });
        
        // Add horizontal line below header (as shown in screenshots)
        this.doc.setLineWidth(0.5);
        this.doc.setDrawColor(0, 0, 0);
        this.doc.line(this.margin, 34, this.pageWidth - this.margin, 34);
    }
    
    /**
     * Add footer for image pages (exactly as shown in screenshots)
     */
    addImagePageFooter() {
        const config = this.getPDFConfiguration();
        
        // Footer line (as shown in screenshots)
        const footerY = this.pageHeight - 25;
        this.doc.setLineWidth(0.5);
        this.doc.setDrawColor(0, 0, 0);
        this.doc.line(this.margin, footerY, this.pageWidth - this.margin, footerY);
        
        // Footer text (smaller font as shown in screenshots)
        this.doc.setFontSize(8);
        this.doc.setFont('helvetica', 'normal');
        
        // Address line
        this.doc.text(config.address, this.pageWidth / 2, footerY + 6, { align: 'center' });
        
        // Contact info
        this.doc.text(`CEP: ${config.postalCode} - Tel: (19) 3521-7010 - Fax: (19) 3521-7635`, 
                     this.pageWidth / 2, footerY + 11, { align: 'center' });
        
        this.doc.text(config.contactPhone, this.pageWidth / 2, footerY + 16, { align: 'center' });
        
        // Page number (as shown in screenshots: "Página 2 de 4")
        // Will be added later by fixPageNumbers()
    }
    
    /**
     * Load logo image from file path and return as data URL with original dimensions
     */
    async loadLogoImage(logoPath) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    // Create canvas to convert image to data URL
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Set canvas dimensions to match original image (preserve aspect ratio)
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Draw image on canvas with original proportions
                    ctx.drawImage(img, 0, 0);
                    
                    // Convert to data URL
                    const dataURL = canvas.toDataURL('image/png');
                    resolve({
                        dataURL: dataURL,
                        originalWidth: img.width,
                        originalHeight: img.height,
                        aspectRatio: img.width / img.height
                    });
                } catch (error) {
                    console.error('Error converting logo to data URL:', error);
                    reject(error);
                }
            };
            img.onerror = () => {
                console.error('Error loading logo image:', logoPath);
                reject(new Error(`Failed to load logo: ${logoPath}`));
            };
            
            // Load the image
            img.src = logoPath;
        });
    }
}

// Export the class
window.PDFGenerator = PDFGenerator;
