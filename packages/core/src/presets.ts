import type { TileSource, TileSourceOptions } from './types.js';
import { OSMSource, AMapSource, GoogleSource, TencentSource, CartoSource, EsriSource, OpenTopoSource, WikimediaSource } from './sources/index.js';

export interface Preset {
  id: string;
  label: string;
  coordSystem: string;
  group: string;
  create: () => TileSource;
}

const presets: Preset[] = [
  // ── WGS-84 ──
  { id: 'osm',         label: 'OpenStreetMap',           coordSystem: 'wgs84', group: 'WGS-84',     create: () => new OSMSource() },
  { id: 'google',      label: 'Google 地图',             coordSystem: 'wgs84', group: 'WGS-84',     create: () => new GoogleSource() },
  { id: 'google-sat',  label: 'Google 卫星图',           coordSystem: 'wgs84', group: 'WGS-84',     create: () => new GoogleSource({ style: 'satellite' }) },
  { id: 'google-hyb',  label: 'Google 混合图',           coordSystem: 'wgs84', group: 'WGS-84',     create: () => new GoogleSource({ style: 'hybrid' }) },
  { id: 'google-terr', label: 'Google 地形图',           coordSystem: 'wgs84', group: 'WGS-84',     create: () => new GoogleSource({ style: 'terrain' }) },
  { id: 'carto',       label: 'CartoDB 亮色',            coordSystem: 'wgs84', group: 'WGS-84',     create: () => new CartoSource() },
  { id: 'carto-dark',  label: 'CartoDB 暗色',            coordSystem: 'wgs84', group: 'WGS-84',     create: () => new CartoSource({ style: 'dark' }) },
  { id: 'carto-voy',   label: 'CartoDB 彩色',            coordSystem: 'wgs84', group: 'WGS-84',     create: () => new CartoSource({ style: 'voyager' }) },
  { id: 'esri',        label: 'Esri 街道图',             coordSystem: 'wgs84', group: 'WGS-84',     create: () => new EsriSource() },
  { id: 'esri-sat',    label: 'Esri 卫星图',             coordSystem: 'wgs84', group: 'WGS-84',     create: () => new EsriSource({ style: 'world-imagery' }) },
  { id: 'opentopo',    label: 'OpenTopoMap 地形图',      coordSystem: 'wgs84', group: 'WGS-84',     create: () => new OpenTopoSource() },
  { id: 'wikimedia',   label: 'Wikimedia 地图',          coordSystem: 'wgs84', group: 'WGS-84',     create: () => new WikimediaSource() },

  // ── GCJ-02 ──
  { id: 'amap',        label: '高德地图',                coordSystem: 'gcj02', group: 'GCJ-02',     create: () => new AMapSource() },
  { id: 'amap-sat',    label: '高德卫星图',              coordSystem: 'gcj02', group: 'GCJ-02',     create: () => new AMapSource({ style: 'satellite' }) },
  { id: 'amap-road',   label: '高德路网图',              coordSystem: 'gcj02', group: 'GCJ-02',     create: () => new AMapSource({ style: 'road' }) },
  { id: 'tencent',     label: '腾讯地图',                coordSystem: 'gcj02', group: 'GCJ-02',     create: () => new TencentSource() },
  { id: 'tencent-sat', label: '腾讯卫星图',              coordSystem: 'gcj02', group: 'GCJ-02',     create: () => new TencentSource({ style: 'satellite' }) },
  { id: 'tencent-road',label: '腾讯路网图',              coordSystem: 'gcj02', group: 'GCJ-02',     create: () => new TencentSource({ style: 'road' }) },
];

export function getPreset(id: string): Preset | undefined {
  return presets.find(p => p.id === id);
}

export function getPresetsByGroup(): Record<string, Preset[]> {
  const groups: Record<string, Preset[]> = {};
  for (const p of presets) {
    (groups[p.group] ??= []).push(p);
  }
  return groups;
}

export { presets };
