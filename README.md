# MeowTileKit

多源地图瓦片切换库，支持 WGS-84 / GCJ-02 坐标系统。

## 使用

```bash
cd package
npm install
npm run build
```

在线 Demo：[https://roslynmeow.github.io/MeowTileKit/](https://roslynmeow.github.io/MeowTileKit/)

也可直接双击 `docs/index.html` 本地打开（需联网加载 Leaflet CDN）。

或者作为 npm 包引入项目：

```bash
npm install meow-tile-kit
```

```ts
import { createMap, createTileSource, wgs84ToGcj02 } from 'meow-tile-kit'

// 一行创建完整地图
const { map, source, toLocal } = createMap('map', {
  source: 'amap',
  marker: true,
  drawer: true,
})
```

## API

### `createMap(container, options)`

创建 Leaflet 地图，自动处理坐标系统。

```ts
const { map, source, toLocal, toWgs84 } = createMap('map', {
  source: 'amap',          // 见下方预设列表，或传入 TileSource 实例
  center: [39.9, 116.4],   // WGS-84 坐标
  zoom: 12,
  marker: true,            // 自动添加可拖拽标记
  drawer: true,            // 右侧抽屉面板显示坐标详情
  maxBounds: [[15,70], [55,140]],  // 可选：限制可视区域
})
```

- `toLocal(lat, lng)` — 将 WGS-84 转为当前图源的坐标系（用于放置标记）
- `toWgs84(lat, lng)` — 转回 WGS-84

双击打开侧边面板，分三个区域：**坐标**（WGS-84 / GCJ-02 / BD-09、ISO 6709、Geo URI、其他基准折叠）、
**测量标准**（格式按钮，每行 5 个）、**地图**（图源切换、缩放、瓦片坐标）。
抽屉宽度自适应内容，最大不超过视口 50%。

可通过 `formats` 选项自定义格式列表：

```ts
import { defaultFormats } from 'meow-tile-kit'
import type { CoordFormat } from 'meow-tile-kit'

const myFormat: CoordFormat = {
  key: 'my',
  label: '自定义',
  coord(lat, lng) { return `${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E`; },
}

createMap('map', {
  source: 'amap',
  formats: [...defaultFormats, myFormat],
})
```

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

### 坐标编码格式

内置 16 种坐标格式，全部作为 `CoordFormat` 实现，可通过 `formats` 选项选择：

| 格式 | 示例 (北京) | 导出名 |
|---|---|---|
| `°` | `39.904200°, 116.407400°` | — |
| `° '` | `39° 54.2520', 116° 24.4440'` | — |
| `° ' "` | `39° 54' 15.120", 116° 24' 26.640"` | — |
| Geohash | `wx4g0bm` | `geohash` |
| Geohash-36 | `wk311w` | `geohash36f` |
| GEOREF | `NKCL7922` | `georef` |
| UTM | `50N 449345 4417292` | `utm` |
| MGRS | `50N PE 49345 17292` | `mgrs` |
| C-squares | `1:30:43:00:34:50` | `csquares` |
| IMW | `N-K-50` | `imw` |
| Marsden | `N12-20 (9°×6°)` | `marsden` |
| QDGC | `N39E116_C` | `qdgc` |
| WMO | `N04-30 (9°×6°)` | `wmo` |
| NAC | `4F5R 6G7H` | `nac` |
| OLC | `8P9C3W6X+6X` | `olc` |
| Mapcode | `B2S8.4X5F` | `mapcode` |

```ts
import { geohash, utm, mgrs } from 'meow-tile-kit'
import type { CoordFormat } from 'meow-tile-kit'

createMap('map', {
  source: 'amap',
  formats: [geohash, utm], // 只显示这两种
})
```

### 坐标基准转换

基于 Helmert 7 参数变换，将 WGS-84 坐标转换到其他大地基准：

```ts
import { wgs84ToNad83, wgs84ToOsgb36, wgs84ToEtrs89 } from 'meow-tile-kit'

const pt = wgs84ToNad83(39.9042, 116.4074)
// { lat: 39.9042xx, lng: 116.4074xx }  (NAD 83 ≈ WGS 84)
```

| 函数 | 基准 | 说明 |
|---|---|---|
| `wgs84ToNad83()` | NAD 83 | 北美（≈WGS 84） |
| `wgs84ToEtrs89()` | ETRS89 | 欧洲（≈WGS 84） |
| `wgs84ToOsgb36()` | OSGB36 | 英国 |
| `wgs84ToEd50()` | ED50 | 欧洲历史 |
| `wgs84ToSad69()` | SAD69 | 南美 |
| `wgs84ToGrs80()` | GRS 80 | 参考椭球 |

格式标准：

```ts
import { iso6709, geoUri } from 'meow-tile-kit'

iso6709(39.9042, 116.4074) // "+39.904200+116.407400/"
geoUri(39.9042, 116.4074)   // "geo:39.904200,116.407400"
```

### 位置持久化

`createMap` 自动将最后点击/拖拽的位置保存到 `localStorage`（key: `mkt-pos`）。
下次打开页面自动恢复上次位置。若既无保存位置也无传入 `center`，则尝试浏览器定位（Geolocation API），
定位失败时默认北京。

```ts
// 强制不走持久化
createMap('map', { center: [39.9, 116.4] }) // 传入 center 则跳过
```

### 独立坐标面板

可将坐标/测量标准/地图信息面板放到页面任意位置：

```ts
import { createMap, CoordPanel } from 'meow-tile-kit'

const app = createMap('map', { source: 'amap', drawer: false })

const panel = new CoordPanel({
  container: '#sidebar',
  source: app.source,
  getZoom: () => app.map.getZoom(),
  onSourceChange: (id) => {
    const src = createTileSource(id)
    // 切换图源逻辑
  },
})

app.map.on('click', (e) => panel.update(e.latlng.lat, e.latlng.lng))
```

面板三栏（坐标 / 测量标准 / 地图），格式切换、其他基准折叠、图源切换、复制全部可用。
默认响应式样式，用户可覆写 CSS。

### 自定义图源

`source` 可以直接传一个 `TileSource` 实例：

```ts
import { AMapSource } from 'meow-tile-kit'

const mySource = new AMapSource({ style: 'satellite', lang: 'en' })
createMap('map', { source: mySource })
```
