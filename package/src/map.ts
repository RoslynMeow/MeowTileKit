import type { TileSource, TileSourceOptions } from './types.js';
import { OSMSource, AMapSource, GoogleSource, TencentSource, CartoSource, EsriSource, OpenTopoSource, WikimediaSource } from './sources/index.js';
import { wgs84ToGcj02, gcj02ToWgs84, wgs84ToBd09, bd09ToWgs84, isInChina } from './coord.js';
import { latLngToTile } from './projection.js';
import { presets, getPreset } from './presets.js';
import { defaultFormats } from './format.js';
import type { CoordFormat } from './format.js';

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
.mkt-drawer{position:fixed;top:0;right:0;width:340px;height:100%;background:#0e0e18;border-left:1px solid #1a1a28;z-index:10000;transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans SC",sans-serif}
.mkt-drawer.open{transform:translateX(0)}
.mkt-drawer-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #1a1a28}
.mkt-drawer-hd h2{font-size:16px;font-weight:600;background:linear-gradient(90deg,#6c5ce7,#4a9eff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.mkt-drawer-close{background:none;border:none;color:#555;font-size:24px;cursor:pointer;padding:0;line-height:1}
.mkt-drawer-close:hover{color:#d4d4d8}
.mkt-drawer-body{padding:12px 18px;overflow-y:auto;flex:1}
.mkt-drawer-body .mkt-sec{margin-bottom:16px}
.mkt-drawer-body .mkt-sec-title{font-size:12px;color:#555;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.mkt-drawer-body .mkt-row{display:flex;align-items:flex-start;gap:10px;padding:6px 0;font-size:15px;font-family:"SF Mono",Menlo,monospace}
.mkt-drawer-body .mkt-row .mkt-lbl{color:#666;min-width:56px;font-size:13px;font-family:inherit;padding-top:1px}
.mkt-drawer-body .mkt-row .mkt-val{color:#d4d4d8;font-weight:500;font-family:inherit;line-height:1.5}
.mkt-drawer-body .mkt-row .mkt-cs{color:#888;font-size:13px;font-family:inherit}
.mkt-drawer-body .mkt-tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;flex-shrink:0;margin-top:1px}
.mkt-tag-w{background:rgba(26,107,60,0.25);color:#6fcf97}
.mkt-tag-g{background:rgba(107,58,26,0.25);color:#f0ad4e}
.mkt-tag-b{background:rgba(74,26,107,0.25);color:#bb86fc}
.mkt-copy{cursor:pointer;transition:opacity .15s}
.mkt-copy:hover{opacity:.7}
.mkt-toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(108,92,231,0.95);color:#fff;padding:8px 20px;border-radius:8px;font-size:14px;z-index:99999;pointer-events:none;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.3);animation:mkt-fade 1.2s ease forwards}
@keyframes mkt-fade{0%{opacity:1;transform:translateX(-50%) translateY(0)}70%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-12px)}}

/* source select in drawer */
.mkt-srcsel{background:#0e0e18;color:#d4d4d8;border:1px solid #242438;border-radius:6px;padding:4px 6px;font-size:13px;outline:none;cursor:pointer;flex:1}
.mkt-srcsel:focus{border-color:#4a9eff}
.mkt-srcsel optgroup{color:#888;font-size:12px}
.mkt-row .mkt-srcsel{margin-left:0}

/* format tabs */
.mkt-ftabs{display:flex;gap:0;padding:0 18px 10px;border-bottom:1px solid #1a1a28}
.mkt-ftab{font-size:12px;color:#555;padding:4px 14px;cursor:pointer;border-radius:6px;transition:all .15s;user-select:none}
.mkt-ftab:hover{color:#d4d4d8;background:rgba(255,255,255,.06)}
.mkt-ftab-on{color:#4a9eff;background:rgba(74,158,255,.12);font-weight:600}

/* marker pulse ring */
.mkt-pulse::after{content:'';position:absolute;top:50%;left:50%;width:32px;height:32px;margin:-16px 0 0 -16px;border:2.5px solid #4a9eff;border-radius:50%;opacity:0;pointer-events:none;animation:mkt-pulse 1.4s ease-out infinite}
@keyframes mkt-pulse{0%{transform:scale(.6);opacity:.8}100%{transform:scale(2.2);opacity:0}}
`;
  document.head.appendChild(css);
}

export function createMap(container: string | HTMLElement, options: CreateMapOptions): MeowMap {
  const leaflet = options.leaflet ?? getLeaflet();
  let source = resolveSource(options.source, options.sourceOptions);
  const [clat, clng] = options.center ?? [39.9042, 116.4074];
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
  let currentSourceId = typeof options.source === 'string' ? options.source : '';
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

  function coordRow(sys: string, tagClass: string, lat: number, lng: number, copyVal: string): string {
    const f = fmts[formatIdx];
    return `<div class="mkt-row mkt-copy" data-copy="${copyVal}"><span class="mkt-tag ${tagClass}">${sys}</span><span class="mkt-val">${f.coord(lat, lng)}</span></div>`;
  }

  function formatTabsHTML(): string {
    return fmts.map((f, i) =>
      `<span class="mkt-ftab${i === formatIdx ? ' mkt-ftab-on' : ''}" data-idx="${i}">${f.label}</span>`
    ).join('');
  }

  function renderCoords(lat: number, lng: number): string {
    const gcj = wgs84ToGcj02(lat, lng);
    const bd = wgs84ToBd09(lat, lng);
    return coordRow('WGS-84', 'mkt-tag-w', lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`) +
      coordRow('GCJ-02', 'mkt-tag-g', gcj.lat, gcj.lng, `${gcj.lat.toFixed(6)}, ${gcj.lng.toFixed(6)}`) +
      coordRow('BD-09', 'mkt-tag-b', bd.lat, bd.lng, `${bd.lat.toFixed(6)}, ${bd.lng.toFixed(6)}`);
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
    return `<div class="mkt-drawer-hd"><h2>MeowTileKit</h2><button class="mkt-drawer-close">&times;</button></div>
      <div class="mkt-ftabs">${formatTabsHTML()}</div>`;
  }

  function drawerBodyHTML(lat: number, lng: number): string {
    return `<div class="mkt-drawer-body">
      <div class="mkt-sec"><div class="mkt-sec-title">坐标</div>${renderCoords(lat, lng)}</div>
      <div class="mkt-sec"><div class="mkt-sec-title">地图</div>${renderMapInfo(lat, lng)}</div>
    </div>`;
  }

  function fullDrawerHTML(lat: number, lng: number): string {
    return drawerHeaderHTML() + drawerBodyHTML(lat, lng);
  }

  function switchSource(id: string): void {
    currentSourceId = id;
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
        formatIdx = idx;
        drawerEl!.innerHTML = fullDrawerHTML(currentLat, currentLng);
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
    if (showDrawer) openDrawer(lat, lng);
  });

  // init drawer
  if (showDrawer) openDrawer(clat, clng);

  return { map, source, toLocal, toWgs84 };
}
