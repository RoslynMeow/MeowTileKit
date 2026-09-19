import { resolveApp } from './registry.js';
import { injectElementStyles } from './styles.js';
import { HTMLElementBase } from './base.js';
import { parseCoord } from 'meow-tile-kit-core';

export interface MktSearchResult {
  name?: string;
  address?: string;
  lat: number;
  lng: number;
  [key: string]: any;
}

export type MktGeocoder = (
  query: string,
  ctx: { map?: any; bounds?: any },
) => Promise<MktSearchResult[]> | MktSearchResult[];

/**
 * `<mkt-search for="mapId">` — 搜索框，可放在页面任意位置。
 *
 * - **坐标搜索**开箱即用（Geohash / UTM / "39.9,116.4" / DMS…）。
 * - **地点搜索**需给 `geocoder` 赋值（或监听 `mkt:search` 自行处理）。
 * - 选中结果派发 `mkt:result`。
 */
export class MktSearchElement extends HTMLElementBase {
  /** 地点搜索实现；不设置则地点查询交给 `mkt:search` 事件。 */
  geocoder: MktGeocoder | null = null;

  private results: MktSearchResult[] = [];

  connectedCallback(): void {
    injectElementStyles();
    if (this.dataset.mktReady) return;
    this.dataset.mktReady = '1';

    this.innerHTML =
      '<form class="mkt-search">' +
      '<input class="mkt-search-input" type="search" autocomplete="off" />' +
      '<button class="mkt-search-btn" type="submit">搜索</button>' +
      '</form>' +
      '<div class="mkt-search-results" hidden></div>';

    const input = this.querySelector('.mkt-search-input') as HTMLInputElement;
    input.placeholder = this.getAttribute('placeholder') || '搜索坐标或地点';
    (this.querySelector('.mkt-search') as HTMLFormElement)
      .addEventListener('submit', (e) => { e.preventDefault(); this.search(input.value); });
    (this.querySelector('.mkt-search-results') as HTMLElement)
      .addEventListener('click', (e) => {
        const item = (e.target as HTMLElement).closest('[data-idx]') as HTMLElement | null;
        if (!item) return;
        const r = this.results[Number(item.dataset.idx)];
        if (r) this.pick(r);
      });
  }

  /** 执行搜索。 */
  async search(raw: string): Promise<void> {
    const q = (raw || '').trim();
    if (!q) return;
    this.hideResults();

    // 1) 坐标（本地解析，无需服务）
    const coord = parseCoord(q);
    if (coord) {
      resolveApp(this)?.app.locate({ lat: coord.lat, lng: coord.lng });
      this.emitResult({ lat: coord.lat, lng: coord.lng, name: q });
      return;
    }

    // 2) 地点：有 geocoder 就调用
    if (this.geocoder) {
      try {
        const b = resolveApp(this);
        const list = (await this.geocoder(q, { map: b?.app.map })) || [];
        if (!list.length) {
          this.dispatchEvent(new CustomEvent('mkt:error', { detail: { query: q, error: 'no-result' }, bubbles: true }));
        } else if (list.length === 1) {
          this.pick(list[0]);
        } else {
          this.showResults(list);
        }
      } catch (error) {
        this.dispatchEvent(new CustomEvent('mkt:error', { detail: { query: q, error }, bubbles: true }));
      }
      return;
    }

    // 3) 交给外部处理
    this.dispatchEvent(new CustomEvent('mkt:search', { detail: { query: q }, bubbles: true }));
  }

  /** 直接定位到某个结果。 */
  pick(r: MktSearchResult): void {
    resolveApp(this)?.app.locate([r.lat, r.lng]);
    this.hideResults();
    this.emitResult(r);
  }

  private emitResult(r: MktSearchResult): void {
    this.dispatchEvent(new CustomEvent('mkt:result', { detail: r, bubbles: true }));
  }

  private showResults(list: MktSearchResult[]): void {
    this.results = list;
    const box = this.querySelector('.mkt-search-results') as HTMLElement;
    box.innerHTML = list.map((r, i) =>
      '<div class="mkt-search-item" data-idx="' + i + '">' +
      '<span class="mkt-search-name">' + (r.name || r.address || ('结果 ' + (i + 1))) + '</span>' +
      '<span class="mkt-search-meta">' + r.lat.toFixed(5) + ', ' + r.lng.toFixed(5) + '</span>' +
      '</div>').join('');
    box.hidden = false;
  }

  private hideResults(): void {
    const box = this.querySelector('.mkt-search-results') as HTMLElement | null;
    if (box) { box.hidden = true; box.innerHTML = ''; }
    this.results = [];
  }
}
