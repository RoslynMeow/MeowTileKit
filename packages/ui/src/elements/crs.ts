import { convertCoord } from 'meow-tile-kit-core';

/** 输出坐标系：`wgs84`(默认) / `display`(当前底图) / `gcj02` / `bd09`。 */
export type OutputCrs = 'wgs84' | 'gcj02' | 'bd09' | 'display';

export function resolveCrs(crs: string | null | undefined, sourceCoordSystem?: string): 'wgs84' | 'gcj02' | 'bd09' {
  const c = (crs || 'wgs84').toLowerCase();
  if (c === 'display') {
    return sourceCoordSystem === 'gcj02' || sourceCoordSystem === 'bd09' ? sourceCoordSystem : 'wgs84';
  }
  if (c === 'gcj02' || c === 'gcj-02') return 'gcj02';
  if (c === 'bd09' || c === 'bd-09') return 'bd09';
  return 'wgs84';
}

/** 单个位置 [lng, lat]：规范 WGS-84 → 目标坐标系。 */
export function convertPosition(pos: number[], target: 'wgs84' | 'gcj02' | 'bd09'): number[] {
  if (target === 'wgs84') return pos;
  const p = convertCoord(pos[1], pos[0], 'wgs84', target);
  return [p.lng, p.lat];
}

/** GeoJSON：规范 WGS-84 → 目标坐标系。 */
export function convertGeoJSON(gj: any, target: 'wgs84' | 'gcj02' | 'bd09'): any {
  if (!gj || target === 'wgs84') return gj;
  const walk = (c: any): any => (typeof c[0] === 'number' ? convertPosition(c, target) : c.map(walk));
  const geom = (g: any) => (g ? { ...g, coordinates: walk(g.coordinates) } : g);
  if (gj.type === 'FeatureCollection') {
    return { ...gj, features: (gj.features || []).map((f: any) => convertGeoJSON(f, target)) };
  }
  if (gj.type === 'Feature') return { ...gj, geometry: geom(gj.geometry) };
  return geom(gj);
}
