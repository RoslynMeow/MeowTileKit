import { resolveApp } from './registry.js';
import { injectElementStyles } from './styles.js';
import { HTMLElementBase } from './base.js';
import { presets } from 'meow-tile-kit-core';

/**
 * `<mkt-settings for="mapId">` — 设置面板（图源切换），可放在页面任意位置。
 * 与 `<mkt-map>` 左上角内置的齿轮设置功能相同；用本标签时可给地图加
 * `settings="false"` 隐藏内置齿轮。
 */
export class MktSettingsElement extends HTMLElementBase {
  connectedCallback(): void {
    injectElementStyles();
    if (this.dataset.mktReady) return;
    this.dataset.mktReady = '1';

    const opts = presets
      .map((p) => '<option value="' + p.id + '">' + this.esc(p.label) + '</option>')
      .join('');
    this.innerHTML =
      '<div class="mkt-settings">' +
      '<div class="mkt-settings-title">设置</div>' +
      '<label class="mkt-settings-row"><span>图源</span><select class="mkt-settings-src">' + opts + '</select></label>' +
      '</div>';

    const b = resolveApp(this);
    const sel = this.querySelector('.mkt-settings-src') as HTMLSelectElement;
    if (b) {
      sel.value = b.app.getSourceId();
      sel.addEventListener('change', () => b.app.setSource(sel.value));
      b.el.addEventListener('mkt:sourcechange', () => { sel.value = b.app.getSourceId(); });
    }
  }

  private esc(s: string): string {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
  }
}
