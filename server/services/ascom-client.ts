import type { SystemStatus } from "@shared/schema";

// Basic ASCOM Alpaca REST API client
// ASCOM Alpaca is a REST API standard for astronomical devices
// Documentation: https://ascom-standards.org/api/

export class AscomClient {
  private baseUrl: string;
  private deviceNumber: number;

  constructor(baseUrl: string = "http://localhost:11111", deviceNumber: number = 0) {
    this.baseUrl = baseUrl;
    this.deviceNumber = deviceNumber;
  }

  private async request(method: string, endpoint: string, params: any = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}/api/v1/telescope/${this.deviceNumber}/${endpoint}`);
    
    // Add client ID and transaction ID (required by ASCOM)
    params.ClientID = params.ClientID || 1;
    params.ClientTransactionID = params.ClientTransactionID || Date.now();

    const options: RequestInit = {
      method: method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    if (method === 'GET') {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    } else {
      options.body = new URLSearchParams(params).toString();
    }

    try {
      const response = await fetch(url.toString(), options);
      const data = await response.json();

      if (data.ErrorNumber !== 0) {
        throw new Error(data.ErrorMessage || 'ASCOM error');
      }

      return data.Value;
    } catch (error: any) {
      throw new Error(`ASCOM request failed: ${error.message}`);
    }
  }

  // Connection
  async connect(): Promise<void> {
    await this.request('PUT', 'connected', { Connected: true });
  }

  async disconnect(): Promise<void> {
    await this.request('PUT', 'connected', { Connected: false });
  }

  async isConnected(): Promise<boolean> {
    return await this.request('GET', 'connected');
  }

  // Position
  async getRightAscension(): Promise<number> {
    return await this.request('GET', 'rightascension');
  }

  async getDeclination(): Promise<number> {
    return await this.request('GET', 'declination');
  }

  async getAltitude(): Promise<number> {
    return await this.request('GET', 'altitude');
  }

  async getAzimuth(): Promise<number> {
    return await this.request('GET', 'azimuth');
  }

  // Slewing
  async slewToCoordinatesAsync(ra: number, dec: number): Promise<void> {
    await this.request('PUT', 'slewtocoordinatesasync', { RightAscension: ra, Declination: dec });
  }

  async isSlewing(): Promise<boolean> {
    return await this.request('GET', 'slewing');
  }

  async abortSlew(): Promise<void> {
    await this.request('PUT', 'abortslew');
  }

  // Tracking
  async setTracking(enabled: boolean): Promise<void> {
    await this.request('PUT', 'tracking', { Tracking: enabled });
  }

  async isTracking(): Promise<boolean> {
    return await this.request('GET', 'tracking');
  }

  // Parking
  async park(): Promise<void> {
    await this.request('PUT', 'park');
  }

  async isParked(): Promise<boolean> {
    return await this.request('GET', 'atpark');
  }

  // Home
  async findHome(): Promise<void> {
    await this.request('PUT', 'findhome');
  }

  async isAtHome(): Promise<boolean> {
    return await this.request('GET', 'athome');
  }

  // Get full status (convenience method)
  async getStatus(): Promise<Partial<SystemStatus>> {
    const [connected, ra, dec, alt, az, slewing, tracking, parked] = await Promise.all([
      this.isConnected(),
      this.getRightAscension(),
      this.getDeclination(),
      this.getAltitude(),
      this.getAzimuth(),
      this.isSlewing(),
      this.isTracking(),
      this.isParked(),
    ]);

    return {
      telescope: {
        connected,
        connectionType: "ascom",
        tracking,
        slewing,
        parked,
        position: { ra, dec, alt, az },
      },
      camera: {
        connected: false,
        exposing: false,
        coolerOn: false,
        exposureTime: 30,
        gain: 50,
        binning: 1,
        progress: 0,
      },
      focuser: {
        connected: false,
        moving: false,
        position: 0,
        maxPosition: 10000,
      },
      calibration: {},
      lastUpdate: new Date().toISOString(),
    };
  }
}

// Note: ASCOM connection will only work if there's an ASCOM Alpaca server running
// For development, we primarily use the mock simulator
export const ascomClient = new AscomClient();
