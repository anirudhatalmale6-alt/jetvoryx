'use client';

import { useEffect, useRef, useState } from 'react';

interface City {
  name: string;
  lat: number;
  lng: number;
}

const cities: City[] = [
  { name: 'NEW YORK', lat: 40.7, lng: -74.0 },
  { name: 'LONDON', lat: 51.5, lng: -0.1 },
  { name: 'PARIS', lat: 48.9, lng: 2.3 },
  { name: 'DUBAI', lat: 25.3, lng: 55.3 },
  { name: 'SINGAPORE', lat: 1.3, lng: 103.8 },
  { name: 'HONG KONG', lat: 22.3, lng: 114.2 },
  { name: 'TOKYO', lat: 35.7, lng: 139.7 },
  { name: 'SYDNEY', lat: -33.9, lng: 151.2 },
  { name: 'SÃO PAULO', lat: -23.5, lng: -46.6 },
  { name: 'LOS ANGELES', lat: 34.1, lng: -118.2 },
  { name: 'MIAMI', lat: 25.8, lng: -80.2 },
  { name: 'CAPE TOWN', lat: -33.9, lng: 18.4 },
  { name: 'MOSCOW', lat: 55.8, lng: 37.6 },
  { name: 'DELHI', lat: 28.6, lng: 77.2 },
  { name: 'SHANGHAI', lat: 31.2, lng: 121.5 },
  { name: 'ZURICH', lat: 47.4, lng: 8.5 },
];

// Equirectangular projection
function toXY(lat: number, lng: number, w: number, h: number): [number, number] {
  const x = ((lng + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return [x, y];
}

// Simplified but recognizable continent paths (SVG path data in equirectangular projection, 0-1000 x 0-500)
const continents = [
  // North America
  'M65,95 L80,85 L95,80 L115,78 L140,82 L160,90 L175,100 L185,110 L195,120 L200,130 L195,140 L185,155 L180,165 L175,175 L165,180 L155,182 L148,178 L142,172 L135,175 L128,180 L120,182 L115,178 L108,172 L100,175 L95,180 L88,175 L82,168 L78,160 L72,155 L68,148 L62,140 L58,130 L55,120 L52,112 L55,105 L60,98 Z M170,78 L180,72 L195,72 L210,76 L215,82 L208,88 L198,92 L185,90 L178,85 Z',
  // South America
  'M175,195 L182,190 L192,192 L200,198 L208,208 L215,218 L220,230 L222,245 L218,260 L212,275 L205,288 L198,300 L190,310 L182,315 L175,310 L168,298 L162,285 L158,270 L155,255 L152,240 L152,225 L155,215 L160,205 L168,198 Z',
  // Europe
  'M455,78 L462,72 L475,70 L490,72 L505,76 L518,82 L528,90 L530,98 L525,108 L518,115 L510,122 L502,128 L495,125 L488,120 L480,118 L472,120 L465,115 L458,108 L452,100 L448,92 L450,85 Z',
  // Africa
  'M455,135 L465,128 L478,130 L492,135 L505,142 L515,152 L522,165 L528,180 L530,198 L528,218 L522,238 L515,258 L508,275 L498,290 L488,300 L478,305 L468,300 L458,288 L448,272 L440,255 L435,238 L432,218 L432,198 L435,180 L440,165 L448,150 Z',
  // Asia
  'M530,65 L548,58 L568,55 L592,55 L618,60 L642,68 L665,78 L682,90 L692,105 L688,118 L680,132 L668,145 L652,155 L635,162 L618,168 L600,172 L582,170 L565,165 L550,158 L538,148 L530,138 L525,125 L522,112 L520,98 L522,85 L528,75 Z',
  // Middle East / India subcontinent
  'M548,135 L562,128 L578,132 L588,140 L595,152 L598,165 L595,178 L588,188 L578,195 L568,192 L558,185 L550,175 L545,162 L542,150 L545,142 Z',
  // Southeast Asia / Indonesia
  'M618,172 L632,168 L648,172 L658,180 L662,192 L658,205 L648,215 L638,218 L628,215 L618,208 L612,198 L612,185 Z',
  // Australia
  'M668,260 L685,252 L705,250 L725,255 L738,265 L742,280 L738,295 L728,308 L715,315 L700,318 L685,312 L672,302 L665,288 L662,275 Z',
  // Japan
  'M692,100 L698,92 L705,95 L708,105 L705,115 L698,122 L692,118 L690,110 Z',
  // Greenland
  'M268,42 L282,35 L298,38 L310,45 L312,55 L305,65 L292,68 L278,65 L270,58 L265,50 Z',
  // UK/Ireland
  'M448,78 L455,72 L462,75 L460,85 L455,90 L448,88 Z',
  // Madagascar
  'M545,285 L550,278 L555,282 L555,295 L550,302 L545,298 Z',
  // New Zealand
  'M748,310 L752,305 L758,308 L758,320 L752,328 L748,322 Z',
];

export default function GlobalRouteMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const svgW = 1000;
  const svgH = 500;

  return (
    <div ref={containerRef} className="relative w-full max-w-6xl mx-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background */}
        <rect width={svgW} height={svgH} fill="transparent" />

        {/* Continent shapes - filled, no stroke */}
        <g>
          {continents.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="rgba(138, 164, 190, 0.12)"
              stroke="rgba(138, 164, 190, 0.06)"
              strokeWidth="0.5"
              opacity={visible ? 1 : 0}
              style={{ transition: `opacity 1.2s ease ${i * 0.08}s` }}
            />
          ))}
        </g>

        {/* City dots and labels */}
        {cities.map((city, i) => {
          const [cx, cy] = toXY(city.lat, city.lng, svgW, svgH);
          return (
            <g
              key={i}
              opacity={visible ? 1 : 0}
              style={{ transition: `opacity 0.8s ease ${0.8 + i * 0.1}s` }}
            >
              {/* Outer glow */}
              <circle
                cx={cx}
                cy={cy}
                r="6"
                fill="rgba(201, 168, 76, 0.12)"
              />
              {/* Dot */}
              <circle
                cx={cx}
                cy={cy}
                r="3"
                fill="#c9a84c"
              />
              {/* Inner bright dot */}
              <circle
                cx={cx}
                cy={cy}
                r="1.2"
                fill="#fff"
                opacity="0.6"
              />
              {/* City name */}
              <text
                x={cx}
                y={cy - 10}
                textAnchor="middle"
                fill="rgba(255, 255, 255, 0.55)"
                fontSize="8"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="500"
                letterSpacing="1.5"
              >
                {city.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* JETVORYX Select badge */}
      <div
        className={`absolute bottom-4 left-4 sm:bottom-6 sm:left-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ transitionDelay: '2s' }}
      >
        <div className="glass rounded-lg px-4 py-2.5 flex items-center gap-2.5 border border-white/5">
          <div className="w-2.5 h-2.5 rounded-sm bg-gold" />
          <span className="text-xs sm:text-sm font-semibold text-gold tracking-widest uppercase">JETVORYX Select</span>
        </div>
      </div>
    </div>
  );
}
