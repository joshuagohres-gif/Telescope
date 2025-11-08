/**
 * StarBackdropView - React component wrapper for the WebGL star backdrop
 * Integrates with telescope position data to show realistic star field
 */

import { useEffect, useRef, useState } from "react";
import { StarBackdrop } from "@/simulatedSkyBackdrop";
import { locationService } from "@/utils/locationService";
import type { LocationData } from "@/utils/locationService";
import { equatorialToHorizontal } from "@/simulatedSkyBackdrop/math/altaz";

interface StarBackdropViewProps {
  /**
   * Current telescope RA (hours, 0-24)
   */
  ra?: number;

  /**
   * Current telescope Dec (degrees, -90 to +90)
   */
  dec?: number;

  /**
   * Current telescope altitude (degrees, 0-90)
   */
  alt?: number;

  /**
   * Current telescope azimuth (degrees, 0-360)
   */
  az?: number;

  /**
   * Whether to show the view (lazy load)
   */
  enabled?: boolean;
}

export function StarBackdropView({ ra, dec, alt, az, enabled = true }: StarBackdropViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<StarBackdrop | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get user location on mount
  useEffect(() => {
    if (!enabled) return;

    locationService.getLocation()
      .then((loc) => {
        setLocation(loc);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to get location:', err);
        setError('Location unavailable');

        // Fallback to default location (San Francisco)
        setLocation({
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 0,
          timestamp: Date.now(),
          timezone: 'America/Los_Angeles',
          localTime: new Date(),
          source: 'manual'
        });
      });
  }, [enabled]);

  // Initialize StarBackdrop when location is available
  useEffect(() => {
    if (!enabled || !location || !containerRef.current || backdropRef.current) {
      return;
    }

    try {
      const backdrop = new StarBackdrop({
        container: containerRef.current,
        latitude: location.latitude,
        longitude: location.longitude,
        time: new Date(),
        autoUpdateTime: true, // Update star positions in real-time
        initialYaw: 0,
        initialPitch: Math.PI / 4, // 45° up by default
      });

      backdropRef.current = backdrop;
    } catch (err) {
      console.error('Failed to initialize StarBackdrop:', err);
      setError('WebGL initialization failed');
    }

    // Cleanup on unmount
    return () => {
      if (backdropRef.current) {
        backdropRef.current.dispose();
        backdropRef.current = null;
      }
    };
  }, [enabled, location]);

  // Sync telescope position with backdrop view
  useEffect(() => {
    console.log(`[StarBackdropView] Position update: alt=${alt}, az=${az}, ra=${ra}, dec=${dec}, enabled=${enabled}`);

    if (!backdropRef.current || !enabled || !location) {
      console.log(`[StarBackdropView] Skipping update: backdropRef=${!!backdropRef.current}, enabled=${enabled}, location=${!!location}`);
      return;
    }

    let finalAlt = alt;
    let finalAz = az;

    // Always calculate Alt/Az from RA/Dec if we have them, as this is more accurate
    // The ASCOM simulator's alt/az values are often static/incorrect
    if (ra !== undefined && dec !== undefined) {
      try {
        // Convert RA from hours to radians, Dec from degrees to radians
        const raRad = ra * (Math.PI / 12); // hours to radians
        const decRad = dec * (Math.PI / 180); // degrees to radians

        const { altitude, azimuth } = equatorialToHorizontal(
          raRad,
          decRad,
          new Date(),
          location.latitude,
          location.longitude,
          true // apply refraction
        );

        // Convert back to degrees
        finalAlt = altitude * (180 / Math.PI);
        finalAz = azimuth * (180 / Math.PI);

        console.log(`[StarBackdropView] Calculated Alt/Az: alt=${finalAlt.toFixed(2)}°, az=${finalAz.toFixed(2)}° from RA=${ra.toFixed(2)}h, Dec=${dec.toFixed(2)}°`);
      } catch (error) {
        console.error(`[StarBackdropView] Error calculating Alt/Az:`, error);
        // Fall back to provided alt/az if calculation fails
        if (alt === undefined || az === undefined) {
          return;
        }
      }
    }

    // Use the final Alt/Az values (calculated or provided)
    if (finalAlt !== undefined && finalAz !== undefined) {
      console.log(`[StarBackdropView] Calling pointAtAltAz with alt=${finalAlt}, az=${finalAz}`);
      backdropRef.current.pointAtAltAz(finalAlt, finalAz);
    }
  }, [ra, dec, alt, az, location, enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="relative w-full h-full">
      {/* WebGL canvas container */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ minHeight: '100%' }}
      />

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-muted-foreground text-sm">
          {error}
        </div>
      )}

      {/* Loading overlay */}
      {!location && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-muted-foreground text-sm">
          Loading sky...
        </div>
      )}
    </div>
  );
}
