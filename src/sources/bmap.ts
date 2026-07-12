import type { TileSource, TileCoords, TileSourceOptions } from '../types.js';
import { bdLatLngToTile } from '../projection-baidu.js';

export interface BMapOptions extends TileSourceOptions {}

export class BMapSource implements TileSource {
  readonly name = 'Baidu Maps';
  readonly coordSystem = 'bd09' as const;
  readonly maxZoom: number;
  readonly minZoom: number;
  readonly tileSize: number;
  readonly attribution: string;

  constructor(options?: BMapOptions) {
    this.maxZoom = options?.maxZoom ?? 18;
    this.minZoom = options?.minZoom ?? 3;
    this.tileSize = options?.tileSize ?? 256;
    this.attribution = options?.attribution ?? '© 百度地图';
  }

  getTileUrl({ x, y, z }: TileCoords): string {
    const sub = [0, 1, 2, 3][(x + y) % 4];
    return `http://online${sub}.map.bdimg.com/onlinelabel/?qt=tile&x=${x}&y=${y}&z=${z}&styles=pl&scaler=1&p=1`;
  }

  /** Baidu uses a different Mercator projection — use this to compute tile coords from BD-09 lat/lng */
  latLngToTile(lat: number, lng: number, zoom: number): TileCoords {
    return bdLatLngToTile(lat, lng, zoom);
  }
}
