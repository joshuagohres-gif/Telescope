import { db } from "../db";
import { starCatalog, type StarCatalog } from "@shared/sky-visualizers-schema";

// A subset of bright stars for demonstration purposes (approx Top 30)
const BRIGHT_STARS = [
  { hip: 32349, tycho: "TYC 8516-2075-1", ra: 101.28, dec: -16.71, magnitude: -1.46, bv: 0.0, properName: "Sirius", bayer: "Alpha", constellation: "CMa" },
  { hip: 30438, tycho: "TYC 8110-2667-1", ra: 95.98, dec: -52.69, magnitude: -0.74, bv: 0.15, properName: "Canopus", bayer: "Alpha", constellation: "Car" },
  { hip: 69673, tycho: "TYC 9036-1272-1", ra: 213.91, dec: 19.18, magnitude: -0.05, bv: 1.23, properName: "Arcturus", bayer: "Alpha", constellation: "Boo" },
  { hip: 71683, tycho: "TYC 8681-2232-1", ra: 219.90, dec: -60.83, magnitude: -0.01, bv: 0.71, properName: "Rigil Kentaurus", bayer: "Alpha", constellation: "Cen" },
  { hip: 91262, tycho: "TYC 3105-2075-1", ra: 279.23, dec: 38.78, magnitude: 0.03, bv: 0.00, properName: "Vega", bayer: "Alpha", constellation: "Lyr" },
  { hip: 24608, tycho: "TYC 1296-1679-1", ra: 78.63, dec: 45.99, magnitude: 0.08, bv: 0.80, properName: "Capella", bayer: "Alpha", constellation: "Aur" },
  { hip: 24436, tycho: "TYC 5899-1866-1", ra: 78.03, dec: -8.20, magnitude: 0.13, bv: -0.03, properName: "Rigel", bayer: "Beta", constellation: "Ori" },
  { hip: 37279, tycho: "TYC 2942-2286-1", ra: 114.82, dec: 5.22, magnitude: 0.34, bv: 0.42, properName: "Procyon", bayer: "Alpha", constellation: "CMi" },
  { hip: 7588, tycho: "TYC 8041-118-1", ra: 24.42, dec: -57.23, magnitude: 0.46, bv: -0.16, properName: "Achernar", bayer: "Alpha", constellation: "Eri" },
  { hip: 27989, tycho: "TYC 4766-2418-1", ra: 88.79, dec: 7.40, magnitude: 0.50, bv: 1.85, properName: "Betelgeuse", bayer: "Alpha", constellation: "Ori" },
  { hip: 68702, tycho: "TYC 8662-2009-1", ra: 210.95, dec: -60.37, magnitude: 0.61, bv: -0.23, properName: "Hadar", bayer: "Beta", constellation: "Cen" },
  { hip: 97649, tycho: "TYC 5161-2239-1", ra: 297.69, dec: 8.86, magnitude: 0.76, bv: 0.58, properName: "Altair", bayer: "Alpha", constellation: "Aql" },
  { hip: 21421, tycho: "TYC 1274-1252-1", ra: 68.98, dec: 16.50, magnitude: 0.86, bv: 1.54, properName: "Aldebaran", bayer: "Alpha", constellation: "Tau" },
  { hip: 60718, tycho: "TYC 8232-1304-1", ra: 186.64, dec: -63.09, magnitude: 0.77, bv: -0.22, properName: "Acrux", bayer: "Alpha", constellation: "Cru" },
  { hip: 80763, tycho: "TYC 8309-1134-1", ra: 247.35, dec: -26.43, magnitude: 0.91, bv: 1.40, properName: "Antares", bayer: "Alpha", constellation: "Sco" },
  { hip: 65474, tycho: "TYC 4949-1093-1", ra: 201.29, dec: -11.16, magnitude: 0.97, bv: -0.25, properName: "Spica", bayer: "Alpha", constellation: "Vir" },
  { hip: 37826, tycho: "TYC 2444-1282-1", ra: 116.32, dec: 28.02, magnitude: 1.14, bv: 1.00, properName: "Pollux", bayer: "Beta", constellation: "Gem" },
  { hip: 113368, tycho: "TYC 5831-1486-1", ra: 344.41, dec: -29.62, magnitude: 1.16, bv: 0.11, properName: "Fomalhaut", bayer: "Alpha", constellation: "PsA" },
  { hip: 100751, tycho: "TYC 3926-1215-1", ra: 306.41, dec: 45.28, magnitude: 1.25, bv: 0.09, properName: "Deneb", bayer: "Alpha", constellation: "Cyg" },
  { hip: 62434, tycho: "TYC 8638-1948-1", ra: 191.93, dec: -59.68, magnitude: 1.25, bv: -0.24, properName: "Mimosa", bayer: "Beta", constellation: "Cru" },
  { hip: 49669, tycho: "TYC 1974-1443-1", ra: 152.09, dec: 11.96, magnitude: 1.35, bv: -0.11, properName: "Regulus", bayer: "Alpha", constellation: "Leo" },
  { hip: 33579, tycho: "TYC 5968-1960-1", ra: 104.65, dec: -28.97, magnitude: 1.50, bv: -0.21, properName: "Adhara", bayer: "Epsilon", constellation: "CMa" },
  { hip: 26311, tycho: "TYC 1836-1363-1", ra: 83.85, dec: 28.60, magnitude: 1.64, bv: -0.12, properName: "Elnath", bayer: "Beta", constellation: "Tau" },
  { hip: 85927, tycho: "TYC 8718-1793-1", ra: 263.73, dec: -37.10, magnitude: 1.62, bv: -0.19, properName: "Shaula", bayer: "Lambda", constellation: "Sco" },
  { hip: 25930, tycho: "TYC 5901-1308-1", ra: 82.88, dec: -1.20, magnitude: 1.64, bv: -0.22, properName: "Bellatrix", bayer: "Gamma", constellation: "Ori" },
  { hip: 25336, tycho: "TYC 1835-1182-1", ra: 81.28, dec: 28.51, magnitude: 1.65, bv: -0.18, properName: "Alnath", bayer: "Beta", constellation: "Tau" },
  { hip: 25428, tycho: "TYC 5899-1526-1", ra: 81.57, dec: -0.29, magnitude: 1.69, bv: -0.17, properName: "Mintaka", bayer: "Delta", constellation: "Ori" },
  { hip: 26727, tycho: "TYC 5902-2306-1", ra: 85.18, dec: -1.94, magnitude: 1.69, bv: -0.22, properName: "Alnilam", bayer: "Epsilon", constellation: "Ori" },
  { hip: 27366, tycho: "TYC 5902-2258-1", ra: 86.93, dec: -9.66, magnitude: 1.72, bv: -0.18, properName: "Alnitak", bayer: "Zeta", constellation: "Ori" },
  { hip: 37447, tycho: "TYC 1907-2466-1", ra: 115.45, dec: 28.09, magnitude: 1.93, bv: 0.09, properName: "Alhena", bayer: "Gamma", constellation: "Gem" },
];

export async function importStars() {
  console.log("Importing stars...");
  
  try {
    for (const star of BRIGHT_STARS) {
      await db.insert(starCatalog).values(star).onConflictDoNothing();
    }
    console.log(`Imported ${BRIGHT_STARS.length} stars successfully.`);
  } catch (error) {
    console.error("Error importing stars:", error);
  }
}

// Run if called directly
if (require.main === module) {
  importStars().then(() => process.exit(0));
}
