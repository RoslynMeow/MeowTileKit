import { describe, expect, it } from 'vitest';
import { latLngToTile, tileToLatLng, tileBounds } from '../src/projection.js';

describe('latLngToTile', () => {
  it('北京在 zoom 13', () => {
    const t = latLngToTile(39.9087, 116.3975, 13);
    expect(t.z).toBe(13);
    expect(t.x).toBeGreaterThan(0);
    expect(t.y).toBeGreaterThan(0);
  });

  it('zoom=0 整个世界一张瓦片', () => {
    const t = latLngToTile(39.9, 116.4, 0);
    expect(t).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('赤道-本初子午线 zoom=1', () => {
    const t = latLngToTile(0, 0, 1);
    expect(t).toEqual({ x: 1, y: 1, z: 1 });
  });

  it('高 zoom 产生更大坐标', () => {
    const t0 = latLngToTile(39.9, 116.4, 10);
    const t1 = latLngToTile(39.9, 116.4, 11);
    expect(t1.x).toBe(t0.x * 2);
    expect(t1.y).toBe(t0.y * 2);
  });
});

describe('tileToLatLng', () => {
  it('zoom=0 返回整世界范围', () => {
    const c = tileToLatLng(0, 0, 0);
    expect(c.lat).toBeCloseTo(85.051, 1);
    expect(c.lng).toBe(-180);
  });

  it('往返一致', () => {
    const orig = { lat: 39.9087, lng: 116.3975 };
    const t = latLngToTile(orig.lat, orig.lng, 13);
    const back = tileToLatLng(t.x, t.y, 13);
    // 瓦片西北角与原始点应接近
    expect(Math.abs(back.lng - orig.lng)).toBeLessThan(360 / Math.pow(2, 13));
  });
});

describe('tileBounds', () => {
  it('zoom=0 的边界', () => {
    const b = tileBounds(0, 0, 0);
    expect(b.west).toBe(-180);
    expect(b.north).toBeGreaterThan(0);
  });
});
