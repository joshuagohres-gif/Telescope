import { useEffect, useRef } from "react";

interface TelescopeDesign {
  aperture_mm: number;
  focal_ratio: number;
  focal_length_mm: number;
  type: string;
  obstruction_pct?: number;
  tube_diameter_mm?: number;
  secondary_size_mm?: number;
}

export function TelescopePreview({ design }: { design: TelescopeDesign }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate dimensions
    const aperture = design.aperture_mm;
    const focalLength = design.focal_length_mm;
    const tubeDiameter = design.tube_diameter_mm || aperture * 1.1;
    const tubeLength = focalLength * 1.1; // Add some margin

    // Scale to fit canvas (leave 20px padding)
    const padding = 40;
    const availableWidth = canvas.width - 2 * padding;
    const availableHeight = canvas.height - 2 * padding;

    const scale = Math.min(
      availableWidth / tubeLength,
      availableHeight / tubeDiameter
    );

    // Center the drawing
    const scaledLength = tubeLength * scale;
    const scaledDiameter = tubeDiameter * scale;
    const offsetX = (canvas.width - scaledLength) / 2;
    const offsetY = (canvas.height - scaledDiameter) / 2;

    // Draw based on telescope type
    if (design.type === "newtonian" || design.type === "dobsonian") {
      drawNewtonianTelescope(ctx, {
        x: offsetX,
        y: offsetY,
        length: scaledLength,
        diameter: scaledDiameter,
        aperture: aperture * scale,
        focalLength: focalLength * scale,
        secondarySize: (design.secondary_size_mm || aperture * 0.2) * scale,
      });
    } else if (design.type === "refractor") {
      drawRefractor(ctx, {
        x: offsetX,
        y: offsetY,
        length: scaledLength,
        diameter: scaledDiameter,
        aperture: aperture * scale,
      });
    } else {
      // Generic telescope
      drawGenericTelescope(ctx, {
        x: offsetX,
        y: offsetY,
        length: scaledLength,
        diameter: scaledDiameter,
      });
    }

    // Draw scale reference
    ctx.fillStyle = "#666";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${aperture}mm aperture • ${focalLength}mm FL • f/${design.focal_ratio}`, canvas.width / 2, canvas.height - 10);

  }, [design]);

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg p-4">
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="w-full h-auto"
      />
    </div>
  );
}

function drawNewtonianTelescope(
  ctx: CanvasRenderingContext2D,
  params: {
    x: number;
    y: number;
    length: number;
    diameter: number;
    aperture: number;
    focalLength: number;
    secondarySize: number;
  }
) {
  const { x, y, length, diameter, aperture, focalLength, secondarySize } = params;

  // Tube
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(x, y, length, diameter);
  ctx.stroke();

  // Fill tube with dark gradient
  const gradient = ctx.createLinearGradient(x, y, x, y + diameter);
  gradient.addColorStop(0, "rgba(59, 130, 246, 0.1)");
  gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.2)");
  gradient.addColorStop(1, "rgba(59, 130, 246, 0.1)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, length, diameter);

  // Primary mirror (back)
  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + length - 10, y + (diameter - aperture) / 2);
  ctx.lineTo(x + length - 10, y + (diameter + aperture) / 2);
  ctx.stroke();

  // Secondary mirror (45° diagonal)
  const secondaryX = x + focalLength * 0.9;
  const secondaryY = y + diameter / 2;
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.save();
  ctx.translate(secondaryX, secondaryY);
  ctx.rotate(Math.PI / 4);
  ctx.beginPath();
  ctx.moveTo(-secondarySize / 2, 0);
  ctx.lineTo(secondarySize / 2, 0);
  ctx.stroke();
  ctx.restore();

  // Spider vanes
  ctx.strokeStyle = "#6b7280";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(secondaryX, y);
  ctx.lineTo(secondaryX, secondaryY - secondarySize / 2);
  ctx.moveTo(secondaryX, y + diameter);
  ctx.lineTo(secondaryX, secondaryY + secondarySize / 2);
  ctx.stroke();

  // Focuser (side)
  const focuserX = x + focalLength;
  const focuserY = y - 30;
  ctx.fillStyle = "#10b981";
  ctx.fillRect(focuserX - 10, focuserY, 20, 30);
  ctx.strokeStyle = "#059669";
  ctx.lineWidth = 1;
  ctx.strokeRect(focuserX - 10, focuserY, 20, 30);

  // Light path (dotted line)
  ctx.strokeStyle = "#fbbf24";
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  // From primary to secondary
  ctx.moveTo(x + length - 10, y + diameter / 2);
  ctx.lineTo(secondaryX, secondaryY);
  // From secondary to focuser
  ctx.lineTo(focuserX, focuserY + 15);
  ctx.stroke();
  ctx.setLineDash([]);

  // Labels
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Primary", x + length - 60, y + diameter + 15);
  ctx.fillText("Secondary", secondaryX - 35, secondaryY - 15);
  ctx.fillText("Focuser", focuserX + 5, focuserY + 20);
}

function drawRefractor(
  ctx: CanvasRenderingContext2D,
  params: {
    x: number;
    y: number;
    length: number;
    diameter: number;
    aperture: number;
  }
) {
  const { x, y, length, diameter, aperture } = params;

  // Tube
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(x, y, length, diameter);
  ctx.stroke();

  // Fill tube
  const gradient = ctx.createLinearGradient(x, y, x, y + diameter);
  gradient.addColorStop(0, "rgba(59, 130, 246, 0.1)");
  gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.2)");
  gradient.addColorStop(1, "rgba(59, 130, 246, 0.1)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, length, diameter);

  // Objective lens (front)
  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + 15, y + diameter / 2, aperture / 2, 0, Math.PI * 2);
  ctx.stroke();

  // Focuser (back)
  const focuserX = x + length - 30;
  const focuserY = y + diameter / 2 - 15;
  ctx.fillStyle = "#10b981";
  ctx.fillRect(focuserX, focuserY, 40, 30);
  ctx.strokeStyle = "#059669";
  ctx.lineWidth = 1;
  ctx.strokeRect(focuserX, focuserY, 40, 30);

  // Light path
  ctx.strokeStyle = "#fbbf24";
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 15, y + diameter / 2);
  ctx.lineTo(x + length - 10, y + diameter / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Labels
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "11px sans-serif";
  ctx.fillText("Objective", x + 5, y - 10);
  ctx.fillText("Focuser", focuserX, focuserY - 5);
}

function drawGenericTelescope(
  ctx: CanvasRenderingContext2D,
  params: {
    x: number;
    y: number;
    length: number;
    diameter: number;
  }
) {
  const { x, y, length, diameter } = params;

  // Simple tube representation
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(x, y, length, diameter);
  ctx.stroke();

  ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
  ctx.fillRect(x, y, length, diameter);

  ctx.fillStyle = "#e5e7eb";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Telescope Preview", x + length / 2, y + diameter / 2);
}
