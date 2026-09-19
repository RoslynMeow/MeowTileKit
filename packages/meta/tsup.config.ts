import { defineConfig } from 'tsup';

// meta 包需要三种产物：
//  1) ESM/CJS + dts（core/ui 作为外部依赖，走 re-export）
//  2) IIFE 单文件（内联 core+ui，供 <script> 直接使用，全局 MeowTileKit）
//  3) IIFE elements（内联 core+ui+elements，自动注册 <mkt-*>，全局 MeowTileKitElements）
export default defineConfig([
  {
    entry: { index: 'src/index.ts', core: 'src/core.ts', elements: 'src/elements.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: false,
    outDir: 'dist',
  },
  {
    entry: { index: 'src/index.ts' },
    format: ['iife'],
    globalName: 'MeowTileKit',
    outDir: 'dist',
    noExternal: ['meow-tile-kit-core', 'meow-tile-kit-ui'],
  },
  {
    entry: { elements: 'src/elements.ts' },
    format: ['iife'],
    globalName: 'MeowTileKitElements',
    outDir: 'dist',
    noExternal: ['meow-tile-kit-core', 'meow-tile-kit-ui'],
  },
]);
