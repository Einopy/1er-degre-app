export interface GeolocationResult {
  city: string;
  country: string;
  countryCode: string;
  regionName?: string;
}

interface GeolocationCache {
  data: GeolocationResult;
  timestamp: number;
}

const CACHE_KEY = 'user-location-cache';
const CACHE_TTL = 24 * 60 * 60 * 1000;
const API_TIMEOUT = 5000;

function getCachedLocation(): GeolocationResult | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp }: GeolocationCache = JSON.parse(cached);
    const now = Date.now();

    if (now - timestamp < CACHE_TTL) {
      return data;
    }

    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch (error) {
    console.error('Error reading geolocation cache:', error);
    return null;
  }
}

function setCachedLocation(data: GeolocationResult): void {
  try {
    const cache: GeolocationCache = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error setting geolocation cache:', error);
  }
}

export async function detectUserLocation(): Promise<GeolocationResult | null> {
  const cached = getCachedLocation();
  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch('http://ip-api.com/json/', {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('IP geolocation rate limit exceeded');
      }
      return null;
    }

    const data = await response.json();

    if (data.status === 'fail') {
      console.error('Geolocation API error:', data.message);
      return null;
    }

    const result: GeolocationResult = {
      city: data.city || '',
      country: data.country || '',
      countryCode: data.countryCode || '',
      regionName: data.regionName || '',
    };

    if (result.city) {
      setCachedLocation(result);
    }

    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Geolocation request timed out');
    } else {
      console.error('Error detecting user location:', error);
    }

    return null;
  }
}

export function clearLocationCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing location cache:', error);
  }
}
