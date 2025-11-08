import type { SystemStatus } from "@shared/schema";

// ASCOM Alpaca REST API client
// ASCOM Alpaca is a REST API standard for astronomical devices
// Documentation: https://ascom-standards.org/api/
// This implementation follows the ASCOM Alpaca API v1 specification

interface AscomResponse<T> {
  Value: T;
  ErrorNumber: number;
  ErrorMessage: string;
  ClientTransactionID: number;
  ServerTransactionID: number;
}

export class AscomTelescopeClient {
  private baseUrl: string;
  private deviceNumber: number;
  private clientId: number;
  private transactionCounter: number;

  constructor(baseUrl: string = "http://localhost:32323", deviceNumber: number = 0) {
    this.baseUrl = baseUrl;
    this.deviceNumber = deviceNumber;
    this.clientId = Math.floor(Math.random() * 10000);
    this.transactionCounter = 0;
  }

  private async request<T>(method: string, endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/v1/telescope/${this.deviceNumber}/${endpoint}`);

    // Add client ID and transaction ID (required by ASCOM)
    // ASCOM expects Int32 values, so we use a counter instead of Date.now()
    params.ClientID = params.ClientID || this.clientId;
    params.ClientTransactionID = params.ClientTransactionID || ++this.transactionCounter;

    const options: RequestInit = {
      method: method,
      headers: method !== 'GET' ? {
        'Content-Type': 'application/x-www-form-urlencoded',
      } : {},
    };

    if (method === 'GET') {
      Object.keys(params).forEach(key => url.searchParams.append(key, String(params[key])));
    } else {
      options.body = new URLSearchParams(params).toString();
    }

    console.log(`[ASCOM Telescope] ${method} ${url.toString()}`, method !== 'GET' ? options.body : '');

    try {
      const response = await fetch(url.toString(), options);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ASCOM Telescope] HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: AscomResponse<T> = await response.json();

      if (data.ErrorNumber !== 0) {
        throw new Error(data.ErrorMessage || `ASCOM error ${data.ErrorNumber}`);
      }

      return data.Value;
    } catch (error: any) {
      throw new Error(`ASCOM telescope request failed: ${error.message}`);
    }
  }

  // Connection
  async connect(): Promise<void> {
    console.log('[ASCOM Telescope] Connecting...');
    await this.request<void>('PUT', 'connected', { Connected: true });
    console.log('[ASCOM Telescope] Connected successfully');
  }

  async disconnect(): Promise<void> {
    await this.request<void>('PUT', 'connected', { Connected: false });
  }

  async isConnected(): Promise<boolean> {
    try {
      const result = await this.request<boolean>('GET', 'connected');
      console.log(`[ASCOM Telescope] isConnected result:`, result);
      return result;
    } catch (error: any) {
      console.error(`[ASCOM Telescope] isConnected error:`, error.message);
      throw error;
    }
  }

  // Capabilities - check what the telescope supports
  async canPark(): Promise<boolean> {
    return await this.request<boolean>('GET', 'canpark');
  }

  async canUnpark(): Promise<boolean> {
    return await this.request<boolean>('GET', 'canunpark');
  }

  async canFindHome(): Promise<boolean> {
    return await this.request<boolean>('GET', 'canfindhome');
  }

  async canSetTracking(): Promise<boolean> {
    return await this.request<boolean>('GET', 'cansettracking');
  }

  async canSlew(): Promise<boolean> {
    return await this.request<boolean>('GET', 'canslew');
  }

  async canSlewAsync(): Promise<boolean> {
    return await this.request<boolean>('GET', 'canslewasync');
  }

  async canSlewAltAz(): Promise<boolean> {
    return await this.request<boolean>('GET', 'canslewaltaz');
  }

  async canSlewAltAzAsync(): Promise<boolean> {
    return await this.request<boolean>('GET', 'canslewaltazasync');
  }

  async canMoveAxis(axis: number): Promise<boolean> {
    return await this.request<boolean>('GET', 'canmoveaxis', { Axis: axis });
  }

  async canPulseGuide(): Promise<boolean> {
    return await this.request<boolean>('GET', 'canpulseguide');
  }

  // Position - Current
  async getRightAscension(): Promise<number> {
    return await this.request<number>('GET', 'rightascension');
  }

  async getDeclination(): Promise<number> {
    return await this.request<number>('GET', 'declination');
  }

  async getAltitude(): Promise<number> {
    return await this.request<number>('GET', 'altitude');
  }

  async getAzimuth(): Promise<number> {
    return await this.request<number>('GET', 'azimuth');
  }

  // Position - Target (where telescope is slewing to)
  async getTargetRightAscension(): Promise<number> {
    return await this.request<number>('GET', 'targetrightascension');
  }

  async getTargetDeclination(): Promise<number> {
    return await this.request<number>('GET', 'targetdeclination');
  }

  // Pier side information
  async getSideOfPier(): Promise<number> {
    return await this.request<number>('GET', 'sideofpier');
  }

  async setSideOfPier(pierSide: number): Promise<void> {
    await this.request<void>('PUT', 'sideofpier', { SideOfPier: pierSide });
  }

  // Slewing - Equatorial coordinates
  async slewToCoordinates(ra: number, dec: number): Promise<void> {
    await this.request<void>('PUT', 'slewtocoordinates', { RightAscension: ra, Declination: dec });
  }

  async slewToCoordinatesAsync(ra: number, dec: number): Promise<void> {
    await this.request<void>('PUT', 'slewtocoordinatesasync', { RightAscension: ra, Declination: dec });
  }

  // Slewing - Altitude/Azimuth coordinates
  async slewToAltAz(alt: number, az: number): Promise<void> {
    await this.request<void>('PUT', 'slewtoaltaz', { Altitude: alt, Azimuth: az });
  }

  async slewToAltAzAsync(alt: number, az: number): Promise<void> {
    await this.request<void>('PUT', 'slewtoaltazasync', { Altitude: alt, Azimuth: az });
  }

  // Slew to target coordinates (must be set first)
  async slewToTarget(): Promise<void> {
    await this.request<void>('PUT', 'slewtotarget');
  }

  async slewToTargetAsync(): Promise<void> {
    await this.request<void>('PUT', 'slewtotargetasync');
  }

  async isSlewing(): Promise<boolean> {
    return await this.request<boolean>('GET', 'slewing');
  }

  async abortSlew(): Promise<void> {
    await this.request<void>('PUT', 'abortslew');
  }

  // Axis movement (for directional slewing)
  async moveAxis(axis: number, rate: number): Promise<void> {
    await this.request<void>('PUT', 'moveaxis', { Axis: axis, Rate: rate });
  }

  // Pulse guiding (for autoguiding)
  async pulseGuide(direction: number, duration: number): Promise<void> {
    await this.request<void>('PUT', 'pulseguide', { Direction: direction, Duration: duration });
  }

  async isPulseGuiding(): Promise<boolean> {
    return await this.request<boolean>('GET', 'ispulseguiding');
  }

  // Tracking
  async setTracking(enabled: boolean): Promise<void> {
    await this.request<void>('PUT', 'tracking', { Tracking: enabled });
  }

  async isTracking(): Promise<boolean> {
    return await this.request<boolean>('GET', 'tracking');
  }

  // Tracking rate (sidereal, lunar, solar, king)
  async getTrackingRate(): Promise<number> {
    return await this.request<number>('GET', 'trackingrate');
  }

  async setTrackingRate(rate: number): Promise<void> {
    await this.request<void>('PUT', 'trackingrate', { TrackingRate: rate });
  }

  async getTrackingRates(): Promise<number[]> {
    return await this.request<number[]>('GET', 'trackingrates');
  }

  // Parking
  async park(): Promise<void> {
    await this.request<void>('PUT', 'park');
  }

  async unpark(): Promise<void> {
    await this.request<void>('PUT', 'unpark');
  }

  async isParked(): Promise<boolean> {
    return await this.request<boolean>('GET', 'atpark');
  }

  async setpark(): Promise<void> {
    await this.request<void>('PUT', 'setpark');
  }

  // Home
  async findHome(): Promise<void> {
    await this.request<void>('PUT', 'findhome');
  }

  async isAtHome(): Promise<boolean> {
    return await this.request<boolean>('GET', 'athome');
  }

  // Sync telescope position to coordinates (calibration)
  async syncToCoordinates(ra: number, dec: number): Promise<void> {
    await this.request<void>('PUT', 'synctocoordinates', { RightAscension: ra, Declination: dec });
  }

  async syncToAltAz(alt: number, az: number): Promise<void> {
    await this.request<void>('PUT', 'synctoaltaz', { Altitude: alt, Azimuth: az });
  }

  async syncToTarget(): Promise<void> {
    await this.request<void>('PUT', 'synctotarget');
  }

  // Device information
  async getName(): Promise<string> {
    return await this.request<string>('GET', 'name');
  }

  async getDescription(): Promise<string> {
    return await this.request<string>('GET', 'description');
  }

  async getDriverInfo(): Promise<string> {
    return await this.request<string>('GET', 'driverinfo');
  }

  async getDriverVersion(): Promise<string> {
    return await this.request<string>('GET', 'driverversion');
  }
}

// ASCOM Camera Client
export class AscomCameraClient {
  private baseUrl: string;
  private deviceNumber: number;
  private clientId: number;
  private transactionCounter: number;

  constructor(baseUrl: string = "http://localhost:32323", deviceNumber: number = 0) {
    this.baseUrl = baseUrl;
    this.deviceNumber = deviceNumber;
    this.clientId = Math.floor(Math.random() * 10000);
    this.transactionCounter = 0;
  }

  private async request<T>(method: string, endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/v1/camera/${this.deviceNumber}/${endpoint}`);

    params.ClientID = params.ClientID || this.clientId;
    params.ClientTransactionID = params.ClientTransactionID || ++this.transactionCounter;

    const options: RequestInit = {
      method: method,
      headers: method !== 'GET' ? {
        'Content-Type': 'application/x-www-form-urlencoded',
      } : {},
    };

    if (method === 'GET') {
      Object.keys(params).forEach(key => url.searchParams.append(key, String(params[key])));
    } else {
      options.body = new URLSearchParams(params).toString();
    }

    try {
      const response = await fetch(url.toString(), options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: AscomResponse<T> = await response.json();

      if (data.ErrorNumber !== 0) {
        throw new Error(data.ErrorMessage || `ASCOM error ${data.ErrorNumber}`);
      }

      return data.Value;
    } catch (error: any) {
      throw new Error(`ASCOM camera request failed: ${error.message}`);
    }
  }

  // Connection
  async connect(): Promise<void> {
    console.log('[ASCOM Camera] Connecting...');
    await this.request<void>('PUT', 'connected', { Connected: true });
    console.log('[ASCOM Camera] Connected successfully');
  }

  async disconnect(): Promise<void> {
    await this.request<void>('PUT', 'connected', { Connected: false });
  }

  async isConnected(): Promise<boolean> {
    try {
      const result = await this.request<boolean>('GET', 'connected');
      console.log(`[ASCOM Camera] isConnected result:`, result);
      return result;
    } catch (error: any) {
      console.error(`[ASCOM Camera] isConnected error:`, error.message);
      throw error;
    }
  }

  // Camera capabilities
  async canAbortExposure(): Promise<boolean> {
    return await this.request<boolean>('GET', 'canabortexposure');
  }

  async canStopExposure(): Promise<boolean> {
    return await this.request<boolean>('GET', 'canstopexposure');
  }

  async canSetCCDTemperature(): Promise<boolean> {
    return await this.request<boolean>('GET', 'cansetccdtemperature');
  }

  // Camera state
  async getCameraState(): Promise<number> {
    return await this.request<number>('GET', 'camerastate');
  }

  async getCCDTemperature(): Promise<number> {
    return await this.request<number>('GET', 'ccdtemperature');
  }

  async setCCDTemperature(temperature: number): Promise<void> {
    await this.request<void>('PUT', 'setccdtemperature', { SetCCDTemperature: temperature });
  }

  async getCoolerOn(): Promise<boolean> {
    return await this.request<boolean>('GET', 'cooleron');
  }

  async setCoolerOn(enabled: boolean): Promise<void> {
    await this.request<void>('PUT', 'cooleron', { CoolerOn: enabled });
  }

  async getCoolerPower(): Promise<number> {
    return await this.request<number>('GET', 'coolerpower');
  }

  // Image properties
  async getImageReady(): Promise<boolean> {
    return await this.request<boolean>('GET', 'imageready');
  }

  async getPercentCompleted(): Promise<number> {
    return await this.request<number>('GET', 'percentcompleted');
  }

  // Exposure
  async startExposure(duration: number, light: boolean): Promise<void> {
    await this.request<void>('PUT', 'startexposure', { Duration: duration, Light: light });
  }

  async stopExposure(): Promise<void> {
    await this.request<void>('PUT', 'stopexposure');
  }

  async abortExposure(): Promise<void> {
    await this.request<void>('PUT', 'abortexposure');
  }

  async getLastExposureDuration(): Promise<number> {
    return await this.request<number>('GET', 'lastexposureduration');
  }

  // Gain and offset
  async getGain(): Promise<number> {
    return await this.request<number>('GET', 'gain');
  }

  async setGain(gain: number): Promise<void> {
    await this.request<void>('PUT', 'gain', { Gain: gain });
  }

  async getGainMin(): Promise<number> {
    return await this.request<number>('GET', 'gainmin');
  }

  async getGainMax(): Promise<number> {
    return await this.request<number>('GET', 'gainmax');
  }

  async getOffset(): Promise<number> {
    return await this.request<number>('GET', 'offset');
  }

  async setOffset(offset: number): Promise<void> {
    await this.request<void>('PUT', 'offset', { Offset: offset });
  }

  // Binning
  async getBinX(): Promise<number> {
    return await this.request<number>('GET', 'binx');
  }

  async setBinX(bin: number): Promise<void> {
    await this.request<void>('PUT', 'binx', { BinX: bin });
  }

  async getBinY(): Promise<number> {
    return await this.request<number>('GET', 'biny');
  }

  async setBinY(bin: number): Promise<void> {
    await this.request<void>('PUT', 'biny', { BinY: bin });
  }
}

// ASCOM Focuser Client
export class AscomFocuserClient {
  private baseUrl: string;
  private deviceNumber: number;
  private clientId: number;
  private transactionCounter: number;

  constructor(baseUrl: string = "http://localhost:32323", deviceNumber: number = 0) {
    this.baseUrl = baseUrl;
    this.deviceNumber = deviceNumber;
    this.clientId = Math.floor(Math.random() * 10000);
    this.transactionCounter = 0;
  }

  private async request<T>(method: string, endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/v1/focuser/${this.deviceNumber}/${endpoint}`);

    params.ClientID = params.ClientID || this.clientId;
    params.ClientTransactionID = params.ClientTransactionID || ++this.transactionCounter;

    const options: RequestInit = {
      method: method,
      headers: method !== 'GET' ? {
        'Content-Type': 'application/x-www-form-urlencoded',
      } : {},
    };

    if (method === 'GET') {
      Object.keys(params).forEach(key => url.searchParams.append(key, String(params[key])));
    } else {
      options.body = new URLSearchParams(params).toString();
    }

    try {
      const response = await fetch(url.toString(), options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: AscomResponse<T> = await response.json();

      if (data.ErrorNumber !== 0) {
        throw new Error(data.ErrorMessage || `ASCOM error ${data.ErrorNumber}`);
      }

      return data.Value;
    } catch (error: any) {
      throw new Error(`ASCOM focuser request failed: ${error.message}`);
    }
  }

  // Connection
  async connect(): Promise<void> {
    console.log('[ASCOM Focuser] Connecting...');
    await this.request<void>('PUT', 'connected', { Connected: true });
    console.log('[ASCOM Focuser] Connected successfully');
  }

  async disconnect(): Promise<void> {
    await this.request<void>('PUT', 'connected', { Connected: false });
  }

  async isConnected(): Promise<boolean> {
    try {
      const result = await this.request<boolean>('GET', 'connected');
      console.log(`[ASCOM Focuser] isConnected result:`, result);
      return result;
    } catch (error: any) {
      console.error(`[ASCOM Focuser] isConnected error:`, error.message);
      throw error;
    }
  }

  // Focuser capabilities
  async isAbsolute(): Promise<boolean> {
    return await this.request<boolean>('GET', 'absolute');
  }

  async canHalt(): Promise<boolean> {
    return await this.request<boolean>('GET', 'canhalt');
  }

  async hasTempComp(): Promise<boolean> {
    return await this.request<boolean>('GET', 'tempcomp');
  }

  async setTempComp(enabled: boolean): Promise<void> {
    await this.request<void>('PUT', 'tempcomp', { TempComp: enabled });
  }

  // Position
  async getPosition(): Promise<number> {
    return await this.request<number>('GET', 'position');
  }

  async getMaxStep(): Promise<number> {
    return await this.request<number>('GET', 'maxstep');
  }

  async getMaxIncrement(): Promise<number> {
    return await this.request<number>('GET', 'maxincrement');
  }

  // Movement
  async move(position: number): Promise<void> {
    await this.request<void>('PUT', 'move', { Position: position });
  }

  async halt(): Promise<void> {
    await this.request<void>('PUT', 'halt');
  }

  async isMoving(): Promise<boolean> {
    return await this.request<boolean>('GET', 'ismoving');
  }

  // Temperature
  async getTemperature(): Promise<number> {
    return await this.request<number>('GET', 'temperature');
  }
}

// Device Discovery
export class AscomDiscovery {
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:32323") {
    this.baseUrl = baseUrl;
  }

  async discoverDevices(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/management/v1/configureddevices`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();

      // ASCOM wraps the response in a Value property
      if (data.ErrorNumber !== 0) {
        throw new Error(data.ErrorMessage || 'Unknown ASCOM error');
      }

      return data.Value || data;
    } catch (error: any) {
      throw new Error(`Device discovery failed: ${error.message}`);
    }
  }

  async getServerInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/management/apiversions`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();

      // ASCOM wraps the response in a Value property
      if (data.ErrorNumber !== 0) {
        throw new Error(data.ErrorMessage || 'Unknown ASCOM error');
      }

      // Return server info with API versions
      return {
        APIVersions: data.Value || [],
        ServerTransactionID: data.ServerTransactionID
      };
    } catch (error: any) {
      throw new Error(`Failed to get server info: ${error.message}`);
    }
  }
}

// Singleton instances
export const ascomTelescope = new AscomTelescopeClient();
export const ascomCamera = new AscomCameraClient();
export const ascomFocuser = new AscomFocuserClient();
export const ascomDiscovery = new AscomDiscovery();

// Legacy export for backward compatibility
export const ascomClient = ascomTelescope;
