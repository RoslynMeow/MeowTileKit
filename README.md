# MeowTileKit

[![npm version](https://img.shields.io/npm/v/meow-tile-kit?logo=npm&label=npm)](https://www.npmjs.com/package/meow-tile-kit)
[![npm downloads](https://img.shields.io/npm/dm/meow-tile-kit)](https://www.npmjs.com/package/meow-tile-kit)
[![Publish to GitHub Packages](https://github.com/RoslynMeow/MeowTileKit/actions/workflows/publish-github.yml/badge.svg)](https://github.com/RoslynMeow/MeowTileKit/actions/workflows/publish-github.yml)
[![Release](https://github.com/RoslynMeow/MeowTileKit/actions/workflows/release.yml/badge.svg)](https://github.com/RoslynMeow/MeowTileKit/actions/workflows/release.yml)
[![License](https://img.shields.io/npm/l/meow-tile-kit)](https://www.npmjs.com/package/meow-tile-kit)

多源地图瓦片切换库，支持 WGS-84 / GCJ-02 坐标系统。

## 包结构（monorepo）

| 目录 | 包 | 说明 |
| --- | --- | --- |
| `packages/core` | `meow-tile-kit-core` | 底层：坐标转换/格式编解码/基准/投影/图源，**无 DOM、无 Leaflet** |
| `packages/ui` | `meow-tile-kit-ui` | 前端：`createMap` / `CoordPanel` / `<mkt-*>` 元素 |
| `packages/meta` | `meow-tile-kit` | 伞包：core + ui（含 `/core`、`/elements` 子入口） |

`docs/` 在线 Demo · `tests/` 单元测试 · `examples/` 示例页。

### 当前版本

| 包 | 版本 |
| --- | --- |
| `meow-tile-kit-core` | 1.0.0 |
| `meow-tile-kit-ui` | 1.0.0 |
| `meow-tile-kit` | 1.1.0 |

> 每次发版更新此表。GitHub Release 由 CI **按日期**自动创建（tag 也是日期，如 `2026.09.19`），无需手动打标签。

## 安装

```bash
npm install meow-tile-kit         # 全都有（core + ui），最常用
npm install meow-tile-kit-ui      # 只要界面（会自动带上 core）
npm install meow-tile-kit-core    # 只要数据/坐标（Node 可直接用）
```

### 本地开发（repo 根）

```bash
npm install
npm run build       # 依次构建 core → ui → meta
npm test            # vitest（core 单元测试 + 元素/DOM 测试）
npm run typecheck   # 各包 tsc 类型检查
npm run dev         # 构建 + 生成 demo + 启动本地静态服务器
```

- `npm run dev` 会从 `docs/index.html` 生成本地版 Demo 到 `demo/`（用本地构建而非 CDN），并打开 <http://localhost:5173/demo/>；元素示例在 <http://localhost:5173/examples/elements.html>。
- `npm start`：只启动服务器（需先 build）。
- 换端口：`PORT=5180 npm run dev`。
- 在线 Demo：[https://roslynmeow.github.io/MeowTileKit/](https://roslynmeow.github.io/MeowTileKit/)（unpkg 上的已发布版本）。

### 发布

- **npm**：仓库根 `publish.bat`（Windows），只负责发布到 npm。

  ```bat
  publish.bat
  ```

  流程：构建全部 → 检查 `npm whoami` 登录 → 依次 `npm publish`（core → ui → meta）。版本号在各包的 `package.json` 里手动修改。

- **GitHub Packages**：**无需 tag**。合并到 `main` 后，`Publish to GitHub Packages` workflow 会逐个读取各包 `package.json` 的版本，
  若该版本在 GitHub Packages 尚不存在，就以 `@roslynmeow/<pkg>` 发布；已存在的自动跳过（也可在 Actions 页手动触发）。

- **GitHub Release**：合并到 `main` 后，**仅当任一包 `package.json` 的版本号发生变化时**才创建（`Release` workflow），
  **按日期**命名（tag 也用日期，如 `2026.09.19`），正文含三个包的版本与自动变更说明；同一天多次发版会加后缀 `-2`、`-3`。
  纯文档/代码合并（版本号没变）不会产生 Release。包版本号同时记录在 README「当前版本」表里。

> 所以：发 npm 用 `publish.bat`；发 GitHub Packages / 建 Release 只需把改好版本号的提交合并到 `main`。

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

## 三个包 / 入口

| 包 | 入口 | 依赖 | 内容 |
| --- | --- | --- | --- |
| `meow-tile-kit-core` | `.` | **无** | 坐标转换、格式编解码、大地基准、投影、图源、URL 定位参数 |
| `meow-tile-kit-ui` | `.` / `./elements` | core + Leaflet(可选 peer) | `createMap` / `CoordPanel` / `<mkt-*>` |
| `meow-tile-kit` | `.` / `./core` / `./elements` | core + ui | 伞包；兼容原 `import ... from 'meow-tile-kit'` |

```ts
// 一站式（伞包）
import { createMap, wgs84ToGcj02 } from 'meow-tile-kit'

// 只要数据 / 坐标（Node 可直接跑，无需 Leaflet）
import { parseCoord, createTileSource, wgs84ToGcj02 } from 'meow-tile-kit-core'

// 只要界面（UI 只再导出 core 的“类型”；值请从 core / 伞包引）
import { createMap } from 'meow-tile-kit-ui'
import 'meow-tile-kit-ui/elements'      // 注册 <mkt-*>
```

> `meow-tile-kit-core` 打包结果里**不含任何 `document`/`window`/Leaflet 引用**；`meow-tile-kit-ui` 依赖 core；伞包 `meow-tile-kit` = core + ui。
> CDN（基于伞包）：`https://unpkg.com/meow-tile-kit/dist/index.global.js`（全局 `MeowTileKit`）、`.../dist/elements.global.js`（全局 `MeowTileKitElements`）。

## 自定义元素（Web Components，新写法）

**原入口 `meow-tile-kit` 写法保持不变**；新写法通过元素入口引入，
引入即**自动注册**一组原生自定义元素，用标签即可搭建，零框架依赖：

| 标签 | 作用 |
| --- | --- |
| `<mkt-map>` | 地图宿主。**默认只有缩放 +/− 和设置**（左上齿轮，可切换图源）；`settings="false"` 可关掉内置齿轮改用 `<mkt-settings>` |
| `<mkt-search for="...">` | 搜索框（坐标开箱即用；地点搜索给 `.geocoder` 赋值，或监听 `mkt:search`）；选中派发 `mkt:result` |
| `<mkt-info for="...">` | 结果信息卡（监听 `mkt:result`；也可 `show(data)` / `clear()`） |
| `<mkt-coord-panel for="...">` | 坐标面板（多格式 + WGS/GCJ/BD/ISO/GeoURI） |
| `<mkt-legend for="...">` | 图例（自动显示底图名；`setItems([{label,color,type}])` 追加条目） |
| `<mkt-settings for="...">` | 设置面板（图源切换） |
| `<mkt-scale for="...">` | 比例尺，可放在页面任意位置 |
| `<mkt-output for="..." format="state\|geojson" crs="wgs84\|display\|gcj02\|bd09">` | 数据出口，库把状态/数据写进该元素内容并派发 `mkt:output` |

- 部件用 `for="<mkt-map 的 id>"` 关联；不写 `for` 则找最近的/页面第一个 `<mkt-map>`。
- 引入方式：`import 'meow-tile-kit-ui/elements'`（或伞包 `import 'meow-tile-kit/elements'`），CDN 用 `https://unpkg.com/meow-tile-kit/dist/elements.global.js`（全局 `MeowTileKitElements`）。
- 事件：`mkt:state`、`mkt:sourcechange`、`mkt:data`、`mkt:output`、`mkt:result`、`mkt:search`（冒泡的 `CustomEvent`）。
- `<mkt-map>` 方法：`locate()` `setSource()` `getSourceId()` `getState()` `setData(geojson, {crs})` `clearData()` `exportGeoJSON({crs})` `on()/off()`。

### 数据出口与坐标语义（`crs`）

内部所有几何/坐标都存为**规范 WGS-84**，显示时按当前图源投影。
`<mkt-output>` 与 `exportGeoJSON()` 的 `crs` 决定**导出的坐标系**：

| `crs` | 含义 |
| --- | --- |
| `wgs84`（默认） | **规范坐标**，跨图源稳定 —— 推荐用于导出/存储/分享 |
| `display` | 当前底图坐标系（GCJ-02/BD-09/WGS-84，随切换图源而变） |
| `gcj02` / `bd09` | 固定目标坐标系 |

```html
<!-- 导出规范坐标（默认，切图源不变） -->
<mkt-output for="m" format="geojson"></mkt-output>

<!-- 导出与当前底图一致的坐标（切图源会跟着变） -->
<mkt-output for="m" format="state" crs="display"></mkt-output>
```

> 切换图源时：`setData` 的规范数据不变，仅**显示**重投影；因此默认输出**不会漂移**。
> 需要“所见即所导”时才用 `crs="display"`。

```html
<mkt-map id="m" source="amap" center="39.9042,116.4074" zoom="11"></mkt-map>

<aside>
  <mkt-search for="m"></mkt-search>
  <mkt-coord-panel for="m"></mkt-coord-panel>
  <mkt-scale for="m"></mkt-scale>
  <mkt-output for="m" format="geojson"></mkt-output>
</aside>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/meow-tile-kit/dist/elements.global.js"></script>
<script>
  const m = document.getElementById('m')
  // 规范 WGS-84 数据 → 自动按当前图源投影，切图源不偏移
  m.setData({ type: 'Point', coordinates: [116.3975, 39.9087] })
  m.addEventListener('mkt:state', (e) => console.log(e.detail))
</script>
```

完整示例见 `package/examples/elements.html`（本地 `npm run dev` 后访问
`http://localhost:5173/examples/elements.html`）。

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
  url: true,               // 从 URL 查询串读取定位（见下）
  scale: true,             // 比例尺（默认 true）
  maxBounds: [[15,70], [55,140]],  // 可选：限制可视区域
})
```

- `toLocal(lat, lng)` — 将 WGS-84 转为当前图源的坐标系（用于放置标记/绘制）
- `toWgs84(lat, lng)` — 转回 WGS-84
- `app.locate(input, format?, zoom?)` — 解析坐标并定位（见下）
- `app.locateFromUrl(opts?)` — 从 URL 查询串定位并返回 WGS-84 坐标（见下）
- `app.setSource(id)` / `app.getSourceId()` — 切换 / 读取底图图源；**切换时按规范 WGS-84 保持视图中心与标记，不产生偏移**
- `app.source` — 当前图源（`TileSource` 实例）
- `app.on(event, handler)` / `app.off(...)` — 监听事件（含 `sourcechange`，见下）
- `app.setPanelExtra(html)` — 在坐标面板里追加自定义 HTML（随面板重绘保留，传 `''` 清除）；`app.openPanel()` 展开面板

浮动面板默认展开，只显示**当前坐标**：顶部大号显示当前格式的坐标（点击复制），下方为格式切换按钮与 WGS-84 / GCJ-02 / BD-09、ISO 6709、Geo URI、其他基准折叠。

面板浮在地图右上角，拖动标题栏可移动位置，位置会被记住；`drawer: false` 可完全关闭，`panelOpen: false` 则默认收起（单击地图打开）。
单击地图可放置/移动目标标记，标记也可拖动微调。
坐标定位用 `app.locate()`；图源切换用 `app.setSource(id)`（不再在面板内）。

### 跨图源绘制（核心：不偏移）

规范坐标统一用 **WGS-84**。绘制时用 `toLocal()` 把规范坐标投影到当前图源坐标系；
切换图源时监听 **`sourcechange`** 用保存的规范数据重新投影重绘，即可在任何底图上都对齐：

```ts
const app = createMap('map', { source: 'amap' })   // 高德 = GCJ-02
let current = null                                  // 保存规范 WGS-84 的 GeoJSON

function draw(data) {
  current = data
  const layer = L.geoJSON(data, {
    renderer: L.canvas(),
    coordsToLatLng: (c) => {                        // c = [lng, lat] (WGS-84)
      const p = app.toLocal(c[1], c[0])
      return L.latLng(p.lat, p.lng)
    },
  }).addTo(app.map)
  layer.bringToFront()
}

app.on('sourcechange', () => { if (current) draw(current) })  // 换图自动重投影
app.setSource('osm')                                // 中心/标记保持地理不变，图形不偏移
```

### URL 定位参数（GET）

`createMap(..., { url: true })` 会在加载时读取当前 URL 查询串并定位；
也可手动调用 `app.locateFromUrl({ search })` 或纯函数 `parseUrlLocation(search)`。

**默认按标准数据 WGS-84 解释**，也可用 `crs` 指定其它标准：

| 参数 | 说明 |
| --- | --- |
| `coord` | 任意受支持格式的坐标（`wx4g0bm`、`50N 449345 4417292`、`39.9,116.4`、DMS…） |
| `lat` + `lng` | 经纬度（默认 WGS-84） |
| `crs` | 输入坐标系：`wgs84`(默认) / `gcj02` / `bd09` |
| `format` | 强制 `coord` 的格式 key（如 `utm`、`geohash`） |
| `zoom` | 定位后的缩放级别 |

```text
?lat=39.9042&lng=116.4074                 # 默认 WGS-84
?lat=39.9101&lng=116.4136&crs=gcj02       # 高德坐标，自动转 WGS-84 再定位
?coord=wx4g0bm&zoom=14                    # Geohash
?coord=50N 449345 4417292&format=utm      # UTM
```

```ts
import { parseUrlLocation } from 'meow-tile-kit'
const loc = parseUrlLocation('?coord=wx4g0bm&zoom=14')
// { lat, lng, crs: 'wgs84', zoom: 14 }
```

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
| --- | --- | --- |
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
| --- | --- | --- |
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
| --- | --- | --- |
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
