// Importa i decoratori e interfacce di Angular per componenti standalone
import { Component, Output, EventEmitter, OnInit } from '@angular/core';
// Importa CommonModule per direttive ng* (ngIf, ngFor, ecc.)
import { CommonModule } from '@angular/common';
// Importa FormsModule per il two-way binding con [(ngModel)]
import { FormsModule } from '@angular/forms';
// Importa funzioni di normalizzazione dello stato dal modello
import { normalizeStatus, getStatusText as getStatusTextUtil } from '../../models/flight.model';

// Interfaccia che rappresenta lo stato dei filtri selezionati dall'utente
export interface FilterOptions {
  // Compagnia aerea selezionata (stringa vuota se non filtrato)
  airline: string;
  // Stato del volo selezionato (stringa vuota se non filtrato)
  status: string;
  // Aeroporto di partenza selezionato (stringa vuota se non filtrato)
  departureAirport: string;
  // Aeroporto di arrivo selezionato (stringa vuota se non filtrato)
  arrivalAirport: string;
}

// Decoratore @Component che definisce il componente Angular
@Component({
  // Selector usato nel template HTML per inserire questo componente
  selector: 'app-flight-filter',
  // standalone: true indica che il componente non ha bisogno di NgModule
  standalone: true,
  // imports: dichiara i moduli necessari per questo componente
  imports: [CommonModule, FormsModule],
  // Path del file HTML che contiene il template
  templateUrl: './flight-filter.html',
  // Path del file CSS con gli stili del componente
  styleUrls: ['./flight-filter.css']
})
export class FlightFilterComponent implements OnInit {
  // @Output decorator: espone un evento per comunicare con il componente padre
  // filtersChanged: evento che emette quando l'utente cambia i filtri
  @Output() filtersChanged = new EventEmitter<FilterOptions>();
  
  // Oggetto che mantiene lo stato corrente dei filtri
  // Viene aggiornato quando l'utente interagisce con i dropdown
  filterOptions: FilterOptions = {
    // Nessun filtro di compagnia aerea inizialmente
    airline: '',
    // Nessun filtro di status inizialmente
    status: '',
    // Nessun filtro di aeroporto di partenza inizialmente
    departureAirport: '',
    // Nessun filtro di aeroporto di arrivo inizialmente
    arrivalAirport: ''
  };

  // Array di compagnie aeree disponibili per il filtro
  // Viene popolato quando il componente padre invia i dati dei voli
  airlines: string[] = [];
  
  // Array di stati dei voli disponibili per il filtro
  // Valori predefiniti: active, scheduled, landed, ecc.
  statuses: string[] = ['active', 'scheduled', 'landed', 'cancelled', 'incident', 'diverted'];
  
  // Array di aeroporti disponibili per il filtro
  // Viene popolato quando il componente padre invia i dati dei voli
  airports: string[] = [];

  // Hook del ciclo di vita di Angular eseguito dopo l'inizializzazione del componente
  ngOnInit() {
    // Carica i filtri di default (attualmente solo gli stati predefiniti)
    this.loadDefaultFilters();
  }

  // Metodo privato che carica i valori di default per i filtri
  private loadDefaultFilters() {
    // Imposta l'array degli stati con i valori predefiniti disponibili
    this.statuses = [
      'active', 'scheduled', 'landed', 'cancelled', 'incident', 'diverted'
    ];
  }

  // Metodo che viene chiamato ogni volta che l'utente cambia un filtro
  // Emette l'evento filtersChanged verso il componente padre con i filtri attuali
  updateFilters() {
    // Emette i filtri correnti al componente padre per aggiornare la lista
    this.filtersChanged.emit(this.filterOptions);
  }

  // Metodo che resetta tutti i filtri ai valori iniziali (vuoti)
  resetFilters() {
    // Imposta tutti i filtri a stringa vuota
    this.filterOptions = {
      // Reset filtro compagnia aerea
      airline: '',
      // Reset filtro stato
      status: '',
      // Reset filtro aeroporto di partenza
      departureAirport: '',
      // Reset filtro aeroporto di arrivo
      arrivalAirport: ''
    };
    // Emette l'evento per aggiornare la lista dei voli (mostra tutti i voli)
    this.filtersChanged.emit(this.filterOptions);
  }

  // Metodo che aggiorna le liste di compagnie aeree, aeroporti e stati
  // dai dati dei voli ricevuti dal componente padre
  updateAirlinesFromFlights(flights: any[]) {
    // Crea un Set per memorizzare le compagnie aeree uniche
    // (Set evita automaticamente i duplicati)
    const airlineSet = new Set<string>();
    // Crea un Set per memorizzare gli aeroporti unici di partenza/arrivo
    const airportSet = new Set<string>();
    // Crea un Set per memorizzare gli stati unici presenti nei voli
    const statusSet = new Set<string>();

    // Itera su ogni volo per estrarre informazioni di filtro
    flights.forEach(flight => {
      // Se il volo ha il nome della compagnia, aggiungilo al set
      if (flight.airline?.name) {
        airlineSet.add(flight.airline.name);
      }
      // Se il volo ha l'aeroporto di partenza, aggiungilo al set
      if (flight.departure?.iata) {
        airportSet.add(flight.departure.iata);
      }
      // Se il volo ha l'aeroporto di arrivo, aggiungilo al set
      if (flight.arrival?.iata) {
        airportSet.add(flight.arrival.iata);
      }
      // Se il volo ha uno status, normalizzalo e aggiungilo al set
      // Preferisce lo stato derivato (__derived_status) se disponibile
      if (flight.flight_status || flight.__derived_status) {
        // Normalizza lo stato usando la funzione utilitaria
        const s = normalizeStatus(flight.__derived_status || flight.flight_status);
        // Aggiunge solo se lo stato normalizzato non è vuoto
        if (s) statusSet.add(s);
      }
    });

    // Converte i Set in array e ordina alfabeticamente per migliore UX
    // From airlineSet: converte il Set in array, poi ordina alfabeticamente
    this.airlines = Array.from(airlineSet).sort();
    // From airportSet: converte il Set in array, poi ordina alfabeticamente
    this.airports = Array.from(airportSet).sort();
    // From statusSet: converte il Set in array, filtra stati vuoti, poi ordina
    this.statuses = Array.from(statusSet).filter(s => s).sort();
  }

  // Metodo che converte uno stato di volo in testo italiano
  // Usa la funzione utilitaria condivisa dal modello
  getStatusText(status: string): string {
    // Delega alla funzione utilitaria per la localizzazione
    return getStatusTextUtil(status);
  }

  // Metodo che verifica se ci sono filtri attivi (almeno uno impostato)
  // Utile per mostrare il pulsante "Reset" solo se necessario
  hasActiveFilters(): boolean {
    // Ritorna true se almeno un filtro è non-vuoto
    // Usa l'operatore || per controllare tutti i filtri contemporaneamente
    return !!this.filterOptions.airline || 
           !!this.filterOptions.status || 
           !!this.filterOptions.departureAirport || 
           !!this.filterOptions.arrivalAirport;
  }

  // Metodo che rimuove un singolo filtro per tipo
  // Accetta il nome del filtro da rimuovere e lo resetta
  removeFilter(filterType: keyof FilterOptions) {
    // Imposta il filtro selezionato a stringa vuota
    // keyof FilterOptions assicura che il parametro sia una chiave valida
    this.filterOptions[filterType] = '';
    // Emette l'evento per aggiornare la lista con il filtro rimosso
    this.updateFilters();
  }
}