import { resolveApp } from './registry.js';
import { injectElementStyles } from './styles.js';
import { HTMLElementBase } from './base.js';
import { defaultFormats, wgs84ToGcj02, wgs84ToBd09, iso6709, geoUri } from 'meow-tile-kit-core';

/**
 * `<mkt-coord-panel for="mapId">` — 坐标面板，显示当前点(marker)或地图中心的各类编码。
 * 可放在页面任意位置。
 */
export class MktCoordPanelElement extends HTMLElementBase {
  private fmtIdx = 0;

  connectedCallback(): void {
    injectElementStyles();
    if (this.dataset.mktReady) return;
    this.dataset.mktReady = '1';

    const tabs = defaultFormats
      .map((f, i) => '<span class="mkt-cp-tab" data-i="' + i + '">' + f.label + '</span>')
      .join('');
    this.innerHTML =
      '<div class="mkt-cp">' +
      '<div class="mkt-cp-tabs">' + tabs + '</div>' +
      '<div class="mkt-cp-hero"></div>' +
      '<div class="mkt-cp-rows"></div>' +
      '</div>';

    (this.querySelector('.mkt-cp-tabs') as HTMLElement).addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest('[data-i]') as HTMLElement | null;
      if (!t) return;
      this.fmtIdx = Number(t.dataset.i);
      this.renderTabs();
      this.render();
    });

    const el = resolveApp(this)?.el;
    el?.addEventListener('mkt:state', () => this.render());
    el?.addEventListener('mkt:sourcechange', () => this.render());

    this.renderTabs();
    this.render();
  }

  private currentPoint(): { lat: number; lng: number } | null {
    const b = resolveApp(this);
    const state = (b?.el as any)?.getState ? (b!.el as any).getState() : null;
    if (!state) return null;
    return state.marker || state.center || null;
  }

  private renderTabs(): void {
    this.querySelectorAll('.mkt-cp-tab').forEach((el, i) => {
      el.classList.toggle('on', i === this.fmtIdx);
    });
  }

  private render(): void {
    const p = this.currentPoint();
    if (!p) return;
    const f = defaultFormats[this.fmtIdx];
    const g = wgs84ToGcj02(p.lat, p.lng);
    const b = wgs84ToBd09(p.lat, p.lng);

    (this.querySelector('.mkt-cp-hero') as HTMLElement).textContent = f.coord(p.lat, p.lng);

    const row = (sys: string, val: string) =>
      '<div class="mkt-cp-row"><span class="mkt-cp-tag">' + sys + '</span><span class="mkt-cp-val">' + val + '</span></div>';

    (this.querySelector('.mkt-cp-rows') as HTMLElement).innerHTML =
      row('WGS-84', f.coord(p.lat, p.lng)) +
      row('GCJ-02', f.coord(g.lat, g.lng)) +
      row('BD-09', f.coord(b.lat, b.lng)) +
      row('ISO 6709', iso6709(p.lat, p.lng)) +
      row('Geo URI', geoUri(p.lat, p.lng));
  }
}
