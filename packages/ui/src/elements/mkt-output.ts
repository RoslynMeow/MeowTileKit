import { resolveApp } from './registry.js';
import { injectElementStyles } from './styles.js';
import { HTMLElementBase } from './base.js';
import { resolveCrs, convertPosition } from './crs.js';

/**
 * `<mkt-output for="mapId" format="state|geojson" crs="wgs84|display|gcj02|bd09">` — 数据出口。
 *
 * 库会把当前状态/数据写入该元素内容（可直接读 `.value` 或 `textContent`），
 * 同时派发 `mkt:output` 事件。调用方也可用自己的 JS 读取/替换。
 *
 * `crs` 语义（默认 `wgs84`）：
 * - `wgs84`：**规范坐标**，跨图源稳定（推荐导出/存储）；
 * - `display`：当前底图坐标系（随图源切换而变）；
 * - `gcj02` / `bd09`：固定目标坐标系。
 */
export class MktOutputElement extends HTMLElementBase {
  private bound: ReturnType<typeof resolveApp> = null;
  private render = (): void => {
    const b = this.bound;
    if (!b) return;
    const fmt = (this.getAttribute('format') || 'state').toLowerCase();
    const crsAttr = this.getAttribute('crs');
    const mapEl: any = b.el;
    let payload: any;

    if (fmt === 'geojson' || fmt === 'data') {
      payload = mapEl.exportGeoJSON ? mapEl.exportGeoJSON({ crs: crsAttr || undefined }) : null;
    } else {
      const s = mapEl.getState ? mapEl.getState() : null;
      const target = resolveCrs(crsAttr, b.app.source.coordSystem);
      if (s && target !== 'wgs84') {
        const c = convertPosition([s.center.lng, s.center.lat], target);
        const m = s.marker ? convertPosition([s.marker.lng, s.marker.lat], target) : null;
        payload = { ...s, center: { lat: c[1], lng: c[0] }, marker: m ? { lat: m[1], lng: m[0] } : null, crs: target };
      } else {
        payload = s;
      }
    }

    const text = payload == null ? '' : (typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2));
    this.textContent = text;
    this.dispatchEvent(new CustomEvent('mkt:output', { detail: payload, bubbles: true }));
  };

  connectedCallback(): void {
    injectElementStyles();
    this.bound = resolveApp(this);
    if (!this.bound) return;
    const el = this.bound.el;
    el.addEventListener('mkt:state', this.render);
    el.addEventListener('mkt:data', this.render);
    el.addEventListener('mkt:sourcechange', this.render);
    this.render();
  }

  disconnectedCallback(): void {
    if (!this.bound) return;
    const el = this.bound.el;
    el.removeEventListener('mkt:state', this.render);
    el.removeEventListener('mkt:data', this.render);
    el.removeEventListener('mkt:sourcechange', this.render);
  }

  get value(): string { return this.textContent || ''; }
}
