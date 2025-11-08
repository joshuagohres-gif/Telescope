import { db } from "@db";
import {
  opticalTrain,
  masterFrame,
  frameIndex,
  focusSample,
  focusProfile,
  backfocusOffset,
  pointingModel,
  pecProfile,
  filter,
  filterCurve,
  sensor,
  sensorQe,
} from "../shared/calib-schema";

export async function seedCalibData() {
  console.log("Seeding Calibration data...");

  // ===== OPTICAL TRAINS =====
  const trains = await db
    .insert(opticalTrain)
    .values([
      {
        name: "EdgeHD 11 + ASI2600MM",
        scopeModel: "Celestron EdgeHD 11",
        cameraModel: "ZWO ASI2600MM Pro",
        focuserModel: "Moonlite CSL",
        filterWheelModel: "ZWO EFW 7x36mm",
        reducerFlattener: "Celestron 0.7x Reducer",
        focalLengthMm: 1960,
        apertureMm: 280,
        pixelSizeUm: 3.76,
        plateScaleArcsecPx: 0.396,
      },
      {
        name: "WO Star71 + ASI533MC",
        scopeModel: "William Optics RedCat 71",
        cameraModel: "ZWO ASI533MC Pro",
        focuserModel: "WO Flat71 Focuser",
        filterWheelModel: null,
        reducerFlattener: null,
        focalLengthMm: 348,
        apertureMm: 71,
        pixelSizeUm: 3.76,
        plateScaleArcsecPx: 2.23,
      },
    ])
    .returning();

  console.log(`✓ Created ${trains.length} optical trains`);

  // ===== MASTER FRAMES =====
  const now = new Date();
  const masterFrames = await db
    .insert(masterFrame)
    .values([
      {
        trainId: trains[0].id,
        frameType: "bias",
        binning: "1x1",
        tempC: -10.0,
        gain: 100,
        offset: 50,
        frameCount: 100,
        capturedAt: new Date(now.getTime() - 7 * 86400000),
        s3Key: "masters/edgehd11_asi2600_bias_100_1x1_20241101.fits",
        statsJson: { mean: 512.3, median: 512.0, stddev: 3.2, min: 500, max: 530 },
      },
      {
        trainId: trains[0].id,
        frameType: "dark",
        binning: "1x1",
        tempC: -10.0,
        exposureSec: 300.0,
        gain: 100,
        offset: 50,
        frameCount: 50,
        capturedAt: new Date(now.getTime() - 7 * 86400000),
        s3Key: "masters/edgehd11_asi2600_dark_300s_100_1x1_20241101.fits",
        statsJson: { mean: 520.5, median: 518.0, stddev: 8.5, min: 500, max: 650 },
      },
      {
        trainId: trains[0].id,
        frameType: "flat",
        filterName: "L",
        binning: "1x1",
        tempC: 15.0,
        exposureSec: 1.2,
        gain: 100,
        offset: 50,
        frameCount: 30,
        capturedAt: new Date(now.getTime() - 3 * 86400000),
        s3Key: "masters/edgehd11_asi2600_flat_L_1x1_20241105.fits",
        statsJson: { mean: 32000.0, median: 31950.0, stddev: 450.0, min: 28000, max: 36000 },
      },
      {
        trainId: trains[0].id,
        frameType: "flat",
        filterName: "Ha",
        binning: "1x1",
        tempC: 15.0,
        exposureSec: 3.5,
        gain: 100,
        offset: 50,
        frameCount: 30,
        capturedAt: new Date(now.getTime() - 3 * 86400000),
        s3Key: "masters/edgehd11_asi2600_flat_Ha_1x1_20241105.fits",
        statsJson: { mean: 31800.0, median: 31750.0, stddev: 480.0, min: 27500, max: 35500 },
      },
    ])
    .returning();

  console.log(`✓ Created ${masterFrames.length} master frames`);

  // ===== FOCUS SAMPLES =====
  const sessionId = "12345678-1234-1234-1234-123456789abc";
  const focusSamples = [];
  const basePos = 25000;
  const optimalPos = 25200;

  for (let i = -10; i <= 10; i++) {
    const pos = basePos + i * 100;
    const delta = Math.abs(pos - optimalPos);
    const hfr = 1.8 + (delta / 100.0) * 0.15; // V-curve

    focusSamples.push({
      trainId: trains[0].id,
      sessionId,
      ts: new Date(now.getTime() - (21 - i) * 60000),
      focuserPos: pos,
      tempC: 8.5,
      filterName: "L",
      hfr,
      fwhm: hfr * 1.1,
      starCount: 120,
    });
  }

  await db.insert(focusSample).values(focusSamples);
  console.log(`✓ Created ${focusSamples.length} focus samples`);

  // ===== FOCUS PROFILES =====
  const focusProfiles = await db
    .insert(focusProfile)
    .values([
      {
        trainId: trains[0].id,
        filterName: "L",
        tempC: 8.5,
        optimalPos: 25200,
        criticalZone: 150,
        fitType: "hyperbolic",
        coeffsJson: [1.8, 0.00015, 25200],
        r2: 0.97,
        sampleCount: 21,
      },
      {
        trainId: trains[0].id,
        filterName: "Ha",
        tempC: 8.5,
        optimalPos: 25350,
        criticalZone: 140,
        fitType: "hyperbolic",
        coeffsJson: [1.75, 0.00016, 25350],
        r2: 0.96,
        sampleCount: 18,
      },
    ])
    .returning();

  console.log(`✓ Created ${focusProfiles.length} focus profiles`);

  // ===== BACKFOCUS OFFSETS =====
  const backfocusOffsets = await db
    .insert(backfocusOffset)
    .values([
      {
        trainId: trains[0].id,
        filterName: "L",
        offsetMm: 0.0,
        confidencePct: 95.0,
        measurementCount: 12,
      },
      {
        trainId: trains[0].id,
        filterName: "R",
        offsetMm: 0.02,
        confidencePct: 92.0,
        measurementCount: 10,
      },
      {
        trainId: trains[0].id,
        filterName: "G",
        offsetMm: 0.01,
        confidencePct: 93.0,
        measurementCount: 10,
      },
      {
        trainId: trains[0].id,
        filterName: "B",
        offsetMm: -0.03,
        confidencePct: 91.0,
        measurementCount: 9,
      },
      {
        trainId: trains[0].id,
        filterName: "Ha",
        offsetMm: 0.15,
        confidencePct: 94.0,
        measurementCount: 11,
      },
    ])
    .returning();

  console.log(`✓ Created ${backfocusOffsets.length} backfocus offsets`);

  // ===== POINTING MODELS =====
  const pointingModels = await db
    .insert(pointingModel)
    .values([
      {
        trainId: trains[0].id,
        termsJson: {
          IH: -12.5,  // Index error HA
          ID: 5.2,    // Index error Dec
          CH: -2.1,   // Collimation error
          NP: 8.3,    // Non-perpendicularity
          MA: -1.5,   // Polar axis misalignment (azimuth)
          ME: 3.8,    // Polar axis misalignment (elevation)
        },
        rmsArcsec: 18.5,
        pointCount: 45,
      },
    ])
    .returning();

  console.log(`✓ Created ${pointingModels.length} pointing models`);

  // ===== PEC PROFILES =====
  // Generate synthetic periodic error waveform
  const waveform = [];
  const period = 480.0; // 8 minutes
  for (let i = 0; i < 480; i++) {
    const t = (i / 480.0) * 2 * Math.PI;
    // Composite waveform: fundamental + harmonics
    const error = 15 * Math.sin(t) + 5 * Math.sin(2 * t) + 2 * Math.sin(3 * t);
    waveform.push(error);
  }

  const pecProfiles = await db
    .insert(pecProfile)
    .values([
      {
        mountModel: "Celestron CGX-L",
        axis: "RA",
        waveformJson: waveform,
        periodSec: period,
        pkToPkArcsec: 44.0,
        rmsArcsec: 12.3,
        capturedAt: new Date(now.getTime() - 14 * 86400000),
      },
    ])
    .returning();

  console.log(`✓ Created ${pecProfiles.length} PEC profiles`);

  // ===== FILTERS =====
  const filters = await db
    .insert(filter)
    .values([
      {
        name: "Astrodon L",
        manufacturer: "Astrodon",
        filterType: "luminance",
        centralWavelengthNm: 550,
        bandwidthNm: 300,
      },
      {
        name: "Astrodon Ha 5nm",
        manufacturer: "Astrodon",
        filterType: "narrowband",
        centralWavelengthNm: 656.3,
        bandwidthNm: 5.0,
      },
      {
        name: "Chroma R",
        manufacturer: "Chroma",
        filterType: "red",
        centralWavelengthNm: 650,
        bandwidthNm: 100,
      },
    ])
    .returning();

  console.log(`✓ Created ${filters.length} filters`);

  // Generate filter curves
  const filterCurveData = [];
  
  // L filter: broad bandpass 400-700nm
  for (let wl = 350; wl <= 750; wl += 10) {
    let transmission = 0.0;
    if (wl >= 400 && wl <= 700) {
      transmission = 0.95;
    } else if (wl >= 380 && wl < 400) {
      transmission = ((wl - 380) / 20.0) * 0.95;
    } else if (wl > 700 && wl <= 720) {
      transmission = (1 - (wl - 700) / 20.0) * 0.95;
    }
    filterCurveData.push({ filterId: filters[0].id, wavelengthNm: wl, transmission });
  }

  // Ha 5nm: narrow bandpass centered at 656.3nm
  for (let wl = 640; wl <= 670; wl += 0.5) {
    const delta = Math.abs(wl - 656.3);
    let transmission = 0.0;
    if (delta <= 2.5) {
      transmission = 0.97;
    } else if (delta <= 5.0) {
      transmission = 0.97 * (1 - (delta - 2.5) / 2.5);
    }
    filterCurveData.push({ filterId: filters[1].id, wavelengthNm: wl, transmission });
  }

  await db.insert(filterCurve).values(filterCurveData);
  console.log(`✓ Created ${filterCurveData.length} filter curve points`);

  // ===== SENSORS =====
  const sensors = await db
    .insert(sensor)
    .values([
      {
        model: "ZWO ASI2600MM Pro",
        manufacturer: "ZWO",
        pixelSizeUm: 3.76,
        resolutionX: 6248,
        resolutionY: 4176,
        isColor: false,
      },
      {
        model: "ZWO ASI533MC Pro",
        manufacturer: "ZWO",
        pixelSizeUm: 3.76,
        resolutionX: 3008,
        resolutionY: 3008,
        isColor: true,
      },
    ])
    .returning();

  console.log(`✓ Created ${sensors.length} sensors`);

  // Generate QE curves (typical back-illuminated CMOS)
  const sensorQeData = [];
  for (const sensor of sensors) {
    for (let wl = 350; wl <= 1000; wl += 10) {
      let qe = 0.0;
      if (wl >= 400 && wl <= 650) {
        qe = 0.85; // Peak QE
      } else if (wl > 650 && wl <= 800) {
        qe = 0.85 - ((wl - 650) / 150.0) * 0.35; // Declining in IR
      } else if (wl > 800) {
        qe = 0.5 - ((wl - 800) / 200.0) * 0.5; // Further decline
      } else if (wl < 400) {
        qe = ((wl - 350) / 50.0) * 0.60; // UV rising
      }
      qe = Math.max(0, qe);
      sensorQeData.push({ sensorId: sensor.id, wavelengthNm: wl, qe });
    }
  }

  await db.insert(sensorQe).values(sensorQeData);
  console.log(`✓ Created ${sensorQeData.length} sensor QE points`);

  console.log("✅ Calibration seed complete!");
}
