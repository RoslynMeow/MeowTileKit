import { describe, expect, it } from 'vitest';
import { defaultFormats, parseCoord, extraFormats } from '../src/format.js';
import { decodeCoord, decodeGeohash36, decodeNac, decodeOlc } from '../src/decoders.js';

const POINTS = [
  { lat: 39.9042, lng: 116.4074 },   // 北京
  { lat: -33.8688, lng: 151.2093 },  // 悉尼
  { lat: 51.5074, lng: -0.1278 },    // 伦敦
  { lat: 40.7128, lng: -74.006 },    // 纽约
];

// 每个格式可接受的往返误差（度）
const TOL: Record<string, number> = {
  dd: 1e-6, dm: 1e-4, dms: 1e-5,
  geohash: 0.003, geohash36: 0.02, georef: 0.02,
  utm: 1e-4, mgrs: 1e-3, csquares: 0.002,
  imw: 3, marsden: 1, qdgc: 0.2, wmo: 1,
  nac: 1e-3, olc: 1e-4, mapcode: 1e-3,
  iso6709: 1e-6, geouri: 1e-6,
};

describe('format round-trip', () => {
  const formats = [...defaultFormats, ...extraFormats];
  for (const f of formats) {
    it(`${f.key} 编码后可解码回原点`, () => {
      const tol = TOL[f.key];
      expect(tol, `missing tolerance for ${f.key}`).toBeDefined();
      for (const p of POINTS) {
        const encoded = f.coord(p.lat, p.lng);
        const parsed = f.parse ? f.parse(encoded) : parseCoord(encoded, f.key);
        expect(parsed, `${f.key} failed to parse "${encoded}"`).not.toBeNull();
        expect(Math.abs(parsed!.lat - p.lat), `${f.key} lat "${encoded}"`).toBeLessThan(tol);
        expect(Math.abs(parsed!.lng - p.lng), `${f.key} lng "${encoded}"`).toBeLessThan(tol);
      }
    });
  }
});

describe('parseCoord auto-detect', () => {
  it('解析十进制', () => {
    expect(parseCoord('39.9042, 116.4074')).toEqual({ lat: 39.9042, lng: 116.4074 });
  });

  it('解析带半球', () => {
    const r = parseCoord('39.9042°N, 116.4074°E');
    expect(r!.lat).toBeCloseTo(39.9042, 5);
    expect(r!.lng).toBeCloseTo(116.4074, 5);
  });

  it('解析 DMS', () => {
    const r = parseCoord(`39° 54' 15.120", 116° 24' 26.640"`);
    expect(r!.lat).toBeCloseTo(39.9042, 3);
  });

  it('解析 Geo URI 与 ISO 6709', () => {
    expect(parseCoord('geo:39.9042,116.4074')!.lat).toBeCloseTo(39.9042, 5);
    expect(parseCoord('+39.904200+116.407400/')!.lng).toBeCloseTo(116.4074, 5);
  });

  it('解析 Geohash', () => {
    const r = parseCoord('wx4g0bm');
    expect(r!.lat).toBeCloseTo(39.9042, 2);
  });

  it('支持 format:value 前缀', () => {
    const r = parseCoord('utm:50N 449345 4417292');
    expect(r!.lat).toBeCloseTo(39.9, 1);
  });

  it('解析参数对象', () => {
    const code = defaultFormats.find(f => f.key === 'geohash')!.coord(39.9042, 116.4074);
    const r = parseCoord({ value: code }, 'geohash');
    expect(r!.lat).toBeCloseTo(39.9042, 2);
  });

  it('UTM 参数形式', () => {
    const r = decodeCoord('utm', { zone: 50, hemisphere: 'N', easting: 449345, northing: 4417292 });
    expect(r!.lat).toBeCloseTo(39.9, 1);
  });

  it('拒绝无效输入', () => {
    expect(parseCoord('not a coordinate')).toBeNull();
  });
});

describe('standard code samples', () => {
  it('OLC 已知样例 (Merlion Park)', () => {
    const code = parseCoord('6PH57VP3+PR6');
    expect(code!.lat).toBeCloseTo(1.286785, 3);
    expect(code!.lng).toBeCloseTo(103.854503, 3);
  });

  it('Geohash-36 可逆', () => {
    const code = defaultFormats.find(f => f.key === 'geohash36')!.coord(39.9042, 116.4074);
    const r = decodeGeohash36(code);
    expect(r).not.toBeNull();
    expect(r!.lat).toBeCloseTo(39.9042, 1);
  });

  it('NAC 可逆', () => {
    const r = decodeNac('06BS 5T82');
    expect(r).not.toBeNull();
  });
});
