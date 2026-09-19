import type { LatLng, TileCoords } from './types.js';

const TILE_SIZE = 256;

function mercX(lng: number): number {
  return (lng + 180) / 360;
}

function mercY(lat: number): number {
  const rad = lat * Math.PI / 180;
  const y = Math.log(Math.tan(rad) + 1 / Math.cos(rad));
  return (1 - y / Math.PI) / 2;
}

export function latLngToTile(lat: number, lng: number, zoom: number): TileCoords {
  const n = Math.pow(2, zoom);
  const x = Math.floor(mercX(lng) * n);
  const y = Math.floor(mercY(lat) * n);
  return { x, y, z: zoom };
}

export function tileToLatLng(x: number, y: number, zoom: number): LatLng {
  const n = Math.pow(2, zoom);
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
  const lat = latRad * 180 / Math.PI;
  return { lat, lng };
}

export function tileBounds(x: number, y: number, zoom: number): { north: number; south: number; east: number; west: number } {
  const nw = tileToLatLng(x, y, zoom);
  const se = tileToLatLng(x + 1, y + 1, zoom);
  return { north: nw.lat, south: se.lat, east: se.lng, west: nw.lng };
}

export function latLngToPixel(lat: number, lng: number, zoom: number): { px: number; py: number } {
  const n = Math.pow(2, zoom);
  const scale = n * TILE_SIZE;
  return {
    px: mercX(lng) * scale,
    py: mercY(lat) * scale,
  };
}

export function pixelToLatLng(px: number, py: number, zoom: number): LatLng {
  const n = Math.pow(2, zoom);
  const scale = n * TILE_SIZE;
  return tileToLatLng(px / TILE_SIZE, py / TILE_SIZE, zoom);
}

export function metersPerPixel(lat: number, zoom: number): number {
  const n = Math.pow(2, zoom);
  const circumference = 40075016.686;
  return circumference * Math.cos(lat * Math.PI / 180) / (n * TILE_SIZE);
}
