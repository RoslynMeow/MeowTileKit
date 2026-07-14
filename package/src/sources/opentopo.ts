import type { TileSource, TileCoords, TileSourceOptions } from '../types.js';

export interface OpenTopoOptions extends TileSourceOptions {}

export class OpenTopoSource implements TileSource {
  readonly name = 'OpenTopoMap';
  readonly coordSystem = 'wgs84' as const;
  readonly maxZoom: number;
  readonly minZoom: number;
  readonly tileSize: number;
  readonly attribution: string;

  constructor(options?: OpenTopoOptions) {
    this.maxZoom = options?.maxZoom ?? 17;
    this.minZoom = options?.minZoom ?? 0;
    this.tileSize = options?.tileSize ?? 256;
    this.attribution = options?.attribution ?? '© <a href="https://opentopomap.org">OpenTopoMap</a> contributors';
  }

  getTileUrl({ x, y, z }: TileCoords): string {
    const sub = ['a', 'b', 'c'][(x + y) % 3];
    return `https://${sub}.tile.opentopomap.org/${z}/${x}/${y}.png`;
  }
}
