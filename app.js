class RunTracker {
    constructor() {
        this.isTracking = false;
        this.isPaused = false;
        this.watchId = null;
        this.startTime = null;
        this.elapsedTime = 0;
        this.lastPauseTime = null;
        this.coordinates = [];
        this.totalDistance = 0;
        this.map = null;
        this.routeLine = null;
        this.currentMarker = null;
        
        this.initializeMap();
        this.bindEvents();
        this.updateStats();
    }

    initializeMap() {
        this.map = L.map('map').setView([0, 0], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        this.routeLine = L.polyline([], { color: 'red', weight: 4 }).addTo(this.map);
    }

    bindEvents() {
        document.getElementById('startBtn').addEventListener('click', () => this.startTracking());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseTracking());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopTracking());
    }

    startTracking() {
        if (!navigator.geolocation) {
            this.updateStatus('Geolocation is not supported by your browser', 'error');
            return;
        }

        this.isTracking = true;
        this.isPaused = false;
        this.coordinates = [];
        this.totalDistance = 0;
        
        if (!this.startTime) {
            this.startTime = Date.now() - this.elapsedTime;
        }

        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('stopBtn').disabled = false;
        
        this.updateStatus('Tracking your run...', 'success');
        
        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.handlePosition(position),
            (error) => this.handleError(error),
            options
        );
        
        this.updateTimer();
    }

    pauseTracking() {
        if (this.isPaused) {
            this.isPaused = false;
            this.startTime = Date.now() - this.elapsedTime;
            document.getElementById('pauseBtn').textContent = 'Pause';
            this.updateStatus('Tracking resumed', 'success');
            this.updateTimer();
        } else {
            this.isPaused = true;
            this.lastPauseTime = Date.now();
            document.getElementById('pauseBtn').textContent = 'Resume';
            this.updateStatus('Tracking paused', 'warning');
        }
    }

    stopTracking() {
        this.isTracking = false;
        this.isPaused = false;
        
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        this.startTime = null;
        this.elapsedTime = 0;
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = 'Pause';
        
        this.updateStatus('Run completed!', 'success');
    }

    handlePosition(position) {
        if (!this.isTracking || this.isPaused) return;
        
        const { latitude, longitude } = position.coords;
        const newCoord = [latitude, longitude];
        
        if (this.coordinates.length > 0) {
            const lastCoord = this.coordinates[this.coordinates.length - 1];
            const distance = this.calculateDistance(lastCoord, newCoord);
            this.totalDistance += distance;
        }
        
        this.coordinates.push(newCoord);
        
        this.routeLine.setLatLngs(this.coordinates);
        
        if (!this.currentMarker) {
            this.currentMarker = L.circleMarker(newCoord, {
                radius: 8,
                fillColor: '#3388ff',
                color: '#fff',
                weight: 2,
                fillOpacity: 1
            }).addTo(this.map);
        } else {
            this.currentMarker.setLatLng(newCoord);
        }
        
        this.map.setView(newCoord, this.map.getZoom());
        
        this.updateStats();
    }

    handleError(error) {
        let message = '';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = 'Please allow location access to track your run';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location information is unavailable';
                break;
            case error.TIMEOUT:
                message = 'Location request timed out';
                break;
            default:
                message = 'An unknown error occurred';
        }
        this.updateStatus(message, 'error');
    }

    calculateDistance(coord1, coord2) {
        const R = 6371;
        const lat1 = coord1[0] * Math.PI / 180;
        const lat2 = coord2[0] * Math.PI / 180;
        const deltaLat = (coord2[0] - coord1[0]) * Math.PI / 180;
        const deltaLon = (coord2[1] - coord1[1]) * Math.PI / 180;
        
        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    }

    updateTimer() {
        if (!this.isTracking || this.isPaused) return;
        
        this.elapsedTime = Date.now() - this.startTime;
        this.updateStats();
        
        requestAnimationFrame(() => this.updateTimer());
    }

    updateStats() {
        document.getElementById('distance').textContent = this.totalDistance.toFixed(2) + ' km';
        
        const seconds = Math.floor(this.elapsedTime / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        document.getElementById('time').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if (this.totalDistance > 0 && this.elapsedTime > 0) {
            const paceMinPerKm = (this.elapsedTime / 1000 / 60) / this.totalDistance;
            const paceMin = Math.floor(paceMinPerKm);
            const paceSec = Math.floor((paceMinPerKm - paceMin) * 60);
            document.getElementById('pace').textContent = `${paceMin}:${paceSec.toString().padStart(2, '0')} /km`;
            
            const speedKmh = this.totalDistance / (this.elapsedTime / 1000 / 3600);
            document.getElementById('speed').textContent = speedKmh.toFixed(1) + ' km/h';
        } else {
            document.getElementById('pace').textContent = '0:00 /km';
            document.getElementById('speed').textContent = '0.0 km/h';
        }
    }

    updateStatus(message, type = 'info') {
        const statusEl = document.getElementById('status');
        statusEl.textContent = message;
        statusEl.className = `status status-${type}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RunTracker();
});