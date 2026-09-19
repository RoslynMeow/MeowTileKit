import { createMap } from '../map.js';
import type { MeowMap, CreateMapOptions } from '../map.js';
import { setMapApp, deleteMapApp } from './registry.js';
import { injectElementStyles } from './styles.js';
import { HTMLElementBase } from './base.js';
import { resolveCrs, convertGeoJSON as toCrsGeoJSON } from './crs.js';
import { presets, convertCoord } from 'meow-tile-kit-core';

const GEAR_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10.6 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.42 1z"/></svg>';

function parseCenter(v: string | null): [number, number] | undefined {
  if (!v) return undefined;
  const p = v.split(',').map((s) => Number(s.trim()));
  return p.length === 2 && p.every((n) => isFinite(n)) ? [p[0], p[1]] : undefined;
}

type Crs = 'wgs84' | 'gcj02' | 'bd09';

function convertGeoJSON(gj: any, from: Crs): any {
  if (!gj || from === 'wgs84') return gj;
  const conv = (pos: number[]): number[] => {
    const w = convertCoord(pos[1], pos[0], from, 'wgs84');
    return [w.lng, w.lat];
  };
  const walk = (c: any): any => (typeof c[0] === 'number' ? conv(c) : c.map(walk));
  const geom = (g: any) => (g ? { ...g, coordinates: walk(g.coordinates) } : g);
  if (gj.type === 'FeatureCollection') return { ...gj, features: (gj.features || []).map((f: any) => convertGeoJSON(f, from)) };
  if (gj.type === 'Feature') return { ...gj, geometry: geom(gj.geometry) };
  return geom(gj);
}

/**
 * `<mkt-map>` — 地图宿主元素。
 *
 * 默认只渲染地图 + 缩放 +/- + 设置（图源切换）。
 * 其它部件（搜索/坐标面板/图例/比例尺/数据出口）请用对应标签配合 `for` 关联。
 *
 * 属性：`source` `center="lat,lng"` `zoom` `marker="false"` `url`。
 */
export class MktMapElement extends HTMLElementBase {
  static get observedAttributes(): string[] { return ['source']; }

  private app: MeowMap | null = null;
  private canvas: HTMLElement | null = null;
  private data: any = null;
  private dataLayer: any = null;

  connectedCallback(): void {
    injectElementStyles();
    if (this.app) return;
    const L = (window as any).L;
    if (!L) {
      console.error('[mkt-map] Leaflet (L) not found. Load Leaflet before <mkt-map>.');
      return;
    }
    this.canvas = document.createElement('div');
    this.canvas.className = 'mkt-map-canvas';
    this.appendChild(this.canvas);

    const opts: CreateMapOptions = {
      source: this.getAttribute('source') || 'osm',
      center: parseCenter(this.getAttribute('center')),
      zoom: this.hasAttribute('zoom') ? Number(this.getAttribute('zoom')) : undefined,
      marker: this.getAttribute('marker') !== 'false',
      drawer: false,
      panelOpen: false,
      scale: false,
      zoomControl: true,
      url: this.hasAttribute('url'),
    };

    this.app = createMap(this.canvas, opts);
    setMapApp(this, this.app);
    this.addSettingsControl();

    const emitState = () => this.dispatchEvent(new CustomEvent('mkt:state', { detail: this.getState(), bubbles: true }));
    this.app.map.on('moveend zoomend click', emitState);
    this.app.map.on('sourcechange', () => {
      this.drawData();
      emitState();
      this.dispatchEvent(new CustomEvent('mkt:sourcechange', { detail: this.getState(), bubbles: true }));
    });
    emitState();
  }

  disconnectedCallback(): void {
    deleteMapApp(this);
  }

  attributeChangedCallback(name: string, _old: string | null, val: string | null): void {
    if (this.app && name === 'source' && val) this.app.setSource(val);
  }

  // ── public API ──

  get map(): any { return this.app?.map; }
  get source(): any { return this.app?.source; }

  on(event: string, handler: (...args: any[]) => void): void { this.app?.map.on(event, handler); }
  off(event: string, handler: (...args: any[]) => void): void { this.app?.map.off(event, handler); }

  locate(input: any, format?: string, zoom?: number): any { return this.app ? this.app.locate(input, format, zoom) : null; }
  setSource(id: string): void { this.app?.setSource(id); }
  getSourceId(): string { return this.app?.getSourceId() ?? ''; }

  /** 当前状态（坐标统一为 WGS-84）。 */
  getState(): { center: { lat: number; lng: number }; zoom: number; sourceId: string; marker: { lat: number; lng: number } | null } {
    const app = this.app!;
    const L = (window as any).L;
    const c = app.map.getCenter();
    const cw = app.toWgs84(c.lat, c.lng);
    let marker: { lat: number; lng: number } | null = null;
    app.map.eachLayer((l: any) => {
      if (L && l instanceof L.Marker) {
        const p = l.getLatLng();
        const w = app.toWgs84(p.lat, p.lng);
        marker = { lat: w.lat, lng: w.lng };
      }
    });
    return { center: { lat: cw.lat, lng: cw.lng }, zoom: app.map.getZoom(), sourceId: app.getSourceId(), marker };
  }

  /** 绘制任意标准的 GeoJSON（内部转为规范 WGS-84，随图源切换自动重投影）。 */
  setData(geojson: any, options?: { crs?: Crs }): void {
    const crs = options?.crs ?? 'wgs84';
    this.data = convertGeoJSON(geojson, crs);
    this.drawData();
    this.dispatchEvent(new CustomEvent('mkt:data', { detail: this.data, bubbles: true }));
  }

  clearData(): void {
    this.data = null;
    this.drawData();
    this.dispatchEvent(new CustomEvent('mkt:data', { detail: null, bubbles: true }));
  }

  /**
   * 当前数据的 GeoJSON。
   * @param options.crs 输出坐标系：`wgs84`(默认，规范、跨图源稳定) / `display`(当前底图) / `gcj02` / `bd09`。
   */
  exportGeoJSON(options?: { crs?: string }): any {
    const target = resolveCrs(options?.crs, this.app?.source.coordSystem);
    return toCrsGeoJSON(this.data, target);
  }

  private drawData(): void {
    const L = (window as any).L;
    const app = this.app;
    if (!app || !L) return;
    if (this.dataLayer) { app.map.removeLayer(this.dataLayer); this.dataLayer = null; }
    if (!this.data) return;
    const convert = (c: number[]) => {
      const p = app.toLocal(c[1], c[0]);
      return L.latLng(p.lat, p.lng);
    };
    this.dataLayer = L.geoJSON(this.data, { coordsToLatLng: convert, renderer: L.canvas() }).addTo(app.map);
  }

  private addSettingsControl(): void {
    if (this.getAttribute('settings') === 'false') return;
    const L = (window as any).L;
    const app = this.app!;
    const ctl = L.control({ position: 'topleft' });
    ctl.onAdd = () => {
      const box = L.DomUtil.create('div', 'mkt-map-settings');
      const btn = L.DomUtil.create('button', 'mkt-map-settings-btn', box);
      btn.type = 'button';
      btn.title = '设置';
      btn.innerHTML = GEAR_SVG;
      const menu = L.DomUtil.create('div', 'mkt-map-settings-menu', box);
      menu.hidden = true;

      const row = L.DomUtil.create('div', 'mkt-map-settings-row', menu);
      const lbl = document.createElement('span');
      lbl.textContent = '图源';
      row.appendChild(lbl);
      const sel = document.createElement('select');
      presets.forEach((p) => {
        const o = document.createElement('option');
        o.value = p.id;
        o.textContent = p.label;
        sel.appendChild(o);
      });
      sel.value = app.getSourceId();
      row.appendChild(sel);

      L.DomEvent.disableClickPropagation(box);
      L.DomEvent.disableScrollPropagation(box);
      L.DomEvent.on(sel, 'change', () => app.setSource(sel.value));
      app.map.on('sourcechange', () => { sel.value = app.getSourceId(); });
      L.DomEvent.on(btn, 'click', (e: Event) => {
        L.DomEvent.stop(e);
        menu.hidden = !menu.hidden;
        btn.classList.toggle('on', !menu.hidden);
      });
      return box;
    };
    ctl.addTo(app.map);
  }
}
