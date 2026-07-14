import { describe, expect, it } from 'vitest';
import {
  wgs84ToGcj02,
  gcj02ToWgs84,
  gcj02ToWgs84Approx,
  gcj02ToBd09,
  bd09ToGcj02,
  wgs84ToBd09,
  bd09ToWgs84,
  isInChina,
  convertCoord,
} from '../src/coord.js';

// 天安门 (WGS-84)
const TIANANMEN_WGS = { lat: 39.9087, lng: 116.3975 };
// 纽约 (不在中国)
const NEWYORK = { lat: 40.7128, lng: -74.006 };

describe('isInChina', () => {
  it('北京在中国境内', () => {
    expect(isInChina(TIANANMEN_WGS.lat, TIANANMEN_WGS.lng)).toBe(true);
  });
  it('纽约不在中国境内', () => {
    expect(isInChina(NEWYORK.lat, NEWYORK.lng)).toBe(false);
  });
});

describe('WGS-84 ↔ GCJ-02', () => {
  it('wgs84ToGcj02 产生偏移（北京）', () => {
    const gcj = wgs84ToGcj02(TIANANMEN_WGS.lat, TIANANMEN_WGS.lng);
    // GCJ-02 应偏离 WGS-84（偏差一般在 100m-700m ≈ 0.001°-0.006°）
    const diff = Math.abs(gcj.lng - TIANANMEN_WGS.lng);
    expect(diff).toBeGreaterThan(0.001);
    expect(gcj.lat).not.toBe(TIANANMEN_WGS.lat);
  });

  it('wgs84ToGcj02 境外坐标不偏移', () => {
    const gcj = wgs84ToGcj02(NEWYORK.lat, NEWYORK.lng);
    expect(gcj.lat).toBe(NEWYORK.lat);
    expect(gcj.lng).toBe(NEWYORK.lng);
  });

  it('gcj02ToWgs84 反向还原', () => {
    const gcj = wgs84ToGcj02(TIANANMEN_WGS.lat, TIANANMEN_WGS.lng);
    const wgs = gcj02ToWgs84(gcj.lat, gcj.lng);
    expect(Math.abs(wgs.lat - TIANANMEN_WGS.lat)).toBeLessThan(0.0001);
    expect(Math.abs(wgs.lng - TIANANMEN_WGS.lng)).toBeLessThan(0.0001);
  });

  it('gcj02ToWgs84Approx 迭代更精确', () => {
    const gcj = wgs84ToGcj02(TIANANMEN_WGS.lat, TIANANMEN_WGS.lng);
    const wgs = gcj02ToWgs84Approx(gcj.lat, gcj.lng);
    expect(Math.abs(wgs.lat - TIANANMEN_WGS.lat)).toBeLessThan(0.000001);
    expect(Math.abs(wgs.lng - TIANANMEN_WGS.lng)).toBeLessThan(0.000001);
  });
});

describe('GCJ-02 ↔ BD-09', () => {
  it('gcj02ToBd09 产生二次偏移', () => {
    const gcj = wgs84ToGcj02(TIANANMEN_WGS.lat, TIANANMEN_WGS.lng);
    const bd = gcj02ToBd09(gcj.lat, gcj.lng);
    const diff = Math.abs(bd.lng - gcj.lng);
    expect(diff).toBeGreaterThan(0.001);
  });

  it('bd09ToGcj02 可还原', () => {
    const gcj = wgs84ToGcj02(TIANANMEN_WGS.lat, TIANANMEN_WGS.lng);
    const bd = gcj02ToBd09(gcj.lat, gcj.lng);
    const back = bd09ToGcj02(bd.lat, bd.lng);
    expect(Math.abs(back.lat - gcj.lat)).toBeLessThan(0.0001);
    expect(Math.abs(back.lng - gcj.lng)).toBeLessThan(0.0001);
  });
});

describe('WGS-84 ↔ BD-09', () => {
  it('wgs84ToBd09 完整链路过', () => {
    const bd = wgs84ToBd09(TIANANMEN_WGS.lat, TIANANMEN_WGS.lng);
    expect(Math.abs(bd.lng - TIANANMEN_WGS.lng)).toBeGreaterThan(0.002);
  });

  it('bd09ToWgs84 完整还原', () => {
    const bd = wgs84ToBd09(TIANANMEN_WGS.lat, TIANANMEN_WGS.lng);
    const wgs = bd09ToWgs84(bd.lat, bd.lng);
    expect(Math.abs(wgs.lat - TIANANMEN_WGS.lat)).toBeLessThan(0.01);
    expect(Math.abs(wgs.lng - TIANANMEN_WGS.lng)).toBeLessThan(0.01);
  });
});

describe('convertCoord', () => {
  it('同系统直接返回', () => {
    const r = convertCoord(10, 20, 'wgs84', 'wgs84');
    expect(r).toEqual({ lat: 10, lng: 20 });
  });

  it('wgs84 → gcj02', () => {
    const r = convertCoord(TIANANMEN_WGS.lat, TIANANMEN_WGS.lng, 'wgs84', 'gcj02');
    const expected = wgs84ToGcj02(TIANANMEN_WGS.lat, TIANANMEN_WGS.lng);
    expect(r).toEqual(expected);
  });

  it('bd09 → wgs84', () => {
    const bd = wgs84ToBd09(TIANANMEN_WGS.lat, TIANANMEN_WGS.lng);
    const r = convertCoord(bd.lat, bd.lng, 'bd09', 'wgs84');
    expect(Math.abs(r.lat - TIANANMEN_WGS.lat)).toBeLessThan(0.01);
    expect(Math.abs(r.lng - TIANANMEN_WGS.lng)).toBeLessThan(0.01);
  });

  it('境外 wgs84 → gcj02 无变化', () => {
    const r = convertCoord(NEWYORK.lat, NEWYORK.lng, 'wgs84', 'gcj02');
    expect(r.lat).toBe(NEWYORK.lat);
    expect(r.lng).toBe(NEWYORK.lng);
  });
});
