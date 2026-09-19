import type { TileSource, TileCoords, TileSourceOptions } from '../types.js';

export interface OSMOptions extends TileSourceOptions {}

export class OSMSource implements TileSource {
  readonly name = 'OpenStreetMap';
  readonly coordSystem = 'wgs84' as const;
  readonly maxZoom: number;
  readonly minZoom: number;
  readonly tileSize: number;
  readonly attribution: string;

  constructor(options?: OSMOptions) {
    this.maxZoom = options?.maxZoom ?? 19;
    this.minZoom = options?.minZoom ?? 0;
    this.tileSize = options?.tileSize ?? 256;
    this.attribution = options?.attribution ?? '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  }

  getTileUrl({ x, y, z }: TileCoords): string {
    const sub = ['a', 'b', 'c'][(x + y) % 3];
    return `https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  }
}
