// Importa i decoratori di Angular per ciclo di vita e accesso a template
import { Component, OnInit, ViewChild } from '@angular/core';
// Importa CommonModule per direttive ng* (ngIf, ngFor, ecc.)
import { CommonModule } from '@angular/common';
// Importa il servizio per le richieste API dei voli
import { AviationService } from '../../services/aviation';
// Importa l'interfaccia Flight e funzioni di normalizzazione dello stato
import { Flight, normalizeStatus, getStatusText as getStatusTextUtil } from '../../models/flight.model';
// Importa il componente filter con la sua interfaccia FilterOptions
import { FlightFilterComponent, FilterOptions } from '../flight-filter/flight-filter';
// Importa il componente mappa per visualizzare i voli geograficamente
import { FlightMapComponent } from '../flight-map/flight-map';

// Decoratore @Component che definisce il componente Angular
@Component({
  // Selector usato nel template HTML per inserire questo componente
  selector: 'app-flights-list',
  // standalone: true indica che il componente non ha bisogno di NgModule
  standalone: true,
  // imports: dichiara i componenti e moduli necessari
  imports: [CommonModule, FlightFilterComponent, FlightMapComponent],
  // Path del file HTML che contiene il template
  templateUrl: './flights-list.html',
  // Path del file CSS con gli stili del componente
  styleUrls: ['./flights-list.css']
})
export class FlightsListComponent implements OnInit {
  // Array di tutti i voli caricati dall'API (senza filtri applicati)
  flights: Flight[] = [];
  
  // Array di voli visualizzati nella tabella (con filtri applicati)
  // Questo è quello che viene mostrato all'utente
  filteredFlights: Flight[] = [];
  
  // Flag per mostrare lo spinner di caricamento durante la richiesta API
  loading: boolean = true;
  
  // Messaggio di errore da mostrare se la richiesta API fallisce
  error: string | null = null;
  
  // Oggetto che mantiene i filtri correntemente applicati dall'utente
  currentFilters: FilterOptions = {
    // Nessun filtro inizialmente
    airline: '',
    status: '',
    departureAirport: '',
    arrivalAirport: ''
  };

  // @ViewChild: accede al componente FlightFilterComponent nel template
  // Consente al componente padre di accedere ai metodi pubblici del filtro
  @ViewChild(FlightFilterComponent) flightFilter!: FlightFilterComponent;

  // Costruttore: inietta il servizio API dei voli
  constructor(private aviationService: AviationService) {}

  // Hook del ciclo di vita Angular eseguito dopo l'inizializzazione del componente
  ngOnInit(): void {
    // Carica i voli all'avvio del componente
    this.loadFlights();
  }

  // Metodo che carica i voli dall'API e li prepara per la visualizzazione
  loadFlights(): void {
    // Mostra lo spinner di caricamento
    this.loading = true;
    // Resetta eventuali errori precedenti
    this.error = null;

    // Richiede voli senza forzare lo status 'active' per poter determinare lo stato derivato
    // Questo consente di calcolare automaticamente se un volo è schedulato/attivo/atterrato
    this.aviationService.getFlightsWithFilters().subscribe({
      // next: callback eseguito quando la richiesta ha successo
      next: (response: any) => {
        // Trasforma ogni volo aggiungendogli lo stato derivato calcolato
        // map: trasforma ogni elemento dell'array applicando una funzione
        this.flights = (response.data || []).map((f: any) => {
          // Prova a calcolare lo stato derivato basato sugli orari
          try {
            // Chiama il metodo che calcola lo stato derivato (scheduled/active/landed)
            const derived = this.deriveStatus(f);
            // Ritorna il volo con lo stato derivato aggiunto come proprietà privata
            return { ...f, __derived_status: derived };
          } catch {
            // Se il calcolo fallisce, usa lo stato normalizzato dal volo originale
            return { ...f, __derived_status: normalizeStatus(f.flight_status) };
          }
        });
        // Log del numero di voli caricati
        console.log('🔄 Voli caricati:', this.flights.length);

        // Applica i filtri correnti (se presenti) per aggiornare la lista visualizzata
        this.applyFilters();

        // Se il componente filter è stato inizializzato, aggiorna le sue liste
        if (this.flightFilter) {
          // Popola i dropdown con le opzioni disponibili dai voli caricati
          this.flightFilter.updateAirlinesFromFlights(this.flights);
        }

        // Nascondi lo spinner di caricamento
        this.loading = false;
      },
      // error: callback eseguito se la richiesta fallisce
      error: (error: any) => {
        // Imposta il messaggio di errore da mostrare all'utente
        this.error = 'Errore nel caricamento dei voli. Riprova più tardi.';
        // Nascondi lo spinner di caricamento
        this.loading = false;
        // Log dell'errore per debugging
        console.error('Errore API:', error);
      }
    });
  }

  // Callback eseguito quando il componente filter emette l'evento filtersChanged
  // Aggiorna i filtri correnti e applica il filtro alla lista
  onFiltersChanged(filters: FilterOptions) {
    // Memorizza i nuovi filtri impostati dall'utente
    this.currentFilters = filters;
    // Applica i filtri ai voli e aggiorna la lista visualizzata
    this.applyFilters();
  }

  // Metodo che applica i filtri correnti all'array di voli
  // Filtra la lista completa in base alle selezioni dell'utente
  applyFilters() {
    // Usa filter() per creare un nuovo array contente solo i voli che soddisfano i criteri
    this.filteredFlights = this.flights.filter(flight => {
      // Se è impostato un filtro compagnia aerea, verifica che corrisponda
      // Usa && per richiedere che TUTTI i filtri attivi siano soddisfatti
      if (this.currentFilters.airline && 
          this.getAirlineName(flight) !== this.currentFilters.airline) {
        // Se il filtro compagnia è impostato ma non corrisponde, esclude il volo
        return false;
      }
      
      // Se è impostato un filtro stato, verifica che corrisponda
      // Normalizza entrambi gli stati per confrontarli correttamente
      if (this.currentFilters.status && 
          normalizeStatus(this.effectiveStatus(flight)) !== normalizeStatus(this.currentFilters.status)) {
        // Se il filtro stato è impostato ma non corrisponde, esclude il volo
        return false;
      }
      
      // Se è impostato un filtro aeroporto di partenza, verifica che corrisponda
      if (this.currentFilters.departureAirport && 
          this.getDepartureAirport(flight) !== this.currentFilters.departureAirport) {
        // Se il filtro partenza è impostato ma non corrisponde, esclude il volo
        return false;
      }
      
      // Se è impostato un filtro aeroporto di arrivo, verifica che corrisponda
      if (this.currentFilters.arrivalAirport && 
          this.getArrivalAirport(flight) !== this.currentFilters.arrivalAirport) {
        // Se il filtro arrivo è impostato ma non corrisponde, esclude il volo
        return false;
      }
      
      // Se tutti i filtri attivi sono soddisfatti, includi il volo nella lista
      return true;
    });
  }

  // Metodo che ritorna lo stato effettivo da usare per visualizzazione e filtri
  // Preferisce lo stato derivato se disponibile, altrimenti usa lo stato normalizzato
  effectiveStatus(flight: any): string {
    // Verifica che il volo esista
    if (!flight) return '';
    
    // Se il volo ha uno stato derivato (calcolato dal nostro algoritmo), usa quello
    // Lo stato derivato è più accurato perché basato sugli orari reali
    if (flight.__derived_status) return flight.__derived_status;
    
    // Fallback: ritorna lo stato normalizzato dal dato API grezzo
    // Questo accade se il calcolo dello stato derivato fallisce
    return normalizeStatus(flight.flight_status);
  }

  // Metodo che calcola lo stato derivato di un volo basato sui tempi
  // Determina se il volo è scheduled, active, oppure landed comparando con l'ora attuale
  deriveStatus(flight: any): string {
    // Mantieni i casi prioritari che non cambiano mai (cancelled, incident, diverted)
    // Questi stati non sono relativi al tempo, quindi vanno rispettati sempre
    const raw = normalizeStatus(flight.flight_status);
    
    // Se lo stato è uno dei casi prioritari, ritorna quello senza ulteriori calcoli
    if (['cancelled', 'incident', 'diverted'].includes(raw)) return raw;

    // Ottiene l'ora attuale per confrontarla con gli orari del volo
    const now = new Date();

    // Estrae l'orario di partenza disponibile (preferendo actual > estimated > scheduled)
    // Usa l'orario effettivo se il volo è già decollato
    // Altrimenti usa l'orario stimato, e in ultimo ricorso quello programmato
    const depStr = flight.departure?.actual || flight.departure?.estimated || flight.departure?.scheduled;
    
    // Estrae l'orario di arrivo disponibile (preferendo actual > estimated > scheduled)
    // Usa l'orario effettivo se il volo è già atterrato
    // Altrimenti usa l'orario stimato, e in ultimo ricorso quello programmato
    const arrStr = flight.arrival?.actual || flight.arrival?.estimated || flight.arrival?.scheduled;

    // Converte le stringhe ISO in oggetti Date per il confronto temporale
    const dep = depStr ? new Date(depStr) : null;
    const arr = arrStr ? new Date(arrStr) : null;

    // Se l'orario di partenza è valido (non null e non NaN)
    if (dep && !isNaN(dep.getTime())) {
      // Se l'ora attuale è PRIMA dell'orario di partenza, il volo è ancora schedulato
      if (now < dep) {
        return 'scheduled';
      }
      
      // A questo punto, now >= dep (il volo è decollato o è in fase di decollo)
      // Controlla se abbiamo l'orario di arrivo
      if (arr && !isNaN(arr.getTime())) {
        // Se l'ora attuale è DOPO l'orario di arrivo, il volo è atterrato
        if (now >= arr) return 'landed';
        // Altrimenti (dep <= now < arr), il volo è attualmente in aria
        return 'active';
      }
      
      // Se non abbiamo l'orario di arrivo, ma il volo è decollato, assumiamo sia attivo
      // Questo accade quando l'API non fornisce i dati di arrivo
      return 'active';
    }

    // Se mancano gli orari di partenza, non possiamo calcolare uno stato derivato
    // Ritorna lo stato normalizzato dal volo originale (se presente) altrimenti stringa vuota
    return raw || '';
  }

  // Metodo che ricarica i voli dalla API
  // Viene chiamato quando l'utente clicca il pulsante "Aggiorna"
  refreshFlights(): void {
    // Chiama il metodo di caricamento per ottenere i voli aggiornati
    this.loadFlights();
  }

  // Metodo che scrolla la pagina fino alla sezione mappa
  // Viene usato quando l'utente clicca "Apri Mappa"
  scrollToMap() {
    // Seleziona l'elemento HTML con id 'map-section'
    const el = document.getElementById('map-section');
    // Se l'elemento esiste, scrolla verso di esso
    if (el) {
      // scrollIntoView: porta l'elemento nel viewport visibile
      // behavior: 'smooth' rende lo scroll fluido e piacevole
      // block: 'start' allinea l'elemento all'inizio del viewport
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // === METODI GETTER PER ACCESSO SICURO AI DATI DEL VOLO ===
  // Questi metodi garantiscono che se i dati mancano, ritornano valori di default
  // Evitano errori causati da strutture dati incomplete

  // Metodo che ritorna il numero del volo
  // Prova diverse proprietà in ordine di preferenza
  getFlightNumber(flight: any): string {
    // Preferisce il numero volo semplice se disponibile
    return flight.flight?.number || 
           // Fallback al codice IATA completo (es. "AZ1234")
           flight.flight?.iata || 
           // Fallback al codice ICAO completo
           flight.flight?.icao || 
           // Ultimo fallback: stringa "N/A" se nessun numero disponibile
           'N/A';
  }

  // Metodo che ritorna il codice IATA della compagnia aerea
  // Codice a 2 lettere che identifica univocamente la compagnia
  getAirlineIata(flight: any): string {
    // Preferisce il codice IATA della compagnia se disponibile
    return flight.airline?.iata || 
           // Fallback al codice ICAO della compagnia
           flight.airline?.icao || 
           // Ultimo fallback: stringa vuota se non disponibile
           '';
  }

  // Metodo che ritorna il nome della compagnia aerea
  // Effettua diverse strategie di fallback se il nome non è disponibile
  getAirlineName(flight: any): string {
    // Prima strategia: se c'è un nome compagnia valido, usalo
    // Esclude nomi vuoti o speciali come "empty"
    if (flight.airline?.name && flight.airline.name !== 'empty' && flight.airline.name.trim() !== '') {
      return flight.airline.name;
    }
    
    // Se il nome diretto non è disponibile, prova a dedurre dalle codifiche
    // Estrae il codice compagnia dal numero del volo (primissime 2 lettere)
    const flightCode = flight.flight?.iata || flight.flight?.icao || '';
    // Estrae il codice compagnia dai dati della compagnia stessa
    const airlineCode = flight.airline?.iata || flight.airline?.icao || '';
    
    // Tenta di dedurre la compagnia dalla rotta (caso particolare Australia)
    const departure = flight.departure?.iata;
    const arrival = flight.arrival?.iata;
    
    // Se decollo o atterraggio è in aeroporto australiano, potrebbe essere Regional Express
    if ((departure && departure.startsWith('NTL')) || (arrival && arrival.startsWith('DBO'))) {
      return 'Regional Express';
    }
    
    // ========== COMPAGNIE AUSTRALIANE ==========
    // Controlla i codici per identificare compagnie australiane
    if (flightCode.startsWith('QF') || airlineCode === 'QF') return 'Qantas';
    if (flightCode.startsWith('VA') || airlineCode === 'VA') return 'Virgin Australia';
    if (flightCode.startsWith('JQ') || airlineCode === 'JQ') return 'Jetstar Airways';
    if (flightCode.startsWith('ZL') || airlineCode === 'ZL') return 'Regional Express';
    
    // ========== COMPAGNIE ASIATICHE ==========
    // Controlla i codici per identificare compagnie asiatiche
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
    
    // ========== COMPAGNIE EUROPEE ==========
    // Controlla i codici per identificare compagnie europee
    if (flightCode.startsWith('FR') || airlineCode === 'FR') return 'Ryanair';
    if (flightCode.startsWith('U2') || airlineCode === 'U2') return 'EasyJet';
    if (flightCode.startsWith('LH') || airlineCode === 'LH') return 'Lufthansa';
    if (flightCode.startsWith('AF') || airlineCode === 'AF') return 'Air France';
    if (flightCode.startsWith('BA') || airlineCode === 'BA') return 'British Airways';
    if (flightCode.startsWith('AZ') || airlineCode === 'AZ') return 'Alitalia';
    if (flightCode.startsWith('KL') || airlineCode === 'KL') return 'KLM';
    if (flightCode.startsWith('IB') || airlineCode === 'IB') return 'Iberia';
    
    // ========== COMPAGNIE AMERICANE ==========
    // Controlla i codici per identificare compagnie americane
    if (flightCode.startsWith('AA') || airlineCode === 'AA') return 'American Airlines';
    if (flightCode.startsWith('DL') || airlineCode === 'DL') return 'Delta Air Lines';
    if (flightCode.startsWith('UA') || airlineCode === 'UA') return 'United Airlines';
    
    // ========== ALTRE COMPAGNIE INTERNAZIONALI ==========
    // Controlla i codici per compagnie del Medio Oriente e altre regioni
    if (flightCode.startsWith('EK') || airlineCode === 'EK') return 'Emirates';
    if (flightCode.startsWith('QR') || airlineCode === 'QR') return 'Qatar Airways';
    if (flightCode.startsWith('EY') || airlineCode === 'EY') return 'Etihad Airways';
    if (flightCode.startsWith('TK') || airlineCode === 'TK') return 'Turkish Airlines';
    
    // ========== CHARTER E COMPAGNIE SPECIALI ==========
    // Controlla i codici per charter e altri operatori speciali
    if (flightCode.startsWith('W2') || airlineCode === 'W2') return 'FlexFlight';
    
    // Se nessun match è stato trovato, ritorna un'etichetta generica
    return 'Volo Regionale';
  }

  // Metodo che ritorna il codice IATA dell'aeroporto di partenza
  // Codice a 3 lettere che identifica univocamente l'aeroporto
  getDepartureAirport(flight: any): string {
    // Preferisce il codice IATA se disponibile
    return flight.departure?.iata || 
           // Fallback al codice ICAO (4 lettere) se IATA non disponibile
           flight.departure?.icao || 
           // Ultimo fallback: "???" se nessun codice disponibile
           '???';
  }

  // Metodo che ritorna il codice IATA dell'aeroporto di arrivo
  // Codice a 3 lettere che identifica univocamente l'aeroporto
  getArrivalAirport(flight: any): string {
    // Preferisce il codice IATA se disponibile
    return flight.arrival?.iata || 
           // Fallback al codice ICAO (4 lettere) se IATA non disponibile
           flight.arrival?.icao || 
           // Ultimo fallback: "???" se nessun codice disponibile
           '???';
  }

  // Metodo che ritorna il nome completo dell'aeroporto di partenza
  getDepartureAirportName(flight: any): string {
    // Usa il nome completo dell'aeroporto se disponibile
    return flight.departure?.airport || 
           // Fallback: stringa generica se il nome non è disponibile
           'Aeroporto sconosciuto';
  }

  // Metodo che ritorna il nome completo dell'aeroporto di arrivo
  getArrivalAirportName(flight: any): string {
    // Usa il nome completo dell'aeroporto se disponibile
    return flight.arrival?.airport || 
           // Fallback: stringa generica se il nome non è disponibile
           'Aeroporto sconosciuto';
  }

  // Metodo che ritorna l'orario di partenza programmato del volo
  getDepartureTime(flight: any): string | undefined {
    // Ritorna la data-ora ISO di partenza programmata
    return flight.departure?.scheduled;
  }

  // Metodo che ritorna l'orario di arrivo programmato del volo
  getArrivalTime(flight: any): string | undefined {
    // Ritorna la data-ora ISO di arrivo programmato
    return flight.arrival?.scheduled;
  }

  // Metodo che ritorna l'orario di partenza o arrivo formattato
  // Accetta un parametro 'type' per specificare quale orario ritornare
  getDisplayTime(flight: any, type: 'departure' | 'arrival'): string {
    // Estrae l'orario base in formato ISO
    const time = type === 'departure' ? this.getDepartureTime(flight) : this.getArrivalTime(flight);
    
    // Se l'orario è assente o invalido (stringa 'null'), prova alternative
    if (!time || time === 'null') {
      // Estrae il codice aeroporto appropriato
      const airport = type === 'departure' ? this.getDepartureAirport(flight) : this.getArrivalAirport(flight);
      // Estrae il nome dell'aeroporto appropriato
      const airportName = type === 'departure' ? this.getDepartureAirportName(flight) : this.getArrivalAirportName(flight);
      
      // Se l'aeroporto è noto, ritorna il codice dell'aeroporto come fallback
      if (airport !== '???' && airportName !== 'Aeroporto sconosciuto') {
        return `${airport}`;
      }
      // Se nemmeno l'aeroporto è noto, ritorna un'etichetta generica
      return 'In Programma';
    }
    
    // Se l'orario è disponibile, lo formatta per visualizzazione (solo ora e minuti)
    return this.formatTime(time);
  }

  // Metodo che formatta un'orario ISO in formato leggibile italiano (HH:MM)
  formatTime(dateString: string | undefined): string {
    // Se la stringa è vuota, 'null', o undefined, ritorna fallback
    if (!dateString || dateString === 'null' || dateString === '') return '--:--';
    try {
      // Converte la stringa ISO in oggetto Date
      const date = new Date(dateString);
      // Verifica che la data sia valida (getTime() non è NaN)
      if (isNaN(date.getTime())) return '--:--';
      
      // Formatta la data usando il locale italiano, mostrando solo ore e minuti
      return date.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      // Se il parsing fallisce, ritorna fallback
      return '--:--';
    }
  }

  // Metodo che formatta una data ISO in formato leggibile italiano (GG/MM/YYYY)
  formatDate(dateString: string | undefined): string {
    // Se la stringa è vuota, 'null', o undefined, ritorna fallback
    if (!dateString || dateString === 'null' || dateString === '') return 'N/D';
    try {
      // Converte la stringa ISO in oggetto Date
      const date = new Date(dateString);
      // Verifica che la data sia valida (getTime() non è NaN)
      if (isNaN(date.getTime())) return 'N/D';
      
      // Formatta la data usando il locale italiano (GG/MM/YYYY)
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      // Se il parsing fallisce, ritorna fallback
      return 'N/D';
    }
  }

  // Metodo che calcola e ritorna la durata del volo
  // Se gli orari non sono disponibili, mostra la rotta come fallback
  getDisplayDuration(flight: any): string {
    // Estrae gli orari di partenza e arrivo
    const departureTime = this.getDepartureTime(flight);
    const arrivalTime = this.getArrivalTime(flight);
    
    // Se uno dei due orari è assente, prova a mostrare la rotta
    if (!departureTime || !arrivalTime) {
      // Estrae i codici degli aeroporti
      const depAirport = this.getDepartureAirport(flight);
      const arrAirport = this.getArrivalAirport(flight);
      
      // Se entrambi gli aeroporti sono noti, mostra la rotta (es. "MXP→LIN")
      if (depAirport !== '???' && arrAirport !== '???') {
        return `${depAirport}→${arrAirport}`;
      }
      // Se nemmeno la rotta è disponibile, ritorna fallback
      return 'N/D';
    }
    
    // Se gli orari sono disponibili, calcola e ritorna la durata
    return this.calculateDuration(departureTime, arrivalTime);
  }

  // Metodo che calcola la durata di un volo in ore e minuti
  calculateDuration(departureTime: string | undefined, arrivalTime: string | undefined): string {
    // Se uno dei due orari è assente, non può calcolare la durata
    if (!departureTime || !arrivalTime) return 'N/D';
    
    try {
      // Converte le stringhe ISO in oggetti Date
      const dep = new Date(departureTime);
      const arr = new Date(arrivalTime);
      
      // Verifica che entrambe le date siano valide
      if (isNaN(dep.getTime()) || isNaN(arr.getTime())) return 'N/D';
      
      // Calcola la differenza in millisecondi (arr - dep)
      const diff = arr.getTime() - dep.getTime();
      
      // Se la differenza è negativa (arrival < departure), i dati sono incoerenti
      if (diff < 0) return 'N/D';
      
      // Converte i millisecondi in ore (1000ms * 60s * 60min)
      const hours = Math.floor(diff / (1000 * 60 * 60));
      // Calcola i minuti rimanenti dopo le ore (modulo 1 ora)
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      // Se la durata è zero (meno di 1 minuto), dati non affidabili
      if (hours === 0 && minutes === 0) return 'N/D';
      
      // Ritorna la durata formattata (es. "2h 30m")
      return `${hours}h ${minutes}m`;
    } catch {
      // Se il calcolo fallisce per qualsiasi motivo, ritorna fallback
      return 'N/D';
    }
  }

  // Metodo che ritorna l'emoji della compagnia aerea in base al codice
  // Utile per visualizzare un'icona flag della nazione della compagnia
  getAirlineIcon(airlineCode: string): string {
    // Mappa che associa codici compagnia a emoji flag del paese
    const icons: { [key: string]: string } = {
      // ========== COMPAGNIE AUSTRALIANE ==========
      'QF': '🇦🇺', 'VA': '🇦🇺', 'JQ': '🇦🇺', 'ZL': '🇦🇺',
      
      // ========== COMPAGNIE EUROPEE ==========
      'BA': '🇬🇧', 'AF': '🇫🇷', 'LH': '🇩🇪', 'AZ': '🇮🇹',
      'KL': '🇳🇱', 'IB': '🇪🇸', 'FR': '🇮🇪', 'U2': '🇬🇧',
      'RY': '🇪🇸', 'VY': '🇪🇸',
      
      // ========== COMPAGNIE AMERICANE ==========
      'AA': '🇺🇸', 'DL': '🇺🇸', 'UA': '🇺🇸',
      
      // ========== COMPAGNIE ASIATICHE ==========
      'EK': '🇦🇪', 'QR': '🇶🇦', 'EY': '🇦🇪', 'TK': '🇹🇷',
      'LJ': '🇰🇷', 'JL': '🇯🇵', 'NH': '🇯🇵', 'SQ': '🇸🇬', 
      'CX': '🇭🇰', '7C': '🇰🇷', 'ZE': '🇰🇷', 'MM': '🇯🇵',
      'BX': '🇰🇷', 'VN': '🇻🇳', 'LY': '🇮🇱', 'TG': '🇹🇭',
      'VJ': '🇻🇳', 'AI': '🇮🇳',
      
      // ========== ALTRE COMPAGNIE ==========
      'W2': '🇩🇰'
    };
    
    // Ritorna l'emoji dalla mappa, o l'emoji default dell'aereo se non trovato
    return icons[airlineCode] || '✈️';
  }

  // Metodo che ritorna la classe CSS dinamica per lo styling del badge stato
  // Il colore del badge dipende dallo stato del volo
  getStatusBadgeClass(status: string): string {
    // Normalizza lo stato per il confronto
    const s = normalizeStatus(status);
    
    // Mappa degli stati ai nomi delle classi CSS per lo styling
    const statusClasses: { [key: string]: string } = {
      // Classe CSS per voli in aria
      'active': 'badge-active',
      // Classe CSS per voli programmati
      'scheduled': 'badge-scheduled',
      // Classe CSS per voli atterrati
      'landed': 'badge-landed',
      // Classe CSS per voli cancellati
      'cancelled': 'badge-cancelled',
      // Classe CSS per voli con incidente
      'incident': 'badge-incident',
      // Classe CSS per voli deviati
      'diverted': 'badge-diverted'
    };
    
    // Ritorna la classe CSS appropriata, o una classe default se non trovata
    return statusClasses[s] || 'badge-unknown';
  }

  // Metodo che ritorna il testo dello stato tradotto in italiano
  // Usa la funzione utilitaria condivisa dal modello
  getStatusText(status: string): string {
    // Delega alla funzione utilitaria che fa la normalizzazione e traduzione
    return getStatusTextUtil(status);
  }

  // Metodo di debug temporaneo per ispezionare lo stato di un volo nella console
  checkFlightStatus(flight: any) {
    // Log strutturato che mostra numero volo, status originale, e traduzione
    console.log('🔍 DEBUG STATO VOLO:', {
      // Numero del volo per identificarlo
      numero: this.getFlightNumber(flight),
      // Stato originale come ritornato dall'API
      stato_originale: flight.flight_status,
      // Stato tradotto in italiano
      stato_tradotto: this.getStatusText(flight.flight_status)
    });
  }
}