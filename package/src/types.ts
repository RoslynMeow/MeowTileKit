export type CoordSystem = 'wgs84' | 'gcj02' | 'bd09' | 'cgcs2000' | 'nad83' | 'etrs89' | 'pz90' | 'itrf';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TileCoords {
  x: number;
  y: number;
  z: number;
}

export interface TileSource {
  readonly name: string;
  readonly coordSystem: CoordSystem;
  readonly maxZoom: number;
  readonly minZoom: number;
  readonly tileSize: number;
  readonly attribution: string;

  getTileUrl(coords: TileCoords): string;
}

export interface TileSourceOptions {
  maxZoom?: number;
  minZoom?: number;
  tileSize?: number;
  attribution?: string;
}
