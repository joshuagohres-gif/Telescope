// In-memory storage for sky map photos (mock data for MVP)
// TODO: Replace with actual database when DB schema is implemented

export interface SkyMapPhoto {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  displayLatitude: number;
  displayLongitude: number;
  locationPrecision: 'exact' | 'city' | 'region' | 'country';
  captureDate: string;
  uploadDate: string;
  tags: string[];
  equipment?: {
    camera?: string;
    telescope?: string;
    mount?: string;
  };
}

// Mock data for demonstration
const mockPhotos: SkyMapPhoto[] = [
  {
    id: '1',
    title: 'Andromeda Galaxy (M31)',
    description: 'Wide field shot of M31 from my backyard observatory',
    imageUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a',
    displayLatitude: 34.05,
    displayLongitude: -118.25,
    locationPrecision: 'city',
    captureDate: '2024-11-01T03:30:00Z',
    uploadDate: '2024-11-02T10:00:00Z',
    tags: ['galaxy', 'deep-sky', 'andromeda'],
    equipment: {
      camera: 'ZWO ASI294MC Pro',
      telescope: 'William Optics RedCat 51',
      mount: 'Sky-Watcher EQ6-R Pro'
    }
  },
  {
    id: '2',
    title: 'Orion Nebula (M42)',
    description: 'First light with my new setup!',
    imageUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564',
    displayLatitude: 40.71,
    displayLongitude: -74.01,
    locationPrecision: 'city',
    captureDate: '2024-10-15T22:00:00Z',
    uploadDate: '2024-10-16T14:30:00Z',
    tags: ['nebula', 'orion', 'emission'],
    equipment: {
      camera: 'Canon Ra',
      telescope: 'Celestron EdgeHD 8"'
    }
  },
  {
    id: '3',
    title: 'Milky Way Core',
    description: 'Summer Milky Way from dark skies',
    imageUrl: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3',
    displayLatitude: 36.11,
    displayLongitude: -115.17,
    locationPrecision: 'region',
    captureDate: '2024-08-20T04:00:00Z',
    uploadDate: '2024-08-21T09:00:00Z',
    tags: ['milky-way', 'wide-field', 'landscape'],
    equipment: {
      camera: 'Sony A7S III'
    }
  },
  {
    id: '4',
    title: 'The Pleiades (M45)',
    description: 'Seven Sisters star cluster',
    imageUrl: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e',
    displayLatitude: 51.51,
    displayLongitude: -0.13,
    locationPrecision: 'city',
    captureDate: '2024-11-05T20:30:00Z',
    uploadDate: '2024-11-06T11:00:00Z',
    tags: ['star-cluster', 'pleiades', 'open-cluster'],
    equipment: {
      telescope: 'Takahashi FSQ-106',
      camera: 'QHY600M'
    }
  },
  {
    id: '5',
    title: 'Horsehead Nebula',
    description: 'IC 434 and the Horsehead',
    imageUrl: 'https://images.unsplash.com/photo-1446776709462-d6b525c57bd3',
    displayLatitude: 37.77,
    displayLongitude: -122.42,
    locationPrecision: 'city',
    captureDate: '2024-09-10T02:15:00Z',
    uploadDate: '2024-09-11T16:00:00Z',
    tags: ['nebula', 'dark-nebula', 'horsehead'],
    equipment: {
      telescope: 'Astro-Physics 130GT',
      camera: 'SBIG STX-16803'
    }
  }
];

export const skymapStorage = {
  // Get photos with time filtering
  async getPhotos(timeRange?: 'tonight' | 'week' | 'month' | 'year' | 'all'): Promise<SkyMapPhoto[]> {
    let photos = [...mockPhotos];

    if (timeRange && timeRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (timeRange) {
        case 'tonight':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      photos = photos.filter(p => new Date(p.captureDate) >= filterDate);
    }

    return photos;
  },

  // Get a single photo by ID
  async getPhotoById(id: string): Promise<SkyMapPhoto | null> {
    return mockPhotos.find(p => p.id === id) || null;
  }
};
