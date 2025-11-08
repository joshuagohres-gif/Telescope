#!/usr/bin/env python3
"""
Calibration Worker
Processes master frames, focus curves, pointing models
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import os
import math

import httpx
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

class FocusSample(BaseModel):
    """Raw focus measurement"""
    train_id: str
    session_id: Optional[str] = None
    ts: datetime
    focuser_pos: int
    temp_c: Optional[float] = None
    filter_name: str
    hfr: float
    fwhm: Optional[float] = None
    star_count: int

class FocusProfile(BaseModel):
    """Fitted focus curve"""
    train_id: str
    filter_name: str
    temp_c: Optional[float] = None
    optimal_pos: int
    critical_zone: int
    fit_type: str
    coeffs_json: List[float]
    r2: float
    sample_count: int

class MasterFrameMetadata(BaseModel):
    """Master calibration frame metadata"""
    train_id: str
    frame_type: str  # bias, dark, flat, darkflat
    filter_name: Optional[str] = None
    binning: str = "1x1"
    temp_c: Optional[float] = None
    exposure_sec: Optional[float] = None
    gain: Optional[int] = None
    offset: Optional[int] = None
    frame_count: int
    captured_at: datetime
    s3_key: str
    stats_json: Optional[Dict] = None

class PointingModel(BaseModel):
    """Pointing model terms"""
    train_id: str
    terms_json: Dict[str, float]
    rms_arcsec: float
    point_count: int

# ===== FOCUS CURVE FITTING =====

class FocusCurveFitter:
    """Fit V-curves or hyperbolic curves to focus data"""
    
    @staticmethod
    def hyperbolic(x, a, b, c):
        """Hyperbolic fit: HFR = a + b * |x - c|"""
        return a + b * np.abs(x - c)
    
    @staticmethod
    def quadratic(x, a, b, c):
        """Quadratic fit: HFR = a + b * (x - c)^2"""
        return a + b * (x - c) ** 2
    
    def fit_curve(self, samples: List[FocusSample]) -> Optional[FocusProfile]:
        """Fit focus curve to samples"""
        if len(samples) < 5:
            logger.warning("Not enough samples for fitting")
            return None
        
        # Extract data
        positions = np.array([s.focuser_pos for s in samples])
        hfrs = np.array([s.hfr for s in samples])
        
        # Try hyperbolic fit first
        try:
            popt, _ = curve_fit(self.hyperbolic, positions, hfrs, 
                                p0=[min(hfrs), 0.0001, positions[np.argmin(hfrs)]])
            
            # Calculate R²
            residuals = hfrs - self.hyperbolic(positions, *popt)
            ss_res = np.sum(residuals ** 2)
            ss_tot = np.sum((hfrs - np.mean(hfrs)) ** 2)
            r2 = 1 - (ss_res / ss_tot)
            
            if r2 > 0.8:
                optimal_pos = int(popt[2])
                # Critical zone: where HFR increases by 10%
                critical_zone = int(0.1 / popt[1]) if popt[1] > 0 else 100
                
                return FocusProfile(
                    train_id=samples[0].train_id,
                    filter_name=samples[0].filter_name,
                    temp_c=samples[0].temp_c,
                    optimal_pos=optimal_pos,
                    critical_zone=critical_zone,
                    fit_type="hyperbolic",
                    coeffs_json=popt.tolist(),
                    r2=r2,
                    sample_count=len(samples)
                )
        except Exception as e:
            logger.error(f"Hyperbolic fit failed: {e}")
        
        # Fallback to quadratic
        try:
            popt, _ = curve_fit(self.quadratic, positions, hfrs,
                                p0=[min(hfrs), 0.000001, positions[np.argmin(hfrs)]])
            
            residuals = hfrs - self.quadratic(positions, *popt)
            ss_res = np.sum(residuals ** 2)
            ss_tot = np.sum((hfrs - np.mean(hfrs)) ** 2)
            r2 = 1 - (ss_res / ss_tot)
            
            optimal_pos = int(popt[2])
            critical_zone = int(math.sqrt(0.1 / popt[1])) if popt[1] > 0 else 100
            
            return FocusProfile(
                train_id=samples[0].train_id,
                filter_name=samples[0].filter_name,
                temp_c=samples[0].temp_c,
                optimal_pos=optimal_pos,
                critical_zone=critical_zone,
                fit_type="quadratic",
                coeffs_json=popt.tolist(),
                r2=r2,
                sample_count=len(samples)
            )
        except Exception as e:
            logger.error(f"Quadratic fit failed: {e}")
            return None

# ===== MASTER FRAME LIBRARY MANAGER =====

class MasterLibraryManager:
    """Manage and organize master calibration frames"""
    
    def __init__(self, library_path: Path):
        self.library_path = library_path
        self.library_path.mkdir(parents=True, exist_ok=True)
    
    def catalog_frame(self, fits_path: Path, metadata: MasterFrameMetadata):
        """Catalog a master frame and compute stats"""
        logger.info(f"Cataloging master frame: {fits_path}")
        
        # STUB: In production, use astropy.io.fits to read FITS
        # from astropy.io import fits
        # with fits.open(fits_path) as hdul:
        #     data = hdul[0].data
        #     metadata.stats_json = {
        #         'mean': float(np.mean(data)),
        #         'median': float(np.median(data)),
        #         'stddev': float(np.std(data)),
        #         'min': float(np.min(data)),
        #         'max': float(np.max(data)),
        #     }
        
        # For now, generate synthetic stats
        metadata.stats_json = {
            'mean': 1000.0,
            'median': 998.0,
            'stddev': 45.0,
            'min': 800,
            'max': 1200,
        }
        
        # Write metadata to staging
        staging_file = STAGING_DIR / f"master_{metadata.frame_type}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.ndjson"
        with open(staging_file, 'w') as f:
            f.write(metadata.model_dump_json() + '\n')
        
        logger.info(f"Wrote master frame metadata to {staging_file}")
    
    def prune_old_frames(self, max_age_days: int = 90):
        """Remove master frames older than max_age_days"""
        cutoff = datetime.utcnow() - timedelta(days=max_age_days)
        logger.info(f"Pruning master frames older than {cutoff.date()}")
        # STUB: Implementation would query DB and remove old frames

# ===== POINTING MODEL BUILDER =====

class PointingModelBuilder:
    """Build pointing models from alignment data"""
    
    def build_model(self, alignment_points: List[Dict]) -> Optional[PointingModel]:
        """Build pointing model from alignment data"""
        if len(alignment_points) < 10:
            logger.warning("Not enough alignment points for model")
            return None
        
        # STUB: Real implementation would use least-squares fit
        # to solve for pointing model terms (IH, ID, CH, NP, MA, ME, etc.)
        # For now, generate synthetic terms
        
        terms = {
            "IH": -10.0 + (len(alignment_points) % 20 - 10),
            "ID": 5.0 + (len(alignment_points) % 10 - 5),
            "CH": -2.0,
            "NP": 8.0,
            "MA": -1.5,
            "ME": 3.5,
        }
        
        # Calculate RMS from residuals
        rms_arcsec = 20.0 - (len(alignment_points) * 0.3)  # Better with more points
        
        return PointingModel(
            train_id="synthetic_train_id",
            terms_json=terms,
            rms_arcsec=rms_arcsec,
            point_count=len(alignment_points)
        )

# ===== MAIN ORCHESTRATION =====

async def process_focus_session(session_file: Path):
    """Process focus session data and fit curves"""
    logger.info(f"Processing focus session: {session_file}")
    
    samples = []
    with open(session_file, 'r') as f:
        for line in f:
            samples.append(FocusSample.model_validate_json(line))
    
    if not samples:
        logger.warning("No samples found")
        return
    
    # Group by train_id and filter
    groups = {}
    for sample in samples:
        key = (sample.train_id, sample.filter_name)
        if key not in groups:
            groups[key] = []
        groups[key].append(sample)
    
    # Fit curves for each group
    fitter = FocusCurveFitter()
    for (train_id, filter_name), group_samples in groups.items():
        profile = fitter.fit_curve(group_samples)
        if profile:
            staging_file = STAGING_DIR / f"focus_profile_{train_id}_{filter_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.ndjson"
            with open(staging_file, 'w') as f:
                f.write(profile.model_dump_json() + '\n')
            logger.info(f"Wrote focus profile to {staging_file}")

async def catalog_master_frames(frames_dir: Path):
    """Catalog all master frames in directory"""
    logger.info(f"Cataloging master frames in {frames_dir}")
    
    manager = MasterLibraryManager(frames_dir)
    
    # STUB: In production, scan for .fits files and catalog them
    # for fits_file in frames_dir.glob("*.fits"):
    #     metadata = extract_metadata_from_fits(fits_file)
    #     manager.catalog_frame(fits_file, metadata)
    
    logger.info("Master frame cataloging complete")

async def run_calib_worker():
    """Main worker loop"""
    logger.info("Starting Calibration worker")
    
    while True:
        try:
            # Process any pending focus sessions
            for session_file in STAGING_DIR.glob("focus_session_*.ndjson"):
                await process_focus_session(session_file)
                # Archive processed file
                session_file.rename(session_file.with_suffix('.processed'))
            
            # Catalog new master frames
            # await catalog_master_frames(Path("/calibration/masters"))
            
            logger.info("Calibration worker cycle complete, sleeping 300s")
            await asyncio.sleep(300)  # 5 minutes
            
        except Exception as e:
            logger.error(f"Error in calib worker: {e}", exc_info=True)
            await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(run_calib_worker())
