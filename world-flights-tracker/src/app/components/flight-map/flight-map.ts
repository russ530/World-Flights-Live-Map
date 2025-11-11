import { Component, Input, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Flight } from '../../models/flight.model';

// Dichiarazione globale per Leaflet
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

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['flights'] && this.isMapInitialized) {
      this.updateMapMarkers();
    }
  }

  private initMap() {
    // Inizializza la mappa centrata sull'Europa
    this.map = L.map('flight-map').setView([45.4642, 9.1900], 3); // Centro su Milano, zoom 3

    // Aggiungi il layer della mappa
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(this.map);

    this.isMapInitialized = true;
    this.updateMapMarkers();
  }

  private updateMapMarkers() {
    // Rimuovi i marker esistenti
    this.markers.forEach(marker => this.map.removeLayer(marker));
    this.markers = [];

    // Aggiungi nuovi marker per ogni volo con coordinate live
    this.flights.forEach(flight => {
      if (flight.live && flight.live.latitude && flight.live.longitude) {
        const marker = this.createFlightMarker(flight);
        if (marker) { // Controllo di sicurezza
          this.markers.push(marker);
          marker.addTo(this.map);
        }
      }
    });

    // Adatta la mappa per mostrare tutti i marker
    if (this.markers.length > 0) {
      const group = new L.FeatureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  private createFlightMarker(flight: Flight): any {
    // Controllo di sicurezza aggiuntivo
    if (!flight.live || !flight.live.latitude || !flight.live.longitude) {
      return null;
    }

    // Icona personalizzata per l'aereo
    const airplaneIcon = L.divIcon({
      className: 'airplane-marker',
      html: this.getAirplaneIcon(flight.flight_status),
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const marker = L.marker([flight.live.latitude, flight.live.longitude], {
      icon: airplaneIcon
    });

    // Popup con informazioni del volo
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
    return `
      <div class="flight-popup">
        <h6 class="mb-2">${flight.airline.name} ${flight.flight.number}</h6>
        <div class="flight-route mb-2">
          <strong>${flight.departure.iata}</strong> → <strong>${flight.arrival.iata}</strong>
        </div>
        <div class="flight-info">
          <small><strong>Stato:</strong> ${this.getStatusText(flight.flight_status)}</small><br>
          <small><strong>Partenza:</strong> ${this.formatTime(flight.departure.scheduled)}</small><br>
          <small><strong>Arrivo:</strong> ${this.formatTime(flight.arrival.scheduled)}</small>
        </div>
        ${flight.live && flight.live.altitude ? `
          <div class="flight-live mt-2">
            <small><strong>Altitudine:</strong> ${Math.round(flight.live.altitude)} ft</small><br>
            <small><strong>Velocità:</strong> ${Math.round(flight.live.speed_horizontal)} km/h</small><br>
            <small><strong>Direzione:</strong> ${flight.live.direction}°</small>
          </div>
        ` : ''}
      </div>
    `;
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

  private formatTime(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  // Metodo per aggiornare la mappa manualmente
  refreshMap() {
    if (this.isMapInitialized) {
      this.updateMapMarkers();
    }
  }

  getFlightsWithCoordinates(): Flight[] {
    return this.flights.filter(flight => 
      flight.live && 
      flight.live.latitude && 
      flight.live.longitude
    );
  }
}