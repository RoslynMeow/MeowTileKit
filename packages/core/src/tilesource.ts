import type { TileSource, TileSourceOptions } from './types.js';
import { OSMSource, AMapSource, GoogleSource, TencentSource, CartoSource, EsriSource, OpenTopoSource, WikimediaSource } from './sources/index.js';
import { getPreset } from './presets.js';

/**
 * 把预设 id 或 `TileSource` 实例解析成 `TileSource`（无 DOM 依赖）。
 */
export function resolveSource(
  source: string | TileSource,
  sourceOptions?: TileSourceOptions & Record<string, unknown>,
): TileSource {
  if (typeof source !== 'string') return source;
  const preset = getPreset(source);
  if (preset) return preset.create();
  switch (source) {
    case 'osm': return new OSMSource(sourceOptions);
    case 'amap': return new AMapSource(sourceOptions as any);
    case 'tencent': return new TencentSource(sourceOptions as any);
    case 'google': return new GoogleSource(sourceOptions as any);
    case 'carto': return new CartoSource(sourceOptions as any);
    case 'esri': return new EsriSource(sourceOptions as any);
    case 'opentopo': return new OpenTopoSource(sourceOptions);
    case 'wikimedia': return new WikimediaSource();
    default: throw new Error(`Unknown source: ${source}`);
  }
}

/** 创建图源实例（不依赖 Leaflet / DOM）。 */
export function createTileSource(
  type: string,
  options?: TileSourceOptions & Record<string, unknown>,
): TileSource {
  return resolveSource(type, options);
}
