import type { TileSource, TileCoords, TileSourceOptions } from '../types.js';

export type GoogleStyle = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';

const STYLE_MAP: Record<GoogleStyle, string> = {
  roadmap: 'm',
  satellite: 's',
  hybrid: 'y',
  terrain: 't',
};

export interface GoogleOptions extends TileSourceOptions {
  style?: GoogleStyle;
  /** Use GCJ-02 coordinate system (for Google Maps China) */
  china?: boolean;
}

export class GoogleSource implements TileSource {
  readonly name = 'Google Maps';
  readonly coordSystem: 'wgs84' | 'gcj02';
  readonly maxZoom: number;
  readonly minZoom: number;
  readonly tileSize: number;
  readonly attribution: string;

  private style: GoogleStyle;

  constructor(options?: GoogleOptions) {
    this.coordSystem = options?.china ? 'gcj02' : 'wgs84';
    this.maxZoom = options?.maxZoom ?? 20;
    this.minZoom = options?.minZoom ?? 0;
    this.tileSize = options?.tileSize ?? 256;
    this.attribution = options?.attribution ?? '© Google';
    this.style = options?.style ?? 'roadmap';
  }

  getTileUrl({ x, y, z }: TileCoords): string {
    const sub = [0, 1, 2, 3][(x + y) % 4];
    const lyrs = STYLE_MAP[this.style];
    return `https://mt${sub}.google.com/vt/lyrs=${lyrs}&x=${x}&y=${y}&z=${z}`;
  }
}
