import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FilterOptions {
  airline: string;
  status: string;
  departureAirport: string;
  arrivalAirport: string;
}

@Component({
  selector: 'app-flight-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './flight-filter.html',
  styleUrls: ['./flight-filter.css']
})
export class FlightFilterComponent implements OnInit {
  @Output() filtersChanged = new EventEmitter<FilterOptions>();
  
  filterOptions: FilterOptions = {
    airline: '',
    status: '',
    departureAirport: '',
    arrivalAirport: ''
  };

  airlines: string[] = [];
  statuses: string[] = ['active', 'scheduled', 'landed', 'cancelled', 'incident', 'diverted'];
  airports: string[] = [];

  ngOnInit() {
    this.loadDefaultFilters();
  }

  private loadDefaultFilters() {
    // Questi verranno popolati dinamicamente dai dati
    this.statuses = [
      'active', 'scheduled', 'landed', 'cancelled', 'incident', 'diverted'
    ];
  }

  updateFilters() {
    this.filtersChanged.emit(this.filterOptions);
  }

  resetFilters() {
    this.filterOptions = {
      airline: '',
      status: '',
      departureAirport: '',
      arrivalAirport: ''
    };
    this.filtersChanged.emit(this.filterOptions);
  }

  // Metodi per aggiornare le opzioni dai dati dei voli
  updateAirlinesFromFlights(flights: any[]) {
    const airlineSet = new Set<string>();
    flights.forEach(flight => {
      if (flight.airline?.name) {
        airlineSet.add(flight.airline.name);
      }
    });
    this.airlines = Array.from(airlineSet).sort();
  }

  updateAirportsFromFlights(flights: any[]) {
    const airportSet = new Set<string>();
    flights.forEach(flight => {
      if (flight.departure?.iata) {
        airportSet.add(flight.departure.iata);
      }
      if (flight.arrival?.iata) {
        airportSet.add(flight.arrival.iata);
      }
    });
    this.airports = Array.from(airportSet).sort();
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

hasActiveFilters(): boolean {
  return !!this.filterOptions.airline || 
         !!this.filterOptions.status || 
         !!this.filterOptions.departureAirport || 
         !!this.filterOptions.arrivalAirport;
}

removeFilter(filterType: keyof FilterOptions) {
  this.filterOptions[filterType] = '';
  this.updateFilters();
}
}