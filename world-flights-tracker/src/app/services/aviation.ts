import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AviationService {
  private apiUrl = 'https://api.aviationstack.com/v1';
  private accessKey = environment.aviationStackKey;

  constructor(private http: HttpClient) {}

  getActiveFlights(): Observable<any> {
    console.log('🔑 API Key presente:', !!this.accessKey);
    
    // Parametri più completi per ottenere voli diversi
    const params = new HttpParams()
      .set('access_key', this.accessKey)
      .set('flight_status', 'active')
      .set('limit', '30') // Aumentiamo il limite
      .set('offset', this.getRandomOffset()) // Offset casuale
      .set('ts', new Date().getTime().toString()) // Timestamp unico
      .set('fields', 'flight_date,flight_status,flight,airline,departure,arrival'); // Solo campi necessari

    console.log('🌐 Richiesta API con offset:', this.getRandomOffset());
    
    return this.http.get<any>(`${this.apiUrl}/flights`, { params })
      .pipe(
        tap(response => {
          console.log('🔄 DATI AGGIORNATI:', new Date().toLocaleTimeString());
          console.log('📊 Voli ricevuti:', response.data?.length);
          
          if (response.data && response.data.length > 0) {
            // Analizza la distribuzione geografica
            this.analyzeFlightDistribution(response.data);
          }
        }),
        catchError(error => {
          console.error('🔴 ERRORE API:', error);
          return new Observable(observer => {
            observer.next({ data: [] });
            observer.complete();
          });
        })
      );
  }

  // Genera un offset casuale per ottenere voli diversi
  private getRandomOffset(): string {
    return Math.floor(Math.random() * 100).toString();
  }

  // Analizza la distribuzione geografica dei voli
  private analyzeFlightDistribution(flights: any[]) {
    const airlines = new Set<string>();
    const departureCountries = new Set<string>();
    
    flights.forEach(flight => {
      if (flight.airline?.name) {
        airlines.add(flight.airline.name);
      }
      if (flight.departure?.iata) {
        departureCountries.add(flight.departure.iata.substring(0, 2)); // Prime 2 lettere del codice IATA
      }
    });

    console.log('🌍 ANALISI DISTRIBUZIONE:');
    console.log('✈️ Compagnie aeree:', Array.from(airlines));
    console.log('📍 Paesi di partenza:', Array.from(departureCountries));
    console.log('📈 Totale compagnie:', airlines.size);
    console.log('📈 Totale paesi:', departureCountries.size);
  }

  getFlightsWithFilters(flightStatus?: string, airline?: string): Observable<any> {
    let params = new HttpParams()
      .set('access_key', this.accessKey)
      .set('limit', '50')
      .set('ts', new Date().getTime().toString());

    if (flightStatus) {
      params = params.set('flight_status', flightStatus);
    }

    if (airline) {
      params = params.set('airline_name', airline);
    }

    return this.http.get<any>(`${this.apiUrl}/flights`, { params });
  }
}