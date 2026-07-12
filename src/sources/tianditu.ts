import type { TileSource, TileCoords, TileSourceOptions } from '../types.js';

export type TiandituStyle = 'vec' | 'img' | 'cia' | 'ter';

export interface TiandituOptions extends TileSourceOptions {
  style?: TiandituStyle;
  /** 天地图 API key, 从 https://console.tianditu.gov.cn 申请 */
  key: string;
}

export class TiandituSource implements TileSource {
  readonly name = '天地图';
  readonly coordSystem = 'gcj02' as const;
  readonly maxZoom: number;
  readonly minZoom: number;
  readonly tileSize: number;
  readonly attribution: string;

  private style: TiandituStyle;
  private key: string;

  constructor(options: TiandituOptions) {
    this.maxZoom = options?.maxZoom ?? 18;
    this.minZoom = options?.minZoom ?? 1;
    this.tileSize = options?.tileSize ?? 256;
    this.attribution = options?.attribution ?? '© 天地图';
    this.style = options?.style ?? 'vec';
    this.key = options.key;
  }

  getTileUrl({ x, y, z }: TileCoords): string {
    const sub = [0, 1, 2, 3, 4, 5, 6, 7][(x + y) % 8];
    const type = this.style === 'vec' ? 'vec_w'
      : this.style === 'img' ? 'img_w'
      : this.style === 'cia' ? 'cia_w'
      : 'ter_w';
    return `https://t${sub}.tianditu.gov.cn/DataServer?T=${type}&x=${x}&y=${y}&l=${z}&tk=${this.key}`;
  }
}
