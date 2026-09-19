/**
 * MeowTileKit 底层库（core）入口。
 *
 * 纯数据与坐标处理：坐标系统转换、大地基准、坐标格式编解码、瓦片投影、
 * 图源定义与创建、URL 定位参数解析。
 *
 * **无 DOM、无 Leaflet 依赖**，可在 Node / 任意环境使用。
 */

// ── 基础类型 ──
export type {
  LatLng,
  TileCoords,
  CoordSystem,
  TileSource,
  TileSourceOptions,
} from './types.js';

// ── 图源定义 ──
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

// ── 图源创建 / 预设 ──
export { resolveSource, createTileSource } from './tilesource.js';
export { presets, getPreset } from './presets.js';
export type { Preset } from './presets.js';

// ── 坐标系统转换 ──
export {
  convertCoord,
  wgs84ToGcj02,
  gcj02ToWgs84,
  gcj02ToWgs84Approx,
  gcj02ToBd09,
  bd09ToGcj02,
  wgs84ToBd09,
  bd09ToWgs84,
  bd09ToWgs84Approx,
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
  computeDatums,
} from './datums.js';
export type { DatumResult } from './datums.js';

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
export {
  decodeCoord,
  decodeDd,
  decodeDm,
  decodeDms,
  decodeIso6709,
  decodeGeoUri,
  decodeGeohash,
  decodeGeohash36,
  decodeGeoref,
  decodeUtm,
  utmToLatLng,
  decodeMgrs,
  decodeCsquares,
  decodeImw,
  decodeMarsden,
  decodeQdgc,
  decodeWmo,
  decodeNac,
  decodeOlc,
  olcToLatLng,
  decodeMapcode,
  DECODERS,
} from './decoders.js';
export type { CoordParam } from './decoders.js';

// ── URL 定位参数 ──
export { parseUrlLocation } from './url.js';
export type { UrlLocation, UrlCrs } from './url.js';

// ── 投影工具 ──
export {
  latLngToTile,
  tileToLatLng,
  tileBounds,
  latLngToPixel,
  pixelToLatLng,
  metersPerPixel,
} from './projection.js';
export { bdLatLngToTile, bdTileToLatLng } from './projection-baidu.js';
