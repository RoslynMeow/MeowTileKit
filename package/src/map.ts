import type { TileSource, TileSourceOptions, LatLng } from './types.js';
import { OSMSource, AMapSource, GoogleSource, TencentSource, CartoSource, EsriSource, OpenTopoSource, WikimediaSource } from './sources/index.js';
import { wgs84ToGcj02, gcj02ToWgs84, wgs84ToBd09, bd09ToWgs84 } from './coord.js';
import { parseUrlLocation } from './url.js';
import { getPreset } from './presets.js';
import { defaultFormats, parseCoord } from './format.js';
import type { CoordFormat } from './format.js';
import type { CoordParam } from './decoders.js';
import { computeDatums, iso6709, geoUri } from './datums.js';

export interface CreateMapOptions {
  source: string | TileSource;
  center?: [number, number];
  zoom?: number;
  sourceOptions?: TileSourceOptions & Record<string, unknown>;
  maxBounds?: [[number, number], [number, number]];
  leaflet?: any;
  marker?: boolean;
  drawer?: boolean;
  /** 面板是否在加载后默认展开，默认 true */
  panelOpen?: boolean;
  /** 是否使用 Leaflet 内置缩放按钮，默认 true（关掉可自建控件） */
  zoomControl?: boolean;
  /**
   * 是否从 URL 查询串读取定位参数并定位。
   * 传 `true` 启用；传 `{ apply: false }` 则只解析不自动定位（可稍后调 `app.locateFromUrl()`）。
   */
  url?: boolean | { apply?: boolean };
  /** 自定义坐标格式列表，默认内置全部格式（defaultFormats） */
  formats?: CoordFormat[];
}

let L: any = null;
function getLeaflet(): any {
  if (L) return L;
  if (typeof window !== 'undefined') L = (window as any).L;
  if (!L) throw new Error('Leaflet (L) not found. Load Leaflet before using createMap.');
  return L;
}

export function resolveSource(source: string | TileSource, sourceOptions?: TileSourceOptions & Record<string, unknown>): TileSource {
  if (typeof source !== 'string') return source;
  const preset = getPreset(source);
  if (preset) return preset.create();
  switch (source) {
    case 'osm': return new OSMSource(sourceOptions);
    case 'amap': return new AMapSource(sourceOptions as any);
    case 'tencent': return new TencentSource(sourceOptions as any);
    case 'google': return new GoogleSource(sourceOptions as any);
    case 'carto': return new CartoSource(sourceOptions as any);
    case 'esri': return new EsriSource(sourceOptions as any);
    case 'opentopo': return new OpenTopoSource(sourceOptions);
    case 'wikimedia': return new WikimediaSource();
    default: throw new Error(`Unknown source: ${source}`);
  }
}

export function createTileSource(type: string, options?: TileSourceOptions & Record<string, unknown>): TileSource {
  return resolveSource(type, options);
}

export interface MeowMap {
  map: any;
  source: TileSource;
  toLocal(lat: number, lng: number): { lat: number; lng: number };
  toWgs84(lat: number, lng: number): { lat: number; lng: number };
  /**
   * 解析坐标并定位到地图上的该点。
   * @param input 坐标字符串（如 `"wx4g0bm"`、`"50N 449345 4417292"`、`"39.9,116.4"`），
   *              或 `[lat,lng]`、`{lat,lng}`、参数对象（见 `decodeCoord`）。
   * @param format 可选，强制使用某个格式解析（如 `"utm"`）。
   * @param zoom 可选，定位后的缩放级别，默认保持当前缩放。
   * @returns 解析出的 WGS-84 坐标，失败返回 null。
   */
  locate(input: CoordParam, format?: string, zoom?: number): LatLng | null;
  /** 切换底图图源（预设 id，如 `'osm'` / `'amap'`）。切换时会按规范 WGS-84 保持视图中心与标记，不产生偏移。 */
  setSource(id: string): void;
  /** 当前图源的预设 id（传入 TileSource 实例时为空字符串）。 */
  getSourceId(): string;
  /**
   * 从 URL 查询串读取定位参数并（默认）定位。默认按标准 WGS-84 解释，`crs` 可指定其他标准。
   * 支持 `coord` / `lat`+`lng` / `crs` / `format` / `zoom`。
   * @returns 解析出的 WGS-84 坐标，失败返回 null。
   */
  locateFromUrl(options?: { search?: string; apply?: boolean }): LatLng | null;
  /** 监听地图事件（含 `sourcechange`）。等价于 `app.map.on`。 */
  on(event: string, handler: (...args: any[]) => void): void;
  /** 取消监听。 */
  off(event: string, handler: (...args: any[]) => void): void;
  /** 在坐标面板里追加自定义 HTML（随面板重绘保留）；传 '' 清除。 */
  setPanelExtra(html: string): void;
  /** 展开坐标面板。 */
  openPanel(): void;
}

function injectStyles(): void {
  if (document.getElementById('mkt-styles')) return;
  const css = document.createElement('style');
  css.id = 'mkt-styles';
  css.textContent = `
.mkt-drawer{position:fixed;top:20px;right:20px;width:min(380px,calc(100vw - 32px));max-height:calc(100vh - 40px);background:linear-gradient(180deg,rgba(16,16,28,.96),rgba(11,11,20,.985));-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.09);border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.55);z-index:10000;display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans SC",sans-serif;color:#d4d4d8;opacity:0;transform:translateY(14px) scale(.97);transform-origin:top right;pointer-events:none;transition:opacity .25s ease,transform .28s cubic-bezier(.4,0,.2,1)}
.mkt-drawer.open{opacity:1;transform:none;pointer-events:auto}
.mkt-drawer.mkt-dragging{transition:none;box-shadow:0 34px 80px rgba(0,0,0,.62)}
.mkt-drawer::before{content:'';position:absolute;inset:0;border-radius:18px;padding:1px;background:linear-gradient(135deg,rgba(108,92,231,.5),rgba(74,158,255,.3),transparent 65%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
.mkt-drawer-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.06);cursor:grab;user-select:none;touch-action:none}
.mkt-drawer.mkt-dragging .mkt-drawer-hd{cursor:grabbing}
.mkt-drawer-title{display:flex;align-items:center;gap:10px;min-width:0}
.mkt-grip{width:12px;height:16px;flex-shrink:0;opacity:.55;color:#8a8a99;background-image:radial-gradient(currentColor 1.2px,transparent 1.3px);background-size:4px 5px;background-position:1px 2px}
.mkt-drawer-hd h2{font-size:15px;font-weight:700;letter-spacing:.3px;background:linear-gradient(120deg,#8b7bff,#4a9eff 55%,#39d3c3);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;white-space:nowrap}
.mkt-drawer-close{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);color:#8a8a99;font-size:18px;cursor:pointer;width:28px;height:28px;border-radius:8px;line-height:1;transition:all .15s;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mkt-drawer-close:hover{color:#fff;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.14)}
.mkt-drawer-collapse{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);color:#8a8a99;font-size:18px;cursor:pointer;width:28px;height:28px;border-radius:8px;line-height:1;transition:all .15s;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mkt-drawer-collapse:hover{color:#fff;background:rgba(74,158,255,.18);border-color:rgba(74,158,255,.4)}
.mkt-drawer-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
.mkt-drawer.mkt-collapsed{transform:translateX(calc(100% + 40px));opacity:0;pointer-events:none}
.mkt-drawer-tab{position:fixed;top:50%;right:0;transform:translateY(-50%);z-index:10000;width:26px;height:78px;border-radius:12px 0 0 12px;background:linear-gradient(180deg,rgba(16,16,28,.95),rgba(11,11,20,.97));border:1px solid rgba(255,255,255,.09);border-right:none;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#a9a9bd;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:-8px 0 22px rgba(0,0,0,.4);transition:background .15s,color .15s}
.mkt-drawer-tab[hidden]{display:none}
.mkt-drawer-tab:hover{color:#fff;background:linear-gradient(180deg,rgba(74,158,255,.28),rgba(74,158,255,.16))}
.mkt-drawer-body{padding:14px 16px 18px;overflow-y:auto;flex:1;min-height:0}
.mkt-drawer-body::-webkit-scrollbar{width:8px}
.mkt-drawer-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}
.mkt-drawer-body::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.18)}
.mkt-box{border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px 14px;margin-bottom:14px;background:rgba(255,255,255,.018);transition:border-color .2s,background .2s}
.mkt-box:hover{border-color:rgba(255,255,255,.12);background:rgba(255,255,255,.032)}
.mkt-box-title{font-size:11px;color:#6a6a80;text-transform:uppercase;letter-spacing:1.2px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.mkt-box-title::before{content:'';width:3px;height:11px;border-radius:2px;background:linear-gradient(180deg,#8b7bff,#4a9eff)}
.mkt-drawer-body .mkt-row{display:flex;align-items:flex-start;gap:10px;padding:6px 0;font-size:14px;font-family:"SF Mono",ui-monospace,Menlo,monospace}
.mkt-drawer-body .mkt-row .mkt-lbl{color:#6a6a80;min-width:52px;font-size:12px;font-family:inherit;padding-top:2px;flex-shrink:0}
.mkt-drawer-body .mkt-row .mkt-val{color:#e2e2ea;font-weight:500;font-family:inherit;line-height:1.5;word-break:break-all}
.mkt-drawer-body .mkt-tag{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;flex-shrink:0;margin-top:1px;letter-spacing:.2px}
.mkt-tag-w{background:rgba(46,204,113,.14);color:#5fd68c}
.mkt-tag-f{background:rgba(139,123,255,.16);color:#a99cff}
.mkt-tag-g{background:rgba(240,173,78,.14);color:#f0ad4e}
.mkt-tag-b{background:rgba(187,134,252,.16);color:#c49bff}
.mkt-copy{cursor:pointer;border-radius:7px;padding:6px 8px!important;margin:0 -8px;transition:background .15s,opacity .15s}
.mkt-copy:hover{background:rgba(255,255,255,.05)}
.mkt-copy:active{background:rgba(74,158,255,.14)}
.mkt-toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(24,24,38,.96);color:#fff;padding:10px 22px;border-radius:10px;font-size:13px;z-index:99999;pointer-events:none;white-space:nowrap;border:1px solid rgba(255,255,255,.1);box-shadow:0 10px 32px rgba(0,0,0,.5);animation:mkt-fade 1.5s ease forwards}
.mkt-toast-ok{border-color:rgba(46,204,113,.4)}
.mkt-toast-err{border-color:rgba(255,90,90,.5);color:#ff9a9a}
@keyframes mkt-fade{0%{opacity:0;transform:translateX(-50%) translateY(8px)}12%{opacity:1;transform:translateX(-50%) translateY(0)}78%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-10px)}}

/* datums collapse */
.mkt-datums{font-size:13px;margin-top:6px;border-top:1px dashed rgba(255,255,255,.08);padding-top:4px}
.mkt-datums summary{color:#6a6a80;cursor:pointer;user-select:none;padding:5px 0;font-size:12px;display:flex;align-items:center;gap:6px;transition:color .15s}
.mkt-datums summary:hover{color:#a9a9bd}
.mkt-datums summary::before{content:'▸';font-size:10px;transition:transform .18s}
.mkt-datums[open] summary::before{transform:rotate(90deg)}
.mkt-datums .mkt-drow{display:flex;align-items:center;gap:8px;padding:4px 6px;margin:0 -6px;border-radius:6px;cursor:pointer;transition:background .15s;font-family:"SF Mono",ui-monospace,Menlo,monospace}
.mkt-datums .mkt-drow:hover{background:rgba(255,255,255,.05)}
.mkt-datums .mkt-dlbl{color:#6a6a80;min-width:56px;font-size:12px;font-weight:600;flex-shrink:0}
.mkt-datums .mkt-dval{color:#9a9aad;font-size:12px;word-break:break-all}

/* format tabs */
.mkt-ftabs{display:grid;grid-template-columns:repeat(auto-fill,minmax(56px,1fr));gap:5px;margin-bottom:4px}
.mkt-ftab{font-size:12px;color:#7a7a90;padding:6px 4px;cursor:pointer;border-radius:8px;transition:all .15s;user-select:none;text-align:center;border:1px solid transparent;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mkt-ftab:hover{color:#e2e2ea;background:rgba(255,255,255,.06)}
.mkt-ftab-on{color:#8fc0ff;background:rgba(74,158,255,.16);border-color:rgba(74,158,255,.35);font-weight:600}

/* primary readout */
.mkt-hero{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:12px;background:linear-gradient(120deg,rgba(108,92,231,.2),rgba(74,158,255,.1) 70%,transparent);border:1px solid rgba(139,123,255,.3);margin-bottom:10px;cursor:pointer;transition:filter .15s,border-color .15s}
.mkt-hero:hover{filter:brightness(1.12);border-color:rgba(139,123,255,.5)}
.mkt-hero-val{font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:15px;font-weight:600;color:#ececff;word-break:break-all;line-height:1.4;letter-spacing:.2px}
.mkt-hero-cp{font-size:11px;color:#b3a7ff;flex-shrink:0;border:1px solid rgba(139,123,255,.35);border-radius:6px;padding:2px 7px;background:rgba(139,123,255,.08)}
.mkt-coords{display:flex;flex-direction:column;gap:1px}

/* marker pulse ring */
.mkt-pulse::after{content:'';position:absolute;top:50%;left:50%;width:32px;height:32px;margin:-16px 0 0 -16px;border:2.5px solid #4a9eff;border-radius:50%;opacity:0;pointer-events:none;animation:mkt-pulse 1.4s ease-out infinite}
@keyframes mkt-pulse{0%{transform:scale(.6);opacity:.8}100%{transform:scale(2.2);opacity:0}}

/* cursor: pointer except while dragging */
.leaflet-grab{cursor:default!important}
.leaflet-dragging .leaflet-grab{cursor:grabbing!important}
`;
  document.head.appendChild(css);
}

const STORE_KEY = 'mkt-pos';

const SRC_KEY = 'mkt-src';
const FIDX_KEY = 'mkt-fidx';
const PANEL_KEY = 'mkt-panel';

function loadSavedState(): { lat: number; lng: number; zoom: number } | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p.lat === 'number' && typeof p.lng === 'number') return { lat: p.lat, lng: p.lng, zoom: p.zoom ?? 12 };
  } catch {}
  return null;
}

function loadSavedSource(): string | null {
  try { return localStorage.getItem(SRC_KEY); } catch { return null; }
}

function saveSourceId(id: string): void {
  try { localStorage.setItem(SRC_KEY, id); } catch {}
}

function savePos(lat: number, lng: number, zoom?: number): void {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ lat, lng, zoom: zoom ?? 12 })); } catch {}
}

export function createMap(container: string | HTMLElement, options: CreateMapOptions): MeowMap {
  const leaflet = options.leaflet ?? getLeaflet();
  // saved source overrides string default; TileSource instance always respected
  const srcArg = typeof options.source === 'string'
    ? (loadSavedSource() ?? options.source)
    : options.source;
  let source = resolveSource(srcArg, options.sourceOptions);
  const saved = !options.center ? loadSavedState() : null;
  let [clat, clng] = options.center ?? (saved ? [saved.lat, saved.lng] : [39.9042, 116.4074]);
  const zoom = options.zoom ?? saved?.zoom ?? 12;
  const showMarker = options.marker !== false;
  const showDrawer = options.drawer !== false;
  const panelOpen = options.panelOpen !== false;

  const toLocal = (lat: number, lng: number) => {
    if (source.coordSystem === 'gcj02') return wgs84ToGcj02(lat, lng);
    if (source.coordSystem === 'bd09') return wgs84ToBd09(lat, lng);
    return { lat, lng };
  };
  const toWgs84 = (lat: number, lng: number) => {
    if (source.coordSystem === 'gcj02') return gcj02ToWgs84(lat, lng);
    if (source.coordSystem === 'bd09') return bd09ToWgs84(lat, lng);
    return { lat, lng };
  };

  const center = toLocal(clat, clng);

  const mapOptions: Record<string, any> = {
    center: [center.lat, center.lng], zoom,
    attributionControl: true, zoomControl: options.zoomControl !== false,
    doubleClickZoom: false,
  };

  if (options.maxBounds) {
    const [sw, ne] = options.maxBounds;
    const swL = toLocal(sw[0], sw[1]);
    const neL = toLocal(ne[0], ne[1]);
    mapOptions.maxBounds = [[swL.lat, swL.lng], [neL.lat, neL.lng]];
    mapOptions.maxBoundsViscosity = 1;
  }

  const map = leaflet.map(container, mapOptions);
  let tileLayer: any = leaflet.tileLayer('', {
    tileSize: source.tileSize, maxZoom: source.maxZoom, minZoom: source.minZoom,
    attribution: source.attribution,
  });
  tileLayer.getTileUrl = (c: any) => source.getTileUrl({ x: c.x, y: c.y, z: c.z });
  map.addLayer(tileLayer);

  // ── drawer ──
  let drawerEl: HTMLElement | null = null;
  let drawerOpen = false;
  let drawerCollapsed = false;
  let drawerTab: HTMLElement | null = null;
  let panelExtraHtml = '';

  // ── floating panel drag ──
  let dragging = false;
  let dragSX = 0, dragSY = 0, dragOX = 0, dragOY = 0;
  let dragBound = false;

  function clampPanel(): void {
    if (!drawerEl || !drawerEl.style.left) return;
    const w = drawerEl.offsetWidth, h = drawerEl.offsetHeight;
    const nx = Math.max(8, Math.min(Math.max(8, window.innerWidth - w - 8), parseFloat(drawerEl.style.left) || 0));
    const ny = Math.max(8, Math.min(Math.max(8, window.innerHeight - h - 8), parseFloat(drawerEl.style.top) || 0));
    drawerEl.style.left = nx + 'px';
    drawerEl.style.top = ny + 'px';
  }

  function startDrag(clientX: number, clientY: number): void {
    if (!drawerEl) return;
    const rect = drawerEl.getBoundingClientRect();
    dragging = true;
    dragSX = clientX; dragSY = clientY; dragOX = rect.left; dragOY = rect.top;
    drawerEl.style.left = rect.left + 'px';
    drawerEl.style.top = rect.top + 'px';
    drawerEl.style.right = 'auto';
    drawerEl.classList.add('mkt-dragging');
  }

  function moveDrag(clientX: number, clientY: number): void {
    if (!dragging || !drawerEl) return;
    const w = drawerEl.offsetWidth, h = drawerEl.offsetHeight;
    let nx = dragOX + (clientX - dragSX);
    let ny = dragOY + (clientY - dragSY);
    nx = Math.max(8, Math.min(Math.max(8, window.innerWidth - w - 8), nx));
    ny = Math.max(8, Math.min(Math.max(8, window.innerHeight - h - 8), ny));
    drawerEl.style.left = nx + 'px';
    drawerEl.style.top = ny + 'px';
  }

  function endDrag(): void {
    if (!dragging) return;
    dragging = false;
    drawerEl?.classList.remove('mkt-dragging');
    savePanelPos();
  }

  function savePanelPos(): void {
    if (!drawerEl || !drawerEl.style.left) return;
    try {
      localStorage.setItem(PANEL_KEY, JSON.stringify({ left: drawerEl.style.left, top: drawerEl.style.top }));
    } catch {}
  }

  function restorePanelPos(): void {
    if (!drawerEl) return;
    try {
      const raw = localStorage.getItem(PANEL_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (typeof p.left === 'string' && typeof p.top === 'string') {
        drawerEl.style.left = p.left;
        drawerEl.style.top = p.top;
        drawerEl.style.right = 'auto';
        clampPanel();
      }
    } catch {}
  }

  function bindDrag(): void {
    if (!drawerEl) return;
    if (!dragBound) {
      dragBound = true;
      window.addEventListener('pointermove', (e: PointerEvent) => moveDrag(e.clientX, e.clientY));
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
      window.addEventListener('resize', clampPanel);
    }
    drawerEl.querySelector('.mkt-drawer-hd')?.addEventListener('pointerdown', (e: any) => {
      if ((e.target as HTMLElement).closest('.mkt-drawer-actions')) return;
      startDrag(e.clientX, e.clientY);
      e.preventDefault();
    });
  }

  function loadFidx(): number {
    try { const v = localStorage.getItem(FIDX_KEY); if (v !== null) return Math.max(0, parseInt(v, 10) || 0); } catch {}
    return 0;
  }
  function saveFidx(idx: number): void {
    try { localStorage.setItem(FIDX_KEY, String(idx)); } catch {}
  }
  let formatIdx = loadFidx();
  let currentLat = options.center?.[0] ?? 39.9042;
  let currentLng = options.center?.[1] ?? 116.4074;
  let currentSourceId = typeof srcArg === 'string' ? srcArg : '';
  const fmts = options.formats ?? defaultFormats;

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function toast(msg: string, kind?: 'ok' | 'err'): void {
    const t = document.createElement('div');
    t.className = 'mkt-toast' + (kind ? ' mkt-toast-' + kind : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1500);
  }

  function bindCopy(): void {
    drawerEl?.querySelectorAll('.mkt-copy').forEach(el => {
      el.addEventListener('click', () => {
        const val = (el as HTMLElement).dataset.copy;
        if (val) { navigator.clipboard.writeText(val).then(() => toast('已复制: ' + val)).catch(() => {}); }
      });
    });
  }

  function coordRow(sys: string, tagClass: string, lat: number, lng: number): string {
    const f = fmts[formatIdx];
    const val = f.coord(lat, lng);
    return `<div class="mkt-row mkt-copy" data-copy="${val}"><span class="mkt-tag ${tagClass}">${sys}</span><span class="mkt-val">${val}</span></div>`;
  }

  function formatTabsHTML(): string {
    return fmts.map((f, i) =>
      `<span class="mkt-ftab${i === formatIdx ? ' mkt-ftab-on' : ''}" data-idx="${i}">${f.label}</span>`
    ).join('');
  }

  function renderSystems(lat: number, lng: number): string {
    const gcj = wgs84ToGcj02(lat, lng);
    const bd = wgs84ToBd09(lat, lng);
    return coordRow('WGS-84', 'mkt-tag-w', lat, lng) +
      coordRow('GCJ-02', 'mkt-tag-g', gcj.lat, gcj.lng) +
      coordRow('BD-09', 'mkt-tag-b', bd.lat, bd.lng) +
      `<div class="mkt-row mkt-copy" data-copy="${esc(iso6709(lat, lng))}"><span class="mkt-tag mkt-tag-f">ISO 6709</span><span class="mkt-val">${iso6709(lat, lng)}</span></div>` +
      `<div class="mkt-row mkt-copy" data-copy="${esc(geoUri(lat, lng))}"><span class="mkt-tag mkt-tag-f">Geo URI</span><span class="mkt-val">${geoUri(lat, lng)}</span></div>`;
  }

  function heroHTML(lat: number, lng: number): string {
    const val = fmts[formatIdx].coord(lat, lng);
    return `<div class="mkt-hero mkt-copy" data-copy="${esc(val)}" title="点击复制">
      <span class="mkt-hero-val">${esc(val)}</span><span class="mkt-hero-cp">复制</span></div>`;
  }

  function drawerHeaderHTML(): string {
    return `<div class="mkt-drawer-hd"><div class="mkt-drawer-title"><span class="mkt-grip"></span><h2>MeowTileKit</h2></div><div class="mkt-drawer-actions"><button class="mkt-drawer-collapse" type="button" title="收起">&rsaquo;</button><button class="mkt-drawer-close" type="button" title="关闭">&times;</button></div></div>`;
  }

  function renderDatums(lat: number, lng: number): string {
    const datums = computeDatums(lat, lng);
    const f = fmts[formatIdx];
    const rows = datums.map(d => {
      const val = f.coord(d.lat, d.lng);
      return `<div class="mkt-drow mkt-copy" data-copy="${esc(val)}"><span class="mkt-dlbl">${d.label}</span><span class="mkt-dval">${val}</span></div>`;
    }).join('');
    return `<details class="mkt-datums"><summary>其他基准 (${datums.length})</summary>${rows}</details>`;
  }

  function drawerBodyHTML(lat: number, lng: number): string {
    return `<div class="mkt-drawer-body">
      <div class="mkt-box">
        <div class="mkt-box-title">当前坐标</div>
        ${heroHTML(lat, lng)}
        <div class="mkt-ftabs">${formatTabsHTML()}</div>
        <div class="mkt-coords">${renderSystems(lat, lng)}</div>
        ${renderDatums(lat, lng)}
      </div>
      ${panelExtraHtml}
    </div>`;
  }

  function fullDrawerHTML(lat: number, lng: number): string {
    return drawerHeaderHTML() + drawerBodyHTML(lat, lng);
  }

  function switchSource(id: string): void {
    const newSrc = resolveSource(id);

    // 用「旧」坐标系把当前视图中心与标记转成规范 WGS-84
    const c = map.getCenter();
    const cWgs = toWgs84(c.lat, c.lng);
    let mWgs: { lat: number; lng: number } | null = null;
    if (marker && showMarker) {
      const p = marker.getLatLng();
      mWgs = toWgs84(p.lat, p.lng);
    }
    const zoom = map.getZoom();

    currentSourceId = id;
    saveSourceId(id);
    source = newSrc;

    // 替换瓦片层
    map.removeLayer(tileLayer);
    tileLayer = leaflet.tileLayer('', {
      tileSize: source.tileSize, maxZoom: source.maxZoom, minZoom: source.minZoom,
      attribution: source.attribution,
    });
    tileLayer.getTileUrl = (c: any) => source.getTileUrl({ x: c.x, y: c.y, z: c.z });
    map.addLayer(tileLayer);

    // 用「新」坐标系把规范坐标投影回去，保持地理位置不变
    const cNew = toLocal(cWgs.lat, cWgs.lng);
    map.setView([cNew.lat, cNew.lng], zoom, { animate: false });
    if (mWgs) {
      const mNew = toLocal(mWgs.lat, mWgs.lng);
      marker.setLatLng([mNew.lat, mNew.lng]);
    }

    // redraw drawer
    if (drawerOpen) {
      drawerEl!.innerHTML = fullDrawerHTML(currentLat, currentLng);
      bindDrawerEvents();
    }

    // 通知外部（叠加物需按新坐标系重投影）
    map.fire('sourcechange', { id, source });
  }

  function bindDrawerEvents(): void {
    drawerEl?.querySelector('.mkt-drawer-close')?.addEventListener('click', () => closeDrawer());
    drawerEl?.querySelector('.mkt-drawer-collapse')?.addEventListener('click', () => collapseDrawer());
    bindDrag();
    bindCopy();
    drawerEl?.querySelectorAll('.mkt-ftab').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        if (idx === formatIdx) return;
        const wasOpen = drawerEl!.querySelector('.mkt-datums')?.hasAttribute('open');
        formatIdx = idx; saveFidx(idx);
        drawerEl!.innerHTML = fullDrawerHTML(currentLat, currentLng);
        if (wasOpen) drawerEl!.querySelector('.mkt-datums')?.setAttribute('open', '');
        bindDrawerEvents();
      });
    });
  }

  function ensureTab(): HTMLElement {
    if (!drawerTab) {
      drawerTab = document.createElement('div');
      drawerTab.className = 'mkt-drawer-tab';
      drawerTab.title = '展开坐标面板';
      drawerTab.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
      drawerTab.addEventListener('click', () => expandDrawer());
      document.body.appendChild(drawerTab);
    }
    return drawerTab;
  }

  function collapseDrawer(): void {
    if (!drawerEl) return;
    drawerCollapsed = true;
    drawerOpen = true;
    drawerEl.classList.remove('open');
    drawerEl.classList.add('mkt-collapsed');
    ensureTab().hidden = false;
  }

  function expandDrawer(): void {
    if (!drawerEl) return;
    drawerCollapsed = false;
    drawerOpen = true;
    drawerEl.classList.remove('mkt-collapsed');
    injectStyles();
    drawerEl.innerHTML = fullDrawerHTML(currentLat, currentLng);
    bindDrawerEvents();
    requestAnimationFrame(() => { drawerEl!.classList.add('open'); });
    if (drawerTab) drawerTab.hidden = true;
  }

  function openDrawer(lat: number, lng: number): void {
    injectStyles();
    if (!drawerEl) {
      drawerEl = document.createElement('div');
      drawerEl.className = 'mkt-drawer';
      document.body.appendChild(drawerEl);
      restorePanelPos();
    }
    drawerCollapsed = false;
    drawerEl.classList.remove('mkt-collapsed');
    if (drawerTab) drawerTab.hidden = true;
    currentLat = lat; currentLng = lng;
    drawerEl.innerHTML = fullDrawerHTML(lat, lng);
    bindDrawerEvents();
    requestAnimationFrame(() => { drawerEl!.classList.add('open'); });
    drawerOpen = true;
  }

  function closeDrawer(): void {
    if (!drawerEl) return;
    drawerEl.classList.remove('open');
    drawerEl.classList.remove('mkt-collapsed');
    if (drawerTab) drawerTab.hidden = true;
    drawerCollapsed = false;
    drawerOpen = false;
    removeMarker();
  }

  function updateDrawer(lat: number, lng: number): void {
    if (!drawerEl || !drawerOpen) return;
    currentLat = lat; currentLng = lng;
    drawerEl.innerHTML = fullDrawerHTML(lat, lng);
    bindDrawerEvents();
  }

  /** 在坐标面板里追加一段自定义 HTML（会随面板每次重绘保留）。传空字符串清除。 */
  function setPanelExtra(html: string): void {
    panelExtraHtml = html || '';
    if (drawerOpen) updateDrawer(currentLat, currentLng);
  }

  /** 展开坐标面板（若启用）。 */
  function openPanel(): void {
    if (!showDrawer) return;
    openDrawer(currentLat, currentLng);
  }

  // ── marker (lazy) ──
  let marker: any = null;
  function ensureMarker(lat: number, lng: number): any {
    if (!showMarker) return null;
    if (!marker) {
      marker = leaflet.marker([lat, lng], {
        draggable: true,
        icon: leaflet.divIcon({
          className: '',
          html: '<svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="9" fill="none" stroke="#4a9eff" stroke-width="2"/><line x1="14" y1="2" x2="14" y2="7" stroke="#4a9eff" stroke-width="2"/><line x1="14" y1="21" x2="14" y2="26" stroke="#4a9eff" stroke-width="2"/><line x1="2" y1="14" x2="7" y2="14" stroke="#4a9eff" stroke-width="2"/><line x1="21" y1="14" x2="26" y2="14" stroke="#4a9eff" stroke-width="2"/><circle cx="14" cy="14" r="2.5" fill="#4a9eff"/></svg>',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })
      }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        const wgs = toWgs84(p.lat, p.lng);
        currentLat = wgs.lat; currentLng = wgs.lng;
        savePos(wgs.lat, wgs.lng, map.getZoom());
        updateDrawer(wgs.lat, wgs.lng);
      });
    }
    return marker;
  }
  function removeMarker(): void {
    if (marker) { map.removeLayer(marker); marker = null; }
  }
  function pulseMarker(): void {
    if (!marker) return;
    const icon = marker._icon;
    if (icon) {
      icon.classList.remove('mkt-pulse');
      void icon.offsetWidth;
      icon.classList.add('mkt-pulse');
    }
  }

  // ── locate ──
  function locate(input: CoordParam, format?: string, zoom?: number): LatLng | null {
    const wgs = parseCoord(input, format);
    if (!wgs) return null;
    const local = toLocal(wgs.lat, wgs.lng);
    const z = zoom ?? map.getZoom();
    currentLat = wgs.lat; currentLng = wgs.lng;
    savePos(wgs.lat, wgs.lng, z);
    map.setView([local.lat, local.lng], z, { animate: true });
    if (showMarker) {
      const m = ensureMarker(local.lat, local.lng);
      if (m) { m.setLatLng([local.lat, local.lng]); pulseMarker(); }
    }
    updateDrawer(wgs.lat, wgs.lng);
    return local;
  }

  /** 从 URL 查询串读取定位参数并（默认）定位。 */
  function locateFromUrl(options?: { search?: string; apply?: boolean }): LatLng | null {
    const search = options?.search ?? (typeof window !== 'undefined' ? window.location.search : '');
    const r = parseUrlLocation(search);
    if (!r) return null;
    if (options?.apply !== false) {
      locate({ lat: r.lat, lng: r.lng }, undefined, r.zoom);
    }
    return { lat: r.lat, lng: r.lng };
  }

  // ── map click（单击放置/移动目标标记）──
  map.on('click', (e: any) => {
    const local = e.latlng;
    const wgs = toWgs84(local.lat, local.lng);
    currentLat = wgs.lat; currentLng = wgs.lng;
    if (showMarker) {
      const m = ensureMarker(local.lat, local.lng);
      if (m) { m.setLatLng([local.lat, local.lng]); pulseMarker(); }
    }
    savePos(wgs.lat, wgs.lng, map.getZoom());
    if (showDrawer) openDrawer(wgs.lat, wgs.lng);
  });

  // auto-save on every map move/zoom（存规范 WGS-84）
  map.on('moveend', () => {
    const c = map.getCenter();
    const wgs = toWgs84(c.lat, c.lng);
    savePos(wgs.lat, wgs.lng, map.getZoom());
  });

  // try geolocation if no saved position
  if (!options.center && !saved && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const local = toLocal(lat, lng);
        map.setView([local.lat, local.lng], map.getZoom(), { animate: true });
        currentLat = lat; currentLng = lng;
        savePos(lat, lng, map.getZoom());
        if (showMarker) { ensureMarker(local.lat, local.lng); pulseMarker(); }
        if (showDrawer) openDrawer(lat, lng);
      },
      () => {},
      { timeout: 5000, enableHighAccuracy: true }
    );
  }

  // open the floating panel by default
  if (showDrawer && panelOpen) openDrawer(clat, clng);

  // 从 URL 读取定位（默认按标准 WGS-84）
  if (options.url) {
    const apply = typeof options.url === 'object' ? options.url.apply !== false : true;
    locateFromUrl({ apply });
  }

  return {
    map,
    get source() { return source; },
    toLocal,
    toWgs84,
    locate,
    setSource: switchSource,
    getSourceId: () => currentSourceId,
    locateFromUrl,
    on: (event: string, handler: (...args: any[]) => void) => { map.on(event, handler); },
    off: (event: string, handler: (...args: any[]) => void) => { map.off(event, handler); },
    setPanelExtra,
    openPanel,
  };
}
