'use client';

import { useEffect, useState, useRef } from 'react';

// Airport approximate lat/lng for major airports (Mercator projection coords)
const airportCoords: Record<string, [number, number]> = {
  // North America
  ATL: [33.64, -84.43], JFK: [40.64, -73.78], LAX: [33.94, -118.41], ORD: [41.97, -87.91],
  DFW: [32.90, -97.04], DEN: [39.86, -104.67], SFO: [37.62, -122.38], SEA: [47.45, -122.31],
  MIA: [25.80, -80.29], BOS: [42.37, -71.02], IAH: [29.99, -95.34], MSP: [44.88, -93.22],
  DTW: [42.21, -83.35], PHL: [39.87, -75.24], LGA: [40.77, -73.87], EWR: [40.69, -74.17],
  CLT: [35.21, -80.94], PHX: [33.43, -112.01], LAS: [36.08, -115.15], MCO: [28.43, -81.31],
  SAN: [32.73, -117.19], TPA: [27.97, -82.53], PDX: [45.59, -122.60], AUS: [30.20, -97.67],
  BNA: [36.13, -86.68], SLC: [40.79, -111.98], DCA: [38.85, -77.04], IAD: [38.95, -77.46],
  TEB: [40.85, -74.06], HPN: [41.07, -73.71], PBI: [26.68, -80.09], SDL: [33.62, -111.91],
  ASE: [39.22, -106.87], MVY: [41.39, -70.61], ACK: [41.25, -70.06], VNY: [34.21, -118.49],
  // Mexico/Caribbean
  MEX: [19.44, -99.07], CUN: [21.04, -86.87], NAS: [25.04, -77.47], SXM: [18.04, -63.11],
  // South America
  GRU: [-23.43, -46.47], GIG: [-22.81, -43.25], EZE: [-34.82, -58.54], BOG: [4.70, -74.15],
  SCL: [-33.39, -70.79], LIM: [-12.02, -77.11],
  // Europe
  LHR: [51.47, -0.46], CDG: [49.01, 2.55], FRA: [50.03, 8.57], AMS: [52.31, 4.76],
  MAD: [40.47, -3.57], BCN: [41.30, 2.08], FCO: [41.80, 12.25], MXP: [45.63, 8.72],
  IST: [41.26, 28.74], ZRH: [47.46, 8.55], MUC: [48.35, 11.79], VIE: [48.11, 16.57],
  CPH: [55.62, 12.66], OSL: [60.19, 11.10], ARN: [59.65, 17.94], HEL: [60.32, 24.96],
  DUB: [53.42, -6.27], EDI: [55.95, -3.37], GVA: [46.24, 6.11], NCE: [43.66, 7.22],
  LIS: [38.77, -9.13], ATH: [37.94, 23.94], BRU: [50.90, 4.48], LUX: [49.63, 6.21],
  SVO: [55.97, 37.41], DME: [55.41, 37.91], LED: [59.80, 30.26],
  LTN: [51.87, -0.37], STN: [51.89, 0.24], LCY: [51.51, 0.05], BHX: [52.45, -1.75],
  MAN: [53.35, -2.28], OLB: [40.90, 9.52], IBZ: [38.87, 1.37], PMI: [39.55, 2.74],
  SKG: [40.52, 22.97], MYK: [37.44, 25.35], SPU: [43.54, 16.30],
  // Middle East
  DXB: [25.25, 55.36], DOH: [25.26, 51.61], AUH: [24.43, 54.65], RUH: [24.96, 46.70],
  JED: [21.68, 39.16], BAH: [26.27, 50.64], KWI: [29.23, 47.97], MCT: [23.59, 58.28],
  TLV: [32.01, 34.89], AMM: [31.72, 35.99],
  // Africa
  JNB: [-26.14, 28.25], CPT: [-33.96, 18.60], CAI: [30.12, 31.41], CMN: [33.37, -7.59],
  ADD: [8.98, 38.80], NBO: [-1.32, 36.93], LOS: [6.58, 3.32], ACC: [5.61, -0.17],
  // Asia
  HND: [35.55, 139.78], NRT: [35.76, 140.39], ICN: [37.47, 126.44], PEK: [40.08, 116.58],
  PVG: [31.14, 121.81], HKG: [22.31, 113.91], SIN: [1.35, 103.99], BKK: [13.69, 100.75],
  KUL: [2.75, 101.71], DEL: [28.56, 77.10], BOM: [19.09, 72.87], MAA: [12.99, 80.17],
  BLR: [13.20, 77.71], CCU: [22.65, 88.45], HAN: [21.22, 105.81], SGN: [10.82, 106.65],
  MNL: [14.51, 121.02], CGK: [-6.13, 106.66], TPE: [25.08, 121.23],
  // Oceania
  SYD: [-33.95, 151.18], MEL: [-37.67, 144.84], AKL: [-37.01, 174.79],
  BNE: [-27.38, 153.12],
};

// Convert lat/lng to simple equirectangular x/y (percentage of SVG viewport)
function toXY(lat: number, lng: number): [number, number] {
  const x = ((lng + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;
  return [x, y];
}

function greatCircleArc(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const bulge = Math.min(dist * 0.2, 6);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - bulge;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

interface FlightRouteProps {
  from: string; // IATA code
  to: string;   // IATA code
}

export default function FlightRoute({ from, to }: FlightRouteProps) {
  const [animated, setAnimated] = useState(false);
  const prevRoute = useRef('');

  const fromCoord = airportCoords[from];
  const toCoord = airportCoords[to];

  useEffect(() => {
    const routeKey = `${from}-${to}`;
    if (routeKey !== prevRoute.current && from && to && fromCoord && toCoord) {
      setAnimated(false);
      prevRoute.current = routeKey;
      const t = setTimeout(() => setAnimated(true), 50);
      return () => clearTimeout(t);
    }
  }, [from, to, fromCoord, toCoord]);

  if (!from || !to || !fromCoord || !toCoord) return null;

  const [x1, y1] = toXY(fromCoord[0], fromCoord[1]);
  const [x2, y2] = toXY(toCoord[0], toCoord[1]);
  const pathD = greatCircleArc(x1, y1, x2, y2);
  const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  // Calculate visible viewport bounds
  const minX = Math.min(x1, x2) - 8;
  const maxX = Math.max(x1, x2) + 8;
  const minY = Math.min(y1, y2) - 12;
  const maxY = Math.max(y1, y2) + 8;
  const vw = Math.max(maxX - minX, 20);
  const vh = Math.max(maxY - minY, 15);

  return (
    <div className="w-full mt-6 animate-fade-in">
      <svg
        viewBox={`${minX} ${minY} ${vw} ${vh}`}
        className="w-full h-auto max-h-40"
        style={{ filter: 'drop-shadow(0 0 8px rgba(201, 168, 76, 0.15))' }}
      >
        <defs>
          <linearGradient id="flightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c9a84c" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
          <marker id="planeMarker" markerWidth="3" markerHeight="3" refX="1.5" refY="1.5" orient="auto-start-reverse">
            <circle cx="1.5" cy="1.5" r="1" fill="#d4af37" />
          </marker>
        </defs>

        {/* Route line */}
        <path
          d={pathD}
          fill="none"
          stroke="url(#flightGradient)"
          strokeWidth="0.3"
          strokeLinecap="round"
          strokeDasharray={dist * 3}
          strokeDashoffset={animated ? 0 : dist * 3}
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
          opacity="0.7"
        />

        {/* Dashed guide line */}
        <path
          d={pathD}
          fill="none"
          stroke="rgba(201, 168, 76, 0.15)"
          strokeWidth="0.15"
          strokeDasharray="0.5 0.5"
        />

        {/* From dot */}
        <circle cx={x1} cy={y1} r="0.8" fill="#c9a84c" opacity={animated ? 1 : 0} style={{ transition: 'opacity 0.3s' }} />
        <circle cx={x1} cy={y1} r="1.5" fill="none" stroke="#c9a84c" strokeWidth="0.1" opacity={animated ? 0.4 : 0} style={{ transition: 'opacity 0.5s' }} />

        {/* To dot */}
        <circle cx={x2} cy={y2} r="0.8" fill="#d4af37" opacity={animated ? 1 : 0} style={{ transition: 'opacity 0.3s ease 1s' }} />
        <circle cx={x2} cy={y2} r="1.5" fill="none" stroke="#d4af37" strokeWidth="0.1" opacity={animated ? 0.4 : 0} style={{ transition: 'opacity 0.5s ease 1s' }} />

        {/* From label */}
        <text
          x={x1}
          y={y1 + 2.5}
          textAnchor="middle"
          fill="#c9a84c"
          fontSize="1.5"
          fontFamily="Inter, sans-serif"
          fontWeight="700"
          opacity={animated ? 1 : 0}
          style={{ transition: 'opacity 0.3s ease 0.3s' }}
        >
          {from}
        </text>

        {/* To label */}
        <text
          x={x2}
          y={y2 + 2.5}
          textAnchor="middle"
          fill="#d4af37"
          fontSize="1.5"
          fontFamily="Inter, sans-serif"
          fontWeight="700"
          opacity={animated ? 1 : 0}
          style={{ transition: 'opacity 0.3s ease 1.3s' }}
        >
          {to}
        </text>

        {/* Animated plane dot traveling along path */}
        {animated && (
          <circle r="0.5" fill="#ffffff">
            <animateMotion dur="2s" repeatCount="1" fill="freeze">
              <mpath xlinkHref="#flightPath" />
            </animateMotion>
          </circle>
        )}
        <path id="flightPath" d={pathD} fill="none" stroke="none" />
      </svg>
    </div>
  );
}
