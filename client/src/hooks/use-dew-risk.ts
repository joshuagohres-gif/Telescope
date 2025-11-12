import { useQuery } from "@tanstack/react-query";

export interface DewRiskData {
  siteId: string;
  ts: string;
  tempC: number;
  dewpointC: number;
  marginC: number;
  risk: "low" | "med" | "high";
}

export interface DewProfile {
  id: number;
  deviceKey: string;
  sensorLoc: "ota" | "ambient" | "camera";
  tempC: number;
  rhPct: number;
  setpointPwm: number;
  createdAt: string;
}

export interface DewControlHint {
  id: number;
  trainId: string;
  ruleMd: string;
  updatedAt: string;
}

/**
 * Calculate dew risk for a specific site and time
 */
export function useDewRisk(siteId: string | undefined, ts: Date) {
  return useQuery<DewRiskData>({
    queryKey: ["/api/ops/dew/risk", siteId, ts.toISOString()],
    queryFn: async () => {
      if (!siteId) throw new Error("Site ID required");

      const params = new URLSearchParams({
        site_id: siteId,
        ts: ts.toISOString(),
      });

      const res = await fetch(`/astrodb/v1/ops/dew/risk?${params}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Ops Pack not enabled. Set ASTRO_OPS_ENABLED=true");
        }
        throw new Error("Failed to fetch dew risk");
      }

      const json = await res.json();
      return json.data;
    },
    enabled: !!siteId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get dew profiles for learning heater settings
 */
export function useDewProfiles(deviceKey?: string) {
  return useQuery<DewProfile[]>({
    queryKey: ["/api/ops/dew/profiles", deviceKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (deviceKey) params.set("device_key", deviceKey);

      const res = await fetch(`/astrodb/v1/ops/dew/profiles?${params}`);
      if (!res.ok) throw new Error("Failed to fetch dew profiles");

      const json = await res.json();
      return json.data || [];
    },
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Get ML-derived dew control hints
 */
export function useDewControlHints(trainId?: string) {
  return useQuery<DewControlHint[]>({
    queryKey: ["/api/ops/dew/hints", trainId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (trainId) params.set("train_id", trainId);

      const res = await fetch(`/astrodb/v1/ops/dew/hints?${params}`);
      if (!res.ok) throw new Error("Failed to fetch dew control hints");

      const json = await res.json();
      return json.data || [];
    },
    staleTime: 600000, // 10 minutes
  });
}

/**
 * Calculate recommended heater PWM based on conditions
 * Uses empirical formula: PWM = f(ΔT, RH, Wind)
 */
export function calculateHeaterPWM(
  tempC: number,
  dewpointC: number,
  rhPct: number,
  windMps: number
): { pwm: number; reason: string } {
  const deltaT = tempC - dewpointC;

  // Critical dew risk - maximum heating
  if (deltaT < 1) {
    return {
      pwm: 100,
      reason: "Critical dew risk - full power recommended",
    };
  }

  // High dew risk
  if (deltaT < 2) {
    const basePwm = 80;
    const windAdjust = Math.min(windMps * 2, 15); // Wind helps evaporation
    return {
      pwm: Math.max(50, basePwm - windAdjust),
      reason: "High dew risk - strong heating needed",
    };
  }

  // Moderate dew risk
  if (deltaT < 4) {
    const basePwm = 50;
    const windAdjust = Math.min(windMps * 3, 20);
    const rhAdjust = (rhPct - 70) / 2; // Higher RH = more power
    return {
      pwm: Math.max(25, Math.min(75, basePwm - windAdjust + rhAdjust)),
      reason: "Moderate dew risk - preventive heating",
    };
  }

  // Low dew risk
  if (deltaT < 6) {
    return {
      pwm: 20,
      reason: "Low dew risk - minimal heating for prevention",
    };
  }

  // Minimal risk
  return {
    pwm: 0,
    reason: "Minimal dew risk - heating not required",
  };
}

/**
 * Get dew risk level and color from margin
 */
export function getDewRiskInfo(marginC: number): {
  level: string;
  color: string;
  description: string;
} {
  if (marginC < 1) {
    return {
      level: "CRITICAL",
      color: "destructive",
      description: "Dew/frost forming now",
    };
  } else if (marginC < 2) {
    return {
      level: "HIGH",
      color: "destructive",
      description: "Dew imminent within minutes",
    };
  } else if (marginC < 4) {
    return {
      level: "MODERATE",
      color: "warning",
      description: "Dew likely within 30-60 minutes",
    };
  } else if (marginC < 6) {
    return {
      level: "LOW",
      color: "secondary",
      description: "Watch conditions carefully",
    };
  } else {
    return {
      level: "MINIMAL",
      color: "default",
      description: "Safe for now",
    };
  }
}
