import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AviationService } from '../../services/aviation';
import { Flight } from '../../models/flight.model';
import { FlightFilterComponent, FilterOptions } from '../flight-filter/flight-filter';

@Component({
  selector: 'app-flights-list',
  standalone: true,
  imports: [CommonModule, FlightFilterComponent],
  templateUrl: './flights-list.html',
  styleUrls: ['./flights-list.css']
})
export class FlightsListComponent implements OnInit {
  flights: Flight[] = [];
  filteredFlights: Flight[] = [];
  loading: boolean = true;
  error: string | null = null;
  currentFilters: FilterOptions = {
    airline: '',
    status: '',
    departureAirport: '',
    arrivalAirport: ''
  };

  constructor(private aviationService: AviationService) {}

  ngOnInit(): void {
    this.loadFlights();
  }

  loadFlights(): void {
    this.loading = true;
    this.error = null;

    this.aviationService.getActiveFlights().subscribe({
      next: (response: any) => {
        this.flights = response.data || [];
        this.applyFilters();
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'Errore nel caricamento dei voli. Riprova più tardi.';
        this.loading = false;
        console.error('Errore API:', error);
      }
    });
  }

  onFiltersChanged(filters: FilterOptions) {
    this.currentFilters = filters;
    this.applyFilters();
  }

  applyFilters() {
    this.filteredFlights = this.flights.filter(flight => {
      // Filtro compagnia aerea
      if (this.currentFilters.airline && 
          flight.airline.name !== this.currentFilters.airline) {
        return false;
      }

      // Filtro stato volo
      if (this.currentFilters.status && 
          flight.flight_status !== this.currentFilters.status) {
        return false;
      }

      // Filtro aeroporto di partenza
      if (this.currentFilters.departureAirport && 
          flight.departure.iata !== this.currentFilters.departureAirport) {
        return false;
      }

      // Filtro aeroporto di arrivo
      if (this.currentFilters.arrivalAirport && 
          flight.arrival.iata !== this.currentFilters.arrivalAirport) {
        return false;
      }

      return true;
    });
  }

  refreshFlights(): void {
    this.loadFlights();
  }

  // Metodi per formattazione (mantenuti dalla versione precedente)
  formatTime(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  calculateDuration(departureTime: string, arrivalTime: string): string {
    if (!departureTime || !arrivalTime) return 'N/A';
    
    const dep = new Date(departureTime);
    const arr = new Date(arrivalTime);
    const diff = arr.getTime() - dep.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  getAirlineIcon(airlineCode: string): string {
    const icons: { [key: string]: string } = {
      'BA': '🇬🇧',
      'AF': '🇫🇷',
      'LH': '🇩🇪', 
      'AZ': '🇮🇹',
      'KL': '🇳🇱',
      'IB': '🇪🇸',
      'AA': '🇺🇸',
      'DL': '🇺🇸',
      'UA': '🇺🇸',
      'EK': '🇦🇪'
    };
    return icons[airlineCode] || '✈️';
  }

  getStatusBadgeClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'active': 'badge-active',
      'scheduled': 'badge-scheduled',
      'landed': 'badge-landed',
      'cancelled': 'badge-cancelled',
      'incident': 'badge-incident',
      'diverted': 'badge-diverted'
    };
    return statusClasses[status] || 'badge-unknown';
  }

  getStatusText(status: string): string {
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
}