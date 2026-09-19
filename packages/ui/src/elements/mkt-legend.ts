import { resolveApp } from './registry.js';
import { injectElementStyles } from './styles.js';
import { HTMLElementBase } from './base.js';

export interface MktLegendItem {
  label: string;
  color?: string;
  type?: 'poly' | 'line' | 'point' | 'box';
}

/**
 * `<mkt-legend for="mapId">` — 图例，可放在页面任意位置。
 *
 * 自动显示当前底图名（随 `mkt:sourcechange` 更新），并可用 `setItems()` 追加条目：
 * ```js
 * document.querySelector('mkt-legend').setItems([
 *   { label: '高铁', color: '#ff5a5a', type: 'line' },
 *   { label: '检索范围', color: '#4a9eff', type: 'poly' },
 * ])
 * ```
 */
export class MktLegendElement extends HTMLElementBase {
  private items: MktLegendItem[] = [];

  connectedCallback(): void {
    injectElementStyles();
    if (this.dataset.mktReady) return;
    this.dataset.mktReady = '1';

    this.innerHTML =
      '<div class="mkt-legend-inner">' +
      '<div class="mkt-legend-title">' + (this.getAttribute('title') || '图例') + '</div>' +
      '<div class="mkt-legend-items"></div>' +
      '<div class="mkt-legend-item"><span class="mkt-legend-sw mkt-legend-sw-base"></span><span class="mkt-legend-base-name"></span></div>' +
      '</div>';

    const b = resolveApp(this);
    const baseName = this.querySelector('.mkt-legend-base-name') as HTMLElement;
    if (b) {
      baseName.textContent = b.app.source.name;
      b.el.addEventListener('mkt:sourcechange', () => { baseName.textContent = b.app.source.name; });
    }
    this.renderItems();
  }

  setItems(items: MktLegendItem[]): void {
    this.items = items || [];
    if (this.dataset.mktReady) this.renderItems();
  }

  private renderItems(): void {
    const box = this.querySelector('.mkt-legend-items');
    if (!box) return;
    box.innerHTML = this.items.map((it) => {
      const type = it.type || 'poly';
      const style = it.color ? ' style="--c:' + it.color + '"' : '';
      return '<div class="mkt-legend-item"><span class="mkt-legend-sw mkt-legend-sw-' + type + '"' + style + '></span>' + this.esc(it.label) + '</div>';
    }).join('');
  }

  private esc(s: string): string {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
  }
}
