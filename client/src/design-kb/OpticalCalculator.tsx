import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Info } from "lucide-react";

// Optical calculation utilities
const calculations = {
  focalLength: (aperture: number, fRatio: number) => aperture * fRatio,
  fRatio: (aperture: number, focalLength: number) => focalLength / aperture,
  magnification: (focalLength: number, eyepieceFl: number) => focalLength / eyepieceFl,
  exitPupil: (aperture: number, magnification: number) => aperture / magnification,
  trueFOV: (apparentFOV: number, magnification: number) => apparentFOV / magnification,
  resolution: (aperture: number) => 116 / aperture, // Dawes limit in arcseconds
  lightGatheringPower: (aperture: number) => Math.pow(aperture / 7, 2), // vs 7mm human pupil
  limitingMagnitude: (aperture: number) => 2 + 5 * Math.log10(aperture), // Pogson's formula
};

function BasicCalculator() {
  const [aperture, setAperture] = useState("150");
  const [focalLength, setFocalLength] = useState("750");
  const [eyepieceFl, setEyepieceFl] = useState("25");
  const [apparentFOV, setApparentFOV] = useState("52");

  const apt = parseFloat(aperture) || 0;
  const fl = parseFloat(focalLength) || 0;
  const eyeFL = parseFloat(eyepieceFl) || 0;
  const afov = parseFloat(apparentFOV) || 0;

  const fRatio = apt > 0 && fl > 0 ? calculations.fRatio(apt, fl) : 0;
  const magnification = fl > 0 && eyeFL > 0 ? calculations.magnification(fl, eyeFL) : 0;
  const exitPupil = apt > 0 && magnification > 0 ? calculations.exitPupil(apt, magnification) : 0;
  const trueFOV = afov > 0 && magnification > 0 ? calculations.trueFOV(afov, magnification) : 0;
  const resolution = apt > 0 ? calculations.resolution(apt) : 0;
  const lightGathering = apt > 0 ? calculations.lightGatheringPower(apt) : 0;
  const limitingMag = apt > 0 ? calculations.limitingMagnitude(apt) : 0;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Telescope Parameters
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="aperture">Aperture (mm)</Label>
            <Input
              id="aperture"
              type="number"
              value={aperture}
              onChange={(e) => setAperture(e.target.value)}
              placeholder="150"
            />
          </div>
          <div>
            <Label htmlFor="focalLength">Focal Length (mm)</Label>
            <Input
              id="focalLength"
              type="number"
              value={focalLength}
              onChange={(e) => setFocalLength(e.target.value)}
              placeholder="750"
            />
          </div>
          <div>
            <Label htmlFor="eyepieceFl">Eyepiece FL (mm)</Label>
            <Input
              id="eyepieceFl"
              type="number"
              value={eyepieceFl}
              onChange={(e) => setEyepieceFl(e.target.value)}
              placeholder="25"
            />
          </div>
          <div>
            <Label htmlFor="apparentFOV">Apparent FOV (°)</Label>
            <Input
              id="apparentFOV"
              type="number"
              value={apparentFOV}
              onChange={(e) => setApparentFOV(e.target.value)}
              placeholder="52"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Calculated Results</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <ResultCard label="Focal Ratio" value={fRatio > 0 ? `f/${fRatio.toFixed(1)}` : "—"} />
          <ResultCard label="Magnification" value={magnification > 0 ? `${magnification.toFixed(1)}×` : "—"} />
          <ResultCard label="Exit Pupil" value={exitPupil > 0 ? `${exitPupil.toFixed(1)} mm` : "—"} />
          <ResultCard label="True FOV" value={trueFOV > 0 ? `${trueFOV.toFixed(2)}°` : "—"} />
          <ResultCard label="Resolution (Dawes)" value={resolution > 0 ? `${resolution.toFixed(2)}"` : "—"} />
          <ResultCard label="Light Gathering" value={lightGathering > 0 ? `${lightGathering.toFixed(0)}× vs eye` : "—"} />
          <ResultCard label="Limiting Mag" value={limitingMag > 0 ? `${limitingMag.toFixed(1)}` : "—"} />
        </div>
      </Card>

      <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium">Optical Guidelines:</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Exit pupil should be 0.5-7mm (7mm for dark sky viewing)</li>
              <li>• Maximum useful magnification ≈ 2× aperture (mm)</li>
              <li>• Minimum useful magnification ≈ aperture (mm) / 7</li>
              <li>• f/4-f/5: Fast, wide field, requires good optics</li>
              <li>• f/6-f/8: Moderate, good all-around</li>
              <li>• f/10-f/15: Slow, high magnification, planetary</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SecondaryCalculator() {
  const [aperture, setAperture] = useState("200");
  const [focalRatio, setFocalRatio] = useState("5");
  const [backfocus, setBackfocus] = useState("150");
  const [fieldDiameter, setFieldDiameter] = useState("28");

  const D = parseFloat(aperture) || 0;
  const F = parseFloat(focalRatio) || 0;
  const b = parseFloat(backfocus) || 0;
  const d = parseFloat(fieldDiameter) || 0;

  const focalLength = D * F;

  // Simplified secondary calculation: m = F*d/(F*D - b) + D*b/(F*D)
  const secondary = D > 0 && F > 0 && b > 0 && d > 0
    ? (focalLength * d) / (focalLength - b) + (D * b) / focalLength
    : 0;

  const obstruction = D > 0 && secondary > 0 ? (secondary / D) * 100 : 0;
  const obstructionArea = D > 0 && secondary > 0 ? Math.pow(secondary / D, 2) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Newtonian Secondary Mirror Calculator</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sec-aperture">Primary Aperture (mm)</Label>
            <Input
              id="sec-aperture"
              type="number"
              value={aperture}
              onChange={(e) => setAperture(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="sec-fratio">Focal Ratio</Label>
            <Input
              id="sec-fratio"
              type="number"
              step="0.1"
              value={focalRatio}
              onChange={(e) => setFocalRatio(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="backfocus">Backfocus (mm)</Label>
            <Input
              id="backfocus"
              type="number"
              value={backfocus}
              onChange={(e) => setBackfocus(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Distance from focal plane to secondary
            </p>
          </div>
          <div>
            <Label htmlFor="field">Field Diameter (mm)</Label>
            <Input
              id="field"
              type="number"
              value={fieldDiameter}
              onChange={(e) => setFieldDiameter(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Illuminated field at focal plane
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Results</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <ResultCard label="Focal Length" value={focalLength > 0 ? `${focalLength} mm` : "—"} />
          <ResultCard label="Secondary Minor Axis" value={secondary > 0 ? `${secondary.toFixed(1)} mm` : "—"} />
          <ResultCard label="Obstruction (Linear)" value={obstruction > 0 ? `${obstruction.toFixed(1)}%` : "—"} />
          <ResultCard label="Obstruction (Area)" value={obstructionArea > 0 ? `${obstructionArea.toFixed(1)}%` : "—"} />
        </div>
      </Card>

      <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium">Secondary Mirror Guidelines:</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Typical obstruction: 15-25% linear (2-6% area loss)</li>
              <li>• Fast systems (f/4-f/5) may need larger secondaries</li>
              <li>• Keep obstruction under 30% linear for good contrast</li>
              <li>• Field diameter depends on eyepiece/camera sensor size</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ResolutionCalculator() {
  const [aperture, setAperture] = useState("150");

  const apt = parseFloat(aperture) || 0;

  const dawesLimit = apt > 0 ? 116 / apt : 0;
  const rayleighLimit = apt > 0 ? 138 / apt : 0;
  const sparrowLimit = apt > 0 ? 108 / apt : 0;

  // Theoretical resolving power at 550nm
  const theoreticalResolution = apt > 0 ? (0.55 / apt) * 206265 : 0;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Telescope Resolution</h3>
        <div>
          <Label htmlFor="res-aperture">Aperture (mm)</Label>
          <Input
            id="res-aperture"
            type="number"
            value={aperture}
            onChange={(e) => setAperture(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Resolution Criteria</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ResultCard
              label="Dawes Limit"
              value={dawesLimit > 0 ? `${dawesLimit.toFixed(2)}"` : "—"}
              info="Empirical double star separation limit"
            />
            <ResultCard
              label="Rayleigh Criterion"
              value={rayleighLimit > 0 ? `${rayleighLimit.toFixed(2)}"` : "—"}
              info="Theoretical diffraction limit"
            />
            <ResultCard
              label="Sparrow Limit"
              value={sparrowLimit > 0 ? `${sparrowLimit.toFixed(2)}"` : "—"}
              info="Just-resolved separation"
            />
            <ResultCard
              label="Theoretical (550nm)"
              value={theoreticalResolution > 0 ? `${theoreticalResolution.toFixed(2)}"` : "—"}
              info="λ/D at green wavelength"
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">What Can You Resolve?</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {dawesLimit > 0 && (
                <>
                  <ResolvedObject object="Jupiter's Great Red Spot" size={1.5} limit={dawesLimit} />
                  <ResolvedObject object="Saturn's Cassini Division" size={0.7} limit={dawesLimit} />
                  <ResolvedObject object="Mars polar caps" size={2} limit={dawesLimit} />
                  <ResolvedObject object="Lunar craters (small)" size={1} limit={dawesLimit} />
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium">Resolution Notes:</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Resolution in practice limited by seeing conditions (~1-2" typical)</li>
              <li>• Dawes limit is most commonly used for visual double stars</li>
              <li>• Larger apertures can show more detail when seeing permits</li>
              <li>• Contrast also affects ability to resolve detail</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ResultCard({ label, value, info }: { label: string; value: string; info?: string }) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {info && <div className="text-xs text-muted-foreground mt-1">{info}</div>}
    </div>
  );
}

function ResolvedObject({ object, size, limit }: { object: string; size: number; limit: number }) {
  const canResolve = limit < size;
  return (
    <div className={`flex items-center gap-2 ${canResolve ? 'text-green-700 dark:text-green-400' : 'text-gray-500'}`}>
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: canResolve ? 'rgb(34 197 94)' : 'rgb(156 163 175)' }} />
      <span>{object} ({size}")</span>
    </div>
  );
}

export function OpticalCalculator() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Optical Calculators</h2>
      <p className="text-muted-foreground mb-6">
        Interactive calculators for telescope optical design and performance analysis.
      </p>

      <Tabs defaultValue="basic">
        <TabsList className="mb-4">
          <TabsTrigger value="basic">Basic Optics</TabsTrigger>
          <TabsTrigger value="secondary">Secondary Mirror</TabsTrigger>
          <TabsTrigger value="resolution">Resolution</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <BasicCalculator />
        </TabsContent>

        <TabsContent value="secondary">
          <SecondaryCalculator />
        </TabsContent>

        <TabsContent value="resolution">
          <ResolutionCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
