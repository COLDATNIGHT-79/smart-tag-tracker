class SmartTagApp {
    constructor() {
        this.map = null;
        this.socket = null;
        this.tags = [];
        this.markers = {};
        this.currentRenameTagId = null;
        this.focusedMarkerId = null;
        this.longPressTimer = null;
        
        this.init();
    }
    
    init() {
        this.initMap();
        this.initSocket();
        this.bindEvents();
        this.createBlurOverlay();
        this.createFocusPopup();
        this.createAROverlay();
    }
    
 initMap() {
    // Initialize map centered on India
    this.map = L.map('map', {
        zoomControl: false
    }).setView([20.5937, 78.9629], 5); // Center of India
    
    // Create layer control
    const baseLayers = {};
    
    // OpenStreetMap (default)
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    });
    
    // Satellite imagery using ESRI
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri — Source: Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
        maxZoom: 18
    });
    
    // Streets with labels overlay for satellite
    const labelsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
        maxZoom: 18
    });
    
    // Terrain layer
    const terrainLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri — Source: USGS, Esri, TANA, DeLorme, and NPS',
        maxZoom: 13
    });
    
    // Add to base layers
    baseLayers['Street Map'] = osmLayer;
    baseLayers['Satellite'] = satelliteLayer;
    baseLayers['Terrain'] = terrainLayer;
    
    // Add default layer (satellite for India)
    satelliteLayer.addTo(this.map);
    
    // Add layer control
    L.control.layers(baseLayers, {
        'Labels': labelsLayer
    }, { position: 'topright' }).addTo(this.map);
    
    // Custom zoom control
    L.control.zoom({
        position: 'bottomright'
    }).addTo(this.map);
    
    setTimeout(() => {
        this.map.invalidateSize();
    }, 100);
}
    
    initSocket() {
        this.socket = io();
        
        this.socket.on('tags-update', (tags) => {
            this.tags = tags;
            this.updateTagsList();
            this.updateMapMarkers();
        });
        
        this.socket.on('tag-action', (data) => {
            this.handleTagAction(data);
        });
    }
    
    createBlurOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'blur-overlay';
        overlay.id = 'blurOverlay';
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', () => {
            this.exitFocusMode();
        });
    }
    
    createFocusPopup() {
        const popup = document.createElement('div');
        popup.className = 'focus-popup';
        popup.id = 'focusPopup';
        popup.innerHTML = `
            <div class="focus-popup-content">
                <h3 id="focusPopupTitle">Device Focus</h3>
                <button class="popup-action-btn" id="navigateBtn">
                    <i class="fas fa-route"></i> Navigate to Device
                </button>
                <button class="popup-action-btn" id="arCameraBtn">
                    <i class="fas fa-camera"></i> AR Camera View
                </button>
            </div>
        `;
        document.body.appendChild(popup);
        
        document.getElementById('navigateBtn').addEventListener('click', () => {
            this.navigateToDevice();
        });
        
        document.getElementById('arCameraBtn').addEventListener('click', () => {
           this.openARCamera();
       });
   }
   
   createAROverlay() {
       const arOverlay = document.createElement('div');
       arOverlay.className = 'ar-overlay';
       arOverlay.id = 'arOverlay';
       arOverlay.innerHTML = `
           <div class="ar-viewfinder">
               <div class="ar-target"></div>
           </div>
           <button class="ar-close" id="arClose">Close AR</button>
           <div style="color: #00ffff; font-family: 'Orbitron', monospace; margin-top: 20px; text-align: center;">
               <p>SCANNING FOR DEVICE...</p>
               <p style="font-size: 0.8rem; margin-top: 10px;">Move camera to locate tag</p>
           </div>
       `;
       document.body.appendChild(arOverlay);
       
       document.getElementById('arClose').addEventListener('click', () => {
           this.closeARCamera();
       });
   }
   
   bindEvents() {
       // Add tag button
       document.getElementById('addTagBtn').addEventListener('click', () => {
           this.showModalWithAnimation('addTagModal');
           document.getElementById('tagNameInput').focus();
       });
       
       // Close modals
       document.getElementById('closeModal').addEventListener('click', () => {
           this.hideModalWithAnimation('addTagModal');
       });
       
       document.getElementById('closeRenameModal').addEventListener('click', () => {
           this.hideModalWithAnimation('renameTagModal');
       });
       
       // Confirm add tag
       document.getElementById('confirmAddTag').addEventListener('click', () => {
           this.addNewTag();
       });
       
       // Confirm rename tag
       document.getElementById('confirmRenameTag').addEventListener('click', () => {
           this.renameTag();
       });
       
       // Enter key handling
       document.getElementById('tagNameInput').addEventListener('keypress', (e) => {
           if (e.key === 'Enter') this.addNewTag();
       });
       
       document.getElementById('renameTagInput').addEventListener('keypress', (e) => {
           if (e.key === 'Enter') this.renameTag();
       });
       
       // Close modal when clicking outside
       window.addEventListener('click', (e) => {
           const addModal = document.getElementById('addTagModal');
           const renameModal = document.getElementById('renameTagModal');
           
           if (e.target === addModal) {
               this.hideModalWithAnimation('addTagModal');
           }
           if (e.target === renameModal) {
               this.hideModalWithAnimation('renameTagModal');
           }
       });
       
       // Keyboard shortcuts
       document.addEventListener('keydown', (e) => {
           if (e.key === 'Escape') {
               this.exitFocusMode();
               this.closeARCamera();
           }
       });
   }
   
   showModalWithAnimation(modalId) {
       const modal = document.getElementById(modalId);
       modal.style.display = 'block';
       
       // Trigger animation
       setTimeout(() => {
           const content = modal.querySelector('.modal-content');
           content.style.animation = 'modalSlideIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards';
       }, 10);
   }
   
   hideModalWithAnimation(modalId) {
       const modal = document.getElementById(modalId);
       const content = modal.querySelector('.modal-content');
       
       content.style.animation = 'modalSlideOut 0.3s ease-in forwards';
       
       setTimeout(() => {
           modal.style.display = 'none';
           content.style.animation = '';
       }, 300);
   }
   
   updateTagsList() {
    const tagsList = document.getElementById('tagsList');
    const tagCount = document.getElementById('tagCount');
    
    tagCount.textContent = this.tags.length;
    
    if (this.tags.length === 0) {
        tagsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-satellite-dish"></i>
                <p>No devices detected</p>
                <p style="font-size: 0.8rem;">Initialize new tag connection</p>
            </div>
        `;
        return;
    }
    
    tagsList.innerHTML = this.tags.map(tag => `
        <div class="tag-item" data-tag-id="${tag.id}">
            <div class="tag-icon">
                <i class="fas fa-microchip"></i>
            </div>
            <div class="tag-info">
                <div class="tag-name">${tag.name}</div>
                <div class="tag-details">
                    PWR: ${tag.battery}% • PING: ${this.formatTime(tag.lastSeen)}
                </div>
            </div>
            <div class="tag-actions">
                <button class="action-btn buzz-btn" onclick="app.buzzTag('${tag.id}')">
                    <i class="fas fa-broadcast-tower"></i>
                </button>
                <button class="action-btn light-btn" onclick="app.lightTag('${tag.id}')">
                    <i class="fas fa-bolt"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    // Add long press for rename and double tap for navigation
    this.tags.forEach(tag => {
        const tagElement = document.querySelector(`[data-tag-id="${tag.id}"]`);
        this.addTagInteractionListeners(tagElement, tag.id);
    });
}

addTagInteractionListeners(element, tagId) {
    let pressTimer;
    let tapCount = 0;
    let tapTimer;
    
    const handleTap = () => {
        tapCount++;
        
        if (tapCount === 1) {
            tapTimer = setTimeout(() => {
                tapCount = 0;
            }, 300);
        } else if (tapCount === 2) {
            clearTimeout(tapTimer);
            tapCount = 0;
            this.navigateToTagOnMap(tagId);
        }
    };
    
    const startPress = (e) => {
        pressTimer = setTimeout(() => {
            this.openRenameModal(tagId);
            this.vibrate();
        }, 800);
        
        element.style.transform = 'scale(0.98)';
    };
    
    const endPress = () => {
        clearTimeout(pressTimer);
        element.style.transform = 'scale(1)';
    };
    
    // Click/tap handlers
    element.addEventListener('click', handleTap);
    
    // Long press handlers
    element.addEventListener('mousedown', startPress);
    element.addEventListener('mouseup', endPress);
    element.addEventListener('mouseleave', endPress);
    element.addEventListener('touchstart', startPress);
    element.addEventListener('touchend', endPress);
    element.addEventListener('touchcancel', endPress);
}

navigateToTagOnMap(tagId) {
    const tag = this.tags.find(t => t.id === tagId);
    if (!tag) return;
    
    // Animate to tag location
    this.map.flyTo([tag.lat, tag.lng], 16, {
        duration: 1.5,
        easeLinearity: 0.1
    });
    
    // Highlight the marker temporarily
    const marker = this.markers[tagId];
    if (marker) {
        const originalStyle = {
            radius: marker.options.radius,
            fillColor: marker.options.fillColor
        };
        
        // Pulse effect
        marker.setStyle({
            radius: 25,
            fillColor: '#00ffff'
        });
        
        setTimeout(() => {
            marker.setStyle(originalStyle);
        }, 2000);
        
        // Show popup
        marker.openPopup();
    }
    
    this.showNotification(`Navigating to ${tag.name}`, 'info');
}
   addLongPressListener(element, tagId) {
       let pressTimer;
       let startTime;
       
       const startPress = (e) => {
           startTime = Date.now();
           pressTimer = setTimeout(() => {
               this.openRenameModal(tagId);
               this.vibrate();
           }, 800);
           
           element.style.transform = 'scale(0.98)';
       };
       
       const endPress = () => {
           clearTimeout(pressTimer);
           element.style.transform = 'scale(1)';
       };
       
       element.addEventListener('mousedown', startPress);
       element.addEventListener('mouseup', endPress);
       element.addEventListener('mouseleave', endPress);
       element.addEventListener('touchstart', startPress);
       element.addEventListener('touchend', endPress);
       element.addEventListener('touchcancel', endPress);
   }
   
  updateMapMarkers() {
    // Clear existing markers
    Object.values(this.markers).forEach(marker => {
        this.map.removeLayer(marker);
    });
    this.markers = {};
    
    // Add new markers with static styling (no animations)
    this.tags.forEach(tag => {
        const marker = L.circleMarker([tag.lat, tag.lng], {
            radius: 12,
            fillColor: '#ff0080',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
            className: 'static-marker' // Remove moving class
        }).addTo(this.map);
        
        // Simple popup without animations
        const popupContent = `
            <div style="
                background: #ffffff;
                color: #333333;
                padding: 10px;
                font-family: Arial, sans-serif;
                text-align: center;
                border-radius: 4px;
                min-width: 120px;
            ">
                <div style="font-size: 1rem; font-weight: bold; margin-bottom: 5px;">
                    ${tag.name}
                </div>
                <div style="font-size: 0.8rem; color: #666666; margin-bottom: 3px;">
                    Battery: ${tag.battery}%
                </div>
                <div style="font-size: 0.7rem; color: #666666;">
                    Last seen: ${this.formatTime(tag.lastSeen)}
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent, {
            closeButton: true,
            className: 'simple-popup'
        });
        
        // Add long press for focus mode (without animations)
        this.addMarkerLongPress(marker, tag.id);
        
        this.markers[tag.id] = marker;
    });
}
   
   addMarkerLongPress(marker, tagId) {
       let pressTimer;
       
       const startPress = () => {
           pressTimer = setTimeout(() => {
               this.enterFocusMode(tagId);
           }, 1000);
       };
       
       const endPress = () => {
           clearTimeout(pressTimer);
       };
       
       marker.on('mousedown', startPress);
       marker.on('mouseup', endPress);
       marker.on('mouseleave', endPress);
       
       // Touch events
       marker.getElement().addEventListener('touchstart', startPress);
       marker.getElement().addEventListener('touchend', endPress);
       marker.getElement().addEventListener('touchcancel', endPress);
   }
   
   enterFocusMode(tagId) {
       const tag = this.tags.find(t => t.id === tagId);
       if (!tag) return;
       
       this.focusedMarkerId = tagId;
       
       // Show blur overlay
       const overlay = document.getElementById('blurOverlay');
       overlay.classList.add('active');
       
       // Position and show focus popup
       const marker = this.markers[tagId];
       const point = this.map.latLngToContainerPoint([tag.lat, tag.lng]);
       
       const popup = document.getElementById('focusPopup');
       const popupTitle = document.getElementById('focusPopupTitle');
       
       popupTitle.textContent = tag.name.toUpperCase();
       
       popup.style.left = `${point.x}px`;
       popup.style.top = `${point.y - 150}px`;
       popup.classList.add('active');
       
       // Add glitch effect to focused marker
       marker.getElement().style.animation = 'glitch 0.5s infinite';
       
       this.vibrate();
   }
   
   exitFocusMode() {
       const overlay = document.getElementById('blurOverlay');
       const popup = document.getElementById('focusPopup');
       
       overlay.classList.remove('active');
       popup.classList.remove('active');
       
       // Remove glitch effect from marker
       if (this.focusedMarkerId && this.markers[this.focusedMarkerId]) {
           this.markers[this.focusedMarkerId].getElement().style.animation = 'marker-pulse 2s infinite alternate';
       }
       
       this.focusedMarkerId = null;
   }
   
   navigateToDevice() {
       if (!this.focusedMarkerId) return;
       
       const tag = this.tags.find(t => t.id === this.focusedMarkerId);
       if (!tag) return;
       
       // Create navigation URL
       const url = `https://www.google.com/maps/dir/?api=1&destination=${tag.lat},${tag.lng}`;
       
       // Show confirmation with punk styling
       this.showNotification(`Launching navigation to ${tag.name}...`, 'success');
       
       setTimeout(() => {
           window.open(url, '_blank');
       }, 1000);
       
       this.exitFocusMode();
   }
   
   openARCamera() {
       if (!this.focusedMarkerId) return;
       
       const arOverlay = document.getElementById('arOverlay');
       arOverlay.classList.add('active');
       
       // Simulate AR scanning
       this.simulateARScanning();
       
       this.exitFocusMode();
   }
   
   closeARCamera() {
       const arOverlay = document.getElementById('arOverlay');
       arOverlay.classList.remove('active');
   }
   
   simulateARScanning() {
       const target = document.querySelector('.ar-target');
       let scanCount = 0;
       
       const scanInterval = setInterval(() => {
           target.style.transform = `translate(-50%, -50%) scale(${1 + Math.sin(Date.now() / 200) * 0.2})`;
           scanCount++;
           
           if (scanCount > 50) {
               clearInterval(scanInterval);
               this.showARDetection();
           }
       }, 100);
   }
   
  showARDetection() {
    const tag = this.tags.find(t => t.id === this.focusedMarkerId);
    if (!tag) return;
    
    const arOverlay = document.getElementById('arOverlay');
    const detectionDiv = document.createElement('div');
    detectionDiv.innerHTML = `
        <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid #ffffff;
            padding: 20px;
            text-align: center;
            font-family: Arial, sans-serif;
            color: #ffffff;
            border-radius: 8px;
            max-width: 300px;
        ">
            <div style="font-size: 1.1rem; margin-bottom: 10px; font-weight: bold;">Device Found</div>
            <div style="font-size: 1rem; margin-bottom: 15px; color: #cccccc;">${tag.name}</div>
            <div style="font-size: 0.9rem; margin-bottom: 5px;">Distance: ~2.5 meters</div>
            <div style="font-size: 0.9rem; color: #90EE90;">Signal: Strong</div>
        </div>
    `;
    
    arOverlay.appendChild(detectionDiv);
    
    setTimeout(() => {
        detectionDiv.remove();
    }, 3000);
}
   
   addNewTag() {
       const nameInput = document.getElementById('tagNameInput');
       const name = nameInput.value.trim();
       
       if (!name) {
           this.showNotification('Device name required', 'error');
           return;
       }
       
       this.socket.emit('add-tag', { name });
       
       nameInput.value = '';
       this.hideModalWithAnimation('addTagModal');
       this.showNotification(`Tag "${name}" initialized`, 'success');
   }
   
   openRenameModal(tagId) {
       const tag = this.tags.find(t => t.id === tagId);
       if (!tag) return;
       
       this.currentRenameTagId = tagId;
       const input = document.getElementById('renameTagInput');
       input.value = tag.name;
       this.showModalWithAnimation('renameTagModal');
       input.focus();
       input.select();
   }
   
   renameTag() {
       const input = document.getElementById('renameTagInput');
       const newName = input.value.trim();
       
       if (!newName) {
           this.showNotification('Device name required', 'error');
           return;
       }
       
       this.socket.emit('rename-tag', {
           id: this.currentRenameTagId,
           name: newName
       });
       
       this.hideModalWithAnimation('renameTagModal');
       this.showNotification(`Device renamed to "${newName}"`, 'success');
       this.currentRenameTagId = null;
   }
   
   buzzTag(tagId) {
       this.socket.emit('buzz-tag', tagId);
       this.showNotification('Signal transmitted', 'info');
       this.vibrate();
   }
   
   lightTag(tagId) {
       this.socket.emit('light-tag', tagId);
       this.showNotification('Light beacon activated', 'info');
       this.vibrate();
   }
   
   handleTagAction(data) {
       const tagElement = document.querySelector(`[data-tag-id="${data.id}"]`);
       if (!tagElement) return;
       
       if (data.action === 'buzz') {
           tagElement.classList.add('buzzing');
           setTimeout(() => {
               tagElement.classList.remove('buzzing');
           }, 1500);
       } else if (data.action === 'light') {
           tagElement.classList.add('lighting');
           setTimeout(() => {
               tagElement.classList.remove('lighting');
           }, 2000);
       }
   }
   
   showNotification(message, type = 'info') {
       // Remove existing notifications
       const existing = document.querySelectorAll('.punk-notification');
       existing.forEach(n => n.remove());
       
       const notification = document.createElement('div');
       notification.className = 'punk-notification';
       
       const colors = {
           success: '#39ff14',
           error: '#ff0080',
           info: '#00ffff'
       };
       
       notification.style.cssText = `
           position: fixed;
           top: 80px;
           right: 20px;
           background: #111111;
           color: ${colors[type]};
           border: 2px solid ${colors[type]};
           padding: 15px 20px;
           font-family: 'JetBrains Mono', monospace;
           font-size: 0.9rem;
           z-index: 4000;
           clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
           box-shadow: 0 0 20px ${colors[type]};
           animation: slideInRight 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
           text-transform: uppercase;
           letter-spacing: 1px;
       `;
       
       notification.textContent = message;
       document.body.appendChild(notification);
       
       setTimeout(() => {
           notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
           setTimeout(() => notification.remove(), 300);
       }, 3000);
   }
   
   vibrate() {
       if ('vibrate' in navigator) {
           navigator.vibrate([100, 30, 100]);
       }
   }
   
   formatTime(dateString) {
       const date = new Date(dateString);
       const now = new Date();
       const diff = Math.floor((now - date) / 1000);
       
       if (diff < 60) return 'NOW';
       if (diff < 3600) return `${Math.floor(diff / 60)}M`;
       if (diff < 86400) return `${Math.floor(diff / 3600)}H`;
       return `${Math.floor(diff / 86400)}D`;
   }
}

// Add CSS animations via JavaScript
const additionalStyles = `
   @keyframes modalSlideIn {
       0% { 
           transform: translateY(-50%) scale(0.8) rotateX(90deg);
           opacity: 0;
       }
       100% { 
           transform: translateY(-50%) scale(1) rotateX(0deg);
           opacity: 1;
       }
   }
   
   @keyframes modalSlideOut {
       0% { 
           transform: translateY(-50%) scale(1) rotateX(0deg);
           opacity: 1;
       }
       100% { 
           transform: translateY(-50%) scale(0.8) rotateX(-90deg);
           opacity: 0;
       }
   }
   
   @keyframes slideInRight {
       0% { 
           transform: translateX(100%);
           opacity: 0;
       }
       100% { 
           transform: translateX(0);
           opacity: 1;
       }
   }
   
   @keyframes slideOutRight {
       0% { 
           transform: translateX(0);
           opacity: 1;
       }
       100% { 
           transform: translateX(100%);
           opacity: 0;
       }
   }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
document.addEventListener('DOMContentLoaded', () => {
   window.app = new SmartTagApp();
});