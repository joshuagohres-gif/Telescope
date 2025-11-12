/**
 * Night Quality Scoring Algorithm
 *
 * Analyzes multiple factors to score observing conditions on a 0-100 scale
 * Higher scores = better observing conditions
 */

export interface ObservingConditions {
  // Weather
  cloudPct: number;
  transparencyIdx?: number;
  seeingArcsec?: number;
  windMps: number;

  // Dew risk
  dewMarginC: number;

  // Moon
  moonIllum: number;
  moonAltDeg: number;

  // Target
  targetAltDeg?: number;

  // Time
  ts: string;
}

export interface NightScore {
  totalScore: number; // 0-100
  breakdown: {
    weather: number;
    transparency: number;
    seeing: number;
    dewRisk: number;
    moonConditions: number;
    targetVisibility: number;
  };
  grade: "Excellent" | "Good" | "Fair" | "Poor" | "Unusable";
  recommendation: string;
  warnings: string[];
}

/**
 * Calculate observing quality score for a specific time
 */
export function scoreNightQuality(
  conditions: ObservingConditions,
  targetType: "deep_sky" | "planetary" | "lunar" | "solar" = "deep_sky"
): NightScore {
  const warnings: string[] = [];

  // === WEATHER SCORE (0-25 points) ===
  let weatherScore = 25;

  // Cloud coverage (critical)
  if (conditions.cloudPct > 80) {
    weatherScore = 0;
    warnings.push("Heavy cloud cover - observing not possible");
  } else if (conditions.cloudPct > 50) {
    weatherScore = Math.max(0, 25 - (conditions.cloudPct - 50) * 0.5);
    warnings.push("Significant clouds - limited observing");
  } else if (conditions.cloudPct > 20) {
    weatherScore = 25 - (conditions.cloudPct * 0.25);
  }

  // Wind penalty (high wind affects tracking)
  if (conditions.windMps > 15) {
    weatherScore *= 0.5;
    warnings.push("High winds - tracking difficulty");
  } else if (conditions.windMps > 10) {
    weatherScore *= 0.8;
  }

  // === TRANSPARENCY SCORE (0-20 points) ===
  let transparencyScore = 10; // Default neutral if no data

  if (conditions.transparencyIdx !== undefined) {
    // Transparency index typically 0-10, higher is better
    transparencyScore = Math.min(20, conditions.transparencyIdx * 2);
  }

  // === SEEING SCORE (0-20 points) ===
  let seeingScore = 15; // Default neutral if no data

  if (conditions.seeingArcsec !== undefined) {
    if (targetType === "planetary" || targetType === "lunar") {
      // Planetary/lunar observing is very sensitive to seeing
      if (conditions.seeingArcsec < 1) {
        seeingScore = 20; // Excellent seeing
      } else if (conditions.seeingArcsec < 2) {
        seeingScore = 15; // Good seeing
      } else if (conditions.seeingArcsec < 3) {
        seeingScore = 10; // Fair seeing
      } else if (conditions.seeingArcsec < 4) {
        seeingScore = 5; // Poor seeing
        warnings.push("Poor seeing - planetary details obscured");
      } else {
        seeingScore = 0; // Unusable for planets
        warnings.push("Very poor seeing - planetary observation not recommended");
      }
    } else {
      // Deep sky is less sensitive to seeing
      if (conditions.seeingArcsec < 2) {
        seeingScore = 20;
      } else if (conditions.seeingArcsec < 4) {
        seeingScore = 15;
      } else {
        seeingScore = 10;
      }
    }
  }

  // === DEW RISK SCORE (0-10 points) ===
  let dewRiskScore = 10;

  if (conditions.dewMarginC < 1) {
    dewRiskScore = 0;
    warnings.push("Critical dew risk - heaters essential");
  } else if (conditions.dewMarginC < 2) {
    dewRiskScore = 3;
    warnings.push("High dew risk - use heaters");
  } else if (conditions.dewMarginC < 4) {
    dewRiskScore = 6;
  } else if (conditions.dewMarginC < 6) {
    dewRiskScore = 8;
  }

  // === MOON CONDITIONS SCORE (0-15 points) ===
  let moonScore = 15;

  if (targetType === "deep_sky") {
    // Deep sky imaging suffers from moon interference
    const moonInterference = conditions.moonIllum * Math.max(0, conditions.moonAltDeg / 90);

    if (moonInterference > 0.6) {
      moonScore = 0;
      warnings.push("Bright moon high in sky - deep sky compromised");
    } else if (moonInterference > 0.4) {
      moonScore = 5;
      warnings.push("Moon interference - use narrowband filters");
    } else if (moonInterference > 0.2) {
      moonScore = 10;
    }
  } else if (targetType === "lunar") {
    // Lunar observing wants the moon!
    moonScore = conditions.moonIllum * 15;
    if (conditions.moonAltDeg < 20) {
      moonScore *= 0.5;
      warnings.push("Moon too low for optimal viewing");
    }
  } else {
    // Planetary/solar doesn't care much about moon
    moonScore = 12;
  }

  // === TARGET VISIBILITY SCORE (0-10 points) ===
  let targetScore = 10;

  if (conditions.targetAltDeg !== undefined) {
    if (conditions.targetAltDeg < 15) {
      targetScore = 0;
      warnings.push("Target too low - atmospheric extinction");
    } else if (conditions.targetAltDeg < 30) {
      targetScore = 5;
      warnings.push("Target at low altitude");
    } else if (conditions.targetAltDeg > 80) {
      targetScore = 8; // Near zenith can be hard to track
    } else if (conditions.targetAltDeg > 50) {
      targetScore = 10; // Optimal altitude
    } else {
      targetScore = 7;
    }
  }

  // === TOTAL SCORE ===
  const totalScore = Math.round(
    weatherScore + transparencyScore + seeingScore +
    dewRiskScore + moonScore + targetScore
  );

  // === GRADE ===
  let grade: NightScore["grade"];
  let recommendation: string;

  if (totalScore >= 85) {
    grade = "Excellent";
    recommendation = "Prime observing conditions - don't miss this night!";
  } else if (totalScore >= 70) {
    grade = "Good";
    recommendation = "Favorable conditions for observing";
  } else if (totalScore >= 50) {
    grade = "Fair";
    recommendation = "Acceptable conditions with some limitations";
  } else if (totalScore >= 30) {
    grade = "Poor";
    recommendation = "Challenging conditions - consider postponing";
  } else {
    grade = "Unusable";
    recommendation = "Not suitable for observing";
  }

  return {
    totalScore,
    breakdown: {
      weather: Math.round(weatherScore),
      transparency: Math.round(transparencyScore),
      seeing: Math.round(seeingScore),
      dewRisk: Math.round(dewRiskScore),
      moonConditions: Math.round(moonScore),
      targetVisibility: Math.round(targetScore),
    },
    grade,
    recommendation,
    warnings,
  };
}

/**
 * Find best observing window in a time range
 */
export function findBestWindow(
  conditions: ObservingConditions[],
  targetType: "deep_sky" | "planetary" | "lunar" | "solar" = "deep_sky",
  minDurationHours: number = 2
): {
  bestWindow: { start: string; end: string; avgScore: number } | null;
  hourlyScores: Array<{ ts: string; score: NightScore }>;
} {
  // Score each hour
  const hourlyScores = conditions.map(cond => ({
    ts: cond.ts,
    score: scoreNightQuality(cond, targetType),
  }));

  // Find continuous windows above threshold (score > 60)
  const minScore = 60;
  let bestWindow: { start: string; end: string; avgScore: number } | null = null;
  let bestAvgScore = 0;

  let windowStart: number | null = null;

  for (let i = 0; i < hourlyScores.length; i++) {
    const isGood = hourlyScores[i].score.totalScore >= minScore;

    if (isGood && windowStart === null) {
      windowStart = i;
    } else if (!isGood && windowStart !== null) {
      // Window ended
      const windowDuration = i - windowStart;
      if (windowDuration >= minDurationHours) {
        // Calculate average score for this window
        const windowScores = hourlyScores.slice(windowStart, i);
        const avgScore = windowScores.reduce((sum, h) => sum + h.score.totalScore, 0) / windowScores.length;

        if (avgScore > bestAvgScore) {
          bestAvgScore = avgScore;
          bestWindow = {
            start: hourlyScores[windowStart].ts,
            end: hourlyScores[i - 1].ts,
            avgScore: Math.round(avgScore),
          };
        }
      }
      windowStart = null;
    }
  }

  // Check if there's a window extending to the end
  if (windowStart !== null) {
    const windowDuration = hourlyScores.length - windowStart;
    if (windowDuration >= minDurationHours) {
      const windowScores = hourlyScores.slice(windowStart);
      const avgScore = windowScores.reduce((sum, h) => sum + h.score.totalScore, 0) / windowScores.length;

      if (avgScore > bestAvgScore) {
        bestWindow = {
          start: hourlyScores[windowStart].ts,
          end: hourlyScores[hourlyScores.length - 1].ts,
          avgScore: Math.round(avgScore),
        };
      }
    }
  }

  return { bestWindow, hourlyScores };
}

/**
 * Compare multiple nights and rank them
 */
export function rankNights(
  nightlyConditions: Array<{ date: string; conditions: ObservingConditions[] }>,
  targetType: "deep_sky" | "planetary" | "lunar" | "solar" = "deep_sky"
): Array<{
  date: string;
  score: number;
  grade: string;
  bestWindow: { start: string; end: string; avgScore: number } | null;
}> {
  const rankings = nightlyConditions.map(night => {
    const { bestWindow, hourlyScores } = findBestWindow(night.conditions, targetType, 2);

    // Use best window score if available, otherwise average the night
    const score = bestWindow
      ? bestWindow.avgScore
      : Math.round(hourlyScores.reduce((sum, h) => sum + h.score.totalScore, 0) / hourlyScores.length);

    let grade: string;
    if (score >= 85) grade = "Excellent";
    else if (score >= 70) grade = "Good";
    else if (score >= 50) grade = "Fair";
    else if (score >= 30) grade = "Poor";
    else grade = "Unusable";

    return {
      date: night.date,
      score,
      grade,
      bestWindow,
    };
  });

  // Sort by score descending
  return rankings.sort((a, b) => b.score - a.score);
}
