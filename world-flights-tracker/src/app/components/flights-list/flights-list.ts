import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AviationService } from '../../services/aviation';
import { Flight } from '../../models/flight.model';
import { FlightFilterComponent, FilterOptions } from '../flight-filter/flight-filter';
import { FlightMapComponent } from '../flight-map/flight-map';

@Component({
  selector: 'app-flights-list',
  standalone: true,
  imports: [CommonModule, FlightFilterComponent, FlightMapComponent],
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

  @ViewChild(FlightFilterComponent) flightFilter!: FlightFilterComponent;

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
        console.log('🔄 Voli caricati:', this.flights.length);
        
        this.applyFilters();
        
        if (this.flightFilter) {
          this.flightFilter.updateAirlinesFromFlights(this.flights);
        }
        
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
      if (this.currentFilters.airline && 
          this.getAirlineName(flight) !== this.currentFilters.airline) {
        return false;
      }
      if (this.currentFilters.status && 
          flight.flight_status !== this.currentFilters.status) {
        return false;
      }
      if (this.currentFilters.departureAirport && 
          this.getDepartureAirport(flight) !== this.currentFilters.departureAirport) {
        return false;
      }
      if (this.currentFilters.arrivalAirport && 
          this.getArrivalAirport(flight) !== this.currentFilters.arrivalAirport) {
        return false;
      }
      return true;
    });
  }

  refreshFlights(): void {
    this.loadFlights();
  }

  // === METODI SICURI PER DATI MANCANTI ===

  getFlightNumber(flight: any): string {
    return flight.flight?.number || 
           flight.flight?.iata || 
           flight.flight?.icao || 
           'N/A';
  }

  getAirlineIata(flight: any): string {
    return flight.airline?.iata || 
           flight.airline?.icao || 
           '';
  }

  getAirlineName(flight: any): string {
    if (flight.airline?.name && flight.airline.name !== 'empty' && flight.airline.name.trim() !== '') {
      return flight.airline.name;
    }
    
    const flightCode = flight.flight?.iata || flight.flight?.icao || '';
    const airlineCode = flight.airline?.iata || flight.airline?.icao || '';
    
    // Cerca di dedurre dalla rotta (Australia)
    const departure = flight.departure?.iata;
    const arrival = flight.arrival?.iata;
    
    if ((departure && departure.startsWith('NTL')) || (arrival && arrival.startsWith('DBO'))) {
      return 'Regional Express';
    }
    
    // Compagnie Australiane
    if (flightCode.startsWith('QF') || airlineCode === 'QF') return 'Qantas';
    if (flightCode.startsWith('VA') || airlineCode === 'VA') return 'Virgin Australia';
    if (flightCode.startsWith('JQ') || airlineCode === 'JQ') return 'Jetstar Airways';
    if (flightCode.startsWith('ZL') || airlineCode === 'ZL') return 'Regional Express';
    
    // Compagnie Asiatiche
    if (flightCode.startsWith('7C') || airlineCode === '7C') return 'Jeju Air';
    if (flightCode.startsWith('LJ') || airlineCode === 'LJ') return 'Jin Air';
    if (flightCode.startsWith('ZE') || airlineCode === 'ZE') return 'EASTAR JET';
    if (flightCode.startsWith('MM') || airlineCode === 'MM') return 'Peach Aviation';
    if (flightCode.startsWith('BX') || airlineCode === 'BX') return 'Air Busan';
    if (flightCode.startsWith('NH') || airlineCode === 'NH') return 'ANA';
    if (flightCode.startsWith('VN') || airlineCode === 'VN') return 'Vietnam Airlines';
    if (flightCode.startsWith('LY') || airlineCode === 'LY') return 'El Al';
    if (flightCode.startsWith('TG') || airlineCode === 'TG') return 'Thai Airways';
    if (flightCode.startsWith('VJ') || airlineCode === 'VJ') return 'VietJet Air';
    if (flightCode.startsWith('AI') || airlineCode === 'AI') return 'Air India';
    if (flightCode.startsWith('SQ') || airlineCode === 'SQ') return 'Singapore Airlines';
    
    // Compagnie Europee
    if (flightCode.startsWith('FR') || airlineCode === 'FR') return 'Ryanair';
    if (flightCode.startsWith('U2') || airlineCode === 'U2') return 'EasyJet';
    if (flightCode.startsWith('LH') || airlineCode === 'LH') return 'Lufthansa';
    if (flightCode.startsWith('AF') || airlineCode === 'AF') return 'Air France';
    if (flightCode.startsWith('BA') || airlineCode === 'BA') return 'British Airways';
    if (flightCode.startsWith('AZ') || airlineCode === 'AZ') return 'Alitalia';
    if (flightCode.startsWith('KL') || airlineCode === 'KL') return 'KLM';
    if (flightCode.startsWith('IB') || airlineCode === 'IB') return 'Iberia';
    
    // Compagnie Americane
    if (flightCode.startsWith('AA') || airlineCode === 'AA') return 'American Airlines';
    if (flightCode.startsWith('DL') || airlineCode === 'DL') return 'Delta Air Lines';
    if (flightCode.startsWith('UA') || airlineCode === 'UA') return 'United Airlines';
    
    // Altre Compagnie
    if (flightCode.startsWith('EK') || airlineCode === 'EK') return 'Emirates';
    if (flightCode.startsWith('QR') || airlineCode === 'QR') return 'Qatar Airways';
    if (flightCode.startsWith('EY') || airlineCode === 'EY') return 'Etihad Airways';
    if (flightCode.startsWith('TK') || airlineCode === 'TK') return 'Turkish Airlines';
    
    // FlexFlight e altre
    if (flightCode.startsWith('W2') || airlineCode === 'W2') return 'FlexFlight';
    
    return 'Volo Regionale';
  }

  getDepartureAirport(flight: any): string {
    return flight.departure?.iata || 
           flight.departure?.icao || 
           '???';
  }

  getArrivalAirport(flight: any): string {
    return flight.arrival?.iata || 
           flight.arrival?.icao || 
           '???';
  }

  getDepartureAirportName(flight: any): string {
    return flight.departure?.airport || 
           'Aeroporto sconosciuto';
  }

  getArrivalAirportName(flight: any): string {
    return flight.arrival?.airport || 
           'Aeroporto sconosciuto';
  }

  getDepartureTime(flight: any): string | undefined {
    return flight.departure?.scheduled;
  }

  getArrivalTime(flight: any): string | undefined {
    return flight.arrival?.scheduled;
  }

  getDisplayTime(flight: any, type: 'departure' | 'arrival'): string {
    const time = type === 'departure' ? this.getDepartureTime(flight) : this.getArrivalTime(flight);
    
    if (!time || time === 'null') {
      const airport = type === 'departure' ? this.getDepartureAirport(flight) : this.getArrivalAirport(flight);
      const airportName = type === 'departure' ? this.getDepartureAirportName(flight) : this.getArrivalAirportName(flight);
      
      if (airport !== '???' && airportName !== 'Aeroporto sconosciuto') {
        return `${airport}`;
      }
      return 'In Programma';
    }
    
    return this.formatTime(time);
  }

  formatTime(dateString: string | undefined): string {
    if (!dateString || dateString === 'null' || dateString === '') return '--:--';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '--:--';
      
      return date.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '--:--';
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString || dateString === 'null' || dateString === '') return 'N/D';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/D';
      
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'N/D';
    }
  }

  getDisplayDuration(flight: any): string {
    const departureTime = this.getDepartureTime(flight);
    const arrivalTime = this.getArrivalTime(flight);
    
    if (!departureTime || !arrivalTime) {
      const depAirport = this.getDepartureAirport(flight);
      const arrAirport = this.getArrivalAirport(flight);
      
      if (depAirport !== '???' && arrAirport !== '???') {
        return `${depAirport}→${arrAirport}`;
      }
      return 'N/D';
    }
    
    return this.calculateDuration(departureTime, arrivalTime);
  }

  calculateDuration(departureTime: string | undefined, arrivalTime: string | undefined): string {
    if (!departureTime || !arrivalTime) return 'N/D';
    
    try {
      const dep = new Date(departureTime);
      const arr = new Date(arrivalTime);
      
      if (isNaN(dep.getTime()) || isNaN(arr.getTime())) return 'N/D';
      
      const diff = arr.getTime() - dep.getTime();
      
      if (diff < 0) return 'N/D';
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours === 0 && minutes === 0) return 'N/D';
      
      return `${hours}h ${minutes}m`;
    } catch {
      return 'N/D';
    }
  }

  getAirlineIcon(airlineCode: string): string {
    const icons: { [key: string]: string } = {
      // Compagnie Australiane
      'QF': '🇦🇺', 'VA': '🇦🇺', 'JQ': '🇦🇺', 'ZL': '🇦🇺',
      
      // Compagnie Europee
      'BA': '🇬🇧', 'AF': '🇫🇷', 'LH': '🇩🇪', 'AZ': '🇮🇹',
      'KL': '🇳🇱', 'IB': '🇪🇸', 'FR': '🇮🇪', 'U2': '🇬🇧',
      'RY': '🇪🇸', 'VY': '🇪🇸',
      
      // Compagnie Americane
      'AA': '🇺🇸', 'DL': '🇺🇸', 'UA': '🇺🇸',
      
      // Compagnie Asiatiche
      'EK': '🇦🇪', 'QR': '🇶🇦', 'EY': '🇦🇪', 'TK': '🇹🇷',
      'LJ': '🇰🇷', 'JL': '🇯🇵', 'NH': '🇯🇵', 'SQ': '🇸🇬', 
      'CX': '🇭🇰', '7C': '🇰🇷', 'ZE': '🇰🇷', 'MM': '🇯🇵',
      'BX': '🇰🇷', 'VN': '🇻🇳', 'LY': '🇮🇱', 'TG': '🇹🇭',
      'VJ': '🇻🇳', 'AI': '🇮🇳',
      
      // Altre
      'W2': '🇩🇰'
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
    return statusText[status] || status; // IMPORTANTE: se non trova, restituisce lo status originale
  }

  // Debug temporaneo
  checkFlightStatus(flight: any) {
    console.log('🔍 DEBUG STATO VOLO:', {
      numero: this.getFlightNumber(flight),
      stato_originale: flight.flight_status,
      stato_tradotto: this.getStatusText(flight.flight_status)
    });
  }
}