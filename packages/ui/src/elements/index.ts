/**
 * MeowTileKit 自定义元素（Web Components，新写法）。
 *
 * 引入本模块会自动注册：
 *   <mkt-map>  <mkt-search>  <mkt-coord-panel>  <mkt-scale>  <mkt-output>
 * 在非浏览器环境下（无 `customElements`）不会注册，也不会报错。
 */

import { MktMapElement } from './mkt-map.js';
import { MktSearchElement } from './mkt-search.js';
import { MktCoordPanelElement } from './mkt-coord-panel.js';
import { MktScaleElement } from './mkt-scale.js';
import { MktOutputElement } from './mkt-output.js';
import { MktLegendElement } from './mkt-legend.js';
import { MktInfoElement } from './mkt-info.js';
import { MktSettingsElement } from './mkt-settings.js';

export { MktMapElement } from './mkt-map.js';
export { MktSearchElement } from './mkt-search.js';
export type { MktSearchResult, MktGeocoder } from './mkt-search.js';
export { MktCoordPanelElement } from './mkt-coord-panel.js';
export { MktScaleElement } from './mkt-scale.js';
export { MktOutputElement } from './mkt-output.js';
export { MktLegendElement } from './mkt-legend.js';
export type { MktLegendItem } from './mkt-legend.js';
export { MktInfoElement } from './mkt-info.js';
export type { MktInfoData } from './mkt-info.js';
export { MktSettingsElement } from './mkt-settings.js';
export { resolveApp, setMapApp, deleteMapApp } from './registry.js';
export type { BoundMap } from './registry.js';
export { injectElementStyles } from './styles.js';
export { resolveCrs, convertPosition, convertGeoJSON } from './crs.js';
export type { OutputCrs } from './crs.js';

export function defineElements(): void {
  if (typeof customElements === 'undefined') return;
  if (!customElements.get('mkt-map')) customElements.define('mkt-map', MktMapElement);
  if (!customElements.get('mkt-search')) customElements.define('mkt-search', MktSearchElement);
  if (!customElements.get('mkt-coord-panel')) customElements.define('mkt-coord-panel', MktCoordPanelElement);
  if (!customElements.get('mkt-scale')) customElements.define('mkt-scale', MktScaleElement);
  if (!customElements.get('mkt-output')) customElements.define('mkt-output', MktOutputElement);
  if (!customElements.get('mkt-legend')) customElements.define('mkt-legend', MktLegendElement);
  if (!customElements.get('mkt-info')) customElements.define('mkt-info', MktInfoElement);
  if (!customElements.get('mkt-settings')) customElements.define('mkt-settings', MktSettingsElement);
}

defineElements();

