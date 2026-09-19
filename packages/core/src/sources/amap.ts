import type { TileSource, TileCoords, TileSourceOptions } from '../types.js';

export type AMapStyle = 'base' | 'satellite' | 'road';

const STYLE_MAP: Record<AMapStyle, number> = {
  base: 8,
  satellite: 6,
  road: 7,
};

export interface AMapOptions extends TileSourceOptions {
  style?: AMapStyle;
  lang?: 'zh_cn' | 'en';
}

export class AMapSource implements TileSource {
  readonly name = 'AMap';
  readonly coordSystem = 'gcj02' as const;
  readonly maxZoom: number;
  readonly minZoom: number;
  readonly tileSize: number;
  readonly attribution: string;

  private style: AMapStyle;
  private lang: string;

  constructor(options?: AMapOptions) {
    this.maxZoom = options?.maxZoom ?? 18;
    this.minZoom = options?.minZoom ?? 1;
    this.tileSize = options?.tileSize ?? 256;
    this.attribution = options?.attribution ?? '© 高德地图';
    this.style = options?.style ?? 'base';
    this.lang = options?.lang ?? 'zh_cn';
  }

  getTileUrl({ x, y, z }: TileCoords): string {
    const sub = [1, 2, 3, 4][(x + y) % 4];
    const styleId = STYLE_MAP[this.style];
    const host = this.style === 'satellite' ? `webst0${sub}` : `webrd0${sub}`;
    return `https://${host}.is.autonavi.com/appmaptile?lang=${this.lang}&size=1&scale=1&style=${styleId}&x=${x}&y=${y}&z=${z}`;
  }
}
