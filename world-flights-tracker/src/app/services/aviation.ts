import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AviationService {
  private apiUrl = 'https://api.aviationstack.com/v1'; // ← CAMBIATO A HTTPS
  private accessKey = environment.aviationStackKey;

  constructor(private http: HttpClient) {}

  getActiveFlights(): Observable<any> {
    console.log('API Key:', this.accessKey ? 'Presente' : 'Mancante'); // Debug sicuro
    
    const params = new HttpParams()
      .set('access_key', this.accessKey)
      .set('flight_status', 'active')
      .set('limit', '10');

    console.log('URL completa:', `${this.apiUrl}/flights?access_key=${this.accessKey.substring(0, 8)}...`); // Debug parziale
    
    return this.http.get<any>(`${this.apiUrl}/flights`, { params })
      .pipe(
        tap(response => console.log('API Response:', response)),
        catchError(error => {
          console.error('🔴 ERRORE COMPLETO:', error);
          console.error('Status:', error.status);
          console.error('Message:', error.message);
          console.error('URL:', error.url);
          throw error;
        })
      );
  }
}