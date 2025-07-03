#!/usr/bin/env python3
"""
Simple HTTP server to serve the Image Geolocation Processor app.
This allows the app to automatically load map.geojson from the root folder.

Usage:
1. Open Command Prompt or PowerShell in the app folder
2. Run: python server.py
3. Open http://localhost:8000 in your browser

Requirements: Python 3.x (usually pre-installed on most systems)
"""

import http.server
import socketserver
import webbrowser
import os
import sys

# Configuration
PORT = 8000
HOST = "localhost"

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow local file access
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def start_server():
    """Start the HTTP server"""
    try:
        # Change to the directory containing this script
        os.chdir(os.path.dirname(os.path.abspath(__file__)))
        
        with socketserver.TCPServer((HOST, PORT), CustomHTTPRequestHandler) as httpd:
            url = f"http://{HOST}:{PORT}"
            print(f"🚀 Image Geolocation Processor Server")
            print(f"📍 Serving at: {url}")
            print(f"📁 Directory: {os.getcwd()}")
            print(f"🗺️  map.geojson will load automatically")
            print(f"⏹️  Press Ctrl+C to stop the server")
            print("-" * 50)
            
            # Try to open the browser automatically
            try:
                webbrowser.open(url)
                print(f"🌐 Browser opened automatically")
            except:
                print(f"🌐 Please open {url} in your browser manually")
            
            # Start serving
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print(f"\n🛑 Server stopped by user")
        sys.exit(0)
    except OSError as e:
        if e.errno == 48 or e.errno == 10048:  # Address already in use
            print(f"❌ Port {PORT} is already in use. Try a different port or close other applications.")
        else:
            print(f"❌ Error starting server: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_server()
