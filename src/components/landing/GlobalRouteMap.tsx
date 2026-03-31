'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface City {
  name: string;
  code: string;
  lat: number;
  lng: number;
}

const cities: City[] = [
  { name: 'New York', code: 'JFK', lat: 40.64, lng: -73.78 },
  { name: 'London', code: 'LHR', lat: 51.47, lng: -0.46 },
  { name: 'Paris', code: 'CDG', lat: 49.01, lng: 2.55 },
  { name: 'Dubai', code: 'DXB', lat: 25.25, lng: 55.36 },
  { name: 'Singapore', code: 'SIN', lat: 1.35, lng: 103.99 },
  { name: 'Hong Kong', code: 'HKG', lat: 22.31, lng: 113.91 },
  { name: 'Tokyo', code: 'NRT', lat: 35.76, lng: 140.39 },
  { name: 'Sydney', code: 'SYD', lat: -33.95, lng: 151.18 },
  { name: 'São Paulo', code: 'GRU', lat: -23.43, lng: -46.47 },
  { name: 'Los Angeles', code: 'LAX', lat: 33.94, lng: -118.41 },
  { name: 'Miami', code: 'MIA', lat: 25.80, lng: -80.29 },
  { name: 'Cape Town', code: 'CPT', lat: -33.96, lng: 18.60 },
  { name: 'Moscow', code: 'SVO', lat: 55.97, lng: 37.41 },
  { name: 'Mumbai', code: 'BOM', lat: 19.09, lng: 72.87 },
  { name: 'Geneva', code: 'GVA', lat: 46.24, lng: 6.11 },
  { name: 'Jeddah', code: 'JED', lat: 21.68, lng: 39.16 },
];

const routes: [number, number][] = [
  [0, 1], [0, 2], [0, 9], [0, 10], [0, 8],
  [1, 2], [1, 3], [1, 12], [1, 6], [1, 14],
  [2, 3], [2, 11], [2, 15],
  [3, 4], [3, 13], [3, 5], [3, 15],
  [4, 5], [4, 7], [4, 13],
  [5, 6], [5, 7],
  [6, 7],
  [8, 10], [8, 11],
  [9, 6], [9, 10],
  [12, 3], [12, 5],
  [13, 4], [13, 15],
  [14, 3],
];

// Mercator projection
function project(lat: number, lng: number): [number, number] {
  const x = (lng + 180) * (1000 / 360);
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = 500 / 2 - (500 * mercN) / (2 * Math.PI);
  return [x, y];
}

export default function GlobalRouteMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const animProgress = useRef(0);
  const animFrame = useRef(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // Scale and offset for the map
    const mapScale = w / 1000;
    const mapOffsetY = -40 * mapScale;

    const proj = (lat: number, lng: number): [number, number] => {
      const [px, py] = project(lat, lng);
      return [px * mapScale, py * mapScale + mapOffsetY];
    };

    // Draw grid
    ctx.strokeStyle = 'rgba(138, 164, 190, 0.04)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 36; i++) {
      const x = (i / 36) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let i = 0; i <= 18; i++) {
      const y = (i / 18) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw world land masses using dot matrix style
    const landCoords = [
      // North America outline
      ...[[-10, 60], [-20, 55], [-30, 50], [-40, 48], [-55, 47], [-65, 43], [-70, 40], [-75, 38], [-80, 35], [-82, 30], [-85, 28], [-90, 30], [-95, 30], [-100, 32], [-105, 35], [-110, 32], [-115, 34], [-118, 38], [-122, 40], [-125, 44], [-125, 48], [-130, 55], [-140, 60], [-150, 60], [-160, 62], [-165, 65], [-160, 70], [-140, 72], [-120, 70], [-100, 68], [-80, 65], [-65, 60], [-55, 50], [-40, 48]].map(([lng, lat]) => ({ lat, lng })),
      // Europe
      ...[[-10, 52], [0, 51], [5, 52], [10, 55], [15, 55], [20, 54], [25, 55], [30, 60], [35, 58], [30, 50], [25, 47], [20, 45], [15, 45], [10, 44], [5, 46], [0, 48], [-5, 48], [-10, 44]].map(([lng, lat]) => ({ lat, lng })),
      // Africa
      ...[[-15, 30], [-5, 35], [10, 37], [15, 33], [25, 32], [30, 30], [33, 28], [35, 22], [40, 12], [42, 5], [40, -2], [35, -10], [30, -20], [25, -30], [20, -35], [15, -30], [12, -20], [10, -5], [5, 5], [0, 5], [-5, 10], [-15, 15], [-17, 20], [-15, 25]].map(([lng, lat]) => ({ lat, lng })),
      // Asia
      ...[[35, 35], [40, 38], [45, 40], [50, 38], [55, 35], [60, 30], [65, 25], [70, 20], [75, 15], [80, 10], [85, 15], [90, 22], [95, 18], [100, 15], [105, 10], [108, 15], [110, 20], [115, 22], [120, 25], [125, 30], [130, 35], [135, 38], [140, 40], [142, 45], [140, 50], [135, 55], [120, 55], [100, 55], [85, 55], [75, 52], [65, 48], [55, 45], [45, 42], [40, 40]].map(([lng, lat]) => ({ lat, lng })),
      // South America
      ...[[-80, 10], [-75, 5], [-70, -5], [-65, -15], [-60, -20], [-55, -25], [-50, -25], [-45, -23], [-40, -15], [-38, -10], [-35, -5], [-50, 5], [-60, 8], [-70, 10], [-75, 12]].map(([lng, lat]) => ({ lat, lng })),
      // Australia
      ...[[115, -15], [120, -15], [130, -15], [140, -18], [150, -25], [153, -28], [150, -35], [140, -38], [130, -35], [120, -30], [115, -25], [115, -20]].map(([lng, lat]) => ({ lat, lng })),
    ];

    // Draw dots for land masses
    ctx.fillStyle = 'rgba(138, 164, 190, 0.08)';
    const dotSpacing = Math.max(8, 12 * mapScale);
    for (let x = 0; x < w; x += dotSpacing) {
      for (let y = 0; y < h; y += dotSpacing) {
        // Convert screen coords back to lat/lng
        const lng = (x / mapScale) * 360 / 1000 - 180;
        const mercY = ((500 / 2 - (y - mapOffsetY) / mapScale) * 2 * Math.PI) / 500;
        const lat = (2 * Math.atan(Math.exp(mercY)) - Math.PI / 2) * 180 / Math.PI;

        // Simple point-in-region check
        let isLand = false;
        for (const coord of landCoords) {
          const dist = Math.sqrt(Math.pow(lat - coord.lat, 2) + Math.pow(lng - coord.lng, 2));
          if (dist < 8) {
            isLand = true;
            break;
          }
        }
        if (isLand) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Animated progress
    const progress = animProgress.current;

    // Draw routes
    routes.forEach(([a, b], i) => {
      const routeProgress = Math.max(0, Math.min(1, (progress - i * 0.02) / 0.6));
      if (routeProgress <= 0) return;

      const [x1, y1] = proj(cities[a].lat, cities[a].lng);
      const [x2, y2] = proj(cities[b].lat, cities[b].lng);

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, 'rgba(201, 168, 76, 0.15)');
      gradient.addColorStop(0.5, 'rgba(212, 175, 55, 0.35)');
      gradient.addColorStop(1, 'rgba(201, 168, 76, 0.15)');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1;
      ctx.setLineDash([]);

      // Draw arc
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const bulge = Math.min(dist * 0.2, 40);
      const mx = (x1 + x2) / 2 - (dy / dist) * bulge;
      const my = (y1 + y2) / 2 + (dx / dist) * bulge;

      ctx.beginPath();
      ctx.moveTo(x1, y1);

      // Partial draw based on progress
      const steps = 50;
      const drawSteps = Math.floor(steps * routeProgress);
      for (let s = 1; s <= drawSteps; s++) {
        const t = s / steps;
        const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2;
        const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    });

    // Draw city markers
    cities.forEach((city, i) => {
      const cityProgress = Math.max(0, Math.min(1, (progress - 0.2) / 0.5));
      if (cityProgress <= 0) return;

      const [cx, cy] = proj(city.lat, city.lng);

      // Glow
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8 * cityProgress);
      grd.addColorStop(0, `rgba(212, 175, 55, ${0.3 * cityProgress})`);
      grd.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, 8 * cityProgress, 0, Math.PI * 2);
      ctx.fill();

      // Pulse ring
      ctx.strokeStyle = `rgba(201, 168, 76, ${0.2 * cityProgress})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 5 + Math.sin(Date.now() / 800 + i) * 2, 0, Math.PI * 2);
      ctx.stroke();

      // Dot
      ctx.fillStyle = `rgba(212, 175, 55, ${cityProgress})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      // Code label
      ctx.font = `bold ${Math.max(9, 11 * mapScale)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = `rgba(201, 168, 76, ${0.9 * cityProgress})`;
      ctx.textAlign = 'center';
      ctx.fillText(city.code, cx, cy - 10);

      // City name
      ctx.font = `${Math.max(7, 9 * mapScale)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = `rgba(138, 164, 190, ${0.5 * cityProgress})`;
      ctx.fillText(city.name, cx, cy + 16);
    });
  }, []);

  useEffect(() => {
    if (!visible) return;

    const startTime = Date.now();
    const duration = 3000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      animProgress.current = Math.min(1, elapsed / duration);
      draw();
      if (animProgress.current < 1) {
        animFrame.current = requestAnimationFrame(animate);
      }
    };

    animFrame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame.current);
  }, [visible, draw]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (visible) draw();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [visible, draw]);

  return (
    <div ref={containerRef} className="relative w-full max-w-6xl mx-auto">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: 'clamp(280px, 45vw, 500px)' }}
      />

      {/* JETVORYX Select badge */}
      <div
        className={`absolute bottom-4 left-4 sm:bottom-6 sm:left-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ transitionDelay: '2s' }}
      >
        <div className="glass rounded-lg px-4 py-2.5 flex items-center gap-2.5 border border-white/5">
          <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          <span className="text-xs sm:text-sm font-semibold text-gold tracking-wider uppercase">JETVORYX Select</span>
        </div>
      </div>

      {/* Stats overlay */}
      <div
        className={`absolute bottom-4 right-4 sm:bottom-6 sm:right-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ transitionDelay: '2.5s' }}
      >
        <div className="glass rounded-lg px-4 py-2.5 border border-white/5 text-right">
          <span className="text-xs text-white/30 block">Global Network</span>
          <span className="text-lg font-display font-bold text-gold">{cities.length} Hubs</span>
        </div>
      </div>
    </div>
  );
}
