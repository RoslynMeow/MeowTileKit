import type { TileSource } from './types.js';
import { wgs84ToGcj02, wgs84ToBd09, isInChina } from './coord.js';
import { latLngToTile } from './projection.js';
import { defaultFormats, extraFormats, parseCoord } from './format.js';
import type { CoordFormat } from './format.js';
import { computeDatums, iso6709, geoUri } from './datums.js';
import { presets } from './presets.js';

export interface CoordPanelOptions {
  container: string | HTMLElement;
  source: TileSource;
  getZoom?: () => number;
  formats?: CoordFormat[];
  onSourceChange?: (id: string) => void;
  /** 定位成功回调（WGS-84 坐标） */
  onLocate?: (lat: number, lng: number) => void;
  /** 定位输入框可选的格式列表 */
  locateFormats?: CoordFormat[];
}

export class CoordPanel {
  readonly el: HTMLElement;
  private source: TileSource;
  private getZoom: () => number;
  private formats: CoordFormat[];
  private formatIdx = 0;
  private onSourceChange?: (id: string) => void;
  private onLocate?: (lat: number, lng: number) => void;
  private locateFormats: CoordFormat[];
  private locateFmtKey = 'auto';
  private locateHelpOpen = false;
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
    this.onLocate = options.onLocate;
    this.locateFormats = options.locateFormats ?? [...defaultFormats, ...extraFormats];

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
      <div class="mkt-box"><div class="mkt-box-title">定位<button class="mkt-help-btn" type="button" title="帮助">?</button></div>
        <div class="mkt-locate">
          <div class="mkt-locate-row">
            <select class="mkt-locate-fmt"></select>
            <input class="mkt-locate-input" placeholder="粘贴或输入坐标…" />
          </div>
          <button class="mkt-locate-btn" type="button">定位到该点</button>
          <div class="mkt-help"${this.locateHelpOpen ? '' : ' hidden'}>
            <div>自动识别以下格式，也可用 <code>格式:值</code> 前缀强制指定：</div>
            <div><code>39.9,116.4</code> 十进制度 · <code>39° 54' 15.1"</code> 度分秒</div>
            <div><code>wx4g0bm</code> Geohash · <code>8PFRWC34+MX</code> OLC</div>
            <div><code>50N 449345 4417292</code> UTM · <code>50S AA 40123 98803</code> MGRS</div>
            <div><code>geo:39.9,116.4</code> Geo URI · <code>+39.9+116.4/</code> ISO 6709</div>
            <div>参数形式 <code>{"format":"utm","zone":50,"hemisphere":"N","easting":449345,"northing":4417292}</code></div>
          </div>
        </div>
      </div>
      <div class="mkt-box"><div class="mkt-box-title">当前坐标</div>
        <div class="mkt-hero mkt-copy" title="点击复制"><span class="mkt-hero-val mkt-p-hero"></span><span class="mkt-hero-cp">复制</span></div>
        <div class="mkt-ftabs mkt-p-ftabs"></div>
        <div class="mkt-p-coords"></div>
      </div>
      <div class="mkt-box"><div class="mkt-box-title">地图</div>
        <div class="mkt-p-minfo"></div>
      </div>`;
    this.renderLocateOptions();
    this.renderCoords();
    this.renderFormatTabs();
    this.renderMapInfo();
  }

  private renderLocateOptions(): void {
    const sel = this.el.querySelector('.mkt-locate-fmt') as HTMLSelectElement | null;
    if (!sel) return;
    sel.innerHTML = `<option value="auto">自动识别</option>` +
      this.locateFormats.map(f => `<option value="${f.key}">${f.label}</option>`).join('');
    sel.value = this.locateFmtKey;
  }

  private submitLocate(): void {
    const input = this.el.querySelector('.mkt-locate-input') as HTMLInputElement | null;
    const sel = this.el.querySelector('.mkt-locate-fmt') as HTMLSelectElement | null;
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    this.locateFmtKey = sel?.value ?? 'auto';
    const r = parseCoord(val, this.locateFmtKey === 'auto' ? undefined : this.locateFmtKey);
    if (!r) {
      input.classList.add('mkt-err');
      setTimeout(() => input.classList.remove('mkt-err'), 1200);
      return;
    }
    this.onLocate?.(r.lat, r.lng);
    this.update(r.lat, r.lng);
  }

  private renderCoords(): void {
    const lat = this.lastLat;
    const lng = this.lastLng;
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

    const hero = this.el.querySelector('.mkt-p-hero') as HTMLElement | null;
    if (hero) {
      const val = f.coord(lat, lng);
      hero.textContent = val;
      const box = hero.parentElement;
      if (box) box.dataset.copy = val;
    }

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
      <div class="mkt-stats">
        <div class="mkt-stat"><span class="mkt-stat-k">缩放</span><span class="mkt-stat-v">${z}</span></div>
        <div class="mkt-stat"><span class="mkt-stat-k">瓦片</span><span class="mkt-stat-v">${tile.z}/${tile.x}/${tile.y}</span></div>
        <div class="mkt-stat"><span class="mkt-stat-k">区域</span><span class="mkt-stat-v">${isInChina(this.lastLat, this.lastLng) ? '境内' : '境外'}</span></div>
      </div>`;
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
    this.el.querySelector('.mkt-locate-btn')?.addEventListener('click', () => this.submitLocate());
    this.el.querySelector('.mkt-locate-input')?.addEventListener('keydown', (e: any) => {
      if (e.key === 'Enter') { e.preventDefault(); this.submitLocate(); }
    });
    this.el.querySelector('.mkt-locate-fmt')?.addEventListener('change', (e: any) => {
      this.locateFmtKey = e.target.value;
    });
    const helpBtn = this.el.querySelector('.mkt-help-btn');
    const helpBox = this.el.querySelector('.mkt-help');
    helpBtn?.addEventListener('click', () => {
      this.locateHelpOpen = !this.locateHelpOpen;
      helpBox?.toggleAttribute('hidden', !this.locateHelpOpen);
      helpBtn.classList.toggle('on', this.locateHelpOpen);
    });
  }

  // ── styles ──

  static injectStyles(): void {
    if (document.getElementById('mkt-p-styles')) return;
    const css = document.createElement('style');
    css.id = 'mkt-p-styles';
    css.textContent = `
.mkt-box{border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px 14px;margin-bottom:14px;background:rgba(255,255,255,.018);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans SC",sans-serif;transition:border-color .2s}
.mkt-box:hover{border-color:rgba(255,255,255,.12)}
.mkt-box-title{font-size:11px;color:#6a6a80;text-transform:uppercase;letter-spacing:1.2px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.mkt-box-title::before{content:'';width:3px;height:11px;border-radius:2px;background:linear-gradient(180deg,#8b7bff,#4a9eff)}
.mkt-p-row{display:flex;align-items:flex-start;gap:8px;padding:6px 8px;margin:0 -8px;border-radius:7px;font-family:"SF Mono",ui-monospace,Menlo,monospace;cursor:pointer;transition:background .15s}
.mkt-p-row:hover{background:rgba(255,255,255,.05)}
.mkt-p-lbl{color:#6a6a80;min-width:48px;font-size:12px;padding-top:1px;flex-shrink:0}
.mkt-p-val{color:#e2e2ea;font-weight:500;font-size:13px;line-height:1.5;word-break:break-all}
.mkt-p-dlbl{color:#6a6a80;min-width:52px;font-size:12px;font-weight:600;flex-shrink:0}
.mkt-p-dval{color:#9a9aad;font-size:12px}
.mkt-p-datums{font-size:13px;margin-top:6px;border-top:1px dashed rgba(255,255,255,.08);padding-top:4px}
.mkt-p-datums summary{color:#6a6a80;cursor:pointer;user-select:none;padding:5px 0;font-size:12px;transition:color .15s}
.mkt-p-datums summary:hover{color:#a9a9bd}
.mkt-p-datums summary::before{content:'▸';font-size:10px;display:inline-block;margin-right:6px;transition:transform .18s}
.mkt-p-datums[open] summary::before{transform:rotate(90deg)}
.mkt-p-ftabs{display:grid;grid-template-columns:repeat(auto-fill,minmax(56px,1fr));gap:5px;margin-bottom:4px}
.mkt-locate{display:flex;flex-direction:column;gap:8px}
.mkt-locate-row{display:flex;gap:8px}
.mkt-locate-fmt{background:rgba(255,255,255,.04);color:#c8c8d4;border:1px solid rgba(255,255,255,.09);border-radius:9px;padding:8px;font-size:12px;outline:none;cursor:pointer;max-width:120px;flex-shrink:0}
.mkt-locate-fmt:hover,.mkt-locate-fmt:focus{border-color:rgba(74,158,255,.5)}
.mkt-locate-input{flex:1;min-width:0;background:rgba(255,255,255,.04);color:#e6e6f0;border:1px solid rgba(255,255,255,.09);border-radius:9px;padding:9px 12px;font-size:13px;font-family:"SF Mono",ui-monospace,Menlo,monospace;outline:none;transition:border-color .15s,background .15s}
.mkt-locate-input::placeholder{color:#5a5a70}
.mkt-locate-input:focus{border-color:rgba(74,158,255,.65);background:rgba(74,158,255,.06)}
.mkt-locate-input.mkt-err{border-color:rgba(255,90,90,.7);animation:mkt-shake .3s}
@keyframes mkt-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.mkt-locate-btn{background:linear-gradient(120deg,#6c5ce7,#4a9eff);color:#fff;border:none;border-radius:9px;padding:9px 14px;font-size:13px;font-weight:600;cursor:pointer;transition:filter .15s,transform .1s}
.mkt-locate-btn:hover{filter:brightness(1.12)}
.mkt-locate-btn:active{transform:scale(.98)}
.mkt-help-btn{margin-left:auto;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#8a8a99;width:20px;height:20px;border-radius:50%;font-size:11px;font-weight:700;cursor:pointer;line-height:1;padding:0;transition:all .15s;text-transform:none}
.mkt-help-btn:hover{color:#fff;border-color:rgba(74,158,255,.5)}
.mkt-help-btn.on{color:#8fc0ff;border-color:rgba(74,158,255,.5);background:rgba(74,158,255,.14)}
.mkt-help{margin-top:8px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);font-size:11.5px;color:#a9a9bd;line-height:2}
.mkt-help[hidden]{display:none}
.mkt-help code{color:#8b9dd4;font-family:"SF Mono",ui-monospace,Menlo,monospace;background:rgba(255,255,255,.05);padding:1px 5px;border-radius:4px;white-space:nowrap}
.mkt-ftab{font-size:12px;color:#7a7a90;padding:6px 4px;cursor:pointer;border-radius:8px;transition:all .15s;user-select:none;text-align:center;border:1px solid transparent;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mkt-ftab:hover{color:#e2e2ea;background:rgba(255,255,255,.06)}
.mkt-ftab-on{color:#8fc0ff;background:rgba(74,158,255,.14);border-color:rgba(74,158,255,.3);font-weight:600}
.mkt-tag{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;flex-shrink:0;margin-top:1px}
.mkt-tag-w{background:rgba(46,204,113,.14);color:#5fd68c}
.mkt-tag-f{background:rgba(139,123,255,.16);color:#a99cff}
.mkt-tag-g{background:rgba(240,173,78,.14);color:#f0ad4e}
.mkt-tag-b{background:rgba(187,134,252,.16);color:#c49bff}
.mkt-hero{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:12px;background:linear-gradient(120deg,rgba(108,92,231,.2),rgba(74,158,255,.1) 70%,transparent);border:1px solid rgba(139,123,255,.3);margin-bottom:10px;cursor:pointer;transition:filter .15s,border-color .15s}
.mkt-hero:hover{filter:brightness(1.12);border-color:rgba(139,123,255,.5)}
.mkt-hero-val{font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:15px;font-weight:600;color:#ececff;word-break:break-all;line-height:1.4}
.mkt-hero-cp{font-size:11px;color:#b3a7ff;flex-shrink:0;border:1px solid rgba(139,123,255,.35);border-radius:6px;padding:2px 7px;background:rgba(139,123,255,.08)}
.mkt-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
.mkt-stat{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06);border-radius:9px;padding:7px 9px;display:flex;flex-direction:column;gap:2px;min-width:0}
.mkt-stat-k{font-size:10px;color:#6a6a80;text-transform:uppercase;letter-spacing:.6px}
.mkt-stat-v{font-size:12px;color:#e2e2ea;font-family:"SF Mono",ui-monospace,Menlo,monospace;word-break:break-all}
`;
    document.head.appendChild(css);
  }
}
