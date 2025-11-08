import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import {
  manufacturer,
  device,
  specKv,
  capability,
  catalogObject,
  aka,
  satellite,
  tle,
  event,
  visibility,
  eventTag,
  sourceRef,
} from "@shared/astrodb-schema";

neonConfig.webSocketConstructor = ws as any;

export async function seedAstroDb() {
  console.log("Starting AstroDB seeding...");
  
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL, skipping AstroDB seed");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // ===== EQUIPMENT DATA =====
    console.log("Seeding equipment data...");
    
    // Manufacturers
    const manufacturers = await db.insert(manufacturer).values([
      { name: "ZWO", website: "https://www.zwoastro.com", country: "China" },
      { name: "Celestron", website: "https://www.celestron.com", country: "USA" },
      { name: "Sky-Watcher", website: "https://www.skywatcher.com", country: "China" },
      { name: "QHY", website: "https://www.qhyccd.com", country: "China" },
      { name: "Planewave", website: "https://planewave.com", country: "USA" },
      { name: "Software Bisque", website: "https://www.bisque.com", country: "USA" },
    ]).onConflictDoNothing().returning();

    console.log(`Inserted ${manufacturers.length} manufacturers`);

    // Devices
    const devices = await db.insert(device).values([
      // Mounts
      {
        manufacturerId: manufacturers[1].id, // Celestron
        model: "CGEM II",
        category: "mount",
        interface: "ASCOM",
      },
      {
        manufacturerId: manufacturers[2].id, // Sky-Watcher
        model: "EQ6-R Pro",
        category: "mount",
        interface: "ASCOM",
      },
      {
        manufacturerId: manufacturers[5].id, // Software Bisque
        model: "Paramount MX+",
        category: "mount",
        interface: "ASCOM",
      },
      // Cameras
      {
        manufacturerId: manufacturers[0].id, // ZWO
        model: "ASI294MC Pro",
        category: "camera",
        interface: "ASCOM",
      },
      {
        manufacturerId: manufacturers[0].id, // ZWO
        model: "ASI2600MM Pro",
        category: "camera",
        interface: "ASCOM",
      },
      {
        manufacturerId: manufacturers[3].id, // QHY
        model: "QHY268M",
        category: "camera",
        interface: "ASCOM",
      },
      // Focusers
      {
        manufacturerId: manufacturers[4].id, // Planewave
        model: "Hedrick Focuser",
        category: "focuser",
        interface: "ASCOM",
      },
      // OTAs
      {
        manufacturerId: manufacturers[1].id, // Celestron
        model: "EdgeHD 11",
        category: "ota",
        interface: "Other",
      },
    ]).onConflictDoNothing().returning();

    console.log(`Inserted ${devices.length} devices`);

    // Specs
    await db.insert(specKv).values([
      // Mount specs
      { deviceId: devices[0].id, key: "payload_kg", value: "18", unit: "kg" },
      { deviceId: devices[0].id, key: "goto_accuracy", value: "1", unit: "arcmin" },
      { deviceId: devices[1].id, key: "payload_kg", value: "20", unit: "kg" },
      { deviceId: devices[1].id, key: "periodic_error", value: "5", unit: "arcsec" },
      { deviceId: devices[2].id, key: "payload_kg", value: "45", unit: "kg" },
      // Camera specs
      { deviceId: devices[3].id, key: "sensor_size", value: "19.1x13.0", unit: "mm" },
      { deviceId: devices[3].id, key: "pixel_um", value: "4.63", unit: "µm" },
      { deviceId: devices[3].id, key: "resolution", value: "4144x2822", unit: "px" },
      { deviceId: devices[4].id, key: "sensor_size", value: "23.5x15.7", unit: "mm" },
      { deviceId: devices[4].id, key: "pixel_um", value: "3.76", unit: "µm" },
      { deviceId: devices[4].id, key: "resolution", value: "6248x4176", unit: "px" },
      { deviceId: devices[5].id, key: "sensor_size", value: "23.5x15.7", unit: "mm" },
      { deviceId: devices[5].id, key: "pixel_um", value: "3.76", unit: "µm" },
      // Focuser specs
      { deviceId: devices[6].id, key: "max_load", value: "23", unit: "kg" },
      { deviceId: devices[6].id, key: "step_resolution", value: "0.47", unit: "µm" },
      // OTA specs
      { deviceId: devices[7].id, key: "aperture", value: "280", unit: "mm" },
      { deviceId: devices[7].id, key: "focal_length", value: "2800", unit: "mm" },
      { deviceId: devices[7].id, key: "focal_ratio", value: "10", unit: "" },
    ]).onConflictDoNothing();

    // Capabilities
    await db.insert(capability).values([
      { deviceId: devices[0].id, name: "goto" },
      { deviceId: devices[0].id, name: "tracking" },
      { deviceId: devices[1].id, name: "goto" },
      { deviceId: devices[1].id, name: "ppec" },
      { deviceId: devices[1].id, name: "guide_port" },
      { deviceId: devices[2].id, name: "goto" },
      { deviceId: devices[2].id, name: "ppec" },
      { deviceId: devices[3].id, name: "cooling" },
      { deviceId: devices[3].id, name: "usb3" },
      { deviceId: devices[4].id, name: "cooling" },
      { deviceId: devices[4].id, name: "usb3" },
    ]).onConflictDoNothing();

    // Source references for equipment
    for (const dev of devices) {
      await db.insert(sourceRef).values({
        entityType: "device",
        entityId: dev.id,
        sourceName: "Manufacturer Website",
        sourceUrl: "https://example.com",
        license: "Public Domain",
      }).onConflictDoNothing();
    }

    // ===== CATALOG DATA (Top 500 objects - sample subset) =====
    console.log("Seeding catalog data...");

    const objects = await db.insert(catalogObject).values([
      // Messier objects
      {
        primaryName: "M31",
        catalogIds: { messier: "M31", ngc: "NGC 224" },
        class: "galaxy",
        constellation: "Andromeda",
        raJ2000Deg: "10.6847",
        decJ2000Deg: "41.2687",
        mag: 3.4,
        majorArcmin: 178.0,
        minorArcmin: 63.0,
        notes: "Andromeda Galaxy - nearest major galaxy",
      },
      {
        primaryName: "M42",
        catalogIds: { messier: "M42", ngc: "NGC 1976" },
        class: "nebula",
        constellation: "Orion",
        raJ2000Deg: "83.8221",
        decJ2000Deg: "-5.3911",
        mag: 4.0,
        majorArcmin: 85.0,
        minorArcmin: 60.0,
        notes: "Orion Nebula - stellar nursery visible to naked eye",
      },
      {
        primaryName: "M13",
        catalogIds: { messier: "M13", ngc: "NGC 6205" },
        class: "globular",
        constellation: "Hercules",
        raJ2000Deg: "250.4234",
        decJ2000Deg: "36.4601",
        mag: 5.8,
        majorArcmin: 20.0,
        notes: "Great Globular Cluster in Hercules",
      },
      {
        primaryName: "M45",
        catalogIds: { messier: "M45", common: "Pleiades" },
        class: "open_cluster",
        constellation: "Taurus",
        raJ2000Deg: "56.75",
        decJ2000Deg: "24.1167",
        mag: 1.6,
        majorArcmin: 110.0,
        notes: "Seven Sisters - prominent open cluster",
      },
      {
        primaryName: "M51",
        catalogIds: { messier: "M51", ngc: "NGC 5194" },
        class: "galaxy",
        constellation: "Canes Venatici",
        raJ2000Deg: "202.4696",
        decJ2000Deg: "47.1952",
        mag: 8.4,
        majorArcmin: 11.2,
        minorArcmin: 6.9,
        notes: "Whirlpool Galaxy - interacting galaxies",
      },
      {
        primaryName: "M57",
        catalogIds: { messier: "M57", ngc: "NGC 6720" },
        class: "planetary_nebula",
        constellation: "Lyra",
        raJ2000Deg: "283.3963",
        decJ2000Deg: "33.0294",
        mag: 8.8,
        majorArcmin: 1.4,
        notes: "Ring Nebula - famous planetary nebula",
      },
    ]).onConflictDoNothing().returning();

    console.log(`Inserted ${objects.length} catalog objects`);

    // Alternate names
    await db.insert(aka).values([
      { objectId: objects[0].id, name: "Andromeda Galaxy" },
      { objectId: objects[0].id, name: "NGC 224" },
      { objectId: objects[1].id, name: "Orion Nebula" },
      { objectId: objects[1].id, name: "NGC 1976" },
      { objectId: objects[2].id, name: "Hercules Cluster" },
      { objectId: objects[2].id, name: "NGC 6205" },
      { objectId: objects[3].id, name: "Seven Sisters" },
      { objectId: objects[3].id, name: "Pleiades" },
      { objectId: objects[4].id, name: "Whirlpool Galaxy" },
      { objectId: objects[4].id, name: "NGC 5194" },
      { objectId: objects[5].id, name: "Ring Nebula" },
      { objectId: objects[5].id, name: "NGC 6720" },
    ]).onConflictDoNothing();

    // ===== SATELLITE DATA =====
    console.log("Seeding satellite data...");

    const satellites = await db.insert(satellite).values([
      {
        noradId: 25544,
        name: "ISS (ZARYA)",
        operator: "International",
        category: "station",
        visualMagEst: -2.0,
        firstLaunch: new Date("1998-11-20"),
        notes: "International Space Station - brightest satellite",
      },
      {
        noradId: 20580,
        name: "HUBBLE SPACE TELESCOPE",
        operator: "NASA",
        category: "earth_obs",
        visualMagEst: 2.0,
        firstLaunch: new Date("1990-04-24"),
        notes: "Famous space telescope",
      },
      {
        noradId: 48274,
        name: "STARLINK-1007",
        operator: "SpaceX",
        category: "constellation",
        visualMagEst: 4.5,
        firstLaunch: new Date("2019-11-11"),
        notes: "Starlink constellation satellite",
      },
    ]).onConflictDoNothing().returning();

    console.log(`Inserted ${satellites.length} satellites`);

    // TLE data (sample - these would be updated regularly)
    await db.insert(tle).values([
      {
        noradId: 25544,
        line1: "1 25544U 98067A   23365.50000000  .00012345  00000-0  12345-3 0  9991",
        line2: "2 25544  51.6400  12.3456 0001234  45.6789 314.5678 15.54001234123456",
        epoch: new Date("2023-12-31T12:00:00Z"),
        source: "CelesTrak",
      },
      {
        noradId: 20580,
        line1: "1 20580U 90037B   23365.50000000  .00000123  00000-0  12345-4 0  9992",
        line2: "2 20580  28.4700  45.6789 0002345 123.4567 236.5678 15.09876543987654",
        epoch: new Date("2023-12-31T12:00:00Z"),
        source: "CelesTrak",
      },
      {
        noradId: 48274,
        line1: "1 48274U 21036AX  23365.50000000  .00001234  00000-0  12345-4 0  9993",
        line2: "2 48274  53.0500  90.1234 0001567 234.5678 125.4321 15.06543210765432",
        epoch: new Date("2023-12-31T12:00:00Z"),
        source: "CelesTrak",
      },
    ]).onConflictDoNothing();

    // ===== EVENTS DATA (2025-2026) =====
    console.log("Seeding events data...");

    const events = await db.insert(event).values([
      {
        title: "Total Solar Eclipse 2025",
        type: "solar_eclipse",
        startUtc: new Date("2025-03-29T09:00:00Z"),
        endUtc: new Date("2025-03-29T12:00:00Z"),
        summary250: "A total solar eclipse will be visible across parts of North Africa, Europe, and Central Asia. The path of totality will cross through Morocco, Spain, southern France, Italy, and continuing eastward. Maximum duration of totality will be approximately 2 minutes and 23 seconds. Observers within the path of totality will experience complete darkness as the Moon blocks the Sun. This is one of the most spectacular astronomical events, providing unique opportunities for photography and scientific observation.",
        url: "https://eclipse.gsfc.nasa.gov/",
      },
      {
        title: "Perseid Meteor Shower Peak 2025",
        type: "meteor_shower_peak",
        startUtc: new Date("2025-08-12T00:00:00Z"),
        endUtc: new Date("2025-08-13T23:59:59Z"),
        summary250: "The annual Perseid meteor shower reaches its peak, typically producing 60-100 meteors per hour under ideal dark sky conditions. The Perseids are debris from Comet Swift-Tuttle and are known for producing bright meteors and occasional fireballs. Best viewing is after midnight when the radiant point in Perseus rises higher in the sky. Moon phase will be favorable this year, providing excellent viewing conditions. No special equipment needed - just find a dark location away from city lights.",
        url: "https://www.amsmeteors.org/meteor-showers/meteor-shower-calendar/",
      },
      {
        title: "Mars-Jupiter Conjunction 2025",
        type: "planetary_conjunction",
        startUtc: new Date("2025-05-28T00:00:00Z"),
        endUtc: new Date("2025-05-30T23:59:59Z"),
        summary250: "Mars and Jupiter will appear extremely close together in the predawn sky, separated by less than half a degree. This close approach provides excellent opportunities for visual observation and photography. Both planets will be bright enough to see with the naked eye, and binoculars or a small telescope will reveal both planets in the same field of view. Look towards the eastern horizon before sunrise for the best views.",
        url: "https://in-the-sky.org/",
      },
      {
        title: "Total Lunar Eclipse 2026",
        type: "lunar_eclipse",
        startUtc: new Date("2026-03-03T03:00:00Z"),
        endUtc: new Date("2026-03-03T07:00:00Z"),
        summary250: "A total lunar eclipse will be visible from the Americas, Europe, Africa, and western Asia. During totality, the Moon will take on a reddish-copper color due to sunlight refracted through Earth's atmosphere. This 'blood moon' phenomenon occurs when the Moon passes completely into Earth's umbral shadow. The total phase will last approximately 58 minutes. Lunar eclipses are safe to view with the naked eye and provide excellent opportunities for photography.",
        url: "https://eclipse.gsfc.nasa.gov/",
      },
    ]).onConflictDoNothing().returning();

    console.log(`Inserted ${events.length} events`);

    // Visibility data
    await db.insert(visibility).values([
      { eventId: events[0].id, scope: "continent", continentCode: "EU" },
      { eventId: events[0].id, scope: "continent", continentCode: "AF" },
      { eventId: events[1].id, scope: "global" },
      { eventId: events[2].id, scope: "global" },
      { eventId: events[3].id, scope: "continent", continentCode: "NA" },
      { eventId: events[3].id, scope: "continent", continentCode: "SA" },
      { eventId: events[3].id, scope: "continent", continentCode: "EU" },
      { eventId: events[3].id, scope: "country", countryIso2: "US" },
    ]).onConflictDoNothing();

    // Tags
    await db.insert(eventTag).values([
      { eventId: events[0].id, tag: "naked-eye" },
      { eventId: events[0].id, tag: "astrophotography" },
      { eventId: events[1].id, tag: "naked-eye" },
      { eventId: events[1].id, tag: "meteor-shower" },
      { eventId: events[2].id, tag: "naked-eye" },
      { eventId: events[2].id, tag: "binocular" },
      { eventId: events[3].id, tag: "naked-eye" },
      { eventId: events[3].id, tag: "astrophotography" },
    ]).onConflictDoNothing();

    console.log("AstroDB seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding AstroDB:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seed if called directly
if (require.main === module) {
  seedAstroDb()
    .then(() => {
      console.log("Seed completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}
