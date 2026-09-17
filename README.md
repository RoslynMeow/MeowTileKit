# MeowTileKit

多源地图瓦片切换库，支持 WGS-84 / GCJ-02 坐标系统。

## 使用

```bash
cd package
npm install
npm run build
```

在线 Demo：[https://roslynmeow.github.io/MeowTileKit/](https://roslynmeow.github.io/MeowTileKit/)（使用 unpkg 上的已发布版本）。

### 本地开发 Demo

```bash
cd package
npm install
npm run dev
```

`npm run dev` 会先构建，再从 `docs/index.html` 生成一个本地版 Demo 到 `package/demo/`（使用本地 `dist` 而非 CDN），
启动零依赖静态服务器并自动打开 <http://localhost:5173/demo/>；同时以 `tsup --watch` 监听源码变更并增量重新构建（手动刷新页面即可看到效果）。

- `npm run dev:no-watch`：同上，但不启动监听构建。
- `npm start`：只启动服务器，使用已有的 `dist`（不重新构建）。
- 换端口：`PORT=5180 npm run dev`。
- 也可以直接双击 `docs/index.html` 打开，但它走 unpkg 上的已发布版本（需联网加载 Leaflet CDN）。

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
  drawer: true,            // 浮动坐标面板（可拖动）
  panelOpen: true,         // 加载后默认展开面板（默认 true）
  maxBounds: [[15,70], [55,140]],  // 可选：限制可视区域
})
```

- `toLocal(lat, lng)` — 将 WGS-84 转为当前图源的坐标系（用于放置标记）
- `toWgs84(lat, lng)` — 转回 WGS-84
- `app.locate(input, format?, zoom?)` — 解析坐标并定位（见下）
- `app.setSource(id)` / `app.getSourceId()` — 切换 / 读取底图图源
- `app.source` — 当前图源（`TileSource` 实例）
- `app.setPanelExtra(html)` — 在坐标面板里追加自定义 HTML（随面板重绘保留，传 `''` 清除）；`app.openPanel()` 展开面板

浮动面板默认展开，只显示**当前坐标**：顶部大号显示当前格式的坐标（点击复制），下方为格式切换按钮与 WGS-84 / GCJ-02 / BD-09、ISO 6709、Geo URI、其他基准折叠。

面板浮在地图右上角，拖动标题栏可移动位置，位置会被记住；`drawer: false` 可完全关闭，`panelOpen: false` 则默认收起（双击地图打开）。
坐标定位用 `app.locate()`；图源切换用 `app.setSource(id)`（不再在面板内）。

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

### 定位到坐标

把任意测量标准（格式）的坐标解析回 WGS-84，并让地图跳转到该点。

```ts
import { createMap, parseCoord } from 'meow-tile-kit'

const app = createMap('map', { source: 'amap' })

// 方式一：直接调用地图实例的 locate()，自动处理坐标系统并落点
app.locate('wx4g0bm')                    // Geohash
app.locate('50N 449345 4417292')         // UTM
app.locate('8PFRWC34+MX')                // OLC / Plus Code
app.locate('39.9042, 116.4074')          // 十进制度
app.locate('utm:50N 449345 4417292')     // format:value 前缀强制指定格式
app.locate([39.9042, 116.4074])          // [lat, lng]
app.locate([39.9042, 116.4074], undefined, 15) // 第三个参数：定位后的缩放级别

// 方式二：只做解析，返回 { lat, lng } | null
parseCoord('st4f0a')                  // 自动识别格式
parseCoord('50N 449345 4417292', 'utm') // 指定格式
```

`locate(input, format?, zoom?)` 会在一次视图切换中同时完成居中与缩放，避免分步动画导致的中心偏移。

**参数形式**（无需拼字符串，适合程序内部调用）：

```ts
import { parseCoord, decodeCoord } from 'meow-tile-kit'

parseCoord({ lat: 39.9042, lng: 116.4074 })                 // 直接给坐标
parseCoord({ value: 'wx4g0bm' }, 'geohash')                 // 字符串参数
decodeCoord('utm', { zone: 50, hemisphere: 'N', easting: 449345, northing: 4417292 })
```

程序内调用 `parseCoord` / `decodeCoord` / `app.locate` 均可自动识别格式；
也可传 `format` 强制指定，或用 `格式:值` 前缀（如 `utm:50N 449345 4417292`）。

所有内置格式都实现了可逆的 `parse()`，即面板中显示的任何编码都能原样粘回去定位。
网格类格式（IMW / Marsden / WMO / QDGC / C-squares / MGRS）本身精度有限，
会定位到对应网格单元的中心。为避免把普通单词（如 `beijing`）误判成 Geohash，
自动识别时纯字母数字的网格码要求至少包含一个数字，否则请显式指定格式。

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
| Geohash-36 | `st4f0a` | `geohash36f` |
| GEOREF | `PTJL5424` | `georef` |
| UTM | `50N 449345 4417292` | `utm` |
| MGRS | `50S AA 40123 98803` | `mgrs` |
| C-squares | `1:0311:96:94:00:47` | `csquares` |
| IMW | `NJ-50` | `imw` |
| Marsden | `N12-30 (9°×6°)` | `marsden` |
| QDGC | `N39E116_N` | `qdgc` |
| WMO | `N12-30 (9°×6°)` | `wmo` |
| NAC | `QJ9A TZT3` | `nac` |
| OLC | `8PFRWC34+MX` | `olc` |
| Mapcode | `TQ37.JS9K` | `mapcode` |

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
  onLocate: (lat, lng) => {
    // 用户在面板里输入坐标并点击「定位」时触发（WGS-84）
    const p = app.toLocal(lat, lng)
    app.map.setView([p.lat, p.lng], 15)
  },
})

app.map.on('click', (e) => panel.update(e.latlng.lat, e.latlng.lng))
```

面板三栏（定位 / 当前坐标 / 地图），格式切换、其他基准折叠、图源切换、复制、坐标定位全部可用。
默认响应式样式，用户可覆写 CSS。

### 自定义图源

`source` 可以直接传一个 `TileSource` 实例：

```ts
import { AMapSource } from 'meow-tile-kit'

const mySource = new AMapSource({ style: 'satellite', lang: 'en' })
createMap('map', { source: mySource })
```
