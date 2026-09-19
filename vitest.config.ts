import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const pkg = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // 测试直接用源码（按包名解析），无需先构建
      'meow-tile-kit-ui/elements': pkg('./packages/ui/src/elements.ts'),
      'meow-tile-kit-ui': pkg('./packages/ui/src/index.ts'),
      'meow-tile-kit-core': pkg('./packages/core/src/index.ts'),
      'meow-tile-kit': pkg('./packages/meta/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
