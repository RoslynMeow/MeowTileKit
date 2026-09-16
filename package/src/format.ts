export interface CoordFormat {
  key: string;
  label: string;
  formatLat(lng: number): string;
  formatLng(lng: number): string;
  coord(lat: number, lng: number): string;
  /** Inverse of `coord`: parse a string back to WGS-84. */
  parse?(input: string): LatLng | null;
}

import type { LatLng } from './types.js';
import { decodeDd, decodeDm, decodeDms, decodeIso6709, decodeGeoUri, decodeCoord, DECODERS } from './decoders.js';
import type { CoordParam } from './decoders.js';
import { iso6709, geoUri } from './datums.js';

const dd: CoordFormat = {
  key: 'dd',
  label: '°',
  formatLat(v: number) { return v.toFixed(6) + '°'; },
  formatLng(v: number) { return v.toFixed(6) + '°'; },
  coord(lat: number, lng: number) { return `${this.formatLat(lat)}, ${this.formatLng(lng)}`; },
  parse: decodeDd,
};

function dmParts(v: number): { sign: string; deg: number; min: number } {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  const deg = Math.floor(abs);
  return { sign, deg, min: (abs - deg) * 60 };
}

const dm: CoordFormat = {
  key: 'dm',
  label: "° '",
  formatLat(v: number) { const p = dmParts(v); return `${p.sign}${p.deg}° ${p.min.toFixed(4)}'`; },
  formatLng(v: number) { const p = dmParts(v); return `${p.sign}${p.deg}° ${p.min.toFixed(4)}'`; },
  coord(lat: number, lng: number) { return `${this.formatLat(lat)}, ${this.formatLng(lng)}`; },
  parse: decodeDm,
};

function dmsParts(v: number): { sign: string; deg: number; min: number; sec: number } {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  const deg = Math.floor(abs);
  const rest = (abs - deg) * 60;
  const min = Math.floor(rest);
  return { sign, deg, min, sec: (rest - min) * 60 };
}

const dms: CoordFormat = {
  key: 'dms',
  label: "° ' \"",
  formatLat(v: number) { const p = dmsParts(v); return `${p.sign}${p.deg}° ${p.min}' ${p.sec.toFixed(3)}"`; },
  formatLng(v: number) { const p = dmsParts(v); return `${p.sign}${p.deg}° ${p.min}' ${p.sec.toFixed(3)}"`; },
  coord(lat: number, lng: number) { return `${this.formatLat(lat)}, ${this.formatLng(lng)}`; },
  parse: decodeDms,
};

/** Extra string formats (not shown in the tab strip but accepted when locating). */
export const extraFormats: CoordFormat[] = [
  { key: 'iso6709', label: 'ISO 6709', formatLat: (v: number) => v.toFixed(6) + '°', formatLng: (v: number) => v.toFixed(6) + '°', coord: (lat, lng) => iso6709(lat, lng), parse: decodeIso6709 },
  { key: 'geouri', label: 'Geo URI', formatLat: (v: number) => v.toFixed(6) + '°', formatLng: (v: number) => v.toFixed(6) + '°', coord: (lat, lng) => geoUri(lat, lng), parse: decodeGeoUri },
];

import { encodingFormats } from './encodings.js';

export const defaultFormats: CoordFormat[] = [dd, dm, dms, ...encodingFormats];

/** Formats used for auto-detection, most specific first. */
const AUTO_ORDER = [
  'iso6709', 'geouri', 'utm', 'mgrs', 'georef', 'marsden',
  'qdgc', 'wmo', 'csquares', 'olc', 'mapcode', 'dms', 'dm', 'dd',
  'geohash', 'geohash36', 'nac',
];

/**
 * Parse a coordinate string back to WGS-84.
 *
 * @param input  A coordinate string, `[lat, lng]`, `{ lat, lng }`, or a
 *               parameter object (see `decodeCoord`).
 * @param format Optional format key (e.g. `'utm'`) to force a decoder.
 */
export function parseCoord(input: CoordParam, format?: string): LatLng | null {
  if (typeof input === 'object' && !Array.isArray(input)) {
    const o = input;
    if (typeof o.lat === 'number' && typeof o.lng === 'number') return { lat: o.lat, lng: o.lng };
    if (format) return decodeCoord(format, input);
    return null;
  }
  if (Array.isArray(input)) return { lat: input[0], lng: input[1] };
  if (typeof input !== 'string') return null;

  let str = input.trim();
  if (!str) return null;

  // explicit "format:value" prefix
  const pref = str.match(/^([a-z0-9]+)\s*:\s*(.*)$/i);
  if (pref && DECODERS[pref[1].toLowerCase()]) {
    return DECODERS[pref[1].toLowerCase()](pref[2]);
  }

  if (format) return decodeCoord(format, str);

  for (const key of AUTO_ORDER) {
    const dec = DECODERS[key];
    if (dec) {
      const r = dec(str);
      if (r) return r;
    }
  }
  return null;
}
