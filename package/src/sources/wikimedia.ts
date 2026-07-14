import type { TileSource, TileCoords, TileSourceOptions } from '../types.js';

export class WikimediaSource implements TileSource {
  readonly name = 'Wikimedia';
  readonly coordSystem = 'wgs84' as const;
  readonly maxZoom: number;
  readonly minZoom: number;
  readonly tileSize: number;
  readonly attribution: string;

  constructor(options?: TileSourceOptions) {
    this.maxZoom = options?.maxZoom ?? 18;
    this.minZoom = options?.minZoom ?? 1;
    this.tileSize = options?.tileSize ?? 256;
    this.attribution = options?.attribution ?? '© OpenStreetMap contributors, ODbL';
  }

  getTileUrl({ x, y, z }: TileCoords): string {
    return `https://maps.wikimedia.org/osm-intl/${z}/${x}/${y}.png`;
  }
}
