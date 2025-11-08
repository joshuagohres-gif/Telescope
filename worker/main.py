#!/usr/bin/env python3
"""
AstroDB Worker - Data Scraping and ETL Pipeline
"""

import asyncio
import logging
import os
from datetime import datetime
from typing import List, Dict, Any
import json
from pathlib import Path

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Data staging directory
STAGING_DIR = Path("/data/staging")
STAGING_DIR.mkdir(parents=True, exist_ok=True)

# Rate limiter
class RateLimiter:
    def __init__(self, requests_per_second: float = 2.0):
        self.rps = requests_per_second
        self.min_interval = 1.0 / requests_per_second
        self.last_request = 0.0
    
    async def wait(self):
        now = asyncio.get_event_loop().time()
        elapsed = now - self.last_request
        if elapsed < self.min_interval:
            await asyncio.sleep(self.min_interval - elapsed)
        self.last_request = asyncio.get_event_loop().time()


# ===== EQUIPMENT SCRAPER =====

async def scrape_equipment_data():
    """Scrape equipment data from vendor catalogs"""
    logger.info("Starting equipment data scrape...")
    
    equipment_data = []
    rate_limiter = RateLimiter(2.0)
    
    # Mock data for demonstration - in production, scrape from real sources
    manufacturers = [
        {"name": "ZWO", "website": "https://www.zwoastro.com", "country": "China"},
        {"name": "Celestron", "website": "https://www.celestron.com", "country": "USA"},
        {"name": "Sky-Watcher", "website": "https://www.skywatcher.com", "country": "China"},
        {"name": "QHY", "website": "https://www.qhyccd.com", "country": "China"},
    ]
    
    devices = [
        {
            "manufacturer": "ZWO",
            "model": "ASI533MC Pro",
            "category": "camera",
            "interface": "ASCOM",
            "specs": {
                "sensor_size": "11.3x7.1",
                "pixel_um": "3.76",
                "resolution": "3008x2008",
            },
            "capabilities": ["cooling", "usb3"],
        },
        {
            "manufacturer": "Celestron",
            "model": "CGEM II",
            "category": "mount",
            "interface": "ASCOM",
            "specs": {
                "payload_kg": "18",
                "goto_accuracy": "1",
            },
            "capabilities": ["goto", "tracking"],
        },
    ]
    
    output = {
        "manufacturers": manufacturers,
        "devices": devices,
        "source": {
            "name": "Equipment Database",
            "url": "https://example.com",
            "license": "Public Domain",
            "fetched_at": datetime.utcnow().isoformat(),
        }
    }
    
    # Write to NDJSON
    output_file = STAGING_DIR / f"equipment_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.ndjson"
    with open(output_file, 'w') as f:
        for device in devices:
            f.write(json.dumps(device) + '\n')
    
    logger.info(f"Equipment scrape completed: {len(devices)} devices written to {output_file}")
    return output


# ===== CATALOG SCRAPER =====

async def scrape_catalog_data():
    """Scrape top 500 night-sky objects"""
    logger.info("Starting catalog data scrape...")
    
    # Mock data - in production, fetch from SIMBAD, OpenNGC, etc.
    objects = [
        {
            "primary_name": "M31",
            "catalog_ids": {"messier": "M31", "ngc": "NGC 224"},
            "class": "galaxy",
            "constellation": "Andromeda",
            "ra_j2000_deg": 10.6847,
            "dec_j2000_deg": 41.2687,
            "mag": 3.4,
            "major_arcmin": 178.0,
            "minor_arcmin": 63.0,
            "notes": "Andromeda Galaxy",
            "alternate_names": ["Andromeda Galaxy", "NGC 224"],
        },
        {
            "primary_name": "M42",
            "catalog_ids": {"messier": "M42", "ngc": "NGC 1976"},
            "class": "nebula",
            "constellation": "Orion",
            "ra_j2000_deg": 83.8221,
            "dec_j2000_deg": -5.3911,
            "mag": 4.0,
            "major_arcmin": 85.0,
            "notes": "Orion Nebula",
            "alternate_names": ["Orion Nebula", "NGC 1976"],
        },
    ]
    
    output_file = STAGING_DIR / f"catalog_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.ndjson"
    with open(output_file, 'w') as f:
        for obj in objects:
            f.write(json.dumps(obj) + '\n')
    
    logger.info(f"Catalog scrape completed: {len(objects)} objects written to {output_file}")
    return objects


# ===== SATELLITE TLE FETCHER =====

async def fetch_satellite_tles():
    """Fetch TLEs from CelesTrak"""
    logger.info("Starting TLE fetch...")
    
    rate_limiter = RateLimiter(1.0)
    
    # Fetch from CelesTrak (public TLE source)
    url = "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle"
    
    try:
        await rate_limiter.wait()
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url)
            response.raise_for_status()
            tle_text = response.text
        
        # Parse TLE format (3-line format: name, line1, line2)
        lines = tle_text.strip().split('\n')
        tles = []
        
        for i in range(0, len(lines), 3):
            if i + 2 < len(lines):
                name = lines[i].strip()
                line1 = lines[i + 1].strip()
                line2 = lines[i + 2].strip()
                
                # Extract NORAD ID from line 1
                norad_id = int(line1[2:7])
                
                # Extract epoch from line 1
                epoch_year = int(line1[18:20])
                epoch_day = float(line1[20:32])
                
                tles.append({
                    "norad_id": norad_id,
                    "name": name,
                    "line1": line1,
                    "line2": line2,
                    "epoch_year": epoch_year,
                    "epoch_day": epoch_day,
                    "source": "CelesTrak",
                    "fetched_at": datetime.utcnow().isoformat(),
                })
        
        output_file = STAGING_DIR / f"tles_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.ndjson"
        with open(output_file, 'w') as f:
            for tle in tles:
                f.write(json.dumps(tle) + '\n')
        
        logger.info(f"TLE fetch completed: {len(tles)} TLEs written to {output_file}")
        return tles
    
    except Exception as e:
        logger.error(f"Error fetching TLEs: {e}")
        return []


# ===== EVENTS SCRAPER =====

async def scrape_events_data():
    """Scrape astronomical events for 2025-2026"""
    logger.info("Starting events data scrape...")
    
    # Mock data - in production, aggregate from multiple sources
    events = [
        {
            "title": "Geminid Meteor Shower Peak 2025",
            "type": "meteor_shower_peak",
            "start_utc": "2025-12-14T00:00:00Z",
            "end_utc": "2025-12-15T23:59:59Z",
            "summary": "The Geminid meteor shower is one of the best and most reliable annual meteor showers, producing up to 120 meteors per hour at peak under ideal conditions. The meteors appear to radiate from the constellation Gemini and are known for their bright, colorful meteors. Unlike most meteor showers which originate from comets, the Geminids come from an asteroid called 3200 Phaethon. Best viewing is typically after midnight when Gemini is high in the sky.",
            "url": "https://www.amsmeteors.org/",
            "visibility": [{"scope": "global"}],
            "tags": ["naked-eye", "meteor-shower"],
        },
    ]
    
    output_file = STAGING_DIR / f"events_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.ndjson"
    with open(output_file, 'w') as f:
        for event in events:
            f.write(json.dumps(event) + '\n')
    
    logger.info(f"Events scrape completed: {len(events)} events written to {output_file}")
    return events


# ===== SCHEDULER =====

async def run_scheduled_jobs():
    """Run all scheduled scraping jobs"""
    scheduler = AsyncIOScheduler()
    
    # Equipment: weekly (Sunday 3 AM UTC)
    scheduler.add_job(
        scrape_equipment_data,
        'cron',
        day_of_week='sun',
        hour=3,
        minute=0,
        id='equipment_scraper'
    )
    
    # Catalog: monthly (1st of month)
    scheduler.add_job(
        scrape_catalog_data,
        'cron',
        day=1,
        hour=2,
        minute=0,
        id='catalog_scraper'
    )
    
    # TLEs: hourly
    scheduler.add_job(
        fetch_satellite_tles,
        'interval',
        hours=1,
        id='tle_fetcher'
    )
    
    # Events: monthly
    scheduler.add_job(
        scrape_events_data,
        'cron',
        day=1,
        hour=4,
        minute=0,
        id='events_scraper'
    )
    
    scheduler.start()
    logger.info("Scheduler started")
    
    # Run initial fetch on startup
    logger.info("Running initial data fetch...")
    await asyncio.gather(
        scrape_equipment_data(),
        scrape_catalog_data(),
        fetch_satellite_tles(),
        scrape_events_data(),
    )
    logger.info("Initial data fetch completed")
    
    # Keep running
    try:
        while True:
            await asyncio.sleep(3600)  # Sleep for 1 hour
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        logger.info("Scheduler stopped")


if __name__ == "__main__":
    logger.info("AstroDB Worker starting...")
    asyncio.run(run_scheduled_jobs())
