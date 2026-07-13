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
  source: 'amap',          // 见下方预设列表，或传入 TileSource 实例
  center: [39.9, 116.4],   // WGS-84 坐标
  zoom: 12,
  maxBounds: [[15,70], [55,140]],  // 可选：限制可视区域
})
```

- `toLocal(lat, lng)` — 将 WGS-84 转为当前图源的坐标系（用于放置标记）
- `toWgs84(lat, lng)` — 转回 WGS-84

### `createTileSource(type, options)`

创建图源实例（不依赖 Leaflet）。

```ts
const src = createTileSource('tencent')          // 使用预设 ID
const src = createTileSource('amap', { style: 'satellite' })  // 带选项
src.getTileUrl({ x: 100, y: 200, z: 12 })
```

### 预设列表

可用 `presets` 数组获取所有预设（可用于生成 UI 下拉菜单）：

```ts
import { presets } from 'meow-tile-kit'
// presets 包含 id / label / coordSystem / group / create()
```

所有预设一览：

| 预设 ID | 标签 | 组 |
|---|---|---|
| `osm` | OpenStreetMap | WGS-84 |
| `google` | Google 地图 | WGS-84 |
| `google-sat` | Google 卫星图 | WGS-84 |
| `google-hyb` | Google 混合图 | WGS-84 |
| `google-terr` | Google 地形图 | WGS-84 |
| `carto` | CartoDB 亮色 | WGS-84 |
| `carto-dark` | CartoDB 暗色 | WGS-84 |
| `carto-voy` | CartoDB 彩色 | WGS-84 |
| `esri` | Esri 街道图 | WGS-84 |
| `esri-sat` | Esri 卫星图 | WGS-84 |
| `opentopo` | OpenTopoMap 地形图 | WGS-84 |
| `wikimedia` | Wikimedia 地图 | WGS-84 |
| `amap` | 高德地图 | GCJ-02 |
| `amap-sat` | 高德卫星图 | GCJ-02 |
| `amap-road` | 高德路网图 | GCJ-02 |
| `tencent` | 腾讯地图 | GCJ-02 |
| `tencent-sat` | 腾讯卫星图 | GCJ-02 |
| `tencent-road` | 腾讯路网图 | GCJ-02 |

### 自定义图源

`source` 可以直接传一个 `TileSource` 实例：

```ts
import { AMapSource } from 'meow-tile-kit'

const mySource = new AMapSource({ style: 'satellite', lang: 'en' })
createMap('map', { source: mySource })
```
