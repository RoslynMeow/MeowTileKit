import type { LatLng } from './types.js';

const PI = Math.PI;
const A = 6378245.0;
const EE = 0.00669342162296594323;

function outOfChina(lat: number, lng: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number): number {
  let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
  ret += (20 * Math.sin(y * PI) + 40 * Math.sin(y / 3 * PI)) * 2 / 3;
  ret += (160 * Math.sin(y / 12 * PI) + 320 * Math.sin(y * PI / 30)) * 2 / 3;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
  ret += (20 * Math.sin(x * PI) + 40 * Math.sin(x / 3 * PI)) * 2 / 3;
  ret += (150 * Math.sin(x / 12 * PI) + 300 * Math.sin(x / 30 * PI)) * 2 / 3;
  return ret;
}

function delta(lat: number, lng: number): LatLng {
  const dLat = transformLat(lng - 105, lat - 35);
  const dLng = transformLng(lng - 105, lat - 35);
  const radLat = lat / 180 * PI;
  const magic = Math.sin(radLat);
  const sqrtMagic = Math.sqrt(1 - EE * magic * magic);
  return {
    lat: (dLat * 180) / ((A * (1 - EE)) / (sqrtMagic * sqrtMagic * sqrtMagic) * PI),
    lng: (dLng * 180) / (A / sqrtMagic * Math.cos(radLat) * PI),
  };
}

export function wgs84ToGcj02(lat: number, lng: number): LatLng {
  if (outOfChina(lat, lng)) return { lat, lng };
  const d = delta(lat, lng);
  return { lat: lat + d.lat, lng: lng + d.lng };
}

export function gcj02ToWgs84(lat: number, lng: number): LatLng {
  if (outOfChina(lat, lng)) return { lat, lng };
  const d = delta(lat, lng);
  return { lat: lat - d.lat, lng: lng - d.lng };
}

export function gcj02ToWgs84Approx(lat: number, lng: number, iterations = 3): LatLng {
  if (outOfChina(lat, lng)) return { lat, lng };
  let wgs = { lat, lng };
  for (let i = 0; i < iterations; i++) {
    const gcj = wgs84ToGcj02(wgs.lat, wgs.lng);
    wgs = {
      lat: wgs.lat + (lat - gcj.lat),
      lng: wgs.lng + (lng - gcj.lng),
    };
  }
  return wgs;
}

export function gcj02ToBd09(lat: number, lng: number): LatLng {
  const x = lng;
  const y = lat;
  const z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin(y * PI);
  const theta = Math.atan2(y, x) + 0.000003 * Math.cos(x * PI);
  return {
    lat: z * Math.sin(theta) + 0.006,
    lng: z * Math.cos(theta) + 0.0065,
  };
}

export function bd09ToGcj02(lat: number, lng: number): LatLng {
  const x = lng - 0.0065;
  const y = lat - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * PI);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * PI);
  return {
    lat: z * Math.sin(theta),
    lng: z * Math.cos(theta),
  };
}

export function wgs84ToBd09(lat: number, lng: number): LatLng {
  const gcj = wgs84ToGcj02(lat, lng);
  return gcj02ToBd09(gcj.lat, gcj.lng);
}

export function bd09ToWgs84(lat: number, lng: number): LatLng {
  const gcj = bd09ToGcj02(lat, lng);
  return gcj02ToWgs84(gcj.lat, gcj.lng);
}

export function bd09ToWgs84Approx(lat: number, lng: number, iterations = 3): LatLng {
  const gcj = bd09ToGcj02(lat, lng);
  return gcj02ToWgs84Approx(gcj.lat, gcj.lng, iterations);
}

export function convertCoord(
  lat: number,
  lng: number,
  from: 'wgs84' | 'gcj02' | 'bd09',
  to: 'wgs84' | 'gcj02' | 'bd09',
): LatLng {
  if (from === to) return { lat, lng };
  if (from === 'wgs84' && to === 'gcj02') return wgs84ToGcj02(lat, lng);
  if (from === 'wgs84' && to === 'bd09') return wgs84ToBd09(lat, lng);
  if (from === 'gcj02' && to === 'wgs84') return gcj02ToWgs84Approx(lat, lng);
  if (from === 'gcj02' && to === 'bd09') return gcj02ToBd09(lat, lng);
  if (from === 'bd09' && to === 'wgs84') return bd09ToWgs84Approx(lat, lng);
  if (from === 'bd09' && to === 'gcj02') return bd09ToGcj02(lat, lng);
  return { lat, lng };
}

export function isInChina(lat: number, lng: number): boolean {
  return !outOfChina(lat, lng);
}
