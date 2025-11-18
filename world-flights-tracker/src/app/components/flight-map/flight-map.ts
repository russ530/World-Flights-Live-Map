// Importa i decoratori di Angular per lifecycle e accesso agli input
import { Component, Input, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
// Importa CommonModule per direttive ng* (ngIf, ngFor, ecc.)
import { CommonModule } from '@angular/common';
// Importa l'interfaccia Flight e funzioni di normalizzazione dello stato
import { Flight, normalizeStatus, getStatusText as getStatusTextUtil } from '../../models/flight.model';

// Dichiara la disponibilità della libreria Leaflet (importata da CDN in HTML)
// Senza questa dichiarazione, TypeScript non riconoscerebbe l'oggetto L globale
declare var L: any;

// Decoratore @Component che definisce il componente Angular
@Component({
  // Selector usato nel template HTML per inserire questo componente
  selector: 'app-flight-map',
  // standalone: true indica che il componente non ha bisogno di NgModule
  standalone: true,
  // imports: dichiara i moduli necessari per questo componente
  imports: [CommonModule],
  // Path del file HTML che contiene il template
  templateUrl: './flight-map.html',
  // Path del file CSS con gli stili del componente
  styleUrls: ['./flight-map.css']
})
export class FlightMapComponent implements AfterViewInit, OnChanges {
  // @Input: riceve l'array di voli dal componente padre (FlightsListComponent)
  // Quando cambia, viene eseguito ngOnChanges
  @Input() flights: Flight[] = [];
  
  // Variabile privata che mantiene il riferimento all'oggetto mappa Leaflet
  // Null finché la mappa non è inizializzata
  private map: any;
  
  // Array che mantiene i riferimenti a tutti i marker sulla mappa
  // Serve per poterli rimuovere quando i voli cambiano
  private markers: any[] = [];
  
  // Flag che indica se la mappa è stata inizializzata
  // Evita di reinizializzare più volte
  private isMapInitialized = false;
  
  // Flag pubblico che controlla se usare coordinate mock o reali
  // Public perché alcuni template/metodi potrebbero accedervi
  // true = usa coordinate simulate; false = usa dati reali dall'API
  public useMockData = true;

  // Hook del ciclo di vita Angular eseguito dopo che il view e i child components sono inizializzati
  // Questo è il momento giusto per inizializzare la mappa Leaflet
  ngAfterViewInit() {
    // Inizializza la mappa (crea l'elemento canvas e configura i layer)
    this.initMap();
  }

  // Hook che viene eseguito quando uno dei @Input properties cambia
  // Utile per aggiornare la mappa quando i voli vengono aggiornati
  ngOnChanges(changes: SimpleChanges) {
    // Verifica che sia cambiato specificatamente l'input 'flights'
    if (changes['flights'] && this.isMapInitialized) {
      // Se la mappa è già inizializzata, aggiorna i marker con i nuovi voli
      this.updateMapMarkers();
    }
  }

  // Metodo privato che inizializza la mappa Leaflet
  // Viene chiamato una sola volta al caricamento del componente
  private initMap() {
    // Verifica che la libreria Leaflet sia stata caricata correttamente
    if (typeof L === 'undefined') {
      // Se Leaflet non è disponibile, log di errore e ritorno
      console.error('❌ Leaflet non è caricato!');
      return;
    }
    
    try {
      // Crea una mappa Leaflet sull'elemento HTML con id 'flight-map'
      // Imposta la vista iniziale su Milano (latitude 45.4642, longitude 9.1900)
      // zoom: 3 è un buon livello per vedere un'area geografica ampia
      this.map = L.map('flight-map').setView([45.4642, 9.1900], 3);
      
      // Aggiunge il layer di tile map (OpenStreetMap è gratuito e open-source)
      // {s} viene sostituito da 'a', 'b', 'c' per distribuire il carico sui server
      // maxZoom: 18 è il massimo livello di zoom disponibile
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        // Attribuzione richiesta da OpenStreetMap
        attribution: '© OpenStreetMap contributors',
        // Livello di zoom massimo supportato dal tile provider
        maxZoom: 18
      }).addTo(this.map);

      // Imposta il flag che indica che la mappa è pronta
      this.isMapInitialized = true;
      // Log di successo
      console.log('✅ Mappa inizializzata correttamente');
      // Aggiorna i marker con i voli attuali
      this.updateMapMarkers();
    } catch (error) {
      // Se qualcosa va male, log l'errore per debugging
      console.error('❌ Errore nell\'inizializzazione della mappa:', error);
    }
  }

  // Metodo privato che aggiorna i marker sulla mappa
  // Rimuove marker vecchi e aggiunge nuovi in base ai voli attuali
  private updateMapMarkers() {
    // Se la mappa non è ancora inizializzata, non fare nulla
    if (!this.isMapInitialized) return;
    
    // Rimuove tutti i marker precedenti dalla mappa
    // forEach: itera su ogni marker memorizzato
    this.markers.forEach(marker => this.map.removeLayer(marker));
    // Resetta l'array dei marker a vuoto
    this.markers = [];

    // Variabile che conterrà i voli da mostrare (mock o reali)
    let flightsToShow: Flight[];

    // Verifica se usare coordinate mock o reali
    if (this.useMockData) {
      // Se useMockData è true, genera coordinate simulate per testing
      flightsToShow = this.addMockCoordinates();
      // Log che indica l'uso di dati mock
      console.log('🧪 Usando coordinate MOCK per testing');
    } else {
      // Se useMockData è false, usa i dati reali dall'API
      flightsToShow = this.getFlightsWithCoordinates();
      // Log che mostra quanti voli hanno coordinate reali
      console.log('📍 Voli con coordinate reali:', flightsToShow.length);
    }

    // Se nessun volo ha coordinate, mostra un messaggio sullo schermo
    if (flightsToShow.length === 0) {
      // Mostra un popup informativo al centro della mappa
      this.showNoDataMessage();
      return;
    }

    // Crea un marker per ogni volo da mostrare
    // forEach: itera su ogni volo con il suo indice
    flightsToShow.forEach((flight, index) => {
      // Crea il marker per il volo corrente
      const marker = this.createFlightMarker(flight);
      // Verifica che il marker sia stato creato correttamente
      if (marker) {
        // Aggiungi il marker all'array di marker tracciati
        this.markers.push(marker);
        // Aggiungi il marker alla mappa (lo rende visibile)
        marker.addTo(this.map);
        // Log di debug che mostra quali marker sono stati aggiunti
        console.log(`📍 Marker ${index + 1} aggiunto:`, flight.airline?.name, flight.flight?.number);
      }
    });

    // Se sono stati creati marker, adatta la vista della mappa per mostrarli tutti
    if (this.markers.length > 0) {
      // Crea un FeatureGroup (raggruppamento) di tutti i marker
      const group = new L.FeatureGroup(this.markers);
      // Adatta i boundary della mappa per mostrare tutti i marker
      // .pad(0.1) aggiunge un 10% di padding intorno ai marker per spazio visivo
      this.map.fitBounds(group.getBounds().pad(0.1));
      // Log che mostra il numero di marker visibili sulla mappa
      console.log('🗺️ Mappa adattata per mostrare', this.markers.length, 'marker');
    }
  }

  // Metodo privato che genera coordinate mock realistiche per testing
  // Utile quando l'API non fornisce dati di localizzazione GPS
  private addMockCoordinates(): Flight[] {
    // Log che indica la generazione di coordinate simulate
    console.log('🎲 Generando coordinate mock...');
    
    // Trasforma ogni volo aggiungendogli coordinate simulate
    // map: crea un nuovo array con lo stesso numero di elementi
    return this.flights.map((flight, index) => {
      // Genera coordinate realistiche basate sulla rotta
      // Usa Milano come centro di riferimento (45.4642, 9.1900)
      // Aggiunge casualità ±15 gradi per distribuire i voli su un'area ampia
      const baseLat = 45.4642 + (Math.random() - 0.5) * 30;
      const baseLng = 9.1900 + (Math.random() - 0.5) * 60;
      
      // Ritorna il volo con un oggetto live contenente coordinate simulate
      return {
        // Copia tutte le proprietà del volo originale
        ...flight,
        // Aggiunge l'oggetto live con coordinate simulate
        live: {
          // Latitudine con variazione di ±1 grado per non avere punti identici
          latitude: baseLat + (Math.random() - 0.5) * 2,
          // Longitudine con variazione di ±2 gradi
          longitude: baseLng + (Math.random() - 0.5) * 4,
          // Altitudine simulata tra 30000 e 40000 piedi
          altitude: 30000 + Math.random() * 10000,
          // Direzione casuale di volo (0-360 gradi)
          direction: Math.random() * 360,
          // Velocità orizzontale tra 800 e 1000 km/h
          speed_horizontal: 800 + Math.random() * 200,
          // Velocità verticale casuale tra -500 e +500 m/s (ascesa/discesa)
          speed_vertical: (Math.random() - 0.5) * 1000,
          // Flag che indica che l'aereo è in aria (non a terra)
          is_ground: false
        }
      };
    });
  }

  // Metodo privato che crea un marker Leaflet per un volo
  // Il marker è l'icona visibile sulla mappa che rappresenta il volo
  private createFlightMarker(flight: Flight): any {
    // Verifica che il volo abbia coordinate GPS valide
    if (!flight.live || !flight.live.latitude || !flight.live.longitude) {
      // Se non ha coordinate, non può essere visualizzato sulla mappa
      return null;
    }

    // Estrae lo stato del volo per la visualizzazione
    // Preferisce lo stato derivato (__derived_status) se disponibile
    const statusForDisplay = (flight as any).__derived_status || flight.flight_status;
    
    // Crea un'icona custom per il marker usando divIcon
    // divIcon permette di usare HTML e CSS instead di immagini raster
    const airplaneIcon = L.divIcon({
      // Classe CSS che applica styling al marker
      className: 'airplane-marker',
      // Contenuto HTML: un emoji dell'aereo basato sullo stato
      html: this.getAirplaneIcon(statusForDisplay),
      // Dimensioni dell'icona (30x30 pixel)
      iconSize: [30, 30],
      // Punto di ancoraggio: il centro dell'icona (per corretto posizionamento)
      iconAnchor: [15, 15]
    });

    // Crea il marker Leaflet con le coordinate del volo e l'icona custom
    const marker = L.marker([flight.live.latitude, flight.live.longitude], {
      // Associa l'icona custom al marker
      icon: airplaneIcon
    });

    // Crea il contenuto del popup che appare quando clicchi il marker
    const popupContent = this.createPopupContent(flight);
    // Associa il popup al marker
    marker.bindPopup(popupContent);

    // Ritorna il marker creato (pronto per essere aggiunto alla mappa)
    return marker;
  }

  // Metodo privato che ritorna l'emoji dell'aereo basato sullo stato del volo
  private getAirplaneIcon(status: string): string {
    // Normalizza lo stato per il confronto
    const s = normalizeStatus(status);
    // Mappa degli stati agli emoji appropriati
    const statusIcons: { [key: string]: string } = {
      // Aereo in aria (in volo)
      'active': '✈️',
      // Aereo che decolla (programmato)
      'scheduled': '🛫',
      // Aereo che atterra (atterrato)
      'landed': '🛬',
      // Volo cancellato (X rossa)
      'cancelled': '❌',
      // Volo con incidente (avvertimento)
      'incident': '⚠️',
      // Volo deviato (freccia curva)
      'diverted': '🔄'
    };
    // Seleziona l'emoji in base allo stato, o emoji default se non trovato
    const icon = statusIcons[s] || '✈️';
    // Ritorna l'emoji dentro un div per applicare styling CSS
    return `<div class="airplane-icon ${s}">${icon}</div>`;
  }

  // Metodo privato che crea il contenuto HTML del popup del marker
  // Il popup appare quando clicchi su un marker sulla mappa
  private createPopupContent(flight: Flight): string {
    // Verifica se stiamo usando dati mock per indicarlo nel popup
    const isMock = this.useMockData;
    // Se sono mock, crea un badge di avvertimento giallo
    const mockBadge = isMock ? '<span class="badge bg-warning text-dark">MOCK</span>' : '';
    
    // Costruisce l'HTML del popup come stringa
    return `
      <div class="flight-popup">
        <!-- Intestazione con nome compagnia, numero volo e badge mock -->
        <h6 class="mb-2">${flight.airline?.name || 'N/A'} ${flight.flight?.number || 'N/A'} ${mockBadge}</h6>
        <!-- Rotta: aeroporto di partenza → aeroporto di arrivo -->
        <div class="flight-route mb-2">
          <strong>${flight.departure?.iata || '???'}</strong> → <strong>${flight.arrival?.iata || '???'}</strong>
        </div>
        <!-- Informazioni di base del volo -->
        <div class="flight-info">
          <!-- Stato del volo in italiano -->
          <small><strong>Stato:</strong> ${getStatusTextUtil((flight as any).__derived_status || flight.flight_status)}</small><br>
          <!-- Orario di partenza programmato -->
          <small><strong>Partenza:</strong> ${this.formatTime(flight.departure?.scheduled)}</small><br>
          <!-- Orario di arrivo programmato -->
          <small><strong>Arrivo:</strong> ${this.formatTime(flight.arrival?.scheduled)}</small>
        </div>
        <!-- Dati di volo in tempo reale (se disponibili) -->
        ${flight.live ? `
          <div class="flight-live mt-2">
            <!-- Altitudine attuale in piedi -->
            <small><strong>Altitudine:</strong> ${Math.round(flight.live.altitude)} ft</small><br>
            <!-- Velocità orizzontale attuale in km/h -->
            <small><strong>Velocità:</strong> ${Math.round(flight.live.speed_horizontal)} km/h</small><br>
            <!-- Direzione di volo in gradi -->
            <small><strong>Direzione:</strong> ${Math.round(flight.live.direction)}°</small>
            <!-- Se sono dati mock, mostra un avviso -->
            ${isMock ? '<br><small class="text-muted"><em>Dati simulati per testing</em></small>' : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  // Metodo privato che mostra un messaggio quando non ci sono voli con coordinate
  private showNoDataMessage() {
    // Messaggio informativo da mostrare all'utente
    const message = `Nessuna posizione in tempo reale disponibile.
    
L'API free di Aviationstack non fornisce coordinate GPS in tempo reale.

Attivando i dati mock puoi vedere come funzionerebbe la mappa con coordinate reali.`;
    
    // Crea e apre un popup Leaflet al centro della mappa
    L.popup()
      // Posiziona il popup al centro della mappa iniziale (Milano)
      .setLatLng([45.4642, 9.1900])
      // Imposta il contenuto HTML del popup
      .setContent(`
        <div class="text-center p-3">
          <!-- Icona di avvertimento -->
          <h6>⚠️ Dati Limitati</h6>
          <!-- Messaggio di errore -->
          <p class="mb-3">${message}</p>
          <!-- Pulsante per attivare i dati mock -->
          <button onclick="document.querySelector('app-flight-map').refreshMap()" 
                  class="btn btn-sm btn-outline-primary">
            Attiva dati Mock
          </button>
        </div>
      `)
      // Mostra il popup sulla mappa
      .openOn(this.map);
  }

  // Metodo privato (legacy) che converte uno stato in testo italiano
  // NOTA: Questa funzione è ridondante, userebbe getStatusTextUtil invece
  private getStatusText(status: string): string {
    // Mappa locale di traduzione (duplicata da flight.model.ts)
    const statusText: { [key: string]: string } = {
      'active': 'In Volo',
      'scheduled': 'Programmato',
      'landed': 'Atterrato',
      'cancelled': 'Cancellato',
      'incident': 'Incidente',
      'diverted': 'Deviato'
    };
    // Ritorna la traduzione o lo stato originale se non trovato
    return statusText[status] || status;
  }

  // Metodo privato che formatta una data ISO in orario italiano (HH:MM)
  private formatTime(dateString: string | undefined): string {
    // Se la stringa è vuota o undefined, ritorna fallback
    if (!dateString) return 'N/A';
    try {
      // Converte la stringa ISO in oggetto Date
      const date = new Date(dateString);
      // Formatta usando il locale italiano, mostrando solo ore e minuti
      return date.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      // Se il parsing fallisce, ritorna fallback
      return 'N/A';
    }
  }

  // Metodo pubblico che aggiorna la mappa
  // Viene usato dal template o da altri componenti per forzare un refresh
  refreshMap() {
    // Se la mappa è inizializzata, aggiorna i marker visibili
    if (this.isMapInitialized) {
      this.updateMapMarkers();
    }
  }

  // Metodo privato che filtra i voli che hanno coordinate GPS reali
  // Ritorna solo quelli con campi live.latitude e live.longitude validi
  getFlightsWithCoordinates(): Flight[] {
    // Filtra l'array per mantenere solo i voli con coordinate
    const flights = this.flights.filter(flight => 
      // Controlla che il volo abbia l'oggetto live
      flight.live && 
      // Controlla che la latitudine sia presente
      flight.live.latitude && 
      // Controlla che la longitudine sia presente
      flight.live.longitude
    );
    
    // Log di debug che mostra quanti voli hanno coordinate GPS reali
    console.log('🔍 Voli con coordinate GPS reali:', flights.length);
    // Se nessun volo ha coordinate, log informativo
    if (flights.length === 0) {
      console.log('ℹ️ Nessun volo ha coordinate live - API free limitata');
    }
    
    // Ritorna l'array filtrato
    return flights;
  }

  // Metodo pubblico che attiva/disattiva l'uso di dati mock
  // Alterna tra coordinate simulate e coordinate reali
  toggleMockData() {
    // Inverte il flag booleano
    this.useMockData = !this.useMockData;
    // Log che mostra lo stato attuale
    console.log(this.useMockData ? '🧪 Mock attivati' : '📍 Mock disattivati');
    // Aggiorna i marker sulla mappa con il nuovo stato
    this.updateMapMarkers();
  }
}