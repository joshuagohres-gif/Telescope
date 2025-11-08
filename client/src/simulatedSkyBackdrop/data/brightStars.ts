/**
 * Catalog of the 250 brightest stars
 * Data from Hipparcos/Yale Bright Star Catalog
 *
 * Coordinates are J2000.0 epoch
 * pmRA already includes cos(dec) factor
 */

export interface StarData {
  name: string;
  ra: number;      // Right Ascension (radians)
  dec: number;     // Declination (radians)
  magV: number;    // Visual magnitude
  pmRA: number;    // Proper motion in RA (mas/yr, includes cos(dec))
  pmDec: number;   // Proper motion in Dec (mas/yr)
  colorIndex: number; // B-V color index
}

// Top 250 brightest stars
export const BRIGHT_STARS: StarData[] = [
  {
    name: "Sirius",
    ra: 101.287 * Math.PI / 180,
    dec: -16.716 * Math.PI / 180,
    magV: -1.46,
    pmRA: -546.01,
    pmDec: -1223.07,
    colorIndex: 0.00
  },
  {
    name: "Canopus",
    ra: 95.988 * Math.PI / 180,
    dec: -52.696 * Math.PI / 180,
    magV: -0.72,
    pmRA: 19.93,
    pmDec: 23.24,
    colorIndex: 0.15
  },
  {
    name: "Alpha Centauri",
    ra: 219.902 * Math.PI / 180,
    dec: -60.834 * Math.PI / 180,
    magV: -0.27,
    pmRA: -3678.19,
    pmDec: 481.84,
    colorIndex: 0.71
  },
  {
    name: "Arcturus",
    ra: 213.915 * Math.PI / 180,
    dec: 19.182 * Math.PI / 180,
    magV: -0.04,
    pmRA: -1093.45,
    pmDec: -1999.40,
    colorIndex: 1.23
  },
  {
    name: "Vega",
    ra: 279.234 * Math.PI / 180,
    dec: 38.783 * Math.PI / 180,
    magV: 0.03,
    pmRA: 200.94,
    pmDec: 286.23,
    colorIndex: 0.00
  },
  {
    name: "Capella",
    ra: 79.172 * Math.PI / 180,
    dec: 45.998 * Math.PI / 180,
    magV: 0.08,
    pmRA: 75.52,
    pmDec: -426.89,
    colorIndex: 0.80
  },
  {
    name: "Rigel",
    ra: 78.634 * Math.PI / 180,
    dec: -8.202 * Math.PI / 180,
    magV: 0.12,
    pmRA: 1.87,
    pmDec: -0.56,
    colorIndex: -0.03
  },
  {
    name: "Procyon",
    ra: 114.825 * Math.PI / 180,
    dec: 5.225 * Math.PI / 180,
    magV: 0.38,
    pmRA: -714.59,
    pmDec: -1036.80,
    colorIndex: 0.42
  },
  {
    name: "Achernar",
    ra: 24.429 * Math.PI / 180,
    dec: -57.237 * Math.PI / 180,
    magV: 0.46,
    pmRA: 88.02,
    pmDec: -40.08,
    colorIndex: -0.16
  },
  {
    name: "Betelgeuse",
    ra: 88.793 * Math.PI / 180,
    dec: 7.407 * Math.PI / 180,
    magV: 0.50,
    pmRA: 27.33,
    pmDec: 10.86,
    colorIndex: 1.85
  },
  {
    name: "Hadar",
    ra: 210.956 * Math.PI / 180,
    dec: -60.373 * Math.PI / 180,
    magV: 0.61,
    pmRA: -33.96,
    pmDec: -22.81,
    colorIndex: -0.23
  },
  {
    name: "Altair",
    ra: 297.696 * Math.PI / 180,
    dec: 8.868 * Math.PI / 180,
    magV: 0.77,
    pmRA: 536.23,
    pmDec: 385.29,
    colorIndex: 0.22
  },
  {
    name: "Acrux",
    ra: 186.650 * Math.PI / 180,
    dec: -63.099 * Math.PI / 180,
    magV: 0.77,
    pmRA: -35.37,
    pmDec: -11.95,
    colorIndex: -0.24
  },
  {
    name: "Aldebaran",
    ra: 68.980 * Math.PI / 180,
    dec: 16.509 * Math.PI / 180,
    magV: 0.85,
    pmRA: 62.78,
    pmDec: -189.36,
    colorIndex: 1.54
  },
  {
    name: "Spica",
    ra: 201.298 * Math.PI / 180,
    dec: -11.161 * Math.PI / 180,
    magV: 0.98,
    pmRA: -42.50,
    pmDec: -31.73,
    colorIndex: -0.23
  },
  {
    name: "Antares",
    ra: 247.352 * Math.PI / 180,
    dec: -26.432 * Math.PI / 180,
    magV: 1.09,
    pmRA: -12.11,
    pmDec: -23.30,
    colorIndex: 1.83
  },
  {
    name: "Pollux",
    ra: 116.329 * Math.PI / 180,
    dec: 28.026 * Math.PI / 180,
    magV: 1.14,
    pmRA: -626.55,
    pmDec: -45.80,
    colorIndex: 1.00
  },
  {
    name: "Fomalhaut",
    ra: 344.413 * Math.PI / 180,
    dec: -29.622 * Math.PI / 180,
    magV: 1.16,
    pmRA: 329.22,
    pmDec: -164.22,
    colorIndex: 0.09
  },
  {
    name: "Deneb",
    ra: 310.358 * Math.PI / 180,
    dec: 45.280 * Math.PI / 180,
    magV: 1.25,
    pmRA: 1.99,
    pmDec: 1.95,
    colorIndex: 0.09
  },
  {
    name: "Mimosa",
    ra: 191.930 * Math.PI / 180,
    dec: -59.689 * Math.PI / 180,
    magV: 1.25,
    pmRA: -42.16,
    pmDec: -15.58,
    colorIndex: -0.23
  },
  {
    name: "Regulus",
    ra: 152.093 * Math.PI / 180,
    dec: 11.967 * Math.PI / 180,
    magV: 1.35,
    pmRA: -249.40,
    pmDec: 4.91,
    colorIndex: -0.11
  },
  {
    name: "Adhara",
    ra: 104.656 * Math.PI / 180,
    dec: -28.972 * Math.PI / 180,
    magV: 1.50,
    pmRA: 2.63,
    pmDec: 2.29,
    colorIndex: -0.21
  },
  {
    name: "Castor",
    ra: 113.650 * Math.PI / 180,
    dec: 31.888 * Math.PI / 180,
    magV: 1.57,
    pmRA: -191.45,
    pmDec: -145.19,
    colorIndex: 0.03
  },
  {
    name: "Gacrux",
    ra: 187.792 * Math.PI / 180,
    dec: -57.113 * Math.PI / 180,
    magV: 1.63,
    pmRA: 27.94,
    pmDec: -264.58,
    colorIndex: 1.59
  },
  {
    name: "Shaula",
    ra: 263.402 * Math.PI / 180,
    dec: -37.104 * Math.PI / 180,
    magV: 1.63,
    pmRA: -8.90,
    pmDec: -29.95,
    colorIndex: -0.23
  },
  {
    name: "Bellatrix",
    ra: 81.283 * Math.PI / 180,
    dec: 6.350 * Math.PI / 180,
    magV: 1.64,
    pmRA: -8.11,
    pmDec: -12.88,
    colorIndex: -0.22
  },
  {
    name: "Elnath",
    ra: 81.573 * Math.PI / 180,
    dec: 28.608 * Math.PI / 180,
    magV: 1.65,
    pmRA: 23.28,
    pmDec: -174.22,
    colorIndex: -0.13
  },
  {
    name: "Miaplacidus",
    ra: 138.300 * Math.PI / 180,
    dec: -69.717 * Math.PI / 180,
    magV: 1.68,
    pmRA: 156.47,
    pmDec: 108.91,
    colorIndex: -0.04
  },
  {
    name: "Alnilam",
    ra: 84.053 * Math.PI / 180,
    dec: -1.202 * Math.PI / 180,
    magV: 1.69,
    pmRA: 1.49,
    pmDec: -1.06,
    colorIndex: -0.18
  },
  {
    name: "Al Nair",
    ra: 332.058 * Math.PI / 180,
    dec: -46.961 * Math.PI / 180,
    magV: 1.74,
    pmRA: 127.60,
    pmDec: -147.91,
    colorIndex: -0.13
  },
  {
    name: "Alioth",
    ra: 193.507 * Math.PI / 180,
    dec: 55.960 * Math.PI / 180,
    magV: 1.77,
    pmRA: 111.91,
    pmDec: -8.24,
    colorIndex: -0.02
  },
  {
    name: "Mirfak",
    ra: 51.080 * Math.PI / 180,
    dec: 49.861 * Math.PI / 180,
    magV: 1.79,
    pmRA: 23.75,
    pmDec: -26.01,
    colorIndex: 0.48
  },
  {
    name: "Dubhe",
    ra: 165.932 * Math.PI / 180,
    dec: 61.751 * Math.PI / 180,
    magV: 1.79,
    pmRA: -134.11,
    pmDec: -34.70,
    colorIndex: 1.06
  },
  {
    name: "Wezen",
    ra: 107.098 * Math.PI / 180,
    dec: -26.393 * Math.PI / 180,
    magV: 1.84,
    pmRA: -3.11,
    pmDec: 3.31,
    colorIndex: 0.66
  },
  {
    name: "Alkaid",
    ra: 206.885 * Math.PI / 180,
    dec: 49.313 * Math.PI / 180,
    magV: 1.86,
    pmRA: -121.23,
    pmDec: -14.91,
    colorIndex: -0.19
  },
  {
    name: "Sargas",
    ra: 264.330 * Math.PI / 180,
    dec: -42.998 * Math.PI / 180,
    magV: 1.87,
    pmRA: -6.48,
    pmDec: -23.68,
    colorIndex: 0.63
  },
  {
    name: "Avior",
    ra: 125.629 * Math.PI / 180,
    dec: -59.509 * Math.PI / 180,
    magV: 1.86,
    pmRA: -25.34,
    pmDec: 22.72,
    colorIndex: 1.28
  },
  {
    name: "Menkalinan",
    ra: 89.882 * Math.PI / 180,
    dec: 44.947 * Math.PI / 180,
    magV: 1.90,
    pmRA: -56.32,
    pmDec: -0.09,
    colorIndex: 0.08
  },
  {
    name: "Atria",
    ra: 253.415 * Math.PI / 180,
    dec: -69.028 * Math.PI / 180,
    magV: 1.92,
    pmRA: 17.99,
    pmDec: -32.92,
    colorIndex: 1.28
  },
  {
    name: "Alhena",
    ra: 99.428 * Math.PI / 180,
    dec: 16.399 * Math.PI / 180,
    magV: 1.93,
    pmRA: -2.04,
    pmDec: -68.40,
    colorIndex: 0.00
  },
  {
    name: "Peacock",
    ra: 306.412 * Math.PI / 180,
    dec: -56.735 * Math.PI / 180,
    magV: 1.94,
    pmRA: 7.71,
    pmDec: -86.15,
    colorIndex: -0.13
  },
  {
    name: "Polaris",
    ra: 37.955 * Math.PI / 180,
    dec: 89.264 * Math.PI / 180,
    magV: 1.98,
    pmRA: 44.48,
    pmDec: -11.85,
    colorIndex: 0.60
  },
  {
    name: "Mirzam",
    ra: 95.675 * Math.PI / 180,
    dec: -17.956 * Math.PI / 180,
    magV: 1.98,
    pmRA: -3.45,
    pmDec: -0.46,
    colorIndex: -0.23
  },
  {
    name: "Alphard",
    ra: 141.897 * Math.PI / 180,
    dec: -8.659 * Math.PI / 180,
    magV: 1.98,
    pmRA: -14.49,
    pmDec: 33.25,
    colorIndex: 1.44
  },
  {
    name: "Algieba",
    ra: 154.993 * Math.PI / 180,
    dec: 19.842 * Math.PI / 180,
    magV: 1.99,
    pmRA: 310.77,
    pmDec: -152.60,
    colorIndex: 1.14
  },
  {
    name: "Hamal",
    ra: 31.793 * Math.PI / 180,
    dec: 23.462 * Math.PI / 180,
    magV: 2.00,
    pmRA: 190.73,
    pmDec: -145.77,
    colorIndex: 1.15
  },
  {
    name: "Diphda",
    ra: 10.897 * Math.PI / 180,
    dec: -17.987 * Math.PI / 180,
    magV: 2.04,
    pmRA: 232.79,
    pmDec: 32.71,
    colorIndex: 1.02
  },
  {
    name: "Nunki",
    ra: 283.816 * Math.PI / 180,
    dec: -26.297 * Math.PI / 180,
    magV: 2.02,
    pmRA: 13.87,
    pmDec: -52.65,
    colorIndex: -0.13
  },
  {
    name: "Menkent",
    ra: 211.671 * Math.PI / 180,
    dec: -36.370 * Math.PI / 180,
    magV: 2.06,
    pmRA: -519.29,
    pmDec: -517.87,
    colorIndex: 1.02
  },
  {
    name: "Alpheratz",
    ra: 2.097 * Math.PI / 180,
    dec: 29.091 * Math.PI / 180,
    magV: 2.06,
    pmRA: 137.46,
    pmDec: -162.95,
    colorIndex: -0.11
  },
  {
    name: "Mirach",
    ra: 17.433 * Math.PI / 180,
    dec: 35.621 * Math.PI / 180,
    magV: 2.06,
    pmRA: 175.59,
    pmDec: -112.23,
    colorIndex: 1.57
  },
  {
    name: "Kochab",
    ra: 222.676 * Math.PI / 180,
    dec: 74.156 * Math.PI / 180,
    magV: 2.08,
    pmRA: -32.29,
    pmDec: 11.42,
    colorIndex: 1.47
  },
  {
    name: "Rasalhague",
    ra: 263.734 * Math.PI / 180,
    dec: 12.560 * Math.PI / 180,
    magV: 2.08,
    pmRA: 110.08,
    pmDec: -222.61,
    colorIndex: 0.15
  },
  {
    name: "Saiph",
    ra: 86.939 * Math.PI / 180,
    dec: -9.670 * Math.PI / 180,
    magV: 2.09,
    pmRA: 1.46,
    pmDec: -1.20,
    colorIndex: -0.18
  },
  {
    name: "Algol",
    ra: 47.042 * Math.PI / 180,
    dec: 40.956 * Math.PI / 180,
    magV: 2.12,
    pmRA: 2.39,
    pmDec: -1.44,
    colorIndex: -0.05
  },
  {
    name: "Denebola",
    ra: 177.265 * Math.PI / 180,
    dec: 14.572 * Math.PI / 180,
    magV: 2.14,
    pmRA: -499.02,
    pmDec: -113.78,
    colorIndex: 0.09
  },
  {
    name: "Almach",
    ra: 30.975 * Math.PI / 180,
    dec: 42.330 * Math.PI / 180,
    magV: 2.16,
    pmRA: 43.08,
    pmDec: -50.85,
    colorIndex: 1.37
  },
  {
    name: "Kaus Australis",
    ra: 275.249 * Math.PI / 180,
    dec: -34.385 * Math.PI / 180,
    magV: 2.18,
    pmRA: -39.42,
    pmDec: -124.20,
    colorIndex: -0.11
  },
  {
    name: "Eltanin",
    ra: 269.152 * Math.PI / 180,
    dec: 51.489 * Math.PI / 180,
    magV: 2.23,
    pmRA: -8.48,
    pmDec: -22.79,
    colorIndex: 1.52
  },
  {
    name: "Schedar",
    ra: 10.127 * Math.PI / 180,
    dec: 56.537 * Math.PI / 180,
    magV: 2.24,
    pmRA: 50.36,
    pmDec: -32.13,
    colorIndex: 1.17
  },
  {
    name: "Naos",
    ra: 120.896 * Math.PI / 180,
    dec: -40.003 * Math.PI / 180,
    magV: 2.25,
    pmRA: -3.30,
    pmDec: 16.77,
    colorIndex: -0.16
  },
  {
    name: "Mintaka",
    ra: 83.002 * Math.PI / 180,
    dec: -0.299 * Math.PI / 180,
    magV: 2.23,
    pmRA: 0.56,
    pmDec: -0.71,
    colorIndex: -0.22
  },
  {
    name: "Alnair",
    ra: 332.058 * Math.PI / 180,
    dec: -46.961 * Math.PI / 180,
    magV: 2.24,
    pmRA: 127.60,
    pmDec: -147.91,
    colorIndex: -0.13
  },
  {
    name: "Caph",
    ra: 2.295 * Math.PI / 180,
    dec: 59.150 * Math.PI / 180,
    magV: 2.27,
    pmRA: 523.39,
    pmDec: -179.77,
    colorIndex: 0.34
  },
  {
    name: "Izar",
    ra: 210.956 * Math.PI / 180,
    dec: 27.074 * Math.PI / 180,
    magV: 2.35,
    pmRA: -9.37,
    pmDec: 3.42,
    colorIndex: 1.17
  },
  {
    name: "Alnitak",
    ra: 85.190 * Math.PI / 180,
    dec: -1.943 * Math.PI / 180,
    magV: 2.03,
    pmRA: 3.19,
    pmDec: 2.54,
    colorIndex: -0.20
  },
  {
    name: "Mizar",
    ra: 200.981 * Math.PI / 180,
    dec: 54.925 * Math.PI / 180,
    magV: 2.27,
    pmRA: 121.23,
    pmDec: -22.01,
    colorIndex: 0.06
  },
  {
    name: "Markab",
    ra: 346.190 * Math.PI / 180,
    dec: 15.205 * Math.PI / 180,
    magV: 2.49,
    pmRA: 61.10,
    pmDec: -42.56,
    colorIndex: -0.02
  },
  {
    name: "Zubenelgenubi",
    ra: 222.720 * Math.PI / 180,
    dec: -16.042 * Math.PI / 180,
    magV: 2.75,
    pmRA: -105.69,
    pmDec: -68.40,
    colorIndex: 0.15
  },
  {
    name: "Albireo",
    ra: 292.680 * Math.PI / 180,
    dec: 27.960 * Math.PI / 180,
    magV: 3.09,
    pmRA: 7.17,
    pmDec: -6.23,
    colorIndex: 1.09
  },
  {
    name: "Scheat",
    ra: 345.943 * Math.PI / 180,
    dec: 28.083 * Math.PI / 180,
    magV: 2.42,
    pmRA: 187.76,
    pmDec: 137.61,
    colorIndex: 1.67
  },
  {
    name: "Sadr",
    ra: 305.557 * Math.PI / 180,
    dec: 40.257 * Math.PI / 180,
    magV: 2.20,
    pmRA: 2.43,
    pmDec: -0.93,
    colorIndex: 0.67
  },
  {
    name: "Kaus Media",
    ra: 271.452 * Math.PI / 180,
    dec: -29.828 * Math.PI / 180,
    magV: 2.70,
    pmRA: -53.43,
    pmDec: -184.41,
    colorIndex: 1.06
  },
  {
    name: "Rasalgethi",
    ra: 258.662 * Math.PI / 180,
    dec: 14.390 * Math.PI / 180,
    magV: 3.48,
    pmRA: -6.71,
    pmDec: 32.78,
    colorIndex: 1.56
  },
  {
    name: "Enif",
    ra: 326.046 * Math.PI / 180,
    dec: 9.875 * Math.PI / 180,
    magV: 2.39,
    pmRA: 30.02,
    pmDec: 1.39,
    colorIndex: 1.53
  },
  {
    name: "Ankaa",
    ra: 6.571 * Math.PI / 180,
    dec: -42.306 * Math.PI / 180,
    magV: 2.39,
    pmRA: 232.76,
    pmDec: -353.62,
    colorIndex: 1.09
  },
  {
    name: "Sabik",
    ra: 265.868 * Math.PI / 180,
    dec: -15.725 * Math.PI / 180,
    magV: 2.43,
    pmRA: 41.16,
    pmDec: 97.65,
    colorIndex: 0.37
  },
  {
    name: "Phecda",
    ra: 183.856 * Math.PI / 180,
    dec: 53.695 * Math.PI / 180,
    magV: 2.44,
    pmRA: 107.68,
    pmDec: 11.01,
    colorIndex: 0.09
  },
  {
    name: "Megrez",
    ra: 183.857 * Math.PI / 180,
    dec: 57.033 * Math.PI / 180,
    magV: 3.31,
    pmRA: 103.56,
    pmDec: 7.81,
    colorIndex: 0.05
  },
  {
    name: "Merak",
    ra: 165.460 * Math.PI / 180,
    dec: 56.382 * Math.PI / 180,
    magV: 2.37,
    pmRA: 81.43,
    pmDec: 33.74,
    colorIndex: 0.03
  },
  {
    name: "Alphecca",
    ra: 233.672 * Math.PI / 180,
    dec: 26.715 * Math.PI / 180,
    magV: 2.23,
    pmRA: 120.38,
    pmDec: -89.44,
    colorIndex: 0.02
  },
  {
    name: "Alderamin",
    ra: 319.644 * Math.PI / 180,
    dec: 62.585 * Math.PI / 180,
    magV: 2.44,
    pmRA: 149.91,
    pmDec: 48.27,
    colorIndex: 0.22
  },
  {
    name: "Acamar",
    ra: 44.565 * Math.PI / 180,
    dec: -40.305 * Math.PI / 180,
    magV: 2.88,
    pmRA: 87.00,
    pmDec: -40.08,
    colorIndex: 0.20
  },
  {
    name: "Menkar",
    ra: 45.570 * Math.PI / 180,
    dec: 4.090 * Math.PI / 180,
    magV: 2.53,
    pmRA: -10.41,
    pmDec: -78.76,
    colorIndex: 1.64
  },
  {
    name: "Kornephoros",
    ra: 247.555 * Math.PI / 180,
    dec: 21.489 * Math.PI / 180,
    magV: 2.78,
    pmRA: -99.60,
    pmDec: 17.98,
    colorIndex: 0.91
  },
  {
    name: "Gienah",
    ra: 185.986 * Math.PI / 180,
    dec: -17.542 * Math.PI / 180,
    magV: 2.59,
    pmRA: -159.58,
    pmDec: 22.31,
    colorIndex: -0.11
  },
  {
    name: "Zubeneschamali",
    ra: 229.252 * Math.PI / 180,
    dec: -9.383 * Math.PI / 180,
    magV: 2.61,
    pmRA: -99.90,
    pmDec: -19.91,
    colorIndex: -0.10
  },
  {
    name: "Kaus Borealis",
    ra: 274.408 * Math.PI / 180,
    dec: -25.422 * Math.PI / 180,
    magV: 2.81,
    pmRA: -42.30,
    pmDec: -95.65,
    colorIndex: 1.03
  },
  {
    name: "Vindemiatrix",
    ra: 195.545 * Math.PI / 180,
    dec: 10.959 * Math.PI / 180,
    magV: 2.85,
    pmRA: -273.17,
    pmDec: 19.82,
    colorIndex: 0.95
  },
  {
    name: "Menkib",
    ra: 46.308 * Math.PI / 180,
    dec: 35.791 * Math.PI / 180,
    magV: 2.89,
    pmRA: 2.30,
    pmDec: -1.44,
    colorIndex: -0.18
  },
  {
    name: "Unukalhai",
    ra: 236.067 * Math.PI / 180,
    dec: 6.426 * Math.PI / 180,
    magV: 2.65,
    pmRA: 134.63,
    pmDec: 46.27,
    colorIndex: 1.17
  },
  {
    name: "Dschubba",
    ra: 241.359 * Math.PI / 180,
    dec: -22.622 * Math.PI / 180,
    magV: 2.32,
    pmRA: -7.12,
    pmDec: -26.36,
    colorIndex: -0.09
  },
  {
    name: "Aludra",
    ra: 111.024 * Math.PI / 180,
    dec: -29.303 * Math.PI / 180,
    magV: 2.45,
    pmRA: -2.04,
    pmDec: 1.35,
    colorIndex: -0.21
  },
  {
    name: "Kraz",
    ra: 188.597 * Math.PI / 180,
    dec: -23.397 * Math.PI / 180,
    magV: 2.59,
    pmRA: -24.59,
    pmDec: 5.15,
    colorIndex: 1.00
  },
  {
    name: "Alcor",
    ra: 201.307 * Math.PI / 180,
    dec: 54.988 * Math.PI / 180,
    magV: 3.99,
    pmRA: 119.01,
    pmDec: -25.97,
    colorIndex: 0.21
  },
  {
    name: "Thuban",
    ra: 211.097 * Math.PI / 180,
    dec: 64.376 * Math.PI / 180,
    magV: 3.65,
    pmRA: -56.34,
    pmDec: 17.21,
    colorIndex: 0.04
  },
  {
    name: "Alshain",
    ra: 296.565 * Math.PI / 180,
    dec: 6.407 * Math.PI / 180,
    magV: 3.71,
    pmRA: 46.35,
    pmDec: 147.47,
    colorIndex: 0.45
  },
  {
    name: "Tarazed",
    ra: 296.565 * Math.PI / 180,
    dec: 10.613 * Math.PI / 180,
    magV: 2.72,
    pmRA: 15.72,
    pmDec: -2.30,
    colorIndex: 1.51
  },
  {
    name: "Muphrid",
    ra: 203.673 * Math.PI / 180,
    dec: 18.398 * Math.PI / 180,
    magV: 2.68,
    pmRA: -42.89,
    pmDec: -15.16,
    colorIndex: 0.56
  },
  {
    name: "Ascella",
    ra: 281.414 * Math.PI / 180,
    dec: -29.880 * Math.PI / 180,
    magV: 2.60,
    pmRA: 21.00,
    pmDec: -25.19,
    colorIndex: 0.08
  },
  {
    name: "Sheratan",
    ra: 28.660 * Math.PI / 180,
    dec: 20.808 * Math.PI / 180,
    magV: 2.64,
    pmRA: 98.74,
    pmDec: -109.65,
    colorIndex: 0.15
  },
  {
    name: "Phact",
    ra: 84.912 * Math.PI / 180,
    dec: -34.074 * Math.PI / 180,
    magV: 2.65,
    pmRA: -24.34,
    pmDec: 20.52,
    colorIndex: -0.11
  },
  {
    name: "Aljanah",
    ra: 305.628 * Math.PI / 180,
    dec: 33.970 * Math.PI / 180,
    magV: 2.87,
    pmRA: 3.62,
    pmDec: 0.49,
    colorIndex: 1.03
  },
  {
    name: "Ruchbah",
    ra: 22.817 * Math.PI / 180,
    dec: 60.235 * Math.PI / 180,
    magV: 2.68,
    pmRA: 25.50,
    pmDec: -15.77,
    colorIndex: 0.07
  },
  {
    name: "Deneb Algedi",
    ra: 326.760 * Math.PI / 180,
    dec: -16.127 * Math.PI / 180,
    magV: 2.87,
    pmRA: 261.74,
    pmDec: -296.70,
    colorIndex: 0.99
  },
  {
    name: "Meissa",
    ra: 83.785 * Math.PI / 180,
    dec: 9.934 * Math.PI / 180,
    magV: 3.39,
    pmRA: 1.77,
    pmDec: -2.17,
    colorIndex: -0.18
  },
  {
    name: "Turais",
    ra: 134.058 * Math.PI / 180,
    dec: -59.276 * Math.PI / 180,
    magV: 2.97,
    pmRA: -19.93,
    pmDec: 13.52,
    colorIndex: 0.44
  },
  {
    name: "Muscida",
    ra: 139.273 * Math.PI / 180,
    dec: 69.831 * Math.PI / 180,
    magV: 3.05,
    pmRA: -154.37,
    pmDec: -4.46,
    colorIndex: 1.09
  },
  {
    name: "Talitha",
    ra: 134.802 * Math.PI / 180,
    dec: 48.042 * Math.PI / 180,
    magV: 3.12,
    pmRA: -56.40,
    pmDec: 33.74,
    colorIndex: 0.06
  },
  {
    name: "Propus",
    ra: 93.719 * Math.PI / 180,
    dec: 22.514 * Math.PI / 180,
    magV: 3.35,
    pmRA: -18.08,
    pmDec: -8.32,
    colorIndex: 1.59
  },
  {
    name: "Cebalrai",
    ra: 257.595 * Math.PI / 180,
    dec: 4.567 * Math.PI / 180,
    magV: 2.76,
    pmRA: 39.64,
    pmDec: 153.39,
    colorIndex: 1.03
  },
  {
    name: "Sheliak",
    ra: 284.736 * Math.PI / 180,
    dec: 33.363 * Math.PI / 180,
    magV: 3.52,
    pmRA: 1.90,
    pmDec: -3.53,
    colorIndex: -0.03
  },
  {
    name: "Nihal",
    ra: 88.129 * Math.PI / 180,
    dec: -20.759 * Math.PI / 180,
    magV: 2.84,
    pmRA: -4.03,
    pmDec: -85.92,
    colorIndex: 0.82
  },
  {
    name: "Suhail",
    ra: 136.999 * Math.PI / 180,
    dec: -43.432 * Math.PI / 180,
    magV: 2.21,
    pmRA: -23.21,
    pmDec: 14.28,
    colorIndex: 1.66
  },
  {
    name: "Alula Australis",
    ra: 169.620 * Math.PI / 180,
    dec: 38.319 * Math.PI / 180,
    magV: 3.79,
    pmRA: -48.08,
    pmDec: -19.85,
    colorIndex: 1.03
  },
  {
    name: "Mesarthim",
    ra: 27.712 * Math.PI / 180,
    dec: 19.295 * Math.PI / 180,
    magV: 3.88,
    pmRA: 73.80,
    pmDec: -111.96,
    colorIndex: 0.12
  },
  {
    name: "Cursa",
    ra: 62.967 * Math.PI / 180,
    dec: -5.164 * Math.PI / 180,
    magV: 2.79,
    pmRA: -74.79,
    pmDec: -77.54,
    colorIndex: 0.09
  },
  {
    name: "Alula Borealis",
    ra: 168.527 * Math.PI / 180,
    dec: 41.500 * Math.PI / 180,
    magV: 3.49,
    pmRA: -360.45,
    pmDec: 309.17,
    colorIndex: 1.16
  },
  {
    name: "Lesath",
    ra: 264.737 * Math.PI / 180,
    dec: -37.295 * Math.PI / 180,
    magV: 2.69,
    pmRA: -2.78,
    pmDec: -21.65,
    colorIndex: -0.22
  },
  {
    name: "Sarin",
    ra: 261.324 * Math.PI / 180,
    dec: -39.030 * Math.PI / 180,
    magV: 2.89,
    pmRA: -7.60,
    pmDec: -27.59,
    colorIndex: 0.66
  },
  {
    name: "Atik",
    ra: 55.731 * Math.PI / 180,
    dec: 32.288 * Math.PI / 180,
    magV: 3.77,
    pmRA: 24.91,
    pmDec: -26.01,
    colorIndex: -0.16
  },
  {
    name: "Zaurak",
    ra: 60.173 * Math.PI / 180,
    dec: -13.508 * Math.PI / 180,
    magV: 2.95,
    pmRA: 19.66,
    pmDec: 3.47,
    colorIndex: 1.62
  },
  {
    name: "Mebsuta",
    ra: 100.983 * Math.PI / 180,
    dec: 25.131 * Math.PI / 180,
    magV: 3.06,
    pmRA: -7.68,
    pmDec: -8.70,
    colorIndex: 0.86
  },
  {
    name: "Wasat",
    ra: 110.031 * Math.PI / 180,
    dec: 22.007 * Math.PI / 180,
    magV: 3.50,
    pmRA: -181.16,
    pmDec: -12.63,
    colorIndex: 0.48
  },
  {
    name: "Adhafera",
    ra: 156.525 * Math.PI / 180,
    dec: 23.417 * Math.PI / 180,
    magV: 3.44,
    pmRA: -7.61,
    pmDec: -13.24,
    colorIndex: 0.13
  },
  {
    name: "Tejat",
    ra: 94.282 * Math.PI / 180,
    dec: 22.513 * Math.PI / 180,
    magV: 2.88,
    pmRA: -10.07,
    pmDec: -6.59,
    colorIndex: 1.57
  },
  {
    name: "Arneb",
    ra: 83.006 * Math.PI / 180,
    dec: -17.822 * Math.PI / 180,
    magV: 2.58,
    pmRA: -1.16,
    pmDec: -2.46,
    colorIndex: 0.21
  },
  {
    name: "Alya",
    ra: 285.654 * Math.PI / 180,
    dec: -12.544 * Math.PI / 180,
    magV: 4.06,
    pmRA: -0.42,
    pmDec: -6.95,
    colorIndex: 0.00
  },
  {
    name: "Yed Prior",
    ra: 248.971 * Math.PI / 180,
    dec: -3.694 * Math.PI / 180,
    magV: 2.73,
    pmRA: 38.35,
    pmDec: 153.78,
    colorIndex: 1.24
  },
  {
    name: "Yed Posterior",
    ra: 249.288 * Math.PI / 180,
    dec: -2.898 * Math.PI / 180,
    magV: 2.99,
    pmRA: -46.12,
    pmDec: 128.93,
    colorIndex: 0.99
  },
  {
    name: "Keid",
    ra: 64.948 * Math.PI / 180,
    dec: -7.652 * Math.PI / 180,
    magV: 4.43,
    pmRA: -1071.41,
    pmDec: 64.95,
    colorIndex: 0.88
  },
  {
    name: "Zaniah",
    ra: 187.007 * Math.PI / 180,
    dec: -0.666 * Math.PI / 180,
    magV: 3.38,
    pmRA: -274.78,
    pmDec: 11.16,
    colorIndex: 0.14
  },
  {
    name: "Porrima",
    ra: 190.415 * Math.PI / 180,
    dec: -1.449 * Math.PI / 180,
    magV: 2.74,
    pmRA: -616.42,
    pmDec: -58.96,
    colorIndex: 0.36
  },
  {
    name: "Tseen Ke",
    ra: 180.653 * Math.PI / 180,
    dec: 6.419 * Math.PI / 180,
    magV: 3.48,
    pmRA: -493.92,
    pmDec: -61.40,
    colorIndex: 0.46
  },
  {
    name: "Skat",
    ra: 322.890 * Math.PI / 180,
    dec: -15.821 * Math.PI / 180,
    magV: 3.27,
    pmRA: 19.49,
    pmDec: -1.60,
    colorIndex: 0.12
  },
  {
    name: "Nashira",
    ra: 325.023 * Math.PI / 180,
    dec: -16.662 * Math.PI / 180,
    magV: 3.68,
    pmRA: 46.91,
    pmDec: -21.85,
    colorIndex: 0.52
  },
  {
    name: "Algorab",
    ra: 188.197 * Math.PI / 180,
    dec: -16.515 * Math.PI / 180,
    magV: 2.95,
    pmRA: -232.55,
    pmDec: -8.99,
    colorIndex: -0.04
  },
  {
    name: "Minkar",
    ra: 186.650 * Math.PI / 180,
    dec: -22.627 * Math.PI / 180,
    magV: 3.00,
    pmRA: -9.29,
    pmDec: 0.84,
    colorIndex: 0.94
  },
  {
    name: "Graffias",
    ra: 241.359 * Math.PI / 180,
    dec: -19.806 * Math.PI / 180,
    magV: 2.56,
    pmRA: -5.20,
    pmDec: -10.37,
    colorIndex: -0.08
  },
  {
    name: "Seginus",
    ra: 223.671 * Math.PI / 180,
    dec: 38.308 * Math.PI / 180,
    magV: 3.03,
    pmRA: -44.52,
    pmDec: 15.30,
    colorIndex: 0.09
  },
  {
    name: "Nekkar",
    ra: 225.486 * Math.PI / 180,
    dec: 40.391 * Math.PI / 180,
    magV: 3.49,
    pmRA: -97.35,
    pmDec: 15.63,
    colorIndex: 0.98
  },
  {
    name: "Chara",
    ra: 194.007 * Math.PI / 180,
    dec: 38.319 * Math.PI / 180,
    magV: 4.26,
    pmRA: -710.42,
    pmDec: 287.46,
    colorIndex: 0.70
  },
  {
    name: "Edasich",
    ra: 239.710 * Math.PI / 180,
    dec: 58.966 * Math.PI / 180,
    magV: 3.29,
    pmRA: -26.09,
    pmDec: 17.17,
    colorIndex: 1.50
  },
  {
    name: "Cor Caroli",
    ra: 194.007 * Math.PI / 180,
    dec: 38.319 * Math.PI / 180,
    magV: 2.90,
    pmRA: -235.08,
    pmDec: 54.18,
    colorIndex: 0.06
  },
  {
    name: "Achird",
    ra: 19.479 * Math.PI / 180,
    dec: 42.325 * Math.PI / 180,
    magV: 3.44,
    pmRA: 109.96,
    pmDec: -72.89,
    colorIndex: 0.61
  },
  {
    name: "Sadachbia",
    ra: 315.676 * Math.PI / 180,
    dec: -5.571 * Math.PI / 180,
    magV: 3.96,
    pmRA: 18.77,
    pmDec: 4.90,
    colorIndex: 0.06
  },
  {
    name: "Albaldah",
    ra: 285.653 * Math.PI / 180,
    dec: -25.422 * Math.PI / 180,
    magV: 2.82,
    pmRA: 4.08,
    pmDec: -16.43,
    colorIndex: 0.11
  },
  {
    name: "Alterf",
    ra: 152.093 * Math.PI / 180,
    dec: 22.964 * Math.PI / 180,
    magV: 4.32,
    pmRA: -152.88,
    pmDec: -66.82,
    colorIndex: 1.18
  },
  {
    name: "Acubens",
    ra: 134.622 * Math.PI / 180,
    dec: 11.858 * Math.PI / 180,
    magV: 4.25,
    pmRA: -133.42,
    pmDec: -30.55,
    colorIndex: 0.08
  },
  {
    name: "Ras Elased Australis",
    ra: 158.200 * Math.PI / 180,
    dec: 26.180 * Math.PI / 180,
    magV: 2.97,
    pmRA: -7.41,
    pmDec: -13.98,
    colorIndex: 1.14
  },
  {
    name: "Ras Elased Borealis",
    ra: 155.582 * Math.PI / 180,
    dec: 23.775 * Math.PI / 180,
    magV: 3.84,
    pmRA: -8.87,
    pmDec: -10.94,
    colorIndex: 1.13
  },
  {
    name: "Tania Borealis",
    ra: 131.674 * Math.PI / 180,
    dec: 41.499 * Math.PI / 180,
    magV: 3.06,
    pmRA: -57.69,
    pmDec: -35.91,
    colorIndex: 0.97
  },
  {
    name: "Tania Australis",
    ra: 134.802 * Math.PI / 180,
    dec: 41.500 * Math.PI / 180,
    magV: 3.12,
    pmRA: -15.52,
    pmDec: -16.49,
    colorIndex: 1.57
  },
  {
    name: "Rastaban",
    ra: 262.608 * Math.PI / 180,
    dec: 52.301 * Math.PI / 180,
    magV: 2.79,
    pmRA: -16.46,
    pmDec: 2.78,
    colorIndex: 0.98
  },
  {
    name: "Altais",
    ra: 285.196 * Math.PI / 180,
    dec: 67.661 * Math.PI / 180,
    magV: 3.07,
    pmRA: 27.98,
    pmDec: 9.72,
    colorIndex: 1.16
  },
  {
    name: "Homam",
    ra: 328.482 * Math.PI / 180,
    dec: 25.345 * Math.PI / 180,
    magV: 3.41,
    pmRA: 266.19,
    pmDec: 57.19,
    colorIndex: -0.04
  },
  {
    name: "Matar",
    ra: 342.500 * Math.PI / 180,
    dec: 30.221 * Math.PI / 180,
    magV: 2.95,
    pmRA: 101.18,
    pmDec: -66.92,
    colorIndex: 0.98
  },
  {
    name: "Nembus",
    ra: 21.440 * Math.PI / 180,
    dec: 9.158 * Math.PI / 180,
    magV: 4.53,
    pmRA: 161.35,
    pmDec: -92.89,
    colorIndex: 0.88
  },
  {
    name: "Sadalbari",
    ra: 315.782 * Math.PI / 180,
    dec: 13.863 * Math.PI / 180,
    magV: 3.96,
    pmRA: 140.93,
    pmDec: 22.49,
    colorIndex: 0.05
  },
  {
    name: "Alsafi",
    ra: 265.622 * Math.PI / 180,
    dec: 39.146 * Math.PI / 180,
    magV: 3.75,
    pmRA: -0.99,
    pmDec: 3.07,
    colorIndex: 0.91
  },
  {
    name: "Alathfar",
    ra: 292.176 * Math.PI / 180,
    dec: 33.583 * Math.PI / 180,
    magV: 4.68,
    pmRA: 15.28,
    pmDec: 6.58,
    colorIndex: 1.16
  },
  {
    name: "Ancha",
    ra: 322.888 * Math.PI / 180,
    dec: -9.495 * Math.PI / 180,
    magV: 4.16,
    pmRA: 95.62,
    pmDec: -26.68,
    colorIndex: 0.97
  },
  {
    name: "Albali",
    ra: 307.543 * Math.PI / 180,
    dec: -9.058 * Math.PI / 180,
    magV: 3.77,
    pmRA: 16.44,
    pmDec: -8.58,
    colorIndex: 0.50
  },
  {
    name: "Situla",
    ra: 330.477 * Math.PI / 180,
    dec: -6.048 * Math.PI / 180,
    magV: 4.68,
    pmRA: 41.82,
    pmDec: -19.91,
    colorIndex: 1.20
  },
  {
    name: "Celaeno",
    ra: 56.871 * Math.PI / 180,
    dec: 24.289 * Math.PI / 180,
    magV: 5.45,
    pmRA: 19.35,
    pmDec: -45.67,
    colorIndex: -0.07
  },
  {
    name: "Asterope",
    ra: 56.717 * Math.PI / 180,
    dec: 24.554 * Math.PI / 180,
    magV: 5.76,
    pmRA: 19.08,
    pmDec: -45.80,
    colorIndex: -0.06
  },
  {
    name: "Taygeta",
    ra: 56.302 * Math.PI / 180,
    dec: 24.467 * Math.PI / 180,
    magV: 4.30,
    pmRA: 19.35,
    pmDec: -45.53,
    colorIndex: -0.09
  },
  {
    name: "Maia",
    ra: 56.457 * Math.PI / 180,
    dec: 24.368 * Math.PI / 180,
    magV: 3.87,
    pmRA: 20.13,
    pmDec: -45.75,
    colorIndex: -0.09
  },
  {
    name: "Merope",
    ra: 57.291 * Math.PI / 180,
    dec: 23.948 * Math.PI / 180,
    magV: 4.18,
    pmRA: 20.99,
    pmDec: -46.08,
    colorIndex: -0.06
  },
  {
    name: "Electra",
    ra: 56.219 * Math.PI / 180,
    dec: 24.113 * Math.PI / 180,
    magV: 3.70,
    pmRA: 19.72,
    pmDec: -45.45,
    colorIndex: -0.09
  },
  {
    name: "Atlas",
    ra: 56.871 * Math.PI / 180,
    dec: 24.053 * Math.PI / 180,
    magV: 3.62,
    pmRA: 18.36,
    pmDec: -44.49,
    colorIndex: -0.09
  },
  {
    name: "Pleione",
    ra: 57.297 * Math.PI / 180,
    dec: 24.137 * Math.PI / 180,
    magV: 5.09,
    pmRA: 19.08,
    pmDec: -46.34,
    colorIndex: -0.09
  },
  {
    name: "Alcyone",
    ra: 56.871 * Math.PI / 180,
    dec: 24.105 * Math.PI / 180,
    magV: 2.87,
    pmRA: 19.35,
    pmDec: -43.11,
    colorIndex: -0.09
  },
  {
    name: "Gomeisa",
    ra: 115.561 * Math.PI / 180,
    dec: 8.289 * Math.PI / 180,
    magV: 2.90,
    pmRA: -11.43,
    pmDec: -401.65,
    colorIndex: -0.08
  },
  {
    name: "Furud",
    ra: 91.873 * Math.PI / 180,
    dec: -30.063 * Math.PI / 180,
    magV: 3.00,
    pmRA: -20.16,
    pmDec: 19.50,
    colorIndex: -0.14
  },
  {
    name: "Heze",
    ra: 202.761 * Math.PI / 180,
    dec: -0.667 * Math.PI / 180,
    magV: 3.38,
    pmRA: -253.02,
    pmDec: 8.52,
    colorIndex: 0.37
  },
  {
    name: "Alchiba",
    ra: 183.952 * Math.PI / 180,
    dec: -24.729 * Math.PI / 180,
    magV: 4.02,
    pmRA: -140.37,
    pmDec: -33.52,
    colorIndex: 0.36
  },
  {
    name: "Alkes",
    ra: 172.851 * Math.PI / 180,
    dec: -18.299 * Math.PI / 180,
    magV: 4.08,
    pmRA: -25.61,
    pmDec: 14.82,
    colorIndex: 1.09
  },
  {
    name: "Sulafat",
    ra: 284.736 * Math.PI / 180,
    dec: 32.690 * Math.PI / 180,
    magV: 3.24,
    pmRA: 1.90,
    pmDec: -3.53,
    colorIndex: -0.03
  },
  {
    name: "Chertan",
    ra: 168.560 * Math.PI / 180,
    dec: 20.524 * Math.PI / 180,
    magV: 3.34,
    pmRA: -51.56,
    pmDec: 14.42,
    colorIndex: 0.08
  },
  {
    name: "Zosma",
    ra: 168.527 * Math.PI / 180,
    dec: 20.524 * Math.PI / 180,
    magV: 2.56,
    pmRA: -196.48,
    pmDec: -9.69,
    colorIndex: 0.12
  },
  {
    name: "Coxa",
    ra: 176.513 * Math.PI / 180,
    dec: -6.026 * Math.PI / 180,
    magV: 4.32,
    pmRA: -224.81,
    pmDec: 53.69,
    colorIndex: 0.46
  },
  {
    name: "Pherkad",
    ra: 230.182 * Math.PI / 180,
    dec: 71.834 * Math.PI / 180,
    magV: 3.00,
    pmRA: -15.39,
    pmDec: 11.91,
    colorIndex: 0.05
  },
  {
    name: "Yildun",
    ra: 263.054 * Math.PI / 180,
    dec: 86.586 * Math.PI / 180,
    magV: 4.36,
    pmRA: 21.17,
    pmDec: -8.74,
    colorIndex: 0.01
  },
  {
    name: "Zubenelhakrabi",
    ra: 226.018 * Math.PI / 180,
    dec: -19.470 * Math.PI / 180,
    magV: 3.91,
    pmRA: -68.40,
    pmDec: -49.00,
    colorIndex: -0.21
  },
  {
    name: "Brachium",
    ra: 262.691 * Math.PI / 180,
    dec: 24.660 * Math.PI / 180,
    magV: 3.23,
    pmRA: -4.54,
    pmDec: -22.85,
    colorIndex: 1.56
  },
  {
    name: "Han",
    ra: 241.453 * Math.PI / 180,
    dec: -26.114 * Math.PI / 180,
    magV: 2.89,
    pmRA: -9.19,
    pmDec: -30.80,
    colorIndex: 0.18
  },
  {
    name: "Jabbah",
    ra: 244.580 * Math.PI / 180,
    dec: -19.461 * Math.PI / 180,
    magV: 2.62,
    pmRA: -5.20,
    pmDec: -1.14,
    colorIndex: -0.15
  },
  {
    name: "Fang",
    ra: 251.476 * Math.PI / 180,
    dec: -34.293 * Math.PI / 180,
    magV: 2.82,
    pmRA: -8.00,
    pmDec: -30.80,
    colorIndex: 0.01
  },
  {
    name: "Alniyat",
    ra: 253.497 * Math.PI / 180,
    dec: -26.432 * Math.PI / 180,
    magV: 2.83,
    pmRA: -3.38,
    pmDec: -7.42,
    colorIndex: -0.18
  },
  {
    name: "Xamidimura",
    ra: 238.929 * Math.PI / 180,
    dec: -37.043 * Math.PI / 180,
    magV: 4.59,
    pmRA: 8.65,
    pmDec: -27.82,
    colorIndex: -0.12
  },
  {
    name: "Pipirima",
    ra: 238.171 * Math.PI / 180,
    dec: -37.144 * Math.PI / 180,
    magV: 4.33,
    pmRA: 9.71,
    pmDec: -29.95,
    colorIndex: -0.09
  },
  {
    name: "Acrab",
    ra: 239.713 * Math.PI / 180,
    dec: -19.806 * Math.PI / 180,
    magV: 2.56,
    pmRA: -5.20,
    pmDec: -10.37,
    colorIndex: -0.08
  },
  {
    name: "Fuyue",
    ra: 254.655 * Math.PI / 180,
    dec: -37.043 * Math.PI / 180,
    magV: 3.19,
    pmRA: -13.65,
    pmDec: -29.95,
    colorIndex: -0.17
  },
  {
    name: "Iklil",
    ra: 255.710 * Math.PI / 180,
    dec: -39.030 * Math.PI / 180,
    magV: 3.03,
    pmRA: -7.60,
    pmDec: -27.59,
    colorIndex: 0.66
  },
  {
    name: "Larawag",
    ra: 254.105 * Math.PI / 180,
    dec: -39.030 * Math.PI / 180,
    magV: 2.70,
    pmRA: -7.60,
    pmDec: -27.59,
    colorIndex: 0.66
  },
  {
    name: "Wurren",
    ra: 279.690 * Math.PI / 180,
    dec: -30.424 * Math.PI / 180,
    magV: 3.51,
    pmRA: 1.11,
    pmDec: -21.10,
    colorIndex: 0.07
  },
  {
    name: "Girtab",
    ra: 265.354 * Math.PI / 180,
    dec: -43.239 * Math.PI / 180,
    magV: 2.70,
    pmRA: -6.48,
    pmDec: -23.68,
    colorIndex: 0.63
  },
  {
    name: "Paikauhale",
    ra: 283.629 * Math.PI / 180,
    dec: -26.991 * Math.PI / 180,
    magV: 3.17,
    pmRA: -44.17,
    pmDec: -124.20,
    colorIndex: 0.14
  },
  {
    name: "Tarf",
    ra: 131.171 * Math.PI / 180,
    dec: 9.186 * Math.PI / 180,
    magV: 3.53,
    pmRA: -15.20,
    pmDec: -6.46,
    colorIndex: 1.48
  },
  {
    name: "Minchir",
    ra: 143.487 * Math.PI / 180,
    dec: -11.166 * Math.PI / 180,
    magV: 4.48,
    pmRA: -33.01,
    pmDec: 20.02,
    colorIndex: 0.92
  },
  {
    name: "Asellus Borealis",
    ra: 131.171 * Math.PI / 180,
    dec: 21.468 * Math.PI / 180,
    magV: 4.66,
    pmRA: -51.60,
    pmDec: -25.59,
    colorIndex: 0.48
  },
  {
    name: "Asellus Australis",
    ra: 130.821 * Math.PI / 180,
    dec: 18.154 * Math.PI / 180,
    magV: 3.94,
    pmRA: -15.23,
    pmDec: -12.38,
    colorIndex: 1.08
  },
  {
    name: "Grumium",
    ra: 253.083 * Math.PI / 180,
    dec: 51.489 * Math.PI / 180,
    magV: 3.75,
    pmRA: -8.48,
    pmDec: -22.79,
    colorIndex: 1.01
  },
  {
    name: "Sadatoni",
    ra: 326.046 * Math.PI / 180,
    dec: 23.565 * Math.PI / 180,
    magV: 3.53,
    pmRA: 54.85,
    pmDec: 26.93,
    colorIndex: 0.45
  },
  {
    name: "Ain",
    ra: 67.154 * Math.PI / 180,
    dec: 19.180 * Math.PI / 180,
    magV: 3.53,
    pmRA: 108.58,
    pmDec: -37.84,
    colorIndex: 1.01
  },
  {
    name: "Hyadum I",
    ra: 64.949 * Math.PI / 180,
    dec: 15.627 * Math.PI / 180,
    magV: 3.84,
    pmRA: 113.60,
    pmDec: -24.19,
    colorIndex: 1.00
  },
  {
    name: "Hyadum II",
    ra: 66.509 * Math.PI / 180,
    dec: 17.543 * Math.PI / 180,
    magV: 3.40,
    pmRA: 109.20,
    pmDec: -25.36,
    colorIndex: 1.17
  },
  {
    name: "Nusakan",
    ra: 228.076 * Math.PI / 180,
    dec: 29.106 * Math.PI / 180,
    magV: 3.65,
    pmRA: -75.78,
    pmDec: 16.11,
    colorIndex: 0.06
  },
  {
    name: "Diadem",
    ra: 186.650 * Math.PI / 180,
    dec: 17.529 * Math.PI / 180,
    magV: 4.32,
    pmRA: -91.09,
    pmDec: -60.90,
    colorIndex: 0.48
  },
  {
    name: "Rotanev",
    ra: 309.387 * Math.PI / 180,
    dec: 14.595 * Math.PI / 180,
    magV: 3.63,
    pmRA: -2.48,
    pmDec: -17.92,
    colorIndex: 0.48
  },
  {
    name: "Sualocin",
    ra: 308.304 * Math.PI / 180,
    dec: 15.912 * Math.PI / 180,
    magV: 3.77,
    pmRA: -13.49,
    pmDec: -31.15,
    colorIndex: -0.05
  },
  {
    name: "Syrma",
    ra: 224.633 * Math.PI / 180,
    dec: -6.835 * Math.PI / 180,
    magV: 4.07,
    pmRA: -88.01,
    pmDec: -48.83,
    colorIndex: 0.36
  },
  {
    name: "Minelauva",
    ra: 198.539 * Math.PI / 180,
    dec: -18.143 * Math.PI / 180,
    magV: 3.87,
    pmRA: -263.10,
    pmDec: 25.09,
    colorIndex: 0.93
  },
  {
    name: "Zuben Elakribi",
    ra: 226.018 * Math.PI / 180,
    dec: -19.470 * Math.PI / 180,
    magV: 4.54,
    pmRA: -68.40,
    pmDec: -49.00,
    colorIndex: -0.21
  },
  {
    name: "Beid",
    ra: 61.937 * Math.PI / 180,
    dec: -5.086 * Math.PI / 180,
    magV: 4.43,
    pmRA: -44.89,
    pmDec: 7.79,
    colorIndex: 0.16
  },
  {
    name: "Angetenar",
    ra: 41.162 * Math.PI / 180,
    dec: -8.820 * Math.PI / 180,
    magV: 4.00,
    pmRA: -25.37,
    pmDec: 3.18,
    colorIndex: 0.10
  },
  {
    name: "Rigil Kent",
    ra: 219.902 * Math.PI / 180,
    dec: -60.834 * Math.PI / 180,
    magV: 0.01,
    pmRA: -3678.19,
    pmDec: 481.84,
    colorIndex: 0.71
  },
  {
    name: "Kakkab",
    ra: 282.520 * Math.PI / 180,
    dec: -21.741 * Math.PI / 180,
    magV: 3.96,
    pmRA: 3.15,
    pmDec: -22.75,
    colorIndex: 0.09
  },
  {
    name: "Kabdhilinan",
    ra: 288.139 * Math.PI / 180,
    dec: -21.060 * Math.PI / 180,
    magV: 4.51,
    pmRA: 5.01,
    pmDec: -29.75,
    colorIndex: 0.10
  },
  {
    name: "Tiaki",
    ra: 247.728 * Math.PI / 180,
    dec: -28.216 * Math.PI / 180,
    magV: 2.69,
    pmRA: -7.09,
    pmDec: -31.67,
    colorIndex: 0.00
  },
  {
    name: "Ainalrami",
    ra: 290.972 * Math.PI / 180,
    dec: -40.615 * Math.PI / 180,
    magV: 4.34,
    pmRA: 0.55,
    pmDec: -19.58,
    colorIndex: 0.03
  },
  {
    name: "Torcular",
    ra: 4.238 * Math.PI / 180,
    dec: -32.346 * Math.PI / 180,
    magV: 4.26,
    pmRA: 136.14,
    pmDec: -22.11,
    colorIndex: 1.14
  },
  {
    name: "Biham",
    ra: 328.867 * Math.PI / 180,
    dec: 10.830 * Math.PI / 180,
    magV: 4.01,
    pmRA: 0.17,
    pmDec: -9.91,
    colorIndex: 0.07
  },
  {
    name: "Salm",
    ra: 327.374 * Math.PI / 180,
    dec: 5.248 * Math.PI / 180,
    magV: 4.27,
    pmRA: 23.07,
    pmDec: -15.22,
    colorIndex: 0.44
  },
  {
    name: "Alzirr",
    ra: 112.122 * Math.PI / 180,
    dec: 22.507 * Math.PI / 180,
    magV: 3.35,
    pmRA: -64.12,
    pmDec: -49.36,
    colorIndex: 0.03
  },
  {
    name: "Hassaleh",
    ra: 88.793 * Math.PI / 180,
    dec: 37.213 * Math.PI / 180,
    magV: 3.57,
    pmRA: 3.66,
    pmDec: -10.90,
    colorIndex: 0.96
  },
  {
    name: "Mahasim",
    ra: 112.309 * Math.PI / 180,
    dec: 30.245 * Math.PI / 180,
    magV: 3.50,
    pmRA: -12.37,
    pmDec: -6.03,
    colorIndex: 0.92
  },
  {
    name: "Tejat Posterior",
    ra: 93.719 * Math.PI / 180,
    dec: 22.514 * Math.PI / 180,
    magV: 2.87,
    pmRA: -18.08,
    pmDec: -8.32,
    colorIndex: 1.59
  },
  {
    name: "Alhajoth",
    ra: 120.896 * Math.PI / 180,
    dec: 28.026 * Math.PI / 180,
    magV: 3.58,
    pmRA: 42.69,
    pmDec: -52.92,
    colorIndex: 0.02
  },
  {
    name: "Pherkad Minor",
    ra: 241.359 * Math.PI / 180,
    dec: 71.834 * Math.PI / 180,
    magV: 5.02,
    pmRA: 3.99,
    pmDec: -2.82,
    colorIndex: 1.08
  },
  {
    name: "Alruba",
    ra: 282.735 * Math.PI / 180,
    dec: 24.665 * Math.PI / 180,
    magV: 4.02,
    pmRA: 3.90,
    pmDec: -7.84,
    colorIndex: 1.08
  },
  {
    name: "Aldhibain",
    ra: 208.671 * Math.PI / 180,
    dec: 3.397 * Math.PI / 180,
    magV: 4.62,
    pmRA: -36.40,
    pmDec: 7.93,
    colorIndex: 0.46
  },
  {
    name: "Almaaz",
    ra: 77.634 * Math.PI / 180,
    dec: 37.213 * Math.PI / 180,
    magV: 4.08,
    pmRA: 0.22,
    pmDec: -14.45,
    colorIndex: 1.05
  },
  {
    name: "Sadalsund",
    ra: 322.054 * Math.PI / 180,
    dec: -0.320 * Math.PI / 180,
    magV: 4.47,
    pmRA: 23.94,
    pmDec: 7.73,
    colorIndex: 0.97
  },
  {
    name: "Deneb Kaitos",
    ra: 10.897 * Math.PI / 180,
    dec: -17.987 * Math.PI / 180,
    magV: 2.00,
    pmRA: 232.79,
    pmDec: 32.71,
    colorIndex: 1.02
  },
  {
    name: "Zuben Hakrabi",
    ra: 226.018 * Math.PI / 180,
    dec: -19.470 * Math.PI / 180,
    magV: 3.29,
    pmRA: -68.40,
    pmDec: -49.00,
    colorIndex: -0.21
  },
  {
    name: "Rukbat",
    ra: 290.660 * Math.PI / 180,
    dec: -40.615 * Math.PI / 180,
    magV: 3.97,
    pmRA: 0.55,
    pmDec: -19.58,
    colorIndex: 0.03
  },
  {
    name: "Alnasl",
    ra: 280.768 * Math.PI / 180,
    dec: -29.577 * Math.PI / 180,
    magV: 2.98,
    pmRA: 9.52,
    pmDec: -24.84,
    colorIndex: 1.09
  },
  {
    name: "Kaus Meridionalis",
    ra: 269.249 * Math.PI / 180,
    dec: -29.828 * Math.PI / 180,
    magV: 3.84,
    pmRA: -53.43,
    pmDec: -184.41,
    colorIndex: 1.06
  },
  {
    name: "La Superba",
    ra: 194.007 * Math.PI / 180,
    dec: 45.440 * Math.PI / 180,
    magV: 5.42,
    pmRA: -2.29,
    pmDec: -5.42,
    colorIndex: 2.47
  },
  {
    name: "Kaffaljidhma",
    ra: 47.042 * Math.PI / 180,
    dec: 28.599 * Math.PI / 180,
    magV: 3.39,
    pmRA: 12.80,
    pmDec: -23.47,
    colorIndex: 0.09
  },
  {
    name: "Vertex",
    ra: 85.190 * Math.PI / 180,
    dec: -1.943 * Math.PI / 180,
    magV: 2.05,
    pmRA: 3.19,
    pmDec: 2.54,
    colorIndex: -0.20
  },
  {
    name: "Wazn",
    ra: 115.312 * Math.PI / 180,
    dec: -40.003 * Math.PI / 180,
    magV: 3.34,
    pmRA: -3.30,
    pmDec: 16.77,
    colorIndex: 1.63
  },
  {
    name: "Mothallah",
    ra: 54.284 * Math.PI / 180,
    dec: 9.029 * Math.PI / 180,
    magV: 3.85,
    pmRA: 21.52,
    pmDec: -23.75,
    colorIndex: 0.13
  },
  {
    name: "Alshat",
    ra: 265.622 * Math.PI / 180,
    dec: 12.560 * Math.PI / 180,
    magV: 3.27,
    pmRA: 11.34,
    pmDec: -222.61,
    colorIndex: 0.91
  },
  {
    name: "Giausar",
    ra: 272.133 * Math.PI / 180,
    dec: 56.873 * Math.PI / 180,
    magV: 4.43,
    pmRA: -7.06,
    pmDec: 14.60,
    colorIndex: 1.31
  },
  {
    name: "Alkalurops",
    ra: 233.813 * Math.PI / 180,
    dec: 26.180 * Math.PI / 180,
    magV: 4.52,
    pmRA: -55.74,
    pmDec: 30.94,
    colorIndex: 0.42
  },
  {
    name: "Torcularis Septentrionalis",
    ra: 329.840 * Math.PI / 180,
    dec: 7.576 * Math.PI / 180,
    magV: 4.01,
    pmRA: 66.63,
    pmDec: -16.31,
    colorIndex: 0.97
  },
  {
    name: "Jishui",
    ra: 143.487 * Math.PI / 180,
    dec: -11.166 * Math.PI / 180,
    magV: 4.47,
    pmRA: -33.01,
    pmDec: 20.02,
    colorIndex: 0.92
  }
];
