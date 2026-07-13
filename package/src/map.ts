import type { TileSource, TileSourceOptions } from './types.js';
import { OSMSource, AMapSource, GoogleSource, TencentSource, CartoSource, EsriSource, OpenTopoSource } from './sources/index.js';
import { wgs84ToGcj02, gcj02ToWgs84, wgs84ToBd09, bd09ToWgs84, gcj02ToBd09, bd09ToGcj02 } from './coord.js';

export type SourceType = 'osm' | 'amap' | 'tencent' | 'google' | 'carto' | 'esri' | 'opentopo';

export interface CreateMapOptions {
  source: SourceType;
  center?: [number, number];
  zoom?: number;
  sourceOptions?: TileSourceOptions & Record<string, unknown>;
  /** 限制可视区域，WGS-84 坐标 [[south, west], [north, east]] */
  maxBounds?: [[number, number], [number, number]];

}

let L: any = null;
function getLeaflet(): any {
  if (L) return L;
  if (typeof window !== 'undefined') {
    L = (window as any).L;
  }
  if (!L) throw new Error('Leaflet (L) not found. Load Leaflet before using createMap.');
  return L;
}

export function createTileSource(type: SourceType, options?: TileSourceOptions & Record<string, unknown>): TileSource {
  switch (type) {
    case 'osm': return new OSMSource(options);
    case 'amap': return new AMapSource(options as any);
    case 'tencent': return new TencentSource(options as any);
    case 'google': return new GoogleSource(options as any);
    case 'carto': return new CartoSource(options as any);
    case 'esri': return new EsriSource(options as any);
    case 'opentopo': return new OpenTopoSource(options);
    default: throw new Error(`Unknown source type: ${type}`);
  }
}

export interface MeowMap {
  map: any;
  source: TileSource;
  toLocal(lat: number, lng: number): { lat: number; lng: number };
  toWgs84(lat: number, lng: number): { lat: number; lng: number };
}

export function createMap(container: string | HTMLElement, options: CreateMapOptions): MeowMap {
  const leaflet = getLeaflet();
  const source = createTileSource(options.source, options.sourceOptions);
  const [clat, clng] = options.center ?? [39.9042, 116.4074];
  const zoom = options.zoom ?? 12;

  const toLocal = (lat: number, lng: number) => {
    if (source.coordSystem === 'gcj02') return wgs84ToGcj02(lat, lng);
    if (source.coordSystem === 'bd09') return wgs84ToBd09(lat, lng);
    return { lat, lng };
  };

  const toWgs84 = (lat: number, lng: number) => {
    if (source.coordSystem === 'gcj02') return gcj02ToWgs84(lat, lng);
    if (source.coordSystem === 'bd09') return bd09ToWgs84(lat, lng);
    return { lat, lng };
  };

  const center = toLocal(clat, clng);

  const mapOptions: Record<string, any> = {
    center: [center.lat, center.lng],
    zoom,
    attributionControl: true,
    zoomControl: true,
  };

  if (options.maxBounds) {
    const [sw, ne] = options.maxBounds;
    const swL = toLocal(sw[0], sw[1]);
    const neL = toLocal(ne[0], ne[1]);
    mapOptions.maxBounds = [[swL.lat, swL.lng], [neL.lat, neL.lng]];
    mapOptions.maxBoundsViscosity = 1;
  }

  const map = leaflet.map(container, mapOptions);

  const layer = leaflet.tileLayer('', {
    tileSize: source.tileSize,
    maxZoom: source.maxZoom,
    minZoom: source.minZoom,
    attribution: source.attribution,
  });
  layer.getTileUrl = (c: any) => source.getTileUrl({ x: c.x, y: c.y, z: c.z });
  map.addLayer(layer);

  return { map, source, toLocal, toWgs84 };
}
