#!/usr/bin/env python3
"""
Operations & Environment Worker
Fetches weather/seeing forecasts, computes dew risk, imports horizon/LP data
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import os

import httpx
from pydantic import BaseModel, Field

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

class MeteoForecast(BaseModel):
    """Weather/seeing forecast point"""
    site_id: str
    ts: datetime
    cloud_pct: float
    transparency_idx: Optional[float] = None
    seeing_arcsec: Optional[float] = None
    wind_mps: float
    gust_mps: Optional[float] = None
    temp_c: float
    dewpoint_c: float
    rh_pct: float
    precip_mm: Optional[float] = 0.0
    pressure_hpa: Optional[float] = None
    moon_illum: float
    moon_alt_deg: float
    source: str
    model_run: datetime

class DewRiskPoint(BaseModel):
    """Dew risk calculation"""
    site_id: str
    ts: datetime
    temp_c: float
    dewpoint_c: float
    margin_c: float
    risk: str  # 'low', 'med', 'high'

class HorizonPoint(BaseModel):
    """Horizon altitude limit at azimuth"""
    site_id: str
    az_deg: float
    alt_limit_deg: float
    source: Optional[str] = None

class LpTile(BaseModel):
    """Light pollution tile"""
    z: int
    x: int
    y: int
    mpsas: float
    dataset: str

# ===== WEATHER SCRAPERS =====

class WeatherScraper:
    """Fetch weather/seeing from public APIs"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def fetch_clearoutside(self, site_id: str, lat: float, lon: float) -> List[MeteoForecast]:
        """
        Fetch from ClearOutside API (simulated here)
        In production, use actual API endpoint with proper rate limiting
        """
        logger.info(f"Fetching ClearOutside data for site {site_id}")
        
        # STUB: Generate synthetic data
        # Real implementation would call: https://clearoutside.com/forecast/{lat}/{lon}
        now = datetime.utcnow()
        model_run = now.replace(minute=0, second=0, microsecond=0)
        
        forecasts = []
        for hour in range(48):
            ts = now + timedelta(hours=hour)
            
            # Simulate diurnal pattern
            temp_base = 15.0
            temp_amplitude = 5.0
            hour_angle = (ts.hour / 24.0) * 2 * 3.14159
            temp_c = temp_base + temp_amplitude * (-1 * (1 - (ts.hour - 14) / 24.0) ** 2)
            
            forecasts.append(MeteoForecast(
                site_id=site_id,
                ts=ts,
                cloud_pct=20.0 + (hour % 10) * 5,
                transparency_idx=0.75 + (hour % 5) * 0.05,
                seeing_arcsec=1.5 + (hour % 8) * 0.3,
                wind_mps=3.0 + (hour % 6) * 0.5,
                gust_mps=5.0 + (hour % 7) * 0.8,
                temp_c=temp_c,
                dewpoint_c=temp_c - 5.0,
                rh_pct=50.0 + (hour % 10) * 3,
                precip_mm=0.0,
                pressure_hpa=1013.0,
                moon_illum=0.35,
                moon_alt_deg=-30.0 + hour * 2.5,
                source="clearoutside_sim",
                model_run=model_run
            ))
        
        return forecasts
    
    async def fetch_7timer(self, site_id: str, lat: float, lon: float) -> List[MeteoForecast]:
        """
        Fetch from 7Timer (actual public API)
        http://www.7timer.info/doc.php?lang=en
        """
        logger.info(f"Fetching 7Timer data for site {site_id}")
        
        try:
            # Astro series for astronomy-specific data
            url = f"http://www.7timer.info/bin/api.pl?lon={lon}&lat={lat}&product=astro&output=json"
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()
            
            forecasts = []
            init_time = datetime.strptime(data['init'], '%Y%m%d%H')
            
            for point in data.get('dataseries', [])[:48]:
                timepoint = init_time + timedelta(hours=point['timepoint'])
                
                # 7Timer cloudcover: 1-9 scale
                cloud_pct = point.get('cloudcover', 5) * 11.1  # Convert to %
                
                # Seeing: 1-8 scale (1=<0.5", 8=>4")
                seeing_map = {1: 0.4, 2: 0.6, 3: 0.9, 4: 1.2, 5: 1.7, 6: 2.5, 7: 3.5, 8: 5.0}
                seeing_arcsec = seeing_map.get(point.get('seeing', 4), 1.5)
                
                # Transparency: 1-8 scale (1=<0.3, 8=>0.85)
                transparency_map = {1: 0.2, 2: 0.35, 3: 0.5, 4: 0.65, 5: 0.75, 6: 0.82, 7: 0.88, 8: 0.92}
                transparency = transparency_map.get(point.get('transparency', 5), 0.7)
                
                temp_c = point.get('temp2m', 15)
                rh_pct = point.get('rh2m', 60)
                dewpoint_c = temp_c - ((100 - rh_pct) / 5.0)  # Approximation
                
                forecasts.append(MeteoForecast(
                    site_id=site_id,
                    ts=timepoint,
                    cloud_pct=cloud_pct,
                    transparency_idx=transparency,
                    seeing_arcsec=seeing_arcsec,
                    wind_mps=point.get('wind10m', {}).get('speed', 0) * 0.277778,  # km/h to m/s
                    temp_c=temp_c,
                    dewpoint_c=dewpoint_c,
                    rh_pct=rh_pct,
                    moon_illum=0.5,  # Would need separate ephemeris calculation
                    moon_alt_deg=0.0,
                    source="7timer",
                    model_run=init_time
                ))
            
            return forecasts
            
        except Exception as e:
            logger.error(f"Failed to fetch 7Timer: {e}")
            return []
    
    async def close(self):
        await self.client.aclose()

# ===== DEW CALCULATOR =====

def calculate_dew_risk(meteo: MeteoForecast) -> DewRiskPoint:
    """Calculate dew risk from meteo data"""
    margin_c = meteo.temp_c - meteo.dewpoint_c
    
    if margin_c < 2.0:
        risk = 'high'
    elif margin_c < 4.0:
        risk = 'med'
    else:
        risk = 'low'
    
    return DewRiskPoint(
        site_id=meteo.site_id,
        ts=meteo.ts,
        temp_c=meteo.temp_c,
        dewpoint_c=meteo.dewpoint_c,
        margin_c=margin_c,
        risk=risk
    )

# ===== LIGHT POLLUTION PROCESSOR =====

class LpProcessor:
    """Process light pollution tile data"""
    
    @staticmethod
    def import_world_atlas_tiles(geojson_path: Path) -> List[LpTile]:
        """
        Import tiles from World Atlas 2015 GeoJSON
        Real implementation would parse actual GeoJSON file
        """
        logger.info(f"Importing LP tiles from {geojson_path}")
        
        # STUB: Generate synthetic tiles
        tiles = []
        for z in [6, 7, 8]:
            for x in range(40, 60):
                for y in range(80, 100):
                    # Simulate varying SQM values
                    mpsas = 18.0 + (z * 0.5) + ((x + y) % 10) * 0.3
                    tiles.append(LpTile(
                        z=z, x=x, y=y,
                        mpsas=round(mpsas, 2),
                        dataset="world_atlas_2015"
                    ))
        
        return tiles[:100]  # Limit for demo

# ===== MAIN ORCHESTRATION =====

async def scrape_weather_for_site(site_id: str, lat: float, lon: float):
    """Scrape weather/seeing forecasts for a site"""
    scraper = WeatherScraper()
    
    try:
        # Fetch from 7Timer (real API)
        forecasts = await scraper.fetch_7timer(site_id, lat, lon)
        
        # Write to staging
        if forecasts:
            staging_file = STAGING_DIR / f"meteo_{site_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.ndjson"
            with open(staging_file, 'w') as f:
                for fc in forecasts:
                    f.write(fc.model_dump_json() + '\n')
            logger.info(f"Wrote {len(forecasts)} forecasts to {staging_file}")
            
            # Compute dew risk
            dew_risks = [calculate_dew_risk(fc) for fc in forecasts]
            dew_file = STAGING_DIR / f"dew_{site_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.ndjson"
            with open(dew_file, 'w') as f:
                for dr in dew_risks:
                    f.write(dr.model_dump_json() + '\n')
            logger.info(f"Wrote {len(dew_risks)} dew risk points to {dew_file}")
        
    finally:
        await scraper.close()

async def import_horizon_data(site_id: str, horizon_file: Path):
    """Import horizon profile from file"""
    logger.info(f"Importing horizon for site {site_id} from {horizon_file}")
    
    # STUB: Generate synthetic horizon
    points = []
    for az in range(0, 360, 10):
        alt = 10.0 + (az % 90) * 0.1  # Varying horizon
        points.append(HorizonPoint(
            site_id=site_id,
            az_deg=float(az),
            alt_limit_deg=alt,
            source="synthetic"
        ))
    
    staging_file = STAGING_DIR / f"horizon_{site_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.ndjson"
    with open(staging_file, 'w') as f:
        for pt in points:
            f.write(pt.model_dump_json() + '\n')
    logger.info(f"Wrote {len(points)} horizon points to {staging_file}")

async def import_lp_tiles():
    """Import light pollution tiles"""
    logger.info("Importing light pollution tiles")
    
    processor = LpProcessor()
    tiles = processor.import_world_atlas_tiles(Path("world_atlas_2015.geojson"))
    
    staging_file = STAGING_DIR / f"lp_tiles_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.ndjson"
    with open(staging_file, 'w') as f:
        for tile in tiles:
            f.write(tile.model_dump_json() + '\n')
    logger.info(f"Wrote {len(tiles)} LP tiles to {staging_file}")

# ===== SCHEDULER =====

async def run_ops_worker():
    """Main worker loop"""
    logger.info("Starting Ops worker")
    
    # Demo: Scrape weather for a few sites
    demo_sites = [
        ("site_001", 19.8207, -155.4681),  # Mauna Kea
        ("site_002", 28.7569, -17.8856),   # La Palma
    ]
    
    while True:
        try:
            # Weather scraping (every 1 hour)
            for site_id, lat, lon in demo_sites:
                await scrape_weather_for_site(site_id, lat, lon)
            
            # Horizon import (once)
            # await import_horizon_data("site_001", Path("horizon.json"))
            
            # LP tiles import (once per month)
            # await import_lp_tiles()
            
            logger.info("Ops worker cycle complete, sleeping 3600s")
            await asyncio.sleep(3600)  # 1 hour
            
        except Exception as e:
            logger.error(f"Error in ops worker: {e}", exc_info=True)
            await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(run_ops_worker())
