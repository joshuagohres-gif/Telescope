#!/usr/bin/env python3
"""
NDJSON Importer - Import staged data into PostgreSQL
"""

import json
import logging
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

import psycopg2
from psycopg2.extras import execute_batch

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Data staging directory
STAGING_DIR = Path("/data/staging")

# Database connection
def get_db_connection():
    return psycopg2.connect(os.environ.get("DATABASE_URL"))


# ===== EQUIPMENT IMPORTER =====

def import_equipment(ndjson_file: Path):
    """Import equipment data from NDJSON"""
    logger.info(f"Importing equipment from {ndjson_file}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        with open(ndjson_file, 'r') as f:
            for line in f:
                device = json.loads(line)
                
                # Upsert manufacturer
                cursor.execute("""
                    INSERT INTO astrodb_manufacturer (name, website, country)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (name) DO NOTHING
                    RETURNING id
                """, (device.get('manufacturer'), '', ''))
                
                result = cursor.fetchone()
                if result:
                    manufacturer_id = result[0]
                else:
                    cursor.execute("SELECT id FROM astrodb_manufacturer WHERE name = %s", (device.get('manufacturer'),))
                    manufacturer_id = cursor.fetchone()[0]
                
                # Upsert device
                cursor.execute("""
                    INSERT INTO astrodb_device (manufacturer_id, model, category, interface)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (manufacturer_id, model) DO UPDATE
                    SET category = EXCLUDED.category, interface = EXCLUDED.interface
                    RETURNING id
                """, (manufacturer_id, device['model'], device['category'], device['interface']))
                
                device_id = cursor.fetchone()[0]
                
                # Insert specs
                if 'specs' in device:
                    for key, value in device['specs'].items():
                        cursor.execute("""
                            INSERT INTO astrodb_spec_kv (device_id, key, value, unit)
                            VALUES (%s, %s, %s, %s)
                            ON CONFLICT DO NOTHING
                        """, (device_id, key, str(value), None))
                
                # Insert capabilities
                if 'capabilities' in device:
                    for cap in device['capabilities']:
                        cursor.execute("""
                            INSERT INTO astrodb_capability (device_id, name)
                            VALUES (%s, %s)
                            ON CONFLICT DO NOTHING
                        """, (device_id, cap))
        
        conn.commit()
        logger.info(f"Equipment import completed successfully")
    
    except Exception as e:
        conn.rollback()
        logger.error(f"Error importing equipment: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


# ===== CATALOG IMPORTER =====

def import_catalog(ndjson_file: Path):
    """Import catalog objects from NDJSON"""
    logger.info(f"Importing catalog from {ndjson_file}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        with open(ndjson_file, 'r') as f:
            for line in f:
                obj = json.loads(line)
                
                # Upsert object
                cursor.execute("""
                    INSERT INTO astrodb_object (
                        primary_name, catalog_ids, class, constellation,
                        ra_j2000_deg, dec_j2000_deg, mag, major_arcmin, minor_arcmin, notes
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (primary_name) DO UPDATE
                    SET catalog_ids = EXCLUDED.catalog_ids,
                        class = EXCLUDED.class,
                        constellation = EXCLUDED.constellation,
                        ra_j2000_deg = EXCLUDED.ra_j2000_deg,
                        dec_j2000_deg = EXCLUDED.dec_j2000_deg,
                        mag = EXCLUDED.mag,
                        major_arcmin = EXCLUDED.major_arcmin,
                        minor_arcmin = EXCLUDED.minor_arcmin,
                        notes = EXCLUDED.notes
                    RETURNING id
                """, (
                    obj['primary_name'],
                    json.dumps(obj.get('catalog_ids', {})),
                    obj['class'],
                    obj.get('constellation'),
                    obj['ra_j2000_deg'],
                    obj['dec_j2000_deg'],
                    obj.get('mag'),
                    obj.get('major_arcmin'),
                    obj.get('minor_arcmin'),
                    obj.get('notes')
                ))
                
                object_id = cursor.fetchone()[0]
                
                # Insert alternate names
                if 'alternate_names' in obj:
                    for name in obj['alternate_names']:
                        cursor.execute("""
                            INSERT INTO astrodb_aka (object_id, name)
                            VALUES (%s, %s)
                            ON CONFLICT DO NOTHING
                        """, (object_id, name))
        
        conn.commit()
        logger.info(f"Catalog import completed successfully")
    
    except Exception as e:
        conn.rollback()
        logger.error(f"Error importing catalog: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


# ===== TLE IMPORTER =====

def import_tles(ndjson_file: Path):
    """Import TLEs from NDJSON"""
    logger.info(f"Importing TLEs from {ndjson_file}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        with open(ndjson_file, 'r') as f:
            for line in f:
                tle_data = json.loads(line)
                
                # Parse epoch (simplified - production should use sgp4)
                epoch = datetime.utcnow()  # Placeholder
                
                # Insert TLE
                cursor.execute("""
                    INSERT INTO astrodb_tle (norad_id, line1, line2, epoch, source)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (norad_id, epoch) DO NOTHING
                """, (
                    tle_data['norad_id'],
                    tle_data['line1'],
                    tle_data['line2'],
                    epoch,
                    tle_data['source']
                ))
        
        conn.commit()
        logger.info(f"TLE import completed successfully")
    
    except Exception as e:
        conn.rollback()
        logger.error(f"Error importing TLEs: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


# ===== MAIN IMPORTER =====

def process_staging_files():
    """Process all NDJSON files in staging directory"""
    logger.info("Processing staging files...")
    
    for ndjson_file in STAGING_DIR.glob("*.ndjson"):
        try:
            if ndjson_file.name.startswith("equipment_"):
                import_equipment(ndjson_file)
            elif ndjson_file.name.startswith("catalog_"):
                import_catalog(ndjson_file)
            elif ndjson_file.name.startswith("tles_"):
                import_tles(ndjson_file)
            
            # Archive processed file
            archive_dir = STAGING_DIR / "processed"
            archive_dir.mkdir(exist_ok=True)
            ndjson_file.rename(archive_dir / ndjson_file.name)
            logger.info(f"Archived {ndjson_file.name}")
        
        except Exception as e:
            logger.error(f"Error processing {ndjson_file}: {e}")


if __name__ == "__main__":
    logger.info("NDJSON Importer starting...")
    process_staging_files()
