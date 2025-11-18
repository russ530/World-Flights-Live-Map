// Interfaccia che rappresenta un volo con tutti i dati ricevuti dall'API Aviationstack
export interface Flight {
  // Data del volo in formato YYYY-MM-DD
  flight_date: string;
  // Stato del volo come ritornato dall'API (active, scheduled, landed, ecc.)
  flight_status: string;
  // Oggetto con tutti i dati della partenza
  departure: {
    // Nome completo dell'aeroporto di partenza
    airport: string;
    // Codice IATA a 3 lettere dell'aeroporto (es. MXP, FCO)
    iata: string;
    // Orario di partenza programmato (ISO 8601 format)
    scheduled: string;
    // Orario stimato di partenza (opzionale, se diverso da programmato)
    estimated?: string;
    // Orario effettivo di partenza (opzionale, riempito a volo decollato)
    actual?: string;
    // Numero del terminal di partenza
    terminal?: string;
    // Numero del gate di partenza
    gate?: string;
  };
  // Oggetto con tutti i dati dell'arrivo
  arrival: {
    // Nome completo dell'aeroporto di arrivo
    airport: string;
    // Codice IATA a 3 lettere dell'aeroporto (es. LIN, FCO)
    iata: string;
    // Orario di arrivo programmato (ISO 8601 format)
    scheduled: string;
    // Orario stimato di arrivo (opzionale, se diverso da programmato)
    estimated?: string;
    // Orario effettivo di arrivo (opzionale, riempito a volo atterrato)
    actual?: string;
    // Numero del terminal di arrivo
    terminal?: string;
    // Numero del gate di arrivo
    gate?: string;
  };
  // Oggetto con dati della compagnia aerea
  airline: {
    // Nome completo della compagnia aerea (es. "Alitalia")
    name: string;
    // Codice IATA della compagnia a 2 lettere (es. AZ)
    iata: string;
    // Codice ICAO della compagnia a 3 lettere (es. AZA)
    icao?: string;
  };
  // Oggetto con dati identificativi del volo
  flight: {
    // Numero del volo (es. "1234")
    number: string;
    // Codice IATA completo del volo (es. "AZ1234")
    iata: string;
    // Codice ICAO completo del volo
    icao?: string;
  };
  // Dati di localizzazione GPS in tempo reale (non sempre disponibili da API free)
  live?: {
    // Latitudine attuale dell'aereo
    latitude: number;
    // Longitudine attuale dell'aereo
    longitude: number;
    // Altitudine in piedi
    altitude: number;
    // Direzione di volo in gradi (0-360)
    direction: number;
    // Velocità orizzontale in km/h
    speed_horizontal: number;
    // Velocità verticale in m/s (salita positiva, discesa negativa)
    speed_vertical: number;
    // Flag che indica se l'aereo è a terra o in aria
    is_ground: boolean;
  };
}

// Interfaccia che rappresenta la risposta completa dell'API Aviationstack
export interface AviationStackResponse {
  // Array di voli restituiti dalla ricerca
  data: Flight[];
  // Oggetto con info sulla paginazione dei risultati
  pagination: {
    // Numero di voli contenuti in questa risposta
    count: number;
    // Numero totale di voli disponibili (senza limiti)
    total: number;
    // Posizione di partenza nell'elenco totale (per successive richieste)
    offset: number;
    // Numero massimo di risultati per pagina
    limit: number;
  };
}

// Costanti per gli stati dei voli in forma canonica (normalizzate)
// Utile per referenziare gli stati senza errori di typo
export const FlightStatusKeys: { [key: string]: string } = {
  // Stato: il volo è attualmente in aria
  ACTIVE: 'active',
  // Stato: il volo è programmato ma non è ancora decollato
  SCHEDULED: 'scheduled',
  // Stato: il volo è atterrato
  LANDED: 'landed',
  // Stato: il volo è stato cancellato
  CANCELLED: 'cancelled',
  // Stato: il volo ha avuto un incidente
  INCIDENT: 'incident',
  // Stato: il volo è stato deviato verso un'altra destinazione
  DIVERTED: 'diverted'
};

// Mappa degli stati dei voli in italiano per la visualizzazione all'utente
// Converte gli stati normalizzati in etichette leggibili in italiano
export const FlightStatusText: { [key: string]: string } = {
  // Traduzione italiana dello stato 'active'
  'active': 'In Volo',
  // Traduzione italiana dello stato 'scheduled'
  'scheduled': 'Programmato',
  // Traduzione italiana dello stato 'landed'
  'landed': 'Atterrato',
  // Traduzione italiana dello stato 'cancelled'
  'cancelled': 'Cancellato',
  // Traduzione italiana dello stato 'incident'
  'incident': 'Incidente',
  // Traduzione italiana dello stato 'diverted'
  'diverted': 'Deviato'
};

// Funzione che normalizza gli stati dei voli in formato canonico
// Converte varianti diverse (es. "en route", "canceled") nello stato standard
// Questo evita di doversi preoccupare delle variazioni nell'API
export function normalizeStatus(status?: string): string {
  // Se lo stato è vuoto o undefined, ritorna stringa vuota
  if (!status) return '';
  
  // Converte lo stato a minuscole e rimuove spazi iniziali/finali
  const s = status.toString().toLowerCase().trim();

  // Mappa di conversione da varianti a stati canonici
  // Permette di gestire diverse variazioni restituite da API diverse
  const map: { [key: string]: string } = {
    // Variante standard dello stato 'active'
    'active': 'active',
    // Variante "en route" dello stato 'active' (alcuni sistemi la usano)
    'en route': 'active',
    // Variante "en-route" (con trattino) dello stato 'active'
    'en-route': 'active',
    // Variante standard dello stato 'scheduled'
    'scheduled': 'scheduled',
    // Variante "scheduled " (con spazio finale) dello stato 'scheduled'
    'scheduled ': 'scheduled',
    // Variante standard dello stato 'landed'
    'landed': 'landed',
    // Variante "arrived" dello stato 'landed' (significato equivalente)
    'arrived': 'landed',
    // Variante standard dello stato 'cancelled' (inglese US)
    'cancelled': 'cancelled',
    // Variante "canceled" (inglese UK) dello stato 'cancelled'
    'canceled': 'cancelled',
    // Variante standard dello stato 'incident'
    'incident': 'incident',
    // Variante standard dello stato 'diverted'
    'diverted': 'diverted',
    // Variante "redirected" dello stato 'diverted' (significato equivalente)
    'redirected': 'diverted',
    // Stato sconosciuto viene convertito a stringa vuota
    'unknown': ''
  };

  // Ritorna il valore mappato, oppure lo stato come-è se non trovato nella mappa
  return map[s] ?? s;
}

// Funzione che converte uno stato di volo in testo localizzato in italiano
// Combina la normalizzazione dello stato con la traduzione italiana
export function getStatusText(status?: string): string {
  // Normalizza lo stato per gestire varianti diverse
  const key = normalizeStatus(status);
  
  // Ritorna la traduzione italiana dallo stato normalizzato
  // Se non trovato, fallback allo stato originale se presente
  return FlightStatusText[key] || (status || '');
}