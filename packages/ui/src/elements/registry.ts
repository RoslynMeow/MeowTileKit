import type { MeowMap } from '../map.js';

export interface BoundMap {
  el: HTMLElement;
  app: MeowMap;
}

const registry = new WeakMap<HTMLElement, MeowMap>();

export function setMapApp(el: HTMLElement, app: MeowMap): void {
  registry.set(el, app);
}

export function deleteMapApp(el: HTMLElement): void {
  registry.delete(el);
}

/**
 * 解析某个部件元素要关联到哪个 `<mkt-map>`：
 * 1) `for="<地图元素 id>"`；2) 最近的祖先 `<mkt-map>`；3) 页面第一个 `<mkt-map>`。
 */
export function resolveApp(el: HTMLElement): BoundMap | null {
  if (typeof document === 'undefined') return null;
  const forId = el.getAttribute('for');
  let mapEl: HTMLElement | null = forId ? document.getElementById(forId) : null;
  if (!mapEl) mapEl = el.closest('mkt-map');
  if (!mapEl) mapEl = document.querySelector('mkt-map');
  if (!mapEl) return null;
  const app = registry.get(mapEl);
  return app ? { el: mapEl, app } : null;
}
