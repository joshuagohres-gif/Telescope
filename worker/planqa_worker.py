#!/usr/bin/env python3
"""
Planning, QA & Personalization Worker
Processes session telemetry, builds SNR models
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import os
import math

from pydantic import BaseModel, Field
import numpy as np
from scipy.optimize import curve_fit

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Config
STAGING_DIR = Path(os.getenv("STAGING_DIR", "./staging"))
STAGING_DIR.mkdir(parents=True, exist_ok=True)

# ===== MODELS =====

class SessionTelemetry(BaseModel):
    """Session telemetry data point"""
    session_id: str
    metric_name: str
    value: float
    unit: Optional[str] = None
    ts: datetime

class SnrMeasurement(BaseModel):
    """SNR measurement for model building"""
    train_id: str
    filter_name: str
    target_type: str
    exposure_sec: float
    sky_mpsas: float
    measured_snr: float

class Recipe(BaseModel):
    """Exposure recipe"""
    name: str
    target_type: str
    filter_name: str
    exposure_sec: float
    frame_count: int
    total_exp_min: float
    binning: str = "1x1"
    gain: Optional[int] = None
    offset: Optional[int] = None
    temp_c: Optional[float] = None
    dither_px: Optional[int] = None
    notes: Optional[str] = None
    created_by: Optional[str] = None

# ===== SESSION QA ANALYZER =====

class SessionQaAnalyzer:
    """Analyze session telemetry for quality metrics"""
    
    def analyze_session(self, telemetry: List[SessionTelemetry]) -> Dict:
        """Compute QA summary for a session"""
        if not telemetry:
            return {}
        
        # Group by metric
        metrics = {}
        for t in telemetry:
            if t.metric_name not in metrics:
                metrics[t.metric_name] = []
            metrics[t.metric_name].append(t.value)
        
        # Compute statistics
        summary = {}
        for metric_name, values in metrics.items():
            arr = np.array(values)
            summary[metric_name] = {
                "mean": float(np.mean(arr)),
                "median": float(np.median(arr)),
                "std": float(np.std(arr)),
                "min": float(np.min(arr)),
                "max": float(np.max(arr)),
                "p90": float(np.percentile(arr, 90)),
            }
        
        # Quality flags
        flags = []
        
        # Check HFR (seeing)
        if "hfr" in summary:
            if summary["hfr"]["mean"] > 3.5:
                flags.append("poor_seeing")
            elif summary["hfr"]["mean"] < 2.0:
                flags.append("excellent_seeing")
        
        # Check guiding
        if "guide_rms" in summary:
            if summary["guide_rms"]["mean"] > 1.0:
                flags.append("poor_guiding")
            elif summary["guide_rms"]["mean"] < 0.5:
                flags.append("excellent_guiding")
        
        # Check sky background stability
        if "sky_adu" in summary:
            cv = summary["sky_adu"]["std"] / summary["sky_adu"]["mean"]
            if cv > 0.3:
                flags.append("variable_sky")
        
        summary["qa_flags"] = flags
        
        return summary

# ===== SNR MODEL BUILDER =====

class SnrModelBuilder:
    """Build SNR models from measurements"""
    
    @staticmethod
    def snr_function(t, a, b, c):
        """SNR = a * sqrt(t) + c, with sky adjustment factor b"""
        # Simplified: actual model would include sky brightness
        return a * np.sqrt(t) + c
    
    def build_model(self, measurements: List[SnrMeasurement]) -> Optional[Dict]:
        """Build SNR model from measurements"""
        if len(measurements) < 5:
            logger.warning("Not enough measurements for SNR model")
            return None
        
        # Extract data
        exposures = np.array([m.exposure_sec for m in measurements])
        snrs = np.array([m.measured_snr for m in measurements])
        
        try:
            # Fit model
            popt, _ = curve_fit(self.snr_function, exposures, snrs,
                                p0=[10.0, 0.05, -1.0])
            
            # Calculate R²
            predicted = self.snr_function(exposures, *popt)
            residuals = snrs - predicted
            ss_res = np.sum(residuals ** 2)
            ss_tot = np.sum((snrs - np.mean(snrs)) ** 2)
            r2 = 1 - (ss_res / ss_tot)
            
            return {
                "train_id": measurements[0].train_id,
                "filter_name": measurements[0].filter_name,
                "target_type": measurements[0].target_type,
                "sky_mpsas": measurements[0].sky_mpsas,
                "coeffs_json": {"a": popt[0], "b": 0.07, "c": popt[1]},
                "valid_range": {
                    "min_exp": float(np.min(exposures)),
                    "max_exp": float(np.max(exposures)),
                },
                "r2": r2,
                "sample_count": len(measurements),
            }
        except Exception as e:
            logger.error(f"SNR model fit failed: {e}")
            return None

# ===== RECIPE OPTIMIZER =====

class RecipeOptimizer:
    """Optimize exposure recipes for SNR targets"""
    
    def optimize_for_snr_target(
        self,
        target_snr: float,
        train_id: str,
        filter_name: str,
        sky_mpsas: float,
        snr_model: Dict,
        max_exp_sec: float = 600.0,
    ) -> Optional[Recipe]:
        """
        Find optimal exposure time and frame count for target SNR
        
        SNR scales with sqrt(total_exposure), but limited by sky noise
        """
        logger.info(f"Optimizing recipe for SNR {target_snr}")
        
        # Extract model coefficients
        a = snr_model["coeffs_json"]["a"]
        b = snr_model["coeffs_json"]["b"]
        c = snr_model["coeffs_json"]["c"]
        mpsas_ref = 21.0
        
        # Sky adjustment
        sky_factor = 1 - b * (mpsas_ref - sky_mpsas)
        
        # Solve for single-frame exposure to achieve target SNR
        # target_snr = a * sky_factor * sqrt(t) + c
        t_single = ((target_snr - c) / (a * sky_factor)) ** 2
        
        # Constrain exposure time
        if t_single > max_exp_sec:
            t_single = max_exp_sec
            # Will need more frames
        elif t_single < 60:
            t_single = 60  # Minimum practical exposure
        
        # Calculate how many frames needed
        snr_per_frame = a * sky_factor * math.sqrt(t_single) + c
        frames_needed = max(1, int((target_snr / snr_per_frame) ** 2))
        
        total_exp_min = (t_single * frames_needed) / 60.0
        
        return Recipe(
            name=f"Optimized {filter_name} for SNR {target_snr:.0f}",
            target_type="dso",
            filter_name=filter_name,
            exposure_sec=t_single,
            frame_count=frames_needed,
            total_exp_min=total_exp_min,
            notes=f"Optimized for SNR {target_snr:.1f} at SQM {sky_mpsas:.1f}",
            created_by="auto_optimizer",
        )

# ===== MAIN ORCHESTRATION =====

async def process_session_telemetry(telemetry_file: Path):
    """Process session telemetry and compute QA summary"""
    logger.info(f"Processing session telemetry: {telemetry_file}")
    
    telemetry = []
    with open(telemetry_file, 'r') as f:
        for line in f:
            telemetry.append(SessionTelemetry.model_validate_json(line))
    
    if not telemetry:
        logger.warning("No telemetry found")
        return
    
    analyzer = SessionQaAnalyzer()
    summary = analyzer.analyze_session(telemetry)
    
    # Write summary to staging
    session_id = telemetry[0].session_id
    staging_file = STAGING_DIR / f"session_qa_{session_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    with open(staging_file, 'w') as f:
        json.dump(summary, f, indent=2)
    
    logger.info(f"Wrote QA summary to {staging_file}")

async def build_snr_models():
    """Build SNR models from accumulated measurements"""
    logger.info("Building SNR models")
    
    # STUB: In production, would fetch measurements from DB
    # For now, generate synthetic measurements
    measurements = []
    for exp in [60, 120, 180, 300, 600]:
        snr = 12.5 * math.sqrt(exp) - 2.0 + (exp % 100) * 0.01
        measurements.append(SnrMeasurement(
            train_id="train_001",
            filter_name="L",
            target_type="dso",
            exposure_sec=exp,
            sky_mpsas=21.0,
            measured_snr=snr,
        ))
    
    builder = SnrModelBuilder()
    model = builder.build_model(measurements)
    
    if model:
        staging_file = STAGING_DIR / f"snr_model_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        with open(staging_file, 'w') as f:
            json.dump(model, f, indent=2)
        logger.info(f"Wrote SNR model to {staging_file}")

async def run_planqa_worker():
    """Main worker loop"""
    logger.info("Starting PlanQA worker")
    
    while True:
        try:
            # Process any pending telemetry files
            for telem_file in STAGING_DIR.glob("telemetry_*.ndjson"):
                await process_session_telemetry(telem_file)
                # Archive processed file
                telem_file.rename(telem_file.with_suffix('.processed'))
            
            # Build SNR models (weekly)
            # await build_snr_models()
            
            logger.info("PlanQA worker cycle complete, sleeping 600s")
            await asyncio.sleep(600)  # 10 minutes
            
        except Exception as e:
            logger.error(f"Error in planqa worker: {e}", exc_info=True)
            await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(run_planqa_worker())
