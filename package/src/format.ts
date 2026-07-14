export interface CoordFormat {
  key: string;
  label: string;
  formatLat(lng: number): string;
  formatLng(lng: number): string;
  coord(lat: number, lng: number): string;
}

const dd: CoordFormat = {
  key: 'dd',
  label: '度',
  formatLat(v: number) { return v.toFixed(6) + '°'; },
  formatLng(v: number) { return v.toFixed(6) + '°'; },
  coord(lat: number, lng: number) { return `${this.formatLat(lat)}, ${this.formatLng(lng)}`; },
};

const dm: CoordFormat = {
  key: 'dm',
  label: '度分',
  formatLat(v: number) {
    const d = Math.trunc(v);
    const m = Math.abs(v - d) * 60;
    return `${d}° ${m.toFixed(4)}'`;
  },
  formatLng(v: number) {
    const d = Math.trunc(v);
    const m = Math.abs(v - d) * 60;
    return `${d}° ${m.toFixed(4)}'`;
  },
  coord(lat: number, lng: number) { return `${this.formatLat(lat)}, ${this.formatLng(lng)}`; },
};

const dms: CoordFormat = {
  key: 'dms',
  label: '度分秒',
  formatLat(v: number) {
    const d = Math.trunc(v);
    const rest = Math.abs(v - d) * 60;
    const m = Math.trunc(rest);
    const s = (rest - m) * 60;
    return `${d}° ${m}' ${s.toFixed(3)}"`;
  },
  formatLng(v: number) {
    const d = Math.trunc(v);
    const rest = Math.abs(v - d) * 60;
    const m = Math.trunc(rest);
    const s = (rest - m) * 60;
    return `${d}° ${m}' ${s.toFixed(3)}"`;
  },
  coord(lat: number, lng: number) { return `${this.formatLat(lat)}, ${this.formatLng(lng)}`; },
};

export const defaultFormats: CoordFormat[] = [dd, dm, dms];
