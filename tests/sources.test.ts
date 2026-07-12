import { describe, expect, it } from 'vitest';
import { OSMSource, AMapSource, GoogleSource, BMapSource, TencentSource } from '../src/sources/index.js';

describe('OSMSource', () => {
  const src = new OSMSource();

  it('返回正确的瓦片 URL', () => {
    const url = src.getTileUrl({ x: 1, y: 2, z: 3 });
    expect(url).toContain('tile.openstreetmap.org/3/1/2.png');
    expect(url).toMatch(/^https:\/\//);
  });

  it('默认属性', () => {
    expect(src.name).toBe('OpenStreetMap');
    expect(src.coordSystem).toBe('wgs84');
    expect(src.maxZoom).toBe(19);
    expect(src.minZoom).toBe(0);
  });
});

describe('AMapSource', () => {
  it('默认基础地图', () => {
    const src = new AMapSource();
    const url = src.getTileUrl({ x: 10, y: 20, z: 5 });
    expect(url).toContain('style=8');
    expect(url).toContain('is.autonavi.com');
    expect(src.coordSystem).toBe('gcj02');
  });

  it('卫星地图', () => {
    const src = new AMapSource({ style: 'satellite' });
    const url = src.getTileUrl({ x: 1, y: 2, z: 3 });
    expect(url).toContain('style=6');
  });
});

describe('GoogleSource', () => {
  it('默认道路图', () => {
    const src = new GoogleSource();
    const url = src.getTileUrl({ x: 1, y: 2, z: 3 });
    expect(url).toContain('lyrs=m');
    expect(url).toContain('google.com');
    expect(src.coordSystem).toBe('wgs84');
  });

  it('china 模式使用 GCJ-02', () => {
    const src = new GoogleSource({ china: true });
    expect(src.coordSystem).toBe('gcj02');
  });
});

describe('BMapSource', () => {
  it('Baidu 瓦片 URL', () => {
    const src = new BMapSource();
    const url = src.getTileUrl({ x: 1, y: 2, z: 3 });
    expect(url).toContain('map.bdimg.com');
    expect(src.coordSystem).toBe('bd09');
  });
});

describe('TencentSource', () => {
  it('默认矢量图', () => {
    const src = new TencentSource();
    const url = src.getTileUrl({ x: 1, y: 2, z: 3 });
    expect(url).toContain('map.gtimg.com');
    expect(src.coordSystem).toBe('gcj02');
  });
});
