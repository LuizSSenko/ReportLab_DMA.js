# Image Geolocation Processor

A client-side web application for processing images with GPS data, comparing locations with GeoJSON map data, and generating comprehensive PDF reports. No server required - everything runs in your browser!

## ✨ Features
 
- 📸 **Extract GPS data** from image EXIF metadata
- 🗺️ **Interactive mapping** with Leaflet.js
- 📍 **Location analysis** against custom GeoJSON regions
- 📄 **PDF report generation** with detailed analysis
- 🎯 **Drag & drop interface** for easy file uploads
- 📱 **Responsive design** for desktop and mobile
- 🔒 **Privacy-focused** - all processing happens locally

## 🚀 Quick Start

1. **Open the application** - Simply open `index.html` in your web browser
2. **Upload images** - Select or drag JPEG/TIFF images with GPS data
3. **Load map data** - Upload a GeoJSON file defining regions of interest
4. **View results** - See interactive map and detailed analysis
5. **Generate report** - Create a comprehensive PDF report

## 📁 File Structure

```
image-geolocation-processor/
├── index.html              # Main application
├── styles.css              # Styling and responsive design
├── js/
│   ├── app.js              # Main application controller
│   ├── imageProcessor.js   # Image processing and EXIF extraction
│   ├── mapManager.js       # Map display and GeoJSON handling
│   ├── pdfGenerator.js     # PDF report generation
│   └── utils.js            # Utility functions
├── sample-map-data.geojson # Example GeoJSON for testing
└── README.md               # This file
```

## 🛠️ Technologies Used

All libraries are loaded via CDN - no installation required:

- **[Leaflet.js](https://leafletjs.com/)** - Interactive maps
- **[EXIF.js](https://github.com/exif-js/exif-js)** - Extract image metadata
- **[jsPDF](https://github.com/parallax/jsPDF)** - Generate PDF reports
- **[Turf.js](https://turfjs.org/)** - Geospatial analysis

## 📊 Supported Image Formats

- **JPEG/JPG** - Full support for GPS extraction
- **TIFF** - Full support for GPS extraction
- **PNG** - Limited support (rarely contains GPS data)

## 🗺️ GeoJSON Requirements

The application accepts GeoJSON files with:
- `FeatureCollection` or individual `Feature` objects
- Polygon or MultiPolygon geometries
- Optional properties for region names and descriptions

Example structure:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Region Name",
        "description": "Optional description"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lng, lat], [lng, lat], ...]]
      }
    }
  ]
}
```

## 🎯 Use Cases

- **Photography Analysis** - Analyze where photos were taken
- **Wildlife Research** - Track animal locations and habitats
- **Real Estate** - Map property photos to locations
- **Travel Documentation** - Organize travel photos by location
- **Compliance Monitoring** - Verify photo locations for regulations
- **Field Research** - Map scientific observations

## 📈 Report Features

Generated PDF reports include:
- Executive summary with statistics
- Map data information
- Detailed analysis for each image
- GPS coordinates and metadata
- Location status (inside/outside regions)
- Camera information and timestamps

## 🔧 Customization

### Styling
Modify `styles.css` to change:
- Color schemes and themes
- Layout and spacing
- Responsive breakpoints
- Animation effects

### Functionality
Extend the JavaScript modules to add:
- Additional image formats
- Custom analysis algorithms
- Integration with external APIs
- Advanced reporting features

### Map Providers
Change the tile layer in `mapManager.js` to use different map styles:
```javascript
// Example: Satellite imagery
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}')
```

## 🐛 Troubleshooting

### No GPS Data Found
- Ensure images are JPEG or TIFF format
- Check that GPS was enabled when photos were taken
- Some social media platforms strip GPS data from uploaded images

### GeoJSON Not Loading
- Validate GeoJSON format using [geojson.io](http://geojson.io)
- Ensure proper coordinate order [longitude, latitude]
- Check for valid polygon geometry

### Map Not Displaying
- Check browser console for JavaScript errors
- Ensure internet connection for map tiles
- Verify Leaflet.js CDN is accessible

### PDF Generation Fails
- Check browser console for errors
- Ensure jsPDF library is loaded
- Try with fewer images if memory issues occur

## 🌐 Browser Compatibility

- ✅ Chrome/Chromium (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ⚠️ Internet Explorer (not supported)

## 📱 Mobile Support

The application is fully responsive and works on:
- Smartphones (iOS/Android)
- Tablets
- Desktop computers

## 🔒 Privacy & Security

- **No data upload** - Everything processed locally
- **No tracking** - No analytics or external requests
- **Offline capable** - Works without internet (after initial load)
- **Secure** - No server-side vulnerabilities

## 🤝 Contributing

This is a client-side application with no build process. To contribute:

1. Fork the repository
2. Make your changes
3. Test in multiple browsers
4. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section above
2. Open an issue on GitHub
3. Review browser console for error messages

## 🎨 Screenshots

*Note: Add screenshots here showing the interface, map view, and generated reports*

---

**Built with ❤️ using vanilla JavaScript and modern web APIs**
