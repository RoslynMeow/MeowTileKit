# MeowTileKit

多源地图瓦片切换库，支持 WGS-84 / GCJ-02 坐标系统。

## 使用

```bash
cd package
npm install
npm run build
# 然后双击 demo/index.html 打开
```

或者作为 npm 包引入项目：

```bash
npm install meow-tile-kit
```

```ts
import { createMap, createTileSource, wgs84ToGcj02, gcj02ToWgs84 } from 'meow-tile-kit'
```

## API

### `createMap(container, options)`

创建 Leaflet 地图，自动处理坐标系统。

```ts
const { map, source, toLocal, toWgs84 } = createMap('map', {
  source: 'amap',          // osm | amap | tencent | google | carto | esri | opentopo
  center: [39.9, 116.4],   // WGS-84 坐标
  zoom: 12,
})
```

- `toLocal(lat, lng)` — 将 WGS-84 转为当前图源的坐标系（用于放置标记）
- `toWgs84(lat, lng)` — 转回 WGS-84

### `createTileSource(type, options)`

创建图源实例（不依赖 Leaflet）。

```ts
const src = createTileSource('tencent', { style: 'satellite' })
src.getTileUrl({ x: 100, y: 200, z: 12 })
```

## 可用地图源

| 源 | 坐标系 | 说明 |
|---|---|---|
| OpenStreetMap | WGS-84 | |
| Google Maps | WGS-84 | |
| CartoDB | WGS-84 | light/dark 风格 |
| Esri | WGS-84 | 卫星影像 / 街道图 |
| OpenTopoMap | WGS-84 | 地形图 |
| 高德地图 | GCJ-02 | |
| 腾讯地图 | GCJ-02 | |
