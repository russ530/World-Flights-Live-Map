import { Component, Input, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Flight } from '../../models/flight.model';

declare var L: any;

@Component({
  selector: 'app-flight-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flight-map.html',
  styleUrls: ['./flight-map.css']
})
export class FlightMapComponent implements AfterViewInit, OnChanges {
  @Input() flights: Flight[] = [];
  
  private map: any;
  private markers: any[] = [];
  private isMapInitialized = false;
  public useMockData = true; // CAMBIATO DA private A public

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['flights'] && this.isMapInitialized) {
      this.updateMapMarkers();
    }
  }

  private initMap() {
    if (typeof L === 'undefined') {
      console.error('❌ Leaflet non è caricato!');
      return;
    }
    
    try {
      this.map = L.map('flight-map').setView([45.4642, 9.1900], 3);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(this.map);

      this.isMapInitialized = true;
      console.log('✅ Mappa inizializzata correttamente');
      this.updateMapMarkers();
    } catch (error) {
      console.error('❌ Errore nell\'inizializzazione della mappa:', error);
    }
  }

  private updateMapMarkers() {
    if (!this.isMapInitialized) return;
    
    this.markers.forEach(marker => this.map.removeLayer(marker));
    this.markers = [];

    let flightsToShow: Flight[];

    if (this.useMockData) {
      // Usa coordinate mock per testing
      flightsToShow = this.addMockCoordinates();
      console.log('🧪 Usando coordinate MOCK per testing');
    } else {
      // Usa dati reali dall'API
      flightsToShow = this.getFlightsWithCoordinates();
      console.log('📍 Voli con coordinate reali:', flightsToShow.length);
    }

    // Se nessun volo ha coordinate, mostra un messaggio
    if (flightsToShow.length === 0) {
      this.showNoDataMessage();
      return;
    }

    flightsToShow.forEach((flight, index) => {
      const marker = this.createFlightMarker(flight);
      if (marker) {
        this.markers.push(marker);
        marker.addTo(this.map);
        console.log(`📍 Marker ${index + 1} aggiunto:`, flight.airline?.name, flight.flight?.number);
      }
    });

    if (this.markers.length > 0) {
      const group = new L.FeatureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.1));
      console.log('🗺️ Mappa adattata per mostrare', this.markers.length, 'marker');
    }
  }

  // Aggiunge coordinate mock per testing
  private addMockCoordinates(): Flight[] {
    console.log('🎲 Generando coordinate mock...');
    
    return this.flights.map((flight, index) => {
      // Crea coordinate realistiche basate sulla rotta
      const baseLat = 45.4642 + (Math.random() - 0.5) * 30;
      const baseLng = 9.1900 + (Math.random() - 0.5) * 60;
      
      return {
        ...flight,
        live: {
          latitude: baseLat + (Math.random() - 0.5) * 2,
          longitude: baseLng + (Math.random() - 0.5) * 4,
          altitude: 30000 + Math.random() * 10000,
          direction: Math.random() * 360,
          speed_horizontal: 800 + Math.random() * 200,
          speed_vertical: (Math.random() - 0.5) * 1000,
          is_ground: false
        }
      };
    });
  }

  private createFlightMarker(flight: Flight): any {
    if (!flight.live || !flight.live.latitude || !flight.live.longitude) {
      return null;
    }

    const airplaneIcon = L.divIcon({
      className: 'airplane-marker',
      html: this.getAirplaneIcon(flight.flight_status),
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const marker = L.marker([flight.live.latitude, flight.live.longitude], {
      icon: airplaneIcon
    });

    const popupContent = this.createPopupContent(flight);
    marker.bindPopup(popupContent);

    return marker;
  }

  private getAirplaneIcon(status: string): string {
    const statusIcons: { [key: string]: string } = {
      'active': '✈️',
      'scheduled': '🛫',
      'landed': '🛬',
      'cancelled': '❌',
      'incident': '⚠️',
      'diverted': '🔄'
    };
    const icon = statusIcons[status] || '✈️';
    return `<div class="airplane-icon ${status}">${icon}</div>`;
  }

  private createPopupContent(flight: Flight): string {
    const isMock = this.useMockData;
    const mockBadge = isMock ? '<span class="badge bg-warning text-dark">MOCK</span>' : '';
    
    return `
      <div class="flight-popup">
        <h6 class="mb-2">${flight.airline?.name || 'N/A'} ${flight.flight?.number || 'N/A'} ${mockBadge}</h6>
        <div class="flight-route mb-2">
          <strong>${flight.departure?.iata || '???'}</strong> → <strong>${flight.arrival?.iata || '???'}</strong>
        </div>
        <div class="flight-info">
          <small><strong>Stato:</strong> ${this.getStatusText(flight.flight_status)}</small><br>
          <small><strong>Partenza:</strong> ${this.formatTime(flight.departure?.scheduled)}</small><br>
          <small><strong>Arrivo:</strong> ${this.formatTime(flight.arrival?.scheduled)}</small>
        </div>
        ${flight.live ? `
          <div class="flight-live mt-2">
            <small><strong>Altitudine:</strong> ${Math.round(flight.live.altitude)} ft</small><br>
            <small><strong>Velocità:</strong> ${Math.round(flight.live.speed_horizontal)} km/h</small><br>
            <small><strong>Direzione:</strong> ${Math.round(flight.live.direction)}°</small>
            ${isMock ? '<br><small class="text-muted"><em>Dati simulati per testing</em></small>' : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  private showNoDataMessage() {
    const message = `Nessuna posizione in tempo reale disponibile.
    
L'API free di Aviationstack non fornisce coordinate GPS in tempo reale.

Attivando i dati mock puoi vedere come funzionerebbe la mappa con coordinate reali.`;
    
    L.popup()
      .setLatLng([45.4642, 9.1900])
      .setContent(`
        <div class="text-center p-3">
          <h6>⚠️ Dati Limitati</h6>
          <p class="mb-3">${message}</p>
          <button onclick="document.querySelector('app-flight-map').refreshMap()" 
                  class="btn btn-sm btn-outline-primary">
            Attiva dati Mock
          </button>
        </div>
      `)
      .openOn(this.map);
  }

  private getStatusText(status: string): string {
    const statusText: { [key: string]: string } = {
      'active': 'In Volo',
      'scheduled': 'Programmato',
      'landed': 'Atterrato',
      'cancelled': 'Cancellato',
      'incident': 'Incidente',
      'diverted': 'Deviato'
    };
    return statusText[status] || status;
  }

  private formatTime(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'N/A';
    }
  }

  refreshMap() {
    if (this.isMapInitialized) {
      this.updateMapMarkers();
    }
  }

  getFlightsWithCoordinates(): Flight[] {
    const flights = this.flights.filter(flight => 
      flight.live && 
      flight.live.latitude && 
      flight.live.longitude
    );
    
    console.log('🔍 Voli con coordinate GPS reali:', flights.length);
    if (flights.length === 0) {
      console.log('ℹ️ Nessun volo ha coordinate live - API free limitata');
    }
    
    return flights;
  }

  // Metodo per attivare/disattivare i mock
  toggleMockData() {
    this.useMockData = !this.useMockData;
    console.log(this.useMockData ? '🧪 Mock attivati' : '📍 Mock disattivati');
    this.updateMapMarkers();
  }
}