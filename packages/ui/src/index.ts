/**
 * MeowTileKit 前端库（ui）。
 *
 * 依赖 Leaflet 与浏览器 DOM：`createMap` / `CoordPanel`。
 * 自定义元素见子入口 `meow-tile-kit-ui/elements`；底层数据能力见 `meow-tile-kit-core`。
 */

export { createMap } from './map.js';
export type { CreateMapOptions, MeowMap } from './map.js';
export { CoordPanel } from './panel.js';
export type { CoordPanelOptions } from './panel.js';

// 仅再导出 core 的类型（值请从 `meow-tile-kit-core` 或 `meow-tile-kit` 引入）
export type {
  LatLng,
  TileCoords,
  CoordSystem,
  TileSource,
  TileSourceOptions,
  CoordFormat,
  CoordParam,
  Preset,
  UrlLocation,
  UrlCrs,
  DatumResult,
} from 'meow-tile-kit-core';
