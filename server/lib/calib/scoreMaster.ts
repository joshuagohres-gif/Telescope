/**
 * Master Frame Scoring Utility
 * 
 * Scores master frames based on distance from requested parameters.
 * Distance = wT*|Δtemp| + wE*|Δexp| + wG*gain_mismatch
 */

export interface MasterFrameParams {
  sensor_temp_c?: number;
  gain?: string;
  exposure_s?: number;
}

export interface ScoreBreakdown {
  tempScore: number;
  expScore: number;
  gainScore: number;
  totalScore: number;
}

/**
 * Calculate distance score for a master frame
 * 
 * @param frame - Master frame to score
 * @param params - Requested parameters
 * @param weights - Weight factors (default: wT=1.0, wE=1.0, wG=10.0)
 * @returns Score breakdown and total distance
 */
export function scoreMasterFrame(
  frame: {
    sensorTempC?: number | null;
    tempC?: number | null;
    gain?: string | null;
    exposureS?: number | null;
    exposureSec?: number | null;
  },
  params: MasterFrameParams,
  weights: { wT?: number; wE?: number; wG?: number } = {}
): ScoreBreakdown {
  const wT = weights.wT ?? 1.0; // Temperature weight
  const wE = weights.wE ?? 1.0; // Exposure weight
  const wG = weights.wG ?? 10.0; // Gain mismatch weight (higher = more important)

  // Temperature difference
  const frameTemp = frame.sensorTempC ?? frame.tempC ?? null;
  const reqTemp = params.sensor_temp_c;
  let tempScore = 0;
  if (frameTemp !== null && reqTemp !== undefined) {
    tempScore = wT * Math.abs(frameTemp - reqTemp);
  } else if (frameTemp === null && reqTemp !== undefined) {
    // Penalty for missing temperature
    tempScore = wT * 10.0;
  }

  // Exposure difference
  const frameExp = frame.exposureS ?? frame.exposureSec ?? null;
  const reqExp = params.exposure_s;
  let expScore = 0;
  if (frameExp !== null && reqExp !== undefined) {
    expScore = wE * Math.abs(frameExp - reqExp);
  } else if (frameExp === null && reqExp !== undefined) {
    // Penalty for missing exposure
    expScore = wE * 10.0;
  }

  // Gain mismatch (exact match = 0, mismatch = penalty)
  const frameGain = frame.gain ?? null;
  const reqGain = params.gain;
  let gainScore = 0;
  if (frameGain !== null && reqGain !== undefined) {
    if (frameGain !== reqGain) {
      gainScore = wG; // Full penalty for mismatch
    }
  } else if (frameGain === null && reqGain !== undefined) {
    // Penalty for missing gain
    gainScore = wG;
  }

  const totalScore = tempScore + expScore + gainScore;

  return {
    tempScore,
    expScore,
    gainScore,
    totalScore,
  };
}

/**
 * Find best matching master frame from a list
 * 
 * @param frames - Array of master frames to search
 * @param params - Requested parameters
 * @param weights - Weight factors
 * @returns Best matching frame with score breakdown, or null if no frames
 */
export function findBestMasterFrame(
  frames: Array<{
    id: string;
    sensorTempC?: number | null;
    tempC?: number | null;
    gain?: string | null;
    exposureS?: number | null;
    exposureSec?: number | null;
    [key: string]: any;
  }>,
  params: MasterFrameParams,
  weights?: { wT?: number; wE?: number; wG?: number }
): { frame: any; score_breakdown: ScoreBreakdown } | null {
  if (frames.length === 0) {
    return null;
  }

  let bestFrame = frames[0];
  let bestScore = scoreMasterFrame(frames[0], params, weights);

  for (let i = 1; i < frames.length; i++) {
    const score = scoreMasterFrame(frames[i], params, weights);
    if (score.totalScore < bestScore.totalScore) {
      bestFrame = frames[i];
      bestScore = score;
    }
  }

  return {
    frame: bestFrame,
    score_breakdown: bestScore,
  };
}
