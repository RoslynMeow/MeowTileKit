import type { CoordFormat } from './format.js';

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

function toBaseN(n: number, alphabet: string, len: number): string {
  let s = '';
  for (let i = len - 1; i >= 0; i--) {
    s = alphabet[Math.floor(n / Math.pow(alphabet.length, i)) % alphabet.length] + s;
    // Actually simpler:
  }
  // Better:
  s = '';
  for (let i = 0; i < len; i++) {
    s += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length);
  }
  return s.split('').reverse().join('');
}

// ── Geohash ──
function geohashEncode(lat: number, lng: number, precision = 7): string {
  let latRange: [number, number] = [-90, 90];
  let lngRange: [number, number] = [-180, 180];
  let bits = 0, bitCount = 0, hash = '';
  for (let i = 0; i < precision * 5; i++) {
    const isLng = i % 2 === 0;
    const range = isLng ? lngRange : latRange;
    const mid = (range[0] + range[1]) / 2;
    const val = isLng ? lng : lat;
    if (val >= mid) {
      bits = (bits << 1) | 1;
      range[0] = mid;
    } else {
      bits = (bits << 1) | 0;
      range[1] = mid;
    }
    bitCount++;
    if (bitCount === 5) {
      hash += BASE32[bits];
      bits = 0;
      bitCount = 0;
    }
  }
  return hash;
}

export const geohash: CoordFormat = {
  key: 'geohash', label: 'Geohash',
  formatLat: v => v.toFixed(6) + '°',
  formatLng: v => v.toFixed(6) + '°',
  coord(lat, lng) { return geohashEncode(lat, lng); },
};

// ── Geohash-36 ──
const BASE36 = '0123456789abcdefghijklmnopqrstuvwxyz';

function geohash36Encode(lat: number, lng: number, precision = 6): string {
  let latRange: [number, number] = [-90, 90];
  let lngRange: [number, number] = [-180, 180];
  let bits = 0, bitCount = 0, hash = '';
  // For base-36: each character encodes ~5.17 bits, use 2 chars for ~10 bits
  const totalBits = precision * 2; // 2 chars give ~5184 cells -> ~0.5° precision
  for (let i = 0; i < totalBits * 5; i++) {
    const isLng = i % 2 === 0;
    const range = isLng ? lngRange : latRange;
    const mid = (range[0] + range[1]) / 2;
    const val = isLng ? lng : lat;
    if (val >= mid) {
      bits = (bits << 1) | 1;
      range[0] = mid;
    } else {
      bits = (bits << 1) | 0;
      range[1] = mid;
    }
    bitCount++;
    if (bitCount === 5) {
      // encode 10 bits as 2 base-36 chars
      const enc = bits.toString(36).padStart(2, '0');
      hash += enc;
      bits = 0;
      bitCount = 0;
    }
  }
  return hash;
}

// Actually, let me do it simpler: interleave bits as before but encode base-36 directly
function geohash36(lat: number, lng: number, chars = 6): string {
  // Each base-36 character = log2(36) ≈ 5.17 bits
  // We'll encode 5 bits at a time, each 5-bit group becomes a base-36 char
  let latRange: [number, number] = [-90, 90];
  let lngRange: [number, number] = [-180, 180];
  let result = '';
  let buf = 0, bufLen = 0;
  const totalBits = Math.ceil(chars * Math.log2(36));
  for (let i = 0; i < totalBits; i++) {
    const isLng = i % 2 === 0;
    const range = isLng ? lngRange : latRange;
    const mid = (range[0] + range[1]) / 2;
    const val = isLng ? lng : lat;
    buf = (buf << 1) | (val >= mid ? 1 : 0);
    if (val >= mid) range[0] = mid;
    else range[1] = mid;
    bufLen++;
    if (bufLen === 5 || i === totalBits - 1) {
      // Pad with zeros if needed
      if (bufLen < 5) buf = buf << (5 - bufLen);
      result += BASE36[buf];
      buf = 0;
      bufLen = 0;
    }
  }
  return result;
}

export const geohash36f: CoordFormat = {
  key: 'geohash36', label: 'Geohash-36',
  formatLat: v => v.toFixed(6) + '°',
  formatLng: v => v.toFixed(6) + '°',
  coord(lat, lng) { return geohash36(lat, lng); },
};

// ── GEOREF ──
function georefEncode(lat: number, lng: number): string {
  // 15° longitude bands A-Z (180°W→180°E)
  const lngBand = String.fromCharCode(65 + Math.floor((lng + 180) / 15));
  // 15° latitude bands: A-M south, N-Z north (equator at M/N boundary)
  const latBand = lat >= 0
    ? String.fromCharCode(78 + Math.floor(lat / 15))  // N-Z
    : String.fromCharCode(77 + Math.ceil(lat / 15));  // A-M
  // Within the 15° band: 1° squares
  const lngDeg = Math.floor(((lng + 180) % 15));
  const latDeg = Math.floor(Math.abs(lat) % 15);
  const lngMin = Math.floor(((((lng + 180) % 15) - lngDeg)) * 60);
  const latMin = Math.floor((((Math.abs(lat) % 15) - latDeg)) * 60);
  const lngSec = Math.round((((((lng + 180) % 15) - lngDeg)) * 60 - lngMin) * 60);
  const latSec = Math.round((((Math.abs(lat) % 15) - latDeg)) * 60 - latMin) * 60;
  return `${latBand}${lngBand}${String.fromCharCode(65 + latDeg)}${String.fromCharCode(65 + lngDeg)}${String(latMin).padStart(2, '0')}${String(lngMin).padStart(2, '0')}`;
}

export const georef: CoordFormat = {
  key: 'georef', label: 'GEOREF',
  formatLat: v => v.toFixed(6) + '°',
  formatLng: v => v.toFixed(6) + '°',
  coord(lat, lng) { return georefEncode(lat, lng); },
};

// ── IMW (International Map of the World) ──
function imwEncode(lat: number, lng: number): string {
  // 1:1,000,000 scale sheets: 4° lat × 6° lng
  // Latitude bands: A (90-88S) to ... U-V (0-4N) etc — actually N and S hemisphere
  // Standard: C (80-76S), ... X (84-88N), V (0-4N?), ...
  // Simpler: count from equator
  const latAbs = Math.abs(lat);
  const latBand = Math.floor(latAbs / 4);
  const latLetter = lat >= 0
    ? String.fromCharCode(86 + latBand)  // V(4) W Z... starting from V for 0-4N
    : String.fromCharCode(67 + latBand); // C for 0-4S, D for 4-8S...
  // N-hemisphere: equator→V, 4°N→W, ... 84°N→X(T?)...
  // Actually the standard IMW band letters:
  // N-hem: A (0-4N), B (4-8N), ... Z? No...
  // Let's use the standard: N-hem letters from A, S-hem from A with "S" prefix
  const hemi = lat >= 0 ? 'N' : 'S';
  const bandNames = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bandLetter = bandNames[latBand];
  // Longitude zones: 1-60 from 180°W
  const lngZone = String(Math.floor((lng + 180) / 6) + 1).padStart(2, '0');
  return `${hemi}${bandLetter}-${lngZone}`;
}

export const imw: CoordFormat = {
  key: 'imw', label: 'IMW',
  formatLat: v => v.toFixed(6) + '°',
  formatLng: v => v.toFixed(6) + '°',
  coord(lat, lng) { return imwEncode(lat, lng); },
};

// ── Marsden Square ──
function marsdenEncode(lat: number, lng: number): string {
  // 10° squares: longitude band 1-36 from 0°E
  const lngBand = ((Math.floor((lng + 180) / 10) % 36) + 1);
  const latBand = Math.floor((lat + 90) / 10);
  const latLetter = lat >= 0 ? 'N' : 'S';
  const latDeg = Math.floor(Math.abs(lat) % 10);
  const lngDeg = Math.floor(Math.abs(lng) % 10);
  return `${latLetter}${String(latBand).padStart(2, '0')}-${String(lngBand).padStart(2, '0')} (${latDeg}°×${lngDeg}°)`;
}

export const marsden: CoordFormat = {
  key: 'marsden', label: 'Marsden',
  formatLat: v => v.toFixed(6) + '°',
  formatLng: v => v.toFixed(6) + '°',
  coord(lat, lng) { return marsdenEncode(lat, lng); },
};

// ── MGRS ──
function mgrsEncode(lat: number, lng: number): string {
  // UTM zone
  const zone = Math.floor((lng + 180) / 6) + 1;
  // Latitude band letter (C-X, skipping I and O)
  const latBands = 'CDEFGHJKLMNPQRSTUVWX';
  const latIdx = Math.min(Math.floor((lat + 80) / 8), latBands.length - 1);
  const latBand = latBands[Math.max(0, latIdx)];
  // 100km square letters (A-Z, skipping I and O)
  // Simplified: just use grid zone + fixed easting/northing
  const easting = Math.round(((lng + 180) % 6) / 6 * 100000);
  const northing = Math.round(((lat + 80) % 8) / 8 * 100000);
  // 100km grid letters: first for easting, second for northing
  const gridLetters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const eIdx = Math.floor(easting / 100000) % gridLetters.length;
  const nIdx = Math.floor(northing / 100000) % gridLetters.length;
  const eStr = String(easting % 100000).padStart(5, '0');
  const nStr = String(northing % 100000).padStart(5, '0');
  return `${zone}${latBand} ${gridLetters[eIdx]}${gridLetters[nIdx]} ${eStr} ${nStr}`;
}

export const mgrs: CoordFormat = {
  key: 'mgrs', label: 'MGRS',
  formatLat: v => v.toFixed(6) + '°',
  formatLng: v => v.toFixed(6) + '°',
  coord(lat, lng) { return mgrsEncode(lat, lng); },
};

// ── NAC (Natural Area Code) ──
function nacEncode(lat: number, lng: number, chars = 8): string {
  const alphabet = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 30 chars (no I, O)
  const base = alphabet.length;
  // Normalize lat to [0, 180], lng to [0, 360]
  const latNorm = lat + 90;
  const lngNorm = lng + 180;
  // Encode lat and lng separately
  let latCode = '';
  let lngCode = '';
  let latV = latNorm;
  let lngV = lngNorm;
  const half = Math.ceil(chars / 2);
  for (let i = 0; i < half; i++) {
    latV *= base;
    const idx = Math.floor(latV) % base;
    latCode += alphabet[idx];
    lngV *= base;
    const jdx = Math.floor(lngV) % base;
    lngCode += alphabet[jdx];
  }
  return `${latCode} ${lngCode}`;
}

export const nac: CoordFormat = {
  key: 'nac', label: 'NAC',
  formatLat: v => v.toFixed(6) + '°',
  formatLng: v => v.toFixed(6) + '°',
  coord(lat, lng) { return nacEncode(lat, lng); },
};

// ── OLC (Open Location Code / Plus Codes) ──
function olcEncode(lat: number, lng: number): string {
  // OLC uses 20-character alphabet: 23456789CFGHJMPQRVWX
  const CODE_ALPHABET = '23456789CFGHJMPQRVWX';
  const ENCODING_BASE = 20;
  const PAIR_CODE_LENGTH = 10; // 10 chars before '+'
  const GRID_COLS = 4;
  const GRID_ROWS = 5;

  // Clamp latitude
  lat = Math.max(-90, Math.min(90, lat));
  lng = ((lng + 180) % 360 + 360) % 360 - 180;

  // Pair encoding: 20×20 grid per pair
  let code = '';
  let latVal = lat + 90;
  let lngVal = lng + 180;

  // First 4 pairs (8 chars) cover the whole globe
  for (let i = 0; i < PAIR_CODE_LENGTH; i++) {
    if (i % 2 === 0) {
      // Even: longitude
      const idx = Math.floor(lngVal / (20 / Math.pow(ENCODING_BASE, i / 2)));
      code += CODE_ALPHABET[Math.floor(idx) % ENCODING_BASE];
      lngVal -= idx * (20 / Math.pow(ENCODING_BASE, i / 2));
    } else {
      // Odd: latitude
      const idx = Math.floor(latVal / (20 / Math.pow(ENCODING_BASE, (i - 1) / 2 + 1)));
      code += CODE_ALPHABET[Math.floor(idx) % ENCODING_BASE];
      latVal -= idx * (20 / Math.pow(ENCODING_BASE, (i - 1) / 2 + 1));
    }
  }

  // Add '+' separator
  code = code.slice(0, 8) + '+' + code.slice(8, 10);

  // Refinement: add grid chars for more precision
  // Grid encoding: GRID_COLS × GRID_ROWS per cell
  const latGrid = latVal;
  const lngGrid = lngVal;
  for (let i = 0; i < 2; i++) {
    const row = Math.floor(latGrid * GRID_ROWS / (20 / Math.pow(ENCODING_BASE, PAIR_CODE_LENGTH / 2)));
    const col = Math.floor(lngGrid * GRID_COLS / (20 / Math.pow(ENCODING_BASE, PAIR_CODE_LENGTH / 2)));
    if (row < GRID_ROWS && col < GRID_COLS) {
      const charIdx = row * GRID_COLS + col;
      code += CODE_ALPHABET[Math.min(charIdx, CODE_ALPHABET.length - 1)];
    }
  }

  return code;
}

export const olc: CoordFormat = {
  key: 'olc', label: 'OLC',
  formatLat: v => v.toFixed(6) + '°',
  formatLng: v => v.toFixed(6) + '°',
  coord(lat, lng) { return olcEncode(lat, lng); },
};

// ── Mapcode ──
function mapcodeEncode(lat: number, lng: number): string {
  // Simplified mapcode: encode using base-30 with simplified grid
  const alphabet = '23456789BCDFGHJKLMNPQRSTVWXZ'; // no 0,1,A,E,I,O,U,Y
  const base = alphabet.length;

  const latNorm = (lat + 90) / 180; // 0-1
  const lngNorm = (lng + 180) / 360; // 0-1

  // Simple encoding: use lat/lng to generate a compact code
  // Mapcode uses a recursive grid subdivision
  let code = '';
  let latV = latNorm;
  let lngV = lngNorm;

  for (let i = 0; i < 4; i++) {
    const lngIdx = Math.floor(lngV * base);
    const latIdx = Math.floor(latV * base);
    code += alphabet[Math.min(lngIdx, alphabet.length - 1)];
    code += alphabet[Math.min(latIdx, alphabet.length - 1)];
    latV = (latV * base - latIdx);
    lngV = (lngV * base - lngIdx);
  }

  // Add separator
  return code.slice(0, 4) + '.' + code.slice(4);
}

export const mapcode: CoordFormat = {
  key: 'mapcode', label: 'Mapcode',
  formatLat: v => v.toFixed(6) + '°',
  formatLng: v => v.toFixed(6) + '°',
  coord(lat, lng) { return mapcodeEncode(lat, lng); },
};

// ── QDGC (Quarter Degree Grid Cells) ──
function qdgcEncode(lat: number, lng: number): string {
  const latAbs = Math.abs(lat);
  const lngAbs = Math.abs(lng);

  const degLat = Math.floor(latAbs);
  const degLng = Math.floor(lngAbs);

  const minLat = (latAbs - degLat) * 60;
  const minLng = (lngAbs - degLng) * 60;

  // QDGC: quarter degree cells
  const qLat = Math.floor(minLat / 15); // 0-3
  const qLng = Math.floor(minLng / 15); // 0-3

  const hemiLat = lat >= 0 ? 'N' : 'S';
  const hemiLng = lng >= 0 ? 'E' : 'W';

  const qLabels = ['A', 'B', 'C', 'D']; // or 'ABCD' for quarter cells
  const qLabel = qLabels[qLat * 2 + qLng]; // 0:A, 1:B, 2:C, 3:D

  return `${hemiLat}${String(degLat).padStart(2, '0')}${hemiLng}${String(degLng).padStart(3, '0')}_${qLabel}`;
}

export const qdgc: CoordFormat = {
  key: 'qdgc', label: 'QDGC',
  formatLat: v => v.toFixed(6) + '°',
  formatLng: v => v.toFixed(6) + '°',
  coord(lat, lng) { return qdgcEncode(lat, lng); },
};

// ── UTM ──
function utmEncode(lat: number, lng: number): string {
  const zone = Math.floor((lng + 180) / 6) + 1;
  const hemi = lat >= 0 ? 'N' : 'S';
  const a = 6378137;
  const e2 = 0.00669437999;
  const k0 = 0.9996;

  const phi = lat * Math.PI / 180;
  const centralMeridian = (zone - 1) * 6 - 180 + 3;
  const lambda = (lng - centralMeridian) * Math.PI / 180;

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = Math.tan(phi);

  const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const T = tanPhi * tanPhi;
  const C = e2 / (1 - e2) * cosPhi * cosPhi;
  const A = lambda * cosPhi;

  const M = a * ((1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256) * phi
    - (3*e2/8 + 3*e2*e2/32 + 45*e2*e2*e2/1024) * Math.sin(2*phi)
    + (15*e2*e2/256 + 45*e2*e2*e2/1024) * Math.sin(4*phi)
    - (35*e2*e2*e2/3072) * Math.sin(6*phi));

  const easting = k0 * N * (A + (1 - T + C) * A*A*A/6
    + (5 - 18*T + T*T + 72*C - 58*e2) * A*A*A*A*A/120) + 500000;

  let northing = k0 * (M + N * tanPhi * (A*A/2
    + (5 - T + 9*C + 4*C*C) * A*A*A*A/24
    + (61 - 58*T + T*T + 600*C - 330*e2) * A*A*A*A*A*A/720));

  if (lat < 0) northing += 10000000;

  return `${zone}${hemi} ${Math.round(easting)} ${Math.round(northing)}`;
}

export const utm: CoordFormat = {
  key: 'utm', label: 'UTM',
  formatLat: v => v.toFixed(6) + '°',
  formatLng: v => v.toFixed(6) + '°',
  coord(lat, lng) { return utmEncode(lat, lng); },
};

// ── C-squares ──
function csquaresEncode(lat: number, lng: number, resolution = 5): string {
  // C-squares: global 10° × 10° grid, recursively subdivided by 10
  // Quadrant: 1=NE, 2=NW, 4=SE, 8=SW (but actually 1-7 for special cases)
  const quad = (lat >= 0 ? 0 : 2) + (lng >= 0 ? 1 : 0);
  // Quadrant number: 1=(+lat,+lng), 2=(+lat,-lng), 4=(-lat,+lng), 8=(-lat,-lng)
  const quadMap = [8, 4, 2, 1]; // SW, SE, NW, NE
  const q = quadMap[quad];

  let parts = [String(q)];
  let latAbs = Math.abs(lat);
  let lngAbs = Math.abs(lng);

  // 10° squares in the quadrant
  const lat10 = Math.floor(latAbs / 10);
  const lng10 = Math.floor(lngAbs / 10);
  parts.push(String(lat10) + String(lng10));

  // Recursive subdivision by 10
  let latRem = latAbs - lat10 * 10;
  let lngRem = lngAbs - lng10 * 10;

  for (let level = 1; level < resolution; level++) {
    const cellSize = 10 / Math.pow(10, level);
    const latCell = Math.floor(latRem / cellSize);
    const lngCell = Math.floor(lngRem / cellSize);
    parts.push(String(latCell) + String(lngCell));
    latRem -= latCell * cellSize;
    lngRem -= lngCell * cellSize;
  }

  return parts.join(':');
}

export const csquares: CoordFormat = {
  key: 'csquares', label: 'C-squares',
  formatLat: v => v.toFixed(6) + '°',
  formatLng: v => v.toFixed(6) + '°',
  coord(lat, lng) { return csquaresEncode(lat, lng); },
};

// ── WMO Squares ──
function wmoEncode(lat: number, lng: number): string {
  // WMO 10° × 10° squares
  // Longitude bands: 1-36 starting from 0°E
  const lngBand = Math.floor(((lng + 180) % 360) / 10) + 1;
  // Latitude bands: 01-18 from 90°S to 90°N (actually from equator poles)
  const latBand = Math.floor((lat + 90) / 10);
  // Sub-squares: 1° × 1° cells within the 10° square
  const latSub = Math.floor(Math.abs(lat) % 10);
  const lngSub = Math.floor(Math.abs(lng) % 10);
  const hemi = lat >= 0 ? 'N' : 'S';
  return `${hemi}${String(latBand).padStart(2, '0')}-${String(lngBand).padStart(2, '0')} (${latSub}°×${lngSub}°)`;
}

export const wmo: CoordFormat = {
  key: 'wmo', label: 'WMO',
  formatLat: v => v.toFixed(6) + '°',
  formatLng: v => v.toFixed(6) + '°',
  coord(lat, lng) { return wmoEncode(lat, lng); },
};

// ── All encoding formats ──
export const encodingFormats: CoordFormat[] = [
  geohash, geohash36f, georef, utm, mgrs, csquares,
  imw, marsden, qdgc, wmo, nac, olc, mapcode,
];
