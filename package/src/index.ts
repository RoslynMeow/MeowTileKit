/**
 * MeowTileKit 公共 API。
 *
 * 这里显式列出对外暴露的符号；其余实现（解码器、墨卡托/UTM 数学、
 * 大地基准内部换算、地图渲染闭包等）均为内部实现，不对外导出。
 * 包的 `exports` 仅暴露根入口，因此也无法通过深层路径导入内部模块。
 */

// ── 基础类型 ──
export type {
  LatLng,
  TileCoords,
  CoordSystem,
  TileSource,
  TileSourceOptions,
} from './types.js';

// ── 地图 ──
export { createMap, createTileSource } from './map.js';
export type { CreateMapOptions, MeowMap } from './map.js';

// ── 图源 ──
export {
  OSMSource,
  AMapSource,
  GoogleSource,
  TencentSource,
  CartoSource,
  EsriSource,
  OpenTopoSource,
  WikimediaSource,
} from './sources/index.js';
export type {
  OSMOptions,
  AMapOptions,
  AMapStyle,
  GoogleOptions,
  GoogleStyle,
  TencentOptions,
  CartoOptions,
  CartoStyle,
  EsriOptions,
  EsriStyle,
  OpenTopoOptions,
} from './sources/index.js';

// ── 坐标面板 ──
export { CoordPanel } from './panel.js';
export type { CoordPanelOptions } from './panel.js';

// ── 图源预设 ──
export { presets, getPreset } from './presets.js';
export type { Preset } from './presets.js';

// ── 坐标系统转换 ──
export {
  convertCoord,
  wgs84ToGcj02,
  gcj02ToWgs84,
  gcj02ToBd09,
  bd09ToGcj02,
  wgs84ToBd09,
  bd09ToWgs84,
  isInChina,
} from './coord.js';

// ── 大地基准 ──
export {
  wgs84ToDatum,
  wgs84ToNad83,
  wgs84ToEtrs89,
  wgs84ToOsgb36,
  wgs84ToEd50,
  wgs84ToSad69,
  wgs84ToGrs80,
  iso6709,
  geoUri,
} from './datums.js';

// ── 坐标格式（编码） ──
export { defaultFormats, extraFormats, parseCoord } from './format.js';
export type { CoordFormat } from './format.js';
export {
  geohash,
  geohash36f,
  georef,
  utm,
  mgrs,
  csquares,
  imw,
  marsden,
  qdgc,
  wmo,
  nac,
  olc,
  mapcode,
  encodingFormats,
} from './encodings.js';

// ── 坐标解析 ──
export { decodeCoord } from './decoders.js';
export type { CoordParam } from './decoders.js';

// ── 投影工具 ──
export { latLngToTile, tileToLatLng, tileBounds } from './projection.js';
