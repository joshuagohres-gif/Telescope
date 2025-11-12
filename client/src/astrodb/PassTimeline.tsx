import { type SatellitePass } from "@/hooks/use-astrodb";

interface PassTimelineProps {
  passes: SatellitePass[];
}

export function PassTimeline({ passes }: PassTimelineProps) {
  // Group passes by date
  const passesByDate = passes.reduce((acc, pass) => {
    const date = new Date(pass.riseTime).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(pass);
    return acc;
  }, {} as Record<string, SatellitePass[]>);

  const getBrightnessColor = (mag: number | null) => {
    if (mag === null) return "bg-gray-400";
    if (mag < -2) return "bg-yellow-400"; // Very bright
    if (mag < 0) return "bg-yellow-500"; // Bright
    if (mag < 2) return "bg-orange-400"; // Moderate
    return "bg-gray-400"; // Faint
  };

  const getAltitudeHeight = (alt: number) => {
    // Scale altitude (0-90°) to height (20-100px)
    return Math.max(20, Math.min(100, (alt / 90) * 100));
  };

  return (
    <div className="space-y-6">
      {Object.entries(passesByDate).map(([date, datePasses]) => (
        <div key={date}>
          <h4 className="text-sm font-medium mb-3">{date}</h4>
          <div className="relative h-32 bg-muted/30 rounded-lg p-4">
            {/* Time markers */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-between text-xs text-muted-foreground px-4">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:59</span>
            </div>

            {/* Passes */}
            <div className="relative h-20">
              {datePasses.map((pass, index) => {
                const riseTime = new Date(pass.riseTime);
                const setTime = new Date(pass.setTime);
                const maxTime = new Date(pass.maxTime);

                // Calculate positions (0-100%)
                const startOfDay = new Date(riseTime);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(riseTime);
                endOfDay.setHours(23, 59, 59, 999);

                const dayDuration = endOfDay.getTime() - startOfDay.getTime();
                const risePosition = ((riseTime.getTime() - startOfDay.getTime()) / dayDuration) * 100;
                const setPosition = ((setTime.getTime() - startOfDay.getTime()) / dayDuration) * 100;
                const maxPosition = ((maxTime.getTime() - startOfDay.getTime()) / dayDuration) * 100;
                const duration = setPosition - risePosition;

                const height = getAltitudeHeight(pass.maxAlt);
                const color = getBrightnessColor(pass.maxMag);

                return (
                  <div
                    key={index}
                    className="absolute"
                    style={{
                      left: `${risePosition}%`,
                      width: `${duration}%`,
                      bottom: 0,
                    }}
                  >
                    {/* Pass arc */}
                    <div className="relative" style={{ height: `${height}px` }}>
                      <svg
                        className="absolute inset-0 w-full h-full"
                        preserveAspectRatio="none"
                      >
                        <path
                          d={`M 0 ${height} Q ${(duration / 2) * 4} 0 100 ${height}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-primary opacity-50"
                        />
                      </svg>
                      {/* Peak marker */}
                      <div
                        className={`absolute top-0 w-3 h-3 rounded-full ${color} border-2 border-white shadow-lg`}
                        style={{ left: `${((maxPosition - risePosition) / duration) * 100}%`, transform: "translate(-50%, -50%)" }}
                        title={`Max altitude: ${pass.maxAlt.toFixed(0)}°, Mag: ${pass.maxMag?.toFixed(1) ?? "N/A"}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
