/**
 * Location Service
 * Provides user location via GPS or IP geolocation
 * Used for determining visible stars and telescope pointing accuracy
 */

export interface LocationData {
  latitude: number;      // degrees, positive North
  longitude: number;     // degrees, positive East
  altitude?: number;     // meters above sea level
  accuracy?: number;     // accuracy in meters
  timestamp: number;     // Unix timestamp (ms)
  timezone: string;      // IANA timezone (e.g., "America/Los_Angeles")
  localTime: Date;       // Current local time
  source: 'gps' | 'ip' | 'manual'; // Source of location data
}

export interface LocationServiceConfig {
  /**
   * Timeout for GPS request (ms)
   */
  gpsTimeout?: number;

  /**
   * Maximum age of cached GPS position (ms)
   */
  gpsMaxAge?: number;

  /**
   * Enable high accuracy GPS
   */
  gpsHighAccuracy?: boolean;

  /**
   * IP geolocation API endpoint (fallback)
   */
  ipGeoApiUrl?: string;
}

const DEFAULT_CONFIG: Required<LocationServiceConfig> = {
  gpsTimeout: 10000,        // 10 seconds
  gpsMaxAge: 300000,        // 5 minutes
  gpsHighAccuracy: true,
  ipGeoApiUrl: 'https://ipapi.co/json/', // Free IP geolocation service
};

export class LocationService {
  private config: Required<LocationServiceConfig>;
  private cachedLocation: LocationData | null = null;

  constructor(config: LocationServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get user location (tries GPS first, falls back to IP geolocation)
   */
  async getLocation(): Promise<LocationData> {
    // Try GPS first
    try {
      const gpsLocation = await this.getGPSLocation();
      this.cachedLocation = gpsLocation;
      return gpsLocation;
    } catch (gpsError) {
      console.warn('GPS location failed, falling back to IP geolocation:', gpsError);

      // Fallback to IP geolocation
      try {
        const ipLocation = await this.getIPLocation();
        this.cachedLocation = ipLocation;
        return ipLocation;
      } catch (ipError) {
        console.error('IP geolocation also failed:', ipError);

        // If we have cached location, return it
        if (this.cachedLocation) {
          console.warn('Using cached location data');
          return this.cachedLocation;
        }

        // Ultimate fallback: throw error
        throw new Error('Failed to get location from both GPS and IP geolocation');
      }
    }
  }

  /**
   * Get GPS location using browser Geolocation API
   */
  async getGPSLocation(): Promise<LocationData> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation API not supported in this browser');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, altitude, accuracy } = position.coords;
          const timestamp = position.timestamp;

          const locationData: LocationData = {
            latitude,
            longitude,
            altitude: altitude ?? undefined,
            accuracy,
            timestamp,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            localTime: new Date(timestamp),
            source: 'gps',
          };

          resolve(locationData);
        },
        (error) => {
          let errorMessage = 'GPS location error';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'User denied GPS permission';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'GPS position unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'GPS request timed out';
              break;
          }
          reject(new Error(`${errorMessage}: ${error.message}`));
        },
        {
          enableHighAccuracy: this.config.gpsHighAccuracy,
          timeout: this.config.gpsTimeout,
          maximumAge: this.config.gpsMaxAge,
        }
      );
    });
  }

  /**
   * Get approximate location via IP geolocation
   */
  async getIPLocation(): Promise<LocationData> {
    try {
      const response = await fetch(this.config.ipGeoApiUrl);

      if (!response.ok) {
        throw new Error(`IP geolocation API returned ${response.status}`);
      }

      const data = await response.json();

      // Validate response
      if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
        throw new Error('Invalid IP geolocation response');
      }

      const locationData: LocationData = {
        latitude: data.latitude,
        longitude: data.longitude,
        altitude: undefined,
        accuracy: 5000, // IP geolocation is typically accurate to ~5km
        timestamp: Date.now(),
        timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        localTime: new Date(),
        source: 'ip',
      };

      return locationData;
    } catch (error) {
      throw new Error(`IP geolocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set manual location (for testing or when user enters coordinates)
   */
  setManualLocation(locationOrLatitude: LocationData | number, longitude?: number, altitude?: number): LocationData {
    let locationData: LocationData;

    if (typeof locationOrLatitude === 'object') {
      // Full LocationData object provided
      locationData = locationOrLatitude;
    } else {
      // Individual coordinates provided
      locationData = {
        latitude: locationOrLatitude,
        longitude: longitude!,
        altitude,
        accuracy: 0,
        timestamp: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        localTime: new Date(),
        source: 'manual',
      };
    }

    this.cachedLocation = locationData;
    return locationData;
  }

  /**
   * Get current location from GPS (alias for getGPSLocation for clarity)
   */
  async getCurrentLocation(): Promise<LocationData> {
    return this.getGPSLocation();
  }

  /**
   * Get cached location (if available)
   */
  getCachedLocation(): LocationData | null {
    return this.cachedLocation;
  }

  /**
   * Check if browser supports GPS
   */
  static supportsGPS(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Request GPS permission (useful for checking permission status)
   */
  static async requestPermission(): Promise<PermissionStatus | null> {
    if (!('permissions' in navigator)) {
      return null;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result;
    } catch (error) {
      console.warn('Failed to query geolocation permission:', error);
      return null;
    }
  }
}

/**
 * Helper: Format location for display
 */
export function formatLocation(location: LocationData): string {
  const lat = Math.abs(location.latitude).toFixed(4);
  const latDir = location.latitude >= 0 ? 'N' : 'S';
  const lon = Math.abs(location.longitude).toFixed(4);
  const lonDir = location.longitude >= 0 ? 'E' : 'W';

  return `${lat}° ${latDir}, ${lon}° ${lonDir}`;
}

/**
 * Helper: Format location with accuracy
 */
export function formatLocationWithAccuracy(location: LocationData): string {
  const coordStr = formatLocation(location);
  const accuracy = location.accuracy
    ? location.accuracy < 1000
      ? `±${Math.round(location.accuracy)}m`
      : `±${(location.accuracy / 1000).toFixed(1)}km`
    : 'unknown accuracy';

  return `${coordStr} (${accuracy}, ${location.source})`;
}

/**
 * Helper: Calculate distance between two locations (Haversine formula)
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters

  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Singleton instance for convenience
 */
export const locationService = new LocationService();
