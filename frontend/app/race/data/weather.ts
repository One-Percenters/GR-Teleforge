// Hardcoded weather data for race tracks

export interface WeatherData {
  condition: string;
  temperature: number; // Fahrenheit
  humidity: number; // Percentage
  windSpeed: number; // mph
  windDirection: string;
  trackTemp: number; // Fahrenheit
  precipitation: number; // Percentage chance
}

export interface RaceWeather {
  R1: WeatherData;
  R2: WeatherData;
}

export const TRACK_WEATHER: Record<string, RaceWeather> = {
  Barber: {
    R1: {
      condition: 'Partly Cloudy',
      temperature: 78,
      humidity: 52,
      windSpeed: 8,
      windDirection: 'NW',
      trackTemp: 104,
      precipitation: 10
    },
    R2: {
      condition: 'Sunny',
      temperature: 82,
      humidity: 45,
      windSpeed: 6,
      windDirection: 'W',
      trackTemp: 118,
      precipitation: 0
    }
  },
  Indianapolis: {
    R1: {
      condition: 'Overcast',
      temperature: 71,
      humidity: 68,
      windSpeed: 12,
      windDirection: 'NE',
      trackTemp: 89,
      precipitation: 25
    },
    R2: {
      condition: 'Clear',
      temperature: 75,
      humidity: 58,
      windSpeed: 10,
      windDirection: 'E',
      trackTemp: 102,
      precipitation: 5
    }
  }
};

// Track info
export interface TrackInfo {
  length: number; // miles
  turns: number;
  location: string;
  surface: string;
}

export const TRACK_INFO: Record<string, TrackInfo> = {
  Barber: {
    length: 2.38,
    turns: 17,
    location: 'Birmingham, AL',
    surface: 'Asphalt'
  },
  Indianapolis: {
    length: 2.439,
    turns: 14,
    location: 'Indianapolis, IN',
    surface: 'Asphalt'
  }
};

