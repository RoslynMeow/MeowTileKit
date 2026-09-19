import { describe, expect, it } from 'vitest';
import { parseUrlLocation } from 'meow-tile-kit-core';
import { wgs84ToGcj02, wgs84ToBd09 } from 'meow-tile-kit-core';

const BJ = { lat: 39.9042, lng: 116.4074 };

describe('parseUrlLocation', () => {
  it('默认按标准 WGS-84 解释 lat/lng', () => {
    const r = parseUrlLocation(`?lat=${BJ.lat}&lng=${BJ.lng}`);
    expect(r).not.toBeNull();
    expect(r!.crs).toBe('wgs84');
    expect(r!.lat).toBeCloseTo(BJ.lat, 6);
    expect(r!.lng).toBeCloseTo(BJ.lng, 6);
  });

  it('crs=gcj02 时转换回 WGS-84', () => {
    const g = wgs84ToGcj02(BJ.lat, BJ.lng);
    const r = parseUrlLocation(`?lat=${g.lat}&lng=${g.lng}&crs=gcj02`);
    expect(r!.crs).toBe('gcj02');
    expect(r!.lat).toBeCloseTo(BJ.lat, 4);
    expect(r!.lng).toBeCloseTo(BJ.lng, 4);
  });

  it('crs=bd09 时转换回 WGS-84', () => {
    const b = wgs84ToBd09(BJ.lat, BJ.lng);
    const r = parseUrlLocation(`?lat=${b.lat}&lng=${b.lng}&crs=bd09`);
    expect(r!.lat).toBeCloseTo(BJ.lat, 3);
    expect(r!.lng).toBeCloseTo(BJ.lng, 3);
  });

  it('coord 支持任意格式（Geohash）', () => {
    const r = parseUrlLocation('?coord=wx4g0bm');
    expect(r!.lat).toBeCloseTo(39.9, 1);
  });

  it('coord + format 指定格式（UTM）', () => {
    const r = parseUrlLocation('?coord=50N 449345 4417292&format=utm');
    expect(r!.lat).toBeCloseTo(39.9, 1);
  });

  it('zoom 透传', () => {
    const r = parseUrlLocation('?coord=wx4g0bm&zoom=14');
    expect(r!.zoom).toBe(14);
  });

  it('无有效参数返回 null', () => {
    expect(parseUrlLocation('?foo=bar')).toBeNull();
    expect(parseUrlLocation('')).toBeNull();
    expect(parseUrlLocation('?lat=abc&lng=def')).toBeNull();
  });
});
