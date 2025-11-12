import { useEffect, useRef, useState } from 'react';

interface LiquidGlassOptions {
  intensity?: number;
  borderRadius?: number;
  enabled?: boolean;
}

// Utility functions from the original liquid-glass.js
function smoothStep(a: number, b: number, t: number): number {
  t = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

function roundedRectSDF(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): number {
  const qx = Math.abs(x) - width + radius;
  const qy = Math.abs(y) - height + radius;
  return (
    Math.min(Math.max(qx, qy), 0) +
    length(Math.max(qx, 0), Math.max(qy, 0)) -
    radius
  );
}

export function useLiquidGlass(options: LiquidGlassOptions = {}) {
  const { intensity = 0.5, borderRadius = 0.6, enabled = true } = options;
  const elementRef = useRef<HTMLElement>(null);
  const [filterId] = useState(() => `liquid-glass-${Math.random().toString(36).substr(2, 9)}`);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    const element = elementRef.current;
    
    // Create SVG with filter
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.cssText = 'position: fixed; top: 0; left: 0; pointer-events: none; z-index: -1;';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', filterId);
    filter.setAttribute('filterUnits', 'userSpaceOnUse');
    filter.setAttribute('colorInterpolationFilters', 'sRGB');

    const feImage = document.createElementNS('http://www.w3.org/2000/svg', 'feImage');
    feImage.setAttribute('id', `${filterId}_map`);

    const feDisplacementMap = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
    feDisplacementMap.setAttribute('in', 'SourceGraphic');
    feDisplacementMap.setAttribute('in2', `${filterId}_map`);
    feDisplacementMap.setAttribute('xChannelSelector', 'R');
    feDisplacementMap.setAttribute('yChannelSelector', 'G');
    feDisplacementMap.setAttribute('scale', (15 * intensity).toString());

    filter.appendChild(feImage);
    filter.appendChild(feDisplacementMap);
    defs.appendChild(filter);
    svg.appendChild(defs);
    
    document.body.appendChild(svg);
    svgRef.current = svg;

    // Create canvas for displacement map
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    canvasRef.current = canvas;

    // Apply filter to element
    element.style.filter = `url(#${filterId}) blur(0.25px) contrast(1.1) brightness(1.03) saturate(1.05)`;
    
    const updateDisplacementMap = () => {
      if (!canvasRef.current) return;
      
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const data = new Uint8ClampedArray(w * h * 4);
      const mouse = mouseRef.current;

      let maxScale = 0;
      const rawValues: number[] = [];

      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % w;
        const y = Math.floor(i / 4 / w);
        const uvX = x / w;
        const uvY = y / h;

        const ix = uvX - 0.5;
        const iy = uvY - 0.5;
        
        // Create a subtle distortion that responds to mouse
        const distanceToMouse = length(ix - (mouse.x - 0.5), iy - (mouse.y - 0.5));
        const distanceToEdge = roundedRectSDF(ix, iy, 0.35, 0.35, borderRadius);
        const displacement = smoothStep(0.8, 0, distanceToEdge - 0.1) * intensity;
        const mouseInfluence = smoothStep(0.3, 0, distanceToMouse) * 0.3 * intensity;
        
        const scaled = smoothStep(0, 1, displacement + mouseInfluence);
        
        const newX = ix * (1 - scaled * 0.05) + 0.5;
        const newY = iy * (1 - scaled * 0.05) + 0.5;
        
        const dx = newX * w - x;
        const dy = newY * h - y;
        
        maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
        rawValues.push(dx, dy);
      }

      maxScale = maxScale * 0.5 || 1;

      let index = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = rawValues[index++] / maxScale + 0.5;
        const g = rawValues[index++] / maxScale + 0.5;
        data[i] = r * 255;
        data[i + 1] = g * 255;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }

      ctx.putImageData(new ImageData(data, w, h), 0, 0);
      feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvas.toDataURL());
    };

    // Update on mouse move
    const handleMouseMove = (e: MouseEvent) => {
      if (!element) return;
      
      const rect = element.getBoundingClientRect();
      mouseRef.current = {
        x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
      };
      
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateDisplacementMap);
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseenter', handleMouseMove);
    
    // Initial render
    updateDisplacementMap();

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseenter', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (svgRef.current) svgRef.current.remove();
      if (element) element.style.filter = '';
    };
  }, [filterId, intensity, borderRadius, enabled]);

  return elementRef;
}
