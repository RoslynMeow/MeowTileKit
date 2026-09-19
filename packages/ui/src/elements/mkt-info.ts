import { resolveApp } from './registry.js';
import { injectElementStyles } from './styles.js';
import { HTMLElementBase } from './base.js';
import { wgs84ToGcj02 } from 'meow-tile-kit-core';

export interface MktInfoData {
  name?: string;
  address?: string;
  type?: string;
  lat: number;
  lng: number;
  [key: string]: any;
}

/**
 * `<mkt-info for="mapId">` — 结果信息卡，可放在页面任意位置。
 *
 * 监听关联地图的 `mkt:result` 事件并展示；也可手动 `show(data)` / `clear()`。
 */
export class MktInfoElement extends HTMLElementBase {
  private data: MktInfoData | null = null;

  connectedCallback(): void {
    injectElementStyles();
    if (this.dataset.mktReady) return;
    this.dataset.mktReady = '1';
    this.hidden = true;
    const b = resolveApp(this);
    b?.el.addEventListener('mkt:result', (e: Event) => this.show((e as CustomEvent).detail));
  }

  show(data: MktInfoData | null | undefined): void {
    if (!data) { this.clear(); return; }
    this.data = data;
    this.hidden = false;
    this.render();
  }

  clear(): void {
    this.data = null;
    this.hidden = true;
    this.innerHTML = '';
  }

  private render(): void {
    const r = this.data;
    if (!r) return;
    const g = wgs84ToGcj02(r.lat, r.lng);
    const row = (k: string, v: string) =>
      '<div class="mkt-info-row"><span class="mkt-info-k">' + k + '</span><span class="mkt-info-v">' + v + '</span></div>';

    this.innerHTML =
      '<div class="mkt-info-inner">' +
      '<div class="mkt-info-name">' + this.esc(r.name || '结果') + '</div>' +
      (r.address && r.address !== r.name ? row('地址', this.esc(r.address)) : '') +
      (r.type ? row('类型', this.esc(r.type)) : '') +
      row('WGS-84', r.lat.toFixed(6) + ', ' + r.lng.toFixed(6)) +
      row('GCJ-02', g.lat.toFixed(6) + ', ' + g.lng.toFixed(6)) +
      '</div>';
  }

  private esc(s: string): string {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
  }
}
