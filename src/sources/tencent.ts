import type { TileSource, TileCoords, TileSourceOptions } from '../types.js';

export interface TencentOptions extends TileSourceOptions {
  style?: 'vector' | 'satellite' | 'road';
}

export class TencentSource implements TileSource {
  readonly name = 'Tencent Maps';
  readonly coordSystem = 'gcj02' as const;
  readonly maxZoom: number;
  readonly minZoom: number;
  readonly tileSize: number;
  readonly attribution: string;

  private style: string;

  constructor(options?: TencentOptions) {
    this.maxZoom = options?.maxZoom ?? 18;
    this.minZoom = options?.minZoom ?? 1;
    this.tileSize = options?.tileSize ?? 256;
    this.attribution = options?.attribution ?? '© 腾讯地图';
    this.style = options?.style ?? 'vector';
  }

  getTileUrl({ x, y, z }: TileCoords): string {
    const sub = [0, 1, 2][(x + y) % 3];

    if (this.style === 'satellite') {
      return `https://p${sub}.map.gtimg.com/sateTiles/${z}/${x}/${y}/${x}x${y}.jpg`;
    }

    return `https://rt${sub}.map.gtimg.com/tile?z=${z}&x=${x}&y=${y}&type=vector&styleid=1`;
  }
}
