import { db } from "@db";
import {
  transient,
  notice,
  noticeXref,
  mpBody,
  ephem,
  orbitElem,
  feature,
  featureAka,
  hop,
} from "../shared/targets-schema";

export async function seedTargetsData() {
  console.log("Seeding Targets & Alerts data...");

  // ===== TRANSIENTS =====
  const transients = await db
    .insert(transient)
    .values([
      {
        name: "SN 2024abc",
        type: "supernova",
        ra: 15.234,
        dec: 42.567,
        discoveryDate: new Date("2024-10-15T12:34:00Z"),
        peakMag: 13.5,
        currentMag: 14.2,
        filterBand: "V",
        hostGalaxy: "NGC 1234",
        redshift: 0.015,
        classification: "Type Ia",
        notes: "Well-observed, excellent light curve",
      },
      {
        name: "Nova Cas 2024",
        type: "nova",
        ra: 23.456,
        dec: 58.123,
        discoveryDate: new Date("2024-11-01T08:15:00Z"),
        peakMag: 8.2,
        currentMag: 9.8,
        filterBand: "V",
        hostGalaxy: null,
        classification: "Classical Nova",
        notes: "Visible in binoculars, fading rapidly",
      },
      {
        name: "GRB 241105A",
        type: "grb",
        ra: 123.789,
        dec: -12.345,
        discoveryDate: new Date("2024-11-05T03:42:00Z"),
        peakMag: 18.5,
        currentMag: 21.2,
        filterBand: "R",
        redshift: 2.3,
        classification: "Long GRB",
        notes: "Swift detection, optical afterglow confirmed",
      },
    ])
    .returning();

  console.log(`✓ Created ${transients.length} transients`);

  // ===== NOTICES =====
  const notices = await db
    .insert(notice)
    .values([
      {
        transientId: transients[0].id,
        source: "TNS",
        noticeId: "2024abc",
        issuedAt: new Date("2024-10-15T13:00:00Z"),
        title: "Discovery of SN 2024abc in NGC 1234",
        contentUrl: "https://www.wis-tns.org/object/2024abc",
        contentText: "Type Ia supernova discovered at mag 13.5",
      },
      {
        transientId: transients[1].id,
        source: "AAVSO",
        noticeId: "AAVSO-20241101-001",
        issuedAt: new Date("2024-11-01T09:00:00Z"),
        title: "Nova in Cassiopeia reaches mag 8.2",
        contentUrl: "https://www.aavso.org/nova-cas-2024",
      },
      {
        transientId: transients[2].id,
        source: "GCN",
        noticeId: "36789",
        issuedAt: new Date("2024-11-05T03:50:00Z"),
        title: "Swift detection of GRB 241105A",
        contentUrl: "https://gcn.gsfc.nasa.gov/36789.gcn3",
        contentText: "Long GRB detected by Swift BAT",
      },
    ])
    .returning();

  console.log(`✓ Created ${notices.length} notices`);

  // ===== MINOR PLANETS =====
  const mpBodies = await db
    .insert(mpBody)
    .values([
      {
        designation: "(1) Ceres",
        name: "Ceres",
        bodyType: "asteroid",
        h: 3.4,
        g: 0.12,
        orbitClass: "Main Belt",
        discovery: {
          date: "1801-01-01",
          site: "Palermo Observatory",
          discoverer: "Giuseppe Piazzi",
        },
      },
      {
        designation: "(134340) Pluto",
        name: "Pluto",
        bodyType: "tno",
        h: -0.7,
        g: 0.15,
        orbitClass: "Plutino",
        discovery: {
          date: "1930-02-18",
          site: "Lowell Observatory",
          discoverer: "Clyde Tombaugh",
        },
      },
      {
        designation: "C/2023 A3",
        name: "Tsuchinshan-ATLAS",
        bodyType: "comet",
        h: 10.5,
        orbitClass: "Long-period",
        discovery: {
          date: "2023-01-09",
          site: "Purple Mountain Observatory",
          discoverer: "Tsuchinshan + ATLAS",
        },
      },
    ])
    .returning();

  console.log(`✓ Created ${mpBodies.length} minor planet bodies`);

  // ===== EPHEMERIS =====
  const now = new Date();
  const ephemData = [];

  for (const body of mpBodies.slice(0, 2)) {
    // Generate 30 days of ephemeris
    for (let d = 0; d < 30; d++) {
      const ts = new Date(now.getTime() + d * 86400000);
      ephemData.push({
        bodyId: body.id,
        ts,
        ra: 150.0 + d * 0.5 + (body.id % 10),
        dec: 20.0 + d * 0.1,
        vmag: body.h! + 5.0 + Math.sin(d / 5.0) * 0.5,
        delta: 2.5 - d * 0.01,
        rHelio: 2.8 - d * 0.005,
        phaseAngle: 10.0 + d * 0.3,
        elongation: 90.0 + d * 2.0,
      });
    }
  }

  await db.insert(ephem).values(ephemData);
  console.log(`✓ Created ${ephemData.length} ephemeris points`);

  // ===== ORBITAL ELEMENTS =====
  const orbitElems = await db
    .insert(orbitElem)
    .values([
      {
        bodyId: mpBodies[0].id, // Ceres
        epoch: 2460000.5,
        a: 2.767,
        e: 0.0758,
        i: 10.593,
        omega: 80.329,
        w: 73.115,
        m: 95.989,
        n: 0.2141,
        source: "JPL Small-Body Database",
      },
      {
        bodyId: mpBodies[1].id, // Pluto
        epoch: 2460000.5,
        a: 39.482,
        e: 0.2488,
        i: 17.142,
        omega: 110.299,
        w: 113.834,
        m: 14.530,
        n: 0.00396,
        source: "JPL Horizons",
      },
    ])
    .returning();

  console.log(`✓ Created ${orbitElems.length} orbital elements`);

  // ===== FEATURES =====
  const features = await db
    .insert(feature)
    .values([
      {
        body: "moon",
        name: "Tycho",
        featureType: "crater",
        lat: -43.3,
        lon: -11.2,
        diameter: 85.0,
        description: "Prominent crater with extensive ray system",
        observabilityNotes: "Best at full moon, rays visible in small telescopes",
      },
      {
        body: "moon",
        name: "Mare Tranquillitatis",
        featureType: "mare",
        lat: 8.5,
        lon: 31.4,
        diameter: 873.0,
        description: "Sea of Tranquility, Apollo 11 landing site",
        observabilityNotes: "Easy target in binoculars, dark smooth surface",
      },
      {
        body: "mars",
        name: "Olympus Mons",
        featureType: "mountain",
        lat: 18.65,
        lon: -133.8,
        diameter: 600.0,
        description: "Largest volcano in the solar system",
        observabilityNotes: "Visible as bright spot at opposition with 8-inch scope",
      },
      {
        body: "jupiter",
        name: "Great Red Spot",
        featureType: "storm",
        lat: -22.0,
        lon: null,
        diameter: 16.0,
        description: "Persistent anticyclonic storm",
        observabilityNotes: "Visible in 4-inch scope, rotates into view every ~10 hours",
      },
    ])
    .returning();

  console.log(`✓ Created ${features.length} planetary features`);

  // ===== FEATURE ALIASES =====
  await db.insert(featureAka).values([
    { featureId: features[1].id, alias: "Sea of Tranquility" },
    { featureId: features[3].id, alias: "GRS" },
  ]);

  console.log(`✓ Created feature aliases`);

  // ===== STAR HOPS =====
  const hops = await db
    .insert(hop)
    .values([
      // M57 (Ring Nebula) star hop
      {
        targetName: "M57",
        targetRa: 283.396,
        targetDec: 33.029,
        waypointIdx: 0,
        waypointName: "Vega",
        waypointRa: 279.234,
        waypointDec: 38.783,
        waypointMag: 0.03,
        bearingDeg: 120.0,
        distanceDeg: 8.5,
        notes: "Start at Vega (brightest star in Lyra)",
      },
      {
        targetName: "M57",
        targetRa: 283.396,
        targetDec: 33.029,
        waypointIdx: 1,
        waypointName: "Sheliak (Beta Lyrae)",
        waypointRa: 282.52,
        waypointDec: 33.363,
        waypointMag: 3.52,
        bearingDeg: 88.0,
        distanceDeg: 1.2,
        notes: "Move to Sheliak, halfway between Vega and Gamma Lyrae",
      },
      {
        targetName: "M57",
        targetRa: 283.396,
        targetDec: 33.029,
        waypointIdx: 2,
        waypointName: "Gamma Lyrae",
        waypointRa: 284.736,
        waypointDec: 32.689,
        waypointMag: 3.24,
        bearingDeg: 270.0,
        distanceDeg: 0.5,
        notes: "M57 is midway between Beta and Gamma Lyrae",
      },
      // M31 (Andromeda Galaxy) star hop
      {
        targetName: "M31",
        targetRa: 10.685,
        targetDec: 41.269,
        waypointIdx: 0,
        waypointName: "Alpheratz",
        waypointRa: 2.097,
        waypointDec: 29.090,
        waypointMag: 2.06,
        bearingDeg: 45.0,
        distanceDeg: 14.0,
        notes: "Start at Alpheratz (corner of Great Square of Pegasus)",
      },
      {
        targetName: "M31",
        targetRa: 10.685,
        targetDec: 41.269,
        waypointIdx: 1,
        waypointName: "Mirach",
        waypointRa: 17.433,
        waypointDec: 35.621,
        waypointMag: 2.06,
        bearingDeg: 350.0,
        distanceDeg: 8.0,
        notes: "Move northeast along Andromeda to Mirach",
      },
      {
        targetName: "M31",
        targetRa: 10.685,
        targetDec: 41.269,
        waypointIdx: 2,
        waypointName: "Mu Andromedae",
        waypointRa: 11.172,
        waypointDec: 38.500,
        waypointMag: 3.87,
        bearingDeg: 15.0,
        distanceDeg: 3.5,
        notes: "M31 is just northwest of Mu Andromedae",
      },
    ])
    .returning();

  console.log(`✓ Created ${hops.length} star hop waypoints`);

  console.log("✅ Targets & Alerts seed complete!");
}
