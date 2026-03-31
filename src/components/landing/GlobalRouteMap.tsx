'use client';

import { useEffect, useRef, useState } from 'react';

interface City {
  name: string;
  code: string;
  x: number;
  y: number;
}

const cities: City[] = [
  { name: 'New York', code: 'JFK', x: 27.5, y: 37 },
  { name: 'London', code: 'LHR', x: 47, y: 28 },
  { name: 'Paris', code: 'CDG', x: 48.5, y: 31 },
  { name: 'Dubai', code: 'DXB', x: 60, y: 40 },
  { name: 'Singapore', code: 'SIN', x: 73, y: 55 },
  { name: 'Hong Kong', code: 'HKG', x: 76, y: 41 },
  { name: 'Tokyo', code: 'NRT', x: 82, y: 35 },
  { name: 'Sydney', code: 'SYD', x: 85, y: 71 },
  { name: 'São Paulo', code: 'GRU', x: 32, y: 63 },
  { name: 'Los Angeles', code: 'LAX', x: 13, y: 37 },
  { name: 'Miami', code: 'MIA', x: 24, y: 43 },
  { name: 'Cape Town', code: 'CPT', x: 52, y: 71 },
  { name: 'Moscow', code: 'SVO', x: 58, y: 25 },
  { name: 'Mumbai', code: 'BOM', x: 65, y: 45 },
  { name: 'Geneva', code: 'GVA', x: 49, y: 30.5 },
  { name: 'Jeddah', code: 'JED', x: 56, y: 42 },
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

function arcPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const bulge = Math.min(dist * 0.25, 8);
  const mx = (x1 + x2) / 2 - (dy / dist) * bulge;
  const my = (y1 + y2) / 2 + (dx / dist) * bulge;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

// More detailed world map paths (simplified but better looking)
const continentPaths = {
  northAmerica: 'M5,22 L8,18 L12,15 L16,14 L20,15 L23,17 L26,20 L28,24 L30,28 L29,32 L27,36 L28,40 L27,44 L24,46 L20,45 L18,42 L16,38 L14,36 L12,38 L10,36 L8,32 L7,28 L6,25 Z M15,16 L18,14 L22,14 L25,15 L23,17 L19,16 Z',
  southAmerica: 'M24,48 L27,46 L30,47 L33,49 L35,53 L36,58 L35,63 L34,67 L32,71 L30,73 L28,71 L26,66 L25,60 L24,55 L23,51 Z',
  europe: 'M44,16 L46,14 L49,14 L52,15 L55,17 L57,20 L56,23 L54,26 L52,29 L50,31 L48,30 L46,28 L44,25 L43,21 Z M50,14 L53,13 L56,15 Z',
  africa: 'M44,33 L47,31 L51,33 L54,36 L57,40 L58,46 L57,52 L55,58 L53,63 L51,68 L49,72 L47,71 L45,66 L43,60 L41,52 L42,46 L43,40 Z',
  asia: 'M57,14 L62,12 L68,12 L74,14 L79,17 L83,20 L85,24 L84,28 L82,32 L78,36 L74,38 L70,40 L66,42 L62,40 L59,36 L57,30 L55,24 L56,18 Z',
  middleEast: 'M55,31 L59,29 L63,31 L65,35 L64,39 L61,42 L58,40 L56,36 Z',
  india: 'M63,38 L67,36 L70,39 L69,44 L67,49 L65,48 L63,44 Z',
  seAsia: 'M72,40 L75,38 L78,40 L77,46 L75,50 L73,48 L71,44 Z',
  australia: 'M78,58 L82,56 L87,57 L90,60 L90,65 L88,69 L85,72 L81,71 L79,67 L77,62 Z',
  japan: 'M82,28 L84,26 L85,28 L84,33 L83,35 L82,32 Z',
  greenland: 'M30,8 L34,6 L38,7 L40,10 L38,14 L34,15 L31,13 L29,10 Z',
};

export default function GlobalRouteMap() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative w-full max-w-6xl mx-auto">
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.03) 0%, transparent 70%)' }} />

      <svg
        viewBox="0 0 100 80"
        className="w-full h-auto"
        style={{ filter: 'drop-shadow(0 0 30px rgba(201, 168, 76, 0.04))' }}
      >
        <defs>
          <linearGradient id="routeGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#d4af37" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#c9a84c" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="cityGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d4af37" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="0.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Grid pattern */}
          <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(138,164,190,0.03)" strokeWidth="0.1" />
          </pattern>
        </defs>

        {/* Grid background */}
        <rect width="100" height="80" fill="url(#grid)" />

        {/* Continent shapes */}
        <g>
          {Object.values(continentPaths).map((d, i) => (
            <path
              key={i}
              d={d}
              fill="rgba(138,164,190,0.06)"
              stroke="rgba(138,164,190,0.08)"
              strokeWidth="0.15"
              opacity={visible ? 1 : 0}
              style={{ transition: `opacity 1s ease ${i * 0.05}s` }}
            />
          ))}
        </g>

        {/* Route lines */}
        <g>
          {routes.map(([a, b], i) => {
            const c1 = cities[a];
            const c2 = cities[b];
            const d = arcPath(c1.x, c1.y, c2.x, c2.y);
            const len = Math.sqrt(Math.pow(c2.x - c1.x, 2) + Math.pow(c2.y - c1.y, 2)) * 3;
            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="url(#routeGold)"
                strokeWidth="0.12"
                strokeLinecap="round"
                opacity={visible ? 0.6 : 0}
                strokeDasharray={len}
                strokeDashoffset={visible ? 0 : len}
                style={{
                  transition: `opacity 0.6s ease ${i * 0.06}s, stroke-dashoffset 1.5s ease ${i * 0.06}s`,
                }}
              />
            );
          })}
        </g>

        {/* City markers */}
        {cities.map((city, i) => (
          <g
            key={i}
            opacity={visible ? 1 : 0}
            style={{ transition: `opacity 0.5s ease ${i * 0.08 + 0.5}s` }}
          >
            {/* Pulse ring */}
            <circle
              cx={city.x}
              cy={city.y}
              r="1.5"
              fill="none"
              stroke="rgba(201,168,76,0.2)"
              strokeWidth="0.08"
              className={visible ? 'animate-pulse' : ''}
            />
            {/* Glow */}
            <circle cx={city.x} cy={city.y} r="1" fill="url(#cityGlow)" />
            {/* Dot */}
            <circle cx={city.x} cy={city.y} r="0.4" fill="#d4af37" filter="url(#glow)" />
            {/* Code label */}
            <text
              x={city.x}
              y={city.y - 2}
              textAnchor="middle"
              fill="#c9a84c"
              fontSize="1.4"
              fontFamily="Inter, sans-serif"
              fontWeight="600"
              letterSpacing="0.08em"
              opacity="0.8"
            >
              {city.code}
            </text>
            {/* City name */}
            <text
              x={city.x}
              y={city.y + 2.8}
              textAnchor="middle"
              fill="rgba(138,164,190,0.5)"
              fontSize="1.1"
              fontFamily="Inter, sans-serif"
              fontWeight="400"
            >
              {city.name}
            </text>
          </g>
        ))}
      </svg>

      {/* JETVORYX Select badge */}
      <div
        className={`absolute bottom-4 left-4 sm:bottom-8 sm:left-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ transitionDelay: '1.2s' }}
      >
        <div className="glass rounded-lg px-4 py-2.5 flex items-center gap-2.5 border border-white/5">
          <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          <span className="text-xs sm:text-sm font-semibold text-gold tracking-wider uppercase">JETVORYX Select</span>
        </div>
      </div>

      {/* Stats overlay */}
      <div
        className={`absolute bottom-4 right-4 sm:bottom-8 sm:right-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ transitionDelay: '1.4s' }}
      >
        <div className="glass rounded-lg px-4 py-2.5 border border-white/5 text-right">
          <span className="text-xs text-white/30 block">Connected Destinations</span>
          <span className="text-lg font-display font-bold text-gold">{cities.length}</span>
        </div>
      </div>
    </div>
  );
}
