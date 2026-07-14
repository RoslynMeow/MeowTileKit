import type { TileSource, TileCoords, TileSourceOptions } from '../types.js';

export type EsriStyle = 'world-imagery' | 'world-street';

const STYLE_MAP: Record<EsriStyle, string> = {
  'world-imagery': 'World_Imagery',
  'world-street': 'World_Street_Map',
};

export interface EsriOptions extends TileSourceOptions {
  style?: EsriStyle;
}

export class EsriSource implements TileSource {
  readonly name = 'Esri';
  readonly coordSystem = 'wgs84' as const;
  readonly maxZoom: number;
  readonly minZoom: number;
  readonly tileSize: number;
  readonly attribution: string;

  private style: EsriStyle;

  constructor(options?: EsriOptions) {
    this.maxZoom = options?.maxZoom ?? 18;
    this.minZoom = options?.minZoom ?? 0;
    this.tileSize = options?.tileSize ?? 256;
    this.attribution = options?.attribution ?? '© <a href="https://www.esri.com/">Esri</a>';
    this.style = options?.style ?? 'world-imagery';
  }

  getTileUrl({ x, y, z }: TileCoords): string {
    const styleId = STYLE_MAP[this.style];
    return `https://server.arcgisonline.com/ArcGIS/rest/services/${styleId}/MapServer/tile/${z}/${y}/${x}`;
  }
}
