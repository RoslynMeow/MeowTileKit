import type { TileSource, TileSourceOptions, LatLng } from './types.js';
import { OSMSource, AMapSource, GoogleSource, TencentSource, CartoSource, EsriSource, OpenTopoSource, WikimediaSource } from './sources/index.js';
import { wgs84ToGcj02, gcj02ToWgs84, wgs84ToBd09, bd09ToWgs84, isInChina } from './coord.js';
import { latLngToTile } from './projection.js';
import { presets, getPreset } from './presets.js';
import { defaultFormats, extraFormats, parseCoord } from './format.js';
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
  /** 自定义坐标格式列表，默认内置全部格式（defaultFormats） */
  formats?: CoordFormat[];
  /** 定位输入框可选的格式列表，默认全部内置格式（含 ISO 6709 / Geo URI） */
  locateFormats?: CoordFormat[];
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
   * @returns 解析出的 WGS-84 坐标，失败返回 null。
   */
  locate(input: CoordParam, format?: string): LatLng | null;
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

/* locate box */
.mkt-locate{display:flex;flex-direction:column;gap:8px}
.mkt-locate-row{display:flex;gap:8px}
.mkt-locate-fmt{background:rgba(255,255,255,.04);color:#c8c8d4;border:1px solid rgba(255,255,255,.09);border-radius:9px;padding:8px 8px;font-size:12px;outline:none;cursor:pointer;max-width:120px;flex-shrink:0;transition:border-color .15s}
.mkt-locate-fmt:hover,.mkt-locate-fmt:focus{border-color:rgba(74,158,255,.5)}
.mkt-locate-input{flex:1;min-width:0;background:rgba(255,255,255,.04);color:#e6e6f0;border:1px solid rgba(255,255,255,.09);border-radius:9px;padding:9px 12px;font-size:13px;font-family:"SF Mono",ui-monospace,Menlo,monospace;outline:none;transition:border-color .15s,background .15s}
.mkt-locate-input::placeholder{color:#5a5a70}
.mkt-locate-input:focus{border-color:rgba(74,158,255,.65);background:rgba(74,158,255,.06)}
.mkt-locate-input.mkt-err{border-color:rgba(255,90,90,.7);animation:mkt-shake .3s}
@keyframes mkt-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.mkt-locate-btn{background:linear-gradient(120deg,#6c5ce7,#4a9eff);color:#fff;border:none;border-radius:9px;padding:9px 14px;font-size:13px;font-weight:600;cursor:pointer;transition:filter .15s,transform .1s;letter-spacing:.3px}
.mkt-locate-btn:hover{filter:brightness(1.12)}
.mkt-locate-btn:active{transform:scale(.98)}
.mkt-locate-hint{font-size:11px;color:#5a5a70;line-height:1.6}
.mkt-locate-hint code{color:#8b9dd4;font-family:"SF Mono",ui-monospace,Menlo,monospace;background:rgba(255,255,255,.05);padding:1px 5px;border-radius:4px}

/* source select in drawer */
.mkt-srcsel{background:rgba(255,255,255,.04);color:#d4d4d8;border:1px solid rgba(255,255,255,.09);border-radius:8px;padding:6px 8px;font-size:13px;outline:none;cursor:pointer;flex:1;min-width:0;transition:border-color .15s}
.mkt-srcsel:hover,.mkt-srcsel:focus{border-color:rgba(74,158,255,.5)}
.mkt-srcsel optgroup{color:#8a8a99;font-size:12px}

/* format tabs */
.mkt-ftabs{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
.mkt-ftab{font-size:12px;color:#7a7a90;padding:6px 4px;cursor:pointer;border-radius:8px;transition:all .15s;user-select:none;text-align:center;border:1px solid transparent;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mkt-ftab:hover{color:#e2e2ea;background:rgba(255,255,255,.06)}
.mkt-ftab-on{color:#8fc0ff;background:rgba(74,158,255,.14);border-color:rgba(74,158,255,.3);font-weight:600}

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
    attributionControl: true, zoomControl: true,
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
      if ((e.target as HTMLElement).closest('.mkt-drawer-close')) return;
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
  const locateFmts = options.locateFormats ?? [...defaultFormats, ...extraFormats];
  let locateValue = '';
  let locateFmtKey = 'auto';

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

  function renderCoords(lat: number, lng: number): string {
    const gcj = wgs84ToGcj02(lat, lng);
    const bd = wgs84ToBd09(lat, lng);
    return coordRow('WGS-84', 'mkt-tag-w', lat, lng) +
      coordRow('GCJ-02', 'mkt-tag-g', gcj.lat, gcj.lng) +
      coordRow('BD-09', 'mkt-tag-b', bd.lat, bd.lng) +
      `<div class="mkt-row mkt-copy" data-copy="${iso6709(lat, lng)}"><span class="mkt-tag mkt-tag-f">ISO 6709</span><span class="mkt-val">${iso6709(lat, lng)}</span></div>` +
      `<div class="mkt-row mkt-copy" data-copy="${geoUri(lat, lng)}"><span class="mkt-tag mkt-tag-f">Geo URI</span><span class="mkt-val">${geoUri(lat, lng)}</span></div>`;
  }

  function renderMapInfo(lat: number, lng: number): string {
    const tile = latLngToTile(lat, lng, map.getZoom());
    return `<div class="mkt-row"><span class="mkt-lbl">图源</span>${sourceSelectHTML()}</div>
      <div class="mkt-row"><span class="mkt-lbl">缩放</span><span class="mkt-val">${map.getZoom()}</span></div>
      <div class="mkt-row"><span class="mkt-lbl">瓦片</span><span class="mkt-val">${tile.z}/${tile.x}/${tile.y}</span></div>
      <div class="mkt-row"><span class="mkt-lbl">区域</span><span class="mkt-val">${isInChina(lat, lng) ? '境内' : '境外'}</span></div>`;
  }

  function sourceSelectHTML(): string {
    const groups: Record<string, any[]> = {};
    presets.forEach(p => (groups[p.group] ??= []).push(p));
    const opts = Object.entries(groups).map(([g, items]) =>
      `<optgroup label="${g}">${items.map(p =>
        `<option value="${p.id}"${p.id === currentSourceId ? ' selected' : ''}>${p.label}</option>`
      ).join('')}</optgroup>`
    ).join('');
    return `<select class="mkt-srcsel">${opts}</select>`;
  }

  function drawerHeaderHTML(): string {
    return `<div class="mkt-drawer-hd"><div class="mkt-drawer-title"><span class="mkt-grip"></span><h2>MeowTileKit</h2></div><button class="mkt-drawer-close">&times;</button></div>`;
  }

  function formatBoxHTML(): string {
    return `<div class="mkt-fbox"><div class="mkt-ftabs">${formatTabsHTML()}</div></div>`;
  }

  function renderDatums(lat: number, lng: number): string {
    const datums = computeDatums(lat, lng);
    const f = fmts[formatIdx];
    const rows = datums.map(d => {
      const val = f.coord(d.lat, d.lng);
      return `<div class="mkt-drow mkt-copy" data-copy="${val}"><span class="mkt-dlbl">${d.label}</span><span class="mkt-dval">${val}</span></div>`;
    }).join('');
    return `<details class="mkt-datums"><summary>其他基准 (${datums.length})</summary>${rows}</details>`;
  }

  function renderLocateHTML(): string {
    const opts = [`<option value="auto"${locateFmtKey === 'auto' ? ' selected' : ''}>自动识别</option>`]
      .concat(locateFmts.map(f =>
        `<option value="${f.key}"${f.key === locateFmtKey ? ' selected' : ''}>${esc(f.label)}</option>`
      )).join('');
    return `<div class="mkt-box"><div class="mkt-box-title">定位</div>
      <div class="mkt-locate">
        <div class="mkt-locate-row">
          <select class="mkt-locate-fmt">${opts}</select>
          <input class="mkt-locate-input" placeholder="粘贴或输入坐标…" value="${esc(locateValue)}" />
        </div>
        <button class="mkt-locate-btn">定位到该点</button>
        <div class="mkt-locate-hint">支持 <code>39.9,116.4</code> · <code>wx4g0bm</code> · <code>50N 449345 4417292</code> · <code>8P9C3W6X+6X</code>，或 JSON 参数 <code>{"format":"utm","zone":50,...}</code></div>
      </div>
    </div>`;
  }

  function drawerBodyHTML(lat: number, lng: number): string {
    return `<div class="mkt-drawer-body">
      ${renderLocateHTML()}
      <div class="mkt-box"><div class="mkt-box-title">坐标</div>${renderCoords(lat, lng)}${renderDatums(lat, lng)}</div>
      <div class="mkt-box"><div class="mkt-box-title">测量标准</div>${formatBoxHTML()}</div>
      <div class="mkt-box"><div class="mkt-box-title">地图</div>${renderMapInfo(lat, lng)}</div>
    </div>`;
  }

  function fullDrawerHTML(lat: number, lng: number): string {
    return drawerHeaderHTML() + drawerBodyHTML(lat, lng);
  }

  function switchSource(id: string): void {
    currentSourceId = id;
    saveSourceId(id);
    const newSrc = resolveSource(id);
    source = newSrc;
    // replace tile layer
    map.removeLayer(tileLayer);
    tileLayer = leaflet.tileLayer('', {
      tileSize: source.tileSize, maxZoom: source.maxZoom, minZoom: source.minZoom,
      attribution: source.attribution,
    });
    tileLayer.getTileUrl = (c: any) => source.getTileUrl({ x: c.x, y: c.y, z: c.z });
    map.addLayer(tileLayer);
    if (marker && showMarker) {
      const p = marker.getLatLng();
      const wgs = toWgs84(p.lat, p.lng);
      const local = toLocal(wgs.lat, wgs.lng);
      marker.setLatLng([local.lat, local.lng]);
    }
    // redraw drawer
    if (drawerOpen) {
      drawerEl!.innerHTML = fullDrawerHTML(currentLat, currentLng);
      bindDrawerEvents();
    }
  }

  function bindDrawerEvents(): void {
    drawerEl?.querySelector('.mkt-drawer-close')?.addEventListener('click', () => closeDrawer());
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
    drawerEl?.querySelector('.mkt-srcsel')?.addEventListener('change', (e: any) => {
      switchSource(e.target.value);
    });

    const locateInput = drawerEl?.querySelector('.mkt-locate-input') as HTMLInputElement | null;
    const locateSel = drawerEl?.querySelector('.mkt-locate-fmt') as HTMLSelectElement | null;
    const locateBtn = drawerEl?.querySelector('.mkt-locate-btn');

    const submitLocate = () => {
      const val = (locateInput?.value ?? '').trim();
      if (!val) return;
      locateValue = val;
      locateFmtKey = locateSel?.value ?? 'auto';
      const r = locate(parseLocateInput(val), locateFmtKey === 'auto' ? undefined : locateFmtKey);
      if (r) {
        toast('已定位 ' + r.lat.toFixed(5) + ', ' + r.lng.toFixed(5), 'ok');
      } else {
        toast('无法解析该坐标', 'err');
        if (locateInput) {
          locateInput.classList.add('mkt-err');
          setTimeout(() => locateInput.classList.remove('mkt-err'), 1200);
        }
      }
    };

    locateBtn?.addEventListener('click', submitLocate);
    locateInput?.addEventListener('keydown', (e: any) => {
      if (e.key === 'Enter') { e.preventDefault(); submitLocate(); }
    });
    locateInput?.addEventListener('input', () => { locateValue = locateInput.value; });
    locateSel?.addEventListener('change', () => { locateFmtKey = locateSel.value; });
  }

  function openDrawer(lat: number, lng: number): void {
    injectStyles();
    if (!drawerEl) {
      drawerEl = document.createElement('div');
      drawerEl.className = 'mkt-drawer';
      document.body.appendChild(drawerEl);
      restorePanelPos();
    }
    currentLat = lat; currentLng = lng;
    drawerEl.innerHTML = fullDrawerHTML(lat, lng);
    bindDrawerEvents();
    requestAnimationFrame(() => { drawerEl!.classList.add('open'); });
    drawerOpen = true;
  }

  function closeDrawer(): void {
    if (!drawerEl) return;
    drawerEl.classList.remove('open');
    drawerOpen = false;
    removeMarker();
  }

  function updateDrawer(lat: number, lng: number): void {
    if (!drawerEl || !drawerOpen) return;
    currentLat = lat; currentLng = lng;
    drawerEl.innerHTML = fullDrawerHTML(lat, lng);
    bindDrawerEvents();
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
        savePos(p.lat, p.lng, map.getZoom());
        updateDrawer(p.lat, p.lng);
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

  function parseLocateInput(value: string): CoordParam {
    const t = value.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      try { return JSON.parse(t); } catch { /* fall through */ }
    }
    return value;
  }

  // ── locate ──
  function locate(input: CoordParam, format?: string): LatLng | null {
    const key = format ?? (locateFmtKey !== 'auto' ? locateFmtKey : undefined);
    const wgs = parseCoord(input, key);
    if (!wgs) return null;
    const local = toLocal(wgs.lat, wgs.lng);
    currentLat = wgs.lat; currentLng = wgs.lng;
    savePos(wgs.lat, wgs.lng, map.getZoom());
    map.setView([local.lat, local.lng], map.getZoom(), { animate: true });
    if (showMarker) {
      const m = ensureMarker(local.lat, local.lng);
      if (m) { m.setLatLng([local.lat, local.lng]); pulseMarker(); }
    }
    updateDrawer(wgs.lat, wgs.lng);
    return local;
  }

  // ── map click / dblclick ──
  map.on('click', (e: any) => {
    currentLat = e.latlng.lat; currentLng = e.latlng.lng;
    savePos(e.latlng.lat, e.latlng.lng, map.getZoom());
    updateDrawer(e.latlng.lat, e.latlng.lng);
  });
  map.on('dblclick', (e: any) => {
    const { lat, lng } = e.latlng;
    if (showMarker) {
      ensureMarker(lat, lng);
      marker.setLatLng([lat, lng]);
      pulseMarker();
    }
    savePos(lat, lng, map.getZoom());
    if (showDrawer) openDrawer(lat, lng);
  });

  // auto-save on every map move/zoom
  map.on('moveend', () => {
    const c = map.getCenter();
    savePos(c.lat, c.lng, map.getZoom());
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

  return { map, source, toLocal, toWgs84, locate };
}
