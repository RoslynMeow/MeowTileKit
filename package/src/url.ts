import type { LatLng } from './types.js';
import { convertCoord } from './coord.js';
import { parseCoord } from './format.js';

export type UrlCrs = 'wgs84' | 'gcj02' | 'bd09';

export interface UrlLocation {
  /** 归一化后的 WGS-84 坐标 */
  lat: number;
  lng: number;
  /** 传入时声明的坐标系（默认 wgs84） */
  crs: UrlCrs;
  /** 可选缩放级别 */
  zoom?: number;
}

function normalizeCrs(v: string | null): UrlCrs {
  const s = (v || 'wgs84').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (s === 'gcj02' || s === 'gcj') return 'gcj02';
  if (s === 'bd09' || s === 'bd' || s === 'baidu') return 'bd09';
  return 'wgs84';
}

/**
 * 解析 URL 查询串里的定位参数。
 *
 * 支持的 query（默认按标准 WGS-84 解释，可用 `crs` 指定其他标准）：
 * - `coord=<值>`：任意受支持的坐标格式（Geohash / UTM / "39.9,116.4" / DMS …）；
 *   也可用 `format=<格式key>` 强制指定格式。
 * - `lat=<数>&lng=<数>`：经纬度（默认 WGS-84，`crs=gcj02|bd09` 时先转成 WGS-84）。
 * - `crs=wgs84|gcj02|bd09`（默认 `wgs84`）。
 * - `zoom=<数>`：可选，定位后的缩放级别。
 *
 * @param search 形如 `?coord=wx4g0bm&zoom=14` 的查询串（可含前导 `?`）。
 */
export function parseUrlLocation(search: string): UrlLocation | null {
  if (!search) return null;
  const q = new URLSearchParams(search.replace(/^\?/, ''));

  const crs = normalizeCrs(q.get('crs'));
  const format = q.get('format') || undefined;
  const zoomRaw = q.get('zoom');
  const zoom = zoomRaw !== null && isFinite(Number(zoomRaw)) ? Number(zoomRaw) : undefined;

  let wgs: LatLng | null = null;

  const coord = q.get('coord');
  if (coord) {
    // 任意格式：解析结果本身就是 WGS-84
    wgs = parseCoord(coord, format);
    // 纯数字对 + 非 wgs84：按 crs 转换
    if (!wgs && crs !== 'wgs84') {
      const parts = coord.split(',').map((s) => Number(s.trim()));
      if (parts.length === 2 && parts.every((n) => isFinite(n))) {
        wgs = convertCoord(parts[0], parts[1], crs, 'wgs84');
      }
    }
  } else {
    const latStr = q.get('lat');
    const lngStr = q.get('lng');
    if (latStr !== null && lngStr !== null) {
      const lat = Number(latStr);
      const lng = Number(lngStr);
      if (isFinite(lat) && isFinite(lng)) {
        wgs = convertCoord(lat, lng, crs, 'wgs84');
      }
    }
  }

  if (!wgs) return null;
  return { lat: wgs.lat, lng: wgs.lng, crs, zoom };
}
