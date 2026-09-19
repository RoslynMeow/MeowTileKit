// ── Ellipsoid definitions ──
interface Ellipsoid {
  a: number;  // semi-major axis (m)
  f: number;  // flattening (1/f)
}

const WGS84_ELLIPSOID: Ellipsoid = { a: 6378137, f: 1 / 298.257223563 };
const GRS80_ELLIPSOID: Ellipsoid = { a: 6378137, f: 1 / 298.257222101 };
const AIRY1830: Ellipsoid = { a: 6377563.396, f: 1 / 299.3249646 };
const INT1924: Ellipsoid = { a: 6378388, f: 1 / 297 };
const GRS67: Ellipsoid = { a: 6378160, f: 1 / 298.25 };

interface HelmertParams {
  dx: number; dy: number; dz: number;    // meters
  rx: number; ry: number; rz: number;    // arcseconds
  s: number;                              // ppm
}

// ── Geographic ↔ Geocentric ──
function e2(e: Ellipsoid): number {
  return 2 * e.f - e.f * e.f;
}

function geoToGeoc(lat: number, lng: number, h: number, ell: Ellipsoid): [number, number, number] {
  const phi = lat * Math.PI / 180;
  const lam = lng * Math.PI / 180;
  const sinP = Math.sin(phi);
  const N = ell.a / Math.sqrt(1 - e2(ell) * sinP * sinP);
  const X = (N + h) * Math.cos(phi) * Math.cos(lam);
  const Y = (N + h) * Math.cos(phi) * Math.sin(lam);
  const Z = (N * (1 - e2(ell)) + h) * sinP;
  return [X, Y, Z];
}

function geocToGeo(X: number, Y: number, Z: number, ell: Ellipsoid, tol = 1e-9): [number, number, number] {
  const ep = Math.sqrt(e2(ell) / (1 - e2(ell)));
  const p = Math.sqrt(X * X + Y * Y);
  const th = Math.atan2(Z * ell.a, p * ell.a * (1 - e2(ell)));
  let phi: number, N: number, h: number;
  let prev = Infinity;
  do {
    phi = Math.atan2(Z + ep * ep * ell.a * Math.pow(Math.sin(th), 3), p - e2(ell) * ell.a * Math.pow(Math.cos(th), 3));
    N = ell.a / Math.sqrt(1 - e2(ell) * Math.sin(phi) * Math.sin(phi));
    h = p / Math.cos(phi) - N;
    if (Math.abs(phi - prev) < tol) break;
    prev = phi;
  } while (true);
  const lam = Math.atan2(Y, X);
  return [phi * 180 / Math.PI, lam * 180 / Math.PI, h];
}

function helmertForward(X: number, Y: number, Z: number, p: HelmertParams): [number, number, number] {
  const rxA = p.rx / 3600 * Math.PI / 180;
  const ryA = p.ry / 3600 * Math.PI / 180;
  const rzA = p.rz / 3600 * Math.PI / 180;
  const scale = 1 + p.s * 1e-6;
  const X2 = p.dx + scale * (X + rzA * Y - ryA * Z);
  const Y2 = p.dy + scale * (-rzA * X + Y + rxA * Z);
  const Z2 = p.dz + scale * (ryA * X - rxA * Y + Z);
  return [X2, Y2, Z2];
}

// ── Datum definitions ──
// All parameters are WGS84 → datum (position vector convention, EPSG:9606)
interface DatumDef {
  name: string;
  ellipsoid: Ellipsoid;
  helmert: HelmertParams;
}

const DATUMS: Record<string, DatumDef> = {
  nad83: {
    name: 'NAD 83',
    ellipsoid: GRS80_ELLIPSOID,
    helmert: { dx: -0.991, dy: -1.907, dz: -0.513, rx: 0.025915, ry: 0.009426, rz: 0.011599, s: 0.00062 },
  },
  etrs89: {
    name: 'ETRS89',
    ellipsoid: GRS80_ELLIPSOID,
    helmert: { dx: 0, dy: 0, dz: 0, rx: 0, ry: 0, rz: 0, s: 0 },
  },
  osgb36: {
    name: 'OSGB36',
    ellipsoid: AIRY1830,
    helmert: { dx: -446.448, dy: 125.157, dz: -542.060, rx: 0.1502, ry: 0.2470, rz: 0.8421, s: -20.4894 },
  },
  ed50: {
    name: 'ED50',
    ellipsoid: INT1924,
    helmert: { dx: -89.5, dy: -93.8, dz: -123.1, rx: 0, ry: 0, rz: 0.156, s: -1.2 },
  },
  sad69: {
    name: 'SAD69',
    ellipsoid: GRS67,
    helmert: { dx: -57, dy: 1, dz: -41, rx: 0, ry: 0, rz: 0, s: 0 },
  },
  grs80: {
    name: 'GRS 80',
    ellipsoid: GRS80_ELLIPSOID,
    helmert: { dx: 0, dy: 0, dz: 0, rx: 0, ry: 0, rz: 0, s: 0 },
  },
};

// ── Public conversion ──
export function wgs84ToDatum(lat: number, lng: number, key: string): { lat: number; lng: number } {
  const d = DATUMS[key];
  if (!d) return { lat, lng };
  const [X, Y, Z] = geoToGeoc(lat, lng, 0, WGS84_ELLIPSOID);
  const [X2, Y2, Z2] = helmertForward(X, Y, Z, d.helmert);
  const [lat2, lng2] = geocToGeo(X2, Y2, Z2, d.ellipsoid);
  return { lat: lat2, lng: lng2 };
}

export function wgs84ToNad83(lat: number, lng: number) { return wgs84ToDatum(lat, lng, 'nad83'); }
export function wgs84ToEtrs89(lat: number, lng: number) { return wgs84ToDatum(lat, lng, 'etrs89'); }
export function wgs84ToOsgb36(lat: number, lng: number) { return wgs84ToDatum(lat, lng, 'osgb36'); }
export function wgs84ToEd50(lat: number, lng: number) { return wgs84ToDatum(lat, lng, 'ed50'); }
export function wgs84ToSad69(lat: number, lng: number) { return wgs84ToDatum(lat, lng, 'sad69'); }
export function wgs84ToGrs80(lat: number, lng: number) { return wgs84ToDatum(lat, lng, 'grs80'); }

// ── Format-only helpers (ISO 6709, Geo URI) ──
export function iso6709(lat: number, lng: number): string {
  const latStr = (lat >= 0 ? '+' : '') + lat.toFixed(6);
  const lngStr = (lng >= 0 ? '+' : '') + lng.toFixed(6);
  return latStr + lngStr + '/';
}

export function geoUri(lat: number, lng: number): string {
  return `geo:${lat.toFixed(6)},${lng.toFixed(6)}`;
}

// ── For drawer rendering ──
export interface DatumResult {
  key: string;
  label: string;
  lat: number;
  lng: number;
}

export function computeDatums(lat: number, lng: number): DatumResult[] {
  const keys = ['nad83', 'etrs89', 'osgb36', 'ed50', 'sad69', 'grs80'];
  return keys.map(k => {
    const r = wgs84ToDatum(lat, lng, k);
    return { key: k, label: DATUMS[k].name, lat: r.lat, lng: r.lng };
  });
}
