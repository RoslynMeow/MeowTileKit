import type { TileSource } from './types.js';
import { wgs84ToGcj02, wgs84ToBd09, isInChina } from './coord.js';
import { latLngToTile } from './projection.js';
import { defaultFormats } from './format.js';
import type { CoordFormat } from './format.js';
import { computeDatums, iso6709, geoUri } from './datums.js';
import { presets } from './presets.js';

export interface CoordPanelOptions {
  container: string | HTMLElement;
  source: TileSource;
  getZoom?: () => number;
  formats?: CoordFormat[];
  onSourceChange?: (id: string) => void;
}

export class CoordPanel {
  readonly el: HTMLElement;
  private source: TileSource;
  private getZoom: () => number;
  private formats: CoordFormat[];
  private formatIdx = 0;
  private onSourceChange?: (id: string) => void;
  private lastLat = 39.9042;
  private lastLng = 116.4074;

  constructor(options: CoordPanelOptions) {
    const c = typeof options.container === 'string'
      ? document.querySelector(options.container) as HTMLElement
      : options.container;
    if (!c) throw new Error('CoordPanel: container not found');
    this.el = c;
    this.source = options.source;
    this.getZoom = options.getZoom ?? (() => 12);
    this.formats = options.formats ?? defaultFormats;
    this.onSourceChange = options.onSourceChange;

    CoordPanel.injectStyles();
    this.render();
    this.bindEvents();
  }

  update(lat: number, lng: number): void {
    this.lastLat = lat;
    this.lastLng = lng;
    this.renderCoords();
    this.renderMapInfo();
  }

  setSource(source: TileSource): void {
    this.source = source;
    this.renderSourceSelect();
    this.renderMapInfo();
  }

  // ── render ──

  private render(): void {
    this.el.innerHTML = `
      <div class="mkt-box"><div class="mkt-box-title">坐标</div>
        <div class="mkt-p-coords"></div>
      </div>
      <div class="mkt-box"><div class="mkt-box-title">测量标准</div>
        <div class="mkt-ftabs mkt-p-ftabs"></div>
      </div>
      <div class="mkt-box"><div class="mkt-box-title">地图</div>
        <div class="mkt-p-minfo"></div>
      </div>`;
    this.renderCoords();
    this.renderFormatTabs();
    this.renderMapInfo();
  }

  private renderCoords(): void {
    const { lat, lng } = { lat: this.lastLat, lng: this.lastLng };
    const f = this.formats[this.formatIdx];
    const gcj = wgs84ToGcj02(lat, lng);
    const bd = wgs84ToBd09(lat, lng);

    const row = (sys: string, tagClass: string, clat: number, clng: number) => {
      const val = f.coord(clat, clng);
      return `<div class="mkt-p-row mkt-copy" data-copy="${val}"><span class="mkt-tag ${tagClass}">${sys}</span><span class="mkt-p-val">${val}</span></div>`;
    };

    const datums = computeDatums(lat, lng);
    const dRows = datums.map(d => {
      const val = f.coord(d.lat, d.lng);
      return `<div class="mkt-p-row mkt-copy" data-copy="${val}"><span class="mkt-p-dlbl">${d.label}</span><span class="mkt-p-dval">${val}</span></div>`;
    }).join('');

    const el = this.el.querySelector('.mkt-p-coords');
    if (!el) return;
    el.innerHTML = row('WGS-84', 'mkt-tag-w', lat, lng) +
      row('GCJ-02', 'mkt-tag-g', gcj.lat, gcj.lng) +
      row('BD-09', 'mkt-tag-b', bd.lat, bd.lng) +
      `<div class="mkt-p-row mkt-copy" data-copy="${iso6709(lat, lng)}"><span class="mkt-tag mkt-tag-f">ISO 6709</span><span class="mkt-p-val">${iso6709(lat, lng)}</span></div>` +
      `<div class="mkt-p-row mkt-copy" data-copy="${geoUri(lat, lng)}"><span class="mkt-tag mkt-tag-f">Geo URI</span><span class="mkt-p-val">${geoUri(lat, lng)}</span></div>` +
      `<details class="mkt-p-datums"><summary>其他基准 (${datums.length})</summary>${dRows}</details>`;
  }

  private renderFormatTabs(): void {
    const el = this.el.querySelector('.mkt-p-ftabs');
    if (!el) return;
    el.innerHTML = this.formats.map((f, i) =>
      `<span class="mkt-ftab${i === this.formatIdx ? ' mkt-ftab-on' : ''}" data-idx="${i}">${f.label}</span>`
    ).join('');
    // rebind events
    el.querySelectorAll('.mkt-ftab').forEach(tab => {
      tab.addEventListener('click', () => {
        const idx = parseInt((tab as HTMLElement).dataset.idx!);
        if (idx === this.formatIdx) return;
        const wasOpen = this.el.querySelector('.mkt-p-datums')?.hasAttribute('open');
        this.formatIdx = idx;
        this.renderFormatTabs();
        this.renderCoords();
        this.el.querySelectorAll('.mkt-copy').forEach(el => {
          el.addEventListener('click', () => {
            const val = (el as HTMLElement).dataset.copy;
            if (val) { navigator.clipboard.writeText(val).catch(() => {}); }
          });
        });
        if (wasOpen) this.el.querySelector('.mkt-p-datums')?.setAttribute('open', '');
      });
    });
  }

  private renderSourceSelect(): void {
    const info = this.el.querySelector('.mkt-p-minfo');
    if (!info) return;
    const sel = info.querySelector('.mkt-p-srcsel');
    if (!sel) return;
    const groups: Record<string, any[]> = {};
    presets.forEach(p => (groups[p.group] ??= []).push(p));
    const currentId = presets.find(p => p.label === this.source.name)?.id ?? '';
    sel.innerHTML = Object.entries(groups).map(([g, items]) =>
      `<optgroup label="${g}">${items.map(p =>
        `<option value="${p.id}"${p.id === currentId ? ' selected' : ''}>${p.label}</option>`
      ).join('')}</optgroup>`
    ).join('');
  }

  private renderMapInfo(): void {
    const z = this.getZoom();
    const tile = latLngToTile(this.lastLat, this.lastLng, z);
    const groups: Record<string, any[]> = {};
    presets.forEach(p => (groups[p.group] ??= []).push(p));
    const currentId = presets.find(p => p.label === this.source.name)?.id ?? '';
    const opts = Object.entries(groups).map(([g, items]) =>
      `<optgroup label="${g}">${items.map(p =>
        `<option value="${p.id}"${p.id === currentId ? ' selected' : ''}>${p.label}</option>`
      ).join('')}</optgroup>`
    ).join('');

    const info = this.el.querySelector('.mkt-p-minfo');
    if (!info) return;
    info.innerHTML = `
      <div class="mkt-p-row"><span class="mkt-p-lbl">图源</span><select class="mkt-p-srcsel mkt-srcsel">${opts}</select></div>
      <div class="mkt-p-row"><span class="mkt-p-lbl">缩放</span><span class="mkt-p-val">${z}</span></div>
      <div class="mkt-p-row"><span class="mkt-p-lbl">瓦片</span><span class="mkt-p-val">${tile.z}/${tile.x}/${tile.y}</span></div>
      <div class="mkt-p-row"><span class="mkt-p-lbl">区域</span><span class="mkt-p-val">${isInChina(this.lastLat, this.lastLng) ? '境内' : '境外'}</span></div>`;
    this.renderSourceSelect();
  }

  // ── events ──

  private bindEvents(): void {
    this.el.querySelectorAll('.mkt-copy').forEach(el => {
      el.addEventListener('click', () => {
        const val = (el as HTMLElement).dataset.copy;
        if (val) { navigator.clipboard.writeText(val).catch(() => {}); }
      });
    });
    this.el.querySelector('.mkt-p-srcsel')?.addEventListener('change', (e: any) => {
      if (this.onSourceChange) this.onSourceChange(e.target.value);
    });
  }

  // ── styles ──

  static injectStyles(): void {
    if (document.getElementById('mkt-p-styles')) return;
    const css = document.createElement('style');
    css.id = 'mkt-p-styles';
    css.textContent = `
.mkt-p-row{display:flex;align-items:flex-start;gap:8px;padding:5px 0;font-family:"SF Mono",Menlo,monospace;cursor:pointer;transition:opacity .15s}
.mkt-p-row:hover{opacity:.7}
.mkt-p-lbl{color:#666;min-width:48px;font-size:13px;padding-top:1px;flex-shrink:0}
.mkt-p-val{color:#d4d4d8;font-weight:500;font-size:13px;line-height:1.5}
.mkt-p-dlbl{color:#555;min-width:52px;font-size:12px;font-weight:600;flex-shrink:0}
.mkt-p-dval{color:#999;font-size:12px}
.mkt-p-datums{font-size:13px;margin-top:2px}
.mkt-p-datums summary{color:#555;cursor:pointer;user-select:none;padding:3px 0;font-size:12px}
.mkt-p-datums summary:hover{color:#888}
.mkt-p-datums summary::before{content:'▸';font-size:10px;display:inline-block;margin-right:4px;transition:transform .15s}
.mkt-p-datums[open] summary::before{transform:rotate(90deg)}
.mkt-p-ftabs{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
`;
    document.head.appendChild(css);
  }
}
