import type { TileSource, TileSourceOptions } from './types.js';
import { OSMSource, AMapSource, GoogleSource, TencentSource, CartoSource, EsriSource, OpenTopoSource, WikimediaSource } from './sources/index.js';
import { wgs84ToGcj02, gcj02ToWgs84, wgs84ToBd09, bd09ToWgs84, isInChina } from './coord.js';
import { latLngToTile } from './projection.js';
import { presets, getPreset } from './presets.js';
import { defaultFormats } from './format.js';
import type { CoordFormat } from './format.js';
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
  /** 自定义坐标格式列表，默认 [dd, dm, dms] */
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
}

function injectStyles(): void {
  if (document.getElementById('mkt-styles')) return;
  const css = document.createElement('style');
  css.id = 'mkt-styles';
  css.textContent = `
.mkt-drawer{position:fixed;top:0;right:0;width:auto;min-width:280px;max-width:50vw;height:100%;background:#0e0e18;border-left:1px solid #1a1a28;z-index:10000;transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans SC",sans-serif}
.mkt-drawer.open{transform:translateX(0)}
.mkt-drawer-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #1a1a28}
.mkt-drawer-hd h2{font-size:16px;font-weight:600;background:linear-gradient(90deg,#6c5ce7,#4a9eff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.mkt-drawer-close{background:none;border:none;color:#555;font-size:24px;cursor:pointer;padding:0;line-height:1}
.mkt-drawer-close:hover{color:#d4d4d8}
.mkt-drawer-body{padding:12px 18px;overflow-y:auto;flex:1}
.mkt-box{border:1px solid #1a1a28;border-radius:8px;padding:10px 12px;margin-bottom:14px}
.mkt-box-title{font-size:12px;color:#555;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.mkt-box .mkt-box:last-child{margin-bottom:0}
.mkt-drawer-body .mkt-row{display:flex;align-items:flex-start;gap:10px;padding:6px 0;font-size:15px;font-family:"SF Mono",Menlo,monospace}
.mkt-drawer-body .mkt-row .mkt-lbl{color:#666;min-width:56px;font-size:13px;font-family:inherit;padding-top:1px}
.mkt-drawer-body .mkt-row .mkt-val{color:#d4d4d8;font-weight:500;font-family:inherit;line-height:1.5}
.mkt-drawer-body .mkt-row .mkt-cs{color:#888;font-size:13px;font-family:inherit}
.mkt-drawer-body .mkt-tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;flex-shrink:0;margin-top:1px}
.mkt-tag-w{background:rgba(26,107,60,0.25);color:#6fcf97}
.mkt-tag-f{background:rgba(108,92,231,0.2);color:#7c6cf0}


.mkt-tag-g{background:rgba(107,58,26,0.25);color:#f0ad4e}
.mkt-tag-b{background:rgba(74,26,107,0.25);color:#bb86fc}
.mkt-copy{cursor:pointer;transition:opacity .15s}
.mkt-copy:hover{opacity:.7}
.mkt-toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(108,92,231,0.95);color:#fff;padding:8px 20px;border-radius:8px;font-size:14px;z-index:99999;pointer-events:none;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.3);animation:mkt-fade 1.2s ease forwards}
@keyframes mkt-fade{0%{opacity:1;transform:translateX(-50%) translateY(0)}70%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-12px)}}

/* datums collapse */
.mkt-datums{font-size:13px;margin-top:4px}
.mkt-datums summary{color:#555;cursor:pointer;user-select:none;padding:4px 0;font-size:12px;display:flex;align-items:center;gap:4px}
.mkt-datums summary:hover{color:#888}
.mkt-datums summary::before{content:'▸';font-size:10px;transition:transform .15s}
.mkt-datums[open] summary::before{transform:rotate(90deg)}
.mkt-datums .mkt-drow{display:flex;align-items:center;gap:8px;padding:3px 0 3px 14px;cursor:pointer;transition:opacity .15s;font-family:"SF Mono",Menlo,monospace}
.mkt-datums .mkt-drow:hover{opacity:.7}
.mkt-datums .mkt-dlbl{color:#555;min-width:60px;font-size:12px;font-weight:600;flex-shrink:0}
.mkt-datums .mkt-dval{color:#999;font-size:12px}
.mkt-datums .mkt-dfmt{color:#666;font-size:11px;margin-left:auto}
.mkt-datums .mkt-dfn{display:block;color:#555;font-size:11px;padding:2px 0 2px 14px;cursor:pointer;transition:opacity .15s;font-family:"SF Mono",Menlo,monospace}
.mkt-datums .mkt-dfn:hover{opacity:.7}

/* source select in drawer */
.mkt-srcsel{background:#0e0e18;color:#d4d4d8;border:1px solid #242438;border-radius:6px;padding:4px 6px;font-size:13px;outline:none;cursor:pointer;flex:1}
.mkt-srcsel:focus{border-color:#4a9eff}
.mkt-srcsel optgroup{color:#888;font-size:12px}
.mkt-row .mkt-srcsel{margin-left:0}

/* format tabs */
.mkt-ftabs{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.mkt-ftabs::-webkit-scrollbar{height:4px}
.mkt-ftabs::-webkit-scrollbar-thumb{background:#1a1a28;border-radius:2px}
.mkt-ftab{font-size:12px;color:#555;padding:4px 6px;cursor:pointer;border-radius:6px;transition:all .15s;user-select:none;text-align:center}
.mkt-ftab:hover{color:#d4d4d8;background:rgba(255,255,255,.06)}
.mkt-ftab-on{color:#4a9eff;background:rgba(74,158,255,.12);font-weight:600}

/* marker pulse ring */
.mkt-pulse::after{content:'';position:absolute;top:50%;left:50%;width:32px;height:32px;margin:-16px 0 0 -16px;border:2.5px solid #4a9eff;border-radius:50%;opacity:0;pointer-events:none;animation:mkt-pulse 1.4s ease-out infinite}
@keyframes mkt-pulse{0%{transform:scale(.6);opacity:.8}100%{transform:scale(2.2);opacity:0}}
`;
  document.head.appendChild(css);
}

const STORE_KEY = 'mkt-pos';

const SRC_KEY = 'mkt-src';

function loadSavedPos(): [number, number] | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p.lat === 'number' && typeof p.lng === 'number') return [p.lat, p.lng];
  } catch {}
  return null;
}

function loadSavedSource(): string | null {
  try { return localStorage.getItem(SRC_KEY); } catch { return null; }
}

function saveSourceId(id: string): void {
  try { localStorage.setItem(SRC_KEY, id); } catch {}
}

function savePos(lat: number, lng: number): void {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ lat, lng })); } catch {}
}

export function createMap(container: string | HTMLElement, options: CreateMapOptions): MeowMap {
  const leaflet = options.leaflet ?? getLeaflet();
  // saved source overrides string default; TileSource instance always respected
  const srcArg = typeof options.source === 'string'
    ? (loadSavedSource() ?? options.source)
    : options.source;
  let source = resolveSource(srcArg, options.sourceOptions);
  let [clat, clng] = options.center ?? loadSavedPos() ?? [39.9042, 116.4074];
  const zoom = options.zoom ?? 12;
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
  let formatIdx = 0;
  let currentLat = options.center?.[0] ?? 39.9042;
  let currentLng = options.center?.[1] ?? 116.4074;
  let currentSourceId = typeof srcArg === 'string' ? srcArg : '';
  const fmts = options.formats ?? defaultFormats;

  function toast(msg: string): void {
    const t = document.createElement('div');
    t.className = 'mkt-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1300);
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
    return `<div class="mkt-drawer-hd"><h2>MeowTileKit</h2><button class="mkt-drawer-close">&times;</button></div>`;
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

  function drawerBodyHTML(lat: number, lng: number): string {
    return `<div class="mkt-drawer-body">
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
    // reposition marker if coord system changed
    if (marker) {
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
    bindCopy();
    drawerEl?.querySelectorAll('.mkt-ftab').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx!);
        if (idx === formatIdx) return;
        const wasOpen = drawerEl!.querySelector('.mkt-datums')?.hasAttribute('open');
        formatIdx = idx;
        drawerEl!.innerHTML = fullDrawerHTML(currentLat, currentLng);
        if (wasOpen) drawerEl!.querySelector('.mkt-datums')?.setAttribute('open', '');
        bindDrawerEvents();
      });
    });
    drawerEl?.querySelector('.mkt-srcsel')?.addEventListener('change', (e: any) => {
      switchSource(e.target.value);
    });
  }

  function openDrawer(lat: number, lng: number): void {
    injectStyles();
    if (!drawerEl) {
      drawerEl = document.createElement('div');
      drawerEl.className = 'mkt-drawer';
      document.body.appendChild(drawerEl);
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
  }

  function updateDrawer(lat: number, lng: number): void {
    if (!drawerEl || !drawerOpen) return;
    currentLat = lat; currentLng = lng;
    drawerEl.innerHTML = fullDrawerHTML(lat, lng);
    bindDrawerEvents();
  }

  // ── marker ──
  let marker: any = null;
  if (showMarker) {
    const pos = options.center ? toLocal(clat, clng) : center;
    marker = leaflet.marker([pos.lat, pos.lng], { draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      savePos(p.lat, p.lng);
      updateDrawer(p.lat, p.lng);
    });
  }

  // ── map click ──
  map.on('click', (e: any) => {
    const { lat, lng } = e.latlng;
    if (marker) {
      marker.setLatLng([lat, lng]);
      const icon = marker._icon;
      if (icon) {
        icon.classList.remove('mkt-pulse');
        void icon.offsetWidth; // force reflow
        icon.classList.add('mkt-pulse');
      }
    }
    savePos(lat, lng);
    if (showDrawer) openDrawer(lat, lng);
  });

  // try geolocation if no saved position
  if (!options.center && !loadSavedPos() && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const local = toLocal(lat, lng);
        map.setView([local.lat, local.lng], map.getZoom(), { animate: true });
        currentLat = lat; currentLng = lng;
        savePos(lat, lng);
        if (marker) marker.setLatLng([local.lat, local.lng]);
        if (showDrawer) openDrawer(lat, lng);
      },
      () => {},
      { timeout: 5000, enableHighAccuracy: true }
    );
  }

  // init drawer
  if (showDrawer) openDrawer(clat, clng);

  return { map, source, toLocal, toWgs84 };
}
