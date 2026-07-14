import type { TileSource, TileCoords, TileSourceOptions } from '../types.js';

export type CartoStyle = 'light' | 'dark' | 'voyager';

const STYLE_MAP: Record<CartoStyle, string> = {
  light: 'light_all',
  dark: 'dark_all',
  voyager: 'rastertiles/voyager',
};

export interface CartoOptions extends TileSourceOptions {
  style?: CartoStyle;
}

export class CartoSource implements TileSource {
  readonly name = 'CartoDB';
  readonly coordSystem = 'wgs84' as const;
  readonly maxZoom: number;
  readonly minZoom: number;
  readonly tileSize: number;
  readonly attribution: string;

  private style: CartoStyle;

  constructor(options?: CartoOptions) {
    this.maxZoom = options?.maxZoom ?? 20;
    this.minZoom = options?.minZoom ?? 0;
    this.tileSize = options?.tileSize ?? 256;
    this.attribution = options?.attribution ?? '© <a href="https://carto.com/">CARTO</a>';
    this.style = options?.style ?? 'light';
  }

  getTileUrl({ x, y, z }: TileCoords): string {
    const sub = ['a', 'b', 'c', 'd'][(x + y) % 4];
    const styleId = STYLE_MAP[this.style];
    return `https://${sub}.basemaps.cartocdn.com/${styleId}/${z}/${x}/${y}.png`;
  }
}
