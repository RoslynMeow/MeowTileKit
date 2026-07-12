import type { TileSource, TileCoords, TileSourceOptions } from '../types.js';

export type MapboxStyle = 'streets' | 'satellite' | 'light' | 'dark' | 'outdoors';

const STYLE_MAP: Record<MapboxStyle, string> = {
  streets: 'mapbox/streets-v12',
  satellite: 'mapbox/satellite-v9',
  light: 'mapbox/light-v11',
  dark: 'mapbox/dark-v11',
  outdoors: 'mapbox/outdoors-v12',
};

export interface MapboxOptions extends TileSourceOptions {
  style?: MapboxStyle;
  token: string;
}

export class MapboxSource implements TileSource {
  readonly name = 'Mapbox';
  readonly coordSystem = 'wgs84' as const;
  readonly maxZoom: number;
  readonly minZoom: number;
  readonly tileSize: number;
  readonly attribution: string;

  private style: MapboxStyle;
  private token: string;

  constructor(options: MapboxOptions) {
    this.maxZoom = options?.maxZoom ?? 22;
    this.minZoom = options?.minZoom ?? 0;
    this.tileSize = options?.tileSize ?? 512;
    this.attribution = options?.attribution ?? '© <a href="https://mapbox.com">Mapbox</a>';
    this.style = options?.style ?? 'streets';
    this.token = options.token;
  }

  getTileUrl({ x, y, z }: TileCoords): string {
    const styleId = STYLE_MAP[this.style];
    return `https://api.mapbox.com/styles/v1/${styleId}/tiles/${this.tileSize === 512 ? 512 : 256}/${z}/${x}/${y}@2x?access_token=${this.token}`;
  }
}
