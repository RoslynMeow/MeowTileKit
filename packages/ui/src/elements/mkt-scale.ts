import { resolveApp } from './registry.js';
import { injectElementStyles } from './styles.js';
import { HTMLElementBase } from './base.js';
import { metersPerPixel } from 'meow-tile-kit-core';

/** `<mkt-scale for="mapId">` — 比例尺，可放在页面任意位置。 */
export class MktScaleElement extends HTMLElementBase {
  private bound: ReturnType<typeof resolveApp> = null;
  private update = (): void => {
    const b = this.bound;
    if (!b) return;
    const app = b.app;
    const c = app.map.getCenter();
    const z = app.map.getZoom();
    const w = app.toWgs84(c.lat, c.lng);
    const mpp = metersPerPixel(w.lat, z);
    const target = mpp * 90;
    const pow = Math.pow(10, Math.floor(Math.log10(target)));
    let d = pow;
    for (const m of [1, 2, 5, 10]) { if (pow * m <= target) d = pow * m; }
    const px = Math.max(30, Math.round(d / mpp));
    const label = d >= 1000 ? (d / 1000) + ' km' : d + ' m';
    this.innerHTML =
      '<div class="mkt-scale-inner">' +
      '<div class="mkt-scale-bar" style="width:' + px + 'px"></div>' +
      '<div class="mkt-scale-label">' + label + '</div>' +
      '</div>';
  };

  connectedCallback(): void {
    injectElementStyles();
    this.bound = resolveApp(this);
    if (!this.bound) return;
    this.bound.app.map.on('moveend zoomend', this.update);
    this.update();
  }

  disconnectedCallback(): void {
    if (this.bound) this.bound.app.map.off('moveend zoomend', this.update);
  }
}
