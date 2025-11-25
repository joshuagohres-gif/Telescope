/**
 * Seed script for Sky Visualizers
 * Populates database with initial solar system objects and orbital data
 */

import 'dotenv/config';
import { skyVisualizersStorage } from "./sky-visualizers-storage";

const J2000 = 2451545.0;

// Major planets orbital elements (J2000.0 epoch)
const PLANET_DATA = [
  {
    name: "Mercury",
    designation: null,
    type: "planet" as const,
    elements: {
      a: 0.38709927,
      e: 0.20563593,
      i: 7.00497902,
      omega: 48.33076593,
      w: 77.45779628,
      m: 252.25032350,
      n: 4.09231735, // degrees per day
      epoch: J2000,
    },
    diameter: 4880,
    color: "#8C7853",
  },
  {
    name: "Venus",
    designation: null,
    type: "planet" as const,
    elements: {
      a: 0.72333566,
      e: 0.00677672,
      i: 3.39467605,
      omega: 76.67984255,
      w: 131.60246718,
      m: 181.97909950,
      n: 1.60213034,
      epoch: J2000,
    },
    diameter: 12104,
    color: "#FFC649",
  },
  {
    name: "Earth",
    designation: null,
    type: "planet" as const,
    elements: {
      a: 1.00000261,
      e: 0.01671123,
      i: -0.00001531,
      omega: 0.0,
      w: 102.93768193,
      m: 100.46457166,
      n: 0.9856076686,
      epoch: J2000,
    },
    diameter: 12756,
    color: "#6B93D6",
  },
  {
    name: "Mars",
    designation: null,
    type: "planet" as const,
    elements: {
      a: 1.52371034,
      e: 0.09339410,
      i: 1.84969142,
      omega: 49.55953891,
      w: -23.94362959,
      m: -4.55343205,
      n: 0.52403268,
      epoch: J2000,
    },
    diameter: 6779,
    color: "#CD5C5C",
  },
  {
    name: "Jupiter",
    designation: null,
    type: "planet" as const,
    elements: {
      a: 5.20288700,
      e: 0.04838624,
      i: 1.30439695,
      omega: 100.47390909,
      w: 14.72847983,
      m: 34.39644051,
      n: 0.0830853001,
      epoch: J2000,
    },
    diameter: 139820,
    color: "#D8CA9D",
  },
  {
    name: "Saturn",
    designation: null,
    type: "planet" as const,
    elements: {
      a: 9.53667594,
      e: 0.05386179,
      i: 2.48599187,
      omega: 113.66242448,
      w: 92.59887831,
      m: 49.95424423,
      n: 0.0334442282,
      epoch: J2000,
    },
    diameter: 116460,
    color: "#FAD5A5",
  },
  {
    name: "Uranus",
    designation: null,
    type: "planet" as const,
    elements: {
      a: 19.18916464,
      e: 0.04725744,
      i: 0.77263783,
      omega: 74.01692503,
      w: 170.95427630,
      m: 313.23810451,
      n: 0.01176903,
      epoch: J2000,
    },
    diameter: 50724,
    color: "#4FD0E7",
  },
  {
    name: "Neptune",
    designation: null,
    type: "planet" as const,
    elements: {
      a: 30.06992276,
      e: 0.00859048,
      i: 1.77004347,
      omega: 131.78422574,
      w: 44.96476227,
      m: -55.12002969,
      n: 0.00598103,
      epoch: J2000,
    },
    diameter: 49244,
    color: "#4B70DD",
  },
];

// Dwarf planets
const DWARF_PLANET_DATA = [
  {
    name: "Ceres",
    designation: "1",
    type: "dwarf_planet" as const,
    elements: {
      a: 2.7653,
      e: 0.07934,
      i: 10.5867,
      omega: 80.3932,
      w: 73.5977,
      m: 77.3721,
      n: 0.214,
      epoch: J2000,
    },
    diameter: 939,
    color: "#A0A0A0",
  },
  {
    name: "Pluto",
    designation: "134340",
    type: "dwarf_planet" as const,
    elements: {
      a: 39.482,
      e: 0.2488,
      i: 17.16,
      omega: 110.299,
      w: 113.834,
      m: 14.53,
      n: 0.00396,
      epoch: J2000,
    },
    diameter: 2374,
    color: "#C9B037",
  },
];

export async function seedSkyVisualizers() {
  console.log("Seeding Sky Visualizers data...");

  // Seed planets
  for (const planet of PLANET_DATA) {
    const object = await skyVisualizersStorage.upsertObject({
      name: planet.name,
      designation: planet.designation,
      type: planet.type,
      diameter: planet.diameter,
      color: planet.color,
      source: "JPL",
      description: `${planet.name} - ${planet.type}`,
    });

    await skyVisualizersStorage.upsertOrbitalData({
      objectId: object.id,
      epoch: planet.elements.epoch,
      a: planet.elements.a,
      e: planet.elements.e,
      i: planet.elements.i,
      omega: planet.elements.omega,
      w: planet.elements.w,
      m: planet.elements.m,
      n: planet.elements.n,
      source: "JPL",
    });

    console.log(`✓ Seeded ${planet.name}`);
  }

  // Seed dwarf planets
  for (const dwarf of DWARF_PLANET_DATA) {
    const object = await skyVisualizersStorage.upsertObject({
      name: dwarf.name,
      designation: dwarf.designation,
      type: dwarf.type,
      diameter: dwarf.diameter,
      color: dwarf.color,
      source: "JPL",
      description: `${dwarf.name} - ${dwarf.type}`,
    });

    await skyVisualizersStorage.upsertOrbitalData({
      objectId: object.id,
      epoch: dwarf.elements.epoch,
      a: dwarf.elements.a,
      e: dwarf.elements.e,
      i: dwarf.elements.i,
      omega: dwarf.elements.omega,
      w: dwarf.elements.w,
      m: dwarf.elements.m,
      n: dwarf.elements.n,
      source: "JPL",
    });

    console.log(`✓ Seeded ${dwarf.name}`);
  }

  console.log("✓ Sky Visualizers seeding complete!");
}

// Run seed
seedSkyVisualizers()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error seeding:", err);
    process.exit(1);
  });
