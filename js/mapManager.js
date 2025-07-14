// Map management module for displaying images and GeoJSON data

class MapManager {
    constructor(mapElementId) {
        this.mapElementId = mapElementId;
        this.map = null;
        this.imageMarkers = [];
        this.geojsonLayer = null;
        this.geojsonData = null;
        this.markerClusterGroup = null;
        this.customIcons = this.createCustomIcons();
        
        this.initializeMap();
    }

    /**
     * Initialize the Leaflet map
     */
    initializeMap() {
        // Default center on world view
        this.map = L.map(this.mapElementId, {
            center: [20, 0],
            zoom: 2,
            zoomControl: true,
            scrollWheelZoom: true
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Add scale control
        L.control.scale().addTo(this.map);

        // Create marker cluster group for better performance with many markers
        if (typeof L.markerClusterGroup === 'function') {
            this.markerClusterGroup = L.markerClusterGroup({
                chunkedLoading: true,
                maxClusterRadius: 50
            });
            this.map.addLayer(this.markerClusterGroup);
        }
    }

    /**
     * Create custom icons for different marker types
     */
    createCustomIcons() {
        return {
            inside: L.divIcon({
                className: 'custom-marker',
                html: '<div style="background: #22543d; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">📍</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            }),
            outside: L.divIcon({
                className: 'custom-marker',
                html: '<div style="background: #742a2a; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">📍</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            }),
            unknown: L.divIcon({
                className: 'custom-marker',
                html: '<div style="background: #744210; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">❓</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        };
    }

    /**
     * Load and display GeoJSON data
     */
    loadGeoJSON(geojsonData) {
        try {
            // Validate GeoJSON
            if (!AppUtils.validateGeoJSON(geojsonData)) {
                throw new Error('Invalid GeoJSON format');
            }

            // Remove existing GeoJSON layer
            if (this.geojsonLayer) {
                this.map.removeLayer(this.geojsonLayer);
            }

            this.geojsonData = geojsonData;

            // Create GeoJSON layer with custom styling
            this.geojsonLayer = L.geoJSON(geojsonData, {
                style: (feature) => {
                    return {
                        fillColor: this.getFeatureColor(feature),
                        weight: 2,
                        opacity: 1,
                        color: '#4a5568',
                        dashArray: '3',
                        fillOpacity: 0.3
                    };
                },
                onEachFeature: (feature, layer) => {
                    this.bindFeaturePopup(feature, layer);
                }
            });

            this.geojsonLayer.addTo(this.map);

            // Fit map to GeoJSON bounds
            this.fitMapToGeoJSON();

            return true;
        } catch (error) {
            console.error('Error loading GeoJSON:', error);
            throw error;
        }
    }

    /**
     * Get color for GeoJSON features based on properties
     */
    getFeatureColor(feature) {
        // Use Sigla for consistent coloring if available, otherwise fallback to name
        const identifier = feature.properties.Sigla || feature.properties.name || 'default';
        const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
        const index = Math.abs(this.hashCode(identifier)) % colors.length;
        return colors[index];
    }

    /**
     * Simple hash function for consistent coloring
     */
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash;
    }

    /**
     * Bind popup to GeoJSON feature
     */
    bindFeaturePopup(feature, layer) {
        const props = feature.properties || {};
        let popupContent = '<div style="font-family: inherit;">';
        
        popupContent += '<h4 style="margin: 0 0 8px 0; color: #2d3748;">Region Information</h4>';
        
        // Prioritize Sigla and name attributes
        if (props.Sigla) {
            popupContent += `<p><strong>Sigla:</strong> ${props.Sigla}</p>`;
        }
        
        if (props.name) {
            popupContent += `<p><strong>Name:</strong> ${props.name}</p>`;
        }
        
        // Display all other properties
        Object.keys(props).forEach(key => {
            if (key !== 'name' && key !== 'Sigla') {
                popupContent += `<p><strong>${key}:</strong> ${props[key]}</p>`;
            }
        });
        
        popupContent += '</div>';
        
        layer.bindPopup(popupContent);
    }

    /**
     * Add image markers to the map
     */
    addImageMarkers(images) {
        // Clear existing markers
        this.clearImageMarkers();

        const validImages = images.filter(img => img.hasGPS && img.latitude && img.longitude);
        
        if (validImages.length === 0) {
            console.warn('No images with valid GPS coordinates to display');
            return;
        }

        validImages.forEach(imageData => {
            this.addImageMarker(imageData);
        });

        // Fit map to show all markers if no GeoJSON is loaded
        if (!this.geojsonData && validImages.length > 0) {
            this.fitMapToMarkers();
        }
    }

    /**
     * Add a single image marker
     */
    addImageMarker(imageData) {
        const { latitude, longitude, filename, locationInfo } = imageData;
        
        // Determine marker icon based on location analysis
        let icon = this.customIcons.unknown;
        if (locationInfo) {
            if (locationInfo.status === 'Inside region') {
                icon = this.customIcons.inside;
            } else if (locationInfo.status === 'Outside mapped regions') {
                icon = this.customIcons.outside;
            }
        }

        // Create marker
        const marker = L.marker([latitude, longitude], { icon });
        
        // Create popup content
        const popupContent = this.createImagePopupContent(imageData);
        marker.bindPopup(popupContent);

        // Add to appropriate layer
        if (this.markerClusterGroup) {
            this.markerClusterGroup.addLayer(marker);
        } else {
            marker.addTo(this.map);
        }

        this.imageMarkers.push(marker);
    }

    /**
     * Create popup content for image markers
     */
    createImagePopupContent(imageData) {
        const { filename, latitude, longitude, datetime, camera, model, locationInfo } = imageData;
        
        let content = '<div style="font-family: inherit; min-width: 200px;">';
        content += `<h4 style="margin: 0 0 8px 0; color: #2d3748;">📸 ${filename}</h4>`;
        
        content += `<p><strong>📍 Coordinates:</strong><br>${AppUtils.formatCoordinates(latitude, longitude)}</p>`;
        
        if (datetime) {
            content += `<p><strong>📅 Date:</strong><br>${AppUtils.formatDate(datetime)}</p>`;
        }
        
        if (camera && camera !== 'Unknown') {
            content += `<p><strong>📷 Camera:</strong><br>${camera}`;
            if (model && model !== 'Unknown') {
                content += ` ${model}`;
            }
            content += '</p>';
        }
        
        if (locationInfo) {
            const statusClass = locationInfo.status === 'Inside region' ? 'status-inside' : 
                               locationInfo.status === 'Outside mapped regions' ? 'status-outside' : 'status-no-gps';
            content += `<p><strong>🗺️ Location Status:</strong><br>`;
            content += `<span class="location-status ${statusClass}">${locationInfo.status}</span></p>`;
            
            if (locationInfo.sigla) {
                content += `<p><strong>🏷️ Sigla:</strong><br>${locationInfo.sigla}</p>`;
            }
            
            if (locationInfo.region && locationInfo.region !== locationInfo.sigla) {
                content += `<p><strong>📍 Region:</strong><br>${locationInfo.region}</p>`;
            }
        }
        
        content += '</div>';
        return content;
    }

    /**
     * Clear all image markers
     */
    clearImageMarkers() {
        if (this.markerClusterGroup) {
            this.markerClusterGroup.clearLayers();
        } else {
            this.imageMarkers.forEach(marker => {
                this.map.removeLayer(marker);
            });
        }
        this.imageMarkers = [];
    }

    /**
     * Fit map to show all markers
     */
    fitMapToMarkers() {
        if (this.imageMarkers.length === 0) return;

        const group = new L.featureGroup(this.imageMarkers);
        this.map.fitBounds(group.getBounds().pad(0.1));
    }

    /**
     * Fit map to GeoJSON bounds
     */
    fitMapToGeoJSON() {
        if (this.geojsonLayer) {
            this.map.fitBounds(this.geojsonLayer.getBounds().pad(0.1));
        }
    }

    /**
     * Analyze if point is inside any GeoJSON features
     */
    analyzePointLocation(latitude, longitude) {
        if (!this.geojsonData) {
            return { 
                status: 'No map data loaded',
                region: null,
                properties: null
            };
        }

        try {
            const point = turf.point([longitude, latitude]);
            
            // Check each feature in the GeoJSON
            const features = this.geojsonData.type === 'FeatureCollection' 
                ? this.geojsonData.features 
                : [this.geojsonData];

            for (const feature of features) {
                if (feature.geometry && turf.booleanPointInPolygon) {
                    if (turf.booleanPointInPolygon(point, feature)) {
                        return {
                            status: 'Inside region',
                            region: feature.properties?.Sigla || feature.properties?.sigla || feature.properties?.name || 'Unnamed region',
                            sigla: feature.properties?.Sigla || feature.properties?.sigla || null,
                            properties: feature.properties || {}
                        };
                    }
                }
            }

            return {
                status: 'Outside mapped regions',
                region: null,
                properties: null
            };
        } catch (error) {
            console.error('Error analyzing point location:', error);
            return {
                status: 'Analysis error',
                region: null,
                properties: null,
                error: error.message
            };
        }
    }

    /**
     * Get map center and zoom
     */
    getMapState() {
        return {
            center: this.map.getCenter(),
            zoom: this.map.getZoom(),
            bounds: this.map.getBounds()
        };
    }

    /**
     * Set map view
     */
    setView(lat, lng, zoom = 10) {
        this.map.setView([lat, lng], zoom);
    }

    /**
     * Toggle layer visibility
     */
    toggleLayer(layer, visible) {
        if (visible) {
            this.map.addLayer(layer);
        } else {
            this.map.removeLayer(layer);
        }
    }

    /**
     * Cleanup map resources
     */
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}

// Export the class
window.MapManager = MapManager;
