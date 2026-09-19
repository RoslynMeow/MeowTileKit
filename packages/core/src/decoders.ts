import type { LatLng } from './types.js';

/**
 * Coordinate decoders — the inverse of the encoders in `encodings.ts`.
 *
 * Every decoder accepts a string produced by the matching encoder and returns
 * a WGS-84 `{ lat, lng }` (the center of the encoded cell when the encoder is
 * lossy). `null` is returned for unparseable input.
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const BASE36 = '0123456789abcdefghijklmnopqrstuvwxyz';
const OLC_ALPHABET = '23456789CFGHJMPQRVWX';
const MGRS_BANDS = 'CDEFGHJKLMNPQRSTUVWX';
const MGRS_GRID = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function tidy(lat: number, lng: number): LatLng | null {
  if (!isFinite(lat) || !isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// ── Degree-based formats (dd / dm / dms) ──

interface AngleTok {
  hemi?: string;
  deg: number;
  min: number;
  sec: number;
  neg: boolean;
}

function mkTok(hemiPre: string | undefined, deg: string, min?: string, sec?: string, hemiPost?: string): AngleTok {
  return {
    hemi: hemiPre || hemiPost || undefined,
    deg: parseFloat(deg),
    min: min ? parseFloat(min) : 0,
    sec: sec ? parseFloat(sec) : 0,
    neg: deg.trim().startsWith('-'),
  };
}

function angleValue(t: AngleTok): number {
  const v = Math.abs(t.deg) + t.min / 60 + t.sec / 3600;
  const h = (t.hemi || '').toUpperCase();
  if (h === 'S' || h === 'W') return -v;
  if (h === 'N' || h === 'E') return v;
  return t.neg ? -v : v;
}

function assignPair(a: AngleTok, b: AngleTok): LatLng | null {
  const isLat = (t: AngleTok) => t.hemi === 'N' || t.hemi === 'S';
  const isLng = (t: AngleTok) => t.hemi === 'E' || t.hemi === 'W';
  let latTok = a, lngTok = b;
  if (isLat(b) && !isLat(a)) { latTok = b; lngTok = a; }
  else if (isLat(a) && !isLat(b)) { latTok = a; lngTok = b; }
  else if (isLng(a) && !isLng(b)) { lngTok = a; latTok = b; }
  else if (isLng(b) && !isLng(a)) { lngTok = b; latTok = a; }
  return tidy(angleValue(latTok), angleValue(lngTok));
}

const SEP = '[,\\s]+';

export function decodeDd(s: string): LatLng | null {
  const re = new RegExp(
    `^\\s*([NSEW])?\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*°?\\s*([NSEW])?\\s*${SEP}\\s*([NSEW])?\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*°?\\s*([NSEW])?\\s*$`,
    'i',
  );
  const m = s.match(re);
  if (!m) return null;
  return assignPair(mkTok(m[1], m[2], undefined, undefined, m[3]), mkTok(m[4], m[5], undefined, undefined, m[6]));
}

export function decodeDm(s: string): LatLng | null {
  const re = new RegExp(
    `^\\s*([NSEW])?\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*°\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*['′]\\s*([NSEW])?\\s*${SEP}\\s*([NSEW])?\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*°\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*['′]\\s*([NSEW])?\\s*$`,
    'i',
  );
  const m = s.match(re);
  if (!m) return null;
  return assignPair(mkTok(m[1], m[2], m[3], undefined, m[4]), mkTok(m[5], m[6], m[7], undefined, m[8]));
}

export function decodeDms(s: string): LatLng | null {
  const re = new RegExp(
    `^\\s*([NSEW])?\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*°\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*['′]\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*["″]\\s*([NSEW])?\\s*${SEP}\\s*` +
    `([NSEW])?\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*°\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*['′]\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*["″]\\s*([NSEW])?\\s*$`,
    'i',
  );
  const m = s.match(re);
  if (!m) return null;
  return assignPair(mkTok(m[1], m[2], m[3], m[4], m[5]), mkTok(m[6], m[7], m[8], m[9], m[10]));
}

// ── ISO 6709 / Geo URI ──

export function decodeIso6709(s: string): LatLng | null {
  const m = s.trim().match(/^([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)\/?$/);
  if (!m) return null;
  return tidy(parseFloat(m[1]), parseFloat(m[2]));
}

export function decodeGeoUri(s: string): LatLng | null {
  const m = s.trim().match(/^geo:\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)/i);
  if (!m) return null;
  return tidy(parseFloat(m[1]), parseFloat(m[2]));
}

// ── Geohash ──

export function decodeGeohash(s: string): LatLng | null {
  const hash = s.trim().toLowerCase();
  if (!hash || !/^[0-9bcdefghjkmnpqrstuvwxyz]+$/.test(hash)) return null;
  let latRange: [number, number] = [-90, 90];
  let lngRange: [number, number] = [-180, 180];
  let isLng = true;
  for (const ch of hash) {
    const cd = BASE32.indexOf(ch);
    if (cd < 0) return null;
    for (let mask = 16; mask; mask >>= 1) {
      const range = isLng ? lngRange : latRange;
      const mid = (range[0] + range[1]) / 2;
      if (cd & mask) range[0] = mid; else range[1] = mid;
      isLng = !isLng;
    }
  }
  return tidy((latRange[0] + latRange[1]) / 2, (lngRange[0] + lngRange[1]) / 2);
}

// ── Geohash-36 (5 bits per character, longitude first) ──

export function decodeGeohash36(s: string): LatLng | null {
  const hash = s.trim().toLowerCase();
  if (!hash || !/^[0-9a-z]+$/.test(hash)) return null;
  let latRange: [number, number] = [-90, 90];
  let lngRange: [number, number] = [-180, 180];
  let idx = 0;
  for (const ch of hash) {
    const v = BASE36.indexOf(ch);
    if (v < 0 || v > 31) return null;
    for (let k = 4; k >= 0; k--) {
      const bit = (v >> k) & 1;
      const isLng = idx % 2 === 0;
      const range = isLng ? lngRange : latRange;
      const mid = (range[0] + range[1]) / 2;
      if (bit) range[0] = mid; else range[1] = mid;
      idx++;
    }
  }
  return tidy((latRange[0] + latRange[1]) / 2, (lngRange[0] + lngRange[1]) / 2);
}

// ── GEOREF ──

export function decodeGeoref(s: string): LatLng | null {
  const m = s.trim().toUpperCase().match(/^([A-Z])([A-Z])([A-Z])([A-Z])(\d{2})(\d{2})$/);
  if (!m) return null;
  const latBand = m[1].charCodeAt(0);
  const lngBand = m[2].charCodeAt(0);
  const latDeg = m[3].charCodeAt(0) - 65;
  const lngDeg = m[4].charCodeAt(0) - 65;
  const latMin = parseInt(m[5], 10);
  const lngMin = parseInt(m[6], 10);
  if (lngBand < 65 || lngBand > 90) return null;

  const north = latBand >= 78;
  const latMag = (north ? latBand - 78 : 77 - latBand) * 15 + latDeg + (latMin + 0.5) / 60;
  const lat = north ? latMag : -latMag;
  const lng = (lngBand - 65) * 15 - 180 + lngDeg + (lngMin + 0.5) / 60;
  return tidy(lat, lng);
}

// ── UTM ──

const UTM_A = 6378137;
const UTM_E2 = 0.00669437999;
const UTM_K0 = 0.9996;

export function utmToLatLng(zone: number, northern: boolean, easting: number, northing: number): LatLng | null {
  const e2 = UTM_E2;
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const x = easting - 500000;
  let y = northing;
  if (!northern) y -= 10000000;

  const M = y / UTM_K0;
  const mu = M / (UTM_A * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));
  const sin2 = Math.sin(2 * mu), sin4 = Math.sin(4 * mu), sin6 = Math.sin(6 * mu), sin8 = Math.sin(8 * mu);

  const phi1 = mu + (3 * e1 / 2 - (27 * e1 ** 3) / 32) * sin2
    + ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * sin4
    + ((151 * e1 ** 3) / 96) * sin6
    + ((1097 * e1 ** 4) / 512) * sin8;

  const sinP = Math.sin(phi1), cosP = Math.cos(phi1), tanP = Math.tan(phi1);
  const N1 = UTM_A / Math.sqrt(1 - e2 * sinP * sinP);
  const T1 = tanP * tanP;
  const C1 = (e2 / (1 - e2)) * cosP * cosP;
  const R1 = (UTM_A * (1 - e2)) / Math.pow(1 - e2 * sinP * sinP, 1.5);
  const D = x / (N1 * UTM_K0);
  const e2p = e2 / (1 - e2);

  const lat = phi1 - ((N1 * tanP) / R1) * (
    (D * D) / 2
    - ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e2p) * D ** 4) / 24
    + ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * e2p - 3 * C1 * C1) * D ** 6) / 720
  );

  const lng0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  const lng = lng0 + (D - ((1 + 2 * T1 + C1) * D ** 3) / 6
    + ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e2p + 24 * T1 * T1) * D ** 5) / 120) / cosP;

  return tidy(lat * 180 / Math.PI, lng * 180 / Math.PI);
}

export function decodeUtm(s: string): LatLng | null {
  const m = s.trim().match(/^(\d{1,2})\s*([NS])\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/i);
  if (!m) return null;
  return utmToLatLng(parseInt(m[1], 10), m[2].toUpperCase() === 'N', parseFloat(m[3]), parseFloat(m[4]));
}

// ── MGRS (inverse of the simplified encoder) ──

export function decodeMgrs(s: string): LatLng | null {
  const m = s.trim().toUpperCase().match(/^(\d{1,2})([A-Z])\s+([A-Z])([A-Z])\s+(\d+)\s+(\d+)$/);
  if (!m) return null;
  const zone = parseInt(m[1], 10);
  const bandIdx = MGRS_BANDS.indexOf(m[2]);
  const eIdx = MGRS_GRID.indexOf(m[3]);
  const nIdx = MGRS_GRID.indexOf(m[4]);
  if (bandIdx < 0 || eIdx < 0 || nIdx < 0) return null;
  const easting = eIdx * 100000 + parseInt(m[5], 10);
  const northing = nIdx * 100000 + parseInt(m[6], 10);
  const lat = bandIdx * 8 - 80 + (northing / 100000) * 8 + 0.00004;
  const lng = (zone - 1) * 6 - 180 + (easting / 100000) * 6 + 0.00003;
  return tidy(lat, lng);
}

// ── C-squares ──

export function decodeCsquares(s: string): LatLng | null {
  const parts = s.trim().split(':');
  if (parts.length < 2 || !/^[1248]$/.test(parts[0]) || !/^\d{4}$/.test(parts[1])) return null;
  const q = parseInt(parts[0], 10);
  const latSign = (q === 1 || q === 2) ? 1 : -1;
  const lngSign = (q === 1 || q === 4) ? 1 : -1;
  let lat = parseInt(parts[1].slice(0, 2), 10) * 10;
  let lng = parseInt(parts[1].slice(2, 4), 10) * 10;
  let cell = 10;
  for (let level = 1; level < parts.length - 1; level++) {
    const p = parts[level + 1];
    if (!/^\d{2}$/.test(p)) return null;
    cell = 10 / Math.pow(10, level);
    lat += parseInt(p[0], 10) * cell;
    lng += parseInt(p[1], 10) * cell;
  }
  return tidy(latSign * (lat + cell / 2), lngSign * (lng + cell / 2));
}

// ── IMW ──

export function decodeImw(s: string): LatLng | null {
  const m = s.trim().toUpperCase().match(/^([NS])([A-Z])-(\d{1,2})$/);
  if (!m) return null;
  const bandIdx = m[2].charCodeAt(0) - 65;
  const zone = parseInt(m[3], 10);
  if (bandIdx < 0 || bandIdx > 25 || zone < 1 || zone > 60) return null;
  const lat = (bandIdx * 4 + 2) * (m[1] === 'S' ? -1 : 1);
  const lng = (zone - 1) * 6 - 180 + 3;
  return tidy(lat, lng);
}

// ── Marsden square ──

export function decodeMarsden(s: string): LatLng | null {
  const m = s.trim().toUpperCase().match(/^([NS])(\d{2})-(\d{2})\s*\((\d+)°×(\d+)°\)$/);
  if (!m) return null;
  const latBand = parseInt(m[2], 10);
  const lngBand = parseInt(m[3], 10);
  const latSub = parseInt(m[4], 10);
  const lngSub = parseInt(m[5], 10);
  const lat = latBand * 10 - 90 + latSub + 0.5;
  const lng = (lngBand - 1) * 10 - 180 + lngSub + 0.5;
  return tidy(lat, lng);
}

// ── QDGC ──

export function decodeQdgc(s: string): LatLng | null {
  const m = s.trim().toUpperCase().match(/^([NS])(\d{2})([EW])(\d{3})_([A-P])$/);
  if (!m) return null;
  const idx = 'ABCDEFGHIJKLMNOP'.indexOf(m[5]);
  const qLat = Math.floor(idx / 4), qLng = idx % 4;
  const lat = (parseInt(m[2], 10) + qLat * 0.25 + 0.125) * (m[1] === 'S' ? -1 : 1);
  const lng = (parseInt(m[4], 10) + qLng * 0.25 + 0.125) * (m[3] === 'W' ? -1 : 1);
  return tidy(lat, lng);
}

// ── WMO squares ──

export function decodeWmo(s: string): LatLng | null {
  const m = s.trim().toUpperCase().match(/^([NS])(\d{2})-(\d{2})\s*\((\d+)°×(\d+)°\)$/);
  if (!m) return null;
  const latBand = parseInt(m[2], 10);
  const lngBand = parseInt(m[3], 10);
  const latSub = parseInt(m[4], 10);
  const lngSub = parseInt(m[5], 10);
  const lat = latBand * 10 - 90 + latSub + 0.5;
  const lng = (lngBand - 1) * 10 - 180 + lngSub + 0.5;
  return tidy(lat, lng);
}

// ── NAC (fixed-precision base-30 fraction) ──

const NAC_ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function decodeNac(s: string): LatLng | null {
  const m = s.trim().toUpperCase().match(/^([0-9A-Z]+)\s+([0-9A-Z]+)$/);
  if (!m || m[1].length !== m[2].length) return null;
  const base = NAC_ALPHABET.length;
  const frac = (str: string): number | null => {
    let f = 0;
    for (let i = 0; i < str.length; i++) {
      const d = NAC_ALPHABET.indexOf(str[i]);
      if (d < 0) return null;
      f += d / Math.pow(base, i + 1);
    }
    return f + 0.5 / Math.pow(base, str.length);
  };
  const latF = frac(m[1]);
  const lngF = frac(m[2]);
  if (latF === null || lngF === null) return null;
  return tidy(latF * 180 - 90, lngF * 360 - 180);
}

// ── OLC (Open Location Code / Plus Codes) ──

export function olcToLatLng(code: string): LatLng | null {
  const clean = code.trim().toUpperCase().replace(/\s+/g, '');
  const plus = clean.indexOf('+');
  if (plus !== 8) return null;
  const chars = clean.replace('+', '');
  if (chars.length < 10) return null;

  let latRes = 20, lngRes = 20;
  let lat = 0, lng = 0;
  for (let p = 0; p < 5; p++) {
    const latD = OLC_ALPHABET.indexOf(chars[p * 2]);
    const lngD = OLC_ALPHABET.indexOf(chars[p * 2 + 1]);
    if (latD < 0 || lngD < 0) return null;
    lat += latD * latRes;
    lng += lngD * lngRes;
    if (p < 4) { latRes /= 20; lngRes /= 20; }
  }
  for (let i = 10; i < chars.length; i++) {
    const d = OLC_ALPHABET.indexOf(chars[i]);
    if (d < 0) return null;
    const rowRes = latRes / 5, colRes = lngRes / 4;
    lat += Math.floor(d / 4) * rowRes;
    lng += (d % 4) * colRes;
    latRes = rowRes; lngRes = colRes;
  }
  return tidy(lat - 90 + latRes / 2, lng - 180 + lngRes / 2);
}

export function decodeOlc(s: string): LatLng | null {
  return olcToLatLng(s);
}

// ── Mapcode (inverse of the simplified encoder) ──

const MAPCODE_ALPHABET = '23456789BCDFGHJKLMNPQRSTVWXZ';

export function decodeMapcode(s: string): LatLng | null {
  const m = s.trim().toUpperCase().match(/^([0-9A-Z]+)\.([0-9A-Z]+)$/);
  if (!m) return null;
  const body = m[1] + m[2];
  if (body.length % 2 !== 0) return null;
  const base = MAPCODE_ALPHABET.length;
  const steps = body.length / 2;
  let latF = 0, lngF = 0;
  for (let i = 0; i < steps; i++) {
    const lngIdx = MAPCODE_ALPHABET.indexOf(body[i * 2]);
    const latIdx = MAPCODE_ALPHABET.indexOf(body[i * 2 + 1]);
    if (lngIdx < 0 || latIdx < 0) return null;
    lngF += lngIdx / Math.pow(base, i + 1);
    latF += latIdx / Math.pow(base, i + 1);
  }
  const half = 0.5 / Math.pow(base, steps);
  return tidy((latF + half) * 180 - 90, (lngF + half) * 360 - 180);
}

// ── Registry ──

export const DECODERS: Record<string, (s: string) => LatLng | null> = {
  iso6709: decodeIso6709,
  geouri: decodeGeoUri,
  dd: decodeDd,
  dm: decodeDm,
  dms: decodeDms,
  geohash: decodeGeohash,
  geohash36: decodeGeohash36,
  georef: decodeGeoref,
  utm: decodeUtm,
  mgrs: decodeMgrs,
  csquares: decodeCsquares,
  imw: decodeImw,
  marsden: decodeMarsden,
  qdgc: decodeQdgc,
  wmo: decodeWmo,
  nac: decodeNac,
  olc: decodeOlc,
  mapcode: decodeMapcode,
};

export type CoordParam =
  | string
  | [number, number]
  | {
      lat?: number;
      lng?: number;
      value?: string;
      code?: string;
      input?: string;
      zone?: number;
      hemisphere?: string;
      hemi?: string;
      north?: boolean;
      easting?: number;
      northing?: number;
    };

export function decodeCoord(formatKey: string, input: CoordParam): LatLng | null {
  if (Array.isArray(input)) {
    return tidy(input[0], input[1]);
  }
  if (typeof input === 'object' && input !== null) {
    const o = input;
    if (typeof o.lat === 'number' && typeof o.lng === 'number') return tidy(o.lat, o.lng);
    if (formatKey === 'utm' && typeof o.easting === 'number' && typeof o.northing === 'number') {
      const hemi = (o.hemisphere || o.hemi || (o.north === false ? 'S' : 'N')).toUpperCase();
      if (typeof o.zone === 'number') return utmToLatLng(o.zone, hemi !== 'S', o.easting, o.northing);
    }
    const str = o.value ?? o.code ?? o.input;
    if (typeof str === 'string') return DECODERS[formatKey]?.(str) ?? null;
    return null;
  }
  if (typeof input === 'string') return DECODERS[formatKey]?.(input) ?? null;
  return null;
}
