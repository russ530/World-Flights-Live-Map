// Importa il decoratore Injectable di Angular per iniettare il servizio in altri componenti
import { Injectable } from '@angular/core';
// Importa HttpClient e HttpParams per fare richieste HTTP all'API esterna
import { HttpClient, HttpParams } from '@angular/common/http';
// Importa Observable e gli operatori RxJS per la gestione asincrona
import { Observable, catchError, tap } from 'rxjs';
// Importa la configurazione dell'applicazione (contiene l'API key)
import { environment } from '../../environments/environment';

// Decoratore @Injectable che indica che questo servizio può essere iniettato
// providedIn: 'root' significa che il servizio è un singleton globale
@Injectable({
  providedIn: 'root'
})
export class AviationService {
  // URL base dell'API Aviationstack
  private apiUrl = 'https://api.aviationstack.com/v1';
  // Chiave API per autenticazione (caricata da environment)
  private accessKey = environment.aviationStackKey;

  // Costruttore: inietta HttpClient per fare richieste HTTP
  constructor(private http: HttpClient) {}

  // Metodo publico che richiede i voli con status 'active'
  // Ritorna un Observable che emette i dati quando la richiesta è completata
  getActiveFlights(): Observable<any> {
    // Log per verificare che la API key è caricata correttamente
    console.log('🔑 API Key presente:', !!this.accessKey);
    
    // Crea gli oggetti parametri HTTP per la richiesta
    // HttpParams usa un builder pattern per aggiungere parametri in modo sicuro
    const params = new HttpParams()
      // Aggiunge la chiave API per l'autenticazione
      .set('access_key', this.accessKey)
      // Filtra solo voli con status 'active' (attualmente in volo)
      .set('flight_status', 'active')
      // Limita a 100 risultati per evitare di superare i limiti dell'API free
      .set('limit', '100')
      // Aggiunge un offset casuale per ottenere voli diversi ad ogni richiesta
      .set('offset', this.getRandomOffset())
      // Aggiunge timestamp per garantire unicità della richiesta (evita cache)
      .set('ts', new Date().getTime().toString())
      // Seleziona solo i campi necessari per ridurre la dimensione della risposta
      .set('fields', 'flight_date,flight_status,flight,airline,departure,arrival');

    // Log che mostra l'offset usato (utile per debugging)
    console.log('🌐 Richiesta API con offset:', this.getRandomOffset());
    
    // Effettua la richiesta HTTP GET all'endpoint /flights con i parametri
    return this.http.get<any>(`${this.apiUrl}/flights`, { params })
      .pipe(
        // tap: esegue effetti collaterali (log) senza modificare i dati
        tap(response => {
          // Log dell'orario di aggiornamento dei dati
          console.log('🔄 DATI AGGIORNATI:', new Date().toLocaleTimeString());
          // Log del numero di voli ricevuti
          console.log('📊 Voli ricevuti:', response.data?.length);
          
          // Se ci sono voli, analizza la loro distribuzione geografica
          if (response.data && response.data.length > 0) {
            // Chiama metodo di analisi distribuzione
            this.analyzeFlightDistribution(response.data);
          }
        }),
        // catchError: gestisce gli errori della richiesta HTTP
        catchError(error => {
          // Log dell'errore ricevuto
          console.error('🔴 ERRORE API:', error);
          // Ritorna un Observable con array vuoto per evitare crash dell'app
          return new Observable(observer => {
            // Emette un oggetto con array vuoto
            observer.next({ data: [] });
            // Completa l'Observable senza errori
            observer.complete();
          });
        })
      );
  }

  // Metodo privato che genera un offset casuale per ottenere voli diversi
  // Evita di ricevere sempre gli stessi voli ad ogni richiesta
  private getRandomOffset(): string {
    // Genera un numero casuale da 0 a 99
    return Math.floor(Math.random() * 100).toString();
  }

  // Metodo privato che analizza la distribuzione geografica dei voli ricevuti
  // Utile per debugging e per capire quali aeroporti/compagnie sono rappresentati
  private analyzeFlightDistribution(flights: any[]) {
    // Crea un Set per memorizzare le compagnie aeree uniche (evita duplicati)
    const airlines = new Set<string>();
    // Crea un Set per memorizzare i paesi di partenza (dalle prime 2 lettere del codice IATA)
    const departureCountries = new Set<string>();
    
    // Itera su ogni volo per estrarre informazioni
    flights.forEach(flight => {
      // Se il volo ha il nome della compagnia, aggiungilo al set
      if (flight.airline?.name) {
        airlines.add(flight.airline.name);
      }
      // Se il volo ha l'aeroporto di partenza, estrai le prime 2 lettere (codice paese)
      if (flight.departure?.iata) {
        // Substring(0, 2) estrae solo le prime 2 lettere del codice IATA
        departureCountries.add(flight.departure.iata.substring(0, 2));
      }
    });

    // Log di debug con analisi della distribuzione
    console.log('🌍 ANALISI DISTRIBUZIONE:');
    // Mostra lista di compagnie aeree trovate
    console.log('✈️ Compagnie aeree:', Array.from(airlines));
    // Mostra lista di paesi di partenza trovati
    console.log('📍 Paesi di partenza:', Array.from(departureCountries));
    // Mostra il conteggio totale di compagnie aeree uniche
    console.log('📈 Totale compagnie:', airlines.size);
    // Mostra il conteggio totale di paesi di partenza unici
    console.log('📈 Totale paesi:', departureCountries.size);
  }

  // Metodo publico che richiede voli con filtri opzionali
  // Permette di filtrare per status e compagnia aerea
  getFlightsWithFilters(flightStatus?: string, airline?: string): Observable<any> {
    // Crea i parametri HTTP base
    let params = new HttpParams()
      // Aggiunge la chiave API per l'autenticazione
      .set('access_key', this.accessKey)
      // Limita a 100 risultati per rispettare i limiti dell'API free
      .set('limit', '100')
      // Aggiunge timestamp per garantire unicità della richiesta
      .set('ts', new Date().getTime().toString());

    // Se è specificato uno status, aggiungilo ai parametri di filtro
    if (flightStatus) {
      params = params.set('flight_status', flightStatus);
    }

    // Se è specificata una compagnia aerea, aggiungila ai parametri di filtro
    if (airline) {
      params = params.set('airline_name', airline);
    }

    // Effettua la richiesta HTTP GET con i parametri e ritorna l'Observable
    return this.http.get<any>(`${this.apiUrl}/flights`, { params });
  }
}