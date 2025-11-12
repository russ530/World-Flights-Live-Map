export interface Flight {
  flight_date: string;
  flight_status: string;
  departure: {
    airport: string;
    iata: string;
    scheduled: string;
    estimated?: string;  // Aggiungi
    actual?: string;     // Aggiungi
    terminal?: string;
    gate?: string;
  };
  arrival: {
    airport: string;
    iata: string;
    scheduled: string;
    estimated?: string;  // Aggiungi
    actual?: string;     // Aggiungi
    terminal?: string;
    gate?: string;
  };
  airline: {
    name: string;
    iata: string;
    icao?: string;
  };
  flight: {
    number: string;
    iata: string;
    icao?: string;
  };
  live?: {
    latitude: number;
    longitude: number;
    altitude: number;
    direction: number;
    speed_horizontal: number;
    speed_vertical: number;
    is_ground: boolean;
  };
}

export interface AviationStackResponse {
  data: Flight[];
  pagination: {
    count: number;
    total: number;
    offset: number;
    limit: number;
  };
}