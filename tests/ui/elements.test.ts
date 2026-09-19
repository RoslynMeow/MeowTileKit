// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'meow-tile-kit-ui/elements';
import { setMapApp, convertGeoJSON, convertPosition, resolveCrs } from 'meow-tile-kit-ui/elements';
import { convertCoord } from 'meow-tile-kit-core';

function makeMap() {
  const listeners: Record<string, Function[]> = {};
  return {
    on(ev: string, fn: Function) { (listeners[ev] ||= []).push(fn); return this; },
    off(ev: string, fn: Function) { listeners[ev] = (listeners[ev] || []).filter((f) => f !== fn); return this; },
    fire(ev: string, data?: any) { (listeners[ev] || []).forEach((f) => f(data)); },
    getCenter: () => ({ lat: 39.9, lng: 116.4 }),
    getZoom: () => 12,
  };
}

function makeApp(overrides: Record<string, any> = {}) {
  return {
    map: makeMap(),
    source: { name: '高德地图', coordSystem: 'gcj02' },
    getSourceId: () => 'amap',
    setSource: vi.fn(),
    toWgs84: (lat: number, lng: number) => ({ lat, lng }),
    toLocal: (lat: number, lng: number) => ({ lat, lng }),
    locate: vi.fn(),
    ...overrides,
  };
}

/** 用普通 div 冒充地图宿主，通过 for 关联，避开 Leaflet。 */
function makeHost(app: any, id = 'm') {
  const d = document.createElement('div');
  d.id = id;
  d.getState = () => ({ center: { lat: 39.9, lng: 116.4 }, zoom: 12, sourceId: 'amap', marker: { lat: 39.9, lng: 116.4 } });
  d.exportGeoJSON = () => ({ type: 'Point', coordinates: [116.4, 39.9] });
  document.body.appendChild(d);
  setMapApp(d as any, app);
  return d as any;
}

function mount(tag: string, attrs: Record<string, string> = {}, app?: any): any {
  const el = document.createElement(tag) as any;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('元素关联（for）', () => {
  it('mkt-search 通过 for 找到地图并定位坐标', () => {
    const app = makeApp();
    makeHost(app, 'm');
    const s = mount('mkt-search', { for: 'm' });
    s.querySelector('.mkt-search-input').value = 'wx4g0bm';
    s.querySelector('.mkt-search').dispatchEvent(new Event('submit'));
    expect(app.locate).toHaveBeenCalledTimes(1);
    expect(app.locate.mock.calls[0][0]).toMatchObject({ lat: expect.any(Number), lng: expect.any(Number) });
  });
});

describe('mkt-search', () => {
  it('坐标搜索派发 mkt:result', () => {
    const app = makeApp();
    makeHost(app, 'm');
    const s = mount('mkt-search', { for: 'm' });
    let detail: any = null;
    s.addEventListener('mkt:result', (e: any) => { detail = e.detail; });
    s.querySelector('.mkt-search-input').value = '39.9042, 116.4074';
    s.querySelector('.mkt-search').dispatchEvent(new Event('submit'));
    expect(detail).toMatchObject({ lat: 39.9042, lng: 116.4074 });
  });

  it('geocoder 返回多条时列出并可选', async () => {
    const app = makeApp();
    makeHost(app, 'm');
    const s = mount('mkt-search', { for: 'm' });
    s.geocoder = async () => [
      { name: 'A', lat: 1, lng: 2 },
      { name: 'B', lat: 3, lng: 4 },
    ];
    await s.search('北京');
    const items = s.querySelectorAll('.mkt-search-item');
    expect(items.length).toBe(2);
    items[1].dispatchEvent(new Event('click', { bubbles: true }));
    expect(app.locate).toHaveBeenCalledWith([3, 4]);
  });

  it('无 geocoder 时派发 mkt:search 交给外部', () => {
    const app = makeApp();
    makeHost(app, 'm');
    const s = mount('mkt-search', { for: 'm' });
    let query = '';
    s.addEventListener('mkt:search', (e: any) => { query = e.detail.query; });
    s.search('上海');
    expect(query).toBe('上海');
  });
});

describe('mkt-output', () => {
  it('把 state 写入内容并派发 mkt:output', () => {
    const app = makeApp();
    const host = makeHost(app, 'm');
    const out = mount('mkt-output', { for: 'm', format: 'state' });
    expect(out.value).toContain('"zoom": 12');
    host.dispatchEvent(new CustomEvent('mkt:state', { detail: host.getState() }));
    expect(out.value).toContain('"sourceId": "amap"');
  });

  it('format=geojson 输出 exportGeoJSON()', () => {
    const app = makeApp();
    makeHost(app, 'm');
    const out = mount('mkt-output', { for: 'm', format: 'geojson' });
    expect(out.value).toContain('"Point"');
  });
});

describe('mkt-legend', () => {
  it('显示底图名并追加条目', () => {
    const app = makeApp();
    makeHost(app, 'm');
    const lg = mount('mkt-legend', { for: 'm' });
    expect(lg.querySelector('.mkt-legend-base-name').textContent).toBe('高德地图');
    lg.setItems([{ label: '高铁', color: '#ff5a5a', type: 'line' }]);
    const items = lg.querySelectorAll('.mkt-legend-item');
    expect(items.length).toBe(2); // 底图行 + 自定义行
    expect(lg.textContent).toContain('高铁');
  });
});

describe('mkt-info', () => {
  it('未选中时隐藏，收到 mkt:result 后显示', () => {
    const app = makeApp();
    const host = makeHost(app, 'm');
    const info = mount('mkt-info', { for: 'm' });
    expect(info.hidden).toBe(true);
    host.dispatchEvent(new CustomEvent('mkt:result', { detail: { name: '天安门', lat: 39.9087, lng: 116.3975 } }));
    expect(info.hidden).toBe(false);
    expect(info.textContent).toContain('天安门');
    expect(info.textContent).toContain('WGS-84');
  });
});

describe('mkt-coord-panel', () => {
  it('渲染当前点坐标', () => {
    const app = makeApp();
    makeHost(app, 'm');
    const cp = mount('mkt-coord-panel', { for: 'm' });
    const hero = cp.querySelector('.mkt-cp-hero').textContent;
    expect(hero).toContain('°');
    expect(cp.querySelectorAll('.mkt-cp-row').length).toBeGreaterThanOrEqual(5);
  });
});

describe('mkt-settings', () => {
  it('切换图源调用 setSource', () => {
    const app = makeApp();
    makeHost(app, 'm');
    const st = mount('mkt-settings', { for: 'm' });
    const sel = st.querySelector('.mkt-settings-src');
    sel.value = 'osm';
    sel.dispatchEvent(new Event('change'));
    expect(app.setSource).toHaveBeenCalledWith('osm');
  });
});

describe('mkt-scale', () => {
  it('渲染比例尺并在缩放后更新', () => {
    const app = makeApp();
    makeHost(app, 'm');
    const sc = mount('mkt-scale', { for: 'm' });
    expect(sc.querySelector('.mkt-scale-bar')).toBeTruthy();
    expect(sc.querySelector('.mkt-scale-label').textContent).toMatch(/m|km/);
    app.map.fire('zoomend');
    expect(sc.querySelector('.mkt-scale-label').textContent).toMatch(/m|km/);
  });
});

describe('输出坐标系（crs）语义', () => {
  it('resolveCrs：默认 wgs84，display 跟随底图', () => {
    expect(resolveCrs(undefined, 'gcj02')).toBe('wgs84');
    expect(resolveCrs('display', 'gcj02')).toBe('gcj02');
    expect(resolveCrs('display', 'bd09')).toBe('bd09');
    expect(resolveCrs('display', 'wgs84')).toBe('wgs84');
    expect(resolveCrs('bd09', 'gcj02')).toBe('bd09');
  });

  it('convertPosition / convertGeoJSON：WGS-84 → GCJ-02', () => {
    const g = convertCoord(39.9, 116.4, 'wgs84', 'gcj02');
    const p = convertPosition([116.4, 39.9], 'gcj02');
    expect(p[0]).toBeCloseTo(g.lng, 6);
    expect(p[1]).toBeCloseTo(g.lat, 6);
    const gj = convertGeoJSON({ type: 'Point', coordinates: [116.4, 39.9] }, 'gcj02');
    expect(gj.coordinates[0]).toBeCloseTo(g.lng, 6);
    expect(gj.coordinates[1]).toBeCloseTo(g.lat, 6);
  });

  it('wgs84 原样返回', () => {
    const gj = { type: 'Point', coordinates: [1, 2] };
    expect(convertGeoJSON(gj, 'wgs84')).toBe(gj);
  });

  it('mkt-output crs=display 时按当前底图坐标系输出 state', () => {
    const app = makeApp();
    makeHost(app, 'm');
    const out = mount('mkt-output', { for: 'm', format: 'state', crs: 'display' });
    const payload = JSON.parse(out.value);
    const g = convertCoord(39.9, 116.4, 'wgs84', 'gcj02');
    expect(payload.crs).toBe('gcj02');
    expect(payload.center.lat).toBeCloseTo(g.lat, 6);
    expect(payload.center.lng).toBeCloseTo(g.lng, 6);
  });

  it('mkt-output 默认 crs=wgs84（规范坐标）', () => {
    const app = makeApp();
    makeHost(app, 'm');
    const out = mount('mkt-output', { for: 'm', format: 'state' });
    const payload = JSON.parse(out.value);
    expect(payload.center.lat).toBeCloseTo(39.9, 6);
    expect(payload.crs).toBeUndefined();
  });
});

