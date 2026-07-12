import type { TileCoords } from './types.js';

const TILE_SIZE = 256;
const EARTH_RADIUS = 6378206.0;

function bdMercatorY(lat: number): number {
  return Math.log(Math.tan((90 + lat) * Math.PI / 360));
}

export function bdLatLngToTile(lat: number, lng: number, zoom: number): TileCoords {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);

  const mercY = bdMercatorY(lat);
  const y = Math.floor((1 - mercY / Math.PI) / 2 * n);

  return { x: Math.max(0, x), y: Math.max(0, y), z: zoom };
}

export function bdTileToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const n = Math.pow(2, zoom);
  const lng = x / n * 360 - 180;
  const mercY = (1 - 2 * y / n) * Math.PI;
  const lat = 360 / Math.PI * Math.atan(Math.exp(mercY)) - 90;
  return { lat, lng };
}
